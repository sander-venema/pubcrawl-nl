"""Shared OSM-to-GeoJSON logic for the pubcrawl-nl data pipeline.

Used by both fetch_osm.py (live Overpass pull) and merge_raw.py (pre-downloaded
dumps) so the de-ghosting, the "is this a kroeg?" filter, the freshness scoring
and the kept-property set live in exactly one place.

Scope decisions (set by the project owner):
  * Geography: Netherlands only — fetched via the NL administrative area, with a
    mainland bounding box as a code-side backstop (drops Caribbean NL + any
    border bleed into BE/DE).
  * Venue types: every amenity=pub and amenity=bar, plus amenity=cafe ONLY when
    it looks like a drinking establishment (a "bruin café"/kroeg) rather than a
    coffee/lunch place. See is_kroeg() — this is a tunable heuristic.
  * Closed venues are dropped (lifecycle-prefixed amenity tags, opening_hours
    off/closed). See is_lifecycle_closed().
  * Each kept venue gets last_edit (from OSM metadata) and a stale flag so the
    UI can warn that hours may be outdated.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timezone

# Properties copied from OSM tags into the output GeoJSON. Everything else is
# used only for filtering/heuristics and then discarded to keep the file small.
KEEP_PROPS = (
    "name",
    "amenity",
    "website",
    "contact:website",
    "opening_hours",
    "outdoor_seating",
    "wheelchair",
    "addr:city",
    "addr:street",
    "addr:housenumber",
    "addr:postcode",
    "cuisine",
    "brewery",
    "microbrewery",
    "check_date",
    "check_date:opening_hours",
)

VENUE_AMENITIES = ("pub", "bar", "cafe")

# --- geography: mainland-NL backstop (the Overpass area filter does the real
# work; this only guards against Caribbean NL outliers or an area glitch). ---
MAINLAND_NL = {"lon": (3.0, 7.4), "lat": (50.6, 53.8)}

# --- closed-venue ("ghost") detection -----------------------------------------
# A closed venue should be re-tagged disused:amenity=pub etc. Sloppy edits leave
# BOTH amenity=pub AND disused:amenity=pub, so a plain amenity query still
# returns them. Drop anything carrying a lifecycle-prefixed amenity key.
LIFECYCLE_PREFIXES = (
    "disused",
    "abandoned",
    "closed",
    "demolished",
    "removed",
    "razed",
    "destroyed",
    "ruins",
    "construction",
    "proposed",
)
_CLOSED_OPENING_HOURS = {"closed", "off"}


def is_lifecycle_closed(tags: dict) -> bool:
    """True if the venue is marked closed/gone/not-yet-open and must be dropped."""
    for prefix in LIFECYCLE_PREFIXES:
        if f"{prefix}:amenity" in tags:
            return True
    oh = (tags.get("opening_hours") or "").strip().lower()
    return oh in _CLOSED_OPENING_HOURS


# --- "is this a kroeg?" heuristic for amenity=cafe -----------------------------
# In NL, many traditional kroegen / bruine cafés are tagged amenity=cafe, often
# with no extra tags at all. So we KEEP cafés by default and only drop the clear
# coffee / lunch / dessert places (an "opt-out" heuristic, tuned for recall).
# Tune the sets/regex below to taste.
#
# A drinking signal: the tag is present with one of these values (None = any
# value other than a negative like "no"/"none").
_DRINK_SIGNAL_TAGS: dict[str, set[str] | None] = {
    "bar": {"yes"},
    "pub": {"yes"},
    "real_ale": {"yes", "only", "sometimes"},
    "craft_beer": {"yes", "only"},
    "microbrewery": {"yes"},
    "brewery": None,
    "beer": None,
    "drink:beer": {"yes", "served"},
    "taproom": {"yes"},
}
_NEGATIVE = {"no", "none", "false", ""}

# Names that mark a cafe as a coffee / lunch / dessert place rather than a kroeg.
# Matched only on amenity=cafe with no drinking signal, to opt those out.
_NOT_KROEG_NAME_RE = re.compile(
    r"(lunchroom|koffie|coffee|espresso|barista|ijssalon|ijscaf|\bijs\b|ice\s?cream|"
    r"gelater|gelateria|yoghurt|smoothie|juice|tearoom|theehuis|theeschenkerij|"
    r"patisserie|conditorei|bakkerij|bakery|banketbakker|broodjes?|sandwich|"
    r"cafetaria|snackbar|pannenkoek|poffertjes|wafel)",
    re.IGNORECASE,
)

# Cuisines that mark a place as coffee/food-only (not a kroeg) when there is no
# drinking signal. "cafe" is NOT here — it is ambiguous in NL.
_COFFEE_FOOD_ONLY_CUISINE = {
    "coffee_shop",
    "coffee",
    "tea",
    "ice_cream",
    "cake",
    "donut",
    "bakery",
    "pastry",
    "dessert",
    "sandwich",
    "breakfast",
    "bubble_tea",
    "juice",
    "lunch",
    "frozen_yogurt",
    "smoothie",
}


def _has_drink_signal(tags: dict) -> bool:
    for key, allowed in _DRINK_SIGNAL_TAGS.items():
        if key not in tags:
            continue
        value = (tags[key] or "").strip().lower()
        if allowed is None:
            if value not in _NEGATIVE:
                return True
        elif value in allowed:
            return True
    return False


def _is_coffee_food_only(tags: dict) -> bool:
    cuisines = {c.strip().lower() for c in (tags.get("cuisine") or "").split(";") if c.strip()}
    return bool(cuisines & _COFFEE_FOOD_ONLY_CUISINE)


def is_kroeg(tags: dict) -> bool:
    """Decide whether a venue counts as a "kroeg" for this project.

    pub and bar always qualify; cafe qualifies only via the brown-café heuristic.
    """
    amenity = tags.get("amenity")
    if amenity in ("pub", "bar"):
        return True
    if amenity != "cafe":
        return False
    # amenity=cafe: keep by default; drop only the obvious coffee/lunch/dessert
    # places (unless they also show a drinking signal).
    if _has_drink_signal(tags):
        return True
    if _is_coffee_food_only(tags):
        return False
    name = tags.get("name") or ""
    return not _NOT_KROEG_NAME_RE.search(name)


# --- freshness scoring ---------------------------------------------------------
STALE_AFTER_DAYS = 730  # ~24 months without a verification touch -> "may be outdated"


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    text = value.strip()
    # Accept "YYYY-MM-DD" and full ISO timestamps like "2023-05-01T12:00:00Z";
    # fall back to the leading date portion for anything else.
    for candidate in (text, text[:10]):
        try:
            return datetime.strptime(candidate, "%Y-%m-%d").date()
        except ValueError:
            pass
    try:
        return datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").date()
    except ValueError:
        return None


def freshness(tags: dict, timestamp: str | None, today: date | None = None) -> tuple[str | None, bool]:
    """Return (last_edit_date_iso, stale).

    stale is True when the most recent verification signal (check_date,
    check_date:opening_hours, or the last OSM edit) is older than STALE_AFTER_DAYS.
    """
    today = today or datetime.now(timezone.utc).date()
    signals = [
        _parse_iso_date(tags.get("check_date")),
        _parse_iso_date(tags.get("check_date:opening_hours")),
        _parse_iso_date(timestamp),
    ]
    dates = [d for d in signals if d is not None]
    last_edit = _parse_iso_date(timestamp)
    if not dates:
        return (last_edit.isoformat() if last_edit else None), False
    newest = max(dates)
    stale = (today - newest).days > STALE_AFTER_DAYS
    return (last_edit.isoformat() if last_edit else newest.isoformat()), stale


# --- element -> GeoJSON feature ------------------------------------------------
def to_feature(element: dict, today: date | None = None) -> dict | None:
    """Convert one Overpass element to a GeoJSON Feature, or None to drop it.

    Drops: unnamed venues, non-venue amenities, closed venues, non-kroeg cafés,
    and anything outside mainland NL.
    """
    tags = element.get("tags") or {}
    if not tags.get("name"):
        return None
    if tags.get("amenity") not in VENUE_AMENITIES:
        return None
    if is_lifecycle_closed(tags):
        return None
    if not is_kroeg(tags):
        return None

    if element["type"] == "node":
        lon, lat = element.get("lon"), element.get("lat")
    else:
        center = element.get("center") or {}
        lon, lat = center.get("lon"), center.get("lat")
    if lon is None or lat is None:
        return None
    if not (MAINLAND_NL["lon"][0] <= lon <= MAINLAND_NL["lon"][1]):
        return None
    if not (MAINLAND_NL["lat"][0] <= lat <= MAINLAND_NL["lat"][1]):
        return None

    props = {key: tags[key] for key in KEEP_PROPS if key in tags}
    if "contact:website" in props and "website" not in props:
        props["website"] = props.pop("contact:website")
    else:
        props.pop("contact:website", None)

    last_edit, stale = freshness(tags, element.get("timestamp"), today)
    if last_edit:
        props["last_edit"] = last_edit
    if stale:
        props["stale"] = True

    return {
        "type": "Feature",
        "id": f"{element['type']}/{element['id']}",
        "properties": props,
        "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]},
    }
