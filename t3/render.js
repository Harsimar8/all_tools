/* ==========================================================================
   RENDER ENGINE — CONCEPT 4: 3D TACTILE COCKPIT CONSOLE
   - NATO MIL-STD Symbology Engine with Browser-Safe Dynamic Loader
   - Full JSON-Driven Dynamic Rendering
   - Bounded Interactive Dragging
   - Detached tools-window support (rail detach button + data attrs)
   ========================================================================== */

const isToolsWindow = window.location.pathname.endsWith("tools.html") || window.location.href.includes("tools.html");

// Loads the milsymbol CDN script and resolves only once it's actually
// ready to use. Previously this fired-and-forgot the <script> tag, so
// renderSections() would frequently run before window.ms existed and
// silently fall back to placeholder icons — that's why symbols looked
// "wrong" on whichever window rendered first.
function ensureMilSymbolLoaded() {
    if (window.ms && window.ms.Symbol) return Promise.resolve();
    return new Promise((resolve) => {
        const msScript = document.createElement("script");
        msScript.src = "https://unpkg.com/milsymbol@2.0.0/dist/milsymbol.js";
        msScript.onload = () => resolve();
        msScript.onerror = () => resolve(); // fall back to vector icons rather than hang
        document.head.appendChild(msScript);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 0. Flag pages with no #map (the detached tools window) so
        //    style17.css can give the glass panel a readable backdrop —
        //    on the main page the map tiles do that job instead.
        if (!document.getElementById("map")) {
            document.body.classList.add("no-map-backdrop");
        }

        // 1. Ensure MilSymbol is fully loaded BEFORE any symbol is drawn
        await ensureMilSymbolLoaded();

        // 2. Initialize Leaflet Map (main window only — the detached tools
        //    window has no #map element, so this is skipped there safely)
        const mapElement = document.getElementById("map");
        if (mapElement) {
            const map = L.map('map', { zoomControl: false }).setView([30.9010, 75.8573], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            window.tacticalMap = map;
        }

        // 3. Load Tools & Render UI
        const response = await fetch("tools.json");
        const data = await response.json();
        window.terrainToolData = data;

        renderHeader(data.panel);
        renderRail(data.sections);
        renderSections(data.sections);

        const defaultSection = data.sections.find(s => s.id === "symbols") || data.sections[0];
        if (defaultSection) {
            window.switchSection(defaultSection.id, document.querySelector(`.rail-btn[data-id="${defaultSection.id}"]`));
        }

        // 4. ATTACH BOUNDED DRAGGING LOGIC
        const dock = document.querySelector(".tactical-menu-dock");
        const header = document.querySelector(".panel-header");

        if (dock && header) {
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            header.style.cursor = "move";

            header.addEventListener("mousedown", (e) => {
                if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                const rect = dock.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                dock.style.position = "fixed";
                dock.style.left = `${initialLeft}px`;
                dock.style.top = `${initialTop}px`;

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });

            function onMouseMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                const newLeft = Math.max(8, Math.min(window.innerWidth - dock.offsetWidth - 8, initialLeft + dx));
                const newTop = Math.max(8, Math.min(window.innerHeight - dock.offsetHeight - 8, initialTop + dy));

                dock.style.left = `${newLeft}px`;
                dock.style.top = `${newTop}px`;
            }

            function onMouseUp() {
                isDragging = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            }
        }

        // 5. TOOLS WINDOW HANDSHAKE — tell the main window we're ready
        if (isToolsWindow) {
            setTimeout(() => {
                if (window.toolsChannel) {
                    window.toolsChannel.postMessage({ type: "TOOLS_WINDOW_READY" });
                    console.log("TOOLS WINDOW READY SENT");
                }
            }, 300);
        }

    } catch (error) {
        console.error("Failed to load tools.json or initialize map:", error);
    }
});

function renderHeader(panelData) {
    const headerContainer = document.getElementById("panelHeaderContainer");
    if (!headerContainer) return;

    headerContainer.innerHTML = `
        <div class="panel-header">
            <div class="brand-wrapper">
                <div class="brand-icon-box">${panelData.icon}</div>
                <div class="brand-info">
                    <span class="panel-main-title">${panelData.title}</span>
                    <span class="panel-sub-tag">${panelData.subtitle}</span>
                </div>
            </div>
            <button class="panel-opt-btn" title="Options">⋮</button>
        </div>
    `;
}

function renderRail(sections) {
    const rail = document.getElementById("categoryRail");
    if (!rail) return;

    let html = "";
    sections.forEach((section) => {
        html += `
            <button class="rail-btn" data-id="${section.id}" onclick="switchSection('${section.id}', this)">
                <span class="rail-icon">${section.icon}</span>
                <span>${section.title}</span>
            </button>
        `;
    });

    // DETACH BUTTON — only shown on the main (undocked) window.
    // Uses the existing .rail-detach styling already defined in style17.css.
    if (!isToolsWindow) {
        html += `
            <button id="openToolsButton" class="rail-detach" title="Open tools in another window" aria-label="Open tools in another window">
                ↗
            </button>
        `;
    }

    rail.innerHTML = html;

    if (!isToolsWindow) {
        const openButton = document.getElementById("openToolsButton");
        if (openButton && window.openToolsWindow) {
            openButton.addEventListener("click", window.openToolsWindow);
        }
    }
}

function renderSections(sections) {
    const container = document.getElementById("dynamicPanelContent");
    if (!container) return;
    container.innerHTML = "";

    sections.forEach(section => {
        const sectionEl = document.createElement("div");
        sectionEl.id = `section-${section.id}`;
        sectionEl.className = "drawer-section";
        sectionEl.style.display = "none";

        let html = `
            <div class="drawer-section-header">
                <div class="drawer-section-title">
                    <span class="sec-icon">${section.icon}</span>
                    <span>${section.title}</span>
                </div>
            </div>
        `;

        // 1. SYMBOLS SECTION
        if (section.id === "symbols") {
            html += `
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="symbolSearch" class="search-input" placeholder="Search radar, SAM, air..." onkeyup="filterCards()">
                </div>
                <div class="filter-pills" id="symbolFilterPills">
                    <button class="filter-pill active" onclick="filterCategory('all', this)">ALL</button>
            `;

            let allSymbols = [];
            section.items.forEach(cat => {
                if (cat.symbols) {
                    html += `<button class="filter-pill" onclick="filterCategory('${cat.id}', this)">${cat.label.toUpperCase()}</button>`;
                    cat.symbols.forEach(sym => {
                        allSymbols.push({ ...sym, categoryId: cat.id, categoryLabel: cat.label });
                    });
                }
            });

            html += `</div><div class="symbol-card-grid">`;

            allSymbols.forEach(sym => {
                const svgIcon = createMilSymbolSVG(sym.sidc, sym.name, 36);
                html += `
                    <div class="tactical-symbol-card" data-category="${sym.categoryId}" data-name="${sym.name}" data-sidc="${sym.sidc}" onclick="selectSymbolCard(this, '${sym.name}', '${sym.sidc}')">
                        <div class="card-top">
                            <span class="card-tag">${sym.categoryLabel.toUpperCase()}</span>
                            <span class="status-led"></span>
                        </div>
                        <div class="card-glyph-box">
                            ${svgIcon}
                        </div>
                        <div class="card-bottom">
                            <span class="card-label">${sym.name}</span>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // 2. OTHER SECTIONS (Buttons, Sliders & Toggles)
        else {
            let buttonGridActive = false;

            section.items.forEach((item, index) => {
                const isWide = item.wide ? " wide" : "";

                // A. BUTTONS & MODES
                if (item.type === "button" || item.type === "mode") {
                    if (!buttonGridActive) {
                        html += `<div class="button-grid">`;
                        buttonGridActive = true;
                    }

                    const isReset = (item.id || "").toLowerCase().includes("reset") || (item.label || "").toLowerCase().includes("reset");
                    const dangerClass = isReset ? " danger-action" : "";

                    const isAction = (item.id || "").includes("undo") || (item.id || "").includes("redo") || isReset;
                    const clickAction = isAction
                        ? `performAction('${item.id || item.label}', '${item.label}')`
                        : `selectOption(this, '${item.id}', '${item.label}')`;

                    html += `
                        <button class="tool-button${isWide}${dangerClass}" data-id="${item.id || ''}" data-tool-type="${isAction ? 'action' : (item.type || 'button')}" onclick="${clickAction}">
                            <span class="button-icon">${item.icon || "◈"}</span>
                            <span>${item.label}</span>
                        </button>
                    `;
                }
                // B. TOGGLES (e.g. MASK: ON / OFF)
                else if (item.type === "toggle") {
                    if (buttonGridActive) {
                        html += `</div>`;
                        buttonGridActive = false;
                    }

                    html += `
                        <button id="${item.id}Button" class="tactical-toggle-btn${isWide}" 
                            data-id="${item.id}"
                            data-enabled="${item.value}" 
                            onclick="toggleMaskSetting(this, '${item.id}', '${item.onLabel || item.label + ': ON'}', '${item.offLabel || item.label + ': OFF'}')">
                            <span class="toggle-text">${item.value ? (item.onLabel || item.label + ': ON') : (item.offLabel || item.label + ': OFF')}</span>
                            <div class="toggle-indicator"></div>
                        </button>
                    `;
                }
                // C. NUMERIC VALUES -> MECHANICAL SLIDERS
                else if (item.type === "number") {
                    if (buttonGridActive) {
                        html += `</div>`;
                        buttonGridActive = false;
                    }

                    let minVal = 0;
                    let maxVal = item.id === "radius" ? 5000 : item.id === "power" ? 50 : item.id === "maxHeight" ? 2000 : 1000;
                    if (item.id === "radius") minVal = 100;

                    html += `
                        <div class="slider-control-card" data-id="${item.id}">
                            <div class="slider-top-row">
                                <span class="slider-label">${item.label}</span>
                                <span class="slider-number" id="${item.id}Value">${item.value} ${item.unit || ""}</span>
                            </div>
                            <div class="slider-bottom-row">
                                <button class="mini-stepper-btn" onclick="stepValue('${item.id}', -${item.step || 1}, '${item.unit || ""}')">−</button>
                                <input type="range" class="cyber-range-input" id="${item.id}Slider" 
                                    min="${minVal}" max="${maxVal}" step="${item.step || 1}" value="${item.value}" 
                                    oninput="sliderChange('${item.id}', this.value, '${item.unit || ""}')">
                                <button class="mini-stepper-btn" onclick="stepValue('${item.id}', ${item.step || 1}, '${item.unit || ""}')">+</button>
                            </div>
                        </div>
                    `;
                }

                if (index === section.items.length - 1 && buttonGridActive) {
                    html += `</div>`;
                }
            });
        }

        sectionEl.innerHTML = html;
        container.appendChild(sectionEl);
    });
}

/**
 * High-Fidelity NATO MIL-STD Symbology Generator
 */
function createMilSymbolSVG(sidc, name = "", size = 36) {
    const msLib = (typeof ms !== "undefined" && ms && ms.Symbol) ? ms : (typeof window.ms !== "undefined" && window.ms && window.ms.Symbol) ? window.ms : null;
    if (msLib) {
        try {
            return new msLib.Symbol(sidc, {
                size: size,
                fill: true,
                fillColor: "rgba(0, 255, 157, 0.22)",
                strokeWidth: 4,
                outlineColor: "#00ff9d",
                outlineWidth: 2,
                colorMode: "Light"
            }).asSVG();
        } catch (e) {
            console.warn("MilSymbol parsing notice:", sidc);
        }
    }

    // High-Fidelity Tactical Vector Fallbacks
    const lower = name.toLowerCase();
    if (lower.includes("radar")) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="8" width="28" height="20" rx="3" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
            <path d="M11 20a7 7 0 0 1 14 0" stroke="#00ff9d" stroke-width="2" stroke-linecap="round"/>
            <path d="M14 20a4 4 0 0 1 8 0" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
            <circle cx="18" cy="20" r="1.5" fill="#a3e635"/>
        </svg>`;
    } else if (lower.includes("tank")) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="8" width="28" height="20" rx="3" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
            <ellipse cx="18" cy="18" rx="8" ry="4.5" stroke="#a3e635" stroke-width="2" fill="none"/>
            <circle cx="18" cy="18" r="2" fill="#00ff9d"/>
        </svg>`;
    } else if (lower.includes("sam") || lower.includes("s-400")) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
            <polygon points="18 4 32 30 4 30" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
            <path d="M18 10v14M14 20l4-6 4 6" stroke="#a3e635" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    } else if (lower.includes("missile")) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="8" width="28" height="20" rx="3" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
            <path d="M18 10l5 12h-10l5-12z" stroke="#a3e635" stroke-width="2" fill="rgba(163,230,53,0.2)"/>
        </svg>`;
    } else if (lower.includes("bomber") || lower.includes("aircraft")) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
            <path d="M6 24c4-12 20-12 24 0" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
            <path d="M18 10v14M10 18h16" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#00ff9d" stroke-width="2.5" fill="rgba(0,255,157,0.15)"/>
        <circle cx="18" cy="18" r="5" stroke="#a3e635" stroke-width="2" fill="none"/>
    </svg>`;
}

window.createMilSymbolSVG = createMilSymbolSVG;
window.renderHeader = renderHeader;
window.renderRail = renderRail;
window.renderSections = renderSections;