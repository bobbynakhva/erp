(() => {
  let state = {
    mode: "view", // "view" | "new" | "modify"
    note: null,
    lines: [],
    meta: {
      vendors: [],
      costCenters: [],
      stores: [],
      grnTypes: [],
      defaultStoreId: 0,
      openPOs: []
    },
    availableItems: [], // items for dropdown picker
    nextId: 1,
    isLocked: false,
    lockReason: ""
  };

  const section = document.getElementById("grn");
  if (!section) return;

  const txtPurchId = document.getElementById("grn-purch-id");
  const txtDateTime = document.getElementById("grn-date-time");
  const cmbVendor = document.getElementById("grn-vendor");
  const cmbCostCntr = document.getElementById("grn-cost-cntr");
  const txtTransport = document.getElementById("grn-transport");
  const txtVehicle = document.getElementById("grn-vehicle");
  const txtTransFrom = document.getElementById("grn-trans-from");
  const txtTransTo = document.getElementById("grn-trans-to");
  const txtDcNo = document.getElementById("grn-dc-no");
  const dtpDcDate = document.getElementById("grn-dc-date");
  const cmbPoNo = document.getElementById("grn-po-no");
  const dtpPoDate = document.getElementById("grn-po-date");
  const openPoBanner = document.getElementById("grn-open-po-banner");
  const txtGrnType = document.getElementById("grn-type");
  const grnTypesList = document.getElementById("grn-types-list");
  const txtRemarks = document.getElementById("grn-remarks");
  const cmbStore = document.getElementById("grn-store");
  const itemsBody = document.getElementById("grn-items-body");
  const btnAddLine = document.getElementById("grn-btn-add-line");
  const txtSearchId = document.getElementById("grn-search-id");
  const btnSearch = document.getElementById("grn-btn-search");

  // Toolbar buttons
  const btnNew = document.getElementById("grn-btn-new");
  const btnSave = document.getElementById("grn-btn-save");
  const btnModify = document.getElementById("grn-btn-modify");
  const btnDelete = document.getElementById("grn-btn-delete");
  const btnFirst = document.getElementById("grn-btn-first");
  const btnPrev = document.getElementById("grn-btn-prev");
  const btnNext = document.getElementById("grn-btn-next");
  const btnLast = document.getElementById("grn-btn-last");
  const btnPrint = document.getElementById("grn-btn-print");
  const btnClose = document.getElementById("grn-btn-close");
  const btnX = document.getElementById("grn-btn-x");

  function nowIsoDate() {
    return new Date().toISOString().split("T")[0];
  }

  function nowIsoDateTime() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function renderSelectOptions(selectElem, items, valueField, textField, emptyLabel) {
    let html = emptyLabel ? `<option value="">${emptyLabel}</option>` : "";
    items.forEach((it) => {
      const val = it[valueField];
      const txt = it[textField];
      html += `<option value="${val}">${escapeHtml(String(txt))}</option>`;
    });
    selectElem.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadBundle(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.message && !data.note) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadBundle error:", err);
      alert("Failed to load GRN data: " + err.message);
    }
  }

  function applyBundle(data) {
    state.meta = data.meta || state.meta;
    state.note = data.note || null;
    state.lines = Array.isArray(data.lines) ? data.lines : [];
    state.nextId = data.nextId || 1;
    state.isLocked = !!data.isLocked;
    state.lockReason = data.lockReason || "";

    // Populate Datalist for GRN types
    if (grnTypesList && state.meta.grnTypes) {
      grnTypesList.innerHTML = state.meta.grnTypes.map((t) => `<option value="${escapeHtml(t)}"></option>`).join("");
    }

    // Populate dropdowns
    renderSelectOptions(cmbVendor, state.meta.vendors, "code", "name", "-- Select Vendor --");
    renderSelectOptions(cmbCostCntr, state.meta.costCenters, "id", "name", "(None)");
    renderSelectOptions(cmbStore, state.meta.stores, "id", "name", "-- Select Store --");

    if (state.note) {
      state.mode = "view";
      populateForm(state.note);
    } else {
      state.mode = "new";
      resetNewForm();
    }
    updateUiMode();
    renderGrid();
  }

  function populateForm(note) {
    txtPurchId.value = note.purchId || "";
    txtDateTime.value = note.grnDateTime ? note.grnDateTime.slice(0, 16) : nowIsoDateTime();
    cmbVendor.value = note.vendorCode || "";
    cmbCostCntr.value = note.costCntrId || "";
    txtTransport.value = note.transport || "";
    txtVehicle.value = note.vehicleNo || "";
    txtTransFrom.value = note.transFrom || "";
    txtTransTo.value = note.transTo || "";
    txtDcNo.value = note.dcNo || "";
    dtpDcDate.value = note.dcDate || nowIsoDate();
    txtRemarks.value = note.remark || "";
    txtGrnType.value = note.grnType || "";
    cmbStore.value = note.storeId || state.meta.defaultStoreId || "";

    // Open PO banner
    openPoBanner.style.display = note.isOpenPo ? "block" : "none";

    // Populate POs
    if (state.meta.openPOs && state.meta.openPOs.length) {
      renderSelectOptions(cmbPoNo, state.meta.openPOs, "poNo", "poNo", "(None)");
      cmbPoNo.value = note.poNo || "";
    } else if (note.poNo) {
      cmbPoNo.innerHTML = `<option value="${escapeHtml(note.poNo)}">${escapeHtml(note.poNo)}</option>`;
      cmbPoNo.value = note.poNo;
    } else {
      cmbPoNo.innerHTML = '<option value="">(None)</option>';
    }
    dtpPoDate.value = note.poDate || note.poDateT || "";
  }

  function resetNewForm() {
    txtPurchId.value = state.nextId || "";
    txtDateTime.value = nowIsoDateTime();
    cmbVendor.value = "";
    cmbCostCntr.value = "";
    txtTransport.value = "";
    txtVehicle.value = "";
    txtTransFrom.value = "";
    txtTransTo.value = "";
    txtDcNo.value = "";
    dtpDcDate.value = nowIsoDate();
    cmbPoNo.innerHTML = '<option value="">(None)</option>';
    cmbPoNo.value = "";
    dtpPoDate.value = "";
    openPoBanner.style.display = "none";
    txtGrnType.value = "";
    txtRemarks.value = "";
    cmbStore.value = state.meta.defaultStoreId || "";
    state.lines = [];
    state.availableItems = [];
    state.isLocked = false;
    state.lockReason = "";
  }

  function updateUiMode() {
    const isEditing = state.mode === "new" || state.mode === "modify";
    const inputs = [
      cmbVendor, cmbCostCntr, txtTransport, txtVehicle, txtTransFrom, txtTransTo,
      txtDcNo, dtpDcDate, cmbPoNo, txtGrnType, txtRemarks, cmbStore
    ];
    inputs.forEach((ctrl) => {
      if (ctrl) ctrl.disabled = !isEditing;
    });

    if (btnAddLine) btnAddLine.disabled = !isEditing;
    if (btnSave) btnSave.disabled = !isEditing;
    if (btnModify) btnModify.disabled = isEditing || !state.note || state.isLocked;
    if (btnDelete) btnDelete.disabled = isEditing || !state.note || state.isLocked;
    if (btnNew) btnNew.disabled = isEditing && state.mode === "new";

    // Navigation buttons disabled during editing
    [btnFirst, btnPrev, btnNext, btnLast, btnSearch].forEach((b) => {
      if (b) b.disabled = isEditing;
    });
  }

  async function onVendorChanged() {
    const vendorCode = Number(cmbVendor.value) || 0;
    state.lines = [];
    state.availableItems = [];
    cmbPoNo.innerHTML = '<option value="">(None)</option>';
    dtpPoDate.value = "";
    openPoBanner.style.display = "none";

    if (!vendorCode) {
      renderGrid();
      return;
    }

    try {
      // Load POs for vendor
      const res = await fetch(`/api/grn/pos?vendor=${vendorCode}`);
      if (res.ok) {
        const data = await res.json();
        state.meta.openPOs = data.pos || [];
        renderSelectOptions(cmbPoNo, state.meta.openPOs, "poNo", "poNo", "(None)");
      }

      // Load vendor items (for when no PO is used)
      const vItemsRes = await fetch(`/api/grn/vendor-items?vendor=${vendorCode}`);
      if (vItemsRes.ok) {
        const vData = await vItemsRes.json();
        state.availableItems = vData.items || [];
      }
    } catch (err) {
      console.error("Error loading vendor POs/items:", err);
    }

    renderGrid();
  }

  async function onPoChanged() {
    const poNo = String(cmbPoNo.value || "").trim();
    const vendorCode = Number(cmbVendor.value) || 0;
    dtpPoDate.value = "";
    openPoBanner.style.display = "none";
    state.lines = [];

    if (!poNo) {
      // Revert to vendor master items
      renderGrid();
      return;
    }

    const selectedPo = (state.meta.openPOs || []).find((p) => p.poNo === poNo);
    if (selectedPo) {
      dtpPoDate.value = selectedPo.poDate || "";
      openPoBanner.style.display = selectedPo.isOpenPo ? "block" : "none";
      if (selectedPo.costCntrId) {
        cmbCostCntr.value = selectedPo.costCntrId;
      }
    }

    try {
      const res = await fetch(`/api/grn/po-items?pono=${encodeURIComponent(poNo)}&vendor=${vendorCode}`);
      if (res.ok) {
        const data = await res.json();
        const poItems = data.items || [];
        state.availableItems = poItems;

        // Auto-populate grid with PO items
        state.lines = poItems.map((item, idx) => ({
          slno: idx + 1,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          catCode: item.catCode || 0,
          dnQty: item.balQty || item.poQty || 0,
          qty: item.balQty || item.poQty || 0,
          rejQty: 0,
          toStock: item.balQty || item.poQty || 0,
          poBalQty: item.balQty || 0
        }));
      }
    } catch (err) {
      console.error("Error loading PO items:", err);
    }

    renderGrid();
  }

  function renderGrid() {
    if (!itemsBody) return;
    itemsBody.innerHTML = "";
    const isEditing = state.mode === "new" || state.mode === "modify";

    state.lines.forEach((line, idx) => {
      const row = document.createElement("tr");
      row.dataset.index = idx;

      // Sl.No
      const tdSl = document.createElement("td");
      tdSl.style.textAlign = "center";
      tdSl.textContent = idx + 1;
      row.appendChild(tdSl);

      // Item Code / Part No
      const tdCode = document.createElement("td");
      if (isEditing) {
        const select = document.createElement("select");
        select.className = "grn-ctrl";
        let opts = `<option value="">-- Select Item --</option>`;
        state.availableItems.forEach((it) => {
          const selected = Number(it.itemId) === Number(line.itemId) ? "selected" : "";
          opts += `<option value="${it.itemId}" ${selected}>${escapeHtml(it.itemCode)}</option>`;
        });
        select.innerHTML = opts;
        select.addEventListener("change", (e) => {
          const selId = Number(e.target.value);
          const found = state.availableItems.find((it) => Number(it.itemId) === selId);
          if (found) {
            line.itemId = found.itemId;
            line.itemCode = found.itemCode;
            line.itemName = found.itemName;
            line.catCode = found.catCode || 0;
            line.poBalQty = found.balQty || 0;
          } else {
            line.itemId = 0;
            line.itemCode = "";
            line.itemName = "";
            line.catCode = 0;
            line.poBalQty = 0;
          }
          renderGrid();
        });
        tdCode.appendChild(select);
      } else {
        tdCode.textContent = line.itemCode || "";
      }
      row.appendChild(tdCode);

      // Item Name
      const tdName = document.createElement("td");
      tdName.textContent = line.itemName || "";
      row.appendChild(tdName);

      // Qty D.N
      const tdDn = document.createElement("td");
      if (isEditing) {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.value = line.dnQty != null ? line.dnQty : 0;
        input.addEventListener("input", (e) => {
          line.dnQty = Number(e.target.value) || 0;
        });
        tdDn.appendChild(input);
      } else {
        tdDn.style.textAlign = "right";
        tdDn.textContent = Number(line.dnQty || 0).toFixed(2);
      }
      row.appendChild(tdDn);

      // Qty Recd.
      const tdRecd = document.createElement("td");
      if (isEditing) {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.value = line.qty != null ? line.qty : 0;
        input.addEventListener("input", (e) => {
          line.qty = Number(e.target.value) || 0;
          line.toStock = Math.max(0, line.qty - (line.rejQty || 0));
          const stockTd = row.children[5];
          if (stockTd) stockTd.textContent = Number(line.toStock).toFixed(2);
        });
        tdRecd.appendChild(input);
      } else {
        tdRecd.style.textAlign = "right";
        tdRecd.textContent = Number(line.qty || 0).toFixed(2);
      }
      row.appendChild(tdRecd);

      // Qty. ToStock (Computed: Qty Recd - Qty Rej)
      const tdStock = document.createElement("td");
      tdStock.style.textAlign = "right";
      tdStock.style.fontWeight = "bold";
      tdStock.textContent = Number(line.toStock || Math.max(0, (line.qty || 0) - (line.rejQty || 0))).toFixed(2);
      row.appendChild(tdStock);

      // PO Bal.Qty
      const tdBal = document.createElement("td");
      tdBal.style.textAlign = "right";
      tdBal.textContent = Number(line.poBalQty || 0).toFixed(2);
      row.appendChild(tdBal);

      // Row Action (Delete row)
      const tdAct = document.createElement("td");
      tdAct.style.textAlign = "center";
      if (isEditing) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.textContent = "×";
        btnDel.title = "Remove item";
        btnDel.style.cursor = "pointer";
        btnDel.style.border = "none";
        btnDel.style.background = "transparent";
        btnDel.style.color = "#d00000";
        btnDel.style.fontWeight = "bold";
        btnDel.addEventListener("click", () => {
          state.lines.splice(idx, 1);
          renderGrid();
        });
        tdAct.appendChild(btnDel);
      }
      row.appendChild(tdAct);

      itemsBody.appendChild(row);
    });
  }

  function addEmptyLine() {
    state.lines.push({
      slno: state.lines.length + 1,
      itemId: 0,
      itemCode: "",
      itemName: "",
      catCode: 0,
      dnQty: 0,
      qty: 0,
      rejQty: 0,
      toStock: 0,
      poBalQty: 0
    });
    renderGrid();
  }

  async function handleSave() {
    const vendorCode = Number(cmbVendor.value);
    if (!vendorCode) {
      alert("Please Select a VENDOR.....");
      cmbVendor.focus();
      return;
    }

    const dcNo = String(txtDcNo.value || "").trim();
    if (!dcNo) {
      alert("Enter the Delivery Challan (DC) Number.....");
      txtDcNo.focus();
      return;
    }

    const storeId = Number(cmbStore.value);
    if (!storeId) {
      alert("Please Select a Store to Add items into.....");
      cmbStore.focus();
      return;
    }

    // Check if PO is required
    const poNo = String(cmbPoNo.value || "").trim();
    if (!poNo && state.meta.openPOs && state.meta.openPOs.length > 0) {
      alert("check 'YOUR ORDER NO' i.e Purchase order ...");
      cmbPoNo.focus();
      return;
    }

    const validLines = state.lines.filter((l) => Number(l.itemId) > 0 && Number(l.qty) > 0);
    if (!validLines.length) {
      alert("At least one item with received quantity must be entered.");
      return;
    }

    if (!confirm("Are You Sure To Save?")) {
      return;
    }

    const payload = {
      purchId: state.mode === "modify" && state.note ? state.note.purchId : 0,
      vendorCode,
      costCntrId: Number(cmbCostCntr.value) || 0,
      transport: String(txtTransport.value || "").trim(),
      vehicleNo: String(txtVehicle.value || "").trim(),
      transFrom: String(txtTransFrom.value || "").trim(),
      transTo: String(txtTransTo.value || "").trim(),
      dcNo,
      dcDate: dtpDcDate.value || nowIsoDate(),
      poNo,
      poDate: dtpPoDate.value || "",
      grnType: String(txtGrnType.value || "").trim(),
      remark: String(txtRemarks.value || "").trim(),
      storeId,
      lines: validLines
    };

    try {
      const res = await fetch("/api/grn/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to save record.");
        return;
      }
      alert(data.message || "Record Saved .");
      applyBundle(data);
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error while saving: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.note || !state.note.purchId) {
      alert("No record selected for deletion.");
      return;
    }

    if (state.isLocked) {
      alert(state.lockReason ? `Deletion not allowed , since ${state.lockReason}!!!` : "Deletion not allowed for this record.");
      return;
    }

    if (!confirm("Are You Sure To Delete ?")) {
      return;
    }

    try {
      const res = await fetch("/api/grn/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.note.purchId })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to delete record.");
        return;
      }
      alert(data.message || "Record Deleted .");
      applyBundle(data);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Network error while deleting: " + err.message);
    }
  }

  function handleModify() {
    if (!state.note) return;
    if (state.isLocked) {
      alert(state.lockReason ? `Modification not allowed , since ${state.lockReason}!!!` : "Modification not allowed for this record.");
      return;
    }
    state.mode = "modify";
    updateUiMode();
    renderGrid();
    txtDcNo.focus();
  }

  function handleSearch() {
    const val = String(txtSearchId.value || "").trim();
    if (!val) return;
    loadBundle(`/api/grn?no=${encodeURIComponent(val)}`);
    txtSearchId.value = "";
  }

  // Sequential Enter focus traversal
  function setupEnterTraversal() {
    const fields = [
      cmbVendor, cmbCostCntr, txtTransport, txtVehicle, txtTransFrom, txtTransTo,
      txtDcNo, dtpDcDate, cmbPoNo, txtGrnType, txtRemarks, cmbStore
    ];
    fields.forEach((f, idx) => {
      if (!f) return;
      f.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const next = fields[idx + 1];
          if (next && !next.disabled) next.focus();
          else if (btnAddLine && !btnAddLine.disabled) btnAddLine.focus();
        }
      });
    });
  }

  // Keyboard shortcuts (F5 -> Item Master, F11 -> PO Details, End -> Close)
  function onKeyDown(e) {
    if (section.hidden) return;

    if (e.key === "End") {
      e.preventDefault();
      window.closeGrn();
      return;
    }

    if (e.key === "F5") {
      e.preventDefault();
      if (window.openItemMaster) {
        window.openItemMaster();
      } else if (window.openItem) {
        window.openItem();
      }
      return;
    }

    if (e.key === "F11") {
      e.preventDefault();
      if (window.openPo) {
        window.openPo();
      }
      return;
    }
  }

  // Event wiring
  cmbVendor.addEventListener("change", onVendorChanged);
  cmbPoNo.addEventListener("change", onPoChanged);
  btnAddLine.addEventListener("click", addEmptyLine);

  btnNew.addEventListener("click", () => {
    state.mode = "new";
    resetNewForm();
    updateUiMode();
    renderGrid();
    cmbVendor.focus();
  });

  btnSave.addEventListener("click", handleSave);
  btnModify.addEventListener("click", handleModify);
  btnDelete.addEventListener("click", handleDelete);

  btnFirst.addEventListener("click", () => loadBundle("/api/grn?first=1"));
  btnPrev.addEventListener("click", () => {
    const curId = state.note ? state.note.purchId : 0;
    loadBundle(`/api/grn?prev=1&current=${curId}`);
  });
  btnNext.addEventListener("click", () => {
    const curId = state.note ? state.note.purchId : 0;
    loadBundle(`/api/grn?next=1&current=${curId}`);
  });
  btnLast.addEventListener("click", () => loadBundle("/api/grn?last=1"));

  btnSearch.addEventListener("click", handleSearch);
  txtSearchId.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  });

  async function printGrn() {
    if (!state.note || !state.note.purchId) {
      alert("No GRN record loaded to print.");
      return;
    }
    const note = state.note;
    const vendor = (state.meta.vendors || []).find((v) => String(v.code) === String(note.vendorCode)) || {};
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

    const rowsHtml = (state.lines || []).filter(l => l.itemCode || l.itemName).map((l, i) => `
      <tr>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
        <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.itemCode || "")}</b><br><small>${escapeHtml(l.itemName || "")}</small></td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.uom || "NOS")}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px;">${l.qtyDc !== undefined ? fmt2(l.qtyDc) : "-"}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.qtyReci)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; color: #006600; font-weight: bold;">${fmt2(l.qtyAccp)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; color: ${Number(l.qtyRej) > 0 ? '#b00' : '#444'}; font-weight: bold;">${fmt2(l.qtyRej || 0)}</td>
        <td style="border: 1px solid #777; padding: 4px;">${escapeHtml(l.remarks || "")}</td>
      </tr>
    `).join("");

    const totalReci = (state.lines || []).reduce((acc, l) => acc + (Number(l.qtyReci) || 0), 0);
    const totalAccp = (state.lines || []).reduce((acc, l) => acc + (Number(l.qtyAccp) || 0), 0);
    const totalRej = (state.lines || []).reduce((acc, l) => acc + (Number(l.qtyRej) || 0), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">GOODS RECEIPT NOTE (PURCHASE)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Supplier / Vendor:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(vendor.name || cmbVendor.selectedOptions[0]?.textContent || "")}</div>
              <div style="margin-top: 4px;">${escapeHtml(vendor.address || "")}</div>
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>GRN No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(note.purchId)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>Date &amp; Time:</b></td><td style="padding: 2px 0;">${escapeHtml(note.grnDateTime ? note.grnDateTime.replace('T', ' ') : '')}</td></tr>
                ${note.dcNo ? `<tr><td style="padding: 2px 0;"><b>Supplier DC / Inv:</b></td><td style="padding: 2px 0;">${escapeHtml(note.dcNo)} ${note.dcDate ? 'Dt: ' + escapeHtml(note.dcDate) : ''}</td></tr>` : ""}
                ${note.poNo ? `<tr><td style="padding: 2px 0;"><b>Purchase Order No:</b></td><td style="padding: 2px 0;">${escapeHtml(note.poNo)} ${note.poDate ? 'Dt: ' + escapeHtml(note.poDate) : ''}</td></tr>` : ""}
                ${note.transport ? `<tr><td style="padding: 2px 0;"><b>Transport:</b></td><td style="padding: 2px 0;">${escapeHtml(note.transport)} ${note.vehicleNo ? '(' + escapeHtml(note.vehicleNo) + ')' : ''}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border-right: 1px solid #777; width: 30px;">Sl</th>
              <th style="padding: 4px; border-right: 1px solid #777;">Item Code / Description</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 45px; text-align: center;">UOM</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 60px; text-align: right;">DC Qty</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 65px; text-align: right;">Received</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 65px; text-align: right;">Accepted</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 60px; text-align: right;">Rejected</th>
              <th style="padding: 4px; width: 100px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align: center; padding: 10px;">No items recorded</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="4" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Quantities:</td>
              <td style="padding: 6px; text-align: right; border-right: 1px solid #777;">${fmt2(totalReci)}</td>
              <td style="padding: 6px; text-align: right; color: #006600; border-right: 1px solid #777;">${fmt2(totalAccp)}</td>
              <td style="padding: 6px; text-align: right; color: #b00; border-right: 1px solid #777;">${fmt2(totalRej)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        ${note.remark ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px;">
            <b>Remarks:</b> ${escapeHtml(note.remark)}
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 33%; padding: 16px 8px; vertical-align: bottom;">
              <div>Store Incharge</div>
            </td>
            <td style="width: 33%; padding: 16px 8px; text-align: center; vertical-align: bottom;">
              <div>Quality Inspector</div>
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
      window.openPrintPreview(`GRN - ${note.purchId}`, docHtml);
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

  btnPrint.addEventListener("click", () => {
    printGrn();
  });

  btnClose.addEventListener("click", () => window.closeGrn());
  btnX.addEventListener("click", () => window.closeGrn());

  document.addEventListener("keydown", onKeyDown);
  setupEnterTraversal();

  // Public module API
  window.openGrn = function (purchId) {
    section.hidden = false;
    if (purchId) {
      loadBundle(`/api/grn?id=${purchId}`);
    } else {
      loadBundle("/api/grn?last=1");
    }
  };

  window.closeGrn = function () {
    section.hidden = true;
    state.mode = "view";
  };
})();
