(() => {
  let isDashboardVisible = true;
  let cachedData = null;

  function fmtRs(num) {
    const n = Number(num) || 0;
    return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  async function loadDashboard() {
    const cockpit = document.getElementById("dashboard-cockpit");
    if (!cockpit) return;

    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) {
        console.warn("Failed to load dashboard summary, status:", res.status);
        return;
      }
      const data = await res.json();
      if (!data.ok) return;

      cachedData = data;
      renderDashboard(data);
    } catch (e) {
      console.error("Dashboard load error:", e);
    }
  }

  function renderDashboard(data) {
    const { company, kpis, uninvoicedDcs, stockWatch, recentInvoices, metalRates } = data;

    // 1. Company and Fiscal Header
    const compEl = document.getElementById("dash-comp-name");
    if (compEl) compEl.textContent = company?.name || "Tamba ERP";
    const gstinEl = document.getElementById("dash-comp-gstin");
    if (gstinEl) gstinEl.textContent = company?.gstin ? `GSTIN: ${company.gstin}` : "GST Active";
    const fyEl = document.getElementById("dash-fiscal-year");
    if (fyEl) fyEl.textContent = `FY: ${company?.yearLabel || "2026-27"}`;

    // 2. KPI Cards
    const mfgSalesVal = Number(kpis?.salesMfg !== undefined ? kpis.salesMfg : (kpis?.mfgSales || 0));
    const labSalesVal = Number(kpis?.salesLabour !== undefined ? kpis.salesLabour : (kpis?.labourSales || 0));
    const totalSalesVal = Number(kpis?.totalSales !== undefined ? kpis.totalSales : (mfgSalesVal + labSalesVal));

    const kpiSales = document.getElementById("dash-kpi-sales");
    if (kpiSales) kpiSales.textContent = fmtRs(totalSalesVal);
    const kpiSalesSub = document.getElementById("dash-kpi-sales-sub");
    if (kpiSalesSub) kpiSalesSub.textContent = `Mfg: ${fmtRs(mfgSalesVal)} | Labour: ${fmtRs(labSalesVal)}`;

    const purchVal = Number(kpis?.totalPurchases !== undefined ? kpis.totalPurchases : (kpis?.purchases || 0));
    const purchCount = Number(kpis?.purchasesCount !== undefined ? kpis.purchasesCount : (kpis?.purchInvoiceCount || 0));
    const kpiPurch = document.getElementById("dash-kpi-purch");
    if (kpiPurch) kpiPurch.textContent = fmtRs(purchVal);
    const kpiPurchSub = document.getElementById("dash-kpi-purch-sub");
    if (kpiPurchSub) kpiPurchSub.textContent = `${purchCount} Inward Bills Cleared`;

    const pendingVal = Number(kpis?.pendingDcVal || 0);
    const pendingCount = Number(kpis?.pendingDcCount || 0);
    const kpiDcVal = document.getElementById("dash-kpi-dc-val");
    if (kpiDcVal) kpiDcVal.textContent = fmtRs(pendingVal);
    const kpiDcCount = document.getElementById("dash-kpi-dc-count");
    if (kpiDcCount) kpiDcCount.textContent = `${pendingCount} DCs Awaiting Billing`;

    const critCount = Number(kpis?.criticalStockCount || 0);
    const kpiStock = document.getElementById("dash-kpi-stock-count");
    if (kpiStock) kpiStock.textContent = `${critCount} Items`;
    const kpiStockSub = document.getElementById("dash-kpi-stock-sub");
    if (kpiStockSub) {
      kpiStockSub.textContent = (critCount > 0)
        ? "Action Required: Below ROL"
        : "Stock Levels Healthy";
      kpiStockSub.style.color = (critCount > 0) ? "var(--danger, #ff3b30)" : "var(--success, #34c759)";
    }

    // 2b. Live Metal Rates & Mandi Intelligence
    renderMetalRates(metalRates);

    // 3. Un-invoiced Outward DCs Table (Full Width)
    const dcTbody = document.getElementById("dash-tbody-uninvoiced-dcs");
    if (dcTbody) {
      if (!uninvoicedDcs || !uninvoicedDcs.length) {
        dcTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All dispatched Delivery Challans have been billed!</td></tr>';
      } else {
        dcTbody.innerHTML = uninvoicedDcs.slice(0, 10).map((dc) => {
          const dcNo = dc.dcNo || dc.dcno || "-";
          const dcDate = dc.dcDate || dc.date || "-";
          const isLabour = String(dc.type || "").toLowerCase() === "labour";
          const typeLabel = isLabour ? "Labour" : "Mfg";
          const custName = dc.custName || dc.customerName || "-";
          const itemSummary = dc.itemSummary || dc.materialDetails || "Material Dispatched";
          const qty = Number(dc.qty || 0);
          const val = Number(dc.val || 0);

          return `
            <tr>
              <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(dcNo)}</td>
              <td>${escapeHtml(dcDate)}</td>
              <td style="text-align: center;"><span class="badge ${isLabour ? "badge-info" : "badge-primary"}">${typeLabel}</span></td>
              <td style="font-weight: 600; color: var(--text-main);" title="${escapeHtml(custName)}">${escapeHtml(custName)}</td>
              <td title="${escapeHtml(itemSummary)}">${escapeHtml(itemSummary)}</td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${qty.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">${fmtRs(val)}</td>
              <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn dash-btn-bill" data-type="${typeLabel}" data-refid="${dc.refId || ""}" data-dcno="${escapeHtml(dcNo)}">Bill Now &gt;&gt;</button>
              </td>
            </tr>
          `;
        }).join("");

        // Wire Bill Now buttons
        dcTbody.querySelectorAll(".dash-btn-bill").forEach((btn) => {
          btn.addEventListener("click", () => {
            toggleDashboard(false);
            const type = btn.dataset.type;
            if (type === "Labour") {
              if (window.openLabourInvoice) {
                window.openLabourInvoice();
              }
            } else {
              if (window.openInvoiceMfg) {
                window.openInvoiceMfg();
              }
            }
          });
        });
      }
    }

    // 4. Critical Stock Watch Table (Full Width)
    const stockTbody = document.getElementById("dash-tbody-stock");
    if (stockTbody) {
      if (!stockWatch || !stockWatch.length) {
        stockTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All inventory items are above their Re-Order Level.</td></tr>';
      } else {
        stockTbody.innerHTML = stockWatch.slice(0, 10).map((item) => {
          const itemCode = item.code || item.itemCode || "-";
          const itemName = item.name || item.itemName || "-";
          const uom = item.unit || item.uom || "NOS";
          const currStock = Number(item.stock !== undefined ? item.stock : (item.currStock !== undefined ? item.currStock : 0));
          const rol = Number(item.rol !== undefined ? item.rol : 0);
          const isLow = (currStock <= rol);

          return `
            <tr>
              <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(itemCode)}</td>
              <td style="font-weight: 600; color: var(--text-main);" title="${escapeHtml(itemName)}">${escapeHtml(itemName)}</td>
              <td style="text-align: center;"><span class="dash-metal-sym-pill badge-generic">${escapeHtml(uom)}</span></td>
              <td style="text-align: right; color: ${isLow ? "var(--danger, #ff3b30)" : "var(--success, #34c759)"}; font-weight: bold; font-family: var(--font-mono);">${currStock.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: bold; font-family: var(--font-mono); color: var(--text-main);">${rol.toLocaleString('en-IN')}</td>
              <td style="text-align: center;"><span class="${isLow ? 'metal-trend-down' : 'metal-trend-up'}" style="font-size: 10px;">${isLow ? '▼ Deficit' : '▲ Healthy'}</span></td>
              <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn dash-btn-po" data-itemid="${item.itemId || ""}" data-itemcode="${escapeHtml(itemCode)}">Raise PO</button>
              </td>
            </tr>
          `;
        }).join("");

        // Wire Raise PO buttons
        stockTbody.querySelectorAll(".dash-btn-po").forEach((btn) => {
          btn.addEventListener("click", () => {
            toggleDashboard(false);
            if (window.openPo) {
              window.openPo(true);
            } else if (window.openPO) {
              window.openPO(true);
            }
          });
        });
      }
    }

    // 5. Recent Invoices Table
    const invTbody = document.getElementById("dash-tbody-recent-invoices");
    if (invTbody) {
      if (!recentInvoices || !recentInvoices.length) {
        invTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888; padding: 12px;">No recent invoices recorded.</td></tr>';
      } else {
        invTbody.innerHTML = recentInvoices.slice(0, 8).map((inv) => {
          const invNo = inv.invNo || inv.invno || "-";
          const dateStr = inv.invDate || inv.date || "-";
          const isLabour = String(inv.type || "").toLowerCase() === "labour";
          const typeLabel = isLabour ? "Labour" : "Mfg";
          const custName = inv.custName || inv.customerName || "-";
          const taxableVal = Number(inv.taxableAmt || 0);
          const totalVal = Number(inv.totVal !== undefined ? inv.totVal : (inv.totalVal || 0));

          return `
            <tr>
              <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(invNo)}</td>
              <td>${escapeHtml(dateStr)}</td>
              <td><span class="badge ${isLabour ? "badge-info" : "badge-primary"}">${typeLabel}</span></td>
              <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-main);" title="${escapeHtml(custName)}">${escapeHtml(custName)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${fmtRs(taxableVal)}</td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: bold; color: var(--text-main);">${fmtRs(totalVal)}</td>
              <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn dash-btn-eway" data-type="${typeLabel}" data-invno="${escapeHtml(invNo)}">E-Way / E-Inv</button>
              </td>
            </tr>
          `;
        }).join("");

        // Wire E-Way button on recent invoices
        invTbody.querySelectorAll(".dash-btn-eway").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (window.openGstPortalModal) {
              window.openGstPortalModal({
                docType: (btn.dataset.type || "").toLowerCase().includes("labour") ? "labour" : "mfg",
                docNo: btn.dataset.invno
              });
            }
          });
        });
      }
    }
  }

  // 6. Live Metal Rates & Mandi Intelligence (Apple Design)
  function renderMetalRates(rates) {
    const container = document.getElementById("dash-metal-cards");
    const tsEl = document.getElementById("dash-metal-timestamp");
    if (!container) return;

    if (!rates || !rates.length) {
      container.innerHTML = '<div style="color: #64748b; font-size: 11px; padding: 12px; grid-column: 1 / -1; text-align: center;">⚡ Syncing live market rates from MCX &amp; Jamnagar Mandi...</div>';
      return;
    }

    if (tsEl && rates[0]?.updated_formatted) {
      tsEl.textContent = `Live: ${rates[0].updated_formatted}`;
    }

    const themeMap = {
      'COPPER_MCX': { badgeClass: 'badge-copper', icon: '🪙', label: 'Copper Cathode' },
      'BRASS_ROD': { badgeClass: 'badge-brass', icon: '🟡', label: 'Brass Extrusion' },
      'BRASS_HONEY_SCRAP': { badgeClass: 'badge-scrap', icon: '🔩', label: 'Honey Scrap' },
      'ZINC_MCX': { badgeClass: 'badge-zinc', icon: '⚪', label: 'Zinc SHG' },
      'ALUMINIUM_INGOT': { badgeClass: 'badge-alu', icon: '🔘', label: 'Aluminium' },
      'LEAD_INGOT': { badgeClass: 'badge-lead', icon: '⚫', label: 'Lead Pure' },
      'USD_INR': { badgeClass: 'badge-usd', icon: '💵', label: 'Forex' }
    };

    container.innerHTML = rates.map(m => {
      const info = themeMap[m.metal_code] || { badgeClass: 'badge-generic', icon: '🏷️', label: m.metal_name };
      const chgPct = Number(m.change_pct || 0);
      const isUp = chgPct > 0;
      const isZero = chgPct === 0;
      const trendClass = isZero ? 'metal-trend-flat' : (isUp ? 'metal-trend-up' : 'metal-trend-down');
      const trendArrow = isZero ? '—' : (isUp ? '▲ +' : '▼ ');
      const rateVal = Number(m.rate);
      const rateFormatted = rateVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unitClean = String(m.unit || '₹/kg').replace('₹/', '/');

      return `
        <div class="dash-metal-card" data-code="${escapeHtml(m.metal_code)}" title="${escapeHtml(m.source || 'Benchmark')} | High: ₹${m.high_rate || rateFormatted} | Low: ₹${m.low_rate || rateFormatted}">
          <div class="dash-metal-card-header">
            <span class="dash-metal-sym-pill ${info.badgeClass}">${escapeHtml(m.symbol)}</span>
            <span class="dash-metal-trend ${trendClass}">${trendArrow}${Math.abs(chgPct).toFixed(2)}%</span>
          </div>
          <div class="dash-metal-card-name" title="${escapeHtml(m.metal_name)}">${escapeHtml(m.metal_name)}</div>
          <div class="dash-metal-card-price">
            <span class="dash-metal-currency">₹</span><span class="dash-metal-number">${rateFormatted}</span>
            <span class="dash-metal-unit">${escapeHtml(unitClean)}</span>
          </div>
          <div class="dash-metal-card-meta">
            <span class="dash-metal-source-tag">${escapeHtml(m.source || 'Benchmark')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Mandi Desk Modal Handlers
  async function openMetalRatesModal() {
    const modal = document.getElementById("metal-rate-modal");
    const tbody = document.getElementById("metal-modal-tbody");
    const statusText = document.getElementById("metal-modal-status-text");
    if (!modal || !tbody) return;

    if (statusText) statusText.textContent = "💡 Tip: Changes broadcast live across all client dashboards.";

    try {
      const res = await fetch("/api/metal-rates");
      const data = await res.json();
      const rates = data.rates || [];
      tbody.innerHTML = rates.map(m => `
        <tr style="border-bottom: 1px solid var(--border-light, #e2e8f0);">
          <td style="padding: 6px 10px; font-weight: bold; color: var(--primary);">${escapeHtml(m.symbol)}</td>
          <td style="padding: 6px 10px; font-weight: 500;">${escapeHtml(m.metal_name)}</td>
          <td style="padding: 6px 10px; color: #64748b; font-size: 10px;">${escapeHtml(m.source || 'Benchmark')}</td>
          <td style="padding: 6px 10px; text-align: right;">
            <input type="number" step="0.05" class="metal-modal-input-rate" data-code="${escapeHtml(m.metal_code)}" value="${Number(m.rate).toFixed(2)}" style="width: 105px; text-align: right; padding: 3px 6px; font-family: monospace; font-size: 11px; font-weight: bold; border: 1px solid #7f9db9; border-radius: 3px;">
          </td>
          <td style="padding: 6px 10px; color: #475569;">${escapeHtml(m.unit)}</td>
        </tr>
      `).join('');

      modal.hidden = false;
      modal.style.display = "flex";
    } catch (e) {
      alert("Failed to load metal rates: " + e.message);
    }
  }

  function closeMetalRatesModal() {
    const modal = document.getElementById("metal-rate-modal");
    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
    }
  }

  async function saveMetalRatesFromModal() {
    const modal = document.getElementById("metal-rate-modal");
    if (!modal) return;
    const inputs = modal.querySelectorAll(".metal-modal-input-rate");
    const sourceLabel = document.getElementById("metal-modal-source-label")?.value?.trim() || "Jamnagar Daily Mandi Fixing";
    const statusText = document.getElementById("metal-modal-status-text");

    const updates = [];
    inputs.forEach(inp => {
      const code = inp.dataset.code;
      const rate = Number(inp.value);
      if (code && rate > 0) {
        updates.push({ metalCode: code, rate });
      }
    });

    if (statusText) statusText.textContent = "⏳ Saving and broadcasting live rates...";

    try {
      const res = await fetch("/api/metal-rates/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, source: sourceLabel })
      });
      const data = await res.json();
      if (data.ok) {
        if (statusText) statusText.textContent = "✅ Rates saved and broadcast successfully!";
        setTimeout(() => {
          closeMetalRatesModal();
          loadDashboard();
        }, 500);
      } else {
        alert("Error saving rates: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error saving rates: " + e.message);
    }
  }

  async function resetDefaultBenchmarks() {
    if (!confirm("Reset all Mandi rates back to official MCX/LME default benchmarks?")) return;
    const defaults = [
      { metalCode: 'COPPER_MCX', rate: 848.50 },
      { metalCode: 'BRASS_ROD', rate: 524.00 },
      { metalCode: 'BRASS_HONEY_SCRAP', rate: 446.50 },
      { metalCode: 'ZINC_MCX', rate: 268.40 },
      { metalCode: 'ALUMINIUM_INGOT', rate: 234.10 },
      { metalCode: 'LEAD_INGOT', rate: 186.50 },
      { metalCode: 'USD_INR', rate: 84.32 }
    ];
    await fetch("/api/metal-rates/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: defaults, source: "Official MCX / Jamnagar Benchmark" })
    });
    openMetalRatesModal();
    loadDashboard();
  }

  function toggleDashboard(forceState) {
    const cockpit = document.getElementById("dashboard-cockpit");
    if (!cockpit) return;

    if (forceState !== undefined) {
      isDashboardVisible = forceState;
    } else {
      isDashboardVisible = !isDashboardVisible;
    }

    if (isDashboardVisible) {
      cockpit.removeAttribute("hidden");
      cockpit.style.display = "block";
      const toggleBtn = document.getElementById("btn-toggle-dashboard");
      if (toggleBtn) toggleBtn.innerHTML = "Hide Dashboard";
      loadDashboard();
    } else {
      cockpit.setAttribute("hidden", "hidden");
      cockpit.style.display = "none";
      const toggleBtn = document.getElementById("btn-toggle-dashboard");
      if (toggleBtn) toggleBtn.innerHTML = "Live Dashboard";
    }
  }

  // Bind Quick Launchers
  function bindQuickLaunchers() {
    const map = [
      { id: "dash-btn-new-mfg-inv", fn: () => { toggleDashboard(false); window.openInvoiceMfg && window.openInvoiceMfg(); } },
      { id: "dash-btn-new-lab-inv", fn: () => { toggleDashboard(false); window.openLabourInvoice && window.openLabourInvoice(); } },
      { id: "dash-btn-new-dc", fn: () => { toggleDashboard(false); window.openDC && window.openDC(); } },
      { id: "dash-btn-new-po", fn: () => {
        toggleDashboard(false);
        if (typeof window.openPo === "function") window.openPo(true);
        else if (typeof window.openPO === "function") window.openPO(true);
        else {
          const po = document.getElementById("po");
          if (po) po.hidden = false;
        }
      }},
      { id: "dash-btn-gst-reports", fn: () => {
        toggleDashboard(false);
        if (typeof window.openGSTReports === "function") window.openGSTReports();
        else if (typeof window.openGstReports === "function") window.openGstReports();
        else if (typeof window.openGstReportsModal === "function") window.openGstReportsModal();
        else {
          const gst = document.getElementById("gst-reports");
          if (gst) {
            gst.hidden = false;
            gst.style.display = "flex";
          }
        }
      }},
      { id: "dash-btn-traceability", fn: () => {
        toggleDashboard(false);
        if (typeof window.openTraceability === "function") window.openTraceability();
        else {
          const tr = document.getElementById("traceability-window");
          if (tr) {
            tr.hidden = false;
            tr.style.display = "block";
          }
        }
      }},
      { id: "dash-btn-valuation", fn: () => {
        toggleDashboard(false);
        if (typeof window.openStockPosition === "function") window.openStockPosition();
        else if (typeof window.openStock === "function") window.openStock();
      }},
      { id: "dash-btn-audit-trail", fn: () => {
        toggleDashboard(false);
        if (typeof window.openAuditTrail === "function") window.openAuditTrail();
        else {
          const w = document.getElementById("audit-window");
          if (w) { w.hidden = false; w.style.display = "block"; }
        }
      }},
      { id: "dash-btn-notify-hub", fn: () => {
        toggleDashboard(false);
        if (typeof window.openNotificationModal === "function") {
          window.openNotificationModal({ docType: "invoice", docNo: "7047", subType: "mfg" });
        }
      }},
      { id: "dash-btn-barcode-hub", fn: () => {
        toggleDashboard(false);
        if (typeof window.openBarcodeModal === "function") {
          window.openBarcodeModal({ itemCode: "B1", heatNo: "HT-BRASS-704", batchNo: "BT-2026-081" });
        }
      }},
      { id: "dash-btn-refresh", fn: () => loadDashboard() },
      { id: "dash-btn-close-cockpit", fn: () => toggleDashboard(false) },
      { id: "btn-metal-edit-modal", fn: () => openMetalRatesModal() },
      { id: "btn-metal-refresh", fn: () => loadDashboard() },
      { id: "metal-modal-close-x", fn: () => closeMetalRatesModal() },
      { id: "metal-modal-btn-close", fn: () => closeMetalRatesModal() },
      { id: "metal-modal-btn-save", fn: () => saveMetalRatesFromModal() },
      { id: "metal-modal-btn-reset-default", fn: () => resetDefaultBenchmarks() }
    ];

    map.forEach(({ id, fn }) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    });

    const headerToggle = document.getElementById("btn-toggle-dashboard");
    if (headerToggle) {
      headerToggle.addEventListener("click", () => toggleDashboard());
    }

    // Auto-refresh rates every 60 seconds if dashboard is open
    setInterval(() => {
      if (isDashboardVisible) {
        loadDashboard();
      }
    }, 60000);
  }

  window.loadDashboard = loadDashboard;
  window.toggleDashboard = toggleDashboard;
  window.minimizeDashboard = () => toggleDashboard(false);
  window.openMetalRatesModal = openMetalRatesModal;
  window.closeMetalRatesModal = closeMetalRatesModal;
  window.initDashboard = () => {
    const mainWin = document.getElementById("main-window");
    if (!mainWin || mainWin.hidden) return;
    bindQuickLaunchers();
    loadDashboard();
    const toggleBtn = document.getElementById("btn-toggle-dashboard");
    if (toggleBtn) toggleBtn.innerHTML = "Hide Dashboard";
  };

  // Run on startup
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.initDashboard());
  } else {
    setTimeout(() => window.initDashboard(), 100);
  }
})();
