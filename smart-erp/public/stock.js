(() => {
  const panel = document.querySelector("#stock");
  if (!panel) return;

  const storeList = document.querySelector("#stock-store");
  const categoryList = document.querySelector("#stock-category");
  const itemList = document.querySelector("#stock-item");
  const showAll = document.querySelector("#stock-all");
  const grid = document.querySelector("#stock-grid");
  const searchInput = document.querySelector("#stock-search");
  const exactCheckbox = document.querySelector("#stock-exact");
  const btnSearch = document.querySelector("#stock-btn-search");
  const totItemsSpan = document.querySelector("#stock-tot-items");
  const totValSpan = document.querySelector("#stock-tot-val");
  const btnPrint = document.querySelector("#stock-print");
  const btnClose = document.querySelector("#stock-close");
  const btnCloseX = document.querySelector("#stock-close-x");

  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");

  let filling = false;
  let currentRows = [];

  function showInfo(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message, "info", 3500);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      if (!info) {
        alert(message);
        return resolve();
      }
      infoTitle.textContent = "SMART - Stock Position";
      infoText.textContent = message;
      info.hidden = false;
      const ok = document.querySelector("#info-ok");
      function done() {
        ok.removeEventListener("click", done);
        info.hidden = true;
        resolve();
      }
      ok.addEventListener("click", done);
      ok.focus();
    });
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  function getSelectedStockType() {
    const checked = document.querySelector('input[name="stock-type"]:checked');
    return checked ? checked.value : "all";
  }

  function populateOptions(select, items, addAllOption, allLabel = "ALL") {
    const current = select.value;
    let html = "";
    if (addAllOption) {
      html += `<option value="all">${esc(allLabel)}</option>`;
    }
    items.forEach((item) => {
      const val = item.id != null ? item.id : item.code;
      const label = item.name ? `${item.name}${item.code ? " (" + item.code + ")" : ""}` : item.code;
      html += `<option value="${esc(val)}">${esc(label)}</option>`;
    });
    select.innerHTML = html;
    if (current && [...select.options].some((opt) => opt.value === current)) {
      select.value = current;
    } else {
      select.selectedIndex = addAllOption ? 0 : -1;
    }
  }

  let currentPage = 1;
  let pageSize = 25;

  function renderStockPage() {
    if (!currentRows.length) return;
    const total = currentRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);

    const slice = currentRows.slice(startIdx, endIdx);
    const bodyRows = slice.map((row, idx) => {
      const hasOrder = Boolean(row.toOrder && Number(row.toOrder) > 0);
      const rowStyle = hasOrder ? "background: rgba(239, 68, 68, 0.1);" : "";
      const orderStyle = hasOrder ? "color: var(--danger); font-weight: bold;" : "";
      return `
        <tr style="${rowStyle} border-bottom: 1px solid var(--border-light);">
          <td style="padding: 6px; text-align: center;">${esc(startIdx + idx + 1)}</td>
          <td style="padding: 6px; font-weight: 600; color: var(--primary);">${esc(row.code)}</td>
          <td style="padding: 6px;">${esc(row.name)}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color: var(--text-main);">${esc(row.qty)}</td>
          <td style="padding: 6px; text-align: right; font-family: var(--font-mono);">${Number(row.value).toFixed(2)}</td>
          <td style="padding: 6px; text-align: center; color: var(--text-muted);">${esc(row.rol)}</td>
          <td style="padding: 6px; text-align: center;">${esc(row.unit)}</td>
          <td style="padding: 6px; text-align: right; ${orderStyle}">${esc(row.toOrder)}</td>
          <td style="padding: 6px; text-align: center;">${esc(row.rack)}</td>
        </tr>`;
    }).join("");

    const tbody = grid.querySelector("tbody");
    if (tbody) tbody.innerHTML = bodyRows;

    let pagin = document.getElementById("stock-pagination-controls");
    if (!pagin) {
      pagin = document.createElement("div");
      pagin.id = "stock-pagination-controls";
      pagin.className = "modern-pagination-bar";
      grid.parentNode.insertBefore(pagin, grid.nextSibling);
    }

    pagin.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted);">
        Showing <strong>${startIdx + 1}</strong> to <strong>${endIdx}</strong> of <strong>${total}</strong> items
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 11px; color: var(--text-muted); display:flex; align-items:center; gap:4px;">Rows:
          <select id="stock-sel-page-size" style="padding: 2px 4px; font-size: 11px;">
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="99999" ${pageSize > 50 ? 'selected' : ''}>All</option>
          </select>
        </label>
        <button type="button" class="btn" id="stock-pg-prev" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 2px 8px; font-size: 11px;">&laquo; Prev</button>
        <span style="font-weight: bold; font-size: 11px; color: var(--text-main);">Page ${currentPage} / ${totalPages}</span>
        <button type="button" class="btn" id="stock-pg-next" ${currentPage >= totalPages ? 'disabled' : ''} style="padding: 2px 8px; font-size: 11px;">Next &raquo;</button>
      </div>
    `;

    document.getElementById("stock-sel-page-size")?.addEventListener("change", (e) => {
      pageSize = parseInt(e.target.value, 10);
      currentPage = 1;
      renderStockPage();
    });
    document.getElementById("stock-pg-prev")?.addEventListener("click", () => {
      if (currentPage > 1) { currentPage--; renderStockPage(); }
    });
    document.getElementById("stock-pg-next")?.addEventListener("click", () => {
      if (currentPage < totalPages) { currentPage++; renderStockPage(); }
    });
  }

  function paintGrid(rows) {
    currentRows = rows || [];
    if (!currentRows.length) {
      grid.innerHTML = `
        <table class="invmfg-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: var(--bg-toolbar); border-bottom: 2px solid var(--border-color);">
              <th style="padding: 6px; width: 40px; text-align: center;">Sl.No</th>
              <th style="padding: 6px; text-align: left;">Item Code / Part No.</th>
              <th style="padding: 6px; text-align: left;">Item Name / Component Name</th>
              <th style="padding: 6px; width: 85px; text-align: right;">Qty On_Hand</th>
              <th style="padding: 6px; width: 95px; text-align: right;">Value in Rs.</th>
              <th style="padding: 6px; width: 55px; text-align: center;">ROL</th>
              <th style="padding: 6px; width: 55px; text-align: center;">Unit</th>
              <th style="padding: 6px; width: 70px; text-align: right;">To Order</th>
              <th style="padding: 6px; width: 65px; text-align: center;">Rack</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="9" style="text-align: center; padding: 25px; color: var(--text-muted);">No stock items found for the selected criteria.</td></tr>
          </tbody>
        </table>`;
      if (totItemsSpan) totItemsSpan.textContent = "0";
      if (totValSpan) totValSpan.textContent = "0.00";
      const pagin = document.getElementById("stock-pagination-controls");
      if (pagin) pagin.innerHTML = "";
      return;
    }

    let totVal = 0;
    currentRows.forEach((row) => {
      totVal += Number(row.value) || 0;
    });

    grid.innerHTML = `
      <table class="invmfg-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: var(--bg-toolbar); border-bottom: 2px solid var(--border-color); position: sticky; top: 0; z-index: 2;">
            <th style="padding: 6px; width: 40px; text-align: center;">Sl.No</th>
            <th style="padding: 6px; text-align: left;">Item Code / Part No.</th>
            <th style="padding: 6px; text-align: left;">Item Name / Component Name</th>
            <th style="padding: 6px; width: 85px; text-align: right;">Qty On_Hand</th>
            <th style="padding: 6px; width: 95px; text-align: right;">Value in Rs.</th>
            <th style="padding: 6px; width: 55px; text-align: center;">ROL</th>
            <th style="padding: 6px; width: 55px; text-align: center;">Unit</th>
            <th style="padding: 6px; width: 70px; text-align: right;">To Order</th>
            <th style="padding: 6px; width: 65px; text-align: center;">Rack</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>`;

    if (totItemsSpan) totItemsSpan.textContent = String(currentRows.length);
    if (totValSpan) totValSpan.textContent = totVal.toFixed(2);

    renderStockPage();
  }

  async function loadStockData() {
    const params = new URLSearchParams();
    if (storeList && storeList.value) params.set("store", storeList.value);
    if (categoryList && categoryList.value) params.set("category", categoryList.value);
    if (itemList && itemList.value) params.set("item", itemList.value);
    if (showAll && showAll.checked) params.set("show", "1");
    params.set("stockType", getSelectedStockType());

    const q = searchInput ? searchInput.value.trim() : "";
    if (q) {
      params.set("q", q);
      if (exactCheckbox && exactCheckbox.checked) params.set("exact", "1");
    }

    try {
      const res = await fetch(`/api/stock?${params.toString()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("Error loading stock data:", err);
      return null;
    }
  }

  async function refresh(isInitial = false) {
    filling = true;
    const data = await loadStockData();
    if (!data) {
      filling = false;
      return;
    }

    if (isInitial) {
      if (storeList) populateOptions(storeList, data.stores || [], true, "ALL STORES");
      if (categoryList) populateOptions(categoryList, data.categories || [], true, "ALL CATEGORIES");
      if (itemList) populateOptions(itemList, data.items || [], true, "ALL ITEMS");
    } else {
      // Keep store list, update items list if category changed
      if (itemList && data.items) {
        populateOptions(itemList, data.items, true, "ALL ITEMS");
      }
    }

    paintGrid(data.rows || []);
    filling = false;
  }

  // Event Listeners
  if (storeList) {
    storeList.addEventListener("change", async () => {
      if (filling) return;
      if (showAll) showAll.checked = false;
      await refresh(false);
    });
  }

  if (categoryList) {
    categoryList.addEventListener("change", async () => {
      if (filling) return;
      if (showAll) showAll.checked = false;
      await refresh(false);
    });
  }

  if (itemList) {
    itemList.addEventListener("change", async () => {
      if (filling) return;
      if (showAll) showAll.checked = false;
      await refresh(false);
    });
  }

  if (showAll) {
    showAll.addEventListener("change", async () => {
      if (filling) return;
      if (showAll.checked) {
        if (categoryList) categoryList.value = "all";
        if (itemList) itemList.value = "all";
      }
      await refresh(false);
    });
  }

  document.querySelectorAll('input[name="stock-type"]').forEach((r) => {
    r.addEventListener("change", async () => {
      if (filling) return;
      await refresh(false);
    });
  });

  if (btnSearch) {
    btnSearch.addEventListener("click", async () => {
      await refresh(false);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await refresh(false);
      }
    });
    // Modern debounced auto-complete search
    const debouncedRefresh = typeof window.debounce === "function" 
      ? window.debounce(() => refresh(false), 250) 
      : null;
    if (debouncedRefresh) {
      searchInput.addEventListener("input", debouncedRefresh);
    }
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", async () => {
      if (!currentRows || currentRows.length === 0) {
        await showInfo("No data to Print...");
        return;
      }
      const params = new URLSearchParams();
      params.set("type", "stock-position");
      if (storeList && storeList.value) params.set("store", storeList.value);
      if (categoryList && categoryList.value) params.set("category", categoryList.value);
      if (itemList && itemList.value) params.set("item", itemList.value);
      params.set("stockType", getSelectedStockType());
      const q = searchInput ? searchInput.value.trim() : "";
      if (q) {
        params.set("q", q);
        if (exactCheckbox && exactCheckbox.checked) params.set("exact", "1");
      }
      window.open(`/api/print?${params.toString()}`, "_blank");
    });
  }

  async function loadValuation() {
    const methodSelect = document.getElementById("stock-val-method");
    const method = methodSelect ? methodSelect.value : "WAC";
    try {
      const res = await fetch(`/api/inventory/valuation?method=${encodeURIComponent(method)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.summary) return;

      const s = json.summary;
      const chip = document.getElementById("stock-val-total-chip");
      if (chip) chip.textContent = `Val (${method}): Rs. ${Number(s.totalStockVal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const f = document.getElementById("val-fast");
      if (f) f.textContent = `Rs. ${Number(s.fastMovingVal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      const n = document.getElementById("val-norm");
      if (n) n.textContent = `Rs. ${Number(s.normalMovingVal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      const sl = document.getElementById("val-slow");
      if (sl) sl.textContent = `Rs. ${Number(s.slowMovingVal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      const d = document.getElementById("val-dead");
      if (d) d.textContent = `Rs. ${Number(s.deadStockVal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    } catch (e) {
      console.warn("Valuation load error:", e);
    }
  }

  const methodSelect = document.getElementById("stock-val-method");
  if (methodSelect) {
    methodSelect.addEventListener("change", () => loadValuation());
  }

  const btnTraceFromStock = document.getElementById("btn-open-traceability-from-stock");
  if (btnTraceFromStock) {
    btnTraceFromStock.addEventListener("click", () => {
      if (window.openTraceability) {
        window.openTraceability("7047", "backward");
      }
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      window.closeStock();
    });
  }

  if (btnCloseX) {
    btnCloseX.addEventListener("click", () => {
      window.closeStock();
    });
  }

  // Global window functions
  window.openStock = () => {
    panel.hidden = false;
    panel.style.display = "block";
    if (showAll) showAll.checked = false;
    if (searchInput) searchInput.value = "";
    const allOpt = document.querySelector("#stock-opt-all");
    if (allOpt) allOpt.checked = true;
    refresh(true);
    loadValuation();
  };

  window.openStockPosition = window.openStock;

  window.closeStock = () => {
    panel.hidden = true;
    panel.style.display = "none";
  };
})();
