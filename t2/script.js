import { toolActions } from './action.js';
import ms from "milsymbol";
window.ms = ms; // Expose globally

// =============================================================
// TOOLS WINDOW COMMUNICATION
// =============================================================

const toolsChannel = new BroadcastChannel("tactical-tools-channel");
window.toolsChannel = toolsChannel;

const isToolsWindow = window.location.href.includes("tools.html");
console.log("BroadcastChannel initialized");

// =============================================================
// DETACHED WINDOW & STATE
// =============================================================

let toolsWindow = null;

window.selectedToolState = null;
window.selectedTacticalSymbol = null;
window.maskSettings = window.maskSettings || {};

// =============================================================
// RECEIVE BROADCAST MESSAGES (Synchronizes both windows!)
// =============================================================

toolsChannel.onmessage = event => {
    console.log("MESSAGE RECEIVED:", event.data);

    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === "TOOLS_WINDOW_READY") {
        if (!isToolsWindow) {
            const dock = document.querySelector(".tactical-menu-dock");
            if (dock) dock.style.display = "none";
        }
        return;
    }

    if (data.type === "TOOL_SELECTED") {
        // Apply the visual state changes and actions on whichever window received or didn't initiate it
        applyRemoteToolState(data);

        // If we are on the main page, execute actions/map updates!
        if (!isToolsWindow) {
            window.selectedToolState = data;

            if (data.id && toolActions && toolActions[data.id]) {
                const actionValue = data.value !== undefined ? data.value : (data.enabled !== undefined ? data.enabled : true);
                toolActions[data.id](actionValue);
            }

            if (data.toolType === "symbol" || data.id === "symbol") {
                window.selectedTacticalSymbol = data.selected !== false ? { name: data.name, sidc: data.sidc } : null;
            }
            if (data.enabled !== undefined) {
                window.maskSettings[data.id] = data.enabled;
            }

            triggerToolFeedback(data);
        }
    }
};

// =============================================================
// SEND TOOL MESSAGE
// =============================================================
function broadcastTool(payload) {
    const message = {
        type: "TOOL_SELECTED",
        timestamp: Date.now(),
        ...payload
    };

    console.log("BROADCAST TOOL:", message);
    toolsChannel.postMessage(message);

    // Trigger feedback locally on the window that performed the action
    triggerToolFeedback(payload);
}

// =============================================================
// TOOL FEEDBACK & STATUS FIX (Main Window Only for Notifications)
// =============================================================
function triggerToolFeedback(payload) {
    const isDeselect = payload.selected === false;

    // ONLY show notifications and status text on the main page, NOT in the detached tools window
    if (!isToolsWindow) {
        if (isDeselect) {
            showNotification(`${payload.name} deselected`, true);
            setStatus(`${payload.name} deselected`);
        } else {
            showNotification(payload.name, false);
            if (payload.action) {
                setStatus(`Action: ${payload.name}`);
            } else if (payload.value !== undefined) {
                setStatus(`${payload.name}`);
            } else if (payload.enabled !== undefined) {
                setStatus(`${payload.name}: ${payload.enabled ? "ENABLED" : "DISABLED"}`);
            } else {
                setStatus(`${payload.name} selected`);
            }
        }
    }
}
// =============================================================
// SYNC VISUAL STATES ACROSS WINDOWS (DOM Element Matching)
// =============================================================
function applyRemoteToolState(data) {
    // Find matching button, toggle, or symbol card in the current DOM and sync its classes/attributes
    if (data.toolType === "symbol" || data.id === "symbol") {
        document.querySelectorAll(".tactical-symbol-card").forEach(card => {
            const sidc = card.dataset.toolSidc || card.dataset.sidc;
            if (sidc === data.sidc) {
                if (data.selected === false) {
                    card.classList.remove("selected");
                } else {
                    document.querySelectorAll(".tactical-symbol-card.selected").forEach(c => c.classList.remove("selected"));
                    card.classList.add("selected");
                }
            }
        });
    } else if (data.toolType === "toggle") {
        const toggle = document.querySelector(`[data-tool-id="${CSS.escape(data.id)}"][data-tool-type='toggle']`);
        if (toggle) {
            toggle.dataset.enabled = String(data.enabled);
            toggle.classList.toggle("active", data.enabled);
            const label = toggle.querySelector(".toggle-text");
            if (label) label.textContent = data.name;
        }
    } else {
        const btn = document.querySelector(`.tool-button[data-tool-id="${CSS.escape(data.id)}"]`);
        if (btn) {
            if (data.selected === false) {
                btn.classList.remove("selected");
            } else {
                clearSelectedButtons(btn);
                btn.classList.add("selected");
            }
        }
    }
}

// =============================================================
// OPEN TOOLS WINDOW
// =============================================================

function openToolsWindow() {
    if (toolsWindow && !toolsWindow.closed) {
        toolsWindow.focus();
        return;
    }

    const dock = document.querySelector(".tactical-menu-dock");
    if (!dock) {
        console.error("Main tools dock not found");
        return;
    }

    toolsWindow = window.open("tools.html", "TacticalToolsWindow", "width=420,height=700,resizable=yes");

    if (!toolsWindow) {
        alert("Please allow popups for this site.");
        return;
    }

    dock.style.display = "none";
    console.log("Detached tools window opened");

    const checkClosed = setInterval(() => {
        if (!toolsWindow || toolsWindow.closed) {
            clearInterval(checkClosed);
            toolsWindow = null;
            dock.style.display = "";
            dock.classList.add("panel-open");
            console.log("Tools window closed");
            setStatus("Terrain editor ready");
        }
    }, 500);
}

// =============================================================
// GLOBAL & DOM READY
// =============================================================

window.openToolsWindow = openToolsWindow;

document.addEventListener("DOMContentLoaded", () => {
    initToolEventDelegation();
    initSymbolSearch();
    initSymbolFilters();
    initMapClickListener();

    const openButton = document.getElementById("openToolsButton");
    if (openButton) {
        openButton.addEventListener("click", openToolsWindow);
    }

    if (isToolsWindow) {
        setTimeout(() => {
            toolsChannel.postMessage({ type: "TOOLS_WINDOW_READY" });
            console.log("TOOLS WINDOW READY SENT");
        }, 300);
    }
});

// =============================================================
// MAP CLICK LISTENER
// =============================================================

function initMapClickListener() {
    const checkMapInterval = setInterval(() => {
        if (window.tacticalMap) {
            clearInterval(checkMapInterval);

            window.tacticalMap.on("click", event => {
                if (!window.selectedTacticalSymbol) return;

                if (toolActions && toolActions["symbol"]) {
                    toolActions["symbol"]({
                        map: window.tacticalMap,
                        latlng: event.latlng,
                        symbol: window.selectedTacticalSymbol
                    });
                }
            });

            console.log("[Script] Map click listener successfully attached for symbol placement.");
        }
    }, 300);
}

// =============================================================
// GENERIC TOOL EVENT DELEGATION
// =============================================================

function initToolEventDelegation() {
    document.addEventListener("click", event => {
        const symbolCard = event.target.closest(".tactical-symbol-card");
        if (symbolCard) {
            selectSymbolElement(symbolCard);
            return;
        }

        const filterButton = event.target.closest("[data-filter-category]");
        if (filterButton) {
            filterCategory(filterButton.dataset.filterCategory, filterButton);
            return;
        }

        const stepper = event.target.closest("[data-stepper]");
        if (stepper) {
            handleStepper(stepper);
            return;
        }

        const toggle = event.target.closest("[data-tool-type='toggle']");
        if (toggle) {
            handleGenericToggle(toggle);
            return;
        }

        const toolButton = event.target.closest(".tool-button[data-tool-id]");
        if (toolButton) {
            handleGenericButton(toolButton);
            return;
        }
    });

    document.addEventListener("input", event => {
        const slider = event.target.closest("input[data-tool-type='number']");
        if (!slider) return;

        handleGenericSlider(slider);
    });
}

// =============================================================
// GENERIC BUTTON (Fixed Deselection & Red Color Removal)
// =============================================================

function handleGenericButton(button) {
    const id = button.dataset.toolId;
    const name = button.dataset.toolName || id || "Tool";
    const wasSelected = button.classList.contains("selected");
    const action = button.dataset.toolAction === "true";
    const toolType = button.dataset.toolType;

    if (action) {
        clearSelectedButtons(button);
        broadcastTool({ id, name, selected: true, action: true, toolType });
        return;
    }

    if (wasSelected) {
        button.classList.remove("selected"); // Ensure class is wiped immediately
        broadcastTool({ id, name, selected: false, toolType });
        return;
    }

    clearSelectedButtons(button);
    button.classList.add("selected");
    broadcastTool({ id, name, selected: true, toolType });
}

// =============================================================
// CLEAR BUTTON SELECTION
// =============================================================

function clearSelectedButtons(currentButton) {
    const section = currentButton.closest(".drawer-section");
    if (!section) return;

    section.querySelectorAll(".tool-button.selected").forEach(button => {
        if (button !== currentButton) {
            button.classList.remove("selected");
        }
    });
}

// =============================================================
// SYMBOL (Fixed Deselection)
// =============================================================

function selectSymbolElement(card) {
    const name = card.dataset.toolName || card.dataset.name || "Symbol";
    const sidc = card.dataset.toolSidc || card.dataset.sidc || "";
    const wasSelected = card.classList.contains("selected");

    document.querySelectorAll(".tactical-symbol-card.selected").forEach(other => {
        other.classList.remove("selected");
    });

    if (wasSelected) {
        window.selectedTacticalSymbol = null;
        card.classList.remove("selected"); // Explicitly strip selected class
        broadcastTool({ id: "symbol", name, sidc, selected: false, toolType: "symbol" });
        return;
    }

    card.classList.add("selected");
    window.selectedTacticalSymbol = { name, sidc };

    broadcastTool({ id: "symbol", name, sidc, selected: true, toolType: "symbol" });
}

// =============================================================
// GENERIC TOGGLE
// =============================================================

function handleGenericToggle(button) {
    const current = button.dataset.enabled === "true";
    const next = !current;

    button.dataset.enabled = String(next);
    button.classList.toggle("active", next);

    const label = button.querySelector(".toggle-text");
    const toolName = button.dataset.toolName || "Tool";
    const onText = button.dataset.onLabel || `${toolName}: ON`;
    const offText = button.dataset.offLabel || `${toolName}: OFF`;
    const message = next ? onText : offText;

    if (label) {
        label.textContent = message;
    }

    broadcastTool({
        id: button.dataset.toolId,
        name: message,
        selected: next, // Updated to track accurate selection state
        enabled: next,
        toolType: "toggle"
    });
}

// =============================================================
// GENERIC SLIDER
// =============================================================

function handleGenericSlider(slider) {
    const id = slider.dataset.toolId;
    const value = Number(slider.value);
    const unit = slider.dataset.toolUnit || "";
    const name = slider.dataset.toolName || id || "Value";

    const valueElement = document.getElementById(`${id}Value`);
    if (valueElement) {
        valueElement.textContent = `${value} ${unit}`;
    }

    broadcastTool({
        id: id,
        name: `${name}: ${value} ${unit}`,
        value: value,
        unit: unit,
        toolType: "number"
    });

    if (!isToolsWindow) {
        setStatus(`${name}: ${value} ${unit}`);
    }
}

// =============================================================
// STEPPER
// =============================================================

function handleStepper(button) {
    const id = button.dataset.toolId;
    const slider = document.querySelector(`input[data-tool-id="${CSS.escape(id)}"]`);
    if (!slider) return;

    const step = Number(button.dataset.step || slider.step || 1);
    const direction = button.dataset.stepper === "up" ? 1 : -1;

    let value = Number(slider.value) + step * direction;
    value = Math.max(Number(slider.min), Math.min(Number(slider.max), value));

    slider.value = value;
    slider.dispatchEvent(new Event("input", { bubbles: true }));
}

// =============================================================
// SEARCH & FILTERS
// =============================================================

function initSymbolSearch() {
    const input = document.getElementById("symbolSearch");
    if (!input) return;

    input.addEventListener("input", filterCards);
}

function filterCards() {
    const input = document.getElementById("symbolSearch");
    if (!input) return;

    const query = input.value.toLowerCase().trim();

    document.querySelectorAll(".tactical-symbol-card").forEach(card => {
        const name = (card.dataset.name || "").toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();

        card.style.display = name.includes(query) || category.includes(query) ? "flex" : "none";
    });
}

function initSymbolFilters() {}

function filterCategory(catId, pill) {
    document.querySelectorAll(".filter-pill").forEach(button => {
        button.classList.remove("active");
    });

    if (pill) {
        pill.classList.add("active");
    }

    document.querySelectorAll(".tactical-symbol-card").forEach(card => {
        const category = card.dataset.category;
        card.style.display = catId === "all" || category === catId ? "flex" : "none";
    });
}

// =============================================================
// SECTION SWITCHING
// =============================================================

function switchSection(sectionId, btn) {
    const dock = document.querySelector(".tactical-menu-dock");
    const clickedButton = btn || document.querySelector(`.rail-btn[data-id="${CSS.escape(sectionId)}"]`);
    const target = document.getElementById(`section-${sectionId}`);

    if (!dock || !target) return;

    const alreadyOpen = clickedButton && clickedButton.classList.contains("active");

    if (alreadyOpen) {
        closeTacticalPanel();
        return;
    }

    document.querySelectorAll(".rail-btn").forEach(button => {
        button.classList.remove("active");
    });

    document.querySelectorAll(".drawer-section").forEach(section => {
        section.classList.remove("section-visible", "section-from-left", "section-from-right");
        section.style.display = "none";
    });

    if (clickedButton) {
        clickedButton.classList.add("active");
    }

    dock.classList.add("panel-open");
    target.style.display = "flex";
    target.classList.add("section-from-right");

    requestAnimationFrame(() => {
        target.classList.add("section-visible");
    });

    setStatus(`Opened ${sectionId.toUpperCase()}`);
}

// =============================================================
// CLOSE PANEL
// =============================================================

function closeTacticalPanel() {
    const dock = document.querySelector(".tactical-menu-dock");
    if (!dock) return;

    document.querySelectorAll(".rail-btn").forEach(button => {
        button.classList.remove("active");
    });

    document.querySelectorAll(".drawer-section").forEach(section => {
        section.classList.remove("section-visible");
        section.style.display = "none";
    });

    dock.classList.remove("panel-open");
    hideNotification();
    setStatus("Terrain editor ready");
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeTacticalPanel();
    }
});

// =============================================================
// NOTIFICATIONS & STATUS
// =============================================================

let statusTimer = null;
let notifTimer = null;

function showNotification(name, isDeselected = false) {
    const notif = document.getElementById("toolNotification");
    const text = document.getElementById("notificationText");

    if (!notif || !text) return;

    if (isDeselected) {
        text.innerHTML = `${name}<br><span style="font-size: 0.85em; opacity: 0.8;">TOOL DESELECTED</span>`;
    } else {
        text.innerHTML = `${name}<br><span style="font-size: 0.85em; opacity: 0.8;">TOOL SELECTED</span>`;
    }

    notif.classList.add("show");

    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => {
        notif.classList.remove("show");
    }, 1500);
}

function hideNotification() {
    const notif = document.getElementById("toolNotification");
    if (notif) {
        notif.classList.remove("show");
    }
}

function setStatus(message) {
    const status = document.getElementById("statusText");
    if (!status) return;

    status.textContent = message;

    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        status.textContent = "Terrain editor ready";
    }, 2500);
}

// =============================================================
// RESIZER
// =============================================================

function initDockResizer() {
    const dock = document.querySelector(".tactical-menu-dock");
    if (!dock) return;

    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const MIN_WIDTH = 320;
    const MAX_WIDTH = 420;
    const MIN_HEIGHT = 280;

    dock.addEventListener("pointerdown", event => {
        const rect = dock.getBoundingClientRect();
        const isGrip =
            event.target.id === "dockResizeHandle" ||
            (event.clientX >= rect.right - 24 && event.clientY >= rect.bottom - 24);

        if (!isGrip) return;

        isResizing = true;
        startX = event.clientX;
        startY = event.clientY;
        startWidth = dock.offsetWidth;
        startHeight = dock.offsetHeight;

        dock.classList.add("resizing");
        dock.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    dock.addEventListener("pointermove", event => {
        if (!isResizing) return;

        const maxHeight = window.innerHeight * 0.92;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + event.clientX - startX));
        const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + event.clientY - startY));

        dock.style.width = `${newWidth}px`;
        dock.style.height = `${newHeight}px`;
    });

    const stopResize = event => {
        if (!isResizing) return;

        isResizing = false;
        dock.classList.remove("resizing");

        try {
            dock.releasePointerCapture(event.pointerId);
        } catch (_) {}

        setStatus(`Panel resized: ${dock.offsetWidth}×${dock.offsetHeight}px`);
    };

    dock.addEventListener("pointerup", stopResize);
    dock.addEventListener("pointercancel", stopResize);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDockResizer);
} else {
    initDockResizer();
}

// =============================================================
// GLOBAL EXPORTS
// =============================================================

window.switchSection = switchSection;
window.closeTacticalPanel = closeTacticalPanel;
window.filterCards = filterCards;
window.filterCategory = filterCategory;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.setStatus = setStatus;
window.handleGenericButton = handleGenericButton;
window.handleGenericToggle = handleGenericToggle;
window.handleGenericSlider = handleGenericSlider;
window.openToolsWindow = openToolsWindow;