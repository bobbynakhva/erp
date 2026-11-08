// SMART-ERP: Sub Contract Goods Received Note (Inwards) Controller
// VB6 Form: frmDCSubConIn

(function () {
  let dom = {};
  let state = {
    isNew: true,
    currentId: 0,
    ids: [],
    stores: [],
    defaultStoreId: null,
    costCenters: [],
    openSuppliers: [],
    allSuppliers: [],
    items: [],
    supplierPos: [],
    supplierRefDcs: [],
    supplierExpectedItems: [],
    lines: [],
    postProcess: {
      rejRem: "",
      lines: []
    }
  };

  function init() {
    dom = {
      section: document.getElementById("subcon-dc-in"),
      closeBtn: document.getElementById("subcondcin-btn-close"),
      xBtn: document.getElementById("subcondcin-btn-x"),
      corresBtn: document.getElementById("subcondcin-btn-corres"),

      // Header fields
      dcId: document.getElementById("subcondcin-dcid"),
      grnDate: document.getElementById("subcondcin-grndate"),
      supp: document.getElementById("subcondcin-supp"),
      store: document.getElementById("subcondcin-store"),
      costCntr: document.getElementById("subcondcin-costcntr"),
      costCntrId: document.getElementById("subcondcin-costcntrid"),
      transport: document.getElementById("subcondcin-transport"),
      vehicleNo: document.getElementById("subcondcin-vehicleno"),
      transFrom: document.getElementById("subcondcin-transfrom"),
      transTo: document.getElementById("subcondcin-transto"),

      // DC fields
      dcNo: document.getElementById("subcondcin-dcno"),
      dcDate: document.getElementById("subcondcin-dcdate"),
      poNo: document.getElementById("subcondcin-pono"),
      poDate: document.getElementById("subcondcin-podate"),
      refDcNo: document.getElementById("subcondcin-refdcno"),
      refDcDate: document.getElementById("subcondcin-refdcdate"),
      dcSigned: document.getElementById("subcondcin-dcsigned"),
      dcRem: document.getElementById("subcondcin-dcrem"),
      btnPostProcess: document.getElementById("subcondcin-btn-postprocess"),

      // Table & Line items
      table: document.getElementById("subcondcin-table"),
      tbody: document.getElementById("subcondcin-tbody"),
      btnAddRow: document.getElementById("subcondcin-btn-add-row"),
      itemInfo: document.getElementById("subcondcin-item-info"),
      totalSummary: document.getElementById("subcondcin-total-summary"),

      // Navigation & Search
      btnAdvSrch: document.getElementById("subcondcin-btn-advsrch"),
      txtGo: document.getElementById("subcondcin-txt-go"),
      btnGo: document.getElementById("subcondcin-btn-go"),
      btnFirst: document.getElementById("subcondcin-btn-first"),
      btnPrev: document.getElementById("subcondcin-btn-prev"),
      btnNext: document.getElementById("subcondcin-btn-next"),
      btnLast: document.getElementById("subcondcin-btn-last"),

      // Action Buttons
      btnNew: document.getElementById("subcondcin-btn-new"),
      btnSave: document.getElementById("subcondcin-btn-save"),
      btnModify: document.getElementById("subcondcin-btn-modify"),
      btnDelete: document.getElementById("subcondcin-btn-delete"),
      btnPrint: document.getElementById("subcondcin-btn-print"),

      // Post process modal
      modalPostProcess: document.getElementById("subcondcin-modal-postprocess"),
      postProcessRejRem: document.getElementById("subcondcin-postprocess-rejrem"),
      postProcessTbody: document.getElementById("subcondcin-postprocess-tbody"),
      postProcessOk: document.getElementById("subcondcin-postprocess-ok"),
      postProcessCancel: document.getElementById("subcondcin-postprocess-cancel"),
      postProcessCloseX: document.getElementById("subcondcin-postprocess-close-x")
    };

    if (!dom.section) return;

    bindEvents();
  }

  function bindEvents() {
    dom.closeBtn?.addEventListener("click", closeWindow);
    dom.xBtn?.addEventListener("click", closeWindow);

    dom.corresBtn?.addEventListener("click", () => {
      if (window.openCorres) {
        window.openCorres("frmDCSubConIn", dom.dcId.value || "NEW");
      }
    });

    dom.supp?.addEventListener("change", onSupplierChange);
    dom.poNo?.addEventListener("change", onPoChange);
    dom.refDcNo?.addEventListener("change", onRefDcChange);

    dom.btnAddRow?.addEventListener("click", () => addLineRow());

    dom.btnNew?.addEventListener("click", () => startNewRecord());
    dom.btnSave?.addEventListener("click", saveRecord);
    dom.btnModify?.addEventListener("click", modifyRecord);
    dom.btnDelete?.addEventListener("click", deleteRecord);
    dom.btnPrint?.addEventListener("click", printRecord);

    dom.btnFirst?.addEventListener("click", () => navigate("first"));
    dom.btnPrev?.addEventListener("click", () => navigate("prev"));
    dom.btnNext?.addEventListener("click", () => navigate("next"));
    dom.btnLast?.addEventListener("click", () => navigate("last"));
    dom.btnGo?.addEventListener("click", searchGo);
    dom.txtGo?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchGo();
    });

    dom.btnPostProcess?.addEventListener("click", openPostProcessModal);
    dom.postProcessOk?.addEventListener("click", confirmPostProcess);
    dom.postProcessCancel?.addEventListener("click", closePostProcessModal);
    dom.postProcessCloseX?.addEventListener("click", closePostProcessModal);

    dom.btnAdvSrch?.addEventListener("click", () => {
      alert("Search Report: Use Search GRN No. or First/Prev/Next/Last controls.");
    });
  }

  window.openSubconDcIn = function (targetId) {
    if (!dom.section) init();
    if (!dom.section) return;
    dom.section.hidden = false;
    dom.section.style.display = "flex";
    loadBundle(targetId || 0);
  };

  window.closeSubconDcIn = function () {
    if (dom.section) {
      dom.section.hidden = true;
      dom.section.style.display = "none";
    }
  };

  function closeWindow() {
    window.closeSubconDcIn();
  }

  async function loadBundle(targetId = 0, forceNew = false) {
    try {
      let url = "/api/subcon-dc-in";
      if (forceNew) {
        url += "?new=1";
      } else if (targetId) {
        url += "?id=" + encodeURIComponent(targetId);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load GRN data");
      const data = await res.json();

      state.stores = data.stores || [];
      state.defaultStoreId = data.defaultStoreId;
      state.costCenters = data.costCenters || [];
      state.openSuppliers = data.openSuppliers || [];
      state.allSuppliers = data.allSuppliers || [];
      state.items = data.items || [];
      state.ids = data.ids || [];

      // Populate stores
      populateStores();

      if (forceNew || (!targetId && !data.record)) {
        renderNewState(data.nextDcid);
      } else if (data.record) {
        renderRecord(data.record);
      } else {
        renderNewState(data.nextDcid);
      }
    } catch (err) {
      console.error("loadBundle error:", err);
      alert("Error loading DC Inwards data: " + err.message);
    }
  }

  function populateStores() {
    if (!dom.store) return;
    dom.store.innerHTML = '<option value="">-- Select Store --</option>';
    state.stores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      dom.store.appendChild(opt);
    });
    if (state.defaultStoreId) {
      dom.store.value = String(state.defaultStoreId);
    }
  }

  function populateSuppliers(selectedId) {
    if (!dom.supp) return;
    dom.supp.innerHTML = '<option value="">-- Select Sub Contractor --</option>';
    // For new records, show open suppliers (or all if none open); for existing, show all
    const list = state.isNew && state.openSuppliers.length > 0 ? state.openSuppliers : state.allSuppliers;
    list.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      dom.supp.appendChild(opt);
    });
    if (selectedId) {
      dom.supp.value = String(selectedId);
    }
  }

  function renderNewState(nextDcid) {
    state.isNew = true;
    state.currentId = 0;
    state.lines = [];
    state.supplierPos = [];
    state.supplierRefDcs = [];
    state.supplierExpectedItems = [];
    state.postProcess = { rejRem: "", lines: [] };

    dom.dcId.value = nextDcid || "";
    const now = new Date();
    dom.grnDate.value = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    populateSuppliers();
    if (state.defaultStoreId) dom.store.value = String(state.defaultStoreId);

    dom.costCntr.value = "";
    dom.costCntrId.value = "";
    dom.transport.value = "";
    dom.vehicleNo.value = "";
    dom.transFrom.value = "";
    dom.transTo.value = "";

    dom.dcNo.value = "";
    dom.dcDate.value = now.toISOString().slice(0, 10);
    dom.poNo.innerHTML = '<option value="">-- Select PO --</option>';
    dom.poDate.value = "";
    dom.refDcNo.innerHTML = '<option value="">-- Select Outward DC --</option>';
    dom.refDcDate.value = "";
    dom.dcSigned.checked = false;
    dom.dcRem.value = "";
    dom.itemInfo.textContent = "";

    dom.btnSave.disabled = false;
    dom.btnModify.disabled = true;
    dom.btnDelete.disabled = true;

    renderLinesTable();
    addLineRow(); // Default with 1 empty row
  }

  async function renderRecord(rec) {
    state.isNew = false;
    state.currentId = rec.dcId;
    state.record = rec;
    state.lines = rec.lines || [];
    state.postProcess = {
      rejRem: rec.rejRem || "",
      lines: (rec.lines || []).map(l => ({
        slNo: l.slNo,
        code: l.code,
        qty: l.qty,
        rejQty: l.rejQty || 0,
        rewQty: l.rewQty || 0,
        rejRowRem: l.rejRowRem || ""
      }))
    };

    dom.dcId.value = rec.dcId || "";
    dom.grnDate.value = rec.grnDate || "";

    populateSuppliers(rec.suppId);
    dom.store.value = rec.storeId ? String(rec.storeId) : "";
    dom.costCntr.value = rec.costCntr || "";
    dom.costCntrId.value = rec.costCntrId ? String(rec.costCntrId) : "";
    dom.transport.value = rec.transport || "";
    dom.vehicleNo.value = rec.vehicleNo || "";
    dom.transFrom.value = rec.transFrom || "";
    dom.transTo.value = rec.transTo || "";

    dom.dcNo.value = rec.dcNo || "";
    dom.dcDate.value = rec.dcDate || "";

    // Load supplier meta so dropdowns are populated
    await loadSupplierMeta(rec.suppId);

    if (rec.poNo) dom.poNo.value = rec.poNo;
    dom.poDate.value = rec.poDate || "";

    if (rec.refDcNo) dom.refDcNo.value = rec.refDcNo;
    dom.refDcDate.value = rec.refDcDate || "";

    dom.dcSigned.checked = Boolean(rec.dcSigned);
    dom.dcRem.value = rec.dcRem || "";

    dom.btnSave.disabled = true;
    dom.btnModify.disabled = false;
    dom.btnDelete.disabled = false;

    renderLinesTable();
  }

  async function onSupplierChange() {
    const suppId = Number(dom.supp.value || 0);
    dom.poNo.innerHTML = '<option value="">-- Select PO --</option>';
    dom.poDate.value = "";
    dom.refDcNo.innerHTML = '<option value="">-- Select Outward DC --</option>';
    dom.refDcDate.value = "";
    dom.costCntr.value = "";
    dom.costCntrId.value = "";

    if (!suppId) {
      state.supplierPos = [];
      state.supplierRefDcs = [];
      state.supplierExpectedItems = [];
      renderLinesTable();
      return;
    }

    await loadSupplierMeta(suppId);
    renderLinesTable();
  }

  async function loadSupplierMeta(suppId) {
    try {
      const res = await fetch("/api/subcon-dc-in/supplier-meta?suppId=" + encodeURIComponent(suppId));
      if (!res.ok) return;
      const data = await res.json();

      state.supplierPos = data.pos || [];
      state.supplierRefDcs = data.refDcs || [];
      state.supplierExpectedItems = data.items || [];

      // Populate PO dropdown
      dom.poNo.innerHTML = '<option value="">-- Select PO --</option>';
      state.supplierPos.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.pono;
        opt.textContent = p.pono + (p.isopenpo ? " (Open PO)" : "");
        dom.poNo.appendChild(opt);
      });

      // Populate Ref DC dropdown
      dom.refDcNo.innerHTML = '<option value="">-- Select Outward DC --</option>';
      state.supplierRefDcs.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.dcno;
        opt.textContent = d.dcno;
        dom.refDcNo.appendChild(opt);
      });
    } catch (e) {
      console.error("loadSupplierMeta error:", e);
    }
  }

  function onPoChange() {
    const selPo = dom.poNo.value;
    const poObj = state.supplierPos.find(p => p.pono === selPo);
    if (poObj) {
      dom.poDate.value = poObj.podate || "";
      if (poObj.isopenpo) {
        alert("This is an Open PO.");
      }
      if (poObj.costcntr && !dom.costCntr.value) {
        dom.costCntr.value = poObj.costcntr;
        dom.costCntrId.value = poObj.costcntrid || "";
      }
    } else {
      dom.poDate.value = "";
    }
    // Refresh line balances
    refreshAllLineBalances();
  }

  function onRefDcChange() {
    const selDc = dom.refDcNo.value;
    const dcObj = state.supplierRefDcs.find(d => d.dcno === selDc);
    if (dcObj) {
      dom.refDcDate.value = dcObj.dcdate || "";
      if (dcObj.costcntr) {
        dom.costCntr.value = dcObj.costcntr;
        dom.costCntrId.value = dcObj.costcntrid || "";
      }
    } else {
      dom.refDcDate.value = "";
    }
    refreshAllLineBalances();
  }

  function getItemOptions() {
    // If supplier expected items exist, prefer them; otherwise all items
    const list = state.supplierExpectedItems.length > 0 ? state.supplierExpectedItems : state.items;
    return list;
  }

  function renderLinesTable() {
    if (!dom.tbody) return;
    dom.tbody.innerHTML = "";

    state.lines.forEach((line, idx) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #c0c0c0";

      // Col 0: Sl.No
      const tdSl = document.createElement("td");
      tdSl.style.padding = "3px 4px";
      tdSl.style.textAlign = "center";
      tdSl.textContent = line.slNo || (idx + 1);
      tr.appendChild(tdSl);

      // Col 1: Item Code / Part No
      const tdCode = document.createElement("td");
      tdCode.style.padding = "2px";
      const selCode = document.createElement("select");
      selCode.style.width = "100%";
      selCode.style.fontSize = "11px";
      selCode.innerHTML = '<option value="">-- Select Item --</option>';

      const opts = getItemOptions();
      opts.forEach(it => {
        const opt = document.createElement("option");
        opt.value = it.id;
        opt.textContent = it.code + " - " + it.name;
        selCode.appendChild(opt);
      });

      if (line.itemId) {
        // Ensure existing item is present even if not in expected list
        if (!opts.find(it => it.id === line.itemId)) {
          const matched = state.items.find(it => it.id === line.itemId);
          if (matched) {
            const opt = document.createElement("option");
            opt.value = matched.id;
            opt.textContent = matched.code + " - " + matched.name;
            selCode.appendChild(opt);
          }
        }
        selCode.value = String(line.itemId);
      }

      selCode.addEventListener("change", (e) => {
        const itId = Number(e.target.value || 0);
        const it = state.items.find(i => i.id === itId);
        line.itemId = itId;
        line.code = it?.code || "";
        line.name = it?.name || "";
        line.measureUnit = it?.measure_unit || "";
        line.rate = it?.rate || 0;

        tdName.textContent = line.name;
        if (it) {
          dom.itemInfo.textContent = `ITEM : ${it.name}    UOM :  ${it.measure_unit || ""}`;
        }
        queryItemBalances(line, tdQtyLeft, tdPoBal);
      });
      tdCode.appendChild(selCode);
      tr.appendChild(tdCode);

      // Col 2: Item Name
      const tdName = document.createElement("td");
      tdName.style.padding = "3px 4px";
      tdName.textContent = line.name || "";
      tr.appendChild(tdName);

      // Col 3: Qty D.N
      const tdDn = document.createElement("td");
      tdDn.style.padding = "2px";
      const inpDn = document.createElement("input");
      inpDn.type = "number";
      inpDn.step = "any";
      inpDn.style.width = "100%";
      inpDn.style.fontSize = "11px";
      inpDn.style.textAlign = "right";
      inpDn.value = line.dnQty !== undefined ? line.dnQty : "";
      inpDn.addEventListener("input", (e) => {
        line.dnQty = Number(e.target.value || 0);
      });
      tdDn.appendChild(inpDn);
      tr.appendChild(tdDn);

      // Col 4: Qty Recd.
      const tdRecd = document.createElement("td");
      tdRecd.style.padding = "2px";
      const inpRecd = document.createElement("input");
      inpRecd.type = "number";
      inpRecd.step = "any";
      inpRecd.style.width = "100%";
      inpRecd.style.fontSize = "11px";
      inpRecd.style.textAlign = "right";
      inpRecd.value = line.qty !== undefined ? line.qty : "";
      inpRecd.addEventListener("input", (e) => {
        line.qty = Number(e.target.value || 0);
        updateTotals();
      });
      tdRecd.appendChild(inpRecd);
      tr.appendChild(tdRecd);

      // Col 5: Qty Left
      const tdQtyLeft = document.createElement("td");
      tdQtyLeft.style.padding = "3px 4px";
      tdQtyLeft.style.textAlign = "right";
      tdQtyLeft.textContent = Number(line.qtyLeft || 0).toFixed(4);
      tr.appendChild(tdQtyLeft);

      // Col 6: PO Bal.Qty
      const tdPoBal = document.createElement("td");
      tdPoBal.style.padding = "3px 4px";
      tdPoBal.style.textAlign = "right";
      tdPoBal.textContent = Number(line.poBalQty || 0).toFixed(4);
      tr.appendChild(tdPoBal);

      // Col 7: Action (Remove)
      const tdAct = document.createElement("td");
      tdAct.style.padding = "2px";
      tdAct.style.textAlign = "center";
      const btnRem = document.createElement("button");
      btnRem.type = "button";
      btnRem.textContent = "×";
      btnRem.style.color = "#cc0000";
      btnRem.style.fontWeight = "bold";
      btnRem.style.border = "1px solid #ccc";
      btnRem.style.background = "#fff";
      btnRem.style.cursor = "pointer";
      btnRem.addEventListener("click", () => {
        state.lines.splice(idx, 1);
        renderLinesTable();
      });
      tdAct.appendChild(btnRem);
      tr.appendChild(tdAct);

      dom.tbody.appendChild(tr);
    });

    updateTotals();
  }

  function addLineRow() {
    const nextSl = state.lines.length + 1;
    state.lines.push({
      slNo: nextSl,
      itemId: 0,
      code: "",
      name: "",
      measureUnit: "",
      dnQty: 0,
      qty: 0,
      qtyLeft: 0,
      poBalQty: 0,
      rejQty: 0,
      rewQty: 0,
      rate: 0,
      amount: 0,
      dcRowRem: "",
      rejRowRem: ""
    });
    renderLinesTable();
  }

  async function queryItemBalances(line, tdQtyLeft, tdPoBal) {
    const suppId = Number(dom.supp.value || 0);
    const poNo = dom.poNo.value || "";
    const refDcNo = dom.refDcNo.value || "";

    if (!line.itemId || !suppId) return;

    try {
      const q = new URLSearchParams({
        suppId: String(suppId),
        itemId: String(line.itemId),
        poNo: poNo,
        refDcNo: refDcNo
      });
      const res = await fetch("/api/subcon-dc-in/item-balances?" + q.toString());
      if (!res.ok) return;
      const data = await res.json();

      line.qtyLeft = Number(data.qtyLeft || 0);
      line.poBalQty = Number(data.poBalQty || 0);

      if (tdQtyLeft) tdQtyLeft.textContent = line.qtyLeft.toFixed(4);
      if (tdPoBal) tdPoBal.textContent = line.poBalQty.toFixed(4);
    } catch (e) {
      console.error("queryItemBalances error:", e);
    }
  }

  function refreshAllLineBalances() {
    state.lines.forEach((l) => {
      if (l.itemId) {
        queryItemBalances(l, null, null);
      }
    });
    setTimeout(() => renderLinesTable(), 200);
  }

  function updateTotals() {
    const totalLines = state.lines.filter(l => l.itemId > 0).length;
    let totalQty = 0;
    state.lines.forEach(l => {
      totalQty += Number(l.qty || 0);
    });
    if (dom.totalSummary) {
      dom.totalSummary.textContent = `Total Items: ${totalLines} | Total Qty: ${totalQty.toFixed(2)}`;
    }
  }

  // Post process modal
  function openPostProcessModal() {
    if (!dom.modalPostProcess) return;

    dom.postProcessRejRem.value = state.postProcess.rejRem || "";
    dom.postProcessTbody.innerHTML = "";

    state.lines.forEach((l, idx) => {
      if (!l.itemId) return;
      const tr = document.createElement("tr");

      const tdSl = document.createElement("td");
      tdSl.style.padding = "3px";
      tdSl.style.textAlign = "center";
      tdSl.textContent = l.slNo || (idx + 1);
      tr.appendChild(tdSl);

      const tdCode = document.createElement("td");
      tdCode.style.padding = "3px";
      tdCode.textContent = l.code + " - " + l.name;
      tr.appendChild(tdCode);

      const tdRecd = document.createElement("td");
      tdRecd.style.padding = "3px";
      tdRecd.style.textAlign = "right";
      tdRecd.textContent = Number(l.qty || 0).toFixed(2);
      tr.appendChild(tdRecd);

      const tdRej = document.createElement("td");
      tdRej.style.padding = "2px";
      const inpRej = document.createElement("input");
      inpRej.type = "number";
      inpRej.step = "any";
      inpRej.style.width = "100%";
      inpRej.value = l.rejQty !== undefined ? l.rejQty : 0;
      inpRej.addEventListener("input", (e) => {
        l.rejQty = Number(e.target.value || 0);
      });
      tdRej.appendChild(inpRej);
      tr.appendChild(tdRej);

      const tdRew = document.createElement("td");
      tdRew.style.padding = "2px";
      const inpRew = document.createElement("input");
      inpRew.type = "number";
      inpRew.step = "any";
      inpRew.style.width = "100%";
      inpRew.value = l.rewQty !== undefined ? l.rewQty : 0;
      inpRew.addEventListener("input", (e) => {
        l.rewQty = Number(e.target.value || 0);
      });
      tdRew.appendChild(inpRew);
      tr.appendChild(tdRew);

      const tdRem = document.createElement("td");
      tdRem.style.padding = "2px";
      const inpRem = document.createElement("input");
      inpRem.type = "text";
      inpRem.style.width = "100%";
      inpRem.value = l.rejRowRem || "";
      inpRem.addEventListener("input", (e) => {
        l.rejRowRem = e.target.value || "";
      });
      tdRem.appendChild(inpRem);
      tr.appendChild(tdRem);

      dom.postProcessTbody.appendChild(tr);
    });

    dom.modalPostProcess.hidden = false;
    dom.modalPostProcess.style.display = "flex";
  }

  function closePostProcessModal() {
    if (dom.modalPostProcess) {
      dom.modalPostProcess.hidden = true;
      dom.modalPostProcess.style.display = "none";
    }
  }

  function confirmPostProcess() {
    state.postProcess.rejRem = dom.postProcessRejRem.value || "";
    closePostProcessModal();
  }

  // Save Record
  async function saveRecord() {
    const payload = buildPayload(true);
    if (!payload) return;

    if (!confirm("Are You Sure To Save?")) return;

    try {
      const res = await fetch("/api/subcon-dc-in/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save record.");
        return;
      }

      alert(data.message || "Record Saved .");
      await loadBundle(data.dcId || payload.dcId);
    } catch (err) {
      console.error("saveRecord error:", err);
      alert("Error: " + err.message);
    }
  }

  // Modify Record
  async function modifyRecord() {
    const payload = buildPayload(false);
    if (!payload) return;

    let confirmMsg = "Are You Sure To Modify ?";
    if (state.currentRecord?.invNo) {
      confirmMsg = "CAUTION: Your Previous INVOICE Values with respect to this DCNO will be Made as ZERO !!!\n\nAre You Sure To Modify ?";
    }

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/subcon-dc-in/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to modify record.");
        return;
      }

      alert(data.message || "Record Modified .");
      await loadBundle(data.dcId || payload.dcId);
    } catch (err) {
      console.error("modifyRecord error:", err);
      alert("Error: " + err.message);
    }
  }

  // Delete Record
  async function deleteRecord() {
    if (!state.currentId) return;

    if (!confirm("Are You Sure To Delete")) return;

    try {
      const res = await fetch("/api/subcon-dc-in/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dcId: state.currentId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }

      alert(data.message || "Record Deleted Successfully.");
      // Load previous or start new
      await loadBundle(0);
    } catch (err) {
      console.error("deleteRecord error:", err);
      alert("Error: " + err.message);
    }
  }

  function buildPayload(isNewFlag) {
    const suppId = Number(dom.supp.value || 0);
    const storeId = Number(dom.store.value || 0);
    const dcNo = dom.dcNo.value.trim();
    const poNo = dom.poNo.value.trim();

    // Validations (exact VB6 strings)
    if (!suppId) {
      alert("Please Select a Supplier.....");
      dom.supp.focus();
      return null;
    }
    if (!storeId) {
      alert("Please Select a Store from the list");
      dom.store.focus();
      return null;
    }
    if (!dcNo) {
      alert("Enter the DC Number..... ");
      dom.dcNo.focus();
      return null;
    }
    if (state.supplierPos.length > 0 && !poNo && isNewFlag) {
      alert("You have to select a PO Number from the list.....");
      dom.poNo.focus();
      return null;
    }

    const validLines = state.lines.filter(l => l.itemId > 0);
    if (validLines.length === 0) {
      alert("Please Enter the item details by clicking the grid heading.....");
      return null;
    }

    for (let i = 0; i < validLines.length; i++) {
      const l = validLines[i];
      const slNo = l.slNo || (i + 1);
      if (!l.itemId) {
        alert(`Select Valid Item Code/Part No. for the SlNo. ${slNo}`);
        return null;
      }
      if (Number(l.dnQty || 0) <= 0) {
        alert(`Enter Quantity as per Delivery Note... for the SlNo:  ${slNo}`);
        return null;
      }
      if (Number(l.qty || 0) <= 0) {
        alert(`Qty should be greater than zero and less than  ...`);
        return null;
      }
    }

    return {
      isNew: isNewFlag,
      dcId: isNewFlag ? 0 : state.currentId,
      dcNo,
      dcDate: dom.dcDate.value,
      grnDate: dom.grnDate.value,
      suppId,
      storeId,
      costCntrId: Number(dom.costCntrId.value || 0) || null,
      poNo,
      poDate: dom.poDate.value || null,
      refDcNo: dom.refDcNo.value.trim(),
      refDcDate: dom.refDcDate.value || null,
      dcSigned: dom.dcSigned.checked,
      transport: dom.transport.value.trim(),
      vehicleNo: dom.vehicleNo.value.trim(),
      transFrom: dom.transFrom.value.trim(),
      transTo: dom.transTo.value.trim(),
      dcRem: dom.dcRem.value.trim(),
      rejRem: state.postProcess.rejRem || "",
      lines: validLines.map((l, i) => ({
        slNo: i + 1,
        itemId: l.itemId,
        dnQty: Number(l.dnQty || 0),
        qty: Number(l.qty || 0),
        rejQty: Number(l.rejQty || 0),
        rewQty: Number(l.rewQty || 0),
        rate: Number(l.rate || 0),
        amount: Number(l.qty || 0) * Number(l.rate || 0),
        dcRowRem: l.dcRowRem || "",
        rejRowRem: l.rejRowRem || ""
      }))
    };
  }

  function startNewRecord() {
    loadBundle(0, true);
  }

  function navigate(dir) {
    if (state.ids.length === 0) return;
    let target = state.currentId;
    const curIdx = state.ids.indexOf(state.currentId);

    if (dir === "first") {
      target = state.ids[0];
    } else if (dir === "prev") {
      if (curIdx > 0) target = state.ids[curIdx - 1];
      else target = state.ids[0];
    } else if (dir === "next") {
      if (curIdx >= 0 && curIdx < state.ids.length - 1) target = state.ids[curIdx + 1];
      else target = state.ids[state.ids.length - 1];
    } else if (dir === "last") {
      target = state.ids[state.ids.length - 1];
    }

    if (target && target !== state.currentId) {
      loadBundle(target);
    }
  }

  function searchGo() {
    const val = Number(dom.txtGo.value || 0);
    if (!val) return;
    if (state.ids.includes(val)) {
      loadBundle(val);
    } else {
      alert(" NO GRN exists with this No.");
    }
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildSubconDcInPrintHtml(company, rec) {
    const headLines = (company.head || "").split("\n").map(l => l.trim()).filter(Boolean);
    const companyName = headLines[0] || "COMPANY NAME";
    const companyAddr = headLines.slice(1).join(" | ");

    const formatNum = (v, dec = 2) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });

    const rows = (rec.lines || []).map((l, idx) => `
      <tr>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: center;">${l.slNo || (idx + 1)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px;"><b>${escapeHtml(l.code || "")}</b></td>
        <td style="border: 1px solid #333; padding: 4px 6px;">${escapeHtml(l.name || "")}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: center;">${escapeHtml(l.measureUnit || "")}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right;">${formatNum(l.dnQty, 4)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right; font-weight: bold;">${formatNum(l.qty, 4)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right;">${formatNum(l.rejQty, 4)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right;">${formatNum(l.rewQty, 4)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right;">${formatNum(l.rate, 2)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px; text-align: right; font-weight: bold;">${formatNum(l.amount, 2)}</td>
        <td style="border: 1px solid #333; padding: 4px 6px;">${escapeHtml(l.dcRowRem || "")}</td>
      </tr>
    `).join("");

    const totDn = (rec.lines || []).reduce((acc, l) => acc + Number(l.dnQty || 0), 0);
    const totRecd = (rec.lines || []).reduce((acc, l) => acc + Number(l.qty || 0), 0);
    const totRej = (rec.lines || []).reduce((acc, l) => acc + Number(l.rejQty || 0), 0);
    const totRew = (rec.lines || []).reduce((acc, l) => acc + Number(l.rewQty || 0), 0);
    const totAmt = (rec.lines || []).reduce((acc, l) => acc + Number(l.amount || 0), 0);

    return `
      <div style="font-family: Arial, sans-serif; font-size: 11px; color: #000; line-height: 1.4; padding: 10px;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${escapeHtml(companyName)}</h2>
          <div style="font-size: 11px; margin-top: 2px;">${escapeHtml(companyAddr)}</div>
          <div style="font-size: 10px; margin-top: 2px;">
            ${company.kst ? `<span><b>KST / GST:</b> ${escapeHtml(company.kst)}</span> &nbsp;&nbsp;` : ""}
            ${company.cst ? `<span><b>CST:</b> ${escapeHtml(company.cst)}</span> &nbsp;&nbsp;` : ""}
            ${company.vat ? `<span><b>VAT TIN:</b> ${escapeHtml(company.vat)}</span> &nbsp;&nbsp;` : ""}
            ${company.ce ? `<span><b>CE Reg No:</b> ${escapeHtml(company.ce)}</span>` : ""}
          </div>
          <h3 style="margin: 8px 0 0 0; font-size: 13px; text-decoration: underline; letter-spacing: 0.5px;">
            DC SUBCONTRACT - INWARDS (GOODS RECEIVED NOTE)
          </h3>
        </div>

        <!-- Top Metadata Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
          <tr>
            <!-- Supplier box -->
            <td style="width: 50%; vertical-align: top; border: 1px solid #444; padding: 8px;">
              <div style="font-size: 9px; text-transform: uppercase; color: #555; margin-bottom: 4px; font-weight: bold;">Sub Contractor / Supplier:</div>
              <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">${escapeHtml(rec.suppName || "-")}</div>
              <div style="white-space: pre-line; margin-bottom: 6px;">${escapeHtml(rec.suppAddr || "")}</div>
              ${rec.kstNo ? `<div><b>KST / GST No:</b> ${escapeHtml(rec.kstNo)}</div>` : ""}
              ${rec.cstNo ? `<div><b>CST No:</b> ${escapeHtml(rec.cstNo)}</div>` : ""}
              <div style="margin-top: 4px;"><b>Receiving Store:</b> ${escapeHtml(rec.storeName || "-")}</div>
            </td>

            <!-- GRN reference box -->
            <td style="width: 50%; vertical-align: top; border: 1px solid #444; padding: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="width: 42%; font-weight: bold; padding: 2px 0;">GRN No:</td><td style="padding: 2px 0; font-weight: bold; font-size: 13px;">${escapeHtml(String(rec.dcId || "-"))}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">GRN Date:</td><td style="padding: 2px 0;">${escapeHtml(rec.grnDate || "-")}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Party DC No & Date:</td><td style="padding: 2px 0;"><b>${escapeHtml(rec.dcNo || "-")}</b> &nbsp; dt. ${escapeHtml(rec.dcDate || "-")}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Our Ref DC No & Date:</td><td style="padding: 2px 0;">${escapeHtml(rec.refDcNo || "-")} ${rec.refDcDate ? ("dt. " + escapeHtml(rec.refDcDate)) : ""}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Work Order (PO) No & Date:</td><td style="padding: 2px 0;">${escapeHtml(rec.poNo || "-")} ${rec.poDate ? ("dt. " + escapeHtml(rec.poDate)) : ""}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Cost Center:</td><td style="padding: 2px 0;">${escapeHtml(rec.costCntr || "-")}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Mode of Transport:</td><td style="padding: 2px 0;">${escapeHtml(rec.transport || "-")} &nbsp;&nbsp; <b>Veh:</b> ${escapeHtml(rec.vehicleNo || "-")}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">From / To:</td><td style="padding: 2px 0;">${escapeHtml(rec.transFrom || "-")} / ${escapeHtml(rec.transTo || "-")}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Items Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #333; padding: 5px 4px; width: 30px; text-align: center;">Sl</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 110px; text-align: left;">Part No</th>
              <th style="border: 1px solid #333; padding: 5px 6px; text-align: left;">Description</th>
              <th style="border: 1px solid #333; padding: 5px 4px; width: 45px; text-align: center;">UOM</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 75px; text-align: right;">Qty D.N</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 80px; text-align: right;">Qty Recd</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 65px; text-align: right;">Qty Rej</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 65px; text-align: right;">Qty Rew</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 65px; text-align: right;">Rate (Rs.)</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 80px; text-align: right;">Amount (Rs.)</th>
              <th style="border: 1px solid #333; padding: 5px 6px; width: 100px; text-align: left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="11" style="text-align: center; padding: 12px; border: 1px solid #333;">No items recorded</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f7f7f7; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #333; padding: 5px 6px; text-align: right;">TOTALS:</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right;">${formatNum(totDn, 4)}</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right; font-size: 12px;">${formatNum(totRecd, 4)}</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right;">${formatNum(totRej, 4)}</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right;">${formatNum(totRew, 4)}</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right;">-</td>
              <td style="border: 1px solid #333; padding: 5px 6px; text-align: right; font-size: 12px;">Rs. ${formatNum(totAmt || rec.totVal, 2)}</td>
              <td style="border: 1px solid #333; padding: 5px 6px;"></td>
            </tr>
          </tfoot>
        </table>

        <!-- Remarks Box -->
        ${(rec.dcRem || rec.rejRem) ? `
          <div style="border: 1px solid #777; padding: 6px 8px; margin-bottom: 20px; font-size: 10px; background: #fafafa;">
            ${rec.dcRem ? `<div><b>GRN Remarks:</b> ${escapeHtml(rec.dcRem)}</div>` : ""}
            ${rec.rejRem ? `<div style="margin-top: 3px; color: #a00;"><b>Rejection / Post-Process Remarks:</b> ${escapeHtml(rec.rejRem)}</div>` : ""}
          </div>
        ` : ""}

        <!-- Signatures Footer -->
        <div style="margin-top: 45px; display: flex; justify-content: space-between; font-size: 11px; padding: 0 10px;">
          <div style="text-align: center; width: 140px; border-top: 1px solid #333; padding-top: 4px;">Prepared By</div>
          <div style="text-align: center; width: 140px; border-top: 1px solid #333; padding-top: 4px;">Checked / Quality</div>
          <div style="text-align: center; width: 140px; border-top: 1px solid #333; padding-top: 4px;">Store In-charge</div>
          <div style="text-align: center; width: 150px; border-top: 1px solid #333; padding-top: 4px;">Authorised Signatory</div>
        </div>
      </div>
    `;
  }

  async function printRecord() {
    if (!state.currentId) {
      alert("No data to Print...");
      return;
    }

    try {
      const id = state.currentId;
      const printUrl = `/api/print?type=grn-subcon&id=${encodeURIComponent(id)}`;
      window.open(printUrl, "_blank");
    } catch (err) {
      console.error("printRecord error:", err);
      alert("Error printing record: " + (err.message || err));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
