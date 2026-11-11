/* Maximize business forms without moving fields or changing their behavior. */
(() => {
  function init() {
    const stage = document.querySelector(".stage");
    if (!stage) return;
    const excluded = new Set(["main-window", "login-window"]);
    const gridsSeen = new WeakSet();
    const tablesSeen = new WeakSet();
    let pending = false;
    let mobile = false;
    let desktopSidebarHidden = false;

    function tracks(value) {
      const repeat = value.match(/^repeat\(\s*(\d+)\s*,/);
      if (repeat) return Number(repeat[1]);
      let depth = 0;
      let count = 0;
      let token = false;
      for (const char of value) {
        if (char === "(" || char === "[") depth++;
        if (char === ")" || char === "]") depth--;
        if (/\s/.test(char) && depth === 0) token = false;
        else if (!token) { count++; token = true; }
      }
      return count;
    }

    function enhance(panel) {
      panel.classList.add("erp-workspace-window");
      for (const child of panel.children) {
        if (Array.from(child.classList).some(name => name.endsWith("-card"))) {
          child.classList.add("erp-form-frame");
        }
      }
      for (const el of panel.querySelectorAll("div, fieldset, label")) {
        if (gridsSeen.has(el) || el.closest("table, .modal, .ask, [role='dialog']")) continue;
        gridsSeen.add(el);
        const style = getComputedStyle(el);
        if (Array.from(el.classList).some(name => name.endsWith("-body"))) {
          el.classList.add("erp-form-body");
        }
        if (style.display === "flex" && style.flexDirection === "row") {
          el.classList.add("erp-flex-row");
        }
        if (style.display !== "grid" || style.gridTemplateColumns === "none") continue;
        if (el.matches("label:has(> input[type='checkbox']), label:has(> input[type='radio'])")) continue;
        const fieldRow = el.tagName === "LABEL" ||
          /(?:^|[-\s])(line|row|field|split|name)(?:$|[-\s])/.test(el.className);
        if (/(actions|cmds|move|end)/.test(el.className)) continue;
        const count = Math.max(1, Math.min(6, tracks(style.gridTemplateColumns)));
        el.classList.add(count === 1 ? "erp-single-grid" :
          fieldRow ? "erp-field-row" : "erp-panel-grid");
        el.style.setProperty("--erp-panel-columns",
          String(count));
      }
      for (const wrap of panel.querySelectorAll(
        ".issue-grid, [class$='-grid-wrap'], [class$='-table-wrap']")) {
        if (!wrap.closest(".modal, .ask, [role='dialog']")) wrap.classList.add("erp-table-scroll");
      }
      for (const table of panel.querySelectorAll("table")) {
        if (tablesSeen.has(table) || table.closest(".modal, .ask, [role='dialog'], td, th")) continue;
        tablesSeen.add(table);
        table.classList.add("erp-data-table");
        const row = table.querySelector("thead tr") || table.rows[0];
        const columns = row ? Array.from(row.cells).reduce((n, cell) => n + cell.colSpan, 0) : 6;
        table.style.setProperty("--erp-table-min-width", `${Math.max(480, columns * 88)}px`);
        if (!table.closest(".erp-table-scroll")) {
          const parent = table.parentElement;
          const style = getComputedStyle(parent);
          if (parent !== panel && /(auto|scroll)/.test(style.overflowX + style.overflowY)) {
            parent.classList.add("erp-table-scroll");
          } else {
            const wrap = document.createElement("div");
            wrap.className = "erp-table-scroll";
            table.before(wrap);
            wrap.append(table);
          }
        }
      }
      for (const actions of panel.querySelectorAll(
        ".actions, [class$='-actions'], .invmfg-bottom, .status-modal-footer")) {
        if (actions.parentElement === panel ||
            actions.parentElement.matches(".erp-form-frame") ||
            actions.matches(".invmfg-bottom, .status-modal-footer")) {
          actions.classList.add("erp-window-actions");
        }
      }
    }

    function discover() {
      for (const panel of document.querySelectorAll("section[id]")) {
        if (excluded.has(panel.id) || panel.matches(".modal, [role='dialog']")) continue;
        const parent = panel.parentElement.closest("section[id]");
        if (!parent || parent.id === "main-window") enhance(panel);
      }
    }

    function resize() {
      const sidebar = document.querySelector(".sidebar");
      const nextMobile = window.innerWidth < 640;
      if (sidebar && nextMobile !== mobile) {
        if (nextMobile) {
          desktopSidebarHidden = sidebar.hidden;
          sidebar.hidden = true;
        } else sidebar.hidden = desktopSidebarHidden;
        mobile = nextMobile;
      }
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const root = document.documentElement;
      const geometry = {
        left: rect.left + 8, top: rect.top + 8,
        width: Math.max(0, rect.width - 16), height: Math.max(0, rect.height - 16),
      };
      for (const [key, value] of Object.entries(geometry)) {
        root.style.setProperty(`--erp-workspace-${key}`, `${value}px`);
      }
      root.classList.toggle("erp-medium", geometry.width < 1100);
      root.classList.toggle("erp-compact", geometry.width < 740);
      root.classList.toggle("erp-narrow", geometry.width < 440);
    }

    function schedule() {
      if (pending) return;
      pending = true;
      queueMicrotask(() => { pending = false; discover(); resize(); });
    }
    discover();
    new ResizeObserver(resize).observe(stage);
    new MutationObserver(records => {
      if (records.some(record => record.type === "childList" &&
          Array.from(record.addedNodes).some(node => node.nodeType === 1))) schedule();
    }).observe(document.body, { subtree: true, childList: true });
    window.addEventListener("resize", resize);
    document.addEventListener("click", event => {
      if (!mobile || !event.target.closest("#popup button")) return;
      // Let the full native click dispatch finish, including the menu's own
      // target handler, which clears and hides the popup.
      setTimeout(() => {
        if (document.querySelector("#popup")?.hidden) {
          document.querySelector(".sidebar").hidden = true;
        }
      }, 0);
    }, true);
    resize();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else init();
})();
