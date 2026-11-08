(() => {
  let mode = "view"; // "view" | "new" | "edit"
  let currentNote = null;
  let lines = [];
  let editingLineIndex = -1;
  let meta = {
    customers: [],
    stores: [],
    costCenters: [],
    items: [],
    nextDcId: 1,
    nextDcNo: "",
    activeId: 0,
    nav: {}
  };
  let isLocked = false;
  let incomingDcCache = [];

  const dom = {
    section: document.getElementById("labour-dc-out"),
    btnX: document.getElementById("dcout-btn-x"),
    btnClose: document.getElementById("dcout-btn-close"),
    btnCorres: document.getElementById("dcout-btn-corres"),

    cust: document.getElementById("dcout-cust"),
    store: document.getElementById("dcout-store"),
    costcntr: document.getElementById("dcout-costcntr"),
    transport: document.getElementById("dcout-transport"),
    vehicleno: document.getElementById("dcout-vehicleno"),
    transfrom: document.getElementById("dcout-transfrom"),
    transto: document.getElementById("dcout-transto"),

    dcno: document.getElementById("dcout-dcno"),
    dcdate: document.getElementById("dcout-dcdate"),
    refdcno: document.getElementById("dcout-refdcno"),
    refdcdate: document.getElementById("dcout-refdcdate"),
    pono: document.getElementById("dcout-pono"),
    podate: document.getElementById("dcout-podate"),
    girno: document.getElementById("dcout-girno"),
    dcsign: document.getElementById("dcout-dcsign"),
    lblOpenPO: document.getElementById("dcout-lbl-openpo"),
    lblPOCancl: document.getElementById("dcout-lbl-pcancl"),
    rem: document.getElementById("dcout-rem"),

    lineItem: document.getElementById("dcout-line-item"),
    linePartic: document.getElementById("dcout-line-partic"),
    lineQty: document.getElementById("dcout-line-qty"),
    lineStkQty: document.getElementById("dcout-line-stkqty"),
    lineQtyOnHand: document.getElementById("dcout-line-qtyonhand"),
    linePoBalQty: document.getElementById("dcout-line-pobalqty"),
    lineRem: document.getElementById("dcout-line-rem"),
    btnAddLine: document.getElementById("dcout-btn-add-line"),
    btnClearLine: document.getElementById("dcout-btn-clear-line"),

    tbody: document.getElementById("dcout-tbody"),
    lblItemGuide: document.getElementById("dcout-lbl-item-guide"),
    chkPreformat: document.getElementById("dcout-preformat"),
    statusBadge: document.getElementById("dcout-status-badge"),

    searchNo: document.getElementById("dcout-search-no"),
    btnFind: document.getElementById("dcout-btn-find"),

    btnNew: document.getElementById("dcout-btn-new"),
    btnSave: document.getElementById("dcout-btn-save"),
    btnModify: document.getElementById("dcout-btn-modify"),
    btnDelete: document.getElementById("dcout-btn-delete"),
    btnFirst: document.getElementById("dcout-btn-first"),
    btnPrev: document.getElementById("dcout-btn-prev"),
    btnNext: document.getElementById("dcout-btn-next"),
    btnLast: document.getElementById("dcout-btn-last"),
    btnPrint: document.getElementById("dcout-btn-print")
  };

  function fmt2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
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

  function setMode(m) {
    mode = m;
    const isEdit = (mode === "new" || mode === "edit");

    dom.cust.disabled = !isEdit;
    dom.store.disabled = !isEdit;
    dom.costcntr.disabled = !isEdit;
    dom.transport.readOnly = !isEdit;
    dom.vehicleno.readOnly = !isEdit;
    dom.transfrom.readOnly = !isEdit;
    dom.transto.readOnly = !isEdit;

    dom.dcdate.readOnly = !isEdit;
    dom.refdcno.disabled = !isEdit;
    dom.refdcdate.readOnly = !isEdit;
    dom.pono.disabled = !isEdit;
    dom.podate.readOnly = !isEdit;
    dom.girno.readOnly = !isEdit;
    dom.dcsign.disabled = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.lineItem.disabled = !isEdit;
    dom.linePartic.readOnly = !isEdit;
    dom.lineQty.readOnly = !isEdit;
    dom.lineRem.readOnly = !isEdit;
    dom.btnAddLine.disabled = !isEdit;
    dom.btnClearLine.disabled = !isEdit;

    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote || isLocked;
    dom.btnDelete.disabled = isEdit || !currentNote || isLocked;
    dom.btnNew.disabled = (mode === "new");

    dom.statusBadge.textContent = isLocked ? "LOCKED (Invoiced / Cash Flow / Processed)" : (isEdit ? `[${mode.toUpperCase()}]` : "");
    dom.statusBadge.style.color = isLocked ? "#b00" : "#2b547e";
  }

  function populateSelect(selectEl, items, valKey, labelKey, placeholder) {
    selectEl.innerHTML = "";
    if (placeholder) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      selectEl.appendChild(opt);
    }
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it[valKey];
      opt.textContent = it[labelKey];
      selectEl.appendChild(opt);
    }
  }

  function updateItemGuide(itemId) {
    const id = Number(itemId || 0);
    if (!id) {
      dom.lblItemGuide.textContent = "ITEM:      UOM: ";
      return;
    }
    const it = meta.items.find((x) => Number(x.id || x.item_id) === id);
    if (it) {
      dom.lblItemGuide.textContent = `ITEM: ${it.item_code}    UOM: ${it.uom || it.measure_unit || "-"}`;
    }
  }

  async function loadCustomerIncomingDcs(custId, selectedRefDcNo) {
    dom.refdcno.innerHTML = '<option value="">-- Select Inwards DC --</option>';
    incomingDcCache = [];
    if (!custId) return;
    try {
      const data = await apiGet(`/api/labour-dc-out/customer-incoming-dcs?custId=${encodeURIComponent(custId)}`);
      incomingDcCache = Array.isArray(data.incomingDcs) ? data.incomingDcs : [];
      for (const d of incomingDcCache) {
        const opt = document.createElement("option");
        opt.value = d.dcno;
        opt.textContent = `${d.dcno} (${d.dcdate ? String(d.dcdate).slice(0, 10) : ""})`;
        opt.dataset.dcdate = d.dcdate ? String(d.dcdate).slice(0, 10) : "";
        opt.dataset.pono = d.pono || "";
        opt.dataset.podate = d.podate ? String(d.podate).slice(0, 10) : "";
        dom.refdcno.appendChild(opt);
      }
      if (selectedRefDcNo) {
        dom.refdcno.value = selectedRefDcNo;
        onRefDcSelected();
      }
    } catch (err) {
      console.error("loadCustomerIncomingDcs error:", err);
    }
  }

  function onRefDcSelected() {
    const sel = dom.refdcno.selectedOptions[0];
    if (sel && sel.value) {
      if (sel.dataset.dcdate) dom.refdcdate.value = sel.dataset.dcdate;
      if (sel.dataset.pono && !dom.pono.value) {
        dom.pono.value = sel.dataset.pono;
        if (sel.dataset.podate) dom.podate.value = sel.dataset.podate;
      }
    }
    loadAvailableItems();
  }

  async function loadCustomerPOs(custId, selectedPoNo) {
    dom.pono.innerHTML = '<option value="">-- Select Work Order --</option>';
    if (!custId) return;
    try {
      const data = await apiGet(`/api/labour-dc-out/customer-pos?custId=${encodeURIComponent(custId)}`);
      const pos = Array.isArray(data.pos) ? data.pos : [];
      for (const p of pos) {
        const opt = document.createElement("option");
        opt.value = p.pono;
        opt.textContent = p.pono;
        opt.dataset.podate = p.podate ? String(p.podate).slice(0, 10) : "";
        dom.pono.appendChild(opt);
      }
      if (selectedPoNo) {
        dom.pono.value = selectedPoNo;
        onPoSelected();
      }
    } catch (err) {
      console.error("loadCustomerPOs error:", err);
    }
  }

  function onPoSelected() {
    const sel = dom.pono.selectedOptions[0];
    if (sel && sel.value) {
      if (sel.dataset.podate) dom.podate.value = sel.dataset.podate;
    }
  }

  async function loadAvailableItems() {
    const custId = Number(dom.cust.value || 0);
    const refDcNo = String(dom.refdcno.value || "").trim();
    const poNo = String(dom.pono.value || "").trim();

    dom.lineItem.innerHTML = '<option value="">-- Select Item Code / Part No. --</option>';

    try {
      const url = `/api/labour-dc-out/incoming-dc-items?custId=${custId}&refDcNo=${encodeURIComponent(refDcNo)}&poNo=${encodeURIComponent(poNo)}`;
      const data = await apiGet(url);
      const incItems = Array.isArray(data.items) ? data.items : [];

      if (incItems.length > 0) {
        for (const it of incItems) {
          const opt = document.createElement("option");
          opt.value = it.itemid;
          opt.textContent = `${it.code || it.item_code} - ${it.name || it.item_name} (Bal: ${it.balqty})`;
          opt.dataset.code = it.code || it.item_code || "";
          opt.dataset.name = it.name || it.item_name || "";
          opt.dataset.balqty = it.balqty || "0";
          opt.dataset.dcno = it.dcno || "";
          opt.dataset.dcdate = it.dcdate ? String(it.dcdate).slice(0, 10) : "";
          opt.dataset.rate = it.po_rate || "0";
          opt.dataset.discount = it.po_discount || "0";
          dom.lineItem.appendChild(opt);
        }
      } else {
        // Fallback to all items
        for (const it of meta.items) {
          const opt = document.createElement("option");
          opt.value = it.id || it.item_id;
          opt.textContent = `${it.item_code} - ${it.item_name}`;
          opt.dataset.code = it.item_code || "";
          opt.dataset.name = it.item_name || "";
          opt.dataset.balqty = "0";
          dom.lineItem.appendChild(opt);
        }
      }
    } catch (err) {
      console.error("loadAvailableItems error:", err);
    }
  }

  function onLineItemSelected() {
    const sel = dom.lineItem.selectedOptions[0];
    if (!sel || !sel.value) {
      dom.linePartic.value = "";
      dom.lineStkQty.value = "0";
      dom.lineQtyOnHand.value = "0";
      dom.linePoBalQty.value = "0";
      updateItemGuide(0);
      return;
    }
    const balQty = Number(sel.dataset.balqty || 0);
    dom.linePartic.value = sel.dataset.name || "";
    dom.lineStkQty.value = String(balQty);
    dom.lineQtyOnHand.value = String(balQty);
    dom.linePoBalQty.value = String(balQty);
    if (!Number(dom.lineQty.value || 0)) {
      dom.lineQty.value = String(balQty > 0 ? balQty : 1);
    }
    updateItemGuide(sel.value);
  }

  function clearLineInputs() {
    editingLineIndex = -1;
    dom.lineItem.value = "";
    dom.linePartic.value = "";
    dom.lineQty.value = "0";
    dom.lineStkQty.value = "0";
    dom.lineQtyOnHand.value = "0";
    dom.linePoBalQty.value = "0";
    dom.lineRem.value = "";
    dom.btnAddLine.textContent = "Add Line";
    updateItemGuide(0);
  }

  function addOrUpdateLine() {
    const itemId = Number(dom.lineItem.value || 0);
    const sel = dom.lineItem.selectedOptions[0];
    if (!itemId || !sel) {
      alert("Please select an Item Code / Part No.");
      dom.lineItem.focus();
      return;
    }
    const qty = Number(dom.lineQty.value || 0);
    if (qty <= 0) {
      alert("Quantity must be greater than 0.");
      dom.lineQty.focus();
      return;
    }

    const code = sel.dataset.code || "";
    const name = dom.linePartic.value.trim() || sel.dataset.name || "";
    const dcNo = sel.dataset.dcno || dom.refdcno.value || "";
    const dcDate = sel.dataset.dcdate || dom.refdcdate.value || "";
    const stkQty = Number(dom.lineStkQty.value || 0);
    const qtyOnHand = Number(dom.lineQtyOnHand.value || 0);
    const poBalQty = Number(dom.linePoBalQty.value || 0);
    const lineRem = dom.lineRem.value.trim();

    const rate = Number(sel.dataset.rate || 0);
    const discount = Number(sel.dataset.discount || 0);

    const lineObj = {
      itemid: itemId,
      code,
      name,
      description: name,
      qty,
      rate,
      discount,
      dcrowrem: lineRem,
      stkqty: stkQty,
      pobalqty: poBalQty,
      qtyonhand: qtyOnHand,
      refdcno: dcNo,
      refdcdate: dcDate
    };

    if (editingLineIndex >= 0 && editingLineIndex < lines.length) {
      lines[editingLineIndex] = { ...lines[editingLineIndex], ...lineObj };
    } else {
      lineObj.slno = lines.length + 1;
      lines.push(lineObj);
    }

    renderLines();
    clearLineInputs();
  }

  function editLine(idx) {
    if (idx < 0 || idx >= lines.length) return;
    const l = lines[idx];
    editingLineIndex = idx;
    dom.lineItem.value = String(l.itemid);
    if (!dom.lineItem.value) {
      // Add opt if missing
      const opt = document.createElement("option");
      opt.value = l.itemid;
      opt.textContent = `${l.code} - ${l.name}`;
      opt.dataset.code = l.code;
      opt.dataset.name = l.name;
      dom.lineItem.appendChild(opt);
      dom.lineItem.value = String(l.itemid);
    }
    dom.linePartic.value = l.name || l.description || "";
    dom.lineQty.value = String(l.qty || 0);
    dom.lineStkQty.value = String(l.stkqty || 0);
    dom.lineQtyOnHand.value = String(l.qtyonhand || l.stkqty || 0);
    dom.linePoBalQty.value = String(l.pobalqty || 0);
    dom.lineRem.value = l.dcrowrem || "";
    dom.btnAddLine.textContent = "Update Line";
    updateItemGuide(l.itemid);
  }

  function removeLine(idx) {
    if (idx < 0 || idx >= lines.length) return;
    lines.splice(idx, 1);
    // Re-number slno
    lines.forEach((l, i) => { l.slno = i + 1; });
    renderLines();
    if (editingLineIndex === idx) clearLineInputs();
  }

  function renderLines() {
    dom.tbody.innerHTML = "";
    if (lines.length === 0) {
      dom.tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #888; padding: 12px;">No line items added yet.</td></tr>';
      return;
    }

    lines.forEach((l, idx) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #e0e0e0";
      tr.innerHTML = `
        <td style="text-align: center; padding: 4px; border: 1px solid #d0d7de;">${l.slno || (idx + 1)}</td>
        <td style="padding: 4px; border: 1px solid #d0d7de; font-weight: 500;">${escapeHtml(l.code)}</td>
        <td style="padding: 4px; border: 1px solid #d0d7de;">${escapeHtml(l.name || l.description)}</td>
        <td style="text-align: right; padding: 4px; border: 1px solid #d0d7de; font-weight: bold; color: #0b4f8c;">${fmt2(l.qty)}</td>
        <td style="padding: 4px; border: 1px solid #d0d7de;">${escapeHtml(l.dcrowrem || "")}</td>
        <td style="text-align: right; padding: 4px; border: 1px solid #d0d7de;">${fmt2(l.stkqty || 0)}</td>
        <td style="text-align: right; padding: 4px; border: 1px solid #d0d7de;">${fmt2(l.qtyonhand || l.stkqty || 0)}</td>
        <td style="text-align: right; padding: 4px; border: 1px solid #d0d7de;">${fmt2(l.pobalqty || 0)}</td>
        <td style="padding: 4px; border: 1px solid #d0d7de;">${escapeHtml(l.refdcno || "")}</td>
        <td style="text-align: center; padding: 4px; border: 1px solid #d0d7de;">${l.refdcdate ? String(l.refdcdate).slice(0, 10) : ""}</td>
        <td style="text-align: center; padding: 4px; border: 1px solid #d0d7de;">
          <button type="button" class="btn" style="padding: 1px 4px; font-size: 10px;" data-edit="${idx}">Edit</button>
          <button type="button" class="btn" style="padding: 1px 4px; font-size: 10px; color: #b00;" data-del="${idx}">Del</button>
        </td>
      `;

      tr.querySelector("[data-edit]").addEventListener("click", () => editLine(idx));
      tr.querySelector("[data-del]").addEventListener("click", () => removeLine(idx));
      tr.addEventListener("click", () => updateItemGuide(l.itemid));

      dom.tbody.appendChild(tr);
    });
  }

  function applyBundle(b) {
    if (!b) return;
    meta = b;
    isLocked = Boolean(b.isLocked);

    populateSelect(dom.cust, b.customers || [], "custid", "custname", "-- Select Customer --");
    populateSelect(dom.store, b.stores || [], "id", "store_name", "-- Select Store --");
    populateSelect(dom.costcntr, b.costCenters || [], "id", "name", "-- Optional Cost Center --");

    // Default store to first can_issue store
    if (b.stores && b.stores.length > 0) {
      const defStore = b.stores.find((s) => s.can_issue) || b.stores[0];
      dom.store.value = defStore.id;
    }

    if (b.dcRecord) {
      currentNote = b.dcRecord;
      dom.dcno.value = b.dcRecord.dcno || "";
      dom.dcdate.value = b.dcRecord.dcdate ? String(b.dcRecord.dcdate).slice(0, 10) : todayStr();
      dom.cust.value = b.dcRecord.custid || "";
      dom.store.value = b.dcRecord.storeid || dom.store.value;
      dom.costcntr.value = b.dcRecord.costcntrid || "";
      dom.transport.value = b.dcRecord.transport || "";
      dom.vehicleno.value = b.dcRecord.vehicleno || "";
      dom.transfrom.value = b.dcRecord.transfrom || "";
      dom.transto.value = b.dcRecord.transto || "";
      dom.girno.value = b.dcRecord.girno || "";
      dom.dcsign.checked = Boolean(b.dcRecord.dcsign);
      dom.rem.value = b.dcRecord.dcrem || "";

      loadCustomerIncomingDcs(b.dcRecord.custid, b.dcRecord.refdcno);
      loadCustomerPOs(b.dcRecord.custid, b.dcRecord.pono);
      dom.refdcdate.value = b.dcRecord.refdcdate ? String(b.dcRecord.refdcdate).slice(0, 10) : "";
      dom.podate.value = b.dcRecord.podate ? String(b.dcRecord.podate).slice(0, 10) : "";

      lines = Array.isArray(b.lines) ? b.lines.slice() : [];
      renderLines();
      setMode("view");
    } else {
      currentNote = null;
      lines = [];
      renderLines();
      doNew();
    }

    updateNavButtons();
  }

  function updateNavButtons() {
    const nav = meta.nav || {};
    dom.btnFirst.disabled = !nav.firstId || nav.firstId === meta.activeId;
    dom.btnPrev.disabled = !nav.prevId;
    dom.btnNext.disabled = !nav.nextId;
    dom.btnLast.disabled = !nav.lastId || nav.lastId === meta.activeId;
  }

  function doNew() {
    currentNote = null;
    isLocked = false;
    lines = [];
    renderLines();
    clearLineInputs();

    dom.dcno.value = meta.nextDcNo || `${meta.nextDcId || 1}`;
    dom.dcdate.value = todayStr();
    dom.cust.value = "";
    dom.costcntr.value = "";
    dom.transport.value = "";
    dom.vehicleno.value = "";
    dom.transfrom.value = "";
    dom.transto.value = "";
    dom.refdcno.innerHTML = '<option value="">-- Select Inwards DC --</option>';
    dom.refdcdate.value = "";
    dom.pono.innerHTML = '<option value="">-- Select Work Order --</option>';
    dom.podate.value = "";
    dom.girno.value = "";
    dom.dcsign.checked = false;
    dom.rem.value = "";

    setMode("new");
    dom.cust.focus();
  }

  function doModify() {
    if (!currentNote || isLocked) return;
    setMode("edit");
  }

  async function doSave() {
    if (!dom.dcno.value.trim()) {
      alert("DC No. is required.");
      dom.dcno.focus();
      return;
    }
    const custId = Number(dom.cust.value || 0);
    if (!custId) {
      alert("Please select a Customer.");
      dom.cust.focus();
      return;
    }
    const storeId = Number(dom.store.value || 0);
    if (!storeId) {
      alert("Please select a Store.");
      dom.store.focus();
      return;
    }
    if (lines.length === 0) {
      alert("Please add at least one line item with valid quantity.");
      return;
    }

    if (!confirm("Are You Sure To Save ?")) return;

    const payload = {
      dcId: mode === "new" ? 0 : (currentNote ? currentNote.dcid : 0),
      dcNo: dom.dcno.value.trim(),
      dcDate: dom.dcdate.value,
      custId,
      storeId,
      costCntrId: Number(dom.costcntr.value || 0) || null,
      transport: dom.transport.value.trim(),
      vehicleNo: dom.vehicleno.value.trim(),
      transFrom: dom.transfrom.value.trim(),
      transTo: dom.transto.value.trim(),
      refDcNo: dom.refdcno.value.trim(),
      refDcDate: dom.refdcdate.value || null,
      poNo: dom.pono.value.trim(),
      poDate: dom.podate.value || null,
      girNo: dom.girno.value.trim(),
      dcSign: dom.dcsign.checked,
      dcRem: dom.rem.value.trim(),
      lines
    };

    try {
      const res = await apiPost("/api/labour-dc-out/save", payload);
      if (res.error) {
        alert(res.error);
        return;
      }
      alert(res.message || "Record Saved .");
      applyBundle(res);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save DC Outwards.");
    }
  }

  async function doDelete() {
    if (!currentNote || isLocked) return;
    if (!confirm("Are You Sure To Delete ?")) return;

    try {
      const res = await apiPost("/api/labour-dc-out/delete", { dcId: currentNote.dcid });
      if (res.error) {
        alert(res.error);
        return;
      }
      alert(res.message || "Record Deleted Successfully.");
      applyBundle(res);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete DC Outwards.");
    }
  }

  async function loadDc(id, dcNo) {
    let url = "/api/labour-dc-out";
    if (id) url += `?id=${encodeURIComponent(id)}`;
    else if (dcNo) url += `?dcNo=${encodeURIComponent(dcNo)}`;
    try {
      const b = await apiGet(url);
      applyBundle(b);
    } catch (err) {
      console.error("loadDc error:", err);
    }
  }

  function doPrint() {
    if (!currentNote) {
      alert("No Delivery Challan to print.");
      return;
    }
    const custSel = dom.cust.selectedOptions[0];
    const custName = custSel ? custSel.textContent : (currentNote.custname || "-");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DELIVERY CHALLAN - OUTWARDS (LABOUR)</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 10px; }
          .header-box { border: 2px solid #000; padding: 10px; margin-bottom: 12px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 8px; }
          .subtitle { text-align: center; font-size: 11px; margin-bottom: 12px; color: #444; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .info-table td { padding: 4px; vertical-align: top; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .data-table th, .data-table td { border: 1px solid #000; padding: 6px; }
          .data-table th { background: #eee; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .sign-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 4px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 10px; text-align: right;">
          <button onclick="window.print()" style="padding: 6px 14px; font-weight: bold; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 6px 14px; cursor: pointer;">Close</button>
        </div>
        <div class="header-box">
          <div class="title">DELIVERY CHALLAN - OUTWARDS (LABOUR)</div>
          <div class="subtitle">(Under Rule 4(5)(a) / 57AC of Central Excise Rules)</div>
          <table class="info-table">
            <tr>
              <td style="width: 50%;">
                <b>To Customer:</b><br>
                ${escapeHtml(custName)}<br>
                ${escapeHtml(currentNote.transfrom ? `From: ${currentNote.transfrom}` : "")}<br>
                ${escapeHtml(currentNote.transto ? `To: ${currentNote.transto}` : "")}
              </td>
              <td style="width: 50%;">
                <b>DC No.:</b> ${escapeHtml(currentNote.dcno)}<br>
                <b>DC Date:</b> ${currentNote.dcdate ? String(currentNote.dcdate).slice(0, 10) : ""}<br>
                <b>Ref. Customer DC:</b> ${escapeHtml(currentNote.refdcno || "-")}<br>
                <b>Customer PO No.:</b> ${escapeHtml(currentNote.pono || "-")}<br>
                <b>Mode of Transport:</b> ${escapeHtml(currentNote.transport || "-")}<br>
                <b>Vehicle No.:</b> ${escapeHtml(currentNote.vehicleno || "-")}
              </td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Sl.No</th>
                <th style="text-align: left;">Item Code / Part No.</th>
                <th style="text-align: left;">Particulars</th>
                <th style="width: 80px; text-align: right;">Qty</th>
                <th style="text-align: left;">Remarks</th>
                <th style="width: 100px; text-align: left;">Inward DC No</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((l, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${escapeHtml(l.code)}</td>
                  <td>${escapeHtml(l.name || l.description)}</td>
                  <td style="text-align: right; font-weight: bold;">${fmt2(l.qty)}</td>
                  <td>${escapeHtml(l.dcrowrem || "")}</td>
                  <td>${escapeHtml(l.refdcno || "-")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          ${currentNote.dcrem ? `<p style="margin-top: 10px;"><b>Remarks:</b> ${escapeHtml(currentNote.dcrem)}</p>` : ""}

          <div class="footer">
            <div class="sign-box">Prepared By</div>
            <div class="sign-box">Receiver's Signature</div>
            <div class="sign-box">Authorised Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Delivery Challan - Outwards (${currentNote.dcno})`, html);
    } else {
      const win = window.open("", "_blank", "width=850,height=900");
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    }
  }

  function bindEvents() {
    dom.btnX.addEventListener("click", () => window.closeLabourDCOut && window.closeLabourDCOut());
    dom.btnClose.addEventListener("click", () => window.closeLabourDCOut && window.closeLabourDCOut());

    dom.cust.addEventListener("change", () => {
      const custId = Number(dom.cust.value || 0);
      loadCustomerIncomingDcs(custId);
      loadCustomerPOs(custId);
      loadAvailableItems();
    });

    dom.refdcno.addEventListener("change", onRefDcSelected);
    dom.pono.addEventListener("change", onPoSelected);
    dom.lineItem.addEventListener("change", onLineItemSelected);

    dom.btnAddLine.addEventListener("click", addOrUpdateLine);
    dom.btnClearLine.addEventListener("click", clearLineInputs);

    dom.btnNew.addEventListener("click", doNew);
    dom.btnModify.addEventListener("click", doModify);
    dom.btnSave.addEventListener("click", doSave);
    dom.btnDelete.addEventListener("click", doDelete);
    dom.btnPrint.addEventListener("click", doPrint);

    dom.btnFind.addEventListener("click", () => {
      const q = dom.searchNo.value.trim();
      if (q) loadDc(0, q);
    });
    dom.searchNo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        dom.btnFind.click();
      }
    });

    dom.btnFirst.addEventListener("click", () => meta.nav.firstId && loadDc(meta.nav.firstId));
    dom.btnPrev.addEventListener("click", () => meta.nav.prevId && loadDc(meta.nav.prevId));
    dom.btnNext.addEventListener("click", () => meta.nav.nextId && loadDc(meta.nav.nextId));
    dom.btnLast.addEventListener("click", () => meta.nav.lastId && loadDc(meta.nav.lastId));
  }

  window.openLabourDCOut = function () {
    if (window.closeAllForms) window.closeAllForms();
    dom.section.hidden = false;
    loadDc(0);
  };

  window.closeLabourDCOut = function () {
    dom.section.hidden = true;
  };

  bindEvents();
})();
