"""Merge already-downloaded Overpass JSON files into data/kroegen-pts.json.

Reads data/raw-pub.json, data/raw-bar.json, data/raw-cafe.json (Overpass JSON
format) and writes data/kroegen-pts.json (GeoJSON FeatureCollection).

Run from the project root:
    python scripts/merge_raw.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

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
    project = Path(__file__).resolve().parents[1]
    data_dir = project / "data"
    raw_files = [data_dir / f"raw-{a}.json" for a in ("pub", "bar", "cafe")]

    features: list[dict] = []
    seen_ids: set[str] = set()

    for raw_file in raw_files:
        if not raw_file.exists():
            print(f"missing: {raw_file}", file=sys.stderr)
            continue
        elements = json.loads(raw_file.read_text(encoding="utf-8")).get("elements", [])
        kept = 0
        for el in elements:
            feature = to_feature(el)
            if feature is None or feature["id"] in seen_ids:
                continue
            seen_ids.add(feature["id"])
            features.append(feature)
            kept += 1
        print(f"{raw_file.name}: {len(elements):,} elements -> {kept:,} features", file=sys.stderr)

    fc = {
        "type": "FeatureCollection",
        "generator": "scripts/merge_raw.py",
        "copyright": "Data from OpenStreetMap contributors, ODbL.",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "features": features,
    }

    out_path = data_dir / "kroegen-pts.json"
    out_path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(
        f"-> wrote {out_path} ({out_path.stat().st_size:,} bytes, "
        f"{len(features):,} features)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
