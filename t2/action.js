import ms from "milsymbol";

// =============================================================
// action.js - Map & Feature Logic
// Plug in your custom feature functions here. Your teammates
// can add new tools here without touching script.js or UI code.
// =============================================================

export const toolActions = {
    // ---------------------------------------------------------
    // 1. TERRAIN VIEW TOOLS
    // ---------------------------------------------------------
    "terrainExaggeration": (value) => {
        console.log(`[Map Action] Setting terrain exaggeration to ${value}`);
    },

    "elevationColours": (enabled) => {
        console.log(`[Map Action] Elevation colours: ${enabled ? "ON" : "OFF"}`);
    },

    "slopeShading": (enabled) => {
        console.log(`[Map Action] Slope shading: ${enabled ? "ON" : "OFF"}`);
    },

    "contours": (enabled) => {
        console.log(`[Map Action] Contours: ${enabled ? "ON" : "OFF"}`);
    },

    "waterLevel": (value) => {
        console.log(`[Map Action] Water level adjusted to: ${value}`);
    },

    // ---------------------------------------------------------
    // 2. SCULPT BRUSH TOOLS
    // ---------------------------------------------------------
    "modifyTerrain": (enabled) => {
        console.log(`[Map Action] Modify terrain mode: ${enabled ? "ACTIVE" : "INACTIVE"}`);
    },

    "brushRaise": (enabled) => {
        console.log(`[Map Action] Brush mode RAISE: ${enabled ? "ACTIVE" : "INACTIVE"}`);
    },

    "radius": (value) => {
        console.log(`[Map Action] Brush radius set to: ${value}m`);
    },

    "power": (value) => {
        console.log(`[Map Action] Brush power set to: ${value}m`);
    },

    "maxHeight": (value) => {
        console.log(`[Map Action] Max height set to: ${value}m`);
    },

    "undo": () => {
        console.log("[Map Action] Undo last terrain modification.");
    },

    "redo": () => {
        console.log("[Map Action] Redo last terrain modification.");
    },

    "resetTerrain": () => {
        console.log("[Map Action] Resetting entire terrain to default state.");
    },

    // ---------------------------------------------------------
    // 3. SHAPING TOOLS
    // ---------------------------------------------------------
    "gradeRoad": (enabled) => {
        console.log(`[Map Action] Grade road path: ${enabled ? "ON" : "OFF"}`);
    },

    "gradeFlatten": (enabled) => {
        console.log(`[Map Action] Grade flatten: ${enabled ? "ON" : "OFF"}`);
    },

    "pathWidth": (value) => {
        console.log(`[Map Action] Path width set to: ${value}m`);
    },

    "digDepth": (value) => {
        console.log(`[Map Action] Dig depth set to: ${value}m`);
    },

    "stampDome": () => {
        console.log("[Map Action] Stamping dome structure onto terrain.");
    },

    "crossSection": () => {
        console.log("[Map Action] Generating cross-section view.");
    },

    "regionOffset": () => {
        console.log("[Map Action] Applying region offset.");
    },

    "regionUp": () => {
        console.log("[Map Action] Moving region UP.");
    },

    "regionDown": () => {
        console.log("[Map Action] Moving region DOWN.");
    },

    // ---------------------------------------------------------
    // 4. EROSION / EARTHWORK TOOLS
    // ---------------------------------------------------------
    "erodeWater": (enabled) => {
        console.log(`[Map Action] Water erosion simulation: ${enabled ? "RUNNING" : "STOPPED"}`);
    },

    "talus": (enabled) => {
        console.log(`[Map Action] Talus simulation: ${enabled ? "ON" : "OFF"}`);
    },

    "balanceCutFill": () => {
        console.log("[Map Action] Calculating balanced cut and fill volumes.");
    },

    // ---------------------------------------------------------
    // 5. EXTENSIBILITY SLOT
    // ---------------------------------------------------------
    "deployRadar": (enabled) => {
        const rangeInput = document.querySelector('input[data-tool-id="radarRange"]');
        const rangeValue = rangeInput ? rangeInput.value : 5000;
        console.log(`[Map Action] Deploying Radar. Range: ${rangeValue}m, Active: ${enabled}`);
    },

    "spawnTank": () => {
        console.log("[Map Action] Spawning tactical tank model on map...");
    },

    // ---------------------------------------------------------
    // 6. SYMBOL PLACEMENT HANDLER (Using milsymbol)
    // ---------------------------------------------------------
    "symbol": (data) => {
        if (!data || !data.symbol || !data.map) return;

        const { map, latlng, symbol } = data;
        const { name, sidc } = symbol;

        // Container styled for a standing marker (Symbol on top, Name below)
        const container = document.createElement('div');
        container.className = 'placed-tactical-symbol';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            pointer-events: none;
            white-space: nowrap;
        `;

        // Wrapper for the standing military symbol graphic
        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5));
            margin-bottom: 4px;
        `;

        const milsymbolLib = window.ms || (typeof ms !== 'undefined' ? ms : null);

        if (sidc && milsymbolLib) {
            try {
                // Render a larger standing military icon size
                const milSymbolInstance = new milsymbolLib.Symbol(sidc, { size: 45 });
                const svgElement = milSymbolInstance.asDOM();
                if (svgElement) {
                    iconWrapper.appendChild(svgElement);
                } else {
                    iconWrapper.innerHTML = milSymbolInstance.asSVG();
                }
            } catch (e) {
                console.warn("[Symbol Action] Failed to render milsymbol:", sidc, e);
                iconWrapper.textContent = '[ERR]';
            }
        } else {
            iconWrapper.textContent = '[ICON]';
        }

        // Label box for the name underneath the symbol
        const labelWrapper = document.createElement('div');
        labelWrapper.style.cssText = `
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #38bdf8;
            color: #f8fafc;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        labelWrapper.textContent = name;

        container.appendChild(iconWrapper);
        container.appendChild(labelWrapper);

        // Anchor the bottom center so it stands accurately on the map click coordinate
        const customIcon = L.divIcon({
            className: 'custom-symbol-marker',
            html: container,
            iconSize: [100, 70],
            iconAnchor: [50, 70]
        });

        L.marker([latlng.lat, latlng.lng], { icon: customIcon }).addTo(map);

        if (typeof window.setStatus === "function") {
            window.setStatus(`Placed: ${name} at [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`);
        }
    }
};