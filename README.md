# Kroegentocht NL

An interactive map of Dutch **kroegen** — pubs, bars, and the brown-café/`bruin
café` style drinking spots. As you pan the map, the eight venues closest to the
centre are highlighted and connected by spokes. Click any dot for name, address,
opening hours, current open/closed state, and website.

Features:

- **Filters** (top-left): venue type, **open now**, **serves Guinness**, and
  *hide possibly-outdated*.
- **Open-now colouring**: green = open, red = closed, neutral = unknown hours
  (only ~⅓ of venues publish hours in OSM, so "unknown" is common — it is never
  shown as "open").
- **Crowd-sourced Guinness flag**: visitors can vote on whether a venue serves
  Guinness; the tally is shown in the popup and is filterable.
- **Sun & shadow overlay** (sun button): see whether a spot is in sun or shade
  right now (or at any time today via the slider), with sun-lit 3D buildings.
- Dutch / English toggle (bottom-right button).

## What counts as a "kroeg"?

The Netherlands is queried via its **administrative boundary** (not a bounding
box), so no Belgian/German border venues leak in. We keep:

- every `amenity=pub` and `amenity=bar`, and
- `amenity=cafe` venues that look like a drinking café — kept by default, with
  obvious coffee/lunch/ice-cream places filtered out (an "opt-out" heuristic).

In NL many traditional brown cafés are tagged `amenity=cafe`, so this keeps them
while dropping koffietentjes. Tune the heuristic in
[`scripts/osm_common.py`](scripts/osm_common.py) (`is_kroeg`, `_NOT_KROEG_NAME_RE`,
`_DRINK_SIGNAL_TAGS`). The data pipeline also:

- **drops closed venues** (lifecycle-prefixed tags like `disused:amenity`,
  `opening_hours=off`), and
- stamps each venue with `last_edit` and a `stale` flag (no verification/edit in
  ~24 months) so the UI can warn that hours may be outdated.

## Credits and attribution

This project is a Netherlands-focused re-implementation **inspired by**
[**Pub Crawler** by Glenelg](https://glenelg.io/pubcrawl/) — a UK-only
interactive map whose concept (radial nearest-N venues that update as you
pan) this project mirrors. Glenelg's site is in turn an homage to Alastair
Rae's [*Steak Bake Spider*](https://alasdairrae.github.io/steakbakespider/).

**No code from the original was copied.** The implementation was rewritten
from scratch:

| | Original (Glenelg) | This project |
|--|--|--|
| Map renderer | Mapbox GL JS (API token required) | MapLibre GL JS (BSD-3-Clause, no token) |
| Tiles | Mapbox proprietary | [OpenFreeMap](https://openfreemap.org/) — free, OSM-based |
| Spatial index | RBush | RBush |
| Data | UK pubs (`amenity=pub`) | NL kroegen (`pub` + `bar` + drinking `cafe`) |
| UI | English only | NL / EN toggle, filters, open-now, Guinness votes |
| Hosting | Static (GitHub Pages) | Static (GitHub Pages) or Docker (nginx + backend) |

Full credits:

- [OpenStreetMap](https://www.openstreetmap.org/) contributors — venue data
  via the [Overpass API](https://overpass-api.de/), licensed
  [ODbL](https://opendatacommons.org/licenses/odbl/)
- [OpenFreeMap](https://openfreemap.org/) — free vector tile hosting
- [MapLibre GL JS](https://maplibre.org/) — map renderer
- [RBush](https://github.com/mourner/rbush) by Vladimir Agafonkin — spatial index
- [opening_hours.js](https://github.com/opening-hours/opening_hours.js) by Robin
  Schneider — opening-hours evaluation (**LGPL-3.0**, see below)
- [SunCalc](https://github.com/mourner/suncalc) by Vladimir Agafonkin — sun
  position for the shadow overlay (BSD-2-Clause)

## License

The code in this repository is released under the [MIT License](LICENSE).

`vendor/opening_hours.min.js` is **LGPL-3.0-only** (it bundles suncalc, BSD-2,
and i18next, MIT). It is shipped unmodified as a separate file; the full license
texts and details are in [`vendor/NOTICE.md`](vendor/NOTICE.md). This project's
own code stays MIT.

Venue data (`data/kroegen-pts.json`) is © OpenStreetMap contributors and
distributed under [ODbL](https://opendatacommons.org/licenses/odbl/) —
attribution required.

## Running locally

### Docker (recommended — includes the Guinness backend)

```sh
docker compose up --build
```

Open <http://127.0.0.1:8765>. This runs two containers:

- `pubcrawl` — nginx serving the static site, and reverse-proxying `/api/`
- `guinness` — the FastAPI + SQLite backend (internal only; votes persist in the
  `guinness-data` Docker volume)

To enable moderation endpoints (`/api/admin/*`), set a token before starting:

```sh
GUINNESS_ADMIN_TOKEN=$(openssl rand -hex 16) docker compose up --build
```

### Static only (no Guinness votes — e.g. GitHub Pages or plain Python)

```sh
py -m http.server 8765
```

Open <http://127.0.0.1:8765>. The map, filters and open-now all work; the
Guinness UI **gracefully disables itself** when `/api/` is unreachable.

## Re-fetching the data

```sh
py scripts/fetch_osm.py
```

Pulls the latest NL kroegen from Overpass (one area query per amenity, ~1–2 min;
the public proxy may return HTTP 429/504 — the script retries). Applies the
de-ghosting, kroeg heuristic and freshness scoring, and refuses to overwrite the
snapshot if far fewer venues than expected come back.

`scripts/merge_raw.py` does the same from pre-downloaded `data/raw-{pub,bar,cafe}.json`
dumps (produce them with `out center meta`).

## The Guinness backend (`/api/`)

A small [FastAPI](https://fastapi.tiangolo.com/) + SQLite service
([`backend/app.py`](backend/app.py)). nginx reverse-proxies `/api/` to it, so the
browser stays **same-origin** and the strict CSP (`connect-src 'self'`) needs no
change.

| Method | Path | Purpose |
|--|--|--|
| `GET` | `/api/health` | liveness |
| `GET` | `/api/guinness/summary` | `{ "node/123": {yes, no}, ... }` for all voted venues |
| `GET` | `/api/guinness/{osm_id}` | counts for one venue |
| `POST` | `/api/guinness/vote` | `{osm_id, serves, client_id}` — record a vote |
| `GET`/`POST` | `/api/admin/*` | moderation (only when `ADMIN_TOKEN` is set) |

Privacy & abuse: only the **latest** vote per (venue, client) counts; IPs are
never stored raw (salted SHA-256 only); votes are per-IP rate-limited; flagged
votes drop out of the tally. No secrets are hard-coded — the admin token comes
from the `GUINNESS_ADMIN_TOKEN` environment variable.

## Sun & shadow overlay

Toggle the sun button to see where shadows fall. MapLibre can't cast ground
shadows itself, so the overlay is computed client-side in [js/crawl.js](js/crawl.js):
[SunCalc](https://github.com/mourner/suncalc) gives the sun's azimuth/altitude
for the map centre and time, and each building footprint (from the OpenMapTiles
`building` source-layer, using its `render_height`) is projected along the sun
vector — the swept silhouette (convex hull) is drawn as a translucent fill, while
the existing 3D buildings are lit from the sun. A slider previews any time today
(DST-correct); "Nu/Now" snaps back to live and refreshes each minute.

It's an **approximation**, not a solar study: many OSM buildings lack a height
(a default is assumed), the ground is treated as flat (no terrain or inter-building
occlusion beyond polygon overlap), and the silhouette slightly over-covers concave
buildings. It only renders zoomed in (z15+) where footprints are available.

## Project layout

```
.
├── index.html             # MapLibre map, control buttons, filter panel
├── js/crawl.js            # i18n, nearest-8, filters, open-now, Guinness, sun/shadow
├── vendor/                # MapLibre, RBush, opening_hours.js, SunCalc (+ notices)
├── data/kroegen-pts.json  # ~8.6k NL kroegen from OSM (with last_edit/stale)
├── scripts/
│   ├── osm_common.py      # shared: de-ghost, kroeg heuristic, freshness, to_feature
│   ├── fetch_osm.py       # re-pull from Overpass (NL area query)
│   └── merge_raw.py       # merge pre-downloaded raw dumps
├── backend/               # FastAPI + SQLite "serves Guinness?" service
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── Dockerfile             # nginx:1.27-alpine (static site)
├── nginx.conf             # gzip, cache headers, CSP, /api/ reverse proxy
└── docker-compose.yml     # pubcrawl (nginx) + guinness (backend) + volume
```
