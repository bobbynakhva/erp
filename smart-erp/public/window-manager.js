/* Presentation-only stacking for business windows. Never close, reset, save,
 * or move their fields. Only blocking dialogs retain separate modal layers.
 */
(() => {
  function init() {
    const excluded = new Set(["main-window", "login-window"]);
    const openerAliases = {
      openAuditTrail: "audit-window",
      openTraceability: "traceability-window",
      openUserStatus: "status",
    };
    let panels = [];
    let order = [];
    let pending = false;
    const wasVisible = new WeakMap();
    const wrapped = new WeakSet();
    const normalize = value => value.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const visible = panel => !panel.hidden && panel.getClientRects().length > 0 &&
      getComputedStyle(panel).visibility !== "hidden";

    function applyLayers() {
      order = order.filter(panel => panel.isConnected && visible(panel));
      order.forEach((panel, index) => {
        // Bounded layers: always below the sidebar, menus and confirmation UI.
        const layer = String(100 + index);
        if (panel.style.zIndex !== layer ||
            panel.style.getPropertyPriority("z-index") !== "important") {
          panel.style.setProperty("z-index", layer, "important");
        }
      });
    }

    function activate(panel) {
      if (!panels.includes(panel) || !visible(panel)) return;
      if (order.at(-1) === panel) return;
      order = order.filter(other => other !== panel);
      order.push(panel);
      applyLayers();
    }

    function sync() {
      panels = Array.from(document.querySelectorAll("section[id]")).filter(panel => {
        if (excluded.has(panel.id) || panel.matches(".modal, [role='dialog']")) return false;
        const parent = panel.parentElement.closest("section[id]");
        return !parent || parent.id === "main-window";
      });
      for (const panel of panels) {
        const shown = visible(panel);
        const newlyShown = shown && !wasVisible.get(panel);
        wasVisible.set(panel, shown);
        if (newlyShown) activate(panel);
      }
      applyLayers();
    }

    function schedule() {
      if (pending) return;
      pending = true;
      queueMicrotask(() => { pending = false; sync(); });
    }

    sync();
    // Existing openers still perform all original work and return the same
    // result. Also activate a window selected again while it is already open.
    for (const name of Object.keys(window).filter(name => /^open[A-Z]/.test(name))) {
      const original = window[name];
      const panel = panels.find(panel => panel.id === openerAliases[name] ||
        normalize(panel.id) === normalize(name.slice(4)));
      if (!panel || typeof original !== "function" || wrapped.has(original)) continue;
      const opener = function (...args) {
        const result = Reflect.apply(original, this, args);
        activate(panel);
        return result;
      };
      wrapped.add(opener);
      window[name] = opener;
    }

    new MutationObserver(records => {
      if (records.some(record => {
        if (record.type === "attributes") {
          return panels.includes(record.target) || record.target.id === "main-window";
        }
        return [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (node.matches("section[id]") ||
            node.querySelector("section[id]")));
      })) schedule();
    }).observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["hidden", "style"],
    });

    function activateFromEvent(event) {
      if (!(event.target instanceof Element) ||
          event.target.closest(".ask, .modal, [role='dialog']")) return;
      const panel = event.target.closest("section[id]");
      if (panel) activate(panel);
    }
    document.addEventListener("pointerdown", activateFromEvent, true);
    document.addEventListener("focusin", activateFromEvent, true);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else init();
})();
