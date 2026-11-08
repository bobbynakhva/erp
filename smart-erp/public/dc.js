(() => {
  let mode = "view"; // "view" | "new" | "modify"
  let currentNote = null;
  let lines = [];
  let meta = {
    customers: [],
    stores: [],
    costCenters: [],
    items: [],
    ids: [],
    nextId: 1,
    nextNo: "1"
  };

  const dom = {
    section: document.getElementById("dc"),
    btnX: document.getElementById("dc-btn-x"),
    btnClose: document.getElementById("dc-btn-close"),
    btnCorres: document.getElementById("dc-btn-corres"),

    // Left Panel
    cust: document.getElementById("dc-cust"),
    cost: document.getElementById("dc-cost"),
    store: document.getElementById("dc-store"),
    transport: document.getElementById("dc-transport"),
    vehicle: document.getElementById("dc-vehicle"),
    from: document.getElementById("dc-from"),
    to: document.getElementById("dc-to"),

    // Right Panel
    no: document.getElementById("dc-no"),
    date: document.getElementById("dc-date"),
    poNo: document.getElementById("dc-po-no"),
    poDate: document.getElementById("dc-po-date"),
    girNo: document.getElementById("dc-gir-no"),
    signed: document.getElementById("dc-signed"),
    rem: document.getElementById("dc-rem"),
    lblOpenPo: document.getElementById("dc-lbl-open-po"),
    btnVat515: document.getElementById("dc-btn-vat515"),
    btnRejections: document.getElementById("dc-btn-rejections"),

    // Grid
    grid: document.getElementById("dc-grid"),
    gridBody: document.getElementById("dc-grid-body"),

    // Footer
    searchInput: document.getElementById("dc-search-input"),
    btnFind: document.getElementById("dc-btn-find"),
    preformat: document.getElementById("dc-preformat"),

    btnNew: document.getElementById("dc-btn-new"),
    btnSave: document.getElementById("dc-btn-save"),
    btnModify: document.getElementById("dc-btn-modify"),
    btnDelete: document.getElementById("dc-btn-delete"),

    btnFirst: document.getElementById("dc-btn-first"),
    btnPrev: document.getElementById("dc-btn-prev"),
    btnNext: document.getElementById("dc-btn-next"),
    btnLast: document.getElementById("dc-btn-last"),
    btnPrint: document.getElementById("dc-btn-print"),
    btnEway: document.getElementById("dc-btn-eway")
  };

  function fmt2(n) {
    const num = Number(n);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
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

    dom.cust.disabled = !isEdit;
    dom.cost.disabled = !isEdit;
    dom.store.disabled = !isEdit;
    dom.transport.readOnly = !isEdit;
    dom.vehicle.readOnly = !isEdit;
    dom.from.readOnly = !isEdit;
    dom.to.readOnly = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.disabled = !isEdit;
    dom.poNo.disabled = !isEdit;
    dom.poDate.disabled = !isEdit;
    dom.girNo.readOnly = !isEdit;
    dom.signed.disabled = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.btnNew.disabled = isEdit;
    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote;
    dom.btnDelete.disabled = isEdit || !currentNote;

    dom.btnFirst.disabled = isEdit || meta.ids.length === 0;
    dom.btnPrev.disabled = isEdit || meta.ids.length === 0;
    dom.btnNext.disabled = isEdit || meta.ids.length === 0;
    dom.btnLast.disabled = isEdit || meta.ids.length === 0;
    dom.btnFind.disabled = isEdit;
    dom.searchInput.disabled = isEdit;

    renderGrid();
  }

  function populateDropdowns() {
    // Customers
    dom.cust.innerHTML = '<option value="">-- Select Customer --</option>';
    for (const c of meta.customers) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      dom.cust.appendChild(opt);
    }

    // Cost Centers
    dom.cost.innerHTML = '<option value="">-- Select Cost Center --</option>';
    for (const cc of meta.costCenters) {
      const opt = document.createElement("option");
      opt.value = cc.id;
      opt.textContent = cc.name;
      dom.cost.appendChild(opt);
    }

    // Stores
    dom.store.innerHTML = '<option value="">-- Select Store --</option>';
    for (const s of meta.stores) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      dom.store.appendChild(opt);
    }
  }

  async function loadCustomerPOs(custId) {
    dom.poNo.innerHTML = '<option value="">-- Select Customer PO --</option>';
    dom.lblOpenPo.textContent = "";
    if (!custId) return;

    try {
      const data = await apiGet(`/api/dc/customer-pos?custId=${custId}`);
      if (data.addr && mode === "new") {
        dom.to.value = data.addr;
      }
      if (Array.isArray(data.pos)) {
        for (const p of data.pos) {
          const opt = document.createElement("option");
          opt.value = p.poNo;
          opt.textContent = `${p.poNo} (${p.poDate || "-"})`;
          opt.dataset.poDate = p.poDate || "";
          opt.dataset.costCntrId = p.costCntrId || "";
          opt.dataset.isOpenPo = p.isOpenPo ? "1" : "0";
          dom.poNo.appendChild(opt);
        }
      }
    } catch (e) {
      console.error("loadCustomerPOs error:", e);
    }
  }

  async function loadPOItems(poNo) {
    const custId = Number(dom.cust.value || 0);
    const storeId = Number(dom.store.value || 0);
    if (!custId || !poNo) return;

    try {
      const data = await apiGet(`/api/dc/po-items?custId=${custId}&poNo=${encodeURIComponent(poNo)}&storeId=${storeId}`);
      if (Array.isArray(data.items) && data.items.length > 0) {
        lines = data.items.map((it, idx) => ({
          slno: idx + 1,
          itemId: it.itemId,
          code: it.code,
          name: it.name,
          qty: it.qty,
          remarks: "",
          stkQty: it.stkQty || "0.00",
          poBalQty: it.poBalQty || "0.00"
        }));
        renderGrid();
      }
    } catch (e) {
      console.error("loadPOItems error:", e);
    }
  }

  function renderGrid() {
    dom.gridBody.innerHTML = "";
    const isEdit = (mode === "new" || mode === "modify");

    if (lines.length === 0 && isEdit) {
      lines.push({
        slno: 1,
        itemId: 0,
        code: "",
        name: "",
        qty: "",
        remarks: "",
        stkQty: "0.00",
        poBalQty: "0.00"
      });
    }

    lines.forEach((line, index) => {
      line.slno = index + 1;
      const tr = document.createElement("tr");

      // Col 1: SlNo
      const tdSl = document.createElement("td");
      tdSl.style.textAlign = "center";
      tdSl.style.whiteSpace = "nowrap";
      if (isEdit) {
        tdSl.innerHTML = `<span style="margin-right:4px;">${line.slno}</span><button type="button" class="dc-row-del" title="Delete row" style="cursor:pointer;color:#c00;border:none;background:none;font-weight:bold;font-size:12px;">×</button>`;
        const delBtn = tdSl.querySelector(".dc-row-del");
        delBtn.addEventListener("click", () => {
          if (lines.length <= 1) {
            lines[0] = { slno: 1, itemId: 0, code: "", name: "", qty: "", remarks: "", stkQty: "0.00", poBalQty: "0.00" };
          } else {
            lines.splice(index, 1);
          }
          renderGrid();
        });
      } else {
        tdSl.textContent = line.slno;
      }
      tr.appendChild(tdSl);

      // Col 2: Item Code / Part No.
      const tdCode = document.createElement("td");
      if (isEdit) {
        const inpCode = document.createElement("input");
        inpCode.type = "text";
        inpCode.value = line.code || "";
        inpCode.setAttribute("list", "dc-items-list");
        inpCode.dataset.field = "code";

        const updateItem = async () => {
          const val = inpCode.value.trim();
          line.code = val;
          const matched = meta.items.find((it) => it.code.toUpperCase() === val.toUpperCase());
          if (matched) {
            line.itemId = matched.id;
            line.name = matched.name;
            const nameTd = tr.querySelector('[data-field="name"]');
            if (nameTd) nameTd.textContent = line.name;

            // Query stock & po bal
            const storeId = Number(dom.store.value || 0);
            const custId = Number(dom.cust.value || 0);
            const poNo = dom.poNo.value.trim();
            try {
              const st = await apiGet(`/api/dc/item-stock?itemId=${matched.id}&storeId=${storeId}&poNo=${encodeURIComponent(poNo)}&custId=${custId}`);
              line.stkQty = st.stkQty || "0.00";
              line.poBalQty = st.poBalQty || "0.00";
              const stkTd = tr.querySelector('[data-field="stkQty"]');
              const poBalTd = tr.querySelector('[data-field="poBalQty"]');
              if (stkTd) stkTd.textContent = line.stkQty;
              if (poBalTd) poBalTd.textContent = line.poBalQty;
            } catch (e) {
              console.error("item-stock error:", e);
            }
          }
        };

        inpCode.addEventListener("change", updateItem);
        inpCode.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            updateItem().then(() => {
              const inpQty = tr.querySelector('[data-field="qty"]');
              if (inpQty) inpQty.focus();
            });
          } else if (e.key === "F5") {
            e.preventDefault();
            if (window.openItem) window.openItem();
          } else if (e.key === "F11") {
            e.preventDefault();
            if (window.openMfgPO) window.openMfgPO();
          }
        });
        tdCode.appendChild(inpCode);
      } else {
        tdCode.textContent = line.code || "";
      }
      tr.appendChild(tdCode);

      // Col 3: Particulars
      const tdName = document.createElement("td");
      tdName.dataset.field = "name";
      tdName.textContent = line.name || "";
      tr.appendChild(tdName);

      // Col 4: Qty
      const tdQty = document.createElement("td");
      if (isEdit) {
        const inpQty = document.createElement("input");
        inpQty.type = "text";
        inpQty.value = line.qty || "";
        inpQty.style.textAlign = "right";
        inpQty.dataset.field = "qty";
        inpQty.addEventListener("input", () => {
          line.qty = inpQty.value;
        });
        inpQty.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const inpRem = tr.querySelector('[data-field="remarks"]');
            if (inpRem) inpRem.focus();
          }
        });
        tdQty.appendChild(inpQty);
      } else {
        tdQty.style.textAlign = "right";
        tdQty.textContent = line.qty || "";
      }
      tr.appendChild(tdQty);

      // Col 5: Remarks
      const tdRem = document.createElement("td");
      if (isEdit) {
        const inpRem = document.createElement("input");
        inpRem.type = "text";
        inpRem.value = line.remarks || "";
        inpRem.dataset.field = "remarks";
        inpRem.addEventListener("input", () => {
          line.remarks = inpRem.value;
        });
        inpRem.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (index === lines.length - 1) {
              lines.push({
                slno: lines.length + 1,
                itemId: 0,
                code: "",
                name: "",
                qty: "",
                remarks: "",
                stkQty: "0.00",
                poBalQty: "0.00"
              });
              renderGrid();
              const newRow = dom.gridBody.rows[index + 1];
              if (newRow) {
                const nextCode = newRow.querySelector('[data-field="code"]');
                if (nextCode) nextCode.focus();
              }
            } else {
              const nextRow = dom.gridBody.rows[index + 1];
              if (nextRow) {
                const nextCode = nextRow.querySelector('[data-field="code"]');
                if (nextCode) nextCode.focus();
              }
            }
          }
        });
        tdRem.appendChild(inpRem);
      } else {
        tdRem.textContent = line.remarks || "";
      }
      tr.appendChild(tdRem);

      // Col 6: Stk.Qty
      const tdStk = document.createElement("td");
      tdStk.style.textAlign = "right";
      tdStk.dataset.field = "stkQty";
      tdStk.textContent = line.stkQty || "0.00";
      tr.appendChild(tdStk);

      // Col 7: PO Bal.Qty
      const tdPoBal = document.createElement("td");
      tdPoBal.style.textAlign = "right";
      tdPoBal.dataset.field = "poBalQty";
      tdPoBal.textContent = line.poBalQty || "0.00";
      tr.appendChild(tdPoBal);

      dom.gridBody.appendChild(tr);
    });

    // Add datalist for items
    let itemsDatalist = document.getElementById("dc-items-list");
    if (!itemsDatalist) {
      itemsDatalist = document.createElement("datalist");
      itemsDatalist.id = "dc-items-list";
      document.body.appendChild(itemsDatalist);
    }
    itemsDatalist.innerHTML = "";
    for (const it of meta.items) {
      const opt = document.createElement("option");
      opt.value = it.code;
      opt.label = `${it.code} - ${it.name}`;
      itemsDatalist.appendChild(opt);
    }
  }

  function renderNote(note) {
    currentNote = note;
    if (!note) {
      dom.cust.value = "";
      dom.cost.value = "";
      dom.store.value = "";
      dom.transport.value = "";
      dom.vehicle.value = "";
      dom.from.value = "";
      dom.to.value = "";

      dom.no.value = "";
      dom.date.value = todayStr();
      dom.poNo.innerHTML = '<option value="">-- Select Customer PO --</option>';
      dom.poDate.value = todayStr();
      dom.girNo.value = "";
      dom.signed.checked = false;
      dom.rem.value = "";
      dom.lblOpenPo.textContent = "";

      lines = [];
      setMode("view");
      updateCorresButton(0, 0);
      return;
    }

    dom.cust.value = note.custId || "";
    dom.cost.value = note.costCntrId || "";
    dom.store.value = note.storeId || "";
    dom.transport.value = note.transport || "";
    dom.vehicle.value = note.vehicleNo || "";
    dom.from.value = note.transFrom || "";
    dom.to.value = note.transTo || "";

    dom.no.value = note.dcNo || "";
    dom.date.value = note.dcDate || todayStr();

    // Populate POs
    loadCustomerPOs(note.custId).then(() => {
      dom.poNo.value = note.poNo || "";
    });

    dom.poDate.value = note.poDate || todayStr();
    dom.girNo.value = note.girNo || "";
    dom.signed.checked = note.dcSigned === true;
    dom.rem.value = note.remark || "";

    lines = (note.lines || []).map((l, idx) => ({
      slno: idx + 1,
      itemId: l.itemId || 0,
      code: l.code || "",
      name: l.name || "",
      qty: String(l.qty ?? ""),
      remarks: l.remarks || "",
      stkQty: String(l.stkQty ?? "0.00"),
      poBalQty: String(l.poBalQty ?? "0.00")
    }));

    setMode("view");
    updateCorresCount(note.dcNo);
  }

  async function updateCorresCount(dcNo) {
    if (!dcNo) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=${encodeURIComponent("DC")}&ref=${encodeURIComponent(dcNo)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    dom.btnCorres.textContent = `Correspondences (${curr} / ${tot})`;
  }

  async function fetchBundle(targetId, isNew = false, dcNoParam = "") {
    let url = "/api/dc";
    if (isNew) {
      url += "?new=1";
    } else if (targetId) {
      url += `?id=${targetId}`;
    } else if (dcNoParam) {
      url += `?dcNo=${encodeURIComponent(dcNoParam)}`;
    }

    const data = await apiGet(url);
    if (data.error) {
      alert(data.error);
      return null;
    }

    meta.customers = data.customers || [];
    meta.stores = data.stores || [];
    meta.costCenters = data.costCenters || [];
    meta.items = data.items || [];
    meta.ids = data.ids || [];
    meta.nextId = data.nextId;
    meta.nextNo = data.nextNo;

    populateDropdowns();

    if (!isNew && !data.note && meta.ids.length === 0) {
      isNew = true;
    }

    if (isNew) {
      currentNote = null;
      dom.cust.value = "";
      if (meta.costCenters.length > 0) dom.cost.value = meta.costCenters[0].id;
      if (meta.stores.length > 0) dom.store.value = meta.stores[0].id;
      dom.transport.value = "";
      dom.vehicle.value = "";
      dom.from.value = "";
      dom.to.value = "";

      dom.no.value = meta.nextNo || "1";
      dom.date.value = todayStr();
      dom.poNo.innerHTML = '<option value="">-- Select Customer PO --</option>';
      dom.poDate.value = todayStr();
      dom.girNo.value = "";
      dom.signed.checked = false;
      dom.rem.value = "";
      dom.lblOpenPo.textContent = "";

      lines = [{
        slno: 1,
        itemId: 0,
        code: "",
        name: "",
        qty: "",
        remarks: "",
        stkQty: "0.00",
        poBalQty: "0.00"
      }];

      setMode("new");
      updateCorresButton(0, 0);
      dom.cust.focus();
    } else {
      renderNote(data.note);
    }

    return data;
  }

  // Event Listeners
  dom.cust.addEventListener("change", () => {
    const custId = Number(dom.cust.value || 0);
    loadCustomerPOs(custId);
  });

  dom.poNo.addEventListener("change", () => {
    const selectedOpt = dom.poNo.selectedOptions[0];
    if (selectedOpt && selectedOpt.value) {
      if (selectedOpt.dataset.poDate) dom.poDate.value = selectedOpt.dataset.poDate;
      if (selectedOpt.dataset.costCntrId) dom.cost.value = selectedOpt.dataset.costCntrId;
      if (selectedOpt.dataset.isOpenPo === "1") {
        dom.lblOpenPo.textContent = "This is an Open PO.";
      } else {
        dom.lblOpenPo.textContent = "";
      }
      loadPOItems(selectedOpt.value);
    } else {
      dom.lblOpenPo.textContent = "";
    }
  });

  // Enter progression
  dom.cust.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.cost.focus();
    }
  });

  dom.cost.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.store.focus();
    }
  });

  dom.store.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.transport.focus();
    }
  });

  dom.transport.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.vehicle.focus();
    }
  });

  dom.vehicle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.from.focus();
    }
  });

  dom.from.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.to.focus();
    }
  });

  dom.to.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.no.focus();
    }
  });

  dom.no.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.poNo.focus();
    }
  });

  dom.poNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.girNo.focus();
    }
  });

  dom.girNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.rem.focus();
    }
  });

  dom.rem.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const firstRowInput = dom.gridBody.querySelector('[data-field="code"]');
      if (firstRowInput) firstRowInput.focus();
    }
  });

  dom.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.btnFind.click();
    }
  });

  // Toolbar Actions
  dom.btnNew.addEventListener("click", async () => {
    await fetchBundle(0, true);
  });

  dom.btnSave.addEventListener("click", async () => {
    const custId = Number(dom.cust.value || 0);
    if (!custId) {
      alert("Please Select a Customer");
      dom.cust.focus();
      return;
    }

    const storeId = Number(dom.store.value || 0);
    if (!storeId) {
      alert("Please Select a Store from the list");
      dom.store.focus();
      return;
    }

    const dcNo = dom.no.value.trim();
    if (!dcNo) {
      alert("Enter the DC Number ");
      dom.no.focus();
      return;
    }

    if (dom.poNo.options.length > 1 && !dom.poNo.value) {
      alert("You have to select a PO Number from the list...");
      dom.poNo.focus();
      return;
    }

    const costCntrId = Number(dom.cost.value || 0);
    if (!costCntrId) {
      alert("Please Select an existing CostCenter....");
      dom.cost.focus();
      return;
    }

    const filteredLines = lines.filter((l) => l.code.trim() !== "");
    if (filteredLines.length === 0) {
      alert("Please enter at least one item.");
      return;
    }

    for (let i = 0; i < filteredLines.length; i++) {
      const l = filteredLines[i];
      const sl = i + 1;
      const qty = Number(l.qty || 0);
      if (qty <= 0 || !Number.isFinite(qty)) {
        alert(`In Row: ${sl} , Qty should not be greater than 0`);
        return;
      }
      const poBal = Number(l.poBalQty || 0);
      const isOpen = dom.lblOpenPo.textContent.includes("Open PO");
      if (dom.poNo.value && !isOpen && poBal > 0 && qty > poBal) {
        alert(`In Row: ${sl} , Qty should not be greater than ${poBal}`);
        return;
      }
    }

    const confirmMsg = (mode === "new") ? "Are You Sure To Save ?" : "Are You Sure To Modify ?";
    if (!confirm(confirmMsg)) return;

    const payload = {
      isNew: (mode === "new"),
      dcInvId: currentNote ? currentNote.id : 0,
      custId,
      storeId,
      costCntrId,
      dcNo,
      dcDate: dom.date.value,
      poNo: dom.poNo.value.trim(),
      poDate: dom.poDate.value,
      girNo: dom.girNo.value.trim(),
      transport: dom.transport.value.trim(),
      vehicleNo: dom.vehicle.value.trim(),
      transFrom: dom.from.value.trim(),
      transTo: dom.to.value.trim(),
      dcSigned: dom.signed.checked,
      remark: dom.rem.value.trim(),
      lines: filteredLines
    };

    const res = await apiPost("/api/dc/save", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    if (res.message) alert(res.message);
    meta.ids = res.ids || [];
    renderNote(res.note);
  });

  dom.btnModify.addEventListener("click", () => {
    if (!currentNote) {
      alert("No record to modify.");
      return;
    }
    setMode("modify");
    dom.rem.focus();
  });

  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote) return;
    if (!confirm("Are You Sure To Delete")) return;

    const res = await apiPost("/api/dc/delete", { dcInvId: currentNote.id });
    if (res.error) {
      alert(res.error);
      return;
    }

    if (res.message) alert(res.message);
    meta.ids = res.ids || [];
    renderNote(res.note);
  });

  // Navigation
  function getCurrentIndex() {
    if (!currentNote) return -1;
    return meta.ids.indexOf(currentNote.id);
  }

  dom.btnFirst.addEventListener("click", async () => {
    if (meta.ids.length === 0) return;
    await fetchBundle(meta.ids[0]);
  });

  dom.btnPrev.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx > 0) {
      await fetchBundle(meta.ids[idx - 1]);
    } else if (meta.ids.length > 0) {
      await fetchBundle(meta.ids[0]);
    }
  });

  dom.btnNext.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < meta.ids.length - 1) {
      await fetchBundle(meta.ids[idx + 1]);
    } else if (meta.ids.length > 0) {
      await fetchBundle(meta.ids[meta.ids.length - 1]);
    }
  });

  dom.btnLast.addEventListener("click", async () => {
    if (meta.ids.length === 0) return;
    await fetchBundle(meta.ids[meta.ids.length - 1]);
  });

  // Find
  dom.btnFind.addEventListener("click", async () => {
    const dcNo = dom.searchInput.value.trim();
    if (!dcNo) {
      alert("Please enter a DC Number to find.");
      return;
    }
    await fetchBundle(0, false, dcNo);
  });

  // Correspondences & Print & Close
  dom.btnCorres.addEventListener("click", () => {
    if (window.openCorres) {
      window.openCorres("DC", dom.no.value || "DC");
    } else {
      alert("Correspondences module");
    }
  });

  async function printDc() {
    if (!currentNote || !currentNote.dcNo) {
      alert("No Delivery Challan loaded to print.");
      return;
    }
    const note = currentNote;
    const cust = (meta.customers || []).find((c) => Number(c.id) === Number(note.custId)) || {};
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

    const rowsHtml = (lines || []).filter(l => l.code || l.name).map((l, i) => `
      <tr>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
        <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.code || "")}</b><br><small>${escapeHtml(l.name || "")}</small></td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.qty)}</td>
        <td style="border: 1px solid #777; padding: 4px;">${escapeHtml(l.remarks || "")}</td>
      </tr>
    `).join("");

    const totalQty = (lines || []).reduce((acc, l) => acc + (Number(l.qty) || 0), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">DELIVERY CHALLAN</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Consignee / Customer:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(cust.name || dom.cust.selectedOptions[0]?.textContent || "")}</div>
              <div style="margin-top: 4px;">${escapeHtml(cust.address || dom.custAddr.value || "")}</div>
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>D.C. No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(dom.prefix.value || "")} ${escapeHtml(note.dcNo)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>D.C. Date:</b></td><td style="padding: 2px 0;">${escapeHtml(note.dcDate || "")}</td></tr>
                ${note.poNo ? `<tr><td style="padding: 2px 0;"><b>Customer PO:</b></td><td style="padding: 2px 0;">${escapeHtml(note.poNo)} ${note.poDate ? 'Dt: ' + escapeHtml(note.poDate) : ''}</td></tr>` : ""}
                ${note.carrier ? `<tr><td style="padding: 2px 0;"><b>Transport:</b></td><td style="padding: 2px 0;">${escapeHtml(note.carrier)}</td></tr>` : ""}
                ${note.vehNo ? `<tr><td style="padding: 2px 0;"><b>Vehicle No:</b></td><td style="padding: 2px 0;">${escapeHtml(note.vehNo)}</td></tr>` : ""}
                ${note.dcType ? `<tr><td style="padding: 2px 0;"><b>Challan Type:</b></td><td style="padding: 2px 0;">${escapeHtml(note.dcType)}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border-right: 1px solid #777; width: 35px;">Sl</th>
              <th style="padding: 4px; border-right: 1px solid #777;">Item Code / Description</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 80px; text-align: right;">Dispatch Qty</th>
              <th style="padding: 4px; width: 140px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="4" style="text-align: center; padding: 10px;">No items in delivery challan</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="2" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Quantity Dispatched:</td>
              <td style="padding: 6px; text-align: right; color: #000080; border-right: 1px solid #777;">${fmt2(totalQty)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        ${note.remarks ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px;">
            <b>Remarks:</b> ${escapeHtml(note.remarks)}
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 33%; padding: 16px 8px; vertical-align: bottom;">
              <div>Prepared By</div>
            </td>
            <td style="width: 33%; padding: 16px 8px; text-align: center; vertical-align: bottom;">
              <div>Receiver's Signature</div>
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
      window.openPrintPreview(`Delivery Challan - ${note.dcNo}`, docHtml);
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

  dom.btnPrint.addEventListener("click", () => {
    printDc();
  });

  if (dom.btnEway) {
    dom.btnEway.addEventListener("click", () => {
      if (!currentNote || !currentNote.dcNo) {
        alert("Please select or save a Delivery Challan first.");
        return;
      }
      if (window.openGstPortalModal) {
        window.openGstPortalModal({
          docType: "dc",
          docNo: currentNote.dcNo,
          docDate: currentNote.dcDate,
          custName: currentNote.custName,
          custGstin: currentNote.custGstin,
          posState: currentNote.custState,
          taxableAmt: currentNote.totVal,
          totVal: currentNote.totVal,
          vehicleNo: currentNote.vehicleNo,
          transporter: currentNote.transport
        });
      }
    });
  }

  dom.btnClose.addEventListener("click", () => {
    window.closeDC();
  });

  dom.btnX.addEventListener("click", () => {
    window.closeDC();
  });

  // Global methods
  window.openDC = async function () {
    dom.section.hidden = false;
    await fetchBundle(0, false);
    if (!currentNote && mode !== "new") {
      await fetchBundle(0, true);
    }
  };

  window.closeDC = function () {
    dom.section.hidden = true;
  };
})();
