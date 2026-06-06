# Third-party libraries vendored in this directory

These files are served locally (the site's Content-Security-Policy sets
`script-src 'self'`, so no external/CDN scripts are loaded at runtime). Each is
shipped **unmodified**; you may replace any of them with your own (possibly
modified) build of the same library.

| File | Library | Version | License |
|------|---------|---------|---------|
| `maplibre-gl.js`, `maplibre-gl.css` | [MapLibre GL JS](https://maplibre.org/) | vendored | BSD-3-Clause |
| `rbush.min.js` | [RBush](https://github.com/mourner/rbush) | vendored | MIT |
| `opening_hours.min.js` | [opening_hours.js](https://github.com/opening-hours/opening_hours.js) | 3.x (`opening_hours+deps.min.js`) | **LGPL-3.0-only** |
| `suncalc.min.js` | [SunCalc](https://github.com/mourner/suncalc) by Vladimir Agafonkin | 1.9.0 | BSD-2-Clause |

## opening_hours.min.js — LGPL-3.0-only (important)

`opening_hours.min.js` is the official **standalone "+deps" build** of
[opening_hours.js](https://github.com/opening-hours/opening_hours.js) by Robin
Schneider and contributors, downloaded unmodified from
<https://openingh.openstreetmap.de/opening_hours.js/opening_hours+deps.min.js>.
It is used only to evaluate OSM `opening_hours` strings client-side for the
"now open" filter; we never use its public-holiday/Nominatim resolution, so it
makes no network calls (and the CSP `connect-src 'self'` would block them).

It is licensed **LGPL-3.0-only** and bundles two dependencies:

- **suncalc** — BSD-2-Clause (© Vladimir Agafonkin)
- **i18next** — MIT (© i18next contributors)

To honour the LGPL we:

1. ship it as a **separate, unmodified file** (it is *not* concatenated or
   minified into this project's own MIT-licensed code);
2. include the full license texts in this directory
   ([`LICENSE.LGPL-3.0.txt`](./LICENSE.LGPL-3.0.txt) and the GPL-3.0 it
   references, [`LICENSE.GPL-3.0.txt`](./LICENSE.GPL-3.0.txt)); and
3. point you to the unmodified upstream source above so you can rebuild or
   substitute your own modified version of the library.

## suncalc.min.js — BSD-2-Clause

`suncalc.min.js` is [SunCalc](https://github.com/mourner/suncalc) 1.9.0 by Vladimir
Agafonkin, used to compute the sun's position (azimuth/altitude) for the sun &
shadow overlay. It is permissively licensed (BSD-2-Clause) and makes no network
calls. Copyright (c) 2014, Vladimir Agafonkin.

This project's **own** source code (everything outside `vendor/`) remains under
the MIT License (see [`../LICENSE`](../LICENSE)).
