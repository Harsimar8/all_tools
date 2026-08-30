import ms from "milsymbol";

// =============================================================
// PAGE TYPE
// =============================================================
const isToolsWindow = window.location.pathname.endsWith("tools.html");
console.log("TOOLS PAGE:", isToolsWindow ? "/tools.html" : "/");

// =============================================================
// INITIALIZE
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // =========================================================
        // MAP
        // =========================================================
        const mapElement = document.getElementById("map");
        if (mapElement) {
            const map = L.map("map", { zoomControl: false }).setView([30.9010, 75.8573], 13);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            window.tacticalMap = map;
        }

        // =========================================================
        // LOAD TOOLS.JSON
        // =========================================================
        const response = await fetch("tools.json");
        if (!response.ok) {
            throw new Error(`Failed to load tools.json: ${response.status}`);
        }

        const data = await response.json();
        window.terrainToolData = data;

        // =========================================================
        // RENDER
        // =========================================================
        renderHeader(data.panel);
        renderRail(data.sections);
        renderSections(data.sections);

        // =========================================================
        // DEFAULT SECTION
        // =========================================================
        const defaultSection = data.sections.find(section => section.id === "symbols") || data.sections[0];
        if (defaultSection) {
            const defaultButton = document.querySelector(`.rail-btn[data-id="${defaultSection.id}"]`);
            if (defaultButton && window.switchSection) {
                window.switchSection(defaultSection.id, defaultButton);
            }
        }

        // =========================================================
        // DRAGGING
        // =========================================================
        initDockDragging();

        // =========================================================
        // TOOLS WINDOW HANDSHAKE
        // =========================================================
        if (isToolsWindow) {
            console.log("Detached tools page rendered successfully");
            if (window.toolsChannel) {
                window.toolsChannel.postMessage({ type: "TOOLS_WINDOW_READY" });
            }
        }
    } catch (error) {
        console.error("Failed to initialize tools:", error);
    }
});

// =============================================================
// HEADER
// =============================================================
function renderHeader(panelData = {}) {
    const headerContainer = document.getElementById("panelHeaderContainer");
    if (!headerContainer) return;

    headerContainer.innerHTML = `
        <div class="panel-header">
            <div class="panel-brand">
                <div class="brand-mark">${panelData.icon || "◈"}</div>
                <div class="brand-text">
                    <div class="panel-title">${panelData.title || "TACTICAL SUITE"}</div>
                    <div class="panel-subtitle">${panelData.subtitle || "TACTICAL SYSTEM"}</div>
                </div>
            </div>
            <button class="panel-menu" title="Close" onclick="closeTacticalPanel()">×</button>
        </div>
    `;
}

// =============================================================
// CATEGORY RAIL
// =============================================================
function renderRail(sections = []) {
    const rail = document.getElementById("categoryRail");
    if (!rail) return;

    let html = `
        <div class="rail-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
            </svg>
        </div>
    `;

    // =========================================================
    // CATEGORY BUTTONS
    // =========================================================
    sections.forEach(section => {
        html += `
            <button class="rail-btn"
                data-id="${escapeAttribute(section.id)}"
                data-tooltip="${escapeAttribute(section.title || "")}"
                title="${escapeAttribute(section.title || "")}"
                aria-label="Open ${escapeAttribute(section.title || "")}"
                onclick="switchSection('${escapeJS(section.id)}', this)">
                <span class="rail-icon" aria-hidden="true">${section.icon || "◈"}</span>
            </button>
        `;
    });

    // =========================================================
    // DETACH
    // =========================================================
    if (!isToolsWindow) {
        html += `
            <button id="openToolsButton" class="rail-detach" title="Open tools in another window" aria-label="Open tools in another window">
                ↗
            </button>
        `;
    }

    // =========================================================
    // CLOSE
    // =========================================================
    html += `
        <button class="rail-close" title="Close panel" aria-label="Close panel" onclick="closeTacticalPanel()">
            ×
        </button>
    `;

    rail.innerHTML = html;

    // =========================================================
    // DETACH EVENT
    // =========================================================
    if (!isToolsWindow) {
        const button = document.getElementById("openToolsButton");
        if (button && window.openToolsWindow) {
            button.addEventListener("click", window.openToolsWindow);
        }
    }
}

// =============================================================
// RENDER SECTIONS
// =============================================================
function renderSections(sections = []) {
    const container = document.getElementById("dynamicPanelContent");
    if (!container) return;

    container.innerHTML = "";

    sections.forEach(section => {
        const sectionEl = document.createElement("div");
        sectionEl.id = `section-${section.id}`;
        sectionEl.className = "drawer-section";
        sectionEl.dataset.section = section.id;
        sectionEl.style.display = "none";

        let html = `
            <div class="drawer-section-header">
                <div class="drawer-section-title">
                    <span class="sec-icon">${section.icon || "◈"}</span>
                    <span>${section.title || section.id}</span>
                </div>
            </div>
        `;

        // =========================================================
        // SYMBOL SECTION / NORMAL SECTION
        // =========================================================
        const isSymbolSec = Array.isArray(section.items) && section.items.some(item => Array.isArray(item.symbols));
        html += isSymbolSec ? renderSymbolSection(section) : renderNormalSection(section);

        sectionEl.innerHTML = html;
        container.appendChild(sectionEl);
    });
}


// =============================================================
// SYMBOL SECTION
// =============================================================
function renderSymbolSection(section) {
    let html = `
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="symbolSearch" class="search-input" placeholder="Search symbols...">
        </div>
        <div class="filter-pills" id="symbolFilterPills">
            <button class="filter-pill active" data-filter-category="all">ALL</button>
    `;

    const allSymbols = [];

    (section.items || []).forEach(category => {
        if (!Array.isArray(category.symbols)) {
            return;
        }

        html += `
            <button class="filter-pill" data-filter-category="${escapeAttribute(category.id)}">
                ${(category.label || category.id).toUpperCase()}
            </button>
        `;

        category.symbols.forEach(symbol => {
            allSymbols.push({
                ...symbol,
                categoryId: category.id,
                categoryLabel: category.label || category.id
            });
        });
    });

    html += `
        </div>
        <div class="symbol-card-grid">
    `;

    allSymbols.forEach(symbol => {
        const svgIcon = createMilSymbolSVG(symbol.sidc, 34);

        html += `
            <div class="tactical-symbol-card"
                data-category="${escapeAttribute(symbol.categoryId)}"
                data-name="${escapeAttribute(symbol.name || "")}"
                data-tool-type="symbol"
                data-tool-id="symbol"
                data-tool-name="${escapeAttribute(symbol.name || "")}"
                data-tool-sidc="${escapeAttribute(symbol.sidc || "")}">
                <div class="card-top">
                    <span class="card-tag">${(symbol.categoryLabel || "").toUpperCase()}</span>
                    <span class="status-led"></span>
                </div>
                <div class="card-glyph-box">
                    ${svgIcon}
                </div>
                <div class="card-bottom">
                    <span class="card-label">${symbol.name || "Symbol"}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    return html;
}

// =============================================================
// NORMAL SECTION
// =============================================================
function renderNormalSection(section) {
    let html = "";
    let buttonGridActive = false;

    (section.items || []).forEach((item, index) => {
        // =========================================================
        // BUTTON / MODE
        // =========================================================
        if (item.type === "button" || item.type === "mode") {
            if (!buttonGridActive) {
                html += `
                    <div class="button-grid">
                `;
                buttonGridActive = true;
            }

            const buttonSide = index % 2 ? " button-right" : " button-left";
            const wideClass = item.wide ? " wide" : "";
            const dangerClass = item.danger ? " danger-action" : "";

            html += `
                <button
                    class="tool-button${wideClass}${dangerClass}${buttonSide}"
                    data-tool-type="${escapeAttribute(item.type)}"
                    data-tool-id="${escapeAttribute(item.id || "")}"
                    data-tool-name="${escapeAttribute(item.label || item.id || "")}"
                    data-tool-action="${item.action ? "true" : "false"}"
                    data-tool-wide="${item.wide ? "true" : "false"}"
                >
                    <span class="button-icon">
                        ${item.icon || "◈"}
                    </span>
                    <span>
                        ${item.label || item.id || "Tool"}
                    </span>
                </button>
            `;
        }

        // =========================================================
        // TOGGLE
        // =========================================================
        else if (item.type === "toggle") {
            if (buttonGridActive) {
                html += `</div>`;
                buttonGridActive = false;
            }

            const onText = item.onLabel || `${item.label}: ON`;
            const offText = item.offLabel || `${item.label}: OFF`;
            const enabled = Boolean(item.value);

            html += `
                <button
                    id="${escapeAttribute(item.id)}Button"
                    class="tactical-toggle-btn${item.wide ? " wide" : ""}"
                    data-tool-type="toggle"
                    data-tool-id="${escapeAttribute(item.id || "")}"
                    data-tool-name="${escapeAttribute(item.label || item.id || "")}"
                    data-enabled="${enabled}"
                    data-on-label="${escapeAttribute(onText)}"
                    data-off-label="${escapeAttribute(offText)}"
                >
                    <span class="toggle-text">
                        ${enabled ? onText : offText}
                    </span>
                    <div class="toggle-indicator"></div>
                </button>
            `;
        }

        // =========================================================
        // NUMBER / SLIDER
        // =========================================================
        else if (item.type === "number") {
            if (buttonGridActive) {
                html += `</div>`;
                buttonGridActive = false;
            }

            const minVal = item.min !== undefined ? item.min : 0;
            const maxVal = item.max !== undefined ? item.max : 1000;
            const step = item.step !== undefined ? item.step : 1;
            const value = item.value !== undefined ? item.value : minVal;
            const unit = item.unit || "";

            html += `
                <div
                    class="slider-control-card"
                    data-tool-type="number"
                    data-tool-id="${escapeAttribute(item.id || "")}"
                    data-tool-name="${escapeAttribute(item.label || item.id || "")}"
                    data-tool-unit="${escapeAttribute(unit)}"
                >
                    <div class="slider-top-row">
                        <span class="slider-label">
                            ${item.label || item.id || "Value"}
                        </span>
                        <span
                            class="slider-number"
                            id="${escapeAttribute(item.id)}Value"
                        >
                            ${value} ${unit}
                        </span>
                    </div>
                    <div class="slider-bottom-row">
                        <button
                            class="mini-stepper-btn"
                            data-stepper="down"
                            data-tool-id="${escapeAttribute(item.id || "")}"
                            data-step="${step}"
                        >
                            −
                        </button>
                        <input
                            type="range"
                            class="cyber-range-input"
                            id="${escapeAttribute(item.id)}Slider"
                            data-tool-type="number"
                            data-tool-id="${escapeAttribute(item.id || "")}"
                            data-tool-name="${escapeAttribute(item.label || item.id || "")}"
                            data-tool-unit="${escapeAttribute(unit)}"
                            min="${minVal}"
                            max="${maxVal}"
                            step="${step}"
                            value="${value}"
                        >
                        <button
                            class="mini-stepper-btn"
                            data-stepper="up"
                            data-tool-id="${escapeAttribute(item.id || "")}"
                            data-step="${step}"
                        >
                            +
                        </button>
                    </div>
                </div>
            `;
        }

        // =========================================================
        // UNKNOWN TYPE
        // =========================================================
        else {
            console.warn("Unknown tool item type:", item);
        }
    });

    if (buttonGridActive) {
        html += `</div>`;
    }

    return html;
}

// =============================================================
// MILSYMBOL
// =============================================================
function createMilSymbolSVG(sidc, size = 34) {
    if (ms && ms.Symbol && sidc) {
        try {
            return new ms.Symbol(sidc, { size: size }).asSVG();
        } catch (error) {
            console.warn("MilSymbol failed:", sidc, error);
        }
    }

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 2v20"/>
            <path d="M2 12h20"/>
        </svg>
    `;
}

// =============================================================
// PANEL DRAGGING
// =============================================================
function initDockDragging() {
    const dock = document.querySelector(".tactical-menu-dock");
    const header = document.querySelector(".category-rail");

    if (!dock || !header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    header.style.cursor = "move";

    header.addEventListener("mousedown", event => {
        if (event.target.closest(".rail-btn, .rail-close, .rail-detach")) return;

        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;

        const rect = dock.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        dock.style.position = "fixed";
        dock.style.left = `${initialLeft}px`;
        dock.style.top = `${initialTop}px`;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(event) {
        if (!isDragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        dock.style.left = `${initialLeft + dx}px`;
        dock.style.top = `${initialTop + dy}px`;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }
}

// =============================================================
// HELPERS
// =============================================================
function escapeAttribute(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeJS(value) {
    return String(value ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r");
}

// =============================================================
// EXPORT
// =============================================================
window.renderHeader = renderHeader;
window.renderRail = renderRail;
window.renderSections = renderSections;