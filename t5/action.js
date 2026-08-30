// =============================================================
// TOOL ACTIONS
// =============================================================
// This file contains the ACTUAL map functionality.
//
// render.js  → creates UI
// script.js  → handles user interaction + communication
// action.js  → performs the actual Leaflet/map action
//
// NOTE: script.js imports `{ toolActions }` from "./action.js".
// toolActions is a map of { toolId: handlerFunction } so script.js
// can do `toolActions[data.id](value)` directly.
// =============================================================

import ms from "milsymbol";


// =============================================================
// BRUSH RADIUS
// =============================================================
function setBrushRadius(value) {
    console.log("MAP ACTION → Brush Radius:", value);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// BRUSH POWER
// =============================================================
function setBrushPower(value) {
    console.log("MAP ACTION → Brush Power:", value);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// CONTOURS
// =============================================================
function setContours(enabled) {
    console.log("MAP ACTION → Contours:", enabled);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// SLOPE
// =============================================================
function setSlope(enabled) {
    console.log("MAP ACTION → Slope:", enabled);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// WATER LEVEL
// =============================================================
function setWaterLevel(value) {
    console.log("MAP ACTION → Water Level:", value);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// SYMBOL PLACEMENT (used by script.js's map click listener)
// =============================================================
// Called every time the map is clicked while a symbol card is
// armed (window.selectedTacticalSymbol is set). Drops a marker
// rendered with the same milsymbol glyph shown on the card.
// =============================================================
function placeSymbol({ map, latlng, symbol }) {
    if (!map || !latlng || !symbol || !symbol.sidc) {
        console.warn("placeSymbol(): missing map, latlng, or symbol.sidc", { map, latlng, symbol });
        return;
    }

    console.log("MAP ACTION → Place Symbol:", symbol.name, latlng);

    let glyphHtml;
    try {
        glyphHtml = new ms.Symbol(symbol.sidc, { size: 30 }).asSVG();
    } catch (error) {
        console.warn("MilSymbol failed to render for placement:", symbol.sidc, error);
        glyphHtml = `
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a6b4ff" stroke-width="2">
                <circle cx="12" cy="12" r="8"/>
                <path d="M12 2v20"/>
                <path d="M2 12h20"/>
            </svg>
        `;
    }

    const icon = L.divIcon({
        html: glyphHtml,
        className: "tactical-map-symbol-icon",
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const marker = L.marker(latlng, {
        icon,
        draggable: true,
        title: symbol.name || "Symbol"
    }).addTo(map);

    marker.bindTooltip(symbol.name || "Symbol", {
        permanent: false,
        direction: "top",
        offset: [0, -14]
    });

    // Right-click (contextmenu) to remove a placed symbol
    marker.on("contextmenu", () => {
        map.removeLayer(marker);
        window.placedSymbols = (window.placedSymbols || []).filter(m => m !== marker);
    });

    window.placedSymbols = window.placedSymbols || [];
    window.placedSymbols.push(marker);
}


// =============================================================
// TOOL ACTIONS MAP
// =============================================================
// Keyed by tools.json item "id". script.js calls:
//   toolActions[data.id](actionValue)
// Add a new entry here any time you add a new tool id in tools.json.
// =============================================================
export const toolActions = {
    brushRadius: setBrushRadius,
    brushPower: setBrushPower,
    contours: setContours,
    slope: setSlope,
    waterLevel: setWaterLevel,
    symbol: placeSymbol,
};


// =============================================================
// EXPORT (kept for parity / debugging in console)
// =============================================================
window.toolActions = toolActions;