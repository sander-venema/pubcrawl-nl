"""Crowd-sourced "serves Guinness?" backend for pubcrawl-nl.

A tiny FastAPI + SQLite service. nginx reverse-proxies /api/ to it on the
internal Docker network, so the browser only ever talks to its own origin — the
site's strict CSP (connect-src 'self') is satisfied with no change and no CORS.

Design:
  * Append-only votes table; the LATEST vote per (venue, client) wins, so a user
    can change their mind and spam can be pruned without losing history.
  * Privacy: we never store a raw IP. We store salted SHA-256 hashes of a
    browser-supplied client id and of the IP (for abuse moderation only). The
    salt is generated once and persisted next to the DB (no secret in code).
  * Abuse control: per-IP rate limiting (SlowAPI) + one effective vote per
    client per venue + an admin-token-gated moderation endpoint.

Environment:
  DB_PATH      SQLite file path (default /data/guinness.db)
  ADMIN_TOKEN  enables /api/admin/* when set (sent via X-Admin-Token header)
  VOTE_SALT    optional fixed salt; otherwise a random one is persisted to disk

Note: we deliberately do NOT `from __future__ import annotations` — FastAPI must
resolve the body model's type at runtime, and string annotations break that when
the route is wrapped by slowapi's rate-limit decorator.
"""

import hashlib
import os
import re
import sqlite3
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

DB_PATH = Path(os.environ.get("DB_PATH", "/data/guinness.db"))
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN") or None
OSM_ID_RE = re.compile(r"^(node|way|relation)/[0-9]+$")

_db: sqlite3.Connection | None = None
_write_lock = threading.Lock()


# ---------- identity / privacy helpers ----------
def _load_salt() -> str:
    fixed = os.environ.get("VOTE_SALT")
    if fixed:
        return fixed
    salt_file = DB_PATH.parent / "vote_salt"
    if salt_file.exists():
        return salt_file.read_text(encoding="utf-8").strip()
    salt = os.urandom(16).hex()
    salt_file.parent.mkdir(parents=True, exist_ok=True)
    salt_file.write_text(salt, encoding="utf-8")
    return salt


_SALT = ""


def _hash(*parts: str) -> str:
    h = hashlib.sha256()
    h.update(_SALT.encode("utf-8"))
    for part in parts:
        h.update(b"\x00")
        h.update((part or "").encode("utf-8"))
    return h.hexdigest()


def client_ip(request: Request) -> str:
    """Real client IP, trusting X-Forwarded-For only as set by the nginx proxy."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------- db ----------
def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS votes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            osm_id      TEXT NOT NULL,
            serves      INTEGER NOT NULL,
            client_hash TEXT NOT NULL,
            ip_hash     TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            flagged     INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_votes_osm ON votes(osm_id)")
    conn.commit()
    return conn


# Count only the LATEST non-flagged vote per (venue, client), so a user changes
# their mind without inflating the tally and flagged spam drops out.
_LATEST_PER_CLIENT = """
SELECT v.osm_id, v.serves
FROM votes v
WHERE v.flagged = 0 {extra}
  AND v.id = (
      SELECT MAX(v2.id) FROM votes v2
      WHERE v2.osm_id = v.osm_id AND v2.client_hash = v.client_hash AND v2.flagged = 0
  )
"""
_SUMMARY_SQL = (
    "SELECT osm_id, SUM(serves) AS yes, SUM(1 - serves) AS no FROM ("
    + _LATEST_PER_CLIENT.format(extra="")
    + ") GROUP BY osm_id"
)
_VENUE_SQL = (
    "SELECT SUM(serves) AS yes, SUM(1 - serves) AS no FROM ("
    + _LATEST_PER_CLIENT.format(extra="AND v.osm_id = ?")
    + ")"
)


def _counts_for(osm_id: str) -> dict:
    row = _db.execute(_VENUE_SQL, (osm_id,)).fetchone()
    return {"yes": row["yes"] or 0, "no": row["no"] or 0} if row else {"yes": 0, "no": 0}


# ---------- app ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db, _SALT
    _SALT = _load_salt()
    _db = _connect()
    yield
    if _db is not None:
        _db.close()


limiter = Limiter(key_func=client_ip)
app = FastAPI(title="pubcrawl-nl guinness", lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many votes, slow down."})


class VoteIn(BaseModel):
    osm_id: str = Field(..., max_length=40)
    serves: bool
    client_id: str | None = Field(default=None, max_length=64)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/guinness/summary")
def summary() -> dict:
    rows = _db.execute(_SUMMARY_SQL).fetchall()
    return {r["osm_id"]: {"yes": r["yes"] or 0, "no": r["no"] or 0} for r in rows}


@app.get("/api/guinness/{osm_id:path}")
def venue(osm_id: str) -> dict:
    if not OSM_ID_RE.match(osm_id):
        raise HTTPException(status_code=400, detail="invalid osm_id")
    return _counts_for(osm_id)


@app.post("/api/guinness/vote")
@limiter.limit("12/minute;120/hour")
def vote(payload: VoteIn, request: Request) -> dict:
    if not OSM_ID_RE.match(payload.osm_id):
        raise HTTPException(status_code=400, detail="invalid osm_id")
    ip = client_ip(request)
    client_hash = _hash("client", payload.client_id or ip)
    ip_hash = _hash("ip", ip)
    with _write_lock:
        _db.execute(
            "INSERT INTO votes (osm_id, serves, client_hash, ip_hash, created_at) VALUES (?,?,?,?,?)",
            (payload.osm_id, 1 if payload.serves else 0, client_hash, ip_hash,
             datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
        _db.commit()
    return _counts_for(payload.osm_id)


# ---------- moderation (only enabled when ADMIN_TOKEN is set) ----------
def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="moderation disabled")
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/api/admin/recent", dependencies=[Depends(require_admin)])
def admin_recent(limit: int = 100) -> list[dict]:
    rows = _db.execute(
        "SELECT id, osm_id, serves, flagged, created_at FROM votes ORDER BY id DESC LIMIT ?",
        (max(1, min(limit, 1000)),),
    ).fetchall()
    return [dict(r) for r in rows]


class ModerateIn(BaseModel):
    id: int | None = None
    osm_id: str | None = None
    action: str = Field(..., pattern="^(flag|unflag|delete)$")


@app.post("/api/admin/moderate", dependencies=[Depends(require_admin)])
def admin_moderate(payload: ModerateIn) -> dict:
    if payload.id is None and not payload.osm_id:
        raise HTTPException(status_code=400, detail="id or osm_id required")
    where, args = ("id = ?", [payload.id]) if payload.id is not None else ("osm_id = ?", [payload.osm_id])
    with _write_lock:
        if payload.action == "delete":
            cur = _db.execute(f"DELETE FROM votes WHERE {where}", args)
        else:
            flag = 1 if payload.action == "flag" else 0
            cur = _db.execute(f"UPDATE votes SET flagged = ? WHERE {where}", [flag, *args])
        _db.commit()
        return {"action": payload.action, "rows": cur.rowcount}
