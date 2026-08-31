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
    console.log("MAP ACTION -> Water Level:", value);

    // =========================================================
    // REAL LEAFLET CODE WILL GO HERE
    // =========================================================
}


// =============================================================
// SYMBOL PLACEMENT (used by script.js's map click listener)
// =============================================================
// Called every time the map is clicked while a symbol card is
// armed. Renders the symbol standing upright with a ground stem.
// =============================================================
function placeSymbol({ map, latlng, symbol }) {
    if (!map || !latlng || !symbol || !symbol.sidc) {
        console.warn("placeSymbol(): missing map, latlng, or symbol.sidc", { map, latlng, symbol });
        return;
    }

    console.log("MAP ACTION → Place Symbol:", symbol.name, latlng);

    let glyphSvg;
    try {
        glyphSvg = new ms.Symbol(symbol.sidc, { size: 30 }).asSVG();
    } catch (error) {
        console.warn("MilSymbol failed to render for placement:", symbol.sidc, error);
        glyphSvg = `
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a6b4ff" stroke-width="2">
                <circle cx="12" cy="12" r="8"/>
                <path d="M12 2v20"/>
                <path d="M2 12h20"/>
            </svg>
        `;
    }

    // Replicating the exact reference layout: 
    // [Green Status Bar] -> [Symbol Box] -> [Vertical Ground Stem Pin]
    const standingHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
            <div style="width: 18px; height: 3px; background-color: #22c55e; margin-bottom: 2px; border-radius: 1px; box-shadow: 0 0 3px rgba(34,197,94,0.6);"></div>
            <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid #38bdf8; padding: 2px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                ${glyphSvg}
            </div>
            <div style="width: 2px; height: 16px; background-color: #38bdf8; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
        </div>
    `;

    const icon = L.divIcon({
        html: standingHtml,
        className: "tactical-map-standing-symbol",
        iconSize: [30, 55],       // Total height including status bar and stem
        iconAnchor: [15, 55]      // Anchored strictly at the bottom tip of the stem on the map coordinate
    });

    const marker = L.marker(latlng, {
        icon,
        draggable: true,
        title: symbol.name || "Symbol"
    }).addTo(map);

    marker.bindTooltip(symbol.name || "Symbol", {
        permanent: false,
        direction: "top",
        offset: [0, -35]
    });

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