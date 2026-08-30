/* ==========================================================================
   action.js — Map & Feature Logic (Orbital Command Console)
   Plug in your custom feature functions here. Your teammates
   can add new tools here without touching script12.js or render12.js.
   Note: this project loads milsymbol from the CDN (see render12.js),
   so this file reads it off window.ms rather than importing it.
   ========================================================================== */

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
        const rangeInput = document.getElementById("radarRangeSlider");
        const rangeValue = rangeInput ? rangeInput.value : 5000;
        console.log(`[Map Action] Deploying Radar. Range: ${rangeValue}m, Active: ${enabled}`);
    },

    "spawnTank": () => {
        console.log("[Map Action] Spawning tactical tank model on map...");
    },

    // ---------------------------------------------------------
    // 6. SYMBOL PLACEMENT HANDLER (Using milsymbol, loaded via CDN)
    // ---------------------------------------------------------
    "symbol": (data) => {
        if (!data || !data.symbol || !data.map) return;

        const { map, latlng, symbol } = data;
        const { name, sidc } = symbol;

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

        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 3px 5px rgba(0,0,0,0.55));
            margin-bottom: 4px;
        `;

        const msLib = window.ms || (typeof ms !== 'undefined' ? ms : null);

        if (sidc && msLib && msLib.Symbol) {
            try {
                const milSymbolInstance = new msLib.Symbol(sidc, {
                    size: 42,
                    fill: true,
                    fillColor: "rgba(245, 158, 11, 0.30)",
                    outlineColor: "#f59e0b",
                    outlineWidth: 2,
                    colorMode: "Light"
                });
                const svgElement = milSymbolInstance.asDOM ? milSymbolInstance.asDOM() : null;
                if (svgElement) {
                    iconWrapper.appendChild(svgElement);
                } else {
                    iconWrapper.innerHTML = milSymbolInstance.asSVG();
                }
            } catch (e) {
                console.warn("[Symbol Action] Failed to render milsymbol:", sidc, e);
                iconWrapper.innerHTML = (window.createMilSymbolSVG ? window.createMilSymbolSVG(sidc, name, 40) : "[ERR]");
            }
        } else {
            iconWrapper.innerHTML = (window.createMilSymbolSVG ? window.createMilSymbolSVG(sidc, name, 40) : "[ICON]");
        }

        const labelWrapper = document.createElement('div');
        labelWrapper.style.cssText = `
            background: rgba(3, 7, 18, 0.90);
            border: 1px solid #f59e0b;
            color: #fff8e7;
            padding: 2px 8px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 10px rgba(245,158,11,0.25);
        `;
        labelWrapper.textContent = name;

        container.appendChild(iconWrapper);
        container.appendChild(labelWrapper);

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