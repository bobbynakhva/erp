(() => {
  let mode = "view"; // "view" | "new" | "modify"
  let currentNote = null;
  let lines = [];
  let meta = {
    customers: [],
    costCenters: [],
    currencies: [],
    items: [],
    ids: [],
    nextId: 1
  };

  const dom = {
    section: document.getElementById("mfgpo"),
    btnX: document.getElementById("mfgpo-btn-x"),
    btnClose: document.getElementById("mfgpo-btn-close"),
    btnCorres: document.getElementById("mfgpo-btn-corres"),

    chkOpen: document.getElementById("mfgpo-chk-open"),
    chkSch: document.getElementById("mfgpo-chk-sch"),

    cust: document.getElementById("mfgpo-cust"),
    cost: document.getElementById("mfgpo-cost"),
    rem: document.getElementById("mfgpo-rem"),

    no: document.getElementById("mfgpo-no"),
    date: document.getElementById("mfgpo-date"),
    validFrom: document.getElementById("mfgpo-valid-from"),
    validTo: document.getElementById("mfgpo-valid-to"),
    chkRetrk: document.getElementById("mfgpo-chk-retrk"),
    payTerm: document.getElementById("mfgpo-pay-term"),
    gstRate: document.getElementById("mfgpo-gst-rate"),
    vat: document.getElementById("mfgpo-vat"),
    cst: document.getElementById("mfgpo-cst"),
    val: document.getElementById("mfgpo-val"),
    curr: document.getElementById("mfgpo-curr"),

    grid: document.getElementById("mfgpo-grid"),
    gridBody: document.getElementById("mfgpo-grid-body"),

    searchNo: document.getElementById("mfgpo-search-no"),
    btnFind: document.getElementById("mfgpo-btn-find"),
    followupNo: document.getElementById("mfgpo-followup-no"),
    chkFollowup: document.getElementById("mfgpo-chk-followup"),

    btnNew: document.getElementById("mfgpo-btn-new"),
    btnSave: document.getElementById("mfgpo-btn-save"),
    btnModify: document.getElementById("mfgpo-btn-modify"),
    btnDelete: document.getElementById("mfgpo-btn-delete"),

    btnFirst: document.getElementById("mfgpo-btn-first"),
    btnPrev: document.getElementById("mfgpo-btn-prev"),
    btnNext: document.getElementById("mfgpo-btn-next"),
    btnLast: document.getElementById("mfgpo-btn-last"),
    btnPrint: document.getElementById("mfgpo-btn-print")
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

    dom.chkOpen.disabled = !isEdit;
    dom.chkSch.disabled = !isEdit;
    dom.cust.disabled = !isEdit;
    dom.cost.disabled = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.disabled = !isEdit;
    dom.validFrom.disabled = !isEdit;
    dom.validTo.disabled = !isEdit;
    dom.chkRetrk.disabled = !isEdit;
    dom.payTerm.readOnly = !isEdit;
    if (dom.gstRate) dom.gstRate.readOnly = !isEdit;
    if (dom.vat) dom.vat.readOnly = !isEdit;
    if (dom.cst) dom.cst.readOnly = !isEdit;
    dom.val.readOnly = !isEdit;
    dom.curr.disabled = !isEdit;

    dom.btnNew.disabled = isEdit;
    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote;
    dom.btnDelete.disabled = isEdit || !currentNote;

    dom.btnFirst.disabled = isEdit || meta.ids.length === 0;
    dom.btnPrev.disabled = isEdit || meta.ids.length === 0;
    dom.btnNext.disabled = isEdit || meta.ids.length === 0;
    dom.btnLast.disabled = isEdit || meta.ids.length === 0;
    dom.btnFind.disabled = isEdit;
    dom.searchNo.disabled = isEdit;

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
    if (meta.costCenters.length > 0 && !dom.cost.value) {
      dom.cost.value = meta.costCenters[0].id;
    }

    // Currencies
    dom.curr.innerHTML = "";
    for (const cu of meta.currencies) {
      const opt = document.createElement("option");
      opt.value = cu.id;
      opt.textContent = cu.name;
      dom.curr.appendChild(opt);
    }
    // Default Rupees
    const rOpt = meta.currencies.find((c) => c.name.toUpperCase().includes("RUPEE"));
    if (rOpt) dom.curr.value = rOpt.id;
  }

  function calculateLineAmount(line) {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    const disc = Number(line.discount) || 0;
    return (qty * rate * (1 - disc / 100));
  }

  function calculateTotalValue() {
    let subtotal = 0;
    for (const l of lines) {
      subtotal += calculateLineAmount(l);
    }
    const gstP = dom.gstRate ? (Number(dom.gstRate.value) || 0) : ((Number(dom.vat?.value) || 0) + (Number(dom.cst?.value) || 0));
    const taxes = subtotal * (gstP / 100);
    const total = subtotal + taxes;
    dom.val.value = fmt2(total);
    if (dom.vat) dom.vat.value = fmt2(gstP);
    return total;
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
        uom: "",
        qty: "",
        rate: "",
        discount: "0",
        dueDate: dom.validTo.value || dom.date.value || todayStr(),
        amount: "0.00"
      });
    }

    lines.forEach((line, index) => {
      line.slno = index + 1;
      const tr = document.createElement("tr");

      // Col 1: Sl No
      const tdSl = document.createElement("td");
      tdSl.style.textAlign = "center";
      tdSl.style.whiteSpace = "nowrap";
      if (isEdit) {
        tdSl.innerHTML = `<span style="margin-right:4px;">${line.slno}</span><button type="button" class="mfgpo-row-del" title="Delete row" style="cursor:pointer;color:#c00;border:none;background:none;font-weight:bold;font-size:12px;">×</button>`;
        const delBtn = tdSl.querySelector(".mfgpo-row-del");
        delBtn.addEventListener("click", () => {
          if (lines.length <= 1) {
            lines[0] = { slno: 1, itemId: 0, code: "", name: "", uom: "", qty: "", rate: "", discount: "0", dueDate: todayStr(), amount: "0.00" };
          } else {
            lines.splice(index, 1);
          }
          calculateTotalValue();
          renderGrid();
        });
      } else {
        tdSl.textContent = line.slno;
      }
      tr.appendChild(tdSl);

      // Col 2: Item Code / Part No
      const tdCode = document.createElement("td");
      if (isEdit) {
        const inpCode = document.createElement("input");
        inpCode.type = "text";
        inpCode.className = "mfgpo-grid-input";
        inpCode.value = line.code || "";
        inpCode.setAttribute("list", "mfgpo-items-list");
        inpCode.dataset.field = "code";
        inpCode.dataset.index = index;

        inpCode.addEventListener("change", () => {
          const val = inpCode.value.trim().toUpperCase();
          inpCode.value = val;
          line.code = val;
          const matched = meta.items.find((it) => it.code.toUpperCase() === val);
          if (matched) {
            line.itemId = matched.id;
            line.name = matched.name;
            line.uom = matched.uom || "";
            if (!line.rate && matched.rate) line.rate = String(matched.rate);
            if (!line.qty) line.qty = dom.chkOpen.checked ? "0" : "1";
            if (!line.dueDate) line.dueDate = dom.validTo.value || dom.date.value || todayStr();
            line.amount = fmt2(calculateLineAmount(line));
            calculateTotalValue();
            renderGrid();
            const nextInp = tr.querySelector('[data-field="qty"]');
            if (nextInp) nextInp.focus();
          } else {
            line.itemId = 0;
            line.name = "";
          }
        });

        inpCode.addEventListener("keydown", (e) => {
          if (e.key === "F5") {
            e.preventDefault();
            if (window.openItem) window.openItem();
          } else if (e.key === "Enter") {
            e.preventDefault();
            const qtyInp = tr.querySelector('[data-field="qty"]');
            if (qtyInp) qtyInp.focus();
          }
        });
        tdCode.appendChild(inpCode);
      } else {
        tdCode.textContent = line.code || "";
      }
      tr.appendChild(tdCode);

      // Col 3: Item/Component Name
      const tdName = document.createElement("td");
      tdName.textContent = line.name || "";
      tr.appendChild(tdName);

      // Col 4: UOM
      const tdUom = document.createElement("td");
      if (isEdit) {
        const inpUom = document.createElement("input");
        inpUom.type = "text";
        inpUom.className = "mfgpo-grid-input";
        inpUom.value = line.uom || "";
        inpUom.dataset.field = "uom";
        inpUom.dataset.index = index;
        inpUom.addEventListener("input", () => {
          line.uom = inpUom.value.trim().toUpperCase();
        });
        inpUom.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const qtyInp = tr.querySelector('[data-field="qty"]');
            if (qtyInp) qtyInp.focus();
          }
        });
        tdUom.appendChild(inpUom);
      } else {
        tdUom.textContent = line.uom || "";
      }
      tr.appendChild(tdUom);

      // Col 5: Qty
      const tdQty = document.createElement("td");
      if (isEdit) {
        const inpQty = document.createElement("input");
        inpQty.type = "number";
        inpQty.step = "any";
        inpQty.className = "mfgpo-grid-input";
        inpQty.style.textAlign = "right";
        inpQty.value = line.qty || "";
        inpQty.dataset.field = "qty";
        inpQty.dataset.index = index;

        const updateQty = () => {
          line.qty = inpQty.value;
          line.amount = fmt2(calculateLineAmount(line));
          calculateTotalValue();
        };

        inpQty.addEventListener("input", updateQty);
        inpQty.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const rateInp = tr.querySelector('[data-field="rate"]');
            if (rateInp) rateInp.focus();
          }
        });
        tdQty.appendChild(inpQty);
      } else {
        tdQty.style.textAlign = "right";
        tdQty.textContent = line.qty || "";
      }
      tr.appendChild(tdQty);

      // Col 6: Rate
      const tdRate = document.createElement("td");
      if (isEdit) {
        const inpRate = document.createElement("input");
        inpRate.type = "number";
        inpRate.step = "any";
        inpRate.className = "mfgpo-grid-input";
        inpRate.style.textAlign = "right";
        inpRate.value = line.rate || "";
        inpRate.dataset.field = "rate";
        inpRate.dataset.index = index;

        const updateRate = () => {
          line.rate = inpRate.value;
          line.amount = fmt2(calculateLineAmount(line));
          calculateTotalValue();
        };

        inpRate.addEventListener("input", updateRate);
        inpRate.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const discInp = tr.querySelector('[data-field="discount"]');
            if (discInp) discInp.focus();
          }
        });
        tdRate.appendChild(inpRate);
      } else {
        tdRate.style.textAlign = "right";
        tdRate.textContent = line.rate || "";
      }
      tr.appendChild(tdRate);

      // Col 7: Disc%
      const tdDisc = document.createElement("td");
      if (isEdit) {
        const inpDisc = document.createElement("input");
        inpDisc.type = "number";
        inpDisc.step = "any";
        inpDisc.className = "mfgpo-grid-input";
        inpDisc.style.textAlign = "right";
        inpDisc.value = line.discount || "0";
        inpDisc.dataset.field = "discount";
        inpDisc.dataset.index = index;

        const updateDisc = () => {
          line.discount = inpDisc.value;
          line.amount = fmt2(calculateLineAmount(line));
          calculateTotalValue();
        };

        inpDisc.addEventListener("input", updateDisc);
        inpDisc.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const dateInp = tr.querySelector('[data-field="dueDate"]');
            if (dateInp) dateInp.focus();
          }
        });
        tdDisc.appendChild(inpDisc);
      } else {
        tdDisc.style.textAlign = "right";
        tdDisc.textContent = line.discount || "0";
      }
      tr.appendChild(tdDisc);

      // Col 8: Due Date
      const tdDue = document.createElement("td");
      if (isEdit) {
        const inpDue = document.createElement("input");
        inpDue.type = "date";
        inpDue.className = "mfgpo-grid-input";
        inpDue.value = line.dueDate || dom.validTo.value || todayStr();
        inpDue.dataset.field = "dueDate";
        inpDue.dataset.index = index;
        inpDue.addEventListener("change", () => {
          line.dueDate = inpDue.value;
        });
        inpDue.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (index === lines.length - 1) {
              lines.push({
                slno: lines.length + 1,
                itemId: 0,
                code: "",
                name: "",
                uom: "",
                qty: dom.chkOpen.checked ? "0" : "1",
                rate: "",
                discount: "0",
                dueDate: dom.validTo.value || todayStr(),
                amount: "0.00"
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
        tdDue.appendChild(inpDue);
      } else {
        tdDue.textContent = line.dueDate || "";
      }
      tr.appendChild(tdDue);

      dom.gridBody.appendChild(tr);
    });

    // Add datalist for items
    let itemsDatalist = document.getElementById("mfgpo-items-list");
    if (!itemsDatalist) {
      itemsDatalist = document.createElement("datalist");
      itemsDatalist.id = "mfgpo-items-list";
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
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.cust.value = "";
      if (meta.costCenters.length > 0) dom.cost.value = meta.costCenters[0].id;
      dom.rem.value = "";
      dom.no.value = "";
      dom.date.value = todayStr();
      dom.validFrom.value = todayStr();
      dom.validTo.value = todayStr();
      dom.chkRetrk.checked = false;
      dom.payTerm.value = "";
      if (dom.gstRate) dom.gstRate.value = "18.00";
      if (dom.vat) dom.vat.value = "0.00";
      if (dom.cst) dom.cst.value = "0.00";
      dom.val.value = "0.00";
      const rOpt = meta.currencies.find((c) => c.name.toUpperCase().includes("RUPEE"));
      if (rOpt) dom.curr.value = rOpt.id;
      lines = [];
      setMode("view");
      updateCorresButton(0, 0);
      return;
    }

    dom.chkOpen.checked = note.isOpenPo === true;
    dom.chkSch.checked = note.isSchPo === true;
    dom.cust.value = note.custId || "";
    dom.cost.value = note.costCntrId || (meta.costCenters.length ? meta.costCenters[0].id : "");
    dom.rem.value = note.remark || "";
    dom.no.value = note.poNo || "";
    dom.date.value = note.poDate || todayStr();
    dom.validFrom.value = note.validFrom || todayStr();
    dom.validTo.value = note.validTo || todayStr();
    dom.chkRetrk.checked = note.reTrkRej === true;
    dom.payTerm.value = note.payTerm || "";
    if (dom.gstRate) dom.gstRate.value = fmt2(note.tinPerc || 18);
    if (dom.vat) dom.vat.value = fmt2(note.tinPerc || 0);
    if (dom.cst) dom.cst.value = fmt2(note.cstPerc || 0);
    dom.val.value = fmt2(note.purchVal || 0);
    dom.curr.value = note.currId || 1;
    dom.followupNo.value = note.mfgPoFollowupNo || "1";
    dom.chkFollowup.checked = !!note.followupDate;

    lines = (note.lines || []).map((l, idx) => ({
      slno: idx + 1,
      itemId: l.itemId || 0,
      code: l.code || "",
      name: l.name || "",
      uom: l.uom || "",
      qty: String(l.qty ?? ""),
      rate: String(l.rate ?? ""),
      discount: String(l.discount ?? "0"),
      dueDate: l.dueDate || "",
      amount: fmt2(calculateLineAmount(l))
    }));

    setMode("view");
    updateCorresCount(note.poNo);
  }

  async function updateCorresCount(poNo) {
    if (!poNo) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=${encodeURIComponent("MfgPO")}&ref=${encodeURIComponent(poNo)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    dom.btnCorres.textContent = `Correspondences (${curr} / ${tot})`;
  }

  async function loadCustomerDefaults(custId) {
    if (!custId) return;
    try {
      const data = await apiGet(`/api/mfgpo/customer-info?custId=${custId}`);
      if (data) {
        if (data.currId) dom.curr.value = data.currId;
        if (data.tinPerc) {
          if (dom.gstRate) dom.gstRate.value = fmt2(data.tinPerc);
          if (dom.vat) dom.vat.value = fmt2(data.tinPerc);
        }
        if (data.cstPerc && dom.cst) dom.cst.value = fmt2(data.cstPerc);
        calculateTotalValue();
      }
    } catch (e) {
      console.error("loadCustomerDefaults error:", e);
    }
  }

  async function fetchBundle(targetId, isNew = false, poNoParam = "") {
    let url = "/api/mfgpo";
    if (isNew) {
      url += "?new=1";
    } else if (targetId) {
      url += `?id=${targetId}`;
    } else if (poNoParam) {
      url += `?poNo=${encodeURIComponent(poNoParam)}`;
    }

    const data = await apiGet(url);
    if (data.error) {
      alert(data.error);
      return null;
    }

    meta.customers = data.customers || [];
    meta.costCenters = data.costCenters || [];
    meta.currencies = data.currencies || [];
    meta.items = data.items || [];
    meta.ids = data.ids || [];
    meta.nextId = data.nextId;

    populateDropdowns();

    if (!isNew && !data.note && meta.ids.length === 0) {
      isNew = true;
    }

    if (isNew) {
      currentNote = null;
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.cust.value = "";
      if (meta.costCenters.length > 0) dom.cost.value = meta.costCenters[0].id;
      dom.rem.value = "";
      dom.no.value = "";
      dom.date.value = todayStr();
      dom.validFrom.value = todayStr();
      dom.validTo.value = todayStr();
      dom.chkRetrk.checked = false;
      dom.payTerm.value = "";
      if (dom.gstRate) dom.gstRate.value = "18.00";
      if (dom.vat) dom.vat.value = "0.00";
      if (dom.cst) dom.cst.value = "0.00";
      dom.val.value = "0.00";
      const rOpt = meta.currencies.find((c) => c.name.toUpperCase().includes("RUPEE"));
      if (rOpt) dom.curr.value = rOpt.id;
      lines = [{
        slno: 1,
        itemId: 0,
        code: "",
        name: "",
        uom: "",
        qty: "",
        rate: "",
        discount: "0",
        dueDate: todayStr(),
        amount: "0.00"
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
    loadCustomerDefaults(custId);
  });

  dom.val.addEventListener("dblclick", () => {
    calculateTotalValue();
  });

  if (dom.gstRate) dom.gstRate.addEventListener("input", calculateTotalValue);
  if (dom.vat) dom.vat.addEventListener("input", calculateTotalValue);
  if (dom.cst) dom.cst.addEventListener("input", calculateTotalValue);

  // Keyboard Navigation
  dom.cust.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.cost.focus();
    }
  });

  dom.cost.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.rem.focus();
    }
  });

  dom.rem.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.no.focus();
    }
  });

  dom.no.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.validFrom.focus();
    }
  });

  dom.validFrom.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.validTo.focus();
    }
  });

  dom.validTo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.payTerm.focus();
    }
  });

  dom.payTerm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const firstCode = dom.gridBody.querySelector('[data-field="code"]');
      if (firstCode) firstCode.focus();
    }
  });

  dom.searchNo.addEventListener("keydown", (e) => {
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
      alert("Please Select a Customer .....");
      dom.cust.focus();
      return;
    }

    const poNo = dom.no.value.trim();
    if (!poNo) {
      alert("Enter the Purchase Order Number..... ");
      dom.no.focus();
      return;
    }

    const costCntrId = Number(dom.cost.value || 0);
    if (!costCntrId) {
      alert("Please Select an existing CostCenter....");
      dom.cost.focus();
      return;
    }

    const currId = Number(dom.curr.value || 0);
    if (!currId) {
      alert("Please Select an existing Currency Name....");
      dom.curr.focus();
      return;
    }

    const filteredLines = lines.filter((l) => l.code.trim() !== "");
    if (filteredLines.length === 0) {
      alert("Please Enter the Item details by clicking the grid heading...");
      return;
    }

    const isOpenPo = dom.chkOpen.checked;
    for (let i = 0; i < filteredLines.length; i++) {
      const l = filteredLines[i];
      const sl = i + 1;
      if (!l.code.trim()) {
        alert(`Enter a Valid Item Code/Part No. for the SlNo. .....${sl}`);
        return;
      }
      const matched = meta.items.find((it) => it.code.toUpperCase() === l.code.trim().toUpperCase());
      if (!matched) {
        alert("Part No. does not exist ... !!!");
        return;
      }
      if (!l.name.trim()) {
        alert(`Enter Item/Component Name for the SlNo. ${sl}`);
        return;
      }
      if (!l.uom.trim()) {
        alert(`Enter a Valid 'Unit Of Measurements' 'UOM'  in short Form \r\n eg., Kg for Kilograms, Nos for Numbers etc.\r\n for the SlNo.${sl}`);
        return;
      }
      const qty = Number(l.qty || 0);
      if (!isOpenPo && (qty <= 0 || !Number.isFinite(qty))) {
        alert("Enter the Valid Qty ..... ");
        return;
      }
      const rate = Number(l.rate || 0);
      if (rate <= 0 || !Number.isFinite(rate)) {
        alert("Enter the Valid Rate ");
        return;
      }
    }

    const purchVal = calculateTotalValue();
    const confirmMsg = (mode === "new") ? "Are You Sure To Save ?" : "Are You Sure To Modify ?";
    if (!confirm(confirmMsg)) return;

    const payload = {
      isNew: (mode === "new"),
      poId: currentNote ? currentNote.id : 0,
      custId,
      isOpenPo,
      isSchPo: dom.chkSch.checked,
      poNo,
      poDate: dom.date.value,
      validFrom: dom.validFrom.value,
      validTo: dom.validTo.value,
      costCntrId,
      remark: dom.rem.value.trim(),
      payTerm: dom.payTerm.value.trim(),
      gstRate: dom.gstRate ? Number(dom.gstRate.value || 0) : Number(dom.vat?.value || 0),
      tinPerc: dom.gstRate ? Number(dom.gstRate.value || 0) : Number(dom.vat?.value || 0),
      cstPerc: 0,
      purchVal,
      currId,
      todayVal: 1.0,
      reTrkRej: dom.chkRetrk.checked,
      followupDate: dom.chkFollowup.checked ? todayStr() : null,
      mfgPoFollowupNo: dom.followupNo.value.trim(),
      lines: filteredLines
    };

    const res = await apiPost("/api/mfgpo/save", payload);
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

    const res = await apiPost("/api/mfgpo/delete", { poId: currentNote.id });
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
    const qNo = dom.searchNo.value.trim();
    if (!qNo) {
      alert("Enter the Purchase Order Number..... ");
      dom.searchNo.focus();
      return;
    }
    await fetchBundle(0, false, qNo);
  });

  // Correspondences & Print & Close
  dom.btnCorres.addEventListener("click", () => {
    if (window.openCorres) {
      window.openCorres("MfgPO", dom.no.value || "PO");
    } else {
      alert("Correspondences module");
    }
  });

  async function printMfgPo() {
    if (!currentNote || !currentNote.poNo) {
      alert("No Customer PO loaded to print.");
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

    const rowsHtml = (lines || []).filter(l => l.itemCode || l.itemName).map((l, i) => `
      <tr>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
        <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.itemCode || "")}</b><br><small>${escapeHtml(l.itemName || "")}</small></td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.uom || "NOS")}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.qty)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px;">${fmt2(l.rate)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.amount || (Number(l.qty || 0) * Number(l.rate || 0)))}</td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${l.dueDate ? escapeHtml(l.dueDate) : "-"}</td>
      </tr>
    `).join("");

    const totalVal = note.totalVal || (lines || []).reduce((acc, l) => acc + (Number(l.amount) || 0), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">CUSTOMER ORDER / PURCHASE ORDER</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Customer / Client:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(cust.name || dom.cust.selectedOptions[0]?.textContent || "")}</div>
              <div style="margin-top: 4px;">${escapeHtml(cust.address || dom.custAddr.value || "")}</div>
              ${note.kindAttn ? `<div style="margin-top: 4px;"><b>Kind Attn:</b> ${escapeHtml(note.kindAttn)}</div>` : ""}
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>Customer PO No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(note.poNo)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>PO Date:</b></td><td style="padding: 2px 0;">${escapeHtml(note.poDate || "")}</td></tr>
                ${note.costCenter ? `<tr><td style="padding: 2px 0;"><b>Cost Center:</b></td><td style="padding: 2px 0;">${escapeHtml(note.costCenter)}</td></tr>` : ""}
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
              <th style="padding: 4px; border-right: 1px solid #777; width: 60px; text-align: right;">Ordered Qty</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 65px; text-align: right;">Unit Rate</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 80px; text-align: right;">Amount</th>
              <th style="padding: 4px; width: 75px; text-align: center;">Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" style="text-align: center; padding: 10px;">No items recorded in order</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="5" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Order Value:</td>
              <td style="padding: 6px; text-align: right; color: #000080; border-right: 1px solid #777;">Rs. ${fmt2(totalVal)}</td>
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
            <td style="width: 50%; padding: 12px 8px; vertical-align: bottom;">
              <div>Accepted by Client</div>
            </td>
            <td style="width: 50%; padding: 12px 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 30px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Customer PO - ${note.poNo}`, docHtml);
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
    printMfgPo();
  });

  dom.btnClose.addEventListener("click", () => {
    window.closeMfgPO();
  });

  dom.btnX.addEventListener("click", () => {
    window.closeMfgPO();
  });

  // Global methods
  window.openMfgPO = async function () {
    dom.section.hidden = false;
    await fetchBundle(0, false);
    if (!currentNote && mode !== "new") {
      await fetchBundle(0, true);
    }
  };

  window.closeMfgPO = function () {
    dom.section.hidden = true;
  };
})();
