"""Fetch Dutch "kroegen" (pubs, bars and drinking cafés) from the Overpass API
and write them out as a GeoJSON FeatureCollection at data/kroegen-pts.json.

Run from the project root:
    python scripts/fetch_osm.py

What this does differently from a naive amenity dump:
  * Queries the Netherlands ADMINISTRATIVE AREA (ISO3166-1=NL), not a loose
    bounding box, so it no longer drags in Belgian/German border venues.
  * Uses "out center meta" to capture each venue's last-edit timestamp, which
    (with check_date tags) drives a per-venue "stale" flag.
  * Drops closed venues (lifecycle-prefixed amenity tags / opening_hours off).
  * Keeps every pub and bar, but only the amenity=cafe entries that look like a
    kroeg / bruin café (see scripts/osm_common.is_kroeg).

The query is split per amenity because a combined area query can exceed the
public Overpass proxy timeout. The request mimics overpass-turbo.eu (Referer
header) because the public front-end blocks requests that look like generic bots.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_common import VENUE_AMENITIES, is_kroeg, to_feature  # noqa: E402

ENDPOINT = "https://overpass-api.de/api/interpreter"

# Abort rather than overwrite the committed snapshot if a query returns far
# fewer venues than expected (e.g. the NL area failed to resolve).
MIN_EXPECTED_FEATURES = 5000

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://overpass-turbo.eu/",
    "Origin": "https://overpass-turbo.eu",
}


def query_for(amenity: str) -> str:
    # area(...) resolves the NL country relation; nwr = node/way/relation.
    return (
        "[out:json][timeout:180];"
        'area["ISO3166-1"="NL"]["admin_level"="2"]->.nl;'
        f'nwr["amenity"="{amenity}"](area.nl);'
        "out center meta;"
    )


def fetch(amenity: str) -> dict:
    body = urllib.parse.urlencode({"data": query_for(amenity)}).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(1, 4):
        print(f"-> {amenity}: attempt {attempt}", file=sys.stderr)
        req = urllib.request.Request(ENDPOINT, data=body, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=240) as resp:
                payload = resp.read()
                print(f"   ok, {len(payload):,} bytes", file=sys.stderr)
                return json.loads(payload)
        except (urllib.error.URLError, TimeoutError, OSError, ConnectionError) as exc:
            print(f"   failed: {exc}", file=sys.stderr)
            last_err = exc
            time.sleep(8)
    raise SystemExit(f"Overpass failed for {amenity}: {last_err}")


def main() -> None:
    today = datetime.now(timezone.utc).date()
    all_features: list[dict] = []
    seen_ids: set[str] = set()
    cafe_seen = cafe_kept = 0

    for amenity in VENUE_AMENITIES:
        raw = fetch(amenity)
        elements = raw.get("elements", [])
        kept = 0
        for el in elements:
            if amenity == "cafe":
                cafe_seen += 1
            feature = to_feature(el, today)
            if feature is None or feature["id"] in seen_ids:
                continue
            seen_ids.add(feature["id"])
            all_features.append(feature)
            kept += 1
            if amenity == "cafe":
                cafe_kept += 1
        print(f"   {amenity}: {len(elements):,} elements -> {kept:,} kept", file=sys.stderr)

    if cafe_seen:
        print(
            f"-> café heuristic: kept {cafe_kept:,} of {cafe_seen:,} cafés as kroegen "
            f"({cafe_seen - cafe_kept:,} dropped as coffee/food-only)",
            file=sys.stderr,
        )

    if len(all_features) < MIN_EXPECTED_FEATURES:
        raise SystemExit(
            f"Only {len(all_features):,} venues parsed (< {MIN_EXPECTED_FEATURES:,}); "
            "refusing to overwrite the existing snapshot. Check the NL area query."
        )

    stale = sum(1 for f in all_features if f["properties"].get("stale"))
    with_hours = sum(1 for f in all_features if f["properties"].get("opening_hours"))
    fc = {
        "type": "FeatureCollection",
        "generator": "scripts/fetch_osm.py",
        "copyright": "Data from OpenStreetMap contributors, ODbL.",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "features": all_features,
    }

    out_path = Path(__file__).resolve().parents[1] / "data" / "kroegen-pts.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(
        f"-> wrote {out_path} ({out_path.stat().st_size:,} bytes, {len(all_features):,} venues; "
        f"{with_hours:,} with hours, {stale:,} flagged stale)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
