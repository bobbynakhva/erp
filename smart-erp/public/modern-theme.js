/**
 * SMART ERP - Modern Design System, Theme Engine & Toast Notifications
 * Provides:
 * 1. Dark / Light Theme switching with persistent localStorage
 * 2. Non-blocking Toast Notifications (replacing disruptive modal alert() dialogs)
 * 3. Client-side Table Pagination & Debounced Auto-Complete Search
 * 4. Modern Floating Action Toolbars
 */

(function () {
  const THEME_STORAGE_KEY = "smart_erp_theme";

  // 1. THEME ENGINE (Dark / Light Mode)
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Update any theme toggle buttons in the UI
    const btns = document.querySelectorAll(".theme-toggle-btn");
    btns.forEach((btn) => {
      btn.innerHTML = theme === "dark" ? "☀️ Light Theme" : "🌙 Dark Theme";
      btn.setAttribute("title", `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`);
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    showToast(
      `Switched to ${next === "dark" ? "Dark Modern Cockpit" : "Crisp Light Mode"}`,
      "info",
      2500
    );
  }

  // 2. NON-BLOCKING TOAST NOTIFICATION SYSTEM
  function ensureToastContainer() {
    let container = document.getElementById("smart-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "smart-toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = "info", duration = 3500) {
    const container = ensureToastContainer();
    const str = String(message || "").trim();
    if (!str) return;

    const toast = document.createElement("div");
    toast.className = `smart-toast toast-${type}`;

    let icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    let title = "Notification";
    if (type === "success") {
      icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      title = "Success";
    } else if (type === "error") {
      icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
      title = "Action Failed";
    } else if (type === "warning") {
      icon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      title = "Attention";
    }

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div>${escapeHtml(str)}</div>
      </div>
      <button type="button" class="toast-close-btn" aria-label="Close">&times;</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    const closeBtn = toast.querySelector(".toast-close-btn");
    let timer = null;

    function removeToast() {
      if (timer) clearTimeout(timer);
      toast.classList.add("toast-closing");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }

    if (closeBtn) closeBtn.addEventListener("click", removeToast);
    timer = setTimeout(removeToast, duration);

    container.appendChild(toast);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 3. SEAMLESS ALERT() INTERCEPTION
  // Replaces disruptive browser-blocking alert() modals with non-blocking modern toasts
  window._nativeAlert = window.alert;
  window.alert = function (message) {
    const text = String(message || "");
    const lower = text.toLowerCase();

    let detectedType = "info";
    if (
      lower.includes("error") ||
      lower.includes("fail") ||
      lower.includes("cannot") ||
      lower.includes("missing") ||
      lower.includes("invalid") ||
      lower.includes("denied") ||
      lower.includes("not allowed")
    ) {
      detectedType = "error";
    } else if (
      lower.includes("success") ||
      lower.includes("saved") ||
      lower.includes("updated") ||
      lower.includes("completed") ||
      lower.includes("registered") ||
      lower.includes("dispatched")
    ) {
      detectedType = "success";
    } else if (
      lower.includes("warn") ||
      lower.includes("already") ||
      lower.includes("caution") ||
      lower.includes("please enter") ||
      lower.includes("required")
    ) {
      detectedType = "warning";
    }

    showToast(text, detectedType, 4000);
  };

  // 4. DEBOUNCED SEARCH & TABLE PAGINATION ENGINE
  function debounce(fn, wait = 250) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Enhances any standard table or row-container with modern search,
   * live debounced auto-complete filtering, and pagination.
   */
  function initTablePagination(tableOrContainer, options = {}) {
    const el = typeof tableOrContainer === "string" 
      ? document.querySelector(tableOrContainer) 
      : tableOrContainer;
    if (!el) return null;

    let rows = options.rowsSelector 
      ? Array.from(el.querySelectorAll(options.rowsSelector))
      : el.tagName === "TABLE"
        ? Array.from(el.querySelectorAll("tbody tr"))
        : Array.from(el.children);

    let pageSize = options.pageSize || 10;
    let currentPage = 1;
    let filteredRows = [...rows];
    let searchTerm = "";

    // Build Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "modern-table-toolbar";
    toolbar.innerHTML = `
      <div class="table-search-box">
        <span class="table-search-icon">🔍</span>
        <input type="text" placeholder="${options.searchPlaceholder || 'Type to filter rows...'}" aria-label="Search Table">
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <label style="font-size:11px; color:var(--text-muted);">Rows per page:</label>
        <select class="pagination-page-size" style="padding:2px 6px; font-size:11px;">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
          <option value="99999" ${pageSize > 100 ? 'selected' : ''}>All</option>
        </select>
      </div>
    `;

    // Build Pagination Bar
    const paginationBar = document.createElement("div");
    paginationBar.className = "modern-pagination-bar";
    paginationBar.innerHTML = `
      <div class="pagination-info">Showing 0 to 0 of 0 entries</div>
      <div class="pagination-pages"></div>
    `;

    // Insert controls before and after element
    el.parentNode.insertBefore(toolbar, el);
    if (el.nextSibling) {
      el.parentNode.insertBefore(paginationBar, el.nextSibling);
    } else {
      el.parentNode.appendChild(paginationBar);
    }

    const searchInput = toolbar.querySelector("input");
    const pageSizeSelect = toolbar.querySelector(".pagination-page-size");
    const infoLabel = paginationBar.querySelector(".pagination-info");
    const pagesContainer = paginationBar.querySelector(".pagination-pages");

    function render() {
      // Re-scan rows if dynamic table updated
      if (options.rowsSelector) {
        rows = Array.from(el.querySelectorAll(options.rowsSelector));
      }

      // Filter by search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filteredRows = rows.filter((r) => r.textContent.toLowerCase().includes(q));
      } else {
        filteredRows = [...rows];
      }

      const total = filteredRows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;

      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, total);

      // Hide all rows first
      rows.forEach((r) => (r.style.display = "none"));

      // Display slice
      for (let i = startIdx; i < endIdx; i++) {
        if (filteredRows[i]) filteredRows[i].style.display = "";
      }

      // Update info
      infoLabel.textContent = total > 0
        ? `Showing ${startIdx + 1} to ${endIdx} of ${total} entries${searchTerm ? ' (filtered)' : ''}`
        : "No matching records found";

      // Build Page Buttons
      pagesContainer.innerHTML = "";

      const prevBtn = document.createElement("button");
      prevBtn.className = "btn pagination-page-btn";
      prevBtn.innerHTML = "&laquo; Prev";
      prevBtn.disabled = currentPage <= 1;
      prevBtn.onclick = () => { currentPage--; render(); };
      pagesContainer.appendChild(prevBtn);

      for (let p = 1; p <= totalPages; p++) {
        if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) {
            const dots = document.createElement("span");
            dots.textContent = "...";
            dots.style.padding = "0 4px";
            pagesContainer.appendChild(dots);
          }
          continue;
        }

        const pageBtn = document.createElement("button");
        pageBtn.className = `btn pagination-page-btn ${p === currentPage ? "active" : ""}`;
        pageBtn.textContent = String(p);
        pageBtn.onclick = () => { currentPage = p; render(); };
        pagesContainer.appendChild(pageBtn);
      }

      const nextBtn = document.createElement("button");
      nextBtn.className = "btn pagination-page-btn";
      nextBtn.innerHTML = "Next &raquo;";
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.onclick = () => { currentPage++; render(); };
      pagesContainer.appendChild(nextBtn);
    }

    // Debounced search binding (250ms)
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        searchTerm = e.target.value.trim();
        currentPage = 1;
        render();
      }, 250)
    );

    pageSizeSelect.addEventListener("change", (e) => {
      pageSize = parseInt(e.target.value, 10) || 10;
      currentPage = 1;
      render();
    });

    render();

    return {
      refresh: render,
      setPage: (p) => { currentPage = p; render(); }
    };
  }

  // 5. BOOTSTRAP MODERN UI ON LOAD
  function initModernUI() {
    // Apply preferred theme immediately
    const theme = getPreferredTheme();
    applyTheme(theme);

    // Inject Theme Toggle into main header bar
    const mainBar = document.querySelector(".main-bar");
    if (mainBar) {
      let toggleBtn = document.getElementById("btn-toggle-theme");
      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "btn-toggle-theme";
        toggleBtn.type = "button";
        toggleBtn.className = "theme-toggle-btn";
        const rightContainer = mainBar.querySelector("div") || mainBar;
        rightContainer.appendChild(toggleBtn);
      }
      toggleBtn.innerHTML = theme === "dark" ? "☀️ Light Theme" : "🌙 Dark Theme";
      toggleBtn.onclick = toggleTheme;
    }

    // Also attach to Dashboard Header if present
    const dashActions = document.querySelector(".dash-actions");
    if (dashActions && !document.getElementById("dash-btn-theme-toggle")) {
      const dashThemeBtn = document.createElement("button");
      dashThemeBtn.id = "dash-btn-theme-toggle";
      dashThemeBtn.type = "button";
      dashThemeBtn.className = "btn";
      dashThemeBtn.style.fontWeight = "bold";
      dashThemeBtn.innerHTML = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
      dashThemeBtn.addEventListener("click", toggleTheme);
      dashActions.insertBefore(dashThemeBtn, dashActions.firstChild);
    }
  }

  // Initialize immediately or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModernUI);
  } else {
    initModernUI();
  }

  // Expose global APIs
  window.showToast = showToast;
  window.toggleTheme = toggleTheme;
  window.applyTheme = applyTheme;
  window.initTablePagination = initTablePagination;
  window.debounce = debounce;
})();
