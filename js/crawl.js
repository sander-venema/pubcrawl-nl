"use strict";

// ---------- i18n ----------
const STRINGS = {
    nl: {
        docTitle: "Kroegentocht NL",
        resetBearing: "Noord resetten",
        locateMe: "Centreer op mijn locatie",
        info: "Informatie",
        langToggle: "Switch to English",
        langBtnLabel: "EN",
        infoHeading: "Welkom bij de Kroegentocht",
        infoIntro:
            "Deze interactieve kaart toont de 8 kroegen, bars en cafés die het dichtst bij het midden van de kaart liggen. Versleep de kaart om te zien wat er gebeurt.",
        infoCanList: "Je kunt:",
        infoLi1: "Oriëntatie resetten (rechtsboven)",
        infoLi2: "Naar je huidige locatie springen (indien ondersteund)",
        infoLi3: "Dit infopaneel openen",
        infoLi4: "Tussen Nederlands en Engels wisselen",
        infoCredit:
            'Gebaseerd op het originele <a href="https://glenelg.io/pubcrawl/" target="_blank" rel="noopener">Pub Crawler</a> van Glenelg, dat weer is gebaseerd op werk van Alastair Rae.',
        infoData: 'Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-bijdragers</a> (ODbL). Tegels via OpenFreeMap.',
        geolocateError: "Locatie kan niet worden bepaald.",
        geolocateUnsupported: "Geolocatie wordt niet ondersteund door je browser.",
        popupAmenity: "Type",
        popupAddress: "Adres",
        popupHours: "Openingstijden",
        popupWebsite: "Website",
        websiteLink: "Bezoek",
        unknown: "onbekend",
        amenities: { pub: "Kroeg", bar: "Bar", cafe: "Café" },
    },
    en: {
        docTitle: "Pub Crawl NL",
        resetBearing: "Reset north",
        locateMe: "Recenter on my location",
        info: "Information",
        langToggle: "Wissel naar Nederlands",
        langBtnLabel: "NL",
        infoHeading: "Welcome to the Dutch Pub Crawl",
        infoIntro:
            "This interactive map shows the 8 pubs, bars and cafés closest to the centre of the map. Drag the map to see what happens.",
        infoCanList: "You can:",
        infoLi1: "Reset orientation (top right)",
        infoLi2: "Jump to your current location (if supported)",
        infoLi3: "Open this info panel",
        infoLi4: "Toggle between Dutch and English",
        infoCredit:
            'Based on the original <a href="https://glenelg.io/pubcrawl/" target="_blank" rel="noopener">Pub Crawler</a> by Glenelg, itself inspired by Alastair Rae.',
        infoData: 'Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL). Tiles via OpenFreeMap.',
        geolocateError: "Unable to retrieve your location.",
        geolocateUnsupported: "Geolocation is not supported by your browser.",
        popupAmenity: "Type",
        popupAddress: "Address",
        popupHours: "Opening hours",
        popupWebsite: "Website",
        websiteLink: "Visit",
        unknown: "unknown",
        amenities: { pub: "Pub", bar: "Bar", cafe: "Café" },
    },
};

const STORAGE_KEY = "pubcrawl-nl.lang";
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
    const langBtn = document.getElementById("langBtn");
    langBtn.title = s.langToggle;
    langBtn.textContent = s.langBtnLabel;
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

// ---------- data & nearest-8 logic ----------
let pubs = null;
let pubTree = null;
let layersAdded = false;

function buildIndex(fc) {
    pubTree = new RBush();
    pubTree.load(
        fc.features.map((feature) => {
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

function nearestEight(lng, lat) {
    if (!pubTree) return [];
    return pubTree
        .all()
        .map((item) => ({ feature: item.feature, d: squaredDegDist(lng, lat, item.minX, item.minY) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 8)
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

function updateSpoke() {
    if (!pubs) return;
    const c = map.getCenter();
    const nearest = nearestEight(c.lng, c.lat);
    const nearestFC = { type: "FeatureCollection", features: nearest };
    const spokesFC = buildSpokes(c.lng, c.lat, nearest);

    if (!layersAdded) {
        addLayers(pubs, nearestFC, spokesFC);
        layersAdded = true;
    } else {
        map.getSource("nearest").setData(nearestFC);
        map.getSource("spokes").setData(spokesFC);
    }
}

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
            "circle-color": "#a7a79b",
            "circle-opacity": 0.85,
        },
    });

    map.addLayer({
        id: "nearest-layer",
        type: "circle",
        source: "nearest",
        paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 14, 6],
            "circle-color": "#035690",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1,
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

function openPubPopup(feature) {
    const s = t();
    const p = feature.properties || {};
    const name = p.name || s.unknown;
    const amenityKey = (p.amenity || "").toLowerCase();
    const amenity = s.amenities[amenityKey] || amenityKey || s.unknown;
    const address = formatAddress(p);
    const hours = p.opening_hours;
    const websiteUrl = safeWebsiteUrl(p.website);

    const rows = [`<h3>${escapeHtml(name)}</h3>`];
    rows.push(`<p><strong>${s.popupAmenity}:</strong> ${escapeHtml(amenity)}</p>`);
    if (address) rows.push(`<p><strong>${s.popupAddress}:</strong> ${escapeHtml(address)}</p>`);
    if (hours) rows.push(`<p><strong>${s.popupHours}:</strong> ${escapeHtml(hours)}</p>`);
    if (websiteUrl) {
        rows.push(
            `<p><strong>${s.popupWebsite}:</strong> <a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.websiteLink)}</a></p>`,
        );
    }

    new maplibregl.Popup({ maxWidth: "280px" })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(rows.join(""))
        .addTo(map);
}

// ---------- bootstrap ----------
applyLang();

map.on("load", () => {
    fetch("./data/kroegen-pts.json")
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((data) => {
            pubs = data;
            buildIndex(pubs);
            updateSpoke();
            map.on("move", updateSpoke);
        })
        .catch((err) => {
            console.error("Failed to load pub data:", err);
            alert("Failed to load pub data — see console.");
        });
});
