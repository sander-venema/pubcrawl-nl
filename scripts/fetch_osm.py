"""Fetch pubs, bars and cafes for the Netherlands from the Overpass API
and write them out as a GeoJSON FeatureCollection at data/kroegen-pts.json.

Run from the project root:
    python scripts/fetch_osm.py

The query is split by amenity type because a combined query exceeds the
public Overpass proxy timeout (~60s). Per-amenity queries each finish in
30-50 seconds.

The request mimics overpass-turbo.eu (Referer header) because the public
Overpass front-end blocks requests that look like generic bots.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# Netherlands bbox: south, west, north, east. Includes a small margin around mainland NL.
NL_BBOX = (50.70, 3.30, 53.60, 7.30)

AMENITIES = ("pub", "bar", "cafe")

ENDPOINT = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://overpass-turbo.eu/",
    "Origin": "https://overpass-turbo.eu",
}

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
)


def query_for(amenity: str) -> str:
    s, w, n, e = NL_BBOX
    return (
        f"[out:json][timeout:90][bbox:{s},{w},{n},{e}];"
        f'(node["amenity"="{amenity}"];way["amenity"="{amenity}"];);'
        f"out center tags;"
    )


def fetch(amenity: str) -> dict:
    body = urllib.parse.urlencode({"data": query_for(amenity)}).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(1, 4):
        print(f"-> {amenity}: attempt {attempt}", file=sys.stderr)
        req = urllib.request.Request(ENDPOINT, data=body, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = resp.read()
                print(f"   ok, {len(payload):,} bytes", file=sys.stderr)
                return json.loads(payload)
        except (urllib.error.URLError, TimeoutError, OSError, ConnectionError) as exc:
            print(f"   failed: {exc}", file=sys.stderr)
            last_err = exc
            time.sleep(5)
    raise SystemExit(f"Overpass failed for {amenity}: {last_err}")


def to_feature(element: dict) -> dict | None:
    tags = element.get("tags") or {}
    if not tags.get("name"):
        return None

    if element["type"] == "node":
        lon, lat = element.get("lon"), element.get("lat")
    else:
        center = element.get("center") or {}
        lon, lat = center.get("lon"), center.get("lat")

    if lon is None or lat is None:
        return None

    props = {key: tags[key] for key in KEEP_PROPS if key in tags}
    if "contact:website" in props and "website" not in props:
        props["website"] = props.pop("contact:website")

    return {
        "type": "Feature",
        "id": f"{element['type']}/{element['id']}",
        "properties": props,
        "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]},
    }


def main() -> None:
    all_features: list[dict] = []
    seen_ids: set[str] = set()

    for amenity in AMENITIES:
        raw = fetch(amenity)
        elements = raw.get("elements", [])
        kept = 0
        for el in elements:
            feature = to_feature(el)
            if feature is None or feature["id"] in seen_ids:
                continue
            seen_ids.add(feature["id"])
            all_features.append(feature)
            kept += 1
        print(f"   {amenity}: {len(elements):,} elements -> {kept:,} features", file=sys.stderr)

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
        f"-> wrote {out_path} ({out_path.stat().st_size:,} bytes, "
        f"{len(all_features):,} features)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
