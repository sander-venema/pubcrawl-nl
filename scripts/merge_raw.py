"""Merge already-downloaded Overpass JSON files into data/kroegen-pts.json.

Reads data/raw-pub.json, data/raw-bar.json, data/raw-cafe.json (Overpass JSON
format, ideally produced with "out center meta") and writes data/kroegen-pts.json
(GeoJSON FeatureCollection). Applies the same de-ghosting, kroeg filtering and
freshness scoring as fetch_osm.py via scripts/osm_common.

Run from the project root:
    python scripts/merge_raw.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_common import VENUE_AMENITIES, to_feature  # noqa: E402


def main() -> None:
    today = datetime.now(timezone.utc).date()
    project = Path(__file__).resolve().parents[1]
    data_dir = project / "data"
    raw_files = [data_dir / f"raw-{a}.json" for a in VENUE_AMENITIES]

    features: list[dict] = []
    seen_ids: set[str] = set()

    for raw_file in raw_files:
        if not raw_file.exists():
            print(f"missing: {raw_file}", file=sys.stderr)
            continue
        elements = json.loads(raw_file.read_text(encoding="utf-8")).get("elements", [])
        kept = 0
        for el in elements:
            feature = to_feature(el, today)
            if feature is None or feature["id"] in seen_ids:
                continue
            seen_ids.add(feature["id"])
            features.append(feature)
            kept += 1
        print(f"{raw_file.name}: {len(elements):,} elements -> {kept:,} kept", file=sys.stderr)

    stale = sum(1 for f in features if f["properties"].get("stale"))
    fc = {
        "type": "FeatureCollection",
        "generator": "scripts/merge_raw.py",
        "copyright": "Data from OpenStreetMap contributors, ODbL.",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "features": features,
    }

    out_path = data_dir / "kroegen-pts.json"
    out_path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(
        f"-> wrote {out_path} ({out_path.stat().st_size:,} bytes, {len(features):,} venues; "
        f"{stale:,} flagged stale)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
