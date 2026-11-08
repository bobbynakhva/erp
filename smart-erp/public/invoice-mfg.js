(() => {
  let mode = "view"; // "view" | "new"
  let currentNote = null;
  let lines = [];
  let meta = {
    customers: [],
    allCustomers: [],
    currencies: [],
    ids: [],
    nextNo: "1"
  };

  const dom = {
    section: document.getElementById("invoice-mfg"),
    titlebar: document.querySelector(".invmfg-titlebar"),
    btnX: document.getElementById("invmfg-btn-x"),
    btnClose: document.getElementById("invmfg-btn-close"),
    btnCorres: document.getElementById("invmfg-btn-corres"),

    // Left panel
    cust: document.getElementById("invmfg-cust"),
    altCust: document.getElementById("invmfg-alt-cust"),
    dcs: document.getElementById("invmfg-dcs"),
    rem: document.getElementById("invmfg-rem"),
    btnDebit: document.getElementById("invmfg-btn-debit"),

    // Right panel
    no: document.getElementById("invmfg-no"),
    date: document.getElementById("invmfg-date"),
    time: document.getElementById("invmfg-time"),
    payterm: document.getElementById("invmfg-payterm"),
    pfPerc: document.getElementById("invmfg-pf-perc"),
    pfRs: document.getElementById("invmfg-pf-rs"),
    otherChrg: document.getElementById("invmfg-other-chrg"),
    totVal: document.getElementById("invmfg-tot-val"),
    curr: document.getElementById("invmfg-curr"),

    // GST Regime & Controls
    regimeGst: document.getElementById("invmfg-regime-gst"),
    gstPanel: document.getElementById("invmfg-gst-panel"),
    posState: document.getElementById("invmfg-pos-state"),
    supplyNature: document.getElementById("invmfg-supply-nature"),
    taxableAmt: document.getElementById("invmfg-taxable-amt"),
    totGst: document.getElementById("invmfg-tot-gst"),
    cgstSgstRow: document.getElementById("invmfg-cgst-sgst-row"),
    cgstAmt: document.getElementById("invmfg-cgst-amt"),
    sgstAmt: document.getElementById("invmfg-sgst-amt"),
    igstRow: document.getElementById("invmfg-igst-row"),
    igstAmt: document.getElementById("invmfg-igst-amt"),
    roundOff: document.getElementById("invmfg-round-off"),

    // Grid
    gridBody: document.getElementById("invmfg-grid-body"),

    // Footer
    lblItem: document.getElementById("invmfg-item-name"),
    lblUom: document.getElementById("invmfg-uom-name"),
    chkPreformat: document.getElementById("invmfg-chk-preformat"),
    searchNo: document.getElementById("invmfg-search-no"),
    btnFind: document.getElementById("invmfg-btn-find"),

    btnTaxPrint: document.getElementById("invmfg-btn-tax-print"),
    btnExcPrint: document.getElementById("invmfg-btn-exc-print"),
    btnExpPrint: document.getElementById("invmfg-btn-exp-print"),
    btnGstPortal: document.getElementById("invmfg-btn-gst-portal"),

    btnNew: document.getElementById("invmfg-btn-new"),
    btnSave: document.getElementById("invmfg-btn-save"),
    btnDelete: document.getElementById("invmfg-btn-delete"),
    btnFirst: document.getElementById("invmfg-btn-first"),
    btnPrev: document.getElementById("invmfg-btn-prev"),
    btnNext: document.getElementById("invmfg-btn-next"),
    btnLast: document.getElementById("invmfg-btn-last"),
    btnEou: document.getElementById("invmfg-btn-eou"),

    // EOU Modal
    eouModal: document.getElementById("invmfg-eou-modal"),
    eouLblInv: document.getElementById("invmfg-eou-lbl-inv"),
    eouType: document.getElementById("invmfg-eou-type"),
    eouAreNo: document.getElementById("invmfg-eou-are-no"),
    eouAreDate: document.getElementById("invmfg-eou-are-date"),
    eouAreSign: document.getElementById("invmfg-eou-are-sign"),
    eouD3No: document.getElementById("invmfg-eou-d3-no"),
    eouD3Date: document.getElementById("invmfg-eou-d3-date"),
    eouD3Sign: document.getElementById("invmfg-eou-d3-sign"),
    btnEouSave: document.getElementById("invmfg-eou-btn-save"),
    btnEouClose: document.getElementById("invmfg-eou-btn-close"),
    btnEouX: document.getElementById("invmfg-eou-btn-x"),

    // Debit Note Modal (frmDbCrNote)
    debitModal: document.getElementById("invmfg-debit-modal"),
    dbLblCust: document.getElementById("invmfg-db-lbl-cust"),
    dbLblInv: document.getElementById("invmfg-db-lbl-inv"),
    dbLblMax: document.getElementById("invmfg-db-lbl-max"),
    dbAmt: document.getElementById("invmfg-db-amt"),
    dbTds: document.getElementById("invmfg-db-tds"),
    dbTotal: document.getElementById("invmfg-db-total"),
    dbRem: document.getElementById("invmfg-db-rem"),
    dbLblNewBal: document.getElementById("invmfg-db-lbl-new-bal"),
    btnDbSave: document.getElementById("invmfg-db-btn-save"),
    btnDbClose: document.getElementById("invmfg-db-btn-close"),
    btnDbX: document.getElementById("invmfg-db-btn-x")
  };

  function fmt2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
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

  function setMode(m) {
    mode = m;
    const isEdit = (mode === "new");

    dom.cust.disabled = !isEdit;
    dom.altCust.disabled = !isEdit;
    dom.dcs.disabled = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.readOnly = !isEdit;
    dom.time.readOnly = !isEdit;
    dom.payterm.readOnly = !isEdit;
    dom.pfPerc.readOnly = !isEdit;
    dom.pfRs.readOnly = !isEdit;
    dom.otherChrg.readOnly = !isEdit;
    dom.curr.disabled = !isEdit;

    dom.btnNew.disabled = isEdit;
    dom.btnSave.disabled = !isEdit;
    dom.btnDelete.disabled = isEdit || !currentNote;

    dom.btnFirst.disabled = isEdit || meta.ids.length === 0;
    dom.btnPrev.disabled = isEdit || meta.ids.length === 0;
    dom.btnNext.disabled = isEdit || meta.ids.length === 0;
    dom.btnLast.disabled = isEdit || meta.ids.length === 0;
    dom.btnFind.disabled = isEdit;
  }

  function populateDropdowns() {
    // Customer
    dom.cust.innerHTML = "";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-- Select Customer --";
    dom.cust.appendChild(emptyOpt);
    const custList = (mode === "new" && meta.customers.length > 0) ? meta.customers : meta.allCustomers;
    for (const c of custList) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      dom.cust.appendChild(opt);
    }

    // Alt Customer
    dom.altCust.innerHTML = "";
    const emptyAlt = document.createElement("option");
    emptyAlt.value = "";
    emptyAlt.textContent = "-- None --";
    dom.altCust.appendChild(emptyAlt);
    for (const c of meta.allCustomers) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      dom.altCust.appendChild(opt);
    }

    // Currencies
    dom.curr.innerHTML = "";
    for (const cu of meta.currencies) {
      const opt = document.createElement("option");
      opt.value = cu.id;
      opt.textContent = cu.name;
      dom.curr.appendChild(opt);
    }
    const rOpt = meta.currencies.find(c => c.name.toUpperCase().includes("RUPEE"));
    if (rOpt) dom.curr.value = rOpt.id;
  }

  let factoryState = "29";
  let gstStates = [];

  async function loadGstStates() {
    if (gstStates.length || !dom.posState) return;
    try {
      const res = await fetch("/api/gst/states");
      const d = await res.json();
      if (d.ok && Array.isArray(d.states)) {
        gstStates = d.states;
        dom.posState.replaceChildren();
        for (const s of gstStates) {
          const opt = document.createElement("option");
          opt.value = s.code;
          opt.textContent = `${s.code} - ${s.name}`;
          dom.posState.append(opt);
        }
        dom.posState.value = "29";
      }
    } catch (e) {
      console.warn("Failed to load GST states", e);
    }
  }

  function recalcTotals() {
    let basic = 0;
    for (const l of lines) {
      const q = Number(l.qty || 0);
      const r = Number(l.rate || 0);
      const d = Number(l.discount || 0);
      const amt = (q * r) * (1 - (d / 100));
      l.amount = Number(amt.toFixed(2));
      basic += l.amount;
    }

    const pfPerc = Number(dom.pfPerc.value || 0);
    const pfRs = Number(dom.pfRs.value || 0);
    const pfAmt = pfPerc > 0 ? (basic * pfPerc / 100) : pfRs;
    const otherChrg = Number(dom.otherChrg.value || 0);

    const taxableBase = Math.round((basic + pfAmt) * 100) / 100;
    const posState = dom.posState ? (dom.posState.value || "29") : "29";
    const isIntraState = (posState === factoryState);

    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;

    if (isIntraState) {
      if (dom.supplyNature) dom.supplyNature.textContent = `Intra-State Supply (State ${posState}: CGST 9% + SGST 9%)`;
      if (dom.cgstSgstRow) dom.cgstSgstRow.style.display = "flex";
      if (dom.igstRow) dom.igstRow.style.display = "none";
      cgstAmt = Math.round(taxableBase * 9) / 100;
      sgstAmt = Math.round(taxableBase * 9) / 100;
    } else {
      if (dom.supplyNature) dom.supplyNature.textContent = `Inter-State Supply (State ${posState}: IGST 18%)`;
      if (dom.cgstSgstRow) dom.cgstSgstRow.style.display = "none";
      if (dom.igstRow) dom.igstRow.style.display = "flex";
      igstAmt = Math.round(taxableBase * 18) / 100;
    }

    const totalGst = Math.round((cgstAmt + sgstAmt + igstAmt) * 100) / 100;
    const rawTotal = taxableBase + totalGst + otherChrg;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

    if (dom.taxableAmt) dom.taxableAmt.value = fmt2(taxableBase);
    if (dom.cgstAmt) dom.cgstAmt.value = fmt2(cgstAmt);
    if (dom.sgstAmt) dom.sgstAmt.value = fmt2(sgstAmt);
    if (dom.igstAmt) dom.igstAmt.value = fmt2(igstAmt);
    if (dom.totGst) dom.totGst.value = fmt2(totalGst);
    if (dom.roundOff) dom.roundOff.value = fmt2(roundOff);
    dom.totVal.value = fmt2(grandTotal);
  }

  function renderLines() {
    dom.gridBody.innerHTML = "";
    if (lines.length === 0) {
      dom.lblItem.textContent = "";
      dom.lblUom.textContent = "";
      return;
    }

    lines.forEach((l, idx) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td>${escapeHtml(l.code ? (l.code + ' - ' + l.name) : l.name)}</td>
        <td style="text-align: right;">${fmt2(l.qty)}</td>
        <td><input type="number" step="0.01" class="invmfg-line-rate" value="${fmt2(l.rate)}" ${mode !== 'new' ? 'readonly' : ''}></td>
        <td><input type="number" step="0.01" class="invmfg-line-disc" value="${fmt2(l.discount)}" ${mode !== 'new' ? 'readonly' : ''}></td>
        <td style="text-align: right; font-weight: bold;" class="invmfg-line-amt">${fmt2(l.amount)}</td>
      `;

      tr.addEventListener("click", () => {
        document.querySelectorAll("#invmfg-grid-body tr").forEach(r => r.classList.remove("selected"));
        tr.classList.add("selected");
        dom.lblItem.textContent = l.code ? (l.code + ' - ' + l.name) : l.name;
        dom.lblUom.textContent = l.uom || "";
      });

      const inpRate = tr.querySelector(".invmfg-line-rate");
      const inpDisc = tr.querySelector(".invmfg-line-disc");
      const tdAmt = tr.querySelector(".invmfg-line-amt");

      inpRate.addEventListener("input", () => {
        l.rate = Number(inpRate.value || 0);
        const q = Number(l.qty || 0);
        const d = Number(l.discount || 0);
        l.amount = Number(((q * l.rate) * (1 - d / 100)).toFixed(2));
        tdAmt.textContent = fmt2(l.amount);
        recalcTotals();
      });

      inpDisc.addEventListener("input", () => {
        l.discount = Number(inpDisc.value || 0);
        const q = Number(l.qty || 0);
        const r = Number(l.rate || 0);
        l.amount = Number(((q * r) * (1 - l.discount / 100)).toFixed(2));
        tdAmt.textContent = fmt2(l.amount);
        recalcTotals();
      });

      dom.gridBody.appendChild(tr);
    });

    if (lines.length > 0) {
      dom.lblItem.textContent = lines[0].code ? (lines[0].code + ' - ' + lines[0].name) : lines[0].name;
      dom.lblUom.textContent = lines[0].uom || "";
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function renderNote(note) {
    currentNote = note;
    if (!note) {
      dom.cust.value = "";
      dom.altCust.value = "";
      dom.dcs.innerHTML = "";
      dom.rem.value = "";
      dom.no.value = meta.nextNo || "1";
      const now = new Date();
      dom.date.value = now.toISOString().slice(0, 10);
      dom.time.value = now.toTimeString().slice(0, 5);
      dom.payterm.value = "";
      dom.pfPerc.value = "";
      dom.pfRs.value = "";
      dom.otherChrg.value = "";
      dom.totVal.value = "0.00";
      const rOpt = meta.currencies.find(c => c.name.toUpperCase().includes("RUPEE"));
      if (rOpt) dom.curr.value = rOpt.id;
      lines = [];
      renderLines();
      setMode("view");
      updateCorresButton(0, 0);
      return;
    }

    dom.cust.value = note.custId || "";
    dom.altCust.value = note.altCustId || "";

    dom.dcs.innerHTML = "";
    if (note.dcNos && note.dcNos.length) {
      note.dcNos.forEach((no, idx) => {
        const opt = document.createElement("option");
        opt.value = note.dcInvIds ? note.dcInvIds[idx] : idx;
        opt.textContent = no;
        opt.selected = true;
        dom.dcs.appendChild(opt);
      });
    }

    dom.rem.value = note.invRem || "";
    dom.no.value = note.invNo || "";
    dom.date.value = note.invDate || "";
    if (note.invDateT && note.invDateT.includes("T")) {
      dom.time.value = note.invDateT.split("T")[1].slice(0, 5);
    }

    dom.payterm.value = note.payTerm || "";
    dom.pfPerc.value = note.packForwd ? String(note.packForwd) : "";
    dom.pfRs.value = note.packForwardInRs ? String(note.packForwardInRs) : "";
    dom.otherChrg.value = note.anyOtherChrg ? String(note.anyOtherChrg) : "";
    dom.totVal.value = fmt2(note.totVal || 0);
    dom.curr.value = note.currId || 1;

    if (dom.posState) dom.posState.value = note.posState || "29";

    lines = (note.lines || []).map(l => ({ ...l }));
    renderLines();
    setMode("view");
    refreshCorresCount(note.invNo);
  }

  async function refreshCorresCount(invNo) {
    if (!invNo) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=${encodeURIComponent("Invoice")}&ref=${encodeURIComponent(invNo)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    dom.btnCorres.textContent = `Correspondences (${curr}/${tot})`;
  }

  async function fetchBundle(invNo, isNew) {
    const q = isNew ? "?new=1" : (invNo ? `?invNo=${encodeURIComponent(invNo)}` : "");
    const data = await apiGet(`/api/invoice-mfg${q}`);
    if (data.error && isNew) {
      alert(data.error);
      return false;
    }

    meta.customers = data.customers || [];
    meta.allCustomers = data.allCustomers || [];
    meta.currencies = data.currencies || [];
    meta.ids = data.ids || [];
    meta.nextNo = data.nextNo || "1";
    if (data.factoryState) factoryState = data.factoryState;
    await loadGstStates();

    populateDropdowns();

    if (isNew) {
      currentNote = null;
      dom.cust.value = "";
      dom.altCust.value = "";
      dom.dcs.innerHTML = "";
      dom.rem.value = "";
      dom.no.value = meta.nextNo;
      const now = new Date();
      dom.date.value = now.toISOString().slice(0, 10);
      dom.time.value = now.toTimeString().slice(0, 5);
      dom.payterm.value = "";
      dom.pfPerc.value = "";
      dom.pfRs.value = "";
      dom.otherChrg.value = "";
      dom.totVal.value = "0.00";
      const rOpt = meta.currencies.find(c => c.name.toUpperCase().includes("RUPEE"));
      if (rOpt) dom.curr.value = rOpt.id;
      lines = [];
      renderLines();
      setMode("new");
      updateCorresButton(0, 0);
      return true;
    } else {
      if (data.note) {
        renderNote(data.note);
      } else if (meta.ids.length > 0) {
        await fetchBundle(meta.ids[meta.ids.length - 1], false);
      } else {
        renderNote(null);
      }
      return true;
    }
  }

  // Event Handlers
  dom.cust.addEventListener("change", async () => {
    if (mode !== "new") return;
    const custId = Number(dom.cust.value || 0);
    dom.dcs.innerHTML = "";
    lines = [];
    renderLines();
    if (!custId) {
      recalcTotals();
      return;
    }

    const cObj = (meta.customers || []).find(c => c.id === custId) || (meta.allCustomers || []).find(c => c.id === custId);
    if (cObj && cObj.stateCode && dom.posState) {
      dom.posState.value = cObj.stateCode;
    }
    recalcTotals();

    try {
      const res = await apiGet(`/api/invoice-mfg/customer-dcs?custId=${custId}`);
      for (const d of res.dcs) {
        const opt = document.createElement("option");
        opt.value = d.dcInvId;
        opt.textContent = `${d.dcNo} (${d.dcDate}) - Qty: ${d.totQty}`;
        dom.dcs.appendChild(opt);
      }
      if (res.defaults) {
        const def = res.defaults;
        if (def.packforwd) dom.pfPerc.value = String(def.packforwd);
        if (def.packforwardinrs) dom.pfRs.value = String(def.packforwardinrs);
        if (def.payterm) dom.payterm.value = def.payterm;
        if (def.currid) dom.curr.value = def.currid;
      }
    } catch (err) {
      console.error("Failed to load customer DCs:", err);
    }
  });

  dom.dcs.addEventListener("change", async () => {
    if (mode !== "new") return;
    const selectedIds = Array.from(dom.dcs.selectedOptions).map(o => o.value).filter(Boolean);
    if (selectedIds.length === 0) {
      lines = [];
      renderLines();
      recalcTotals();
      return;
    }

    try {
      const res = await apiGet(`/api/invoice-mfg/dc-lines?dcIds=${selectedIds.join(',')}`);
      lines = (res.lines || []).map(l => ({ ...l }));
      renderLines();
      recalcTotals();
    } catch (err) {
      console.error("Failed to load DC lines:", err);
    }
  });

  // Recalc on tax changes
  [
    dom.pfPerc, dom.pfRs, dom.excise, dom.cessEd, dom.highCessEd,
    dom.cst, dom.vat, dom.surchrg, dom.otherChrg
  ].forEach(inp => {
    if (inp) inp.addEventListener("input", recalcTotals);
  });

  if (dom.posState) dom.posState.addEventListener("change", recalcTotals);

  // Toolbar Actions
  dom.btnNew.addEventListener("click", async () => {
    await fetchBundle(null, true);
  });

  dom.btnSave.addEventListener("click", async () => {
    const custId = Number(dom.cust.value || 0);
    if (!custId) {
      alert("Select a customer Name.....");
      dom.cust.focus();
      return;
    }

    const invNo = dom.no.value.trim();
    if (!invNo) {
      alert("Enter the Invoice Number .....");
      dom.no.focus();
      return;
    }

    const currId = Number(dom.curr.value || 0);
    if (!currId) {
      alert("Please Select an existing Currency Name....");
      dom.curr.focus();
      return;
    }

    const dcIds = Array.from(dom.dcs.selectedOptions).map(o => Number(o.value)).filter(Boolean);
    if (dcIds.length === 0) {
      alert("Select atleast a DC..... ");
      dom.dcs.focus();
      return;
    }

    recalcTotals();
    const totVal = Number(dom.totVal.value || 0);
    if (!(totVal > 0)) {
      alert("Enter a Valid  Invoice Value .....");
      return;
    }

    if (!confirm("Are You Sure To Save ?")) return;

    const payload = {
      isNew: (mode === "new"),
      custId,
      altCustId: Number(dom.altCust.value || 0) || null,
      invNo,
      invDate: dom.date.value,
      invTime: dom.time.value,
      dcIds,
      payTerm: dom.payterm.value.trim(),
      packForwd: Number(dom.pfPerc.value || 0),
      packForwardInRs: Number(dom.pfRs.value || 0),
      excise: 0,
      cessOnED: 0,
      highCessOnED: 0,
      cst: 0,
      isFormC: false,
      surcharge: 0,
      isForm37: false,
      vat: 0,
      isFormH: false,
      otherCharges: Number(dom.otherChrg.value || 0),
      totVal,
      currId,
      todayVal: 1.0,
      invRem: dom.rem.value.trim(),
      taxRegime: "GST",
      posState: dom.posState ? (dom.posState.value || "29") : "29",
      taxableAmt: Number(dom.taxableAmt ? dom.taxableAmt.value : 0) || 0,
      cgstRate: ((dom.posState ? dom.posState.value : "29") === factoryState) ? 9 : 0,
      cgstAmt: Number(dom.cgstAmt ? dom.cgstAmt.value : 0) || 0,
      sgstRate: ((dom.posState ? dom.posState.value : "29") === factoryState) ? 9 : 0,
      sgstAmt: Number(dom.sgstAmt ? dom.sgstAmt.value : 0) || 0,
      igstRate: ((dom.posState ? dom.posState.value : "29") !== factoryState) ? 18 : 0,
      igstAmt: Number(dom.igstAmt ? dom.igstAmt.value : 0) || 0,
      totalGst: Number(dom.totGst ? dom.totGst.value : 0) || 0,
      roundOff: Number(dom.roundOff ? dom.roundOff.value : 0) || 0,
      lines: lines.map(l => ({
        dcInvId: l.dcInvId,
        subSlNo: l.subSlNo,
        rate: Number(l.rate || 0),
        discount: Number(l.discount || 0),
        amount: Number(l.amount || 0)
      }))
    };

    const res = await apiPost("/api/invoice-mfg/save", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Record Stored successfully .");
    await fetchBundle(res.invNo || invNo, false);
  });

  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote) return;
    if (!confirm("Are You Sure To DELETE this INVOICE ? ")) return;

    const res = await apiPost("/api/invoice-mfg/delete", { invNo: currentNote.invNo });
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Records Deleted");
    await fetchBundle(null, false);
  });

  // Navigation
  function getCurrentIndex() {
    if (!currentNote) return -1;
    return meta.ids.indexOf(currentNote.invNo);
  }

  dom.btnFirst.addEventListener("click", async () => {
    if (meta.ids.length > 0) await fetchBundle(meta.ids[0], false);
  });

  dom.btnPrev.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx > 0) await fetchBundle(meta.ids[idx - 1], false);
  });

  dom.btnNext.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < meta.ids.length - 1) await fetchBundle(meta.ids[idx + 1], false);
  });

  dom.btnLast.addEventListener("click", async () => {
    if (meta.ids.length > 0) await fetchBundle(meta.ids[meta.ids.length - 1], false);
  });

  dom.btnFind.addEventListener("click", async () => {
    const query = dom.searchNo.value.trim();
    if (!query) {
      alert("Enter the Invoice Number to search.");
      return;
    }
    await fetchBundle(query, false);
  });

  // Number to Words and Format Helpers
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function pairWords(value) {
    const number = Number(value) || 0;
    if (number < 10) return ones[number];
    if (number < 20) return teens[number - 10];
    const ten = tens[Math.floor(number / 10)];
    const one = ones[number % 10];
    return one ? `${ten} ${one}` : ten;
  }

  function moneyToWords(value) {
    let number = Math.floor(Math.abs(Number(value) || 0));
    if (!number) return "";
    const scales = [[10000000, " CRORE, "], [100000, " LAKH, "], [1000, " THOUSAND, "]];
    let text = "";
    scales.forEach(([size, label]) => {
      const count = Math.floor(number / size);
      if (!count) return;
      text += `${pairWords(count)}${label}`;
      number %= size;
    });
    const hundred = Math.floor(number / 100);
    if (hundred) text += `${ones[hundred]} HUNDRED, `;
    if (number % 100) text += pairWords(number % 100);
    return text.replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
  }

  function rupeesInWords(total, currName = "RUPEES") {
    const number = Number(total) || 0;
    const whole = Math.floor(Math.abs(number));
    const paise = Math.round((Math.abs(number) - whole) * 100);
    const words = moneyToWords(whole);
    const coins = paise ? ` AND PAISE ${moneyToWords(paise)}` : "";
    return `${currName.toUpperCase()} ${words || "ZERO"}${coins} ONLY`.replace(/\s+/g, " ").toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function splitCompanyHead(headStr) {
    return String(headStr || "")
      .split(/\r\n|\n|\r/)
      .map(s => s.replace(/^[\*\-\#]\s*/, '').trim())
      .filter(Boolean);
  }

  function getCurrencyName(currId) {
    const c = meta.currencies.find(cu => cu.id === currId || cu.curr_id === currId);
    return c ? (c.name || c.curr_name || "Rupees") : "Rupees";
  }

  function openPrintPreview(title, html) {
    const modal = document.getElementById("print-preview-modal");
    const titleEl = document.getElementById("print-preview-title");
    const sheet = document.getElementById("print-preview-sheet");
    const btnPrint = document.getElementById("print-preview-btn-print");
    const btnClose = document.getElementById("print-preview-btn-close");
    const btnX = document.getElementById("print-preview-btn-x");

    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      document.body.appendChild(root);
    }
    root.innerHTML = html;

    if (modal && sheet) {
      if (titleEl) titleEl.textContent = title || "Print Preview";
      sheet.innerHTML = html;
      modal.hidden = false;

      btnPrint.onclick = () => {
        window.print();
      };
      const close = () => {
        modal.hidden = true;
      };
      btnClose.onclick = close;
      btnX.onclick = close;
    } else {
      window.print();
    }
  }

  window.openPrintPreview = openPrintPreview;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("print-preview-modal");
      if (modal && !modal.hidden) modal.hidden = true;
    }
  });

  function printTaxInvoice(note, comp) {
    const headLines = splitCompanyHead(comp.head);
    const compName = headLines[0] || "SMART ENTERPRISES";
    const compAddr = headLines.slice(1).join("<br>");
    const currName = getCurrencyName(note.currId);

    const basicSum = (note.lines || []).reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const pfPerc = Number(note.packForwd || 0);
    const pfRs = Number(note.packForwardInRs || 0);
    const pfAmt = pfPerc > 0 ? (basicSum * pfPerc / 100) : pfRs;
    const assessable = basicSum + pfAmt;

    const isInter = (note.posState && note.posState !== factoryState) || (note.igstAmt > 0);
    const posState = note.posState || "29";
    const taxableAmt = note.taxableAmt != null ? Number(note.taxableAmt) : assessable;
    const cgstAmt = note.cgstAmt != null ? Number(note.cgstAmt) : (!isInter ? Math.round(taxableAmt * 9) / 100 : 0);
    const sgstAmt = note.sgstAmt != null ? Number(note.sgstAmt) : (!isInter ? Math.round(taxableAmt * 9) / 100 : 0);
    const igstAmt = note.igstAmt != null ? Number(note.igstAmt) : (isInter ? Math.round(taxableAmt * 18) / 100 : 0);
    const totalGst = note.totalGst != null ? Number(note.totalGst) : (cgstAmt + sgstAmt + igstAmt);
    const roundOff = Number(note.roundOff || 0);
    const otherChrg = Number(note.anyOtherChrg || 0);
    const grandTotal = note.totVal || Math.round(taxableAmt + totalGst + otherChrg);

    const dcNosStr = (note.dcNos && note.dcNos.length) ? note.dcNos.join(", ") : "-";
    const dcDatesStr = (note.dcDates && note.dcDates.length) ? note.dcDates.map(formatDate).join(", ") : "-";

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 4px;">
        <div style="text-align: center; border: 2px solid #000; border-bottom: none; padding: 6px; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">TAX INVOICE</div>
          <div style="font-size: 10px; font-style: italic;">(Issued under Section 31 of CGST Act, 2017 &amp; State/UT GST Rules)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-size: 14px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
              <div style="margin-top: 3px; line-height: 1.3;">${compAddr}</div>
              <div style="margin-top: 6px; font-size: 10px;">
                <b>GSTIN / UIN:</b> ${escapeHtml(comp.gstin || "29AABCB1234F1Z5")}<br>
                <b>State:</b> Karnataka &nbsp;&nbsp; <b>State Code:</b> 29<br>
                ${comp.pan ? `<b>PAN:</b> ${escapeHtml(comp.pan)}&nbsp;&nbsp;` : ''}
              </div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="width: 45%; font-weight: bold; padding: 2px;">Invoice No:</td><td style="padding: 2px; font-weight: bold; font-size: 13px;">${escapeHtml(note.invNo)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Invoice Date:</td><td style="padding: 2px;">${formatDate(note.invDate)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Place of Supply (POS):</td><td style="padding: 2px; font-weight: bold;">State Code ${escapeHtml(posState)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Time of Removal:</td><td style="padding: 2px;">${escapeHtml(note.invDateT ? note.invDateT.slice(11, 16) : '')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">D.C. No(s) &amp; Date:</td><td style="padding: 2px;">${escapeHtml(dcNosStr)} (${escapeHtml(dcDatesStr)})</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Buyer's P.O. No &amp; Dt:</td><td style="padding: 2px;">${escapeHtml(note.poNo || '-')} ${note.poDate ? '(' + formatDate(note.poDate) + ')' : ''}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Payment Terms:</td><td style="padding: 2px;">${escapeHtml(note.payTerm || '-')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Mode of Transport:</td><td style="padding: 2px;">${escapeHtml(note.transport || '-')} ${note.vehicleNo ? '(' + escapeHtml(note.vehicleNo) + ')' : ''}</td></tr>
              </table>
            </td>
          </tr>
          <tr style="border-top: 1px solid #000;">
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Consignee (Ship To):</div>
              <div style="font-weight: bold;">${escapeHtml(note.custName)}</div>
              <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.custAddr)}</div>
              <div><b>GSTIN / UIN:</b> ${escapeHtml(note.custGstin || note.gstin || "29AABCB1234F1Z5")}</div>
              ${note.vendCode ? `<div><b>Vendor Code:</b> ${escapeHtml(note.vendCode)}</div>` : ''}
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Buyer (if other than Consignee):</div>
              ${note.altCustName ? `
                <div style="font-weight: bold;">${escapeHtml(note.altCustName)}</div>
                <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.altCustAddr)}</div>
              ` : `
                <div style="color: #555; font-style: italic;">Same as Consignee</div>
              `}
              ${note.areNo ? `
                <div style="margin-top: 6px; padding: 4px; border: 1px dashed #666; background: #f9f9f9;">
                  <b>${escapeHtml(note.areType || 'ARE-1')}:</b> ${escapeHtml(note.areNo)} &nbsp; <b>Dt:</b> ${formatDate(note.areDate)}
                  ${note.d3SalesNo ? `<br><b>D-3 Sales No:</b> ${escapeHtml(note.d3SalesNo)} &nbsp; <b>Dt:</b> ${formatDate(note.d3SalesDate)}` : ''}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>

        <!-- Lines Table -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e8e8e8; border-bottom: 1px solid #000;">
              <th style="width: 35px; border-right: 1px solid #000; padding: 4px; text-align: center;">Sl.</th>
              <th style="border-right: 1px solid #000; padding: 4px; text-align: left;">Description of Goods / Part No.</th>
              <th style="width: 65px; border-right: 1px solid #000; padding: 4px; text-align: right;">Quantity</th>
              <th style="width: 50px; border-right: 1px solid #000; padding: 4px; text-align: center;">UOM</th>
              <th style="width: 75px; border-right: 1px solid #000; padding: 4px; text-align: right;">Rate (Rs)</th>
              <th style="width: 55px; border-right: 1px solid #000; padding: 4px; text-align: right;">Disc %</th>
              <th style="width: 95px; padding: 4px; text-align: right;">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${(note.lines || []).map((l, i) => `
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border-right: 1px solid #000; padding: 4px;">
                  <b>${escapeHtml(l.code || '')}</b> - ${escapeHtml(l.name || '')}
                  ${l.dcNo ? `<div style="font-size: 9px; color: #555;">(DC: ${escapeHtml(l.dcNo)})</div>` : ''}
                </td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.qty)}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(l.uom || 'Nos')}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.rate)}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.discount)}</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">${fmt2(l.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals & Taxes Breakdown -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 55%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <div style="font-weight: bold; margin-bottom: 4px;">Amount in Words:</div>
              <div style="font-weight: bold; font-size: 12px; color: #000080; margin-bottom: 10px; line-height: 1.3;">
                ${escapeHtml(rupeesInWords(grandTotal, currName))}
              </div>

              ${note.invRem ? `
                <div style="margin-top: 6px; font-size: 10px;">
                  <b>Remarks / Notes:</b> ${escapeHtml(note.invRem)}
                </div>
              ` : ''}

              <div style="margin-top: 14px; padding: 6px; border: 1px solid #999; font-size: 9px; line-height: 1.3; background: #fff;">
                <b>Declaration:</b> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
            </td>
            <td style="width: 45%; padding: 6px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px;">Sub Total (Basic):</td><td style="padding: 2px; text-align: right;">${fmt2(basicSum)}</td></tr>
                ${pfAmt > 0 ? `<tr><td style="padding: 2px;">P &amp; F ${pfPerc > 0 ? '@ ' + pfPerc + '%' : ''}:</td><td style="padding: 2px; text-align: right;">${fmt2(pfAmt)}</td></tr>` : ''}
                <tr style="border-top: 1px dotted #999;"><td style="padding: 2px; font-weight: bold;">Taxable Value:</td><td style="padding: 2px; text-align: right; font-weight: bold;">${fmt2(taxableAmt)}</td></tr>
                ${!isInter ? `
                  <tr><td style="padding: 2px;">CGST @ 9%:</td><td style="padding: 2px; text-align: right;">${fmt2(cgstAmt)}</td></tr>
                  <tr><td style="padding: 2px;">SGST @ 9%:</td><td style="padding: 2px; text-align: right;">${fmt2(sgstAmt)}</td></tr>
                ` : `
                  <tr><td style="padding: 2px;">IGST @ 18%:</td><td style="padding: 2px; text-align: right;">${fmt2(igstAmt)}</td></tr>
                `}
                <tr><td style="padding: 2px; font-weight: bold;">Total GST:</td><td style="padding: 2px; text-align: right; font-weight: bold; color: #006600;">${fmt2(totalGst)}</td></tr>
                ${otherChrg > 0 ? `<tr><td style="padding: 2px;">Other Charges:</td><td style="padding: 2px; text-align: right;">${fmt2(otherChrg)}</td></tr>` : ''}
                ${roundOff !== 0 ? `<tr><td style="padding: 2px;">Round Off:</td><td style="padding: 2px; text-align: right;">${fmt2(roundOff)}</td></tr>` : ''}
                <tr style="border-top: 2px solid #000; font-size: 13px; font-weight: bold; background: #e8e8e8;">
                  <td style="padding: 4px;">Total Invoice Value:</td>
                  <td style="padding: 4px; text-align: right; color: #000080;">Rs. ${fmt2(grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Signatory Footer -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; padding: 8px; vertical-align: bottom;">
              <div style="font-size: 10px; color: #555;">Customer's Acceptance Signature</div>
            </td>
            <td style="width: 50%; padding: 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 35px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold; font-size: 10px;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;
    openPrintPreview(`Print Preview - Tax Invoice (${note.invNo})`, html);
  }

  function printExciseInvoice(note, comp) {
    const headLines = splitCompanyHead(comp.head);
    const compName = headLines[0] || "SMART ENTERPRISES";
    const compAddr = headLines.slice(1).join("<br>");

    const basicSum = (note.lines || []).reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const pfPerc = Number(note.packForwd || 0);
    const pfRs = Number(note.packForwardInRs || 0);
    const pfAmt = pfPerc > 0 ? (basicSum * pfPerc / 100) : pfRs;
    const assessable = basicSum + pfAmt;

    const excisePerc = Number(note.excise || 0);
    const exciseAmt = assessable * excisePerc / 100;
    const cessPerc = Number(note.cessOnED || 0);
    const cessAmt = exciseAmt * cessPerc / 100;
    const highCessPerc = Number(note.highCessOnED || 0);
    const highCessAmt = exciseAmt * highCessPerc / 100;
    const totalDuty = exciseAmt + cessAmt + highCessAmt;

    const dcNosStr = (note.dcNos && note.dcNos.length) ? note.dcNos.join(", ") : "-";

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 4px;">
        <div style="text-align: center; border: 2px solid #000; border-bottom: none; padding: 6px; background: #fafafa;">
          <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">
            INVOICE FOR REMOVAL OF EXCISABLE GOODS FROM A FACTORY OR WAREHOUSE ON PAYMENT OF DUTY
          </div>
          <div style="font-size: 10px; font-weight: bold;">(Rule 11 of Central Excise (No. 2) Rules, 2002)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-size: 13px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
              <div style="margin-top: 3px; line-height: 1.3;">${compAddr}</div>
              <div style="margin-top: 6px; font-size: 10px;">
                <b>Central Excise Reg. No.:</b> ${escapeHtml(comp.ce || '-')}<br>
                <b>Commissionerate:</b> ${escapeHtml(comp.commission || '-')}<br>
                <b>Division:</b> ${escapeHtml(comp.divi || '-')}&nbsp;&nbsp; <b>Range:</b> ${escapeHtml(comp.rng || '-')}
              </div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="width: 50%; font-weight: bold; padding: 2px;">Excise Invoice No:</td><td style="padding: 2px;">${escapeHtml(note.invNo)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Date of Issue:</td><td style="padding: 2px;">${formatDate(note.invDate)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Time of Issue:</td><td style="padding: 2px;">${escapeHtml(note.invDateT ? note.invDateT.slice(11, 16) : '')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Date of Removal:</td><td style="padding: 2px;">${formatDate(note.invDate)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Time of Removal:</td><td style="padding: 2px;">${escapeHtml(note.invDateT ? note.invDateT.slice(11, 16) : '')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Mode of Transport:</td><td style="padding: 2px;">${escapeHtml(note.transport || '-')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Vehicle Regn. No:</td><td style="padding: 2px;">${escapeHtml(note.vehicleNo || '-')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Delivery Challan No:</td><td style="padding: 2px;">${escapeHtml(dcNosStr)}</td></tr>
              </table>
            </td>
          </tr>
          <tr style="border-top: 1px solid #000;">
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Name &amp; Address of Consignee:</div>
              <div style="font-weight: bold;">${escapeHtml(note.custName)}</div>
              <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.custAddr)}</div>
              ${note.custTin ? `<div><b>TIN / ECC No:</b> ${escapeHtml(note.custTin)}</div>` : ''}
              ${note.custCst ? `<div><b>CST No:</b> ${escapeHtml(note.custCst)}</div>` : ''}
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Name &amp; Address of Buyer (if different):</div>
              ${note.altCustName ? `
                <div style="font-weight: bold;">${escapeHtml(note.altCustName)}</div>
                <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.altCustAddr)}</div>
              ` : `
                <div style="color: #555; font-style: italic;">Same as Consignee</div>
              `}
              ${note.areNo ? `
                <div style="margin-top: 6px; padding: 4px; border: 1px dashed #666; font-size: 10px;">
                  <b>Procurement / ARE:</b> ${escapeHtml(note.areType || 'ARE-1')} No: ${escapeHtml(note.areNo)} Dt: ${formatDate(note.areDate)}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>

        <!-- Grid of Excisable Goods -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 10px;">
          <thead>
            <tr style="background: #e8e8e8; border-bottom: 1px solid #000;">
              <th style="width: 30px; border-right: 1px solid #000; padding: 4px; text-align: center;">Sl.</th>
              <th style="border-right: 1px solid #000; padding: 4px; text-align: left;">Description of Excisable Goods</th>
              <th style="width: 70px; border-right: 1px solid #000; padding: 4px; text-align: center;">Chapter / Tariff Head</th>
              <th style="width: 55px; border-right: 1px solid #000; padding: 4px; text-align: right;">Quantity</th>
              <th style="width: 80px; border-right: 1px solid #000; padding: 4px; text-align: right;">Assessable Value (Rs)</th>
              <th style="width: 75px; border-right: 1px solid #000; padding: 4px; text-align: right;">C.E. Duty</th>
              <th style="width: 65px; border-right: 1px solid #000; padding: 4px; text-align: right;">ED Cess</th>
              <th style="width: 65px; border-right: 1px solid #000; padding: 4px; text-align: right;">H.ED Cess</th>
              <th style="width: 85px; padding: 4px; text-align: right;">Total Duty (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${(note.lines || []).map((l, i) => {
              const lineAssessable = Number(l.amount || 0);
              const lineExcise = lineAssessable * excisePerc / 100;
              const lineCess = lineExcise * cessPerc / 100;
              const lineHCess = lineExcise * highCessPerc / 100;
              const lineTotDuty = lineExcise + lineCess + lineHCess;
              return `
                <tr style="border-bottom: 1px dotted #ccc;">
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                  <td style="border-right: 1px solid #000; padding: 4px;"><b>${escapeHtml(l.code || '')}</b> - ${escapeHtml(l.name || '')}</td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">8481.80</td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.qty)} ${escapeHtml(l.uom || '')}</td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(lineAssessable)}</td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(lineExcise)}<br><span style="font-size: 8px;">(${excisePerc}%)</span></td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(lineCess)}<br><span style="font-size: 8px;">(${cessPerc}%)</span></td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(lineHCess)}<br><span style="font-size: 8px;">(${highCessPerc}%)</span></td>
                  <td style="padding: 4px; text-align: right; font-weight: bold;">${fmt2(lineTotDuty)}</td>
                </tr>
              `;
            }).join('')}
            <tr style="background: #f0f0f0; border-top: 1px solid #000; font-weight: bold;">
              <td colspan="4" style="border-right: 1px solid #000; padding: 4px; text-align: right;">Totals:</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(assessable)}</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(exciseAmt)}</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(cessAmt)}</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(highCessAmt)}</td>
              <td style="padding: 4px; text-align: right; color: #000080;">${fmt2(totalDuty)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Excise Certification & Sign -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 60%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <div><b>Total Duty Payable (in words):</b></div>
              <div style="font-weight: bold; color: #000080; margin: 4px 0 8px 0;">${escapeHtml(rupeesInWords(totalDuty))}</div>
              <div><b>Total Invoice Value:</b> Rs. ${fmt2(note.totVal)} (${escapeHtml(rupeesInWords(note.totVal))})</div>
              <div style="margin-top: 8px; font-size: 9px; line-height: 1.3;">
                <b>Certification:</b> Certified that the particulars mentioned above are true and correct and the amount indicated represents the price actually charged by us and there is no flow of additional consideration directly or indirectly from the buyer.
              </div>
            </td>
            <td style="width: 40%; padding: 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 35px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold; font-size: 10px;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;
    openPrintPreview(`Print Preview - Rule 11 Central Excise Invoice (${note.invNo})`, html);
  }

  function printExportInvoice(note, comp) {
    const headLines = splitCompanyHead(comp.head);
    const compName = headLines[0] || "SMART ENTERPRISES";
    const compAddr = headLines.slice(1).join("<br>");
    const currName = getCurrencyName(note.currId);

    const totalQty = (note.lines || []).reduce((acc, l) => acc + Number(l.qty || 0), 0);
    const grandTotal = note.totVal || 0;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 4px;">
        <div style="text-align: center; border: 2px solid #000; border-bottom: none; padding: 6px; background: #fafafa;">
          <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">
            COMMERCIAL / EXPORT INVOICE
          </div>
          <div style="font-size: 10px; font-style: italic;">(Export Under Central Excise Rule 19 / ARE-1 / ARE-3 / EOU Scheme)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Exporter / Manufacturer:</div>
              <div style="font-size: 13px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
              <div style="margin-top: 3px; line-height: 1.3;">${compAddr}</div>
              <div style="margin-top: 6px; font-size: 10px;">
                <b>Country of Origin:</b> INDIA<br>
                ${comp.ce ? `<b>C.E. Reg No:</b> ${escapeHtml(comp.ce)}<br>` : ''}
                ${comp.vat ? `<b>TIN:</b> ${escapeHtml(comp.vat)}` : ''}
              </div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="width: 45%; font-weight: bold; padding: 2px;">Export Invoice No:</td><td style="padding: 2px;">${escapeHtml(note.invNo)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Invoice Date:</td><td style="padding: 2px;">${formatDate(note.invDate)}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Buyer's Order / PO:</td><td style="padding: 2px;">${escapeHtml(note.poNo || '-')} ${note.poDate ? '(' + formatDate(note.poDate) + ')' : ''}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">ARE Type &amp; No:</td><td style="padding: 2px;">${escapeHtml(note.areType || 'ARE-1')} - ${escapeHtml(note.areNo || 'N/A')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">ARE Date:</td><td style="padding: 2px;">${formatDate(note.areDate) || '-'}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Country of Destination:</td><td style="padding: 2px;">${escapeHtml(note.transTo || 'OVERSEAS')}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px;">Terms of Delivery/Pay:</td><td style="padding: 2px;">${escapeHtml(note.payTerm || 'Letter of Credit / TT')}</td></tr>
              </table>
            </td>
          </tr>
          <tr style="border-top: 1px solid #000;">
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Consignee / Importer:</div>
              <div style="font-weight: bold;">${escapeHtml(note.custName)}</div>
              <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.custAddr)}</div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Buyer (if other than Consignee):</div>
              ${note.altCustName ? `
                <div style="font-weight: bold;">${escapeHtml(note.altCustName)}</div>
                <div style="white-space: pre-wrap; line-height: 1.3;">${escapeHtml(note.altCustAddr)}</div>
              ` : `
                <div style="color: #555; font-style: italic;">Same as Consignee</div>
              `}
              ${note.d3SalesNo ? `
                <div style="margin-top: 6px; font-size: 10px;">
                  <b>Annexure D-3 Sales No:</b> ${escapeHtml(note.d3SalesNo)} &nbsp; <b>Dt:</b> ${formatDate(note.d3SalesDate)}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>

        <!-- Item Grid -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e8e8e8; border-bottom: 1px solid #000;">
              <th style="width: 35px; border-right: 1px solid #000; padding: 4px; text-align: center;">Sl.</th>
              <th style="border-right: 1px solid #000; padding: 4px; text-align: left;">Item Code &amp; Description of Goods</th>
              <th style="width: 75px; border-right: 1px solid #000; padding: 4px; text-align: right;">Quantity</th>
              <th style="width: 55px; border-right: 1px solid #000; padding: 4px; text-align: center;">UOM</th>
              <th style="width: 85px; border-right: 1px solid #000; padding: 4px; text-align: right;">Rate (${escapeHtml(currName)})</th>
              <th style="width: 105px; padding: 4px; text-align: right;">Amount (${escapeHtml(currName)})</th>
            </tr>
          </thead>
          <tbody>
            ${(note.lines || []).map((l, i) => `
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border-right: 1px solid #000; padding: 4px;">
                  <b>${escapeHtml(l.code || '')}</b> - ${escapeHtml(l.name || '')}
                </td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.qty)}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(l.uom || 'Nos')}</td>
                <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.rate)}</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">${fmt2(l.amount)}</td>
              </tr>
            `).join('')}
            <tr style="background: #f0f0f0; border-top: 1px solid #000; font-weight: bold;">
              <td colspan="2" style="border-right: 1px solid #000; padding: 4px; text-align: right;">Total Quantity:</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${fmt2(totalQty)}</td>
              <td colspan="2" style="border-right: 1px solid #000; padding: 4px; text-align: right;">Total FOB / Invoice Value:</td>
              <td style="padding: 4px; text-align: right; color: #000080; font-size: 12px;">${escapeHtml(currName)} ${fmt2(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Sign-off & Declaration -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 60%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <div><b>Amount Chargeable in Words:</b></div>
              <div style="font-weight: bold; color: #000080; margin: 4px 0 8px 0; font-size: 12px;">
                ${escapeHtml(rupeesInWords(grandTotal, currName))}
              </div>
              <div style="font-size: 9px; line-height: 1.3; margin-top: 10px;">
                <b>Declaration:</b> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
            </td>
            <td style="width: 40%; padding: 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 35px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold; font-size: 10px;">${escapeHtml(note.areAuthorisedSign || 'Authorised Signatory')}</div>
            </td>
          </tr>
        </table>
      </div>
    `;
    openPrintPreview(`Print Preview - Commercial / Export Invoice (${note.invNo})`, html);
  }

  // EOU Handlers
  dom.btnEou.addEventListener("click", () => {
    if (!currentNote || !currentNote.invNo) {
      alert("No data to Edit EOU Details...");
      return;
    }

    const poList = (currentNote.lines || []).map(l => l.poNo).filter(Boolean);
    const distinctPos = [...new Set(poList)];
    if (distinctPos.length > 1) {
      const ok = confirm("Since More than one P.O. involved in this Invoice, Proforma Invoice is different for each P.O. !!!!\n\nIt is advisable not to proceed further...\n\nAnyhow you want to proceed with adding EOU Details to this Invoice !!!");
      if (!ok) return;
    }

    dom.eouLblInv.textContent = currentNote.invNo;
    dom.eouType.value = currentNote.areType || "ARE-1";
    dom.eouAreNo.value = currentNote.areNo || "";
    dom.eouAreDate.value = currentNote.areDate ? currentNote.areDate.slice(0, 10) : "";
    dom.eouAreSign.value = currentNote.areAuthorisedSign || "";
    dom.eouD3No.value = currentNote.d3SalesNo || "";
    dom.eouD3Date.value = currentNote.d3SalesDate ? currentNote.d3SalesDate.slice(0, 10) : "";
    dom.eouD3Sign.value = currentNote.d3AuthorisedSign || "";

    dom.eouModal.hidden = false;
  });

  const closeEou = () => { dom.eouModal.hidden = true; };
  dom.btnEouClose.addEventListener("click", closeEou);
  dom.btnEouX.addEventListener("click", closeEou);

  dom.btnEouSave.addEventListener("click", async () => {
    if (!currentNote || !currentNote.invNo) return;
    const areNo = dom.eouAreNo.value.trim();
    const d3SalesNo = dom.eouD3No.value.trim();
    if (d3SalesNo && !areNo) {
      alert("With out ARE Number, you cannot store the D3 No. !!!");
      return;
    }

    const payload = {
      invNo: currentNote.invNo,
      areType: dom.eouType.value,
      areNo: areNo,
      areDate: dom.eouAreDate.value || null,
      areAuthorisedSign: dom.eouAreSign.value.trim(),
      d3SalesNo: d3SalesNo,
      d3SalesDate: dom.eouD3Date.value || null,
      d3AuthorisedSign: dom.eouD3Sign.value.trim()
    };

    const res = await apiPost("/api/invoice-mfg/eou", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    Object.assign(currentNote, {
      areType: payload.areType,
      areNo: payload.areNo,
      areDate: payload.areDate,
      areAuthorisedSign: payload.areAuthorisedSign,
      d3SalesNo: payload.d3SalesNo,
      d3SalesDate: payload.d3SalesDate,
      d3AuthorisedSign: payload.d3AuthorisedSign
    });

    alert(res.message || "EOU Details saved successfully.");
    dom.eouModal.hidden = true;
  });

  // Debit Note Dialog (frmDbCrNote)
  let debitMaxAllowed = 0;
  let debitOldBalance = 0;
  let debitOldAmt = 0;

  function updateDebitBalPreview() {
    const entered = parseFloat(dom.dbAmt.value) || 0;
    dom.dbTotal.value = fmt2(entered);
    const newBal = (debitOldBalance + debitOldAmt) - entered;
    dom.dbLblNewBal.textContent = "Rs. " + fmt2(newBal);
    if (newBal < 0) {
      dom.dbLblNewBal.style.color = "#cc0000";
    } else {
      dom.dbLblNewBal.style.color = "#000080";
    }
  }

  dom.dbAmt.addEventListener("input", updateDebitBalPreview);

  const closeDebitModal = () => { dom.debitModal.hidden = true; };
  dom.btnDbClose.addEventListener("click", closeDebitModal);
  dom.btnDbX.addEventListener("click", closeDebitModal);

  dom.btnDebit.addEventListener("click", () => {
    if (!currentNote || !currentNote.invNo) {
      alert("Please save or open an invoice record first.");
      return;
    }
    const custOpt = dom.cust.selectedOptions[0];
    const custName = custOpt ? custOpt.textContent.trim() : (currentNote.custName || "");
    dom.dbLblCust.textContent = custName;
    dom.dbLblInv.textContent = currentNote.invNo;

    debitOldBalance = Number(currentNote.balance != null ? currentNote.balance : currentNote.totVal) || 0;
    debitOldAmt = Number(currentNote.debitAmt || currentNote.debit || 0);
    debitMaxAllowed = Number((debitOldBalance + debitOldAmt).toFixed(2));
    dom.dbLblMax.textContent = fmt2(debitMaxAllowed);

    dom.dbAmt.value = debitOldAmt > 0 ? debitOldAmt.toFixed(2) : "";
    dom.dbTotal.value = fmt2(debitOldAmt);
    dom.dbRem.value = currentNote.debitRem || "";
    dom.btnDbSave.textContent = (debitOldAmt === 0 && !currentNote.debitRem) ? "Save" : "Modify";

    updateDebitBalPreview();
    dom.debitModal.hidden = false;
    dom.dbAmt.focus();
  });

  dom.btnDbSave.addEventListener("click", async () => {
    if (!currentNote || !currentNote.invNo) return;
    const debit = parseFloat(dom.dbAmt.value) || 0;
    if (debit < 0) {
      alert("Debit Amount cannot be negative.");
      return;
    }
    if (debit > debitMaxAllowed) {
      alert("The (Amount + TDS) should not exceed Rs. " + fmt2(debitMaxAllowed));
      dom.dbAmt.value = fmt2(debitMaxAllowed);
      updateDebitBalPreview();
      return;
    }

    const actionText = dom.btnDbSave.textContent.trim().replace("&", "");
    if (!confirm("Are you sure to " + actionText + "?")) return;

    const payload = {
      invNo: currentNote.invNo,
      debit: debit,
      tds: 0,
      debitRem: dom.dbRem.value.trim()
    };

    const res = await apiPost("/api/invoice-mfg/debit-note", payload);
    if (res.error) {
      alert(res.error);
      return;
    }
    alert(res.message || "Debit Note updated successfully.");
    dom.debitModal.hidden = true;
    await fetchBundle(currentNote.invNo, false);
  });

  // Printer Event Listeners
  dom.btnTaxPrint.addEventListener("click", async () => {
    if (!currentNote || !currentNote.invNo) {
      alert("No data to Print...");
      return;
    }
    const comp = await apiGet("/api/print-head");
    if (comp.error) {
      alert(comp.error);
      return;
    }
    printTaxInvoice(currentNote, comp);
  });

  dom.btnExcPrint.addEventListener("click", async () => {
    if (!currentNote || !currentNote.invNo) {
      alert("No data to Print...");
      return;
    }
    const comp = await apiGet("/api/print-head");
    if (comp.error) {
      alert(comp.error);
      return;
    }
    printExciseInvoice(currentNote, comp);
  });

  dom.btnExpPrint.addEventListener("click", async () => {
    if (!currentNote || !currentNote.invNo) {
      alert("You have save the record first, to prepare Export Invoice!!!");
      return;
    }
    const comp = await apiGet("/api/print-head");
    if (comp.error) {
      alert(comp.error);
      return;
    }
    printExportInvoice(currentNote, comp);
  });

  if (dom.btnGstPortal) {
    dom.btnGstPortal.addEventListener("click", () => {
      if (!currentNote || !currentNote.invNo) {
        alert("Please select or save an Invoice first.");
        return;
      }
      if (window.openGstPortalModal) {
        window.openGstPortalModal({
          docType: "mfg",
          docNo: currentNote.invNo,
          docDate: currentNote.invDate,
          custName: currentNote.custName,
          custGstin: currentNote.custGstin,
          posState: currentNote.posState,
          taxableAmt: currentNote.taxableAmt,
          totVal: currentNote.totVal,
          vehicleNo: currentNote.vehicleNo,
          transporter: currentNote.transport
        });
      }
    });
  }

  dom.btnX.addEventListener("click", () => window.closeInvoiceMfg());
  dom.btnClose.addEventListener("click", () => window.closeInvoiceMfg());

  // Window openers
  window.openInvoiceMfg = async function () {
    if (window.closeCompany) window.closeCompany();
    if (window.closeProdn) window.closeProdn();
    if (window.closeScn) window.closeScn();
    if (window.closeAssm) window.closeAssm();
    if (window.closeMat) window.closeMat();
    if (window.closeQuote) window.closeQuote();
    if (window.closeMfgPO) window.closeMfgPO();
    if (window.closeDC) window.closeDC();

    dom.section.hidden = false;
    await fetchBundle(null, false);
    if (!currentNote && meta.ids.length === 0) {
      await fetchBundle(null, true);
    }
  };

  window.closeInvoiceMfg = function () {
    dom.section.hidden = true;
  };
})();
