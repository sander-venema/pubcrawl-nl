# Kroegentocht NL

An interactive map of every pub, bar, and café in the Netherlands. As you pan
the map, the eight venues closest to the centre are highlighted and connected
by spokes. Click any dot for name, address, opening hours, and website.

Toggle between Dutch and English with the bottom-right button.

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
| Data | UK pubs (`amenity=pub`) | NL pubs + bars + cafés (`amenity=pub|bar|cafe`) |
| UI | English only | NL / EN toggle |
| Hosting | Static (GitHub Pages) | Static (GitHub Pages) or Docker (nginx) |

Full credits:

- [OpenStreetMap](https://www.openstreetmap.org/) contributors — venue data
  via the [Overpass API](https://overpass-api.de/), licensed
  [ODbL](https://opendatacommons.org/licenses/odbl/)
- [OpenFreeMap](https://openfreemap.org/) — free vector tile hosting
- [MapLibre GL JS](https://maplibre.org/) — map renderer
- [RBush](https://github.com/mourner/rbush) by Vladimir Agafonkin —
  spatial index

## License

The code in this repository is released under the [MIT License](LICENSE).

Venue data (`data/kroegen-pts.json`) is © OpenStreetMap contributors and
distributed under [ODbL](https://opendatacommons.org/licenses/odbl/) —
attribution required.

## Running locally

### Docker (recommended)

```sh
docker compose up --build
```

Open <http://127.0.0.1:8765>.

### Or with Python

```sh
py -m http.server 8765
```

Open <http://127.0.0.1:8765>.

## Re-fetching the data

The committed `data/kroegen-pts.json` is a snapshot. To pull the latest from
OSM (~2 minutes, splits into 3 Overpass calls to stay under the public
proxy's timeout):

```sh
py scripts/fetch_osm.py
```

## Project layout

```
.
├── index.html             # MapLibre map + 4 control buttons
├── js/crawl.js            # i18n strings, nearest-8 logic, popups
├── vendor/                # MapLibre and RBush, served locally
├── data/kroegen-pts.json  # ~24,000 NL venues from OSM
├── scripts/
│   ├── fetch_osm.py       # re-pull from Overpass
│   └── merge_raw.py       # merge pre-downloaded raw dumps
├── Dockerfile             # nginx:1.27-alpine
├── nginx.conf             # gzip, cache headers, CSP
└── docker-compose.yml
```
