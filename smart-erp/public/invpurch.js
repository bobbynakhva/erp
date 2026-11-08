(() => {
  let mode = "view"; // "view" | "new" | "modify"
  let currentNote = null;
  let currentLines = [];
  let meta = { uninvoicedVendors: [], allVendors: [], currencies: [] };
  let availableDcs = [];
  let selectedDcSet = new Set();
  let isLocked = false;
  let lockReason = "";

  const dom = {
    section: document.getElementById("invpurch"),
    btnX: document.getElementById("invpurch-btn-x"),
    btnClose: document.getElementById("invpurch-btn-close"),
    btnCorres: document.getElementById("invpurch-btn-corres"),
    btnCrNote: document.getElementById("invpurch-btn-crnote"),
    btnEou: document.getElementById("invpurch-btn-eou"),

    vendor: document.getElementById("invpurch-vendor"),
    altVendor: document.getElementById("invpurch-alt-vendor"),
    dcList: document.getElementById("invpurch-dc-list"),
    remarks: document.getElementById("invpurch-remarks"),

    invNo: document.getElementById("invpurch-no"),
    invDate: document.getElementById("invpurch-date"),
    payTerm: document.getElementById("invpurch-pay-term"),
    packForwd: document.getElementById("invpurch-pack-forwd"),
    insurance: document.getElementById("invpurch-insurance"),
    otherChrg: document.getElementById("invpurch-other-chrg"),
    radioGst: document.getElementById("invpurch-radio-gst"),
    lblTaxable: document.getElementById("invpurch-lbl-taxable"),
    lblSupply: document.getElementById("invpurch-lbl-supply"),
    lblCgst: document.getElementById("invpurch-lbl-cgst"),
    lblSgst: document.getElementById("invpurch-lbl-sgst"),
    lblIgst: document.getElementById("invpurch-lbl-igst"),
    lblRound: document.getElementById("invpurch-lbl-round"),
    totalVal: document.getElementById("invpurch-total-val"),
    curr: document.getElementById("invpurch-curr"),

    gstSummary: document.getElementById("invpurch-gst-summary"),
    tableHead: document.getElementById("invpurch-items-head"),
    tableBody: document.getElementById("invpurch-items-body"),
    guideItem: document.getElementById("invpurch-guide-item"),
    guideUom: document.getElementById("invpurch-guide-uom"),

    searchNo: document.getElementById("invpurch-search-no"),
    btnSearch: document.getElementById("invpurch-btn-search"),

    btnNew: document.getElementById("invpurch-btn-new"),
    btnSave: document.getElementById("invpurch-btn-save"),
    btnModify: document.getElementById("invpurch-btn-modify"),
    btnDelete: document.getElementById("invpurch-btn-delete"),

    btnFirst: document.getElementById("invpurch-btn-first"),
    btnPrev: document.getElementById("invpurch-btn-prev"),
    btnNext: document.getElementById("invpurch-btn-next"),
    btnLast: document.getElementById("invpurch-btn-last"),
    btnPrint: document.getElementById("invpurch-btn-print")
  };

  function fmt2(n) {
    const num = Number(n);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  }

  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  async function apiGet(path) {
    const res = await fetch(path);
    return res.json();
  }

  async function apiPost(path, data) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  function setMode(newMode) {
    mode = newMode;
    const isEdit = (mode === "new" || mode === "modify");

    dom.vendor.disabled = (mode !== "new");
    dom.altVendor.disabled = !isEdit;
    dom.remarks.readOnly = !isEdit;

    dom.invNo.readOnly = !isEdit;
    dom.invDate.disabled = !isEdit;
    dom.payTerm.readOnly = !isEdit;
    dom.packForwd.readOnly = !isEdit;
    dom.insurance.readOnly = !isEdit;
    dom.otherChrg.readOnly = !isEdit;
    dom.curr.disabled = !isEdit;

    dom.btnSave.disabled = !isEdit;
    dom.btnNew.disabled = isEdit;
    dom.btnModify.disabled = isEdit || !currentNote || isLocked;
    dom.btnDelete.disabled = isEdit || !currentNote || isLocked;

    dom.btnFirst.disabled = isEdit;
    dom.btnPrev.disabled = isEdit;
    dom.btnNext.disabled = isEdit;
    dom.btnLast.disabled = isEdit;
    if (dom.btnPrint) dom.btnPrint.disabled = isEdit || !currentNote;

    // Line items input interactivity
    const inputs = dom.tableBody.querySelectorAll("input");
    inputs.forEach((inp) => (inp.disabled = !isEdit));

    if (isEdit) {
      if (mode === "new") {
        dom.invNo.focus();
      }
    }
  }

  function renderVendorOptions(selectedCode) {
    const list = (mode === "new") ? meta.uninvoicedVendors : meta.allVendors;
    dom.vendor.innerHTML = '<option value="0">-- Select Vendor --</option>' +
      list.map((v) => `<option value="${v.code}">${v.name}</option>`).join("");

    if (selectedCode) {
      dom.vendor.value = String(selectedCode);
    }

    // Alternate vendor dropdown
    dom.altVendor.innerHTML = '<option value="0">-- None / Same --</option>' +
      meta.allVendors.map((v) => `<option value="${v.code}">${v.name}</option>`).join("");
    if (currentNote && currentNote.altVendorCode) {
      dom.altVendor.value = String(currentNote.altVendorCode);
    }
  }

  function renderCurrencies(selectedId) {
    dom.curr.innerHTML = meta.currencies.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    if (selectedId) dom.curr.value = String(selectedId);
  }

  function renderDcList() {
    if (!availableDcs.length) {
      dom.dcList.innerHTML = '<div style="color: #808080; padding: 4px;">No DCs available</div>';
      return;
    }

    dom.dcList.innerHTML = availableDcs.map((dc) => {
      const isChecked = selectedDcSet.has(dc.purchId);
      const disabledAttr = (mode === "view") ? "disabled" : "";
      return `
        <label class="invpurch-dc-item ${isChecked ? "selected" : ""}">
          <input type="checkbox" value="${dc.purchId}" ${isChecked ? "checked" : ""} ${disabledAttr} />
          <span><b>DC: ${dc.dcNo}</b> (${dc.dcDate || dc.grnDate}) ${dc.poNo ? `[PO: ${dc.poNo}]` : ""}</span>
        </label>
      `;
    }).join("");

    const checkboxes = dom.dcList.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach((cb) => {
      cb.addEventListener("change", async (e) => {
        const pid = Number(e.target.value);
        if (e.target.checked) {
          selectedDcSet.add(pid);
        } else {
          selectedDcSet.delete(pid);
        }
        await reloadLinesForSelectedDcs();
      });
    });
  }

  async function reloadLinesForSelectedDcs() {
    const pids = Array.from(selectedDcSet);
    if (!pids.length) {
      currentLines = [];
      renderTable();
      recalcTotals();
      return;
    }

    const vCode = Number(dom.vendor.value) || 0;
    const taxRegime = "GST";
    const res = await apiGet(`/api/invpurch/dcs?vendor=${vCode}&dcs=${pids.join(",")}&taxRegime=${taxRegime}`);
    if (res && Array.isArray(res.lines)) {
      // Preserve any user-entered rates/discounts if line was already in table
      const oldMap = new Map();
      currentLines.forEach((l) => oldMap.set(`${l.purchId}_${l.slno}`, l));

      currentLines = res.lines.map((l) => {
        const key = `${l.purchId}_${l.slno}`;
        if (oldMap.has(key)) {
          const old = oldMap.get(key);
          return {
            ...l,
            rate: old.rate,
            discount: old.discount,
            hsnCode: old.hsnCode || l.hsnCode,
            cgstRate: old.cgstRate,
            sgstRate: old.sgstRate,
            igstRate: old.igstRate,
            excise: 0,
            cessOnED: 0,
            highCessOnED: 0,
            taxes: 0
          };
        }
        l.excise = 0;
        l.cessOnED = 0;
        l.highCessOnED = 0;
        l.taxes = 0;
        return l;
      });

      renderTable();
      recalcTotals();
    }
  }

  let factoryState = "29";

  function recalcRow(l) {
    const qty = Number(l.accpQty !== undefined ? l.accpQty : l.qty) || 0;
    const rate = Number(l.rate) || 0;
    const disc = Number(l.discount) || 0;
    const packForwd = Number(dom.packForwd.value) || 0;

    // 1. Basic net item amount
    const gross = qty * rate;
    const netItem = gross - (gross * (disc / 100));

    // 2. Assessable value with P&F
    const assessable = netItem + (netItem * (packForwd / 100));

    // Under modern GST, legacy Central Excise Duty, ED Cess, and Higher ED Cess are 0
    l.excise = 0;
    l.cessOnED = 0;
    l.highCessOnED = 0;

    const vCode = Number(dom.vendor.value);
    const vObj = (meta.uninvoicedVendors || []).find(v => v.code === vCode) || (meta.allVendors || []).find(v => v.code === vCode);
    const vendorState = vObj ? (vObj.stateCode || "29") : "29";
    const isIntraState = (vendorState === factoryState);
    const defaultGstRate = Number(l.gstRate) || (Number(l.taxes) > 0 ? Number(l.taxes) : 18);

    l.taxableAmt = Math.round(assessable * 100) / 100;

    if (isIntraState) {
      if (l.cgstRate === undefined && l.sgstRate === undefined) {
        l.cgstRate = defaultGstRate / 2;
        l.sgstRate = defaultGstRate / 2;
      }
      l.igstRate = 0;
      l.cgstAmt = Math.round(l.taxableAmt * (Number(l.cgstRate) || 0)) / 100;
      l.sgstAmt = Math.round(l.taxableAmt * (Number(l.sgstRate) || 0)) / 100;
      l.igstAmt = 0;
    } else {
      l.cgstRate = 0;
      l.sgstRate = 0;
      if (l.igstRate === undefined) {
        l.igstRate = defaultGstRate;
      }
      l.cgstAmt = 0;
      l.sgstAmt = 0;
      l.igstAmt = Math.round(l.taxableAmt * (Number(l.igstRate) || 0)) / 100;
    }

    const amount = l.taxableAmt + l.cgstAmt + l.sgstAmt + l.igstAmt;
    l.amount = Number(amount.toFixed(2));
    return l.amount;
  }

  function recalcTotals() {
    let sumRowAmounts = 0;
    let sumItemBase = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    currentLines.forEach((l, idx) => {
      const amt = recalcRow(l);
      sumRowAmounts += amt;

      const taxableCell = document.getElementById(`invpurch-taxable-${idx}`);
      if (taxableCell) taxableCell.textContent = fmt2(l.taxableAmt);
      const amtCell = document.getElementById(`invpurch-amt-${idx}`);
      if (amtCell) amtCell.innerHTML = `<b>${fmt2(amt)}</b>`;

      const qty = Number(l.accpQty !== undefined ? l.accpQty : l.qty) || 0;
      const rate = Number(l.rate) || 0;
      const disc = Number(l.discount) || 0;
      const gross = qty * rate;
      sumItemBase += (gross - (gross * (disc / 100)));

      totalTaxable += Number(l.taxableAmt || 0);
      totalCgst += Number(l.cgstAmt || 0);
      totalSgst += Number(l.sgstAmt || 0);
      totalIgst += Number(l.igstAmt || 0);
    });

    const insurancePct = Number(dom.insurance.value) || 0;
    const insuranceAmt = sumItemBase * (insurancePct / 100);
    const otherChrg = Number(dom.otherChrg.value) || 0;

    const rawTotal = sumRowAmounts + insuranceAmt + otherChrg;
    const totalVal = Math.round(rawTotal);
    const roundOff = Math.round((totalVal - rawTotal) * 100) / 100;

    dom.totalVal.value = fmt2(totalVal);

    if (dom.lblTaxable) dom.lblTaxable.textContent = fmt2(totalTaxable);
    if (dom.lblCgst) dom.lblCgst.textContent = fmt2(totalCgst);
    if (dom.lblSgst) dom.lblSgst.textContent = fmt2(totalSgst);
    if (dom.lblIgst) dom.lblIgst.textContent = fmt2(totalIgst);
    if (dom.lblRound) dom.lblRound.textContent = fmt2(roundOff);

    if (dom.lblSupply) {
      const vCode = Number(dom.vendor.value);
      const vObj = (meta.uninvoicedVendors || []).find(v => v.code === vCode) || (meta.allVendors || []).find(v => v.code === vCode);
      const vendorState = vObj ? (vObj.stateCode || "29") : "29";
      dom.lblSupply.textContent = (vendorState === factoryState) ? `Intra-State (State ${vendorState})` : `Inter-State (State ${vendorState})`;
    }
  }

  function renderTable() {
    const isEdit = (mode === "new" || mode === "modify");
    const disabledAttr = !isEdit ? "disabled" : "";

    if (dom.tableHead) {
      dom.tableHead.innerHTML = `
        <tr>
          <th style="width: 80px;">DcNo</th>
          <th style="width: 40px;">SlNo</th>
          <th style="width: 200px;">Particulars</th>
          <th style="width: 60px;">HSN</th>
          <th style="width: 50px;">Qty</th>
          <th style="width: 70px;">Rate</th>
          <th style="width: 55px;">Disc%</th>
          <th style="width: 75px;">Taxable</th>
          <th style="width: 55px;">CGST%</th>
          <th style="width: 55px;">SGST%</th>
          <th style="width: 55px;">IGST%</th>
          <th style="width: 85px;">Amount</th>
        </tr>
      `;
    }

    dom.tableBody.innerHTML = currentLines.map((l, index) => {
      const amt = recalcRow(l);
      return `
        <tr data-index="${index}">
          <td>${escapeHtml(l.dcNo)}</td>
          <td class="center">${l.slno}</td>
          <td>${escapeHtml(l.itemCode)} ${escapeHtml(l.itemName)}</td>
          <td><input type="text" class="col-hsn" data-idx="${index}" value="${escapeHtml(l.hsnCode || '8482')}" style="width: 100%; text-align: center;" ${disabledAttr} /></td>
          <td class="right">${l.accpQty !== undefined ? l.accpQty : l.qty}</td>
          <td><input type="number" step="0.01" min="0" class="col-rate" data-idx="${index}" value="${fmt2(l.rate)}" style="width: 100%; text-align: right;" ${disabledAttr} /></td>
          <td><input type="number" step="0.01" min="0" class="col-disc" data-idx="${index}" value="${fmt2(l.discount)}" style="width: 100%; text-align: right;" ${disabledAttr} /></td>
          <td class="right col-taxable" id="invpurch-taxable-${index}">${fmt2(l.taxableAmt)}</td>
          <td><input type="number" step="0.01" min="0" class="col-cgst-rate" data-idx="${index}" value="${fmt2(l.cgstRate)}" style="width: 100%; text-align: right;" ${disabledAttr} /></td>
          <td><input type="number" step="0.01" min="0" class="col-sgst-rate" data-idx="${index}" value="${fmt2(l.sgstRate)}" style="width: 100%; text-align: right;" ${disabledAttr} /></td>
          <td><input type="number" step="0.01" min="0" class="col-igst-rate" data-idx="${index}" value="${fmt2(l.igstRate)}" style="width: 100%; text-align: right;" ${disabledAttr} /></td>
          <td class="right col-amount" id="invpurch-amt-${index}"><b>${fmt2(amt)}</b></td>
        </tr>
      `;
    }).join("");

    // Wire table input events
    const rows = dom.tableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        const idx = Number(row.dataset.index);
        const l = currentLines[idx];
        if (l) {
          dom.guideItem.textContent = `ITEM: ${l.itemCode} - ${l.itemName}`;
          dom.guideUom.textContent = `UOM: ${l.uom || ""}`;
        }
      });
    });

    const bindCell = (cls, prop, isText = false) => {
      dom.tableBody.querySelectorAll(`.${cls}`).forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const idx = Number(e.target.dataset.idx);
          if (isText) {
            currentLines[idx][prop] = e.target.value.trim();
          } else {
            const val = Number(e.target.value) || 0;
            currentLines[idx][prop] = val;
            if (prop === "cgstRate") {
              currentLines[idx].cgstAmt = Math.round(Number(currentLines[idx].taxableAmt || 0) * val) / 100;
            } else if (prop === "sgstRate") {
              currentLines[idx].sgstAmt = Math.round(Number(currentLines[idx].taxableAmt || 0) * val) / 100;
            } else if (prop === "igstRate") {
              currentLines[idx].igstAmt = Math.round(Number(currentLines[idx].taxableAmt || 0) * val) / 100;
            }
          }
          const amt = recalcRow(currentLines[idx]);
          const taxableCell = document.getElementById(`invpurch-taxable-${idx}`);
          if (taxableCell) taxableCell.textContent = fmt2(currentLines[idx].taxableAmt);
          const cell = document.getElementById(`invpurch-amt-${idx}`);
          if (cell) cell.innerHTML = `<b>${fmt2(amt)}</b>`;
          recalcTotals();
        });
      });
    };

    bindCell("col-rate", "rate");
    bindCell("col-disc", "discount");
    bindCell("col-hsn", "hsnCode", true);
    bindCell("col-cgst-rate", "cgstRate");
    bindCell("col-sgst-rate", "sgstRate");
    bindCell("col-igst-rate", "igstRate");
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    if (bundle.meta) meta = bundle.meta;
    if (bundle.factoryState) factoryState = bundle.factoryState;

    currentNote = bundle.note;
    currentLines = Array.isArray(bundle.lines) ? bundle.lines : [];
    availableDcs = Array.isArray(bundle.availableDcs) ? bundle.availableDcs : [];
    isLocked = !!bundle.isLocked;
    lockReason = bundle.lockReason || "";

    selectedDcSet.clear();

    if (currentNote) {
      renderVendorOptions(currentNote.vendorCode);
      renderCurrencies(currentNote.currId);

      dom.invNo.value = currentNote.invNo || "";
      dom.invDate.value = currentNote.invDate || todayStr();
      dom.payTerm.value = currentNote.payTerm || "";
      dom.packForwd.value = fmt2(currentNote.packForwd);
      dom.insurance.value = fmt2(currentNote.insurance);
      dom.otherChrg.value = fmt2(currentNote.anyOtherChrg);

      if (dom.radioGst) dom.radioGst.checked = true;
      if (dom.gstSummary) dom.gstSummary.style.display = "block";

      dom.totalVal.value = fmt2(currentNote.totVal);
      dom.remarks.value = currentNote.remarks || "";

      if (Array.isArray(currentNote.selectedPurchIds)) {
        currentNote.selectedPurchIds.forEach((pid) => selectedDcSet.add(pid));
      }

      renderDcList();
      renderTable();
      recalcTotals();
      if (currentNote.taxableAmt > 0) {
        if (dom.lblTaxable) dom.lblTaxable.textContent = fmt2(currentNote.taxableAmt);
        if (dom.lblCgst) dom.lblCgst.textContent = fmt2(currentNote.cgstAmt);
        if (dom.lblSgst) dom.lblSgst.textContent = fmt2(currentNote.sgstAmt);
        if (dom.lblIgst) dom.lblIgst.textContent = fmt2(currentNote.igstAmt);
        if (dom.lblRound) dom.lblRound.textContent = fmt2(currentNote.roundOff);
      }
      setMode("view");
    } else {
      // Empty / New bundle
      renderVendorOptions(0);
      renderCurrencies(1);
      dom.invNo.value = "";
      dom.invDate.value = todayStr();
      dom.payTerm.value = "";
      dom.packForwd.value = "0.00";
      dom.insurance.value = "0.00";
      dom.otherChrg.value = "0.00";
      if (dom.radioGst) dom.radioGst.checked = true;
      if (dom.gstSummary) dom.gstSummary.style.display = "block";
      dom.totalVal.value = "0.00";
      dom.remarks.value = "";

      renderDcList();
      renderTable();
      setMode("view");
    }

    if (bundle.message) {
      alert(bundle.message);
    }
  }

  async function loadInitial() {
    const res = await apiGet("/api/invpurch?first=1");
    if (res && !res.error) {
      applyBundle(res);
    } else {
      const newRes = await apiGet("/api/invpurch?new=1");
      applyBundle(newRes);
    }
  }

  // --- Event Listeners ---

  // Vendor selection change
  dom.vendor.addEventListener("change", async () => {
    const vCode = Number(dom.vendor.value) || 0;
    if (!vCode) {
      availableDcs = [];
      selectedDcSet.clear();
      renderDcList();
      currentLines = [];
      renderTable();
      recalcTotals();
      return;
    }
    const res = await apiGet(`/api/invpurch?vendor=${vCode}`);
    if (res && res.availableDcs) {
      availableDcs = res.availableDcs;
      selectedDcSet.clear();
      renderDcList();
      currentLines = [];
      renderTable();
      recalcTotals();
    }
  });

  // Header charges recalculation
  dom.packForwd.addEventListener("input", () => {
    renderTable();
    recalcTotals();
  });
  dom.insurance.addEventListener("input", recalcTotals);
  dom.otherChrg.addEventListener("input", recalcTotals);

  // New button
  dom.btnNew.addEventListener("click", async () => {
    const res = await apiGet("/api/invpurch?new=1");
    applyBundle(res);
    setMode("new");
  });

  // Modify button
  dom.btnModify.addEventListener("click", () => {
    if (isLocked) {
      alert(lockReason || "Modification not allowed  in this Context, Since some cash flow has been made!!!");
      return;
    }
    setMode("modify");
  });

  // Save button
  dom.btnSave.addEventListener("click", async () => {
    recalcTotals();

    const vendorCode = Number(dom.vendor.value) || 0;
    if (!vendorCode) {
      alert("Select a vendor Name.....");
      dom.vendor.focus();
      return;
    }

    const invNo = dom.invNo.value.trim();
    if (!invNo) {
      alert("Enter the Invoice Number .....");
      dom.invNo.focus();
      return;
    }

    const purchIds = Array.from(selectedDcSet);
    if (!purchIds.length) {
      alert("Select atleast One DC..... ");
      dom.dcList.focus();
      return;
    }

    const currId = Number(dom.curr.value) || 1;
    if (!currId) {
      alert("Please Select an existing Currency Name....");
      dom.curr.focus();
      return;
    }

    const totVal = Number(dom.totalVal.value) || 0;
    if (!(totVal > 0)) {
      alert("Enter a Valid  Invoice Value .....");
      return;
    }

    const isGST = dom.radioGst && dom.radioGst.checked;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    currentLines.forEach(l => {
      totalTaxable += Number(l.taxableAmt || 0);
      totalCgst += Number(l.cgstAmt || 0);
      totalSgst += Number(l.sgstAmt || 0);
      totalIgst += Number(l.igstAmt || 0);
    });

    const payload = {
      vendorCode,
      altVendorCode: Number(dom.altVendor.value) || null,
      invNo,
      invDate: dom.invDate.value,
      purchIds,
      payTerm: dom.payTerm.value.trim(),
      packForwd: Number(dom.packForwd.value) || 0,
      insurance: Number(dom.insurance.value) || 0,
      anyOtherChrg: Number(dom.otherChrg.value) || 0,
      vatrCst: false,
      currId,
      totVal,
      remarks: dom.remarks.value.trim(),
      taxRegime: "GST",
      taxableAmt: totalTaxable,
      cgstAmt: totalCgst,
      sgstAmt: totalSgst,
      igstAmt: totalIgst,
      totalGst: (totalCgst + totalSgst + totalIgst),
      roundOff: Number(dom.lblRound ? dom.lblRound.textContent : 0) || 0,
      lines: currentLines.map((l) => ({
        purchId: l.purchId,
        slno: l.slno,
        rate: Number(l.rate) || 0,
        discount: Number(l.discount) || 0,
        excise: 0,
        cessOnED: 0,
        highCessOnED: 0,
        taxes: 0,
        amount: Number(l.amount) || 0,
        taxableAmt: Number(l.taxableAmt || 0),
        cgstRate: Number(l.cgstRate || 0),
        cgstAmt: Number(l.cgstAmt || 0),
        sgstRate: Number(l.sgstRate || 0),
        sgstAmt: Number(l.sgstAmt || 0),
        igstRate: Number(l.igstRate || 0),
        igstAmt: Number(l.igstAmt || 0),
        hsnCode: l.hsnCode || "8482"
      }))
    };

    const res = await apiPost("/api/invpurch/save", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    applyBundle(res);
    setMode("view");
  });

  // Delete button
  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote) return;
    if (isLocked) {
      alert(lockReason || "Deletion not allowed , since some Cash Flow has been made in this Regard!!!");
      return;
    }

    if (!confirm("Are You Sure To DELETE this INVOICE ? ")) return;

    const res = await apiPost("/api/invpurch/delete", {
      vendorCode: currentNote.vendorCode,
      invNo: currentNote.invNo
    });

    if (res.error) {
      alert(res.error);
      return;
    }

    applyBundle(res);
    setMode("view");
  });

  // Navigation buttons
  dom.btnFirst.addEventListener("click", async () => {
    const res = await apiGet("/api/invpurch?first=1");
    applyBundle(res);
  });

  dom.btnPrev.addEventListener("click", async () => {
    const invNo = currentNote ? currentNote.invNo : "";
    const vCode = currentNote ? currentNote.vendorCode : 0;
    const res = await apiGet(`/api/invpurch?prev=1&invNo=${encodeURIComponent(invNo)}&vendor=${vCode}`);
    applyBundle(res);
  });

  dom.btnNext.addEventListener("click", async () => {
    const invNo = currentNote ? currentNote.invNo : "";
    const vCode = currentNote ? currentNote.vendorCode : 0;
    const res = await apiGet(`/api/invpurch?next=1&invNo=${encodeURIComponent(invNo)}&vendor=${vCode}`);
    applyBundle(res);
  });

  dom.btnLast.addEventListener("click", async () => {
    const res = await apiGet("/api/invpurch?last=1");
    applyBundle(res);
  });

  // Search button
  dom.btnSearch.addEventListener("click", async () => {
    const query = dom.searchNo.value.trim();
    if (!query) {
      alert("Enter the Invoice Number to Search");
      dom.searchNo.focus();
      return;
    }
    const vCode = Number(dom.vendor.value) || 0;
    const res = await apiGet(`/api/invpurch?search=${encodeURIComponent(query)}&vendor=${vCode}`);
    applyBundle(res);
  });

  dom.searchNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      dom.btnSearch.click();
    }
  });

  // EOU button
  dom.btnEou.addEventListener("click", () => {
    if (selectedDcSet.size > 1) {
      alert("Since More than one GRN involved in this Invoice, you cannot add EOU Details to this Invoice !!!");
      return;
    }
    alert("EOU Details: Under Construction (Single GRN required)");
  });

  // Credit Note button
  dom.btnCrNote.addEventListener("click", () => {
    alert("Debit / Credit Note: Available under Accounts module.");
  });

  // Correspondences button
  dom.btnCorres.addEventListener("click", () => {
    if (window.openCorres) {
      window.openCorres("InvoiceInward", dom.invNo.value || "Invoice");
    } else {
      alert("Correspondences module");
    }
  });

  async function printInvoice() {
    if (!currentNote || !currentNote.invNo) {
      alert("No Invoice record loaded to print.");
      return;
    }
    const note = currentNote;
    const vCode = Number(dom.vendor.value);
    const vendor = (meta.allVendors || []).find((v) => Number(v.code) === vCode) || {};
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

    const isGST = true;

    const rowsHtml = (currentLines || []).map((l, i) => {
      const amt = recalcRow(l);
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
          <td style="border: 1px solid #777; padding: 4px;">${escapeHtml(l.dcNo || "")}</td>
          <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.itemCode || "")}</b><br><small>${escapeHtml(l.itemName || "")}</small></td>
          <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.hsnCode || "-")}</td>
          <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.uom || "NOS")}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.accpQty !== undefined ? l.accpQty : l.qty)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${fmt2(l.rate)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${Number(l.discount || 0) ? fmt2(l.discount) + '%' : '-'}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${fmt2(l.taxableAmt)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${Number(l.cgstAmt || 0) > 0 ? fmt2(l.cgstAmt) + '<br><small>(' + l.cgstRate + '%)</small>' : '-'}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${Number(l.sgstAmt || 0) > 0 ? fmt2(l.sgstAmt) + '<br><small>(' + l.sgstRate + '%)</small>' : '-'}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${Number(l.igstAmt || 0) > 0 ? fmt2(l.igstAmt) + '<br><small>(' + l.igstRate + '%)</small>' : '-'}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.amount || amt)}</td>
        </tr>
      `;
    }).join("");

    const dcNosStr = Array.from(selectedDcSet).map((id) => {
      const dc = availableDcs.find((d) => d.purchId === id);
      return dc ? dc.dcNo : `DC-${id}`;
    }).join(", ") || "-";

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">PURCHASE INVOICE / INVOICE (INWARDS)</div>
          <div style="font-size: 11px; margin-top: 2px; font-weight: bold; color: #555;">[ Regime: ${isGST ? 'GST' : (isVat ? 'VAT' : 'CST')} ]</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Supplier / Consignor:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(vendor.name || dom.vendor.selectedOptions[0]?.textContent || "")}</div>
              <div style="margin-top: 4px;">${escapeHtml(vendor.address || "")}</div>
              ${vendor.gstin ? `<div style="margin-top: 4px;"><b>GSTIN:</b> ${escapeHtml(vendor.gstin)}</div>` : ""}
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>Invoice No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(note.invNo)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>Invoice Date:</b></td><td style="padding: 2px 0;">${escapeHtml(note.invDate || "")}</td></tr>
                <tr><td style="padding: 2px 0;"><b>Payment Terms:</b></td><td style="padding: 2px 0;">${escapeHtml(note.payTerm || "CASH")}</td></tr>
                <tr><td style="padding: 2px 0;"><b>Linked DC(s):</b></td><td style="padding: 2px 0;">${escapeHtml(dcNosStr)}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 10px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border: 1px solid #777; width: 25px;">Sl</th>
              <th style="padding: 4px; border: 1px solid #777; width: 60px;">DC No</th>
              <th style="padding: 4px; border: 1px solid #777;">Item Description</th>
              <th style="padding: 4px; border: 1px solid #777; width: 45px;">HSN</th>
              <th style="padding: 4px; border: 1px solid #777; width: 35px;">UOM</th>
              <th style="padding: 4px; border: 1px solid #777; width: 45px; text-align: right;">Qty</th>
              <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">Rate</th>
              <th style="padding: 4px; border: 1px solid #777; width: 40px; text-align: right;">Disc</th>
              ${isGST ? `
                <th style="padding: 4px; border: 1px solid #777; width: 65px; text-align: right;">Taxable</th>
                <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">CGST</th>
                <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">SGST</th>
                <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">IGST</th>
              ` : `
                <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">Excise</th>
                <th style="padding: 4px; border: 1px solid #777; width: 55px; text-align: right;">Tax</th>
              `}
              <th style="padding: 4px; width: 75px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="${isGST ? 13 : 11}" style="text-align: center; padding: 10px;">No items</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="${isGST ? 8 : 8}" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Invoice Value:</td>
              ${isGST ? `<td style="padding: 6px; text-align: right; border-right: 1px solid #777;">${dom.lblTaxable?.textContent || '0.00'}</td><td colspan="3" style="border-right: 1px solid #777;"></td>` : ''}
              <td style="padding: 6px; text-align: right; color: #000080; font-size: 12px;">Rs. ${fmt2(note.totVal || dom.totalVal.value)}</td>
            </tr>
          </tfoot>
        </table>

        ${isGST ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px; background: #fafafa;">
            <table style="width: 100%; border-collapse: collapse; text-align: right;">
              <tr>
                <td style="text-align: left;"><b>GST Summary:</b></td>
                <td><b>Taxable:</b> Rs. ${dom.lblTaxable?.textContent || '0.00'}</td>
                <td><b>CGST:</b> Rs. ${dom.lblCgst?.textContent || '0.00'}</td>
                <td><b>SGST:</b> Rs. ${dom.lblSgst?.textContent || '0.00'}</td>
                <td><b>IGST:</b> Rs. ${dom.lblIgst?.textContent || '0.00'}</td>
                <td><b>Round Off:</b> Rs. ${dom.lblRound?.textContent || '0.00'}</td>
              </tr>
            </table>
          </div>
        ` : ""}

        ${note.remarks ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px;">
            <b>Remarks:</b> ${escapeHtml(note.remarks)}
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 33%; padding: 16px 8px; vertical-align: bottom;">
              <div>Store Verification</div>
            </td>
            <td style="width: 33%; padding: 16px 8px; text-align: center; vertical-align: bottom;">
              <div>Accounts / Auditor</div>
            </td>
            <td style="width: 34%; padding: 16px 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 30px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Invoice (Inwards) - ${note.invNo}`, docHtml);
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

  // Print button
  if (dom.btnPrint) dom.btnPrint.addEventListener("click", printInvoice);

  // Close handlers
  dom.btnX.addEventListener("click", () => window.closeInvPurch());
  dom.btnClose.addEventListener("click", () => window.closeInvPurch());

  // Sequential Enter progression
  const focusOrder = [
    dom.invNo, dom.invDate, dom.payTerm, dom.packForwd, dom.insurance, dom.otherChrg, dom.remarks
  ];
  focusOrder.forEach((ctrl, idx) => {
    ctrl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (idx + 1 < focusOrder.length) {
          focusOrder[idx + 1].focus();
        }
      }
    });
  });

  // Uppercase auto-transform
  [dom.invNo, dom.payTerm].forEach((el) => {
    el.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  });

  // Global window interface
  window.openInvPurch = async () => {
    dom.section.hidden = false;
    await loadInitial();
  };

  window.closeInvPurch = () => {
    dom.section.hidden = true;
    currentNote = null;
    currentLines = [];
    selectedDcSet.clear();
  };
})();
