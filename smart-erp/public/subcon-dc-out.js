// subcon-dc-out.js
// Sub Contract - DC Outwards (Delivery Challan)
// Strict VB6 Fidelity for frmDCSubConOut

(() => {
  let mode = "view"; // "view" | "new" | "modify"
  let currentNote = null;
  let lines = [];
  let meta = {
    suppliers: [],
    costCenters: [],
    stores: [],
    items: [],
    stock: [],
    ids: [],
    nextId: 1,
    prefixDC: ""
  };

  // Temporary buffer for modal edits before saving or clicking OK
  let annexureData = {
    annexNo: "",
    annexSlno: "",
    annexNature: "",
    annextariff: "",
    annexProcPlace: "",
    annexDuration: "",
    annexQty: 0,
    annexEstiVal: 0,
    annexGoodsDesc: "",
    purpose: "",
    docuNature: ""
  };

  let form39Data = {
    form39No: "",
    form39LRNo: ""
  };

  const dom = {
    section: document.getElementById("subcon-dc-out"),
    btnX: document.getElementById("subcondcout-btn-x"),
    btnClose: document.getElementById("subcondcout-btn-close"),
    btnAnnexure: document.getElementById("subcondcout-btn-annexure"),
    btnForm39: document.getElementById("subcondcout-btn-form39"),
    btnCorres: document.getElementById("subcondcout-btn-corres"),

    stampCancelled: document.getElementById("subcondcout-stamp-cancelled"),
    dcId: document.getElementById("subcondcout-dc-id"),

    // Sub-Contractor Details
    supp: document.getElementById("subcondcout-supp"),
    store: document.getElementById("subcondcout-store"),
    costCntr: document.getElementById("subcondcout-cost-cntr"),

    // Order Reference
    poNo: document.getElementById("subcondcout-pono"),
    poDate: document.getElementById("subcondcout-podate"),
    lblOpenPo: document.getElementById("subcondcout-lbl-openpo"),

    // DC Identification
    dcNo: document.getElementById("subcondcout-dcno"),
    dcDate: document.getElementById("subcondcout-dcdate"),

    // Despatch & Transport
    transport: document.getElementById("subcondcout-transport"),
    vehicleno: document.getElementById("subcondcout-vehicleno"),
    transFrom: document.getElementById("subcondcout-transfrom"),
    transTo: document.getElementById("subcondcout-transto"),

    // Lines Table
    tbody: document.getElementById("subcondcout-tbody"),
    btnAddLine: document.getElementById("subcondcout-btn-add-line"),

    // Remarks
    dcRem: document.getElementById("subcondcout-rem"),

    // Navigation & Actions
    btnFirst: document.getElementById("subcondcout-nav-first"),
    btnPrev: document.getElementById("subcondcout-nav-prev"),
    btnNext: document.getElementById("subcondcout-nav-next"),
    btnLast: document.getElementById("subcondcout-nav-last"),
    searchDcNo: document.getElementById("subcondcout-search-dcno"),
    btnGo: document.getElementById("subcondcout-btn-go"),

    btnNew: document.getElementById("subcondcout-btn-new"),
    btnSave: document.getElementById("subcondcout-btn-save"),
    btnModify: document.getElementById("subcondcout-btn-modify"),
    btnDelete: document.getElementById("subcondcout-btn-delete"),
    btnPrint: document.getElementById("subcondcout-btn-print"),

    // Annexure II Modal
    annexModal: document.getElementById("subcondcout-annexure-modal"),
    annexCloseX: document.getElementById("subcondcout-annexure-close-x"),
    annexNo: document.getElementById("subcondcout-annex-no"),
    annexSlno: document.getElementById("subcondcout-annex-slno"),
    annexNature: document.getElementById("subcondcout-annex-nature"),
    annexTariff: document.getElementById("subcondcout-annex-tariff"),
    annexProcPlace: document.getElementById("subcondcout-annex-procplace"),
    annexDuration: document.getElementById("subcondcout-annex-duration"),
    annexQty: document.getElementById("subcondcout-annex-qty"),
    annexEstiVal: document.getElementById("subcondcout-annex-estival"),
    annexGoodsDesc: document.getElementById("subcondcout-annex-goodsdesc"),
    annexPurpose: document.getElementById("subcondcout-annex-purpose"),
    annexDocuNature: document.getElementById("subcondcout-annex-docunature"),
    annexOk: document.getElementById("subcondcout-annexure-ok"),
    annexCancel: document.getElementById("subcondcout-annexure-cancel"),

    // Form 39 Modal
    form39Modal: document.getElementById("subcondcout-form39-modal"),
    form39CloseX: document.getElementById("subcondcout-form39-close-x"),
    form39No: document.getElementById("subcondcout-form39-no"),
    form39LRNo: document.getElementById("subcondcout-form39-lrno"),
    form39Ok: document.getElementById("subcondcout-form39-ok"),
    form39Cancel: document.getElementById("subcondcout-form39-cancel")
  };

  function fmt2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  function fmt4(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(4) : "0.0000";
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function getStockOnHand(storeId, itemId) {
    if (!storeId || !itemId || !Array.isArray(meta.stock)) return 0;
    const match = meta.stock.find(s => s.storeId === Number(storeId) && s.itemId === Number(itemId));
    return match ? Number(match.qty || 0) : 0;
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

  function renderDropdowns() {
    // Suppliers
    const curSupp = dom.supp.value;
    dom.supp.innerHTML = '<option value="">-- Select Supplier --</option>' +
      meta.suppliers.map(s => `<option value="${s.suppId}">${escapeHtml(s.suppName)}</option>`).join("");
    if (curSupp) dom.supp.value = curSupp;

    // Stores
    const curStore = dom.store.value;
    dom.store.innerHTML = '<option value="">-- Select Store --</option>' +
      meta.stores.map(st => `<option value="${st.id}">${escapeHtml(st.storeName)}</option>`).join("");
    if (curStore) dom.store.value = curStore;

    // Cost Centers
    const curCost = dom.costCntr.value;
    dom.costCntr.innerHTML = '<option value="">-- None / Select --</option>' +
      meta.costCenters.map(c => `<option value="${c.id}">${escapeHtml(c.costCntr)}</option>`).join("");
    if (curCost) dom.costCntr.value = curCost;
  }

  async function onSupplierChange(selectedPoToSet) {
    const suppId = Number(dom.supp.value || 0);
    dom.poNo.innerHTML = '<option value="">-- Select Work Order --</option>';
    dom.poDate.value = "";
    dom.lblOpenPo.textContent = "";

    if (!suppId) return;

    try {
      const data = await apiGet(`/api/subcon-dc-out/supplier-pos?suppId=${suppId}`);
      if (data.ok && Array.isArray(data.orders)) {
        dom.poNo.innerHTML = '<option value="">-- Select Work Order --</option>' +
          data.orders.map(o => `<option value="${escapeHtml(o.poNo)}" data-date="${o.poDate || ''}" data-open="${o.isOpen ? '1' : '0'}">${escapeHtml(o.poNo)} (${o.poDate ? o.poDate.slice(0, 10) : ''})</option>`).join("");
        if (selectedPoToSet) {
          dom.poNo.value = selectedPoToSet;
          const opt = dom.poNo.options[dom.poNo.selectedIndex];
          if (opt) {
            dom.poDate.value = opt.getAttribute("data-date") || "";
            dom.lblOpenPo.textContent = opt.getAttribute("data-open") === "1" ? "OPEN WORK ORDER" : "";
          }
        }
      }
    } catch (e) {
      console.error("Failed to load supplier POs:", e);
    }
  }

  async function onPoChange() {
    const poNo = dom.poNo.value;
    const suppId = Number(dom.supp.value || 0);
    const opt = dom.poNo.options[dom.poNo.selectedIndex];

    if (opt && poNo) {
      dom.poDate.value = opt.getAttribute("data-date") || "";
      dom.lblOpenPo.textContent = opt.getAttribute("data-open") === "1" ? "OPEN WORK ORDER" : "";
    } else {
      dom.poDate.value = "";
      dom.lblOpenPo.textContent = "";
      return;
    }

    if (mode === "new") {
      try {
        const data = await apiGet(`/api/subcon-dc-out/po-lines?poNo=${encodeURIComponent(poNo)}&suppId=${suppId}`);
        if (data.ok && Array.isArray(data.lines) && data.lines.length > 0) {
          lines = data.lines.map((l, idx) => ({
            slNo: idx + 1,
            itemIdOut: l.itemId,
            itemCodeOut: l.itemCode,
            qtyOut: Number(l.qtyToReci || l.qty || 0),
            itemIdIn: l.itemId,
            itemCodeIn: l.itemCode,
            qtyIn: Number(l.qtyToReci || l.qty || 0),
            balQtyIn: Number(l.qtyToReci || l.qty || 0),
            dcRowRem: l.dcRowRem || "",
            stkQty: Number(l.stkQty || 0)
          }));
          renderLines();
        }
      } catch (e) {
        console.error("Failed to load PO lines:", e);
      }
    }
  }

  function renderLines() {
    dom.tbody.innerHTML = "";
    if (lines.length === 0) {
      dom.tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#888; padding:8px;">No items entered yet. Click "+ Add Line Item" or select a Work Order.</td></tr>`;
      return;
    }

    const isEditable = (mode === "new" || mode === "modify");

    lines.forEach((l, idx) => {
      const tr = document.createElement("tr");

      // Build options for Item OUT
      const outOptions = meta.items.map(it => 
        `<option value="${escapeHtml(it.itemCode)}" ${it.itemCode === l.itemCodeOut ? "selected" : ""}>${escapeHtml(it.itemCode)} - ${escapeHtml(it.itemName)}</option>`
      ).join("");

      // Build options for Item IN
      const inOptions = meta.items.map(it => 
        `<option value="${escapeHtml(it.itemCode)}" ${it.itemCode === l.itemCodeIn ? "selected" : ""}>${escapeHtml(it.itemCode)} - ${escapeHtml(it.itemName)}</option>`
      ).join("");

      tr.innerHTML = `
        <td style="text-align: center; border: 1px solid #c0c0c0; padding: 2px;">${idx + 1}</td>
        <td style="border: 1px solid #c0c0c0; padding: 2px;">
          ${isEditable ? 
            `<select class="line-item-out" data-idx="${idx}" style="width: 100%; font-size: 11px;">
               <option value="">-- Select OUT --</option>
               ${outOptions}
             </select>` : 
            `<span>${escapeHtml(l.itemCodeOut || "")}</span>`
          }
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px;">
          ${isEditable ? 
            `<input type="number" step="0.0001" class="line-qty-out" data-idx="${idx}" value="${l.qtyOut || 0}" style="width: 100%; font-size: 11px; text-align: right;">` : 
            `<div style="text-align: right;">${fmt4(l.qtyOut)}</div>`
          }
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px;">
          ${isEditable ? 
            `<select class="line-item-in" data-idx="${idx}" style="width: 100%; font-size: 11px;">
               <option value="">-- Select IN --</option>
               ${inOptions}
             </select>` : 
            `<span>${escapeHtml(l.itemCodeIn || "")}</span>`
          }
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px;">
          ${isEditable ? 
            `<input type="number" step="0.0001" class="line-qty-in" data-idx="${idx}" value="${l.qtyIn || 0}" style="width: 100%; font-size: 11px; text-align: right;">` : 
            `<div style="text-align: right;">${fmt4(l.qtyIn)}</div>`
          }
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px;">
          ${isEditable ? 
            `<input type="text" class="line-rem" data-idx="${idx}" value="${escapeHtml(l.dcRowRem || "")}" style="width: 100%; font-size: 11px;">` : 
            `<span>${escapeHtml(l.dcRowRem || "")}</span>`
          }
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: right;">
          <span class="line-stk-qty" data-idx="${idx}">${fmt2(l.stkQty)}</span>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: right;">
          <span>${fmt4(l.balQtyIn != null ? l.balQtyIn : l.qtyIn)}</span>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: center;">
          ${isEditable ? 
            `<button type="button" class="btn line-btn-del" data-idx="${idx}" style="font-size: 10px; color: #cc0000; padding: 1px 4px;">X</button>` : 
            `-`
          }
        </td>
      `;

      dom.tbody.appendChild(tr);
    });

    if (isEditable) {
      // Wire change events for line row inputs
      dom.tbody.querySelectorAll(".line-item-out").forEach(sel => {
        sel.addEventListener("change", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          const code = e.target.value;
          lines[idx].itemCodeOut = code;
          const found = meta.items.find(i => i.itemCode === code);
          if (found) {
            lines[idx].itemIdOut = found.itemId;
            const available = getStockOnHand(dom.store.value, found.itemId);
            lines[idx].stkQty = available;
            const stkSpan = dom.tbody.querySelector(`.line-stk-qty[data-idx="${idx}"]`);
            if (stkSpan) stkSpan.textContent = fmt2(available);
          }
        });
      });

      dom.tbody.querySelectorAll(".line-qty-out").forEach(inp => {
        inp.addEventListener("input", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          lines[idx].qtyOut = Number(e.target.value || 0);
        });
      });

      dom.tbody.querySelectorAll(".line-item-in").forEach(sel => {
        sel.addEventListener("change", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          const code = e.target.value;
          lines[idx].itemCodeIn = code;
          const found = meta.items.find(i => i.itemCode === code);
          if (found) {
            lines[idx].itemIdIn = found.itemId;
          }
        });
      });

      dom.tbody.querySelectorAll(".line-qty-in").forEach(inp => {
        inp.addEventListener("input", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          lines[idx].qtyIn = Number(e.target.value || 0);
          if (lines[idx].balQtyIn == null) {
            lines[idx].balQtyIn = lines[idx].qtyIn;
          }
        });
      });

      dom.tbody.querySelectorAll(".line-rem").forEach(inp => {
        inp.addEventListener("input", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          lines[idx].dcRowRem = e.target.value;
        });
      });

      dom.tbody.querySelectorAll(".line-btn-del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          lines.splice(idx, 1);
          renderLines();
        });
      });
    }
  }

  function addBlankLine() {
    lines.push({
      slNo: lines.length + 1,
      itemIdOut: null,
      itemCodeOut: "",
      qtyOut: 0,
      itemIdIn: null,
      itemCodeIn: "",
      qtyIn: 0,
      balQtyIn: 0,
      dcRowRem: "",
      stkQty: 0
    });
    renderLines();
  }

  function populateNote(note) {
    currentNote = note;
    if (!note) {
      resetFields();
      return;
    }

    dom.dcId.value = note.dcId || "";
    dom.dcNo.value = note.dcNo || "";
    dom.dcDate.value = note.dcDate || "";
    dom.supp.value = note.suppId || "";
    dom.store.value = note.storeId || "";
    dom.costCntr.value = note.costCntrId || "";
    dom.transport.value = note.transport || "";
    dom.vehicleno.value = note.vehicleNo || "";
    dom.transFrom.value = note.transFrom || "";
    dom.transTo.value = note.transTo || "";
    dom.dcRem.value = note.dcRem || "";

    if (note.cancl) {
      dom.stampCancelled.style.display = "block";
    } else {
      dom.stampCancelled.style.display = "none";
    }

    // Annexure details
    annexureData = {
      annexNo: note.annexNo || "",
      annexSlno: note.annexSlno || "",
      annexNature: note.annexNature || "",
      annexTariff: note.annexTariff || "",
      annexProcPlace: note.annexProcPlace || "",
      annexDuration: note.annexDuration || "",
      annexQty: note.annexQty || 0,
      annexEstiVal: note.annexEstiVal || 0,
      annexGoodsDesc: note.annexGoodsDesc || "",
      purpose: note.purpose || "",
      docuNature: note.docuNature || ""
    };

    // Form 39 details
    form39Data = {
      form39No: note.form39No || "",
      form39LRNo: note.form39LRNo || ""
    };

    // Load supplier POs and select PO
    onSupplierChange(note.poNo).then(() => {
      dom.poDate.value = note.poDate || "";
    });

    lines = Array.isArray(note.lines) ? JSON.parse(JSON.stringify(note.lines)) : [];
    renderLines();
    setMode("view");
  }

  function resetFields() {
    currentNote = null;
    dom.dcId.value = "";
    dom.dcNo.value = meta.prefixDC || "";
    dom.dcDate.value = todayStr();
    dom.supp.value = "";
    dom.store.value = meta.stores.length > 0 ? meta.stores[0].id : "";
    dom.costCntr.value = "";
    dom.poNo.innerHTML = '<option value="">-- Select Work Order --</option>';
    dom.poDate.value = "";
    dom.lblOpenPo.textContent = "";
    dom.transport.value = "";
    dom.vehicleno.value = "";
    dom.transFrom.value = "";
    dom.transTo.value = "";
    dom.dcRem.value = "";
    dom.stampCancelled.style.display = "none";

    annexureData = {
      annexNo: "",
      annexSlno: "",
      annexNature: "",
      annexTariff: "",
      annexProcPlace: "",
      annexDuration: "",
      annexQty: 0,
      annexEstiVal: 0,
      annexGoodsDesc: "",
      purpose: "",
      docuNature: ""
    };

    form39Data = {
      form39No: "",
      form39LRNo: ""
    };

    lines = [
      {
        slNo: 1,
        itemIdOut: null,
        itemCodeOut: "",
        qtyOut: 0,
        itemIdIn: null,
        itemCodeIn: "",
        qtyIn: 0,
        balQtyIn: 0,
        dcRowRem: "",
        stkQty: 0
      }
    ];
    renderLines();
  }

  function setMode(m) {
    mode = m;
    const isEditing = (mode === "new" || mode === "modify");

    // Controls enabled state
    dom.supp.disabled = (mode === "view" || mode === "modify");
    dom.store.disabled = !isEditing;
    dom.costCntr.disabled = !isEditing;
    dom.poNo.disabled = (mode === "view" || mode === "modify");
    dom.dcNo.readOnly = (mode === "view" || mode === "modify");
    dom.dcDate.readOnly = !isEditing;
    dom.transport.readOnly = !isEditing;
    dom.vehicleno.readOnly = !isEditing;
    dom.transFrom.readOnly = !isEditing;
    dom.transTo.readOnly = !isEditing;
    dom.dcRem.readOnly = !isEditing;
    dom.btnAddLine.disabled = !isEditing;

    // Buttons
    dom.btnNew.disabled = isEditing;
    dom.btnSave.disabled = !isEditing;
    dom.btnModify.disabled = isEditing || !currentNote || currentNote.cancl;
    dom.btnDelete.disabled = isEditing || !currentNote || currentNote.cancl;
    dom.btnPrint.disabled = isEditing || !currentNote;

    renderLines();
  }

  // Navigation logic
  async function loadNoteById(id) {
    try {
      const data = await apiGet(`/api/subcon-dc-out?id=${id}`);
      if (data.ok && data.note) {
        populateNote(data.note);
      }
    } catch (e) {
      console.error("Failed to load DC:", e);
    }
  }

  function navFirst() {
    if (meta.ids && meta.ids.length > 0) {
      loadNoteById(meta.ids[0]);
    }
  }

  function navPrev() {
    if (!currentNote || !meta.ids || meta.ids.length === 0) return;
    const curIdx = meta.ids.indexOf(currentNote.dcId);
    if (curIdx > 0) {
      loadNoteById(meta.ids[curIdx - 1]);
    }
  }

  function navNext() {
    if (!currentNote || !meta.ids || meta.ids.length === 0) return;
    const curIdx = meta.ids.indexOf(currentNote.dcId);
    if (curIdx >= 0 && curIdx < meta.ids.length - 1) {
      loadNoteById(meta.ids[curIdx + 1]);
    }
  }

  function navLast() {
    if (meta.ids && meta.ids.length > 0) {
      loadNoteById(meta.ids[meta.ids.length - 1]);
    }
  }

  async function searchDcNo() {
    const val = dom.searchDcNo.value.trim();
    if (!val) return;
    try {
      const data = await apiGet(`/api/subcon-dc-out?dcNo=${encodeURIComponent(val)}`);
      if (data.ok && data.note) {
        populateNote(data.note);
        dom.searchDcNo.value = "";
      } else {
        alert(`DC Number "${val}" not found.`);
      }
    } catch (e) {
      alert("Error searching DC Number.");
    }
  }

  // Actions
  function onNew() {
    resetFields();
    setMode("new");
  }

  function onModify() {
    if (!currentNote) return;
    if (currentNote.cancl) {
      alert("Cancelled DC cannot be modified.");
      return;
    }
    setMode("modify");
  }

  async function onSave() {
    const suppId = Number(dom.supp.value || 0);
    const storeId = Number(dom.store.value || 0);
    const costCntrId = dom.costCntr.value ? Number(dom.costCntr.value) : null;
    const dcNo = dom.dcNo.value.trim();
    const dcDate = dom.dcDate.value;
    const poNo = dom.poNo.value || null;
    const poDate = dom.poDate.value || null;
    const transport = dom.transport.value.trim();
    const vehicleNo = dom.vehicleno.value.trim();
    const transFrom = dom.transFrom.value.trim();
    const transTo = dom.transTo.value.trim();
    const dcRem = dom.dcRem.value.trim();

    // Check for stock shortages in selected store and prompt warning
    const shortages = [];
    lines.forEach((l, idx) => {
      const sl = idx + 1;
      const qtyOut = Number(l.qtyOut || 0);
      const stkQty = Number(l.stkQty || 0);
      if (qtyOut > 0 && qtyOut > stkQty) {
        shortages.push(`• SlNo ${sl} [${l.itemCodeOut || 'Item'}]: Sending ${qtyOut}, Stock in Store = ${stkQty.toFixed(2)} (Deficit: ${(qtyOut - stkQty).toFixed(2)})`);
      }
    });

    if (shortages.length > 0) {
      const msg = `WARNING: Insufficient stock in the selected store for the following item(s):\n\n` +
        shortages.join("\n") +
        `\n\nDispatching will cause negative inventory in this store.\nDo you want to proceed anyway?`;
      if (!confirm(msg)) {
        return;
      }
    }

    const payload = {
      dcId: mode === "modify" && currentNote ? currentNote.dcId : 0,
      dcNo,
      dcDate,
      suppId,
      poNo,
      poDate,
      costCntrId,
      storeId,
      transport,
      vehicleNo,
      transFrom,
      transTo,
      dcRem,
      lines,
      ...annexureData,
      ...form39Data
    };

    try {
      const res = await apiPost("/api/subcon-dc-out/save", payload);
      if (res.error) {
        alert(res.error);
        return;
      }
      alert(res.message || "Record saved successfully.");
      await initBundle(res.dcId);
    } catch (e) {
      alert("Failed to save DC Outwards: " + e.message);
    }
  }

  async function onDelete() {
    if (!currentNote) return;
    if (currentNote.cancl) {
      alert("This DC is already cancelled.");
      return;
    }

    if (!confirm("Are you sure to delete this DC Record ?")) return;

    try {
      const res = await apiPost("/api/subcon-dc-out/delete", { dcId: currentNote.dcId });
      if (res.error) {
        alert(res.error);
        return;
      }
      alert(res.message || "Record deleted successfully.");
      await initBundle();
    } catch (e) {
      alert("Failed to delete DC Outwards: " + e.message);
    }
  }

  function onPrint() {
    if (!currentNote) {
      alert("Please select a DC to print.");
      return;
    }

    const rowsHtml = (currentNote.lines || []).map(l => `
      <tr>
        <td style="border: 1px solid #333; padding: 4px; text-align: center;">${l.slNo}</td>
        <td style="border: 1px solid #333; padding: 4px;">${escapeHtml(l.itemCodeOut)} - ${escapeHtml(l.itemNameOut || '')}</td>
        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${fmt4(l.qtyOut)} ${escapeHtml(l.uomOut || '')}</td>
        <td style="border: 1px solid #333; padding: 4px;">${escapeHtml(l.itemCodeIn)} - ${escapeHtml(l.itemNameIn || '')}</td>
        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${fmt4(l.qtyIn)} ${escapeHtml(l.uomIn || '')}</td>
        <td style="border: 1px solid #333; padding: 4px;">${escapeHtml(l.dcRowRem || '')}</td>
      </tr>
    `).join("");

    const docHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 11px; padding: 10px; color: #000;">
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 8px;">SUB-CONTRACT DELIVERY CHALLAN (OUTWARD)</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
          <tr>
            <td style="width: 50%; vertical-align: top; border: 1px solid #ccc; padding: 6px;">
              <strong>Supplier:</strong> ${escapeHtml(currentNote.suppName)}<br>${escapeHtml(currentNote.suppAddr || '')}
            </td>
            <td style="width: 50%; vertical-align: top; border: 1px solid #ccc; padding: 6px;">
              <strong>DC No:</strong> ${escapeHtml(currentNote.dcNo)}<br><strong>DC Date:</strong> ${escapeHtml(currentNote.dcDate)}<br><strong>WO No:</strong> ${escapeHtml(currentNote.poNo || 'Direct')}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px;"><strong>Store:</strong> ${escapeHtml(currentNote.storeName || '')}<br><strong>Cost Center:</strong> ${escapeHtml(currentNote.costCntr || '')}</td>
            <td style="border: 1px solid #ccc; padding: 6px;"><strong>Transport:</strong> ${escapeHtml(currentNote.transport || '')}<br><strong>Vehicle No:</strong> ${escapeHtml(currentNote.vehicleNo || '')}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #333; padding: 5px; width: 35px;">SlNo</th>
              <th style="border: 1px solid #333; padding: 5px;">Material Sent (OUT)</th>
              <th style="border: 1px solid #333; padding: 5px; width: 90px; text-align: right;">Qty OUT</th>
              <th style="border: 1px solid #333; padding: 5px;">To be Processed into (IN)</th>
              <th style="border: 1px solid #333; padding: 5px; width: 90px; text-align: right;">Expected IN</th>
              <th style="border: 1px solid #333; padding: 5px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: 8px;">No items</td></tr>`}
          </tbody>
        </table>

        ${currentNote.annexNo ? `
        <div style="margin-top: 12px; border: 1px dashed #666; padding: 8px; font-size: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">ANNEXURE II DETAILS</div>
          <div><strong>Annexure No:</strong> ${escapeHtml(currentNote.annexNo)} &nbsp; | &nbsp; <strong>Nature of Processing:</strong> ${escapeHtml(currentNote.annexNature || '')}</div>
          <div><strong>Goods Desc:</strong> ${escapeHtml(currentNote.annexGoodsDesc || '')} &nbsp; | &nbsp; <strong>Tariff:</strong> ${escapeHtml(currentNote.annexTariff || '')}</div>
        </div>
        ` : ''}

        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>Prepared By: _________________</div>
          <div>Authorised Signatory: _________________</div>
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`DC Outwards - ${currentNote.dcNo}`, docHtml);
    } else {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>DC Outwards - ${escapeHtml(currentNote.dcNo)}</title></head><body>${docHtml}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 250);
    }
  }

  // Annexure II Modal handlers
  function openAnnexureModal() {
    dom.annexNo.value = annexureData.annexNo || "";
    dom.annexSlno.value = annexureData.annexSlno || "";
    dom.annexNature.value = annexureData.annexNature || "";
    dom.annexTariff.value = annexureData.annexTariff || "";
    dom.annexProcPlace.value = annexureData.annexProcPlace || "";
    dom.annexDuration.value = annexureData.annexDuration || "";
    dom.annexQty.value = annexureData.annexQty || 0;
    dom.annexEstiVal.value = annexureData.annexEstiVal || 0;
    dom.annexGoodsDesc.value = annexureData.annexGoodsDesc || "";
    dom.annexPurpose.value = annexureData.purpose || "";
    dom.annexDocuNature.value = annexureData.docuNature || "";

    dom.annexModal.style.display = "flex";
    dom.annexModal.hidden = false;
  }

  function closeAnnexureModal() {
    dom.annexModal.style.display = "none";
    dom.annexModal.hidden = true;
  }

  function saveAnnexureModal() {
    annexureData.annexNo = dom.annexNo.value.trim();
    annexureData.annexSlno = dom.annexSlno.value.trim();
    annexureData.annexNature = dom.annexNature.value.trim();
    annexureData.annexTariff = dom.annexTariff.value.trim();
    annexureData.annexProcPlace = dom.annexProcPlace.value.trim();
    annexureData.annexDuration = dom.annexDuration.value.trim();
    annexureData.annexQty = Number(dom.annexQty.value || 0);
    annexureData.annexEstiVal = Number(dom.annexEstiVal.value || 0);
    annexureData.annexGoodsDesc = dom.annexGoodsDesc.value.trim();
    annexureData.purpose = dom.annexPurpose.value.trim();
    annexureData.docuNature = dom.annexDocuNature.value.trim();
    closeAnnexureModal();
  }

  // Form 39 Modal handlers
  function openForm39Modal() {
    dom.form39No.value = form39Data.form39No || "";
    dom.form39LRNo.value = form39Data.form39LRNo || "";
    dom.form39Modal.style.display = "flex";
    dom.form39Modal.hidden = false;
  }

  function closeForm39Modal() {
    dom.form39Modal.style.display = "none";
    dom.form39Modal.hidden = true;
  }

  function saveForm39Modal() {
    form39Data.form39No = dom.form39No.value.trim();
    form39Data.form39LRNo = dom.form39LRNo.value.trim();
    closeForm39Modal();
  }

  async function initBundle(targetId = 0) {
    try {
      const url = targetId ? `/api/subcon-dc-out?id=${targetId}` : `/api/subcon-dc-out`;
      const data = await apiGet(url);
      if (data.ok) {
        meta.suppliers = data.suppliers || [];
        meta.costCenters = data.costCenters || [];
        meta.stores = data.stores || [];
        meta.items = data.items || [];
        meta.stock = data.stock || [];
        meta.ids = data.ids || [];
        meta.nextId = data.nextId || 1;
        meta.prefixDC = data.prefixDC || "";

        renderDropdowns();

        if (data.note) {
          populateNote(data.note);
        } else {
          resetFields();
          setMode("new");
        }
      }
    } catch (e) {
      console.error("Failed to initialize DC Outwards bundle:", e);
    }
  }

  // Event Listeners Wiring
  function wireEvents() {
    dom.supp.addEventListener("change", () => onSupplierChange());
    dom.poNo.addEventListener("change", onPoChange);
    dom.store.addEventListener("change", () => {
      const sId = Number(dom.store.value || 0);
      lines.forEach((l, idx) => {
        if (l.itemIdOut) {
          l.stkQty = getStockOnHand(sId, l.itemIdOut);
          const stkSpan = dom.tbody.querySelector(`.line-stk-qty[data-idx="${idx}"]`);
          if (stkSpan) stkSpan.textContent = fmt2(l.stkQty);
        }
      });
    });

    dom.btnAddLine.addEventListener("click", addBlankLine);

    dom.btnNew.addEventListener("click", onNew);
    dom.btnModify.addEventListener("click", onModify);
    dom.btnSave.addEventListener("click", onSave);
    dom.btnDelete.addEventListener("click", onDelete);
    dom.btnPrint.addEventListener("click", onPrint);

    dom.btnFirst.addEventListener("click", navFirst);
    dom.btnPrev.addEventListener("click", navPrev);
    dom.btnNext.addEventListener("click", navNext);
    dom.btnLast.addEventListener("click", navLast);
    dom.btnGo.addEventListener("click", searchDcNo);
    dom.searchDcNo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchDcNo();
    });

    dom.btnAnnexure.addEventListener("click", openAnnexureModal);
    dom.annexCloseX.addEventListener("click", closeAnnexureModal);
    dom.annexCancel.addEventListener("click", closeAnnexureModal);
    dom.annexOk.addEventListener("click", saveAnnexureModal);
    dom.annexModal.addEventListener("click", (e) => {
      if (e.target === dom.annexModal) closeAnnexureModal();
    });

    dom.btnForm39.addEventListener("click", openForm39Modal);
    dom.form39CloseX.addEventListener("click", closeForm39Modal);
    dom.form39Cancel.addEventListener("click", closeForm39Modal);
    dom.form39Ok.addEventListener("click", saveForm39Modal);
    dom.form39Modal.addEventListener("click", (e) => {
      if (e.target === dom.form39Modal) closeForm39Modal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (dom.form39Modal.style.display === "flex") {
          closeForm39Modal();
        } else if (dom.annexModal.style.display === "flex") {
          closeAnnexureModal();
        } else if (!dom.section.hidden) {
          closeSubconDcOut();
        }
      }
    });

    dom.btnCorres.addEventListener("click", () => {
      if (currentNote && currentNote.dcNo) {
        if (typeof window.openCorres === "function") {
          window.openCorres("SubCon DC Out", currentNote.dcNo);
        } else {
          alert(`Correspondences for DC Outwards: ${currentNote.dcNo}`);
        }
      } else {
        alert("Please save or select a DC first.");
      }
    });

    dom.btnX.addEventListener("click", closeSubconDcOut);
    dom.btnClose.addEventListener("click", closeSubconDcOut);
  }

  function openSubconDcOut() {
    dom.section.hidden = false;
    initBundle();
  }

  function closeSubconDcOut() {
    dom.section.hidden = true;
    closeAnnexureModal();
    closeForm39Modal();
  }

  // Export to window
  window.openSubconDcOut = openSubconDcOut;
  window.closeSubconDcOut = closeSubconDcOut;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireEvents);
  } else {
    wireEvents();
  }
})();
