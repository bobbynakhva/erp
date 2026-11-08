(() => {
  const panel = document.getElementById("gst-reports");
  if (!panel) return;

  const btnClose = document.getElementById("gst-reports-btn-close");
  const btnX = document.getElementById("gst-reports-btn-x");
  const tabGstr1 = document.getElementById("gst-tab-gstr1");
  const tabGstr3b = document.getElementById("gst-tab-gstr3b");
  const tabGstr2b = document.getElementById("gst-tab-gstr2b");
  const fromDateInput = document.getElementById("gst-filter-from");
  const toDateInput = document.getElementById("gst-filter-to");
  const btnRefresh = document.getElementById("gst-btn-refresh");
  const btnPrint = document.getElementById("gst-btn-print");
  const btnExportJson = document.getElementById("gst-btn-export-json");

  // GSTR-2B Action Bar Elements
  const bar2b = document.getElementById("gst-2b-bar");
  const file2b = document.getElementById("gst-file-2b");
  const btnUpload2b = document.getElementById("gst-btn-upload-2b");
  const btnSample2b = document.getElementById("gst-btn-sample-2b");
  const lblFile2b = document.getElementById("gst-2b-file-label");
  const btnExportCsv = document.getElementById("gst-btn-export-csv");

  // Counters
  const countAll = document.getElementById("reco-count-all");
  const countMatched = document.getElementById("reco-count-matched");
  const countMismatch = document.getElementById("reco-count-mismatch");
  const countNot2b = document.getElementById("reco-count-not2b");
  const countNotBooks = document.getElementById("reco-count-notbooks");

  // Metric Cards
  const cardTaxable = document.getElementById("gst-card-taxable");
  const cardCgst = document.getElementById("gst-card-cgst");
  const cardSgst = document.getElementById("gst-card-sgst");
  const cardIgst = document.getElementById("gst-card-igst");
  const cardTotalLbl = document.getElementById("gst-card-total-lbl");
  const cardTotal = document.getElementById("gst-card-total");

  const tableHead = document.getElementById("gst-table-head");
  const tableBody = document.getElementById("gst-table-body");
  const statusLbl = document.getElementById("gst-report-status");

  let activeTab = "gstr1"; // 'gstr1' | 'gstr3b' | 'gstr2b'
  let lastReportData = null;
  let gstr2bLoadedData = null;
  let reconciliationResult = null;
  let recoFilter = "all";

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt2(val) {
    const n = Number(val || 0);
    return Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
  }

  function setActiveTab(tab) {
    activeTab = tab;

    // Reset tab button styles
    [tabGstr1, tabGstr3b, tabGstr2b].forEach((t) => {
      if (t) {
        t.style.background = "#d4d0c8";
        t.style.color = "#000";
        t.style.fontWeight = "normal";
      }
    });

    if (tab === "gstr1") {
      tabGstr1.style.background = "#1b4d3e";
      tabGstr1.style.color = "#fff";
      tabGstr1.style.fontWeight = "bold";
      cardTotalLbl.textContent = "Total GST Output";
      if (bar2b) bar2b.style.display = "none";
      if (btnExportJson) btnExportJson.style.display = "inline-block";
      loadReport();
    } else if (tab === "gstr3b") {
      tabGstr3b.style.background = "#1b4d3e";
      tabGstr3b.style.color = "#fff";
      tabGstr3b.style.fontWeight = "bold";
      cardTotalLbl.textContent = "Total ITC Eligible";
      if (bar2b) bar2b.style.display = "none";
      if (btnExportJson) btnExportJson.style.display = "none";
      loadReport();
    } else if (tab === "gstr2b") {
      if (tabGstr2b) {
        tabGstr2b.style.background = "#1b4d3e";
        tabGstr2b.style.color = "#fff";
        tabGstr2b.style.fontWeight = "bold";
      }
      cardTotalLbl.textContent = "Missing in 2B (At Risk)";
      if (bar2b) bar2b.style.display = "flex";
      if (btnExportJson) btnExportJson.style.display = "none";
      runReconciliation();
    }
  }

  async function loadReport() {
    statusLbl.textContent = "Fetching GST filing records...";
    const fromDate = fromDateInput ? fromDateInput.value : "";
    const toDate = toDateInput ? toDateInput.value : "";
    const params = new URLSearchParams();
    if (fromDate) {
      params.set("from", fromDate);
      params.set("fromDate", fromDate);
    }
    if (toDate) {
      params.set("to", toDate);
      params.set("toDate", toDate);
    }

    const endpoint = activeTab === "gstr1" ? "/api/gst/reports/gstr1" : "/api/gst/reports/gstr3b";
    try {
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load report");

      lastReportData = data;
      renderReport(data);
    } catch (err) {
      statusLbl.textContent = `Error: ${err.message}`;
      console.error("GST report load error:", err);
    }
  }

  function renderReport(data) {
    if (activeTab === "gstr1") {
      const totals = data.totals || {};
      cardTaxable.textContent = `Rs. ${fmt2(totals.totalTaxable)}`;
      cardCgst.textContent = `Rs. ${fmt2(totals.totalCGST)}`;
      cardSgst.textContent = `Rs. ${fmt2(totals.totalSGST)}`;
      cardIgst.textContent = `Rs. ${fmt2(totals.totalIGST)}`;
      cardTotal.textContent = `Rs. ${fmt2(totals.totalGST)}`;

      statusLbl.textContent = `GSTR-1 Ready: ${data.invoiceCount || 0} Outward B2B Invoices Found`;

      tableHead.innerHTML = `
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">#</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Inv No</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Date</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Customer</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">GSTIN</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">POS</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">Taxable Base</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">CGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">SGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">IGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">Total Invoice (Rs)</th>
      `;

      const rows = data.invoices || [];
      if (rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 16px; color: #777;">No outward invoices found for selected period.</td></tr>`;
        return;
      }

      tableBody.innerHTML = rows.map((r, i) => `
        <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fbfe'}; border-bottom: 1px solid #e1e7ee;">
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${i + 1}</td>
          <td style="padding: 5px 6px; font-weight: bold; border: 1px solid #e1e7ee;">${r.invno || "-"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.invdate ? new Date(r.invdate).toISOString().slice(0, 10) : "-"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.cust_name || "-"}</td>
          <td style="padding: 5px 6px; font-family: monospace; border: 1px solid #e1e7ee;">${r.customer_gstin || "URP (Unregistered)"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.customer_state || "29"}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; border: 1px solid #e1e7ee;">${fmt2(r.taxable_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #006600; border: 1px solid #e1e7ee;">${fmt2(r.cgst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #006600; border: 1px solid #e1e7ee;">${fmt2(r.sgst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #0066cc; border: 1px solid #e1e7ee;">${fmt2(r.igst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; border: 1px solid #e1e7ee;">${fmt2(r.total_inv_val)}</td>
        </tr>
      `).join("");
    } else {
      const itc = data.itcEligible || {};
      cardTaxable.textContent = `Rs. ${fmt2(itc.itcTaxable)}`;
      cardCgst.textContent = `Rs. ${fmt2(itc.itcCGST)}`;
      cardSgst.textContent = `Rs. ${fmt2(itc.itcSGST)}`;
      cardIgst.textContent = `Rs. ${fmt2(itc.itcIGST)}`;
      cardTotal.textContent = `Rs. ${fmt2(itc.totalITC)}`;

      statusLbl.textContent = `GSTR-3B Ready: ${data.purchaseCount || 0} Inward ITC Purchases Found`;

      tableHead.innerHTML = `
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">#</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Bill No</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Date</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Supplier / Vendor</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">GSTIN</th>
        <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">State</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">Purchase Base</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">ITC CGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">ITC SGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">ITC IGST</th>
        <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8;">Total Bill (Rs)</th>
      `;

      const rows = data.purchases || [];
      if (rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 16px; color: #777;">No inward purchases found for selected period.</td></tr>`;
        return;
      }

      tableBody.innerHTML = rows.map((r, i) => `
        <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fbfe'}; border-bottom: 1px solid #e1e7ee;">
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${i + 1}</td>
          <td style="padding: 5px 6px; font-weight: bold; border: 1px solid #e1e7ee;">${r.invno || "-"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.invdate ? new Date(r.invdate).toISOString().slice(0, 10) : "-"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.vendor_name || "-"}</td>
          <td style="padding: 5px 6px; font-family: monospace; border: 1px solid #e1e7ee;">${r.vendor_gstin || "URP (Unregistered)"}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${r.vendor_state || "29"}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; border: 1px solid #e1e7ee;">${fmt2(r.taxable_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #006600; border: 1px solid #e1e7ee;">${fmt2(r.cgst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #006600; border: 1px solid #e1e7ee;">${fmt2(r.sgst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; color: #0066cc; border: 1px solid #e1e7ee;">${fmt2(r.igst_amt)}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; border: 1px solid #e1e7ee;">${fmt2(r.total_purch_val)}</td>
        </tr>
      `).join("");
    }
  }

  // ============================================================
  // GSTR-2B INWARD ITC RECONCILIATION ENGINE
  // ============================================================
  async function runReconciliation() {
    statusLbl.textContent = "Reconciling Inward Books against GSTR-2B Statement...";
    const fromDate = fromDateInput ? fromDateInput.value : "";
    const toDate = toDateInput ? toDateInput.value : "";

    try {
      const res = await fetch("/api/gst/reconcile-2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: fromDate || null,
          toDate: toDate || null,
          gstr2bData: gstr2bLoadedData
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to reconcile GSTR-2B");

      reconciliationResult = data;
      renderReconciliation(data);
    } catch (err) {
      statusLbl.textContent = `Reconciliation Error: ${err.message}`;
      console.error("GSTR-2B reconcile error:", err);
    }
  }

  function renderReconciliation(data) {
    const s = data.summary || {};

    // Update Top Metric Cards for GSTR-2B Reco
    cardTaxable.textContent = `Rs. ${fmt2(s.totalBooksItc)}`;
    cardCgst.textContent = `Rs. ${fmt2(s.matchedItc)} (${s.matchedCount})`;
    cardSgst.textContent = `Rs. ${fmt2(s.mismatchVariance)} (${s.mismatchCount})`;
    cardIgst.textContent = `Rs. ${fmt2(s.notInBooksItc)} (${s.notInBooksCount})`;
    cardTotal.textContent = `Rs. ${fmt2(s.notIn2bItc)} (${s.notIn2bCount})`;

    // Update Filter Pills
    if (countAll) countAll.textContent = data.totalCount || 0;
    if (countMatched) countMatched.textContent = s.matchedCount || 0;
    if (countMismatch) countMismatch.textContent = s.mismatchCount || 0;
    if (countNot2b) countNot2b.textContent = s.notIn2bCount || 0;
    if (countNotBooks) countNotBooks.textContent = s.notInBooksCount || 0;

    statusLbl.textContent = `GSTR-2B Reco Complete: ${s.matchedCount} Matched, ${s.mismatchCount} Mismatches, ${s.notIn2bCount} Missing in 2B (At-Risk ITC: Rs. ${fmt2(s.notIn2bItc)})`;

    tableHead.innerHTML = `
      <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8; width: 30px;">#</th>
      <th style="padding: 6px; text-align: center; border: 1px solid #d4d0c8; width: 110px;">Status</th>
      <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Supplier / Vendor &amp; GSTIN</th>
      <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8; width: 90px;">Invoice No</th>
      <th style="padding: 6px; text-align: center; border: 1px solid #d4d0c8; width: 75px;">Date</th>
      <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8; width: 95px;">Books GST</th>
      <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8; width: 95px;">Portal 2B GST</th>
      <th style="padding: 6px; text-align: right; border: 1px solid #d4d0c8; width: 85px;">Diff (Rs)</th>
      <th style="padding: 6px; text-align: left; border: 1px solid #d4d0c8;">Audit Action / Follow-up</th>
    `;

    renderRecoRows();
  }

  function renderRecoRows() {
    if (!reconciliationResult || !reconciliationResult.items) return;

    let items = reconciliationResult.items;
    if (recoFilter !== "all") {
      items = items.filter((x) => x.status === recoFilter);
    }

    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #777;">No records found for filter "${escapeHtml(recoFilter)}".</td></tr>`;
      return;
    }

    tableBody.innerHTML = items.map((r, i) => {
      const isMissingIn2B = (r.status === "NOT_IN_2B");
      const badgeStyle = r.badgeClass ? r.badgeClass : "badge-info";

      return `
        <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fbfe'}; border-bottom: 1px solid #e1e7ee;">
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">${i + 1}</td>
          <td style="padding: 5px 6px; text-align: center; border: 1px solid #e1e7ee;">
            <span class="badge ${badgeStyle}">${escapeHtml(r.status)}</span>
          </td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">
            <div style="font-weight: bold; color: #000080;">${escapeHtml(r.vendorName || "Unknown")}</div>
            <div style="font-size: 10px; font-family: monospace; color: #555;">${escapeHtml(r.vendorGstin || "URP")}</div>
          </td>
          <td style="padding: 5px 6px; font-weight: bold; border: 1px solid #e1e7ee;">${escapeHtml(r.invNo || "-")}</td>
          <td style="padding: 5px 6px; text-align: center; border: 1px solid #e1e7ee;">${r.invDate ? new Date(r.invDate).toISOString().slice(0, 10) : "-"}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; border: 1px solid #e1e7ee;">${fmt2(r.booksGst)}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; color: ${r.portalGst > 0 ? '#006600' : '#888'}; border: 1px solid #e1e7ee;">${fmt2(r.portalGst)}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; color: ${Math.abs(r.diffGst) > 1 ? '#b30000' : '#006600'}; border: 1px solid #e1e7ee;">${fmt2(r.diffGst)}</td>
          <td style="padding: 5px 6px; border: 1px solid #e1e7ee;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <span>${escapeHtml(r.actionRequired)}</span>
              ${isMissingIn2B ? `
                <button type="button" class="btn gst-btn-copy-notice" data-inv="${escapeHtml(r.invNo)}" data-date="${r.invDate ? new Date(r.invDate).toISOString().slice(0, 10) : ""}" data-val="${r.booksTotalVal}" data-vendor="${escapeHtml(r.vendorName)}" style="font-size: 9px; padding: 1px 6px; background: #fff0f0; border: 1px solid #cc0000; color: #cc0000; cursor: pointer;" title="Copy WhatsApp/Email reminder note for vendor">Copy Notice</button>
              ` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Wire Copy Notice Buttons
    tableBody.querySelectorAll(".gst-btn-copy-notice").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vendor = btn.dataset.vendor || "Supplier";
        const inv = btn.dataset.inv || "";
        const dt = btn.dataset.date || "";
        const val = btn.dataset.val || "";

        const text = `Dear ${vendor},\n\nThis is regarding Invoice No: ${inv}${dt ? ` dated ${dt}` : ""}${val ? ` for Rs. ${val}` : ""} issued to SMART ENTERPRISES.\nThis invoice is currently NOT reflecting in our GSTR-2B statement on the GST Portal.\nUnder Indian GST Rule 36(4), we are unable to claim Input Tax Credit without your GSTR-1 filing.\nKindly verify and ensure this invoice is uploaded in your current GST return at the earliest.\n\nThank you,\nAccounts Team - SMART ENTERPRISES`;

        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied!";
          btn.style.background = "#e6ffe6";
          btn.style.color = "#006600";
          setTimeout(() => {
            btn.textContent = "Copy Notice";
            btn.style.background = "#fff0f0";
            btn.style.color = "#cc0000";
          }, 3000);
        }).catch(() => {
          alert(text);
        });
      });
    });
  }

  // 2B File Upload Listener
  if (btnUpload2b && file2b) {
    btnUpload2b.addEventListener("click", () => file2b.click());
    file2b.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          gstr2bLoadedData = parsed;
          if (lblFile2b) lblFile2b.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          runReconciliation();
        } catch (err) {
          alert("Invalid GSTR-2B JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // 2B Sample Simulation Listener
  if (btnSample2b) {
    btnSample2b.addEventListener("click", async () => {
      statusLbl.textContent = "Generating GSTR-2B Portal Simulation Data...";
      try {
        const res = await fetch("/api/gst/reconcile-2b/sample");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to load sample");

        gstr2bLoadedData = data.sample;
        if (lblFile2b) lblFile2b.textContent = "Simulated Portal 2B (Auto-Generated)";
        runReconciliation();
      } catch (err) {
        alert("Failed to load sample 2B: " + err.message);
      }
    });
  }

  // Filter Pills Listeners
  document.querySelectorAll(".gst-pill-btn").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".gst-pill-btn").forEach((p) => p.classList.remove("on"));
      pill.classList.add("on");
      recoFilter = pill.dataset.filter || "all";
      renderRecoRows();
    });
  });

  // Export Reco CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => {
      if (!reconciliationResult || !reconciliationResult.items || !reconciliationResult.items.length) {
        alert("No reconciliation data available to export.");
        return;
      }

      const headers = ["#", "Status", "Vendor Name", "Vendor GSTIN", "Invoice No", "Invoice Date", "Books Taxable", "Books GST", "Portal 2B Taxable", "Portal 2B GST", "Tax Variance (Diff)", "Audit Action"];
      const rows = reconciliationResult.items.map((r, i) => [
        i + 1,
        `"${r.status}"`,
        `"${(r.vendorName || "").replace(/"/g, '""')}"`,
        `"${r.vendorGstin || ""}"`,
        `"${(r.invNo || "").replace(/"/g, '""')}"`,
        `"${r.invDate ? new Date(r.invDate).toISOString().slice(0, 10) : ""}"`,
        Number(r.booksTaxable || 0).toFixed(2),
        Number(r.booksGst || 0).toFixed(2),
        Number(r.portalTaxable || 0).toFixed(2),
        Number(r.portalGst || 0).toFixed(2),
        Number(r.diffGst || 0).toFixed(2),
        `"${(r.actionRequired || "").replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSTR2B_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function exportGstr1Json() {
    if (!lastReportData || !lastReportData.invoices || lastReportData.invoices.length === 0) {
      alert("No invoices available in GSTR-1 to export. Please ensure outward invoices exist.");
      return;
    }

    const b2bInvoices = (lastReportData.invoices || []).map((inv) => ({
      ctin: inv.customer_gstin || "URP",
      cpty: "",
      inv: [
        {
          inum: inv.invno,
          idt: inv.invdate ? new Date(inv.invdate).toISOString().slice(0, 10) : "",
          val: Number(inv.total_inv_val || 0),
          pos: String(inv.customer_state || "29").padStart(2, "0"),
          rchrg: "N",
          inv_typ: "R",
          itms: [
            {
              num: 1,
              itm_det: {
                txval: Number(inv.taxable_amt || 0),
                rt: Number(inv.gst_rate || 18),
                camt: Number(inv.cgst_amt || 0),
                samt: Number(inv.sgst_amt || 0),
                iamt: Number(inv.igst_amt || 0),
                csamt: 0
              }
            }
          ]
        }
      ]
    }));

    const gstr1Payload = {
      gstin: "29AABCB1234F1Z5",
      fp: "032027",
      cur_gt: Number(lastReportData.totals?.totalTaxable || 0),
      gt: Number(lastReportData.totals?.totalTaxable || 0),
      b2b: b2bInvoices
    };

    const blob = new Blob([JSON.stringify(gstr1Payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_Filing_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    statusLbl.textContent = "GSTR-1 Portal Filing JSON downloaded successfully.";
  }

  function openGSTReports() {
    panel.hidden = false;
    panel.style.display = "flex";
    setActiveTab("gstr1");
  }

  function closeGSTReports() {
    panel.hidden = true;
    panel.style.display = "none";
  }

  async function printReport() {
    let comp = { head: "SMART ENTERPRISES" };
    try {
      const resp = await fetch("/api/print-head");
      if (resp.ok) {
        const d = await resp.json();
        if (d && d.head) comp = d;
      }
    } catch (e) {}

    const headLines = String(comp.head || "SMART ENTERPRISES").split(/\r\n|\n|\r/).filter(Boolean);
    const compName = headLines[0] || "SMART ENTERPRISES";
    const compAddr = headLines.slice(1).join("<br>");

    const periodStr = (fromDateInput && fromDateInput.value && toDateInput && toDateInput.value)
      ? `Period: ${fromDateInput.value} to ${toDateInput.value}`
      : "Period: Full Financial Year";

    let reportTitle = "GSTR-1 (OUTWARD SUPPLIES)";
    if (activeTab === "gstr3b") reportTitle = "GSTR-3B (SUMMARY RETURN)";
    else if (activeTab === "gstr2b") reportTitle = "GSTR-2B (INWARD ITC RECONCILIATION)";

    const thHtml = tableHead.innerHTML;
    const tbHtml = tableBody.innerHTML;

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">GST STATUTORY REPORT - ${reportTitle}</div>
          <div style="font-size: 11px; margin-top: 4px;"><b>${periodStr}</b></div>
        </div>

        <!-- Summary KPIs -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px; background: #f5f5f5; text-align: center;">
          <tr>
            <td style="padding: 6px; border-right: 1px solid #ccc;"><b>Metric 1:</b><br><span style="font-size: 13px; font-weight: bold; color: #000080;">${cardTaxable.textContent}</span></td>
            <td style="padding: 6px; border-right: 1px solid #ccc;"><b>Metric 2:</b><br><span style="font-size: 13px; font-weight: bold;">${cardCgst.textContent}</span></td>
            <td style="padding: 6px; border-right: 1px solid #ccc;"><b>Metric 3:</b><br><span style="font-size: 13px; font-weight: bold;">${cardSgst.textContent}</span></td>
            <td style="padding: 6px; border-right: 1px solid #ccc;"><b>Metric 4:</b><br><span style="font-size: 13px; font-weight: bold;">${cardIgst.textContent}</span></td>
            <td style="padding: 6px;"><b>${cardTotalLbl.textContent}:</b><br><span style="font-size: 14px; font-weight: bold; color: #006600;">${cardTotal.textContent}</span></td>
          </tr>
        </table>

        <!-- Table Details -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 10px; margin-top: 0;">
          <thead>
            ${thHtml}
          </thead>
          <tbody>
            ${tbHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>Printed on: ${new Date().toLocaleString()}</div>
          <div style="font-weight: bold; text-align: right;">For ${escapeHtml(compName)}<br><br><br>Authorised Signatory</div>
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`GST Report - ${reportTitle}`, docHtml);
    } else {
      let root = document.getElementById("print-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "print-root";
        document.body.appendChild(root);
      }
      root.innerHTML = docHtml;
      window.print();
    }
  }

  tabGstr1.addEventListener("click", () => setActiveTab("gstr1"));
  tabGstr3b.addEventListener("click", () => setActiveTab("gstr3b"));
  if (tabGstr2b) tabGstr2b.addEventListener("click", () => setActiveTab("gstr2b"));
  btnRefresh.addEventListener("click", () => {
    if (activeTab === "gstr2b") runReconciliation();
    else loadReport();
  });
  btnPrint.addEventListener("click", printReport);
  if (btnExportJson) btnExportJson.addEventListener("click", exportGstr1Json);
  btnClose.addEventListener("click", closeGSTReports);
  btnX.addEventListener("click", closeGSTReports);

  window.openGSTReports = openGSTReports;
  window.closeGSTReports = closeGSTReports;
  window.openGstReports = openGSTReports;
  window.closeGstReports = closeGSTReports;
  window.openGstReportsModal = openGSTReports;
})();