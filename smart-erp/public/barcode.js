/**
 * SMART ERP - Industrial Barcode & QR Label Designer / Print Controller
 * Handles live preview, A4 24-up sticker sheet generation, thermal roll label printing,
 * and Zebra ZPL-II code streaming.
 */

(function () {
  let masterItems = [];
  let currentLabelData = null;

  // DOM Elements
  const modal = document.getElementById("barcode-modal");
  const closeBtn = document.getElementById("barcode-btn-close");
  const closeX = document.getElementById("barcode-modal-close-x");
  const selTemplate = document.getElementById("barcode-sel-template");
  const selItem = document.getElementById("barcode-sel-item");
  const inputCopies = document.getElementById("barcode-input-copies");
  const preset1 = document.getElementById("barcode-preset-1");
  const preset24 = document.getElementById("barcode-preset-24");
  const preset48 = document.getElementById("barcode-preset-48");

  // Metadata inputs
  const metaCode = document.getElementById("barcode-meta-code");
  const metaDesc = document.getElementById("barcode-meta-desc");
  const metaDrg = document.getElementById("barcode-meta-drg");
  const metaGrade = document.getElementById("barcode-meta-grade");
  const metaHeat = document.getElementById("barcode-meta-heat");
  const metaBatch = document.getElementById("barcode-meta-batch");
  const metaQty = document.getElementById("barcode-meta-qty");
  const metaUom = document.getElementById("barcode-meta-uom");
  const chk1D = document.getElementById("barcode-chk-1d");
  const chk2D = document.getElementById("barcode-chk-2d");
  const btnRefresh = document.getElementById("barcode-btn-refresh-preview");

  // Previews & actions
  const previewBox = document.getElementById("barcode-preview-box");
  const previewRender = document.getElementById("barcode-preview-render");
  const zplRaw = document.getElementById("barcode-zpl-raw");
  const statusIndicator = document.getElementById("barcode-status-indicator");
  const btnPrint = document.getElementById("barcode-btn-print");
  const btnOpenTab = document.getElementById("barcode-btn-open-tab");
  const btnDownloadZpl = document.getElementById("barcode-btn-download-zpl");
  const btnCopyZpl = document.getElementById("barcode-btn-copy-zpl");

  function openBarcodeModal(params = {}) {
    if (!modal) return;
    modal.hidden = false;
    modal.style.display = "flex";

    if (params.template) selTemplate.value = params.template;
    if (params.itemCode) metaCode.value = params.itemCode;
    if (params.itemName) metaDesc.value = params.itemName;
    if (params.drgNo) metaDrg.value = params.drgNo;
    if (params.matGrade) metaGrade.value = params.matGrade;
    if (params.heatNo) metaHeat.value = params.heatNo;
    if (params.batchNo) metaBatch.value = params.batchNo;
    if (params.qty) metaQty.value = params.qty;
    if (params.uom) metaUom.value = params.uom;
    if (params.copies) inputCopies.value = params.copies;

    loadItemData(params.itemCode || metaCode.value);
  }

  function closeBarcodeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.style.display = "none";
  }

  async function loadItemData(targetCode) {
    statusIndicator.textContent = "⏳ Fetching item master...";
    try {
      const res = await fetch(`/api/barcode/item-data?itemCode=${encodeURIComponent(targetCode || "")}`);
      if (!res.ok) throw new Error("Failed to load item barcode data.");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Server error");

      masterItems = json.items || [];
      populateItemDropdown(targetCode || json.current?.itemCode);

      if (json.current) {
        currentLabelData = json.current;
        if (!targetCode || targetCode === json.current.itemCode) {
          metaCode.value = json.current.itemCode || metaCode.value;
          metaDesc.value = json.current.itemName || metaDesc.value;
          metaDrg.value = json.current.drgNo || metaDrg.value;
          metaGrade.value = json.current.matGrade || metaGrade.value;
          metaHeat.value = json.current.heatNo || metaHeat.value;
          metaBatch.value = json.current.batchNo || metaBatch.value;
          metaUom.value = json.current.uom || metaUom.value;
        }
      }

      updateLivePreview();
    } catch (err) {
      console.error(err);
      statusIndicator.textContent = "⚠️ Error loading item: " + err.message;
      updateLivePreview();
    }
  }

  function populateItemDropdown(selectedCode) {
    if (!selItem) return;
    selItem.innerHTML = "";

    masterItems.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.item_code;
      opt.textContent = `${item.item_code} - ${item.item_name} (Drg: ${item.drg_no || '-'})`;
      if (item.item_code.toLowerCase() === String(selectedCode || "").toLowerCase()) {
        opt.selected = true;
      }
      selItem.appendChild(opt);
    });
  }

  async function updateLivePreview() {
    const template = selTemplate.value;
    const itemCode = metaCode.value.trim() || "PART-001";
    const itemName = metaDesc.value.trim() || "PRECISION COMPONENT";
    const drgNo = metaDrg.value.trim() || "-";
    const matGrade = metaGrade.value.trim() || "STD";
    const heatNo = metaHeat.value.trim() || "HT-GEN-01";
    const batchNo = metaBatch.value.trim() || "BT-2026-01";
    const qty = metaQty.value.trim() || "100";
    const uom = metaUom.value.trim() || "NOS";
    const copies = parseInt(inputCopies.value, 10) || (template === "A4-24UP" ? 24 : 1);

    statusIndicator.textContent = "🔄 Rendering live preview...";

    try {
      const queryParams = new URLSearchParams({
        template,
        format: "json",
        code: itemCode,
        name: itemName,
        drg: drgNo,
        grade: matGrade,
        heat: heatNo,
        batch: batchNo,
        qty,
        uom,
        copies
      });

      const res = await fetch(`/api/barcode/generate?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to render preview.");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Preview failed");

      if (template === "ZPL-CODE") {
        previewRender.style.display = "none";
        zplRaw.style.display = "block";
        zplRaw.value = json.zpl;
        statusIndicator.textContent = `✅ ZPL II Code Ready (${json.zpl.length} bytes)`;
        return;
      }

      previewRender.style.display = "flex";
      zplRaw.style.display = "none";
      zplRaw.value = json.zpl; // keep available for download

      // Visual Interactive Card Render
      renderPreviewCard(json, template);
      statusIndicator.textContent = `✅ Live Preview Active &bull; ${template} &bull; ${itemCode}`;
    } catch (err) {
      console.error(err);
      statusIndicator.textContent = "❌ Preview error: " + err.message;
    }
  }

  function renderPreviewCard(json, template) {
    const d = json.labelData;
    const bc = json.barcodeSvg;
    const qr = json.qrSvg;
    const show1D = chk1D.checked;
    const show2D = chk2D.checked;

    if (template === "A4-24UP") {
      previewRender.innerHTML = `
        <div style="background: #fff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 10px 14px; width: 340px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-family: var(--font-sans);">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
            <span>${escapeHtml(d.companyName || "TAMBA ERP INDUSTRIAL")}</span>
            <span style="color: #0369a1; background: #e0f2fe; padding: 1px 4px; border-radius: 2px;">HT: ${escapeHtml(d.heatNo)}</span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px;">${escapeHtml(d.itemCode)}</div>
          <div style="font-size: 10px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(d.itemName)}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px;">
            <div style="flex: 1; overflow: hidden;">
              ${show1D ? `<div style="max-height: 32px; overflow: hidden;">${bc}</div>` : ''}
              <div style="font-size: 8px; color: #64748b; font-family: var(--font-mono); margin-top: 2px;">DRG: ${escapeHtml(d.drgNo)} | BATCH: ${escapeHtml(d.batchNo)}</div>
            </div>
            ${show2D ? `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">${qr}</div>` : ''}
          </div>
          <div style="margin-top: 6px; font-size: 9px; color: #059669; text-align: right; font-weight: bold;">[A4 24-Up Sticker Preview &mdash; 1 of 24]</div>
        </div>
      `;
    } else if (template === "THERMAL-50x25") {
      previewRender.innerHTML = `
        <div style="background: #fff; border: 1px solid #000; border-radius: 2px; padding: 6px 10px; width: 280px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); font-family: var(--font-sans);">
          <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; color: #333;">
            <span>${escapeHtml(d.companyName || "TAMBA ERP")}</span>
            <span>HT: ${escapeHtml(d.heatNo)}</span>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #000;">${escapeHtml(d.itemCode)}</div>
          <div style="font-size: 8px; color: #555;">BT: ${escapeHtml(d.batchNo)} | QTY: ${escapeHtml(d.qty)} ${escapeHtml(d.uom)}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 3px;">
            <div style="flex: 1; max-height: 28px; overflow: hidden;">${show1D ? bc : ''}</div>
            ${show2D ? `<div style="width: 36px; height: 36px;">${qr}</div>` : ''}
          </div>
        </div>
      `;
    } else {
      // THERMAL-100x50
      previewRender.innerHTML = `
        <div style="background: #fff; border: 2px solid #0f172a; border-radius: 4px; padding: 8px 12px; width: 440px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); font-family: var(--font-sans);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${escapeHtml(d.companyName)}</span>
            <span style="background: #0284c7; color: #fff; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 2px;">EN 10204 3.1 TRACE</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 4px;">
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">${escapeHtml(d.itemCode)}</div>
              <div style="font-size: 10px; color: #334155; font-weight: bold;">${escapeHtml(d.itemName)}</div>
              <div style="font-size: 9px; color: #475569; margin-top: 2px; line-height: 1.3;">
                <div><strong>HEAT:</strong> ${escapeHtml(d.heatNo)} &bull; <strong>BATCH:</strong> ${escapeHtml(d.batchNo)}</div>
                <div><strong>DRG:</strong> ${escapeHtml(d.drgNo)} &bull; <strong>GRADE:</strong> ${escapeHtml(d.matGrade)}</div>
                <div><strong>QTY:</strong> ${escapeHtml(d.qty)} ${escapeHtml(d.uom)} &bull; <strong>DATE:</strong> ${escapeHtml(d.date)}</div>
              </div>
            </div>
            ${show2D ? `<div style="width: 72px; height: 72px; margin-left: 8px;">${qr}</div>` : ''}
          </div>
          ${show1D ? `<div style="border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 3px; display: flex; justify-content: center;">${bc}</div>` : ''}
        </div>
      `;
    }
  }

  function getGenerateUrl(format = "html") {
    const template = selTemplate.value;
    const copies = parseInt(inputCopies.value, 10) || (template === "A4-24UP" ? 24 : 1);
    const queryParams = new URLSearchParams({
      template,
      format,
      code: metaCode.value.trim(),
      name: metaDesc.value.trim(),
      drg: metaDrg.value.trim(),
      grade: metaGrade.value.trim(),
      heat: metaHeat.value.trim(),
      batch: metaBatch.value.trim(),
      qty: metaQty.value.trim(),
      uom: metaUom.value.trim(),
      copies
    });
    return `/api/barcode/generate?${queryParams.toString()}`;
  }

  function printLabels() {
    const url = getGenerateUrl("html");
    // Open in print-ready iframe for immediate print dialog
    let iframe = document.getElementById("barcode-print-iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "barcode-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }
    statusIndicator.textContent = "🖨️ Opening browser print spooler...";
    iframe.src = url;
    iframe.onload = function () {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          statusIndicator.textContent = "✅ Print job sent to spooler.";
        } catch (e) {
          window.open(url, "_blank");
        }
      }, 300);
    };
  }

  function openInTab() {
    const url = getGenerateUrl("html");
    window.open(url, "_blank");
  }

  function downloadZpl() {
    const url = getGenerateUrl("zpl");
    const a = document.createElement("a");
    a.href = url;
    a.download = `label_${metaCode.value.trim() || "PART"}.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    statusIndicator.textContent = "✅ ZPL file downloaded.";
  }

  function copyZpl() {
    const text = zplRaw.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const prev = btnCopyZpl.textContent;
      btnCopyZpl.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyZpl.textContent = prev), 1800);
      statusIndicator.textContent = "✅ ZPL code copied to clipboard.";
    }).catch(err => {
      alert("Please copy manually from the text box.");
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Bind Event Listeners
  if (closeBtn) closeBtn.addEventListener("click", closeBarcodeModal);
  if (closeX) closeX.addEventListener("click", closeBarcodeModal);

  if (selTemplate) {
    selTemplate.addEventListener("change", () => {
      const t = selTemplate.value;
      if (t === "A4-24UP") inputCopies.value = 24;
      else if (t === "ZPL-CODE" || t.startsWith("THERMAL")) inputCopies.value = 1;
      updateLivePreview();
    });
  }

  if (selItem) {
    selItem.addEventListener("change", () => {
      const code = selItem.value;
      const found = masterItems.find(i => i.item_code === code);
      if (found) {
        metaCode.value = found.item_code;
        metaDesc.value = found.item_name;
        metaDrg.value = found.drg_no || "-";
        metaGrade.value = found.item_desn || "STD";
        metaUom.value = found.measure_unit || "NOS";
      }
      updateLivePreview();
    });
  }

  if (preset1) preset1.addEventListener("click", () => { inputCopies.value = 1; updateLivePreview(); });
  if (preset24) preset24.addEventListener("click", () => { inputCopies.value = 24; updateLivePreview(); });
  if (preset48) preset48.addEventListener("click", () => { inputCopies.value = 48; updateLivePreview(); });

  if (btnRefresh) btnRefresh.addEventListener("click", updateLivePreview);
  if (chk1D) chk1D.addEventListener("change", updateLivePreview);
  if (chk2D) chk2D.addEventListener("change", updateLivePreview);

  if (btnPrint) btnPrint.addEventListener("click", printLabels);
  if (btnOpenTab) btnOpenTab.addEventListener("click", openInTab);
  if (btnDownloadZpl) btnDownloadZpl.addEventListener("click", downloadZpl);
  if (btnCopyZpl) btnCopyZpl.addEventListener("click", copyZpl);

  // Wire launcher buttons from forms
  // 1. Item Master
  const itemBarcodeBtn = document.getElementById("item-btn-barcode");
  if (itemBarcodeBtn) {
    itemBarcodeBtn.addEventListener("click", () => {
      const code = (document.getElementById("item-code")?.value || "").trim();
      const name = (document.getElementById("item-name")?.value || "").trim();
      const drg = (document.getElementById("item-drg")?.value || "").trim();
      const grade = (document.getElementById("item-desn")?.value || "").trim();
      openBarcodeModal({
        itemCode: code || "B1",
        itemName: name,
        drgNo: drg,
        matGrade: grade
      });
    });
  }

  // 2. Stock Position
  const stockBarcodeBtn = document.getElementById("stock-btn-barcode");
  if (stockBarcodeBtn) {
    stockBarcodeBtn.addEventListener("click", () => {
      const searchVal = (document.getElementById("stock-search")?.value || "").trim();
      openBarcodeModal({
        itemCode: searchVal || "B1",
        template: "A4-24UP",
        copies: 24
      });
    });
  }

  // 3. Traceability Window
  const traceHeatQrBtn = document.getElementById("trace-btn-heat-qr");
  if (traceHeatQrBtn) {
    traceHeatQrBtn.addEventListener("click", () => {
      const q = (document.getElementById("trace-query-input")?.value || "").trim();
      openBarcodeModal({
        heatNo: q || "HT-BRASS-704",
        batchNo: "BT-2026-081",
        template: "THERMAL-100x50",
        copies: 1
      });
    });
  }

  // Expose globally
  window.openBarcodeModal = openBarcodeModal;
  window.closeBarcodeModal = closeBarcodeModal;
})();
