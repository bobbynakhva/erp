(() => {
  let mode = "view"; // "view" | "new" | "edit"
  let currentNote = null;
  let lines = [];
  let meta = {
    customers: [],
    stores: [],
    costCenters: [],
    items: [],
    nextId: 1,
    activeId: 0,
    nav: {}
  };
  let isLocked = false;

  const dom = {
    section: document.getElementById("labour-dc-in"),
    btnX: document.getElementById("dcin-btn-x"),
    btnClose: document.getElementById("dcin-btn-close"),
    btnCorres: document.getElementById("dcin-btn-corres"),

    cust: document.getElementById("dcin-cust"),
    store: document.getElementById("dcin-store"),
    costcntr: document.getElementById("dcin-costcntr"),
    transport: document.getElementById("dcin-transport"),
    vehicleno: document.getElementById("dcin-vehicleno"),
    transfrom: document.getElementById("dcin-transfrom"),
    transto: document.getElementById("dcin-transto"),

    dcno: document.getElementById("dcin-dcno"),
    dcdate: document.getElementById("dcin-dcdate"),
    pono: document.getElementById("dcin-pono"),
    podate: document.getElementById("dcin-podate"),
    lblOpenPO: document.getElementById("dcin-lbl-openpo"),
    lblPOCancl: document.getElementById("dcin-lbl-pcancl"),
    rem: document.getElementById("dcin-rem"),

    lineItemIn: document.getElementById("dcin-line-item-in"),
    lineQtyIn: document.getElementById("dcin-line-qtyin"),
    lineItemOut: document.getElementById("dcin-line-item-out"),
    lineQtyOut: document.getElementById("dcin-line-qtyout"),
    lineRem: document.getElementById("dcin-line-rem"),
    btnAddLine: document.getElementById("dcin-btn-add-line"),
    btnClearLine: document.getElementById("dcin-btn-clear-line"),

    tbody: document.getElementById("dcin-tbody"),
    lblItemGuide: document.getElementById("dcin-lbl-item-guide"),
    statusBadge: document.getElementById("dcin-status-badge"),

    searchNo: document.getElementById("dcin-search-no"),
    btnFind: document.getElementById("dcin-btn-find"),

    btnNew: document.getElementById("dcin-btn-new"),
    btnSave: document.getElementById("dcin-btn-save"),
    btnModify: document.getElementById("dcin-btn-modify"),
    btnDelete: document.getElementById("dcin-btn-delete"),
    btnFirst: document.getElementById("dcin-btn-first"),
    btnPrev: document.getElementById("dcin-btn-prev"),
    btnNext: document.getElementById("dcin-btn-next"),
    btnLast: document.getElementById("dcin-btn-last"),
    btnPrint: document.getElementById("dcin-btn-print")
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

    dom.dcno.readOnly = !isEdit;
    dom.dcdate.readOnly = !isEdit;
    dom.pono.disabled = !isEdit;
    dom.podate.readOnly = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.lineItemIn.disabled = !isEdit;
    dom.lineQtyIn.readOnly = !isEdit;
    dom.lineItemOut.disabled = !isEdit;
    dom.lineQtyOut.readOnly = !isEdit;
    dom.lineRem.readOnly = !isEdit;
    dom.btnAddLine.disabled = !isEdit;
    dom.btnClearLine.disabled = !isEdit;

    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote || isLocked;
    dom.btnDelete.disabled = isEdit || !currentNote || isLocked;
    dom.btnNew.disabled = (mode === "new");

    dom.statusBadge.textContent = isLocked ? "LOCKED (Items Returned / Processed)" : (isEdit ? `[${mode.toUpperCase()}]` : "");
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
      dom.lblItemGuide.textContent = "ITEM:      UOM:      DETAILS: ";
      return;
    }
    const it = meta.items.find((x) => Number(x.item_id) === id);
    if (it) {
      dom.lblItemGuide.textContent = `ITEM: ${it.item_code}    UOM: ${it.measure_unit || "-"}    DETAILS: ${it.item_name || "-"}`;
    }
  }

  async function loadCustomerPOs(custId, selectedPoNo) {
    dom.pono.innerHTML = '<option value="">-- Select Work Order --</option>';
    if (!custId) return;
    try {
      const data = await apiGet(`/api/labour-dc-in/customer-pos?custId=${encodeURIComponent(custId)}`);
      const pos = Array.isArray(data.pos) ? data.pos : [];
      for (const p of pos) {
        const opt = document.createElement("option");
        opt.value = p.pono;
        opt.textContent = p.pono;
        opt.dataset.podate = p.podate ? String(p.podate).slice(0, 10) : "";
        opt.dataset.isopenpo = p.isopenpo ? "1" : "0";
        opt.dataset.costcntrid = p.costcntrid || "";
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
    const selOpt = dom.pono.selectedOptions[0];
    if (!selOpt || !selOpt.value) {
      dom.lblOpenPO.textContent = "";
      return;
    }
    if (selOpt.dataset.podate) {
      dom.podate.value = selOpt.dataset.podate;
    }
    if (selOpt.dataset.isopenpo === "1") {
      dom.lblOpenPO.textContent = "This is an Open PO.";
    } else {
      dom.lblOpenPO.textContent = "";
    }
    if (selOpt.dataset.costcntrid) {
      dom.costcntr.value = selOpt.dataset.costcntrid;
    }
  }

  function renderGrid() {
    dom.tbody.innerHTML = "";
    if (!lines || lines.length === 0) {
      dom.tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #777; padding: 12px;">No items entered yet.</td></tr>';
      return;
    }

    lines.forEach((line, idx) => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td style="text-align: center; border: 1px solid #bcc9d8; padding: 4px;">${idx + 1}</td>
        <td style="border: 1px solid #bcc9d8; padding: 4px;">${escapeHtml(line.itemcode_in || "-")}</td>
        <td style="text-align: right; border: 1px solid #bcc9d8; padding: 4px;">${fmt2(line.qtyin)}</td>
        <td style="border: 1px solid #bcc9d8; padding: 4px;">${escapeHtml(line.itemcode_out || "-")}</td>
        <td style="text-align: right; border: 1px solid #bcc9d8; padding: 4px;">${fmt2(line.qty)}</td>
        <td style="border: 1px solid #bcc9d8; padding: 4px;">${escapeHtml(line.dcrowrem || "")}</td>
        <td style="text-align: right; border: 1px solid #bcc9d8; padding: 4px;">${fmt2(line.balqty !== undefined ? line.balqty : line.qty)}</td>
        <td style="text-align: center; border: 1px solid #bcc9d8; padding: 4px;">
          ${mode !== "view" ? `<button type="button" class="dcin-del-row-btn" data-index="${idx}" style="color: red; cursor: pointer; border: none; background: transparent; font-weight: bold;">×</button>` : ""}
        </td>
      `;

      tr.addEventListener("click", (e) => {
        if (e.target.classList.contains("dcin-del-row-btn")) return;
        if (line.itemidin) updateItemGuide(line.itemidin);
        else if (line.itemid) updateItemGuide(line.itemid);
      });

      dom.tbody.appendChild(tr);
    });

    dom.tbody.querySelectorAll(".dcin-del-row-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = Number(btn.dataset.index);
        lines.splice(index, 1);
        renderGrid();
      });
    });
  }

  function populateBundle(data) {
    if (!data) return;
    meta.customers = data.customers || [];
    meta.stores = data.stores || [];
    meta.costCenters = data.costCenters || [];
    meta.items = data.items || [];
    meta.nextId = data.nextId || 1;
    meta.activeId = data.activeId || 0;
    meta.nav = data.nav || {};
    isLocked = data.isLocked === true;

    populateSelect(dom.cust, meta.customers, "cust_id", "cust_name", "-- Select Customer --");
    populateSelect(dom.store, meta.stores, "store_id", "store_name", "-- Select Store --");
    populateSelect(dom.costcntr, meta.costCenters, "id", "cost_cntr", "-- Select Cost Center --");

    // Populate Item selectors
    populateSelect(dom.lineItemIn, meta.items, "item_id", "item_code", "-- IN Item --");
    populateSelect(dom.lineItemOut, meta.items, "item_id", "item_code", "-- OUT Item --");

    currentNote = data.dcRecord || null;
    lines = Array.isArray(data.lines) ? data.lines : [];

    if (currentNote) {
      dom.cust.value = currentNote.custid || "";
      dom.store.value = currentNote.storeid || "";
      dom.costcntr.value = currentNote.costcntrid || "";
      dom.transport.value = currentNote.transport || "";
      dom.vehicleno.value = currentNote.vehicleno || "";
      dom.transfrom.value = currentNote.transfrom || currentNote.origin || "";
      dom.transto.value = currentNote.transto || "";

      dom.dcno.value = currentNote.dcno || "";
      dom.dcdate.value = currentNote.dcdate ? String(currentNote.dcdate).slice(0, 10) : todayStr();
      dom.podate.value = currentNote.podate ? String(currentNote.podate).slice(0, 10) : "";
      dom.rem.value = currentNote.dcrem || "";

      loadCustomerPOs(currentNote.custid, currentNote.pono);
      setMode("view");
    } else {
      resetForm();
      setMode("new");
    }

    renderGrid();
    updateNavButtons();
  }

  function resetForm() {
    currentNote = null;
    lines = [];
    isLocked = false;
    dom.cust.value = "";
    dom.store.value = "";
    dom.costcntr.value = "";
    dom.transport.value = "";
    dom.vehicleno.value = "";
    dom.transfrom.value = "";
    dom.transto.value = "";

    dom.dcno.value = "";
    dom.dcdate.value = todayStr();
    dom.pono.innerHTML = '<option value="">-- Select Work Order --</option>';
    dom.podate.value = todayStr();
    dom.lblOpenPO.textContent = "";
    dom.lblPOCancl.textContent = "";
    dom.rem.value = "";

    dom.lineItemIn.value = "";
    dom.lineQtyIn.value = "0";
    dom.lineItemOut.value = "";
    dom.lineQtyOut.value = "0";
    dom.lineRem.value = "";

    renderGrid();
  }

  function updateNavButtons() {
    const nav = meta.nav || {};
    dom.btnFirst.disabled = (mode !== "view") || !nav.firstId || nav.firstId === meta.activeId;
    dom.btnPrev.disabled = (mode !== "view") || !nav.prevId;
    dom.btnNext.disabled = (mode !== "view") || !nav.nextId;
    dom.btnLast.disabled = (mode !== "view") || !nav.lastId || nav.lastId === meta.activeId;
  }

  // --- Handlers ---
  dom.cust.addEventListener("change", () => {
    const custId = Number(dom.cust.value || 0);
    loadCustomerPOs(custId, "");
  });

  dom.pono.addEventListener("change", () => {
    onPoSelected();
  });

  dom.lineItemIn.addEventListener("change", () => {
    updateItemGuide(dom.lineItemIn.value);
    if (dom.lineItemIn.value && !dom.lineItemOut.value) {
      dom.lineItemOut.value = dom.lineItemIn.value;
      updateItemGuide(dom.lineItemOut.value);
    }
  });

  dom.lineQtyIn.addEventListener("input", () => {
    if (Number(dom.lineQtyIn.value || 0) > 0 && !Number(dom.lineQtyOut.value || 0)) {
      dom.lineQtyOut.value = dom.lineQtyIn.value;
    }
  });

  dom.lineItemOut.addEventListener("change", () => {
    updateItemGuide(dom.lineItemOut.value);
  });

  dom.btnAddLine.addEventListener("click", () => {
    let inId = Number(dom.lineItemIn.value || 0);
    let inQty = Number(dom.lineQtyIn.value || 0);
    let outId = Number(dom.lineItemOut.value || 0);
    let outQty = Number(dom.lineQtyOut.value || 0);
    const rem = String(dom.lineRem.value || "").trim();

    if (!inId && !outId) {
      alert("Please select at least an IN component or an OUT component item.");
      return;
    }

    if (inId && !outId) {
      outId = inId;
      outQty = (outQty > 0 ? outQty : inQty);
    } else if (outId && !inId) {
      inId = outId;
      inQty = (inQty > 0 ? inQty : outQty);
    }

    const itIn = meta.items.find((x) => Number(x.item_id || x.id) === inId);
    const itOut = meta.items.find((x) => Number(x.item_id || x.id) === outId);

    lines.push({
      slno: lines.length + 1,
      itemidin: inId,
      itemcode_in: itIn ? itIn.item_code : "",
      itemname_in: itIn ? itIn.item_name : "",
      uom_in: itIn ? itIn.measure_unit : "",
      qtyin: inQty,
      itemid: outId,
      itemcode_out: itOut ? itOut.item_code : "",
      itemname_out: itOut ? itOut.item_name : "",
      uom_out: itOut ? itOut.measure_unit : "",
      qty: outQty,
      balqty: outQty,
      dcrowrem: rem
    });

    // Clear line inputs
    dom.lineItemIn.value = "";
    dom.lineQtyIn.value = "0";
    dom.lineItemOut.value = "";
    dom.lineQtyOut.value = "0";
    dom.lineRem.value = "";

    renderGrid();
  });

  dom.btnClearLine.addEventListener("click", () => {
    dom.lineItemIn.value = "";
    dom.lineQtyIn.value = "0";
    dom.lineItemOut.value = "";
    dom.lineQtyOut.value = "0";
    dom.lineRem.value = "";
  });

  dom.btnNew.addEventListener("click", () => {
    resetForm();
    setMode("new");
    dom.cust.focus();
  });

  dom.btnModify.addEventListener("click", () => {
    if (!currentNote) return;
    if (isLocked) {
      alert("You cannot modify this DC , since some Finished items has been returned back to the customer.");
      return;
    }
    setMode("edit");
    dom.dcno.focus();
  });

  dom.btnSave.addEventListener("click", async () => {
    const custId = Number(dom.cust.value || 0);
    if (!custId) {
      alert("Please Select a Customer.....");
      dom.cust.focus();
      return;
    }

    const storeId = Number(dom.store.value || 0);
    if (!storeId) {
      alert("Please Select a Store from the list");
      dom.store.focus();
      return;
    }

    const dcNo = String(dom.dcno.value || "").trim();
    if (!dcNo) {
      alert("Enter the DC Number ");
      dom.dcno.focus();
      return;
    }

    if (!lines || lines.length === 0) {
      alert("Enter valid 'Item Code/Part No. - IN' for the SlNo.");
      return;
    }

    if (!confirm("Are You Sure To Save?")) {
      return;
    }

    const payload = {
      isNew: (mode === "new"),
      dcId: currentNote ? currentNote.dcid : 0,
      custId,
      storeId,
      costCntrId: Number(dom.costcntr.value || 0),
      dcNo,
      dcDate: dom.dcdate.value,
      poNo: dom.pono.value,
      poDate: dom.podate.value,
      transport: dom.transport.value,
      vehicleNo: dom.vehicleno.value,
      transFrom: dom.transfrom.value,
      transTo: dom.transto.value,
      remarks: dom.rem.value,
      lines
    };

    try {
      const resp = await apiPost("/api/labour-dc-in/save", payload);
      if (resp.error) {
        alert(resp.error);
        return;
      }
      populateBundle(resp);
      alert(resp.message || "Record Saved .");
    } catch (err) {
      console.error("Save DC Inwards error:", err);
      alert("Failed to save DC Inwards: " + err.message);
    }
  });

  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote || !currentNote.dcid) return;
    if (isLocked) {
      alert("You cannot delete this DC , since some Finished items has been returned back to the customer.");
      return;
    }
    if (!confirm("Are You Sure to Delete?")) return;

    try {
      const resp = await apiPost("/api/labour-dc-in/delete", { dcId: currentNote.dcid });
      if (resp.error) {
        alert(resp.error);
        return;
      }
      populateBundle(resp);
      alert(resp.message || "Record Deleted.");
    } catch (err) {
      console.error("Delete DC Inwards error:", err);
      alert("Failed to delete DC Inwards: " + err.message);
    }
  });

  dom.btnFind.addEventListener("click", async () => {
    const dcNo = String(dom.searchNo.value || "").trim();
    if (!dcNo) return;
    try {
      const data = await apiGet(`/api/labour-dc-in?dcNo=${encodeURIComponent(dcNo)}`);
      if (data.dcRecord) {
        populateBundle(data);
      } else {
        alert("Record not found for DC No: " + dcNo);
      }
    } catch (err) {
      console.error("Find error:", err);
    }
  });

  dom.searchNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.btnFind.click();
    }
  });

  dom.btnFirst.addEventListener("click", async () => {
    if (meta.nav?.firstId) populateBundle(await apiGet(`/api/labour-dc-in?id=${meta.nav.firstId}`));
  });

  dom.btnPrev.addEventListener("click", async () => {
    if (meta.nav?.prevId) populateBundle(await apiGet(`/api/labour-dc-in?id=${meta.nav.prevId}`));
  });

  dom.btnNext.addEventListener("click", async () => {
    if (meta.nav?.nextId) populateBundle(await apiGet(`/api/labour-dc-in?id=${meta.nav.nextId}`));
  });

  dom.btnLast.addEventListener("click", async () => {
    if (meta.nav?.lastId) populateBundle(await apiGet(`/api/labour-dc-in?id=${meta.nav.lastId}`));
  });

  // --- Print Preview ---
  dom.btnPrint.addEventListener("click", () => {
    if (!currentNote) {
      alert("No Delivery Challan to print.");
      return;
    }

    const custObj = meta.customers.find((c) => Number(c.cust_id) === Number(currentNote.custid));
    const storeObj = meta.stores.find((s) => Number(s.store_id) === Number(currentNote.storeid));

    let rowsHtml = "";
    lines.forEach((l, i) => {
      rowsHtml += `
        <tr>
          <td style="text-align: center; border: 1px solid #444; padding: 6px;">${i + 1}</td>
          <td style="border: 1px solid #444; padding: 6px;"><b>${escapeHtml(l.itemcode_in || "-")}</b><br><small>${escapeHtml(l.itemname_in || "")}</small></td>
          <td style="text-align: right; border: 1px solid #444; padding: 6px;">${fmt2(l.qtyin)} ${escapeHtml(l.uom_in || "")}</td>
          <td style="border: 1px solid #444; padding: 6px;"><b>${escapeHtml(l.itemcode_out || "-")}</b><br><small>${escapeHtml(l.itemname_out || "")}</small></td>
          <td style="text-align: right; border: 1px solid #444; padding: 6px;">${fmt2(l.qty)} ${escapeHtml(l.uom_out || "")}</td>
          <td style="border: 1px solid #444; padding: 6px;">${escapeHtml(l.dcrowrem || "")}</td>
        </tr>
      `;
    });

    const printHtml = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">DELIVERY CHALLAN - INWARDS</h2>
          <div style="font-size: 13px; font-weight: bold; color: #444;">(Job Work / Labour Process Material Receipt)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px;">
          <tr>
            <td style="width: 50%; vertical-align: top; border: 1px solid #444; padding: 8px;">
              <b>From Customer:</b><br>
              <div style="font-size: 14px; font-weight: bold; margin: 4px 0;">${escapeHtml(custObj?.cust_name || "-")}</div>
              <div>${escapeHtml(custObj?.cust_addr || "")}</div>
              <div>Contact: ${escapeHtml(custObj?.contact || "-")}</div>
              <div style="margin-top: 6px;"><b>Add To Store:</b> ${escapeHtml(storeObj?.store_name || "-")}</div>
            </td>
            <td style="width: 50%; vertical-align: top; border: 1px solid #444; padding: 8px;">
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="font-weight: bold; width: 45%;">Customer DC No.:</td><td>${escapeHtml(currentNote.dcno || "-")}</td></tr>
                <tr><td style="font-weight: bold;">DC Date:</td><td>${currentNote.dcdate ? String(currentNote.dcdate).slice(0, 10) : "-"}</td></tr>
                <tr><td style="font-weight: bold;">Customer PO No.:</td><td>${escapeHtml(currentNote.pono || "-")}</td></tr>
                <tr><td style="font-weight: bold;">PO Date:</td><td>${currentNote.podate ? String(currentNote.podate).slice(0, 10) : "-"}</td></tr>
                <tr><td style="font-weight: bold;">Mode of Transport:</td><td>${escapeHtml(currentNote.transport || "-")}</td></tr>
                <tr><td style="font-weight: bold;">Vehicle Number:</td><td>${escapeHtml(currentNote.vehicleno || "-")}</td></tr>
                <tr><td style="font-weight: bold;">From / To:</td><td>${escapeHtml(currentNote.transfrom || "-")} / ${escapeHtml(currentNote.transto || "-")}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px;">
          <thead>
            <tr style="background: #eee;">
              <th style="width: 40px; border: 1px solid #444; padding: 6px;">SlNo</th>
              <th style="border: 1px solid #444; padding: 6px; text-align: left;">Raw Material / Part (IN)</th>
              <th style="width: 90px; border: 1px solid #444; padding: 6px; text-align: right;">Qty (IN)</th>
              <th style="border: 1px solid #444; padding: 6px; text-align: left;">Processed Part (OUT)</th>
              <th style="width: 90px; border: 1px solid #444; padding: 6px; text-align: right;">Qty (OUT)</th>
              <th style="border: 1px solid #444; padding: 6px; text-align: left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${currentNote.dcrem ? `<div style="font-size: 12px; margin-bottom: 16px;"><b>Remarks:</b> ${escapeHtml(currentNote.dcrem)}</div>` : ""}

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
          <div style="text-align: center; width: 200px; border-top: 1px solid #666; padding-top: 4px;">
            Receiver's Signature
          </div>
          <div style="text-align: center; width: 200px; border-top: 1px solid #666; padding-top: 4px;">
            Authorized Signatory
          </div>
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview("Delivery Challan - Inwards", printHtml);
    } else {
      const w = window.open("", "_blank");
      w.document.write(`<html><head><title>Print Preview</title></head><body style="padding: 20px;">${printHtml}</body></html>`);
      w.document.close();
    }
  });

  function closeWindow() {
    dom.section.hidden = true;
  }

  dom.btnX.addEventListener("click", closeWindow);
  dom.btnClose.addEventListener("click", closeWindow);

  window.openLabourDCIn = async function() {
    // Hide all windows
    document.querySelectorAll(".mfgpo-window, .content-section, #invoice-mfg, #labour-po").forEach((el) => {
      el.hidden = true;
    });
    dom.section.hidden = false;
    try {
      const data = await apiGet("/api/labour-dc-in");
      populateBundle(data);
    } catch (err) {
      console.error("openLabourDCIn error:", err);
    }
  };
})();
