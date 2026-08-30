/* =====================================================
   BROADCAST CHANNEL & POP-OUT WINDOW
===================================================== */
const tacticalChannel = new BroadcastChannel('tactical_suite_channel');

// Listen for messages from the detached window
tacticalChannel.onmessage = (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'ACTION') {
        if (typeof setStatus === 'function') setStatus(`Synced: ${data.name}`);
        if (typeof showNotification === 'function') showNotification(data.name);
    } else if (data.type === 'SYMBOL_ARMED') {
        window.selectedTacticalSymbol = data.symbol;
        if (typeof showNotification === 'function') showNotification(data.symbol.name);
        if (typeof setStatus === 'function') setStatus(`Armed: ${data.symbol.name}`);
    }
};

// Function to open the toolbox in a separate window

function openToolboxWindow() {
    const windowFeatures = 'width=420,height=620,resizable=yes,scrollbars=no';
    const toolboxWindow = window.open('tools.html', 'TacticalToolbox', windowFeatures);
    
    if (!toolboxWindow) {
        alert("Popup blocked! Please allow popups for this site.");
    }
}
window.openToolboxWindow = openToolboxWindow;




/* =====================================================
   SECTIONS & SEARCH
===================================================== */
function switchSection(sectionId, btn) {
    document.querySelectorAll(".rail-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    document.querySelectorAll(".drawer-section").forEach(sec => sec.style.display = "none");
    const target = document.getElementById(`section-${sectionId}`);
    if (target) target.style.display = "flex";

    setStatus(`Opened ${sectionId.toUpperCase()}`);
}

function filterCards() {
    const input = document.getElementById("symbolSearch");
    if (!input) return;
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll(".tactical-symbol-card");

    cards.forEach(card => {
        const name = (card.getAttribute("data-name") || "").toLowerCase();
        card.style.display = name.includes(query) ? "flex" : "none";
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
}

function selectSymbolCard(card, name, sidc) {
    const wasActive = card.classList.contains("selected");
    document.querySelectorAll(".tactical-symbol-card").forEach(c => c.classList.remove("selected"));

    if (wasActive) {
        hideNotification();
        setStatus(`${name} deselected`);
        return;
    }

    card.classList.add("selected");
    showNotification(name);
    setStatus(`Armed: ${name}`);
}

/* =====================================================
   LIVE GRADIENT SLIDER HANDLERS
===================================================== */
function sliderChange(id, value, unit) {
    const numEl = document.getElementById(`${id}Value`);
    if (numEl) numEl.textContent = `${value} ${unit}`;
    
    setStatus(`${id}: ${value} ${unit}`);
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

/* =====================================================
   TOGGLE MASK FUNCTION (Mask: ON / OFF)
===================================================== */
function toggleMaskSetting(button, id, onText, offText) {
    const isEnabled = button.dataset.enabled === "true";
    const nextState = !isEnabled;

    button.dataset.enabled = String(nextState);
    button.classList.toggle("active", nextState);

    const labelSpan = button.querySelector(".toggle-text");
    if (labelSpan) {
        labelSpan.textContent = nextState ? onText : offText;
    }

    showNotification(nextState ? onText : offText);
    setStatus(`${id}: ${nextState ? "ENABLED" : "DISABLED"}`);
}

/* =====================================================
   DRAG-TO-RESIZE (WIDTH & HEIGHT CONTROLLER)
===================================================== */
function initDockResizer() {
    const dock = document.querySelector(".tactical-menu-dock");
    if (!dock) return;

    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const MIN_WIDTH = 320;
    const MAX_WIDTH = 800;
    const MIN_HEIGHT = 280;

    function isResizeGrip(e) {
        const rect = dock.getBoundingClientRect();
        return (
            e.target.id === "dockResizeHandle" ||
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

    dock.addEventListener("pointermove", (e) => {
        if (!isResizing) return;

        const maxH = window.innerHeight * 0.92;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX)));
        const newHeight = Math.min(maxH, Math.max(MIN_HEIGHT, startHeight + (e.clientY - startY)));

        dock.style.width = newWidth + "px";
        dock.style.height = newHeight + "px";
    });

    const stopResize = (e) => {
        if (isResizing) {
            isResizing = false;
            dock.classList.remove("resizing");
            try { dock.releasePointerCapture(e.pointerId); } catch (_) {}
            setStatus(`Panel resized: ${dock.offsetWidth}×${dock.offsetHeight}px`);
        }
    };

    dock.addEventListener("pointerup", stopResize);
    dock.addEventListener("pointercancel", stopResize);
}

// Initialize resizer on document ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDockResizer);
} else {
    initDockResizer();
}

/* =====================================================
   BUTTON SELECTION & ACTIONS
===================================================== */
function selectOption(button, id, name) {
    const wasSelected = button.classList.contains("selected");
    const parent = button.closest(".drawer-section");
    
    if (parent) {
        parent.querySelectorAll(".tool-button.selected").forEach(btn => btn.classList.remove("selected"));
    }

    if (wasSelected) {
        hideNotification();
        setStatus(`${name} deselected`);
        return;
    }

    button.classList.add("selected");
    showNotification(name);
    setStatus(`${name} selected`);
}

function performAction(id, name) {
    document.querySelectorAll(".tool-button.selected").forEach(btn => btn.classList.remove("selected"));
    showNotification(name);
    setStatus(`Action: ${name}`);
}

/* =====================================================
   STATUS & TOAST
===================================================== */
let statusTimer, notifTimer;

function showNotification(name) {
    const notif = document.getElementById("toolNotification");
    const text = document.getElementById("notificationText");
    if (!notif || !text) return;
    text.textContent = name;
    notif.classList.add("show");
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => notif.classList.remove("show"), 1500);
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

// Global window attachments
window.switchSection = switchSection;
window.filterCards = filterCards;
window.filterCategory = filterCategory;
window.selectSymbolCard = selectSymbolCard;
window.selectOption = selectOption;
window.performAction = performAction;
window.sliderChange = sliderChange;
window.stepValue = stepValue;
window.toggleMaskSetting = toggleMaskSetting;