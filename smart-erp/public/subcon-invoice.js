// Sub Contract - Invoice Inwards (frmInvoiceSC)
(function () {
  let state = {
    mode: "new",
    record: null,
    suppliers: [],
    dcs: [],
    lines: [],
    misc: { roffsubcon: false, subcon1to1: false },
    totalInvoices: 0
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(val) {
    const num = Number(val || 0);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function recalculateTotals() {
    let basicAmount = 0;
    state.lines.forEach((line) => {
      const qty = Number(line.accpQty || line.accpqty || 0);
      const rate = Number(line.rate || 0);
      const disc = Number(line.discount || 0);
      const amt = Math.round(qty * rate * (1 - disc / 100) * 100) / 100;
      line.amount = amt;
      basicAmount += amt;
    });
    basicAmount = Math.round(basicAmount * 100) / 100;

    const packForwd = Number(el("subcon-inv-pf")?.value || 0);
    const otherCharges = Number(el("subcon-inv-other")?.value || 0);
    const gstRate = Number(el("subcon-inv-gst-rate")?.value || 18);

    const taxable = Math.round((basicAmount + packForwd) * 100) / 100;
    const cgstVal = Math.round(taxable * (gstRate / 2)) / 100;
    const sgstVal = Math.round(taxable * (gstRate / 2)) / 100;
    const totGst = Math.round((cgstVal + sgstVal) * 100) / 100;

    let totVal = taxable + totGst + otherCharges;
    let roundOff = 0;
    if (state.misc && state.misc.roffsubcon) {
      const rounded = Math.round(totVal);
      roundOff = Math.round((rounded - totVal) * 100) / 100;
      totVal = rounded;
    } else {
      totVal = Math.round(totVal * 100) / 100;
    }

    if (el("subcon-inv-taxable")) el("subcon-inv-taxable").value = formatCurrency(taxable);
    if (el("subcon-inv-cgst")) el("subcon-inv-cgst").value = formatCurrency(cgstVal);
    if (el("subcon-inv-sgst")) el("subcon-inv-sgst").value = formatCurrency(sgstVal);
    if (el("subcon-inv-tot-gst")) el("subcon-inv-tot-gst").value = formatCurrency(totGst);
    if (el("subcon-inv-totval")) el("subcon-inv-totval").value = formatCurrency(totVal);

    // Keep legacy inputs zeroed
    if (el("subcon-inv-vat")) el("subcon-inv-vat").value = "0.00";
    if (el("subcon-inv-servtax")) el("subcon-inv-servtax").value = "0.00";
    if (el("subcon-inv-cess")) el("subcon-inv-cess").value = "0.00";
    if (el("subcon-inv-highcess")) el("subcon-inv-highcess").value = "0.00";

    return {
      basicAmount,
      taxable,
      gstRate,
      cgstVal,
      sgstVal,
      totGst,
      packForwd,
      otherCharges,
      roundOff,
      totVal
    };
  }

  function renderGrid() {
    const tbody = el("subcon-inv-tbody");
    if (!tbody) return;

    if (!state.lines.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888; padding: 20px;">No Delivery Challans selected.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.lines.map((line, idx) => {
      return `
        <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
          <td style="border: 1px solid #c0c0c0; padding: 4px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #c0c0c0; padding: 4px; font-weight: bold;">${escapeHtml(line.dcNo || "")}</td>
          <td style="border: 1px solid #c0c0c0; padding: 4px;">
            <b>${escapeHtml(line.itemCode || "")}</b> ${escapeHtml(line.itemName || "")}
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 4px; text-align: right; font-weight: bold;">${Number(line.accpQty || 0).toFixed(2)}</td>
          <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: right;">
            <input type="number" step="0.01" min="0" class="invmfg-input inv-line-rate" data-index="${idx}" value="${Number(line.rate || 0).toFixed(2)}" style="width: 75px; text-align: right; font-weight: bold;">
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: right;">
            <input type="number" step="0.01" min="0" max="100" class="invmfg-input inv-line-disc" data-index="${idx}" value="${Number(line.discount || 0).toFixed(2)}" style="width: 55px; text-align: right;">
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 4px; text-align: right; font-weight: bold; color: #000080;" id="subcon-inv-line-amt-${idx}">
            ${formatCurrency(line.amount || 0)}
          </td>
        </tr>
      `;
    }).join("");

    // Attach row events
    tbody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        const idx = Number(row.dataset.index);
        const l = state.lines[idx];
        if (l && el("subcon-inv-unit-guide")) {
          el("subcon-inv-unit-guide").textContent = `ITEM : ${l.itemCode || ""} - ${l.itemName || ""}   |   UOM : ${l.measureUnit || ""}`;
        }
      });
    });

    tbody.querySelectorAll(".inv-line-rate").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        const val = parseFloat(e.target.value) || 0;
        state.lines[idx].rate = val;
        const qty = Number(state.lines[idx].accpQty || 0);
        const disc = Number(state.lines[idx].discount || 0);
        const amt = Math.round(qty * val * (1 - disc / 100) * 100) / 100;
        state.lines[idx].amount = amt;
        const amtCell = el(`subcon-inv-line-amt-${idx}`);
        if (amtCell) amtCell.textContent = formatCurrency(amt);
        recalculateTotals();
      });
    });

    tbody.querySelectorAll(".inv-line-disc").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        const val = parseFloat(e.target.value) || 0;
        state.lines[idx].discount = val;
        const qty = Number(state.lines[idx].accpQty || 0);
        const rate = Number(state.lines[idx].rate || 0);
        const amt = Math.round(qty * rate * (1 - val / 100) * 100) / 100;
        state.lines[idx].amount = amt;
        const amtCell = el(`subcon-inv-line-amt-${idx}`);
        if (amtCell) amtCell.textContent = formatCurrency(amt);
        recalculateTotals();
      });
    });

    if (state.lines.length > 0 && el("subcon-inv-unit-guide")) {
      const first = state.lines[0];
      el("subcon-inv-unit-guide").textContent = `ITEM : ${first.itemCode || ""} - ${first.itemName || ""}   |   UOM : ${first.measureUnit || ""}`;
    }
  }

  function renderSuppliers() {
    const sel = el("subcon-inv-supp");
    if (!sel) return;

    const list = state.suppliers || [];
    let opts = `<option value="">-- Select SubContractor --</option>`;
    for (const s of list) {
      const id = s.supp_id || s.suppId || s.id;
      const name = s.supp_name || s.suppName || s.name;
      opts += `<option value="${id}">${escapeHtml(name)}</option>`;
    }

    if (state.record && state.record.suppId) {
      const exists = list.some(s => String(s.supp_id || s.suppId || s.id) === String(state.record.suppId));
      if (!exists) {
        opts += `<option value="${state.record.suppId}">${escapeHtml(state.record.suppName || ("Supplier #" + state.record.suppId))}</option>`;
      }
    }

    sel.innerHTML = opts;

    if (state.record && state.record.suppId) {
      sel.value = String(state.record.suppId);
    } else {
      sel.value = "";
    }
  }

  function renderDcs() {
    const sel = el("subcon-inv-dcs");
    if (!sel) return;

    if (!state.dcs || !state.dcs.length) {
      sel.innerHTML = `<option value="" disabled>No Open Delivery Challans</option>`;
      return;
    }

    sel.innerHTML = state.dcs.map((d) => {
      const isSel = (state.record && state.record.selectedDcIds && state.record.selectedDcIds.includes(d.dcid)) || d.selected;
      return `<option value="${d.dcid}" ${isSel ? "selected" : ""}>${escapeHtml(d.dcno || String(d.dcid))}</option>`;
    }).join("");
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.mode = bundle.mode || "new";
    state.record = bundle.record;
    if (bundle.suppliers && bundle.suppliers.length > 0) {
      state.suppliers = bundle.suppliers;
    }
    state.dcs = bundle.dcs || [];
    state.lines = bundle.lines || [];
    state.misc = bundle.misc || state.misc || { roffsubcon: false, subcon1to1: false };
    state.totalInvoices = bundle.totalInvoices || 0;

    renderSuppliers();
    renderDcs();

    const saveBtn = el("subcon-inv-btn-save");
    const newBtn = el("subcon-inv-btn-new");
    const delBtn = el("subcon-inv-btn-delete");

    if (state.mode === "edit" && state.record) {
      const r = state.record;
      if (el("subcon-inv-mode")) el("subcon-inv-mode").value = "edit";
      if (el("subcon-inv-dc-id")) el("subcon-inv-dc-id").value = r.dcInvId || "";
      if (el("subcon-inv-no")) el("subcon-inv-no").value = r.invNo || "";
      if (el("subcon-inv-date")) el("subcon-inv-date").value = r.invDate || "";
      if (el("subcon-inv-recdate")) el("subcon-inv-recdate").value = r.recDate || "";
      if (el("subcon-inv-payterm")) el("subcon-inv-payterm").value = r.payTerm || "";
      if (el("subcon-inv-pf")) el("subcon-inv-pf").value = Number(r.packForwd || 0).toFixed(2);
      if (el("subcon-inv-gst-rate")) el("subcon-inv-gst-rate").value = String(r.gstRate || 18);
      if (el("subcon-inv-other")) el("subcon-inv-other").value = Number(r.otherCharges || 0).toFixed(2);
      if (el("subcon-inv-rem")) el("subcon-inv-rem").value = r.invRem || "";
      if (el("subcon-inv-totval")) el("subcon-inv-totval").value = formatCurrency(r.totVal);

      if (saveBtn) {
        saveBtn.textContent = "Modify";
        saveBtn.disabled = false;
      }
      if (newBtn) newBtn.disabled = false;
      if (delBtn) delBtn.disabled = false;
    } else {
      resetFormToNew();
    }

    renderGrid();
    recalculateTotals();
  }

  function resetFormToNew() {
    state.mode = "new";
    state.record = null;
    state.lines = [];
    state.dcs = [];

    if (el("subcon-inv-supp")) el("subcon-inv-supp").value = "";
    if (el("subcon-inv-mode")) el("subcon-inv-mode").value = "new";
    if (el("subcon-inv-dc-id")) el("subcon-inv-dc-id").value = "";
    if (el("subcon-inv-no")) el("subcon-inv-no").value = "";
    if (el("subcon-inv-date")) el("subcon-inv-date").value = getTodayDate();
    if (el("subcon-inv-recdate")) el("subcon-inv-recdate").value = getTodayDate();
    if (el("subcon-inv-payterm")) el("subcon-inv-payterm").value = "";
    if (el("subcon-inv-pf")) el("subcon-inv-pf").value = "0.00";
    if (el("subcon-inv-gst-rate")) el("subcon-inv-gst-rate").value = "18";
    if (el("subcon-inv-taxable")) el("subcon-inv-taxable").value = "0.00";
    if (el("subcon-inv-cgst")) el("subcon-inv-cgst").value = "0.00";
    if (el("subcon-inv-sgst")) el("subcon-inv-sgst").value = "0.00";
    if (el("subcon-inv-tot-gst")) el("subcon-inv-tot-gst").value = "0.00";
    if (el("subcon-inv-other")) el("subcon-inv-other").value = "0.00";
    if (el("subcon-inv-rem")) el("subcon-inv-rem").value = "";
    if (el("subcon-inv-totval")) el("subcon-inv-totval").value = "0.00";

    const saveBtn = el("subcon-inv-btn-save");
    const newBtn = el("subcon-inv-btn-new");
    const delBtn = el("subcon-inv-btn-delete");

    if (saveBtn) {
      saveBtn.textContent = "Save";
      saveBtn.disabled = false;
    }
    if (newBtn) newBtn.disabled = true;
    if (delBtn) delBtn.disabled = true;

    renderDcs();
    renderGrid();
  }

  async function handleSupplierChange() {
    const suppId = Number(el("subcon-inv-supp")?.value || 0);
    if (!suppId) {
      state.dcs = [];
      state.lines = [];
      renderDcs();
      renderGrid();
      recalculateTotals();
      return;
    }

    try {
      const invNo = state.mode === "edit" ? (el("subcon-inv-no")?.value || "") : "";
      const res = await fetch(`/api/subcon-invoice/supplier-dcs?suppId=${suppId}&invNo=${encodeURIComponent(invNo)}`);
      const data = await res.json();
      state.dcs = data.dcs || [];
      renderDcs();

      if (state.mode === "new" && data.defaultTaxes) {
        const dt = data.defaultTaxes;
        if (el("subcon-inv-pf")) el("subcon-inv-pf").value = Number(dt.packforwd || 0).toFixed(2);
      }

      state.lines = [];
      renderGrid();
      recalculateTotals();
    } catch (err) {
      console.error("handleSupplierChange error:", err);
    }
  }

  async function handleDcSelectionChange() {
    const sel = el("subcon-inv-dcs");
    if (!sel) return;

    let selectedOptions = Array.from(sel.selectedOptions);

    // subcon1to1 single DC enforcement
    if (state.misc && state.misc.subcon1to1 && selectedOptions.length > 1) {
      const lastSelected = selectedOptions[selectedOptions.length - 1];
      for (const opt of selectedOptions) {
        opt.selected = (opt === lastSelected);
      }
      selectedOptions = [lastSelected];
    }

    const dcIds = selectedOptions.map(opt => Number(opt.value)).filter(n => n > 0);
    if (!dcIds.length) {
      state.lines = [];
      renderGrid();
      recalculateTotals();
      return;
    }

    try {
      const suppId = Number(el("subcon-inv-supp")?.value || 0);
      const res = await fetch(`/api/subcon-invoice/dc-lines?dcIds=${dcIds.join(",")}&suppId=${suppId}`);
      const data = await res.json();
      state.lines = data.lines || [];
      renderGrid();
      recalculateTotals();
    } catch (err) {
      console.error("handleDcSelectionChange error:", err);
    }
  }

  async function handleSave() {
    recalculateTotals();

    const suppId = Number(el("subcon-inv-supp")?.value || 0);
    const invNo = String(el("subcon-inv-no")?.value || "").trim();
    const dcSel = el("subcon-inv-dcs");
    const selectedDcIds = dcSel ? Array.from(dcSel.selectedOptions).map(opt => Number(opt.value)).filter(n => n > 0) : [];
    const totVal = parseFloat(el("subcon-inv-totval")?.value) || 0;
    const mode = state.mode || (el("subcon-inv-mode")?.value || "new");
    const isModify = mode === "edit" || el("subcon-inv-btn-save")?.textContent === "Modify";

    // Client pre-validations matching VB6 Proc_D231EC & Proc_CB4680
    if (!suppId) {
      alert("Select a supplier Name.....");
      el("subcon-inv-supp")?.focus();
      return;
    }
    if (!invNo) {
      alert("Enter the Invoice Number .....");
      el("subcon-inv-no")?.focus();
      return;
    }
    if (!selectedDcIds.length) {
      alert("Select atleast a DC..... ");
      el("subcon-inv-dcs")?.focus();
      return;
    }
    if (!state.lines.length) {
      alert("Select a DcNo to have the invoice particulars.....");
      el("subcon-inv-dcs")?.focus();
      return;
    }

    for (let i = 0; i < state.lines.length; i++) {
      const l = state.lines[i];
      if (Number(l.rate || 0) <= 0) {
        alert("Enter the Valid Rate .....");
        const rateInputs = el("subcon-inv-tbody")?.querySelectorAll(".inv-line-rate");
        if (rateInputs && rateInputs[i]) rateInputs[i].focus();
        return;
      }
    }

    if (totVal <= 0) {
      alert("Enter a Valid  Invoice Value .....");
      el("subcon-inv-totval")?.focus();
      return;
    }

    if (!confirm("Are You Sure To Save?")) {
      return;
    }

    const payload = {
      mode: isModify ? "edit" : "new",
      isModify,
      caption: isModify ? "&Modify" : "&Save",
      suppId,
      invNo,
      invDate: el("subcon-inv-date")?.value || getTodayDate(),
      recDate: el("subcon-inv-recdate")?.value || getTodayDate(),
      payTerm: el("subcon-inv-payterm")?.value || "",
      packForwd: parseFloat(el("subcon-inv-pf")?.value) || 0,
      taxRegime: "GST",
      gstRate: parseFloat(el("subcon-inv-gst-rate")?.value) || 18,
      vat: 0,
      servTax: 0,
      cessOnServTax: 0,
      highCessOnServTax: 0,
      otherCharges: parseFloat(el("subcon-inv-other")?.value) || 0,
      invRem: el("subcon-inv-rem")?.value || "",
      dcIds: selectedDcIds,
      lines: state.lines
    };

    try {
      const res = await fetch("/api/subcon-invoice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Record Stored successfully .");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving Sub Contract Invoice.");
    }
  }

  async function handleDelete() {
    const invNo = String(el("subcon-inv-no")?.value || "").trim();
    const suppId = Number(el("subcon-inv-supp")?.value || 0);
    const dcInvId = Number(el("subcon-inv-dc-id")?.value || 0);

    if (!invNo && !dcInvId) {
      alert("No Invoice loaded to delete.");
      return;
    }

    if (!confirm("Are You Sure To DELETE this INVOICE ? ")) {
      return;
    }

    try {
      const res = await fetch("/api/subcon-invoice/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invNo, suppId, dcId: dcInvId })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Records Deleted");
      await loadInvoice("last=1");
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting Sub Contract Invoice.");
    }
  }

  async function ensureSuppliersLoaded() {
    try {
      let res = await fetch("/api/subcon-invoice/suppliers");
      if (!res.ok) {
        res = await fetch("/api/subcon-invoice?new=1");
      }
      const data = await res.json();
      if (data && Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        state.suppliers = data.suppliers;
        renderSuppliers();
      }
    } catch (err) {
      console.error("ensureSuppliersLoaded error:", err);
    }
  }

  async function loadInvoice(paramStr) {
    try {
      const res = await fetch(`/api/subcon-invoice?${paramStr}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("loadInvoice server error:", data);
        if (data.error) alert(data.error);
        await ensureSuppliersLoaded();
        return;
      }
      if (data.message && !data.record) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadInvoice error:", err);
      await ensureSuppliersLoaded();
    }
  }

  function handlePrint() {
    const invNo = String(el("subcon-inv-no")?.value || "").trim();
    const suppId = Number(el("subcon-inv-supp")?.value || 0);
    if (!invNo) {
      alert("Please load an Invoice first.");
      return;
    }
    window.open(`/api/print?type=subcon-invoice&invNo=${encodeURIComponent(invNo)}&suppId=${suppId}`, "_blank");
  }

  function handleSearch() {
    const term = String(el("subcon-inv-search-no")?.value || "").trim();
    if (!term) {
      alert("Please enter an Invoice Number to search.");
      return;
    }
    loadInvoice(`no=${encodeURIComponent(term)}`);
  }

  function handleCreditNoteClick() {
    const invNo = el("subcon-inv-no")?.value;
    const suppName = el("subcon-inv-supp")?.selectedOptions?.[0]?.textContent || "";
    if (!invNo) {
      alert("Please select or save an Invoice first.");
      return;
    }
    alert(`Debit / Credit Note for SubContractor: ${suppName}\nTowards Invoice No: ${invNo}`);
  }

  function handleCorresClick() {
    const invNo = el("subcon-inv-no")?.value;
    if (!invNo) {
      alert("Save invoice first to view correspondences.");
      return;
    }
    if (window.openCorres) {
      window.openCorres("frmInvoiceSC", invNo);
    }
  }

  function initEvents() {
    el("subcon-inv-supp")?.addEventListener("change", handleSupplierChange);
    el("subcon-inv-supp")?.addEventListener("focus", () => {
      if (!state.suppliers || state.suppliers.length === 0) {
        ensureSuppliersLoaded();
      }
    });
    el("subcon-inv-supp")?.addEventListener("click", () => {
      if (!state.suppliers || state.suppliers.length === 0) {
        ensureSuppliersLoaded();
      }
    });

    el("subcon-inv-dcs")?.addEventListener("change", handleDcSelectionChange);

    // Live GST recalculation
    ["subcon-inv-pf", "subcon-inv-gst-rate", "subcon-inv-other"].forEach(id => {
      el(id)?.addEventListener("input", recalculateTotals);
      el(id)?.addEventListener("change", recalculateTotals);
    });

    el("subcon-inv-totval")?.addEventListener("dblclick", recalculateTotals);
    el("subcon-inv-btn-calc")?.addEventListener("click", recalculateTotals);

    // Toolbar buttons
    el("subcon-inv-btn-new")?.addEventListener("click", () => {
      loadInvoice("new=1");
    });
    el("subcon-inv-btn-save")?.addEventListener("click", handleSave);
    el("subcon-inv-btn-delete")?.addEventListener("click", handleDelete);

    // Navigation buttons
    el("subcon-inv-btn-first")?.addEventListener("click", () => loadInvoice("first=1"));
    el("subcon-inv-btn-last")?.addEventListener("click", () => loadInvoice("last=1"));
    el("subcon-inv-btn-prev")?.addEventListener("click", () => {
      const curId = el("subcon-inv-dc-id")?.value || 0;
      loadInvoice(`prev=1&currentDcId=${curId}`);
    });
    el("subcon-inv-btn-next")?.addEventListener("click", () => {
      const curId = el("subcon-inv-dc-id")?.value || 0;
      loadInvoice(`next=1&currentDcId=${curId}`);
    });

    el("subcon-inv-btn-search")?.addEventListener("click", handleSearch);
    el("subcon-inv-search-no")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    el("subcon-inv-btn-print")?.addEventListener("click", handlePrint);
    el("subcon-inv-btn-close")?.addEventListener("click", closeSubconInvoice);
    el("subcon-inv-btn-x")?.addEventListener("click", closeSubconInvoice);

    el("subcon-inv-btn-credit")?.addEventListener("click", handleCreditNoteClick);
    el("subcon-inv-btn-corres")?.addEventListener("click", handleCorresClick);

    // Preload suppliers immediately on event initialization
    ensureSuppliersLoaded();
  }

  async function openSubconInvoice(target) {
    const sec = el("subcon-invoice");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    await ensureSuppliersLoaded();

    if (target && target.invNo) {
      await loadInvoice(`invNo=${encodeURIComponent(target.invNo)}&suppId=${target.suppId || 0}`);
    } else if (target && target.dcId) {
      await loadInvoice(`id=${target.dcId}`);
    } else {
      // Load last invoice by default (matching VB6 Form_Load cmdMoveLast_Click)
      await loadInvoice("last=1");
    }
  }

  function closeSubconInvoice() {
    const sec = el("subcon-invoice");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  }

  window.openSubconInvoice = openSubconInvoice;
  window.closeSubconInvoice = closeSubconInvoice;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initEvents();
    });
  } else {
    initEvents();
  }

  // Also initiate supplier fetch immediately
  ensureSuppliersLoaded();
})();
