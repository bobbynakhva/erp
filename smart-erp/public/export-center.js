(() => {
  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    if (filename) a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadPdf(params) {
    const qs = new URLSearchParams(params).toString();
    triggerDownload(`/api/export/pdf?${qs}`);
  }

  function downloadExcel(params) {
    const qs = new URLSearchParams(params).toString();
    triggerDownload(`/api/export/excel?${qs}`);
  }

  function openExportCenter() {
    const modal = document.getElementById("export-center-modal");
    if (modal) {
      modal.removeAttribute("hidden");
      modal.style.display = "flex";
    }
  }

  function closeExportCenter() {
    const modal = document.getElementById("export-center-modal");
    if (modal) {
      modal.setAttribute("hidden", "hidden");
      modal.style.display = "none";
    }
  }

  window.openExportCenter = openExportCenter;
  window.closeExportCenter = closeExportCenter;
  window.downloadPdf = downloadPdf;
  window.downloadExcel = downloadExcel;

  function init() {
    // 1. Dashboard launchpad button
    const dashBtn = document.getElementById("dash-btn-export-center");
    if (dashBtn) dashBtn.addEventListener("click", openExportCenter);

    // Modal Close
    const closeX = document.getElementById("exp-modal-close-x");
    if (closeX) closeX.addEventListener("click", closeExportCenter);
    const closeBtn = document.getElementById("exp-modal-btn-close");
    if (closeBtn) closeBtn.addEventListener("click", closeExportCenter);

    // 2. Modal Excel exports
    const btnStockXlsx = document.getElementById("exp-btn-stock-xlsx");
    if (btnStockXlsx) {
      btnStockXlsx.addEventListener("click", () => {
        downloadExcel({ type: "stock", format: "xlsx" });
      });
    }
    const btnStockCsv = document.getElementById("exp-btn-stock-csv");
    if (btnStockCsv) {
      btnStockCsv.addEventListener("click", () => {
        downloadExcel({ type: "stock", format: "csv" });
      });
    }

    const btnInvXlsx = document.getElementById("exp-btn-inv-xlsx");
    if (btnInvXlsx) {
      btnInvXlsx.addEventListener("click", () => {
        downloadExcel({ type: "invoices", format: "xlsx" });
      });
    }
    const btnInvCsv = document.getElementById("exp-btn-inv-csv");
    if (btnInvCsv) {
      btnInvCsv.addEventListener("click", () => {
        downloadExcel({ type: "invoices", format: "csv" });
      });
    }

    const btnObXlsx = document.getElementById("exp-btn-ob-xlsx");
    if (btnObXlsx) {
      btnObXlsx.addEventListener("click", () => {
        downloadExcel({ type: "orderbook", format: "xlsx" });
      });
    }
    const btnObCsv = document.getElementById("exp-btn-ob-csv");
    if (btnObCsv) {
      btnObCsv.addEventListener("click", () => {
        downloadExcel({ type: "orderbook", format: "csv" });
      });
    }

    const btnPayXlsx = document.getElementById("exp-btn-pay-xlsx");
    if (btnPayXlsx) {
      btnPayXlsx.addEventListener("click", () => {
        downloadExcel({ type: "payroll", format: "xlsx" });
      });
    }
    const btnPayCsv = document.getElementById("exp-btn-pay-csv");
    if (btnPayCsv) {
      btnPayCsv.addEventListener("click", () => {
        downloadExcel({ type: "payroll", format: "csv" });
      });
    }

    // 3. Modal PDF exports
    const btnInvPdf = document.getElementById("exp-btn-inv-pdf");
    if (btnInvPdf) {
      btnInvPdf.addEventListener("click", () => {
        const invNo = document.getElementById("exp-input-invno")?.value?.trim() || "7047";
        const subType = document.getElementById("exp-select-invtype")?.value || "mfg";
        downloadPdf({ type: "invoice", no: invNo, subType });
      });
    }

    const btnDcPdf = document.getElementById("exp-btn-dc-pdf");
    if (btnDcPdf) {
      btnDcPdf.addEventListener("click", () => {
        const dcNo = document.getElementById("exp-input-dcno")?.value?.trim() || "DC-TEST-2653";
        const subType = document.getElementById("exp-select-dctype")?.value || "mfg";
        downloadPdf({ type: "dc", no: dcNo, subType });
      });
    }

    const btnPoPdf = document.getElementById("exp-btn-po-pdf");
    if (btnPoPdf) {
      btnPoPdf.addEventListener("click", () => {
        const poNo = document.getElementById("exp-input-pono")?.value?.trim() || "PO-TEST-2598";
        downloadPdf({ type: "po", no: poNo });
      });
    }

    const btnTracePdf = document.getElementById("exp-btn-trace-pdf");
    if (btnTracePdf) {
      btnTracePdf.addEventListener("click", () => {
        const q = document.getElementById("exp-input-trace")?.value?.trim() || "HT-BRASS-704";
        downloadPdf({ type: "traceability", q, dir: "forward" });
      });
    }

    // 4. Form-level Direct Export Actions
    // Stock Position window exports
    const stockXlsxBtn = document.getElementById("stock-export-xlsx");
    if (stockXlsxBtn) {
      stockXlsxBtn.addEventListener("click", () => {
        const valMethod = document.getElementById("stock-val-method")?.value || "WAC";
        const storeId = document.getElementById("stock-store")?.value;
        const catId = document.getElementById("stock-category")?.value;
        const params = { type: "stock", format: "xlsx", method: valMethod };
        if (storeId) params.storeId = storeId;
        if (catId) params.categoryId = catId;
        downloadExcel(params);
      });
    }

    const stockCsvBtn = document.getElementById("stock-export-csv");
    if (stockCsvBtn) {
      stockCsvBtn.addEventListener("click", () => {
        const valMethod = document.getElementById("stock-val-method")?.value || "WAC";
        const storeId = document.getElementById("stock-store")?.value;
        const catId = document.getElementById("stock-category")?.value;
        const params = { type: "stock", format: "csv", method: valMethod };
        if (storeId) params.storeId = storeId;
        if (catId) params.categoryId = catId;
        downloadExcel(params);
      });
    }

    // Traceability Window Vector PDF
    const tracePdfBtn = document.getElementById("trace-btn-pdf");
    if (tracePdfBtn) {
      tracePdfBtn.addEventListener("click", () => {
        const q = document.getElementById("trace-query-input")?.value?.trim() || "HT-BRASS-704";
        const dir = document.querySelector('input[name="trace-dir"]:checked')?.value || "backward";
        downloadPdf({ type: "traceability", q, dir });
      });
    }

    // PO Window Vector PDF
    const poPdfBtn = document.getElementById("po-pdf");
    if (poPdfBtn) {
      poPdfBtn.addEventListener("click", () => {
        const prefix = document.getElementById("po-prefix")?.value || "";
        const poNoVal = document.getElementById("po-no")?.value?.trim() || "";
        const fullPoNo = (prefix && poNoVal) ? `${poNoVal} / ${prefix}` : (poNoVal || "1");
        downloadPdf({ type: "po", no: fullPoNo });
      });
    }

    // DC Window Vector PDF
    const dcPdfBtn = document.getElementById("dc-btn-pdf");
    if (dcPdfBtn) {
      dcPdfBtn.addEventListener("click", () => {
        const dcNo = document.getElementById("dc-search-input")?.value?.trim() || "DC-TEST-2653";
        downloadPdf({ type: "dc", no: dcNo, subType: "mfg" });
      });
    }

    // Mfg Invoice Window Vector PDF
    const invmfgPdfBtn = document.getElementById("invmfg-btn-pdf");
    if (invmfgPdfBtn) {
      invmfgPdfBtn.addEventListener("click", () => {
        const invNo = document.getElementById("invmfg-search-no")?.value?.trim() ||
                      document.getElementById("invmfg-invno")?.value?.trim() || "7047";
        downloadPdf({ type: "invoice", no: invNo, subType: "mfg" });
      });
    }

    // Labour Invoice Window Vector PDF
    const invlabPdfBtn = document.getElementById("invlab-btn-pdf");
    if (invlabPdfBtn) {
      invlabPdfBtn.addEventListener("click", () => {
        const invNo = document.getElementById("invlab-search-no")?.value?.trim() ||
                      document.getElementById("invlab-invno")?.value?.trim() || "7048";
        downloadPdf({ type: "invoice", no: invNo, subType: "labour" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
