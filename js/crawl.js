"use strict";

// ---------- i18n ----------
const STRINGS = {
    nl: {
        docTitle: "Kroegentocht NL",
        resetBearing: "Noord resetten",
        locateMe: "Centreer op mijn locatie",
        info: "Informatie",
        filters: "Filters",
        langToggle: "Switch to English",
        langBtnLabel: "EN",
        infoHeading: "Welkom bij de Kroegentocht",
        infoIntro:
            "Deze interactieve kaart toont de dichtstbijzijnde kroegen rond het midden van de kaart (aantal instelbaar in de filters). Versleep de kaart om te zien wat er gebeurt.",
        infoCanList: "Je kunt:",
        infoLi1: "Filteren op type, 'nu open' en Guinness (linksboven)",
        infoLi2: "Naar je huidige locatie springen (indien ondersteund)",
        infoLi3: "Dit infopaneel openen",
        infoLi4: "Tussen Nederlands en Engels wisselen",
        infoCredit:
            'Gebaseerd op het originele <a href="https://glenelg.io/pubcrawl/" target="_blank" rel="noopener">Pub Crawler</a> van Glenelg, dat weer is gebaseerd op werk van Alastair Rae.',
        infoData: 'Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-bijdragers</a> (ODbL). Tegels via OpenFreeMap. Openingstijden via opening_hours.js (LGPL-3.0).',
        geolocateError: "Locatie kan niet worden bepaald.",
        geolocateUnsupported: "Geolocatie wordt niet ondersteund door je browser.",
        popupAmenity: "Type",
        popupAddress: "Adres",
        popupHours: "Openingstijden",
        popupWebsite: "Website",
        websiteLink: "Bezoek",
        unknown: "onbekend",
        amenities: { pub: "Kroeg", bar: "Bar", cafe: "Café" },
        // filters
        openNow: "Nu open",
        guinnessFilter: "Serveert Guinness",
        hideStale: "Verberg mogelijk verouderd",
        legendOpen: "Nu open",
        legendClosed: "Gesloten",
        legendUnknown: "Onbekend",
        nearestLabel: "Dichtstbijzijnde: {n}",
        shown: "{n} zaken zichtbaar",
        // popup state + freshness
        state: { open: "Nu open", closed: "Gesloten", unknown: "Tijden onbekend" },
        staleNote: "Gegevens mogelijk verouderd",
        lastEdit: "laatst bewerkt {date}",
        // guinness
        guinnessHeading: "Serveert deze zaak Guinness?",
        guinnessYes: "Ja",
        guinnessNo: "Nee",
        guinnessError: "Stem mislukt, probeer later opnieuw.",
        // sun & shadow
        sunShadow: "Zon & schaduw",
        sunNow: "Nu",
        sunBelowHorizon: "🌙 Zon onder de horizon — overal schaduw",
        sunZoomIn: "Zoom in om schaduwen te zien",
        sunAltitude: "Zon {deg}° boven de horizon",
    },
    en: {
        docTitle: "Pub Crawl NL",
        resetBearing: "Reset north",
        locateMe: "Recenter on my location",
        info: "Information",
        filters: "Filters",
        langToggle: "Wissel naar Nederlands",
        langBtnLabel: "NL",
        infoHeading: "Welcome to the Dutch Pub Crawl",
        infoIntro:
            "This interactive map shows the nearest pubs around the centre of the map (count adjustable in the filters). Drag the map to see what happens.",
        infoCanList: "You can:",
        infoLi1: "Filter by type, 'open now' and Guinness (top left)",
        infoLi2: "Jump to your current location (if supported)",
        infoLi3: "Open this info panel",
        infoLi4: "Toggle between Dutch and English",
        infoCredit:
            'Based on the original <a href="https://glenelg.io/pubcrawl/" target="_blank" rel="noopener">Pub Crawler</a> by Glenelg, itself inspired by Alastair Rae.',
        infoData: 'Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL). Tiles via OpenFreeMap. Opening hours via opening_hours.js (LGPL-3.0).',
        geolocateError: "Unable to retrieve your location.",
        geolocateUnsupported: "Geolocation is not supported by your browser.",
        popupAmenity: "Type",
        popupAddress: "Address",
        popupHours: "Opening hours",
        popupWebsite: "Website",
        websiteLink: "Visit",
        unknown: "unknown",
        amenities: { pub: "Pub", bar: "Bar", cafe: "Café" },
        // filters
        openNow: "Open now",
        guinnessFilter: "Serves Guinness",
        hideStale: "Hide possibly outdated",
        legendOpen: "Open now",
        legendClosed: "Closed",
        legendUnknown: "Unknown",
        nearestLabel: "Nearest: {n}",
        shown: "{n} venues shown",
        // popup state + freshness
        state: { open: "Open now", closed: "Closed", unknown: "Hours unknown" },
        staleNote: "Data may be outdated",
        lastEdit: "last edited {date}",
        // guinness
        guinnessHeading: "Does this place serve Guinness?",
        guinnessYes: "Yes",
        guinnessNo: "No",
        guinnessError: "Vote failed, please try again later.",
        // sun & shadow
        sunShadow: "Sun & shadow",
        sunNow: "Now",
        sunBelowHorizon: "🌙 Sun below the horizon — all in shade",
        sunZoomIn: "Zoom in to see shadows",
        sunAltitude: "Sun {deg}° above the horizon",
    },
};

const STORAGE_KEY = "pubcrawl-nl.lang";
const CLIENT_KEY = "pubcrawl-nl.cid";
let lang = detectLang();

function detectLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "nl" || stored === "en") return stored;
    const nav = (navigator.language || "nl").toLowerCase();
    return nav.startsWith("nl") ? "nl" : "en";
}

function t() {
    return STRINGS[lang];
}

function applyLang() {
    const s = t();
    document.documentElement.lang = lang;
    document.title = s.docTitle;
    document.getElementById("resetBearingBtn").title = s.resetBearing;
    document.getElementById("locateMeBtn").title = s.locateMe;
    document.getElementById("infoBtn").title = s.info;
    document.getElementById("filterBtn").title = s.filters;
    const langBtn = document.getElementById("langBtn");
    langBtn.title = s.langToggle;
    langBtn.textContent = s.langBtnLabel;

    // filter panel labels
    document.getElementById("fltTitle").textContent = s.filters;
    document.querySelectorAll("#fltTypes span[data-i18n]").forEach((el) => {
        el.textContent = s.amenities[el.dataset.i18n] || el.dataset.i18n;
    });
    document.getElementById("fltOpenNowLbl").textContent = s.openNow;
    document.getElementById("fltGuinnessLbl").textContent = s.guinnessFilter;
    document.getElementById("fltHideStaleLbl").textContent = s.hideStale;
    document.getElementById("lgOpen").textContent = s.legendOpen;
    document.getElementById("lgClosed").textContent = s.legendClosed;
    document.getElementById("lgUnknown").textContent = s.legendUnknown;
    updateNearestLabel();
    updateFilterCount();

    document.getElementById("sunBtn").title = s.sunShadow;
    document.getElementById("sunNowBtn").textContent = s.sunNow;
    refreshSunPanel();
}

// ---------- map ----------
const NL_CENTER = [5.2913, 52.1326];
const NL_BOUNDS = [
    [2.5, 50.5],
    [7.8, 54.0],
];

const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: NL_CENTER,
    zoom: 7,
    minZoom: 6,
    maxZoom: 19,
    maxBounds: NL_BOUNDS,
    attributionControl: { compact: true },
});

map.scrollZoom.enable({ around: "center" });

document.getElementById("resetBearingBtn").addEventListener("click", () => {
    map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
});

document.getElementById("locateMeBtn").addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
        alert(t().geolocateUnsupported);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            map.easeTo({
                center: [pos.coords.longitude, pos.coords.latitude],
                duration: 1000,
                zoom: 14,
            });
        },
        (err) => {
            alert(t().geolocateError);
            console.error(err);
        },
        { enableHighAccuracy: true },
    );
});

document.getElementById("infoBtn").addEventListener("click", () => {
    const s = t();
    const html = `
        <h3>${s.infoHeading}</h3>
        <p>${s.infoIntro}</p>
        <p>${s.infoCanList}</p>
        <ul>
            <li>${s.infoLi1}</li>
            <li>${s.infoLi2}</li>
            <li>${s.infoLi3}</li>
            <li>${s.infoLi4}</li>
        </ul>
        <p>${s.infoCredit}</p>
        <p>${s.infoData}</p>
    `;
    new maplibregl.Popup({ closeOnClick: true })
        .setLngLat(map.getCenter())
        .setHTML(html)
        .addTo(map);
});

document.getElementById("langBtn").addEventListener("click", () => {
    lang = lang === "nl" ? "en" : "nl";
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang();
});

document.getElementById("filterBtn").addEventListener("click", () => {
    document.getElementById("filterPanel").classList.toggle("open");
});

// ---------- "open now" evaluation (opening_hours.js, Amsterdam wall-clock) ----------
// opening_hours.js reads only LOCAL Date methods, so we must hand it a Date whose
// local fields equal the Amsterdam wall-clock — otherwise visitors in another
// timezone get wrong results. DST is handled by the OS tz database via Intl.
function amsterdamNow() {
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Amsterdam",
            hour12: false,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        }).formatToParts(new Date());
        const p = {};
        for (const part of parts) p[part.type] = part.value;
        const hour = p.hour === "24" ? 0 : Number(p.hour);
        return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
    } catch (e) {
        return new Date();
    }
}

const ohSupported = typeof opening_hours === "function";
const ohCache = new Map();

function parsedOH(value) {
    if (ohCache.has(value)) return ohCache.get(value);
    let oh = null;
    try {
        oh = new opening_hours(value, null);
    } catch (e) {
        oh = null;
    }
    ohCache.set(value, oh);
    return oh;
}

// Returns "open" | "closed" | "unknown". Comment-only, unparseable and
// open-ended ("19:00+") values resolve to "unknown" — getUnknown() flags the
// open-ended/uncertain cases — so we never assert open/closed on a guess.
function openStateFor(value, now) {
    if (!ohSupported || !value) return "unknown";
    const v = String(value).trim();
    if (!v || v[0] === '"') return "unknown";
    const oh = parsedOH(v);
    if (!oh) return "unknown";
    try {
        if (oh.getUnknown(now)) return "unknown";
        return oh.getState(now) ? "open" : "closed";
    } catch (e) {
        return "unknown";
    }
}

// ---------- data, filters & nearest-8 logic ----------
let allFeatures = [];
let activeFeatures = [];
let pubTree = null;
let layersAdded = false;
let nearestCount = 5; // how many nearest venues to highlight (1–10, slider)

const filterState = {
    types: { pub: true, bar: true, cafe: true },
    openNow: false,
    guinness: false,
    hideStale: false,
};

// ---------- Guinness (crowd-sourced flag via /api/) ----------
let guinnessAvailable = false;
const guinnessCounts = Object.create(null); // osm_id -> { yes, no }

function clientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : "c" + Math.random().toString(16).slice(2) + Date.now();
        localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
}

function guinnessServes(osmId) {
    const c = guinnessCounts[osmId];
    return !!c && c.yes > c.no;
}

function loadGuinness() {
    fetch("./api/guinness/summary", { headers: { Accept: "application/json" } })
        .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then((data) => {
            for (const key in data) guinnessCounts[key] = data[key];
            guinnessAvailable = true;
            document.getElementById("filterPanel").classList.remove("no-guinness");
            if (filterState.guinness) applyFilters();
        })
        .catch(() => {
            // No backend (e.g. static hosting / GitHub Pages): hide Guinness UI.
            guinnessAvailable = false;
            const f = document.getElementById("fltGuinness");
            if (f) f.checked = false;
            filterState.guinness = false;
            document.getElementById("filterPanel").classList.add("no-guinness");
        });
}

function sendVote(osmId, serves) {
    return fetch("./api/guinness/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osm_id: osmId, serves: serves, client_id: clientId() }),
    }).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    });
}

function buildIndex(features) {
    pubTree = new RBush();
    pubTree.load(
        features.map((feature) => {
            const [lon, lat] = feature.geometry.coordinates;
            return { minX: lon, minY: lat, maxX: lon, maxY: lat, feature };
        }),
    );
}

function squaredDegDist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function nearestVenues(lng, lat) {
    if (!pubTree) return [];
    return pubTree
        .all()
        .map((item) => ({ feature: item.feature, d: squaredDegDist(lng, lat, item.minX, item.minY) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, nearestCount)
        .map((x) => x.feature);
}

function buildSpokes(lng, lat, features) {
    return {
        type: "FeatureCollection",
        features: features.map((pub) => ({
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [[lng, lat], pub.geometry.coordinates],
            },
        })),
    };
}

function computeOpenStates() {
    const now = amsterdamNow();
    for (const f of allFeatures) {
        f.properties._open = openStateFor(f.properties.opening_hours, now);
    }
}

function passesFilter(f) {
    const p = f.properties;
    if (!filterState.types[p.amenity]) return false;
    if (filterState.openNow && p._open !== "open") return false;
    if (filterState.hideStale && p.stale) return false;
    if (filterState.guinness && !guinnessServes(p.osm_id)) return false;
    return true;
}

function activeFC() {
    return { type: "FeatureCollection", features: activeFeatures };
}

function applyFilters() {
    activeFeatures = allFeatures.filter(passesFilter);
    buildIndex(activeFeatures);
    if (layersAdded) {
        map.getSource("all-pubs").setData(activeFC());
    }
    updateSpoke();
    updateFilterCount();
}

function updateFilterCount() {
    const el = document.getElementById("filterCount");
    if (el) el.textContent = t().shown.replace("{n}", activeFeatures.length.toLocaleString(lang === "nl" ? "nl-NL" : "en-GB"));
}

function updateNearestLabel() {
    const el = document.getElementById("nearestLbl");
    if (el) el.textContent = t().nearestLabel.replace("{n}", nearestCount);
}

function updateSpoke() {
    if (!allFeatures.length) return;
    const c = map.getCenter();
    const nearest = nearestVenues(c.lng, c.lat);
    const nearestFC = { type: "FeatureCollection", features: nearest };
    const spokesFC = buildSpokes(c.lng, c.lat, nearest);

    if (!layersAdded) {
        addLayers(activeFC(), nearestFC, spokesFC);
        layersAdded = true;
    } else {
        map.getSource("nearest").setData(nearestFC);
        map.getSource("spokes").setData(spokesFC);
    }
}

// Data-driven colour by open state: green = open, red = closed, neutral = unknown.
const OPEN_COLOR = ["match", ["get", "_open"], "open", "#2e8b57", "closed", "#b25b5b", "#b9b9ae"];

function addLayers(allFC, nearestFC, spokesFC) {
    map.addSource("all-pubs", { type: "geojson", data: allFC });
    map.addSource("nearest", { type: "geojson", data: nearestFC });
    map.addSource("spokes", { type: "geojson", data: spokesFC });

    map.addLayer({
        id: "spokes-layer",
        type: "line",
        source: "spokes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
            "line-color": "#6699cc",
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 12, 2.5],
            "line-opacity": 0.85,
        },
    });

    map.addLayer({
        id: "all-pubs-layer",
        type: "circle",
        source: "all-pubs",
        paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 14, 4],
            "circle-color": OPEN_COLOR,
            "circle-opacity": 0.85,
        },
    });

    map.addLayer({
        id: "nearest-layer",
        type: "circle",
        source: "nearest",
        paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 14, 6],
            "circle-color": OPEN_COLOR,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1.5,
        },
    });

    map.addLayer({
        id: "pubs-hitbox",
        type: "circle",
        source: "all-pubs",
        paint: { "circle-radius": 14, "circle-opacity": 0 },
    });

    map.on("mouseenter", "pubs-hitbox", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "pubs-hitbox", () => (map.getCanvas().style.cursor = ""));
    map.on("click", "pubs-hitbox", (e) => openPubPopup(e.features[0]));
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[ch]);
}

function safeWebsiteUrl(raw) {
    if (typeof raw !== "string") return null;
    let url = raw.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.href;
    } catch {
        return null;
    }
}

function formatAddress(props) {
    const parts = [];
    const street = props["addr:street"];
    const number = props["addr:housenumber"];
    if (street) parts.push(number ? `${street} ${number}` : street);
    const city = props["addr:city"];
    const postcode = props["addr:postcode"];
    if (postcode || city) parts.push([postcode, city].filter(Boolean).join(" "));
    return parts.length ? parts.join(", ") : null;
}

function renderGuinness(container, osmId, s) {
    const wrap = document.createElement("div");
    wrap.className = "guinness";

    const heading = document.createElement("p");
    heading.className = "g-counts";
    heading.textContent = s.guinnessHeading;

    const counts = document.createElement("p");
    counts.className = "g-counts";

    const buttons = document.createElement("div");
    buttons.className = "g-buttons";
    const yesBtn = document.createElement("button");
    yesBtn.textContent = "🍺 " + s.guinnessYes;
    const noBtn = document.createElement("button");
    noBtn.textContent = s.guinnessNo;

    function refresh() {
        const c = guinnessCounts[osmId] || { yes: 0, no: 0 };
        counts.textContent = `${s.guinnessYes}: ${c.yes} · ${s.guinnessNo}: ${c.no}`;
    }
    refresh();

    function onVote(serves) {
        yesBtn.disabled = noBtn.disabled = true;
        sendVote(osmId, serves)
            .then((c) => {
                guinnessCounts[osmId] = c;
                refresh();
                yesBtn.classList.toggle("sel", serves);
                noBtn.classList.toggle("sel", !serves);
                yesBtn.disabled = noBtn.disabled = false;
                if (filterState.guinness) applyFilters();
            })
            .catch(() => {
                counts.textContent = s.guinnessError;
                yesBtn.disabled = noBtn.disabled = false;
            });
    }

    yesBtn.addEventListener("click", () => onVote(true));
    noBtn.addEventListener("click", () => onVote(false));
    buttons.appendChild(yesBtn);
    buttons.appendChild(noBtn);
    wrap.appendChild(heading);
    wrap.appendChild(counts);
    wrap.appendChild(buttons);
    container.appendChild(wrap);
}

function openPubPopup(feature) {
    const s = t();
    const p = feature.properties || {};
    const name = p.name || s.unknown;
    const amenityKey = (p.amenity || "").toLowerCase();
    const amenity = s.amenities[amenityKey] || amenityKey || s.unknown;
    const address = formatAddress(p);
    const hours = p.opening_hours;
    const websiteUrl = safeWebsiteUrl(p.website);
    const state = p._open || "unknown";

    const rows = [`<h3>${escapeHtml(name)}</h3>`];
    rows.push(`<p><span class="pc-badge ${state}">${escapeHtml(s.state[state])}</span></p>`);
    rows.push(`<p><strong>${s.popupAmenity}:</strong> ${escapeHtml(amenity)}</p>`);
    if (address) rows.push(`<p><strong>${s.popupAddress}:</strong> ${escapeHtml(address)}</p>`);
    if (hours) rows.push(`<p><strong>${s.popupHours}:</strong> ${escapeHtml(hours)}</p>`);
    if (p.stale) {
        const note = p.last_edit
            ? `${s.staleNote} (${s.lastEdit.replace("{date}", escapeHtml(p.last_edit))})`
            : s.staleNote;
        rows.push(`<p class="pc-stale">⚠ ${note}</p>`);
    }
    if (websiteUrl) {
        rows.push(
            `<p><strong>${s.popupWebsite}:</strong> <a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.websiteLink)}</a></p>`,
        );
    }

    const container = document.createElement("div");
    container.innerHTML = rows.join("");
    if (guinnessAvailable && p.osm_id) {
        renderGuinness(container, p.osm_id, s);
    }

    new maplibregl.Popup({ maxWidth: "280px" })
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(container)
        .addTo(map);
}

// ---------- filter panel wiring ----------
function wireFilters() {
    document.getElementById("nearestSlider").addEventListener("input", (e) => {
        nearestCount = Number(e.target.value);
        updateNearestLabel();
        updateSpoke();
    });
    document.querySelectorAll('#fltTypes input[data-type]').forEach((cb) => {
        cb.addEventListener("change", () => {
            filterState.types[cb.dataset.type] = cb.checked;
            applyFilters();
        });
    });
    document.getElementById("fltOpenNow").addEventListener("change", (e) => {
        filterState.openNow = e.target.checked;
        applyFilters();
    });
    document.getElementById("fltGuinness").addEventListener("change", (e) => {
        filterState.guinness = e.target.checked;
        applyFilters();
    });
    document.getElementById("fltHideStale").addEventListener("change", (e) => {
        filterState.hideStale = e.target.checked;
        applyFilters();
    });
}

// ---------- sun & shadow overlay ----------
// MapLibre cannot cast ground shadows natively, so we project building footprints
// (from the OpenMapTiles "building" source-layer, which carries render_height)
// along the sun vector and draw the swept silhouettes as a semi-transparent fill.
// Approximate: flat ground, sparse heights, convex-hull silhouette. See README.
const sunSupported = typeof SunCalc === "object" && typeof SunCalc.getPosition === "function";
const SHADOW_MIN_ZOOM = 15;
const SHADOW_MAX_LEN_M = 300;
const DEFAULT_BUILDING_HEIGHT = 9; // ~3 floors, when render_height is missing

let shadowMode = false;
let sunLive = true; // follow the current moment vs the time slider
let sunMinutes = 12 * 60; // NL wall-clock minute of today (when not live)
let savedLight = null;
let savedPitch = 0;
let shadowLayerAdded = false;
let sunRecomputeQueued = false;

// Amsterdam UTC offset (minutes) at a given instant — handles CET/CEST (DST).
function amsterdamOffsetMin(date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Amsterdam", hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const o = {};
    for (const p of dtf.formatToParts(date)) o[p.type] = p.value;
    const h = o.hour === "24" ? "00" : o.hour;
    return (Date.UTC(+o.year, +o.month - 1, +o.day, +h, +o.minute, +o.second) - date.getTime()) / 60000;
}

function amsterdamToday(now) {
    const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
    const o = {};
    for (const p of dtf.formatToParts(now)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day };
}

// Real instant for a chosen NL wall-clock minute today (DST-correct via refinement).
function instantForMinutes(minutes) {
    const now = new Date();
    const { y, m, d } = amsterdamToday(now);
    const h = Math.floor(minutes / 60), min = minutes % 60;
    let guess = Date.UTC(y, m - 1, d, h, min) - amsterdamOffsetMin(now) * 60000;
    guess = Date.UTC(y, m - 1, d, h, min) - amsterdamOffsetMin(new Date(guess)) * 60000;
    return new Date(guess);
}

function currentSunInstant() {
    return sunLive ? new Date() : instantForMinutes(sunMinutes);
}

// SunCalc needs the REAL instant (unlike the open-now wall-clock trick).
// Returns { altitude(rad), altDeg, azDeg, brg } or null when the sun is down.
// brg = shadow direction (compass degrees from north): shadows fall away from the sun.
function sunInfo(date) {
    if (!sunSupported) return null;
    const c = map.getCenter();
    const p = SunCalc.getPosition(date, c.lat, c.lng);
    if (p.altitude <= 0.0087) return null; // <= ~0.5°: treat as below horizon
    return {
        altitude: p.altitude,
        altDeg: p.altitude * 180 / Math.PI,
        azDeg: p.azimuth * 180 / Math.PI,
        brg: ((p.azimuth * 180 / Math.PI) + 360) % 360,
    };
}

// Andrew's monotone-chain convex hull (counter-clockwise), dependency-free.
function convexHull(points) {
    if (points.length <= 3) return points;
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of pts) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function ringsOf(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return [geometry.coordinates[0]];
    if (geometry.type === "MultiPolygon") return geometry.coordinates.map((poly) => poly[0]);
    return [];
}

function addShadowLayer() {
    if (shadowLayerAdded) return;
    map.addSource("shadows", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const beforeId = map.getLayer("building-3d")
        ? "building-3d"
        : (map.getLayer("all-pubs-layer") ? "all-pubs-layer" : undefined);
    map.addLayer({
        id: "shadows-layer",
        type: "fill",
        source: "shadows",
        paint: { "fill-color": "#19192b", "fill-opacity": 0.33 },
    }, beforeId);
    shadowLayerAdded = true;
}

function computeShadows() {
    sunRecomputeQueued = false;
    if (!shadowMode || !shadowLayerAdded) return;
    const statusEl = document.getElementById("sunStatus");
    const empty = { type: "FeatureCollection", features: [] };

    if (map.getZoom() < SHADOW_MIN_ZOOM) {
        map.getSource("shadows").setData(empty);
        statusEl.textContent = t().sunZoomIn;
        return;
    }
    const sun = sunInfo(currentSunInstant());
    if (!sun) {
        map.getSource("shadows").setData(empty);
        statusEl.textContent = t().sunBelowHorizon;
        return;
    }
    statusEl.textContent = t().sunAltitude.replace("{deg}", Math.round(sun.altDeg));

    const brgRad = sun.brg * Math.PI / 180;
    const tanAlt = Math.tan(sun.altitude);
    const lat = map.getCenter().lat;
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos(lat * Math.PI / 180);
    const sinB = Math.sin(brgRad), cosB = Math.cos(brgRad);

    let buildings;
    try {
        buildings = map.querySourceFeatures("openmaptiles", { sourceLayer: "building" });
    } catch (e) {
        buildings = [];
    }
    const seen = new Set();
    const features = [];
    for (const b of buildings) {
        if (b.id != null) {
            if (seen.has(b.id)) continue;
            seen.add(b.id);
        }
        const h = Number(b.properties && b.properties.render_height) || DEFAULT_BUILDING_HEIGHT;
        let len = h / tanAlt;
        if (!isFinite(len) || len <= 0) continue;
        if (len > SHADOW_MAX_LEN_M) len = SHADOW_MAX_LEN_M;
        const dLng = (len * sinB) / mPerDegLng;
        const dLat = (len * cosB) / mPerDegLat;
        for (const ring of ringsOf(b.geometry)) {
            if (!ring || ring.length < 3) continue;
            const pts = [];
            for (const [x, y] of ring) {
                pts.push([x, y]);
                pts.push([x + dLng, y + dLat]);
            }
            const hull = convexHull(pts);
            if (hull.length < 3) continue;
            hull.push(hull[0]);
            features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [hull] } });
        }
    }
    map.getSource("shadows").setData({ type: "FeatureCollection", features });
}

function queueShadows() {
    if (sunRecomputeQueued) return;
    sunRecomputeQueued = true;
    requestAnimationFrame(computeShadows);
}

// Light the 3D building faces from the sun (cosmetic; faces only, not ground).
function applySunLight(sun) {
    if (!sun) return;
    map.setLight({
        anchor: "map",
        color: "#fff",
        intensity: 0.45,
        position: [1.3, (sun.azDeg + 180) % 360, Math.max(2, 90 - sun.altDeg)],
    });
}

function refreshSunPanel() {
    if (!shadowMode) return;
    const inst = currentSunInstant();
    document.getElementById("sunTime").textContent = new Intl.DateTimeFormat(
        lang === "nl" ? "nl-NL" : "en-GB",
        { timeZone: "Europe/Amsterdam", weekday: "short", hour: "2-digit", minute: "2-digit" },
    ).format(inst);
    const nowBtn = document.getElementById("sunNowBtn");
    nowBtn.textContent = t().sunNow;
    nowBtn.classList.toggle("live", sunLive);
    if (sunLive) {
        const local = new Date(inst.getTime() + amsterdamOffsetMin(inst) * 60000);
        document.getElementById("sunSlider").value = local.getUTCHours() * 60 + local.getUTCMinutes();
    }
}

function whenStyleReady(fn) {
    if (map.isStyleLoaded()) fn();
    else map.once("idle", fn);
}

function setShadowMode(on) {
    shadowMode = on;
    document.getElementById("sunBtn").classList.toggle("active", on);
    document.getElementById("sunPanel").classList.toggle("open", on);
    if (on) {
        whenStyleReady(() => {
            if (!shadowMode) return;
            if (savedLight === null) {
                try { savedLight = map.getLight(); } catch (e) { savedLight = undefined; }
            }
            savedPitch = map.getPitch();
            addShadowLayer();
            applySunLight(sunInfo(currentSunInstant()));
            map.easeTo({ pitch: 45, duration: 600 });
            refreshSunPanel();
            computeShadows();
        });
    } else {
        if (shadowLayerAdded) map.getSource("shadows").setData({ type: "FeatureCollection", features: [] });
        if (savedLight) {
            try { map.setLight(savedLight); } catch (e) { /* ignore */ }
        }
        map.easeTo({ pitch: savedPitch || 0, duration: 600 });
    }
}

function wireSun() {
    if (!sunSupported) {
        document.getElementById("sunBtn").style.display = "none";
        return;
    }
    document.getElementById("sunBtn").addEventListener("click", () => setShadowMode(!shadowMode));
    document.getElementById("sunSlider").addEventListener("input", (e) => {
        sunLive = false;
        sunMinutes = Number(e.target.value);
        applySunLight(sunInfo(currentSunInstant()));
        refreshSunPanel();
        queueShadows();
    });
    document.getElementById("sunNowBtn").addEventListener("click", () => {
        sunLive = true;
        applySunLight(sunInfo(currentSunInstant()));
        refreshSunPanel();
        computeShadows();
    });
    map.on("moveend", () => { if (shadowMode) queueShadows(); });
    setInterval(() => {
        if (shadowMode && sunLive) {
            applySunLight(sunInfo(currentSunInstant()));
            refreshSunPanel();
            computeShadows();
        }
    }, 60000);
}

// ---------- bootstrap ----------
applyLang();
document.getElementById("filterPanel").classList.add("no-guinness");
wireFilters();
wireSun();

map.on("load", () => {
    fetch("./data/kroegen-pts.json")
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((data) => {
            allFeatures = data.features || [];
            for (const f of allFeatures) {
                f.properties.osm_id = f.id; // expose the OSM id to popups/voting
            }
            computeOpenStates();
            applyFilters();
            map.on("move", updateSpoke);
            // Re-evaluate "open now" periodically so colours/filter stay current.
            setInterval(() => {
                computeOpenStates();
                applyFilters();
            }, 60000);
            loadGuinness();
        })
        .catch((err) => {
            console.error("Failed to load pub data:", err);
            alert("Failed to load pub data — see console.");
        });
});
