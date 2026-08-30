/* ==========================================================================
   INTERACTION CONTROLLER — CONCEPT 4: 3D TACTILE COCKPIT CONSOLE
   + Cross-window BroadcastChannel sync + detached tools window
   (UI/markup/CSS untouched — only state broadcasting is added)
   ========================================================================== */

import { toolActions } from './action.js';

const isToolsWindow = window.location.pathname.endsWith("tools.html") || window.location.href.includes("tools.html");

// =============================================================
// BROADCAST CHANNEL — keeps main window + detached tools window in sync
// =============================================================
const toolsChannel = new BroadcastChannel("tactical-tools-channel");
window.toolsChannel = toolsChannel;

let toolsWindow = null;
window.selectedTacticalSymbol = window.selectedTacticalSymbol || null;
window.maskSettings = window.maskSettings || {};

function broadcastTool(payload) {
    toolsChannel.postMessage({ type: "TOOL_SELECTED", timestamp: Date.now(), ...payload });
    // Feedback (toast + status line) is always routed through here so it
    // follows one consistent rule regardless of which window was clicked —
    // see triggerToolFeedback().
    triggerToolFeedback(payload);
}

// Notifications and the status line ALWAYS surface on the main window only
// — never in the detached tools window — matching the original app's
// behavior. This runs both for locally-triggered actions (via broadcastTool)
// and for actions received from the other window (via onmessage below), so
// there's exactly one place that decides whether feedback is shown.
function triggerToolFeedback(payload) {
    if (isToolsWindow) return;

    const isDeselect = payload.selected === false;

    if (isDeselect) {
        showNotification(`${payload.name} deselected`, true);
        setStatus(`${payload.name} deselected`);
    } else {
        showNotification(payload.name, false);
        if (payload.action) {
            setStatus(`Executed: ${payload.name}`);
        } else if (payload.value !== undefined) {
            setStatus(`${payload.name}`);
        } else if (payload.enabled !== undefined) {
            setStatus(`${payload.id}: ${payload.enabled ? "ACTIVE" : "DISABLED"}`);
        } else {
            setStatus(`${payload.name} selected`);
        }
    }
}

toolsChannel.onmessage = (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === "TOOLS_WINDOW_READY") {
        // Tools window has opened and rendered — hide the docked copy on main window
        if (!isToolsWindow) {
            const dock = document.querySelector(".tactical-menu-dock");
            if (dock) dock.style.display = "none";
        }
        return;
    }

    if (data.type === "TOOL_SELECTED") {
        applyRemoteToolState(data);

        // Only the main window actually drives map/terrain behavior
        if (!isToolsWindow) {
            if (data.toolType === "symbol") {
                window.selectedTacticalSymbol = data.selected !== false ? { name: data.name, sidc: data.sidc } : null;
            } else if (data.id && toolActions[data.id]) {
                const actionValue = data.value !== undefined ? data.value
                    : (data.enabled !== undefined ? data.enabled : true);
                toolActions[data.id](actionValue);
            }

            if (data.enabled !== undefined) {
                window.maskSettings[data.id] = data.enabled;
            }
        }

        triggerToolFeedback(data);
    }
};

// Applies the visual (DOM) side of a remote state change to whichever
// window receives it — matches elements by the data-id / data-sidc
// attributes rendered by render12.js.
function applyRemoteToolState(data) {
    if (data.toolType === "symbol") {
        document.querySelectorAll(".tactical-symbol-card").forEach(card => {
            if (card.dataset.sidc === data.sidc) {
                if (data.selected === false) {
                    card.classList.remove("selected");
                } else {
                    document.querySelectorAll(".tactical-symbol-card.selected").forEach(c => c.classList.remove("selected"));
                    card.classList.add("selected");
                }
            }
        });
    } else if (data.toolType === "toggle") {
        const toggle = document.querySelector(`.tactical-toggle-btn[data-id="${CSS.escape(data.id)}"]`);
        if (toggle) {
            toggle.dataset.enabled = String(data.enabled);
            toggle.classList.toggle("active", data.enabled);
            const label = toggle.querySelector(".toggle-text");
            if (label) label.textContent = data.name;
        }
    } else if (data.toolType === "number") {
        const slider = document.getElementById(`${data.id}Slider`);
        const valueEl = document.getElementById(`${data.id}Value`);
        if (slider) slider.value = data.value;
        if (valueEl) valueEl.textContent = `${data.value} ${data.unit || ""}`;
    } else {
        // button / mode / action
        const btn = document.querySelector(`.tool-button[data-id="${CSS.escape(data.id)}"]`);
        if (btn) {
            if (data.action) {
                document.querySelectorAll(".tool-button.selected").forEach(b => b.classList.remove("selected"));
            } else if (data.selected === false) {
                btn.classList.remove("selected");
            } else {
                const parent = btn.closest(".drawer-section");
                if (parent) {
                    parent.querySelectorAll(".tool-button.selected").forEach(b => {
                        if (b !== btn) b.classList.remove("selected");
                    });
                }
                btn.classList.add("selected");
            }
        }
    }
}

// =============================================================
// DETACHED TOOLS WINDOW
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

    toolsWindow = window.open("tools.html", "TacticalToolsWindow", "width=440,height=720,resizable=yes");

    if (!toolsWindow) {
        alert("Please allow popups for this site.");
        return;
    }

    dock.style.display = "none";

    const checkClosed = setInterval(() => {
        if (!toolsWindow || toolsWindow.closed) {
            clearInterval(checkClosed);
            toolsWindow = null;
            dock.style.display = "";
            setStatus("Terrain editor ready");
        }
    }, 500);
}

window.openToolsWindow = openToolsWindow;

// =============================================================
// SECTION SWITCHING
// =============================================================
function switchSection(sectionId, btn) {
    document.querySelectorAll(".rail-btn").forEach(b => b.classList.remove("active"));
    if (btn) {
        btn.classList.add("active");
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    document.querySelectorAll(".drawer-section").forEach(sec => sec.style.display = "none");
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.style.display = "flex";
        target.style.animation = "none";
        target.offsetHeight; // trigger reflow
        target.style.animation = "cockpitIgnite 0.22s cubic-bezier(0.4, 0, 0.2, 1)";
    }

    setStatus(`Section: ${sectionId.toUpperCase()}`);
}

function filterCards() {
    const input = document.getElementById("symbolSearch");
    if (!input) return;
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll(".tactical-symbol-card");

    cards.forEach(card => {
        const name = (card.getAttribute("data-name") || "").toLowerCase();
        const cat = (card.getAttribute("data-category") || "").toLowerCase();
        const matches = name.includes(query) || cat.includes(query);
        card.style.display = matches ? "flex" : "none";
    });
}

function filterCategory(catId, pill) {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    if (pill) pill.classList.add("active");

    const cards = document.querySelectorAll(".tactical-symbol-card");
    cards.forEach(card => {
        if (catId === "all" || card.getAttribute("data-category") === catId) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });

    const searchInput = document.getElementById("symbolSearch");
    if (searchInput && searchInput.value.trim() !== "") {
        filterCards();
    }
}

// =============================================================
// SYMBOL SELECTION (now broadcasts across windows)
// =============================================================
function selectSymbolCard(card, name, sidc) {
    const wasActive = card.classList.contains("selected");
    document.querySelectorAll(".tactical-symbol-card").forEach(c => c.classList.remove("selected"));

    if (wasActive) {
        window.selectedTacticalSymbol = null;
        broadcastTool({ id: "symbol", name, sidc, selected: false, toolType: "symbol" });
        return;
    }

    card.classList.add("selected");
    window.selectedTacticalSymbol = { name, sidc };
    broadcastTool({ id: "symbol", name, sidc, selected: true, toolType: "symbol" });
}

// =============================================================
// SLIDERS
// =============================================================
function sliderChange(id, value, unit) {
    const numEl = document.getElementById(`${id}Value`);
    if (numEl) numEl.textContent = `${value} ${unit}`;

    const slider = document.getElementById(`${id}Slider`);
    if (slider) {
        const min = Number(slider.min) || 0;
        const max = Number(slider.max) || 100;
        const pct = ((value - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(90deg, #00ff9d 0%, #a3e635 ${pct}%, rgba(0, 0, 0, 0.55) ${pct}%)`;
    }

    if (!isToolsWindow && toolActions[id]) {
        toolActions[id](Number(value));
    }

    broadcastTool({ id, name: `${id}: ${value} ${unit}`, value: Number(value), unit, toolType: "number" });
}

function stepValue(id, delta, unit) {
    const slider = document.getElementById(`${id}Slider`);
    if (!slider) return;

    let newVal = Number(slider.value) + delta;
    newVal = Math.max(Number(slider.min), Math.min(Number(slider.max), newVal));
    newVal = Math.round(newVal * 10) / 10;

    slider.value = newVal;
    sliderChange(id, newVal, unit);
}

// =============================================================
// TOGGLES
// =============================================================
function toggleMaskSetting(button, id, onText, offText) {
    const isEnabled = button.dataset.enabled === "true";
    const nextState = !isEnabled;

    button.dataset.enabled = String(nextState);
    button.classList.toggle("active", nextState);

    const labelSpan = button.querySelector(".toggle-text");
    if (labelSpan) {
        labelSpan.textContent = nextState ? onText : offText;
    }

    window.maskSettings[id] = nextState;

    if (!isToolsWindow && toolActions[id]) {
        toolActions[id](nextState);
    }

    broadcastTool({
        id,
        name: nextState ? onText : offText,
        enabled: nextState,
        selected: nextState,
        toolType: "toggle"
    });
}

// =============================================================
// BUTTONS / MODES / ACTIONS
// =============================================================
function selectOption(button, id, name) {
    const wasSelected = button.classList.contains("selected");
    const parent = button.closest(".drawer-section");

    if (parent) {
        parent.querySelectorAll(".tool-button.selected").forEach(btn => btn.classList.remove("selected"));
    }

    if (wasSelected) {
        broadcastTool({ id, name, selected: false, toolType: "mode" });
        return;
    }

    button.classList.add("selected");

    if (!isToolsWindow && toolActions[id]) {
        toolActions[id](true);
    }

    broadcastTool({ id, name, selected: true, toolType: "mode" });
}

function performAction(id, name) {
    document.querySelectorAll(".tool-button.selected").forEach(btn => btn.classList.remove("selected"));

    if (!isToolsWindow && toolActions[id]) {
        toolActions[id]();
    }

    broadcastTool({ id, name, selected: true, action: true, toolType: "action" });
}

// =============================================================
// MAP CLICK -> PLACE SYMBOL (main window only; wasn't wired up before)
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

            console.log("[Script] Map click listener attached for symbol placement.");
        }
    }, 300);
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
    const MAX_WIDTH = 820;
    const MIN_HEIGHT = 290;

    function isResizeGrip(e) {
        const rect = dock.getBoundingClientRect();
        return (
            e.target.id === "dockResizeHandle" ||
            e.target.closest("#dockResizeHandle") ||
            (e.clientX >= rect.right - 24 && e.clientY >= rect.bottom - 24)
        );
    }

    dock.addEventListener("pointerdown", (e) => {
        if (!isResizeGrip(e)) return;

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = dock.offsetWidth;
        startHeight = dock.offsetHeight;

        dock.classList.add("resizing");
        dock.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    const onPointerMove = (e) => {
        if (!isResizing) return;

        const maxH = window.innerHeight * 0.92;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX)));
        const newHeight = Math.min(maxH, Math.max(MIN_HEIGHT, startHeight + (e.clientY - startY)));

        dock.style.width = newWidth + "px";
        dock.style.height = newHeight + "px";
    };

    const stopResize = (e) => {
        if (isResizing) {
            isResizing = false;
            dock.classList.remove("resizing");
            try { dock.releasePointerCapture(e.pointerId); } catch (_) {}
            setStatus(`Resized: ${dock.offsetWidth}×${dock.offsetHeight}px`);
        }
    };

    dock.addEventListener("pointermove", onPointerMove);
    dock.addEventListener("pointerup", stopResize);
    dock.addEventListener("pointercancel", stopResize);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDockResizer);
} else {
    initDockResizer();
}

document.addEventListener("DOMContentLoaded", () => {
    initMapClickListener();
});

// =============================================================
// NOTIFICATIONS & STATUS
// =============================================================
let statusTimer, notifTimer;

function showNotification(name, isDeselected = false) {
    const notif = document.getElementById("toolNotification");
    const text = document.getElementById("notificationText");
    if (!notif || !text) return;
    text.textContent = name;

    const subtext = notif.querySelector("small");
    if (subtext) subtext.textContent = isDeselected ? "TOOL DESELECTED" : "TOOL SELECTED";

    notif.classList.add("show");
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => notif.classList.remove("show"), 1800);
}

function hideNotification() {
    const notif = document.getElementById("toolNotification");
    if (notif) notif.classList.remove("show");
}

function setStatus(message) {
    const status = document.getElementById("statusText");
    if (!status) return;
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = "Terrain editor ready"; }, 2500);
}

// =============================================================
// GLOBAL EXPORTS
// =============================================================
window.switchSection = switchSection;
window.filterCards = filterCards;
window.filterCategory = filterCategory;
window.selectSymbolCard = selectSymbolCard;
window.selectOption = selectOption;
window.performAction = performAction;
window.sliderChange = sliderChange;
window.stepValue = stepValue;
window.toggleMaskSetting = toggleMaskSetting;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.setStatus = setStatus;
window.openToolsWindow = openToolsWindow;