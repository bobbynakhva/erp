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
    section: document.getElementById("labour-invoice"),
    titlebar: document.querySelector("#labour-invoice .invmfg-titlebar"),
    btnX: document.getElementById("invlab-btn-x"),
    btnClose: document.getElementById("invlab-btn-close"),
    btnCorres: document.getElementById("invlab-btn-corres"),

    // Left panel
    cust: document.getElementById("invlab-cust"),
    altCust: document.getElementById("invlab-alt-cust"),
    dcs: document.getElementById("invlab-dcs"),
    rem: document.getElementById("invlab-rem"),
    btnDebit: document.getElementById("invlab-btn-debit"),

    // Right panel
    no: document.getElementById("invlab-no"),
    date: document.getElementById("invlab-date"),
    time: document.getElementById("invlab-time"),
    payterm: document.getElementById("invlab-payterm"),
    pfPerc: document.getElementById("invlab-pf-perc"),
    pfRs: document.getElementById("invlab-pf-rs"),

    // Modern GST Elements
    regimeGst: document.getElementById("invlab-regime-gst"),
    gstPanel: document.getElementById("invlab-gst-panel"),
    posState: document.getElementById("invlab-pos-state"),
    supplyNature: document.getElementById("invlab-supply-nature"),
    taxableAmt: document.getElementById("invlab-taxable-amt"),
    totGst: document.getElementById("invlab-tot-gst"),
    cgstSgstRow: document.getElementById("invlab-cgst-sgst-row"),
    cgstAmt: document.getElementById("invlab-cgst-amt"),
    sgstAmt: document.getElementById("invlab-sgst-amt"),
    igstRow: document.getElementById("invlab-igst-row"),
    igstAmt: document.getElementById("invlab-igst-amt"),
    roundOff: document.getElementById("invlab-round-off"),

    otherChrg: document.getElementById("invlab-other-chrg"),
    totVal: document.getElementById("invlab-tot-val"),
    curr: document.getElementById("invlab-curr"),

    // Grid
    gridBody: document.getElementById("invlab-grid-body"),

    // Footer
    lblItem: document.getElementById("invlab-item-name"),
    lblUom: document.getElementById("invlab-uom-name"),
    chkPreformat: document.getElementById("invlab-chk-preformat"),
    searchNo: document.getElementById("invlab-search-no"),
    btnFind: document.getElementById("invlab-btn-find"),

    btnTaxPrint: document.getElementById("invlab-btn-tax-print"),
    btnExcPrint: document.getElementById("invlab-btn-exc-print"),
    btnExpPrint: document.getElementById("invlab-btn-exp-print"),
    btnGstPortal: document.getElementById("invlab-btn-gst-portal"),

    btnNew: document.getElementById("invlab-btn-new"),
    btnSave: document.getElementById("invlab-btn-save"),
    btnDelete: document.getElementById("invlab-btn-delete"),
    btnFirst: document.getElementById("invlab-btn-first"),
    btnPrev: document.getElementById("invlab-btn-prev"),
    btnNext: document.getElementById("invlab-btn-next"),
    btnLast: document.getElementById("invlab-btn-last"),
    btnEou: document.getElementById("invlab-btn-eou"),

    // EOU Modal
    eouModal: document.getElementById("invlab-eou-modal"),
    eouLblInv: document.getElementById("invlab-eou-lbl-inv"),
    eouType: document.getElementById("invlab-eou-type"),
    eouAreNo: document.getElementById("invlab-eou-are-no"),
    eouAreDate: document.getElementById("invlab-eou-are-date"),
    eouAreSign: document.getElementById("invlab-eou-are-sign"),
    eouD3No: document.getElementById("invlab-eou-d3-no"),
    eouD3Date: document.getElementById("invlab-eou-d3-date"),
    eouD3Sign: document.getElementById("invlab-eou-d3-sign"),
    btnEouSave: document.getElementById("invlab-eou-btn-save"),
    btnEouClose: document.getElementById("invlab-eou-btn-close"),
    btnEouX: document.getElementById("invlab-eou-btn-x"),

    // Debit Note Modal (frmDbCrNote)
    debitModal: document.getElementById("invlab-debit-modal"),
    dbLblCust: document.getElementById("invlab-db-lbl-cust"),
    dbLblInv: document.getElementById("invlab-db-lbl-inv"),
    dbLblMax: document.getElementById("invlab-db-lbl-max"),
    dbAmt: document.getElementById("invlab-db-amt"),
    dbTds: document.getElementById("invlab-db-tds"),
    dbTotal: document.getElementById("invlab-db-total"),
    dbRem: document.getElementById("invlab-db-rem"),
    dbLblNewBal: document.getElementById("invlab-db-lbl-new-bal"),
    btnDbSave: document.getElementById("invlab-db-btn-save"),
    btnDbClose: document.getElementById("invlab-db-btn-close"),
    btnDbX: document.getElementById("invlab-db-btn-x")
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

  let gstStates = [];
  let factoryState = "29";

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
      console.warn("Failed to load GST states for Labour Invoice", e);
    }
  }

  function setMode(m) {
    mode = m;
    const isEdit = (mode === "new");

    dom.cust.disabled = !isEdit;
    dom.altCust.disabled = !isEdit;
    dom.dcs.disabled = !isEdit;
    dom.rem.disabled = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.disabled = !isEdit;
    dom.time.disabled = !isEdit;
    dom.payterm.disabled = !isEdit;
    dom.pfPerc.disabled = !isEdit;
    dom.pfRs.disabled = !isEdit;

    if (dom.posState) dom.posState.disabled = !isEdit;
    dom.otherChrg.disabled = !isEdit;
    dom.curr.disabled = !isEdit;

    dom.btnSave.disabled = !isEdit;
    dom.btnDelete.disabled = isEdit || !currentNote;
    dom.btnEou.disabled = isEdit || !currentNote;

    dom.btnFirst.disabled = isEdit || meta.ids.length === 0;
    dom.btnPrev.disabled = isEdit || meta.ids.length === 0;
    dom.btnNext.disabled = isEdit || meta.ids.length === 0;
    dom.btnLast.disabled = isEdit || meta.ids.length === 0;

    dom.btnTaxPrint.disabled = isEdit || !currentNote;
    dom.btnExcPrint.disabled = isEdit || !currentNote;
    dom.btnExpPrint.disabled = isEdit || !currentNote;
    if (dom.btnGstPortal) dom.btnGstPortal.disabled = isEdit || !currentNote;
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
    emptyAlt.textContent = "-- Optional Consignee / Party --";
    dom.altCust.appendChild(emptyAlt);
    for (const c of meta.allCustomers) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      dom.altCust.appendChild(opt);
    }

    // Currency
    dom.curr.innerHTML = "";
    for (const cu of meta.currencies) {
      const opt = document.createElement("option");
      opt.value = cu.id;
      opt.textContent = cu.name;
      dom.curr.appendChild(opt);
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
    const taxableBase = Math.round((basic + pfAmt) * 100) / 100;
    const otherChrg = Number(dom.otherChrg.value || 0);

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
        document.querySelectorAll("#invlab-grid-body tr").forEach(r => r.classList.remove("selected"));
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

      if (dom.posState) dom.posState.value = "29";
      if (dom.taxableAmt) dom.taxableAmt.value = "0.00";
      if (dom.cgstAmt) dom.cgstAmt.value = "0.00";
      if (dom.sgstAmt) dom.sgstAmt.value = "0.00";
      if (dom.igstAmt) dom.igstAmt.value = "0.00";
      if (dom.totGst) dom.totGst.value = "0.00";
      if (dom.roundOff) dom.roundOff.value = "0.00";

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

    dom.cust.value = String(note.custId || "");
    dom.altCust.value = String(note.altCustId || "");

    dom.dcs.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = note.dcNos ? `DC: ${note.dcNos}` : `Labour DC Outwards`;
    opt.selected = true;
    dom.dcs.appendChild(opt);

    dom.rem.value = note.invRem || "";
    dom.no.value = note.invNo || "";
    dom.date.value = note.invDate || "";
    if (note.invDateT && note.invDateT.includes("T")) {
      dom.time.value = note.invDateT.split("T")[1].slice(0, 5);
    } else {
      dom.time.value = "12:00";
    }

    dom.payterm.value = note.payTerm || "";
    dom.pfPerc.value = note.packForwd ? String(note.packForwd) : "";
    dom.pfRs.value = note.packForwardInRs ? String(note.packForwardInRs) : "";

    if (dom.posState) dom.posState.value = note.posState || "29";
    if (dom.taxableAmt) dom.taxableAmt.value = fmt2(note.taxableAmt || 0);
    if (dom.cgstAmt) dom.cgstAmt.value = fmt2(note.cgstAmt || 0);
    if (dom.sgstAmt) dom.sgstAmt.value = fmt2(note.sgstAmt || 0);
    if (dom.igstAmt) dom.igstAmt.value = fmt2(note.igstAmt || 0);
    if (dom.totGst) dom.totGst.value = fmt2(note.totalGst || 0);
    if (dom.roundOff) dom.roundOff.value = fmt2(note.roundOff || 0);

    dom.otherChrg.value = note.anyOtherChrg ? String(note.anyOtherChrg) : "";
    dom.totVal.value = fmt2(note.totVal || 0);
    dom.curr.value = String(note.currId || (meta.currencies[0] && meta.currencies[0].id) || 1);

    lines = (note.lines || []).map(l => ({ ...l }));
    renderLines();
    setMode("view");
    loadCorresCount(note.invNo);
  }

  async function loadCorresCount(invNo) {
    if (!invNo) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=Invoice&ref=${encodeURIComponent(invNo)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    dom.btnCorres.textContent = `Correspondences (${curr}/${tot})`;
  }

  async function fetchBundle(invNo, isNew) {
    await loadGstStates();
    const q = isNew ? "?new=1" : (invNo ? `?invNo=${encodeURIComponent(invNo)}` : "");
    const data = await apiGet(`/api/labour-invoice${q}`);
    if (data.error && isNew) {
      alert(data.error);
      return false;
    }

    meta.customers = data.customers || [];
    meta.allCustomers = data.allCustomers || [];
    meta.currencies = data.currencies || [];
    meta.ids = data.ids || [];
    meta.nextNo = data.nextNo || "1";

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

      if (dom.posState) dom.posState.value = "29";
      if (dom.taxableAmt) dom.taxableAmt.value = "0.00";
      if (dom.cgstAmt) dom.cgstAmt.value = "0.00";
      if (dom.sgstAmt) dom.sgstAmt.value = "0.00";
      if (dom.igstAmt) dom.igstAmt.value = "0.00";
      if (dom.totGst) dom.totGst.value = "0.00";
      if (dom.roundOff) dom.roundOff.value = "0.00";

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
    recalcTotals();
    if (!custId) return;

    const cObj = (meta.customers || []).find(c => c.id === custId) || (meta.allCustomers || []).find(c => c.id === custId);
    if (cObj && cObj.stateCode && dom.posState) {
      dom.posState.value = cObj.stateCode;
    }
    recalcTotals();

    try {
      const res = await apiGet(`/api/labour-invoice/customer-dcs?custId=${custId}`);
      for (const d of res.dcs) {
        const opt = document.createElement("option");
        opt.value = d.dcId;
        opt.textContent = `${d.dcNo} (${d.dcDate}) - Qty: ${d.totQty} [PO: ${d.poNo || 'N/A'}]`;
        dom.dcs.appendChild(opt);
      }
      if (res.defaults) {
        const def = res.defaults;
        if (def.packforwd) dom.pfPerc.value = String(def.packforwd);
        if (def.packforwardinrs) dom.pfRs.value = String(def.packforwardinrs);
        if (def.payterm) dom.payterm.value = def.payterm;
        if (def.currid) dom.curr.value = def.currid;
      }
      recalcTotals();
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
      const res = await apiGet(`/api/labour-invoice/dc-lines?dcIds=${selectedIds.join(',')}`);
      lines = (res.lines || []).map(l => ({ ...l }));
      renderLines();
      recalcTotals();
    } catch (err) {
      console.error("Failed to load DC lines:", err);
    }
  });

  // Recalc on tax changes
  [
    dom.pfPerc, dom.pfRs, dom.otherChrg
  ].filter(Boolean).forEach(inp => {
    inp.addEventListener("input", recalcTotals);
  });

  if (dom.posState) {
    dom.posState.addEventListener("change", recalcTotals);
  }

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

      servTax: 0,
      cessOnServTax: 0,
      highCessOnServTax: 0,
      cst: 0,
      vat: 0,
      isFormC: false,
      isForm37: false,
      isFormH: false,
      surcharge: 0,

      otherCharges: Number(dom.otherChrg.value || 0),
      totVal,
      currId,
      todayVal: 1.0,
      invRem: dom.rem.value.trim(),
      lines: lines.map(l => ({
        dcId: l.dcId,
        subSlNo: l.subSlNo,
        rate: Number(l.rate || 0),
        discount: Number(l.discount || 0),
        amount: Number(l.amount || 0)
      }))
    };

    const res = await apiPost("/api/labour-invoice/save", payload);
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

    const res = await apiPost("/api/labour-invoice/delete", { invNo: currentNote.invNo });
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
    const q = dom.searchNo.value.trim();
    if (!q) return;
    await fetchBundle(q, false);
  });

  dom.searchNo.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const q = dom.searchNo.value.trim();
      if (!q) return;
      await fetchBundle(q, false);
    }
  });

  // EOU Modal Handlers
  dom.btnEou.addEventListener("click", () => {
    if (!currentNote) return;
    dom.eouLblInv.textContent = currentNote.invNo;
    dom.eouType.value = currentNote.areType || "ARE-1";
    dom.eouAreNo.value = currentNote.areNo || "";
    dom.eouAreDate.value = currentNote.areDate || "";
    dom.eouAreSign.value = currentNote.areAuthorisedSign || "";
    dom.eouD3No.value = currentNote.d3SalesNo || "";
    dom.eouD3Date.value = currentNote.d3SalesDate || "";
    dom.eouD3Sign.value = currentNote.d3AuthorisedSign || "";
    dom.eouModal.hidden = false;
  });

  dom.btnEouClose.addEventListener("click", () => { dom.eouModal.hidden = true; });
  dom.btnEouX.addEventListener("click", () => { dom.eouModal.hidden = true; });

  dom.btnEouSave.addEventListener("click", async () => {
    if (!currentNote) return;
    const payload = {
      invNo: currentNote.invNo,
      areType: dom.eouType.value,
      areNo: dom.eouAreNo.value.trim(),
      areDate: dom.eouAreDate.value,
      areAuthorisedSign: dom.eouAreSign.value.trim(),
      d3SalesNo: dom.eouD3No.value.trim(),
      d3SalesDate: dom.eouD3Date.value,
      d3AuthorisedSign: dom.eouD3Sign.value.trim()
    };

    const res = await apiPost("/api/labour-invoice/eou", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "EOU Details Stored successfully .");
    dom.eouModal.hidden = true;
    await fetchBundle(currentNote.invNo, false);
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

    const res = await apiPost("/api/labour-invoice/debit-note", payload);
    if (res.error) {
      alert(res.error);
      return;
    }
    alert(res.message || "Debit Note updated successfully.");
    dom.debitModal.hidden = true;
    await fetchBundle(currentNote.invNo, false);
  });

  // Correspondences button
  dom.btnCorres.addEventListener("click", () => {
    if (!currentNote || !currentNote.invNo) {
      alert("Save invoice record first to manage Correspondences.");
      return;
    }
    if (window.openCorres) {
      window.openCorres("Invoice", currentNote.invNo, currentNote.custName || "");
    }
  });

  // Close & X
  function closeWindow() {
    dom.section.hidden = true;
    dom.section.style.display = "none";
  }
  dom.btnClose.addEventListener("click", closeWindow);
  dom.btnX.addEventListener("click", closeWindow);

  // Printers (Tax, Excise, Export)
  function printInvoice(type) {
    if (!currentNote) return;
    const note = currentNote;
    const curSymbol = "Rs.";
    const title = type === "tax" ? "TAX INVOICE (LABOUR / JOB WORK)" : (type === "excise" ? "TAX INVOICE (LABOUR)" : "EXPORT INVOICE (LABOUR)");
    const isInter = (note.posState && note.posState !== factoryState) || (note.igstAmt > 0);

    let html = `
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${escapeHtml(title)}</h2>
          <div style="font-size: 11px; margin-top: 4px;">(Issued under Section 31 of CGST Act, 2017 &amp; State GST Rules - Job Work Services SAC: 9988)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr>
            <td style="width: 50%; vertical-align: top; border: 1px solid #000; padding: 6px;">
              <b>Buyer / Consignee:</b><br>
              <div style="font-size: 13px; font-weight: bold; margin: 2px 0;">${escapeHtml(note.custName)}</div>
              <div>${escapeHtml(note.custAddr || "")}</div>
              <div><b>Contact:</b> ${escapeHtml(note.custContact || "N/A")}</div>
              <div><b>Vendor Code:</b> ${escapeHtml(note.vendCode || "N/A")}</div>
              <div><b>GSTIN / UIN:</b> ${escapeHtml(note.custGstin || note.gstin || "29AABCB1234F1Z5")}</div>
              <div><b>Place of Supply (POS):</b> State Code ${escapeHtml(note.posState || "29")}</div>
              ${note.altCustName ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #666;"><b>Party other than Consignee:</b> ${escapeHtml(note.altCustName)}</div>` : ''}
            </td>
            <td style="width: 50%; vertical-align: top; border: 1px solid #000; padding: 6px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 40%;">Invoice No:</td><td style="font-weight: bold; font-size: 13px;">${escapeHtml(note.invNo)}</td></tr>
                <tr><td>Invoice Date:</td><td>${escapeHtml(note.invDate)} ${escapeHtml(note.invDateT ? note.invDateT.slice(11, 16) : '')}</td></tr>
                <tr><td>Delivery Challan(s):</td><td>${escapeHtml(note.dcNos || "N/A")}</td></tr>
                <tr><td>Cust. PO / WO No:</td><td>${escapeHtml(note.poNo || "N/A")} (Date: ${escapeHtml(note.poDate || "N/A")})</td></tr>
                <tr><td>Payment Terms:</td><td>${escapeHtml(note.payTerm || "Immediate / 30 Days")}</td></tr>
                ${note.areNo ? `<tr><td>ARE / Cert No:</td><td>${escapeHtml(note.areNo)} (${escapeHtml(note.areDate || "")})</td></tr>` : ''}
                ${note.d3SalesNo ? `<tr><td>Annexure D-3 No:</td><td>${escapeHtml(note.d3SalesNo)} (${escapeHtml(note.d3SalesDate || "")})</td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; width: 40px; text-align: center;">Sl.</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left;">Particulars / Process Details</th>
              <th style="border: 1px solid #000; padding: 5px; width: 60px; text-align: center;">SAC Code</th>
              <th style="border: 1px solid #000; padding: 5px; width: 50px; text-align: center;">UOM</th>
              <th style="border: 1px solid #000; padding: 5px; width: 70px; text-align: right;">Qty</th>
              <th style="border: 1px solid #000; padding: 5px; width: 75px; text-align: right;">Rate (${curSymbol})</th>
              <th style="border: 1px solid #000; padding: 5px; width: 60px; text-align: right;">Disc %</th>
              <th style="border: 1px solid #000; padding: 5px; width: 90px; text-align: right;">Amount (${curSymbol})</th>
            </tr>
          </thead>
          <tbody>
            ${(note.lines || []).map((l, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px;">
                  <b>${escapeHtml(l.code)}</b> - ${escapeHtml(l.name)}
                  ${l.dcNo ? `<div style="font-size: 9px; color: #555;">(DC: ${escapeHtml(l.dcNo)})</div>` : ''}
                </td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">9988</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(l.uom || "NOS")}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.qty)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.rate)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.discount)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${fmt2(l.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Summary & GST Breakup -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
          <tr>
            <td style="width: 55%; vertical-align: top; border: 1px solid #000; padding: 8px;">
              <b>Remarks:</b><br>
              <div>${escapeHtml(note.invRem || "Job work carried out on customer raw material as per specifications under GST Rule 55.")}</div>
              <div style="margin-top: 10px; font-size: 10px; color: #444;">
                <b>Declaration:</b> We declare that this invoice shows the actual price of the services described and that all particulars are true and correct under the CGST / SGST / IGST Acts.
              </div>
            </td>
            <td style="width: 45%; vertical-align: top; border: 1px solid #000; padding: 6px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td>Taxable Value:</td><td style="text-align: right; font-weight: bold;">${curSymbol} ${fmt2(note.taxableAmt || note.totVal || 0)}</td></tr>
                ${note.packForwd || note.packForwardInRs ? `<tr><td>P &amp; F:</td><td style="text-align: right;">${fmt2(note.packForwd || note.packForwardInRs)}</td></tr>` : ''}
                ${!isInter ? `
                  <tr><td>CGST (9%):</td><td style="text-align: right;">${curSymbol} ${fmt2(note.cgstAmt || 0)}</td></tr>
                  <tr><td>SGST (9%):</td><td style="text-align: right;">${curSymbol} ${fmt2(note.sgstAmt || 0)}</td></tr>
                ` : `
                  <tr><td>IGST (18%):</td><td style="text-align: right;">${curSymbol} ${fmt2(note.igstAmt || 0)}</td></tr>
                `}
                <tr><td>Total GST:</td><td style="text-align: right; font-weight: bold; color: #006600;">${curSymbol} ${fmt2(note.totalGst || 0)}</td></tr>
                ${note.anyOtherChrg ? `<tr><td>Other Charges:</td><td style="text-align: right;">${fmt2(note.anyOtherChrg)}</td></tr>` : ''}
                ${note.roundOff ? `<tr><td>Round Off:</td><td style="text-align: right;">${fmt2(note.roundOff)}</td></tr>` : ''}
                <tr style="border-top: 2px solid #000; font-size: 13px; font-weight: bold;">
                  <td>Total Invoice Value:</td>
                  <td style="text-align: right; color: #000080;">${curSymbol} ${fmt2(note.totVal || 0)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px;">
          <div>Customer's Signature &amp; Stamp</div>
          <div style="text-align: right;">For <b>SMART-TECH PVT LTD</b><br><br><br>Authorised Signatory</div>
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`${title} (${note.invNo})`, html);
    } else {
      const w = window.open("", "_blank", "width=850,height=900");
      if (!w) {
        alert("Popup blocked. Please allow popups to print invoice.");
        return;
      }
      w.document.open();
      w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(title)} - ${escapeHtml(note.invNo)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 10px; background: #eee; border-bottom: 1px solid #ccc; text-align: right;">
            <button onclick="window.print()" style="padding: 6px 16px; font-weight: bold; cursor: pointer;">Print</button>
            <button onclick="window.close()" style="padding: 6px 16px; cursor: pointer;">Close</button>
          </div>
          ${html}
        </body>
        </html>
      `);
      w.document.close();
    }
  }

  dom.btnTaxPrint.addEventListener("click", () => printInvoice("tax"));
  dom.btnExcPrint.addEventListener("click", () => printInvoice("excise"));
  dom.btnExpPrint.addEventListener("click", () => printInvoice("export"));

  if (dom.btnGstPortal) {
    dom.btnGstPortal.addEventListener("click", () => {
      if (!currentNote || !currentNote.invNo) {
        alert("Please select or save a Labour Invoice first.");
        return;
      }
      if (window.openGstPortalModal) {
        window.openGstPortalModal({
          docType: "labour",
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

  // Global exports for app.js
  window.openLabourInvoice = async () => {
    document.querySelectorAll(".invmfg-window, .mfgpo-window, .content-section").forEach((el) => {
      el.hidden = true;
    });
    dom.section.hidden = false;
    dom.section.style.display = "flex";
    try {
      await fetchBundle(null, false);
    } catch (err) {
      console.error("openLabourInvoice fetchBundle error:", err);
    }
  };

  window.closeLabourInvoice = () => {
    dom.section.hidden = true;
    dom.section.style.display = "none";
  };
})();
