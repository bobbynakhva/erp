(() => {
  let mode = "view"; // "view" | "new" | "modify"
  let currentNote = null;
  let lines = [];
  let meta = {
    prefix: "",
    customers: [],
    items: [],
    ids: [],
    nextId: 1,
    nextNo: "1 /26-27"
  };

  const dom = {
    section: document.getElementById("quote"),
    btnX: document.getElementById("quote-btn-x"),
    btnClose: document.getElementById("quote-btn-close"),
    btnCorres: document.getElementById("quote-btn-corres"),

    cust: document.getElementById("quote-cust"),
    kindAttn: document.getElementById("quote-kind-attn"),
    kindAttnList: document.getElementById("quote-kind-attn-list"),
    rem: document.getElementById("quote-rem"),

    prefix: document.getElementById("quote-prefix"),
    quoteNo: document.getElementById("quote-no"),
    quoteDate: document.getElementById("quote-date"),
    refEnqNo: document.getElementById("quote-ref-enq-no"),
    refEnqDate: document.getElementById("quote-ref-enq-date"),
    optMfg: document.getElementById("quote-opt-mfg"),
    optLab: document.getElementById("quote-opt-lab"),
    totVal: document.getElementById("quote-tot-val"),

    grid: document.getElementById("quote-grid"),
    gridBody: document.getElementById("quote-grid-body"),
    terms: document.getElementById("quote-terms"),

    searchInput: document.getElementById("quote-search-input"),
    btnFind: document.getElementById("quote-btn-find"),

    btnNew: document.getElementById("quote-btn-new"),
    btnSave: document.getElementById("quote-btn-save"),
    btnModify: document.getElementById("quote-btn-modify"),
    btnDelete: document.getElementById("quote-btn-delete"),

    btnFirst: document.getElementById("quote-btn-first"),
    btnPrev: document.getElementById("quote-btn-prev"),
    btnNext: document.getElementById("quote-btn-next"),
    btnLast: document.getElementById("quote-btn-last"),
    btnPrint: document.getElementById("quote-btn-print")
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
    dom.kindAttn.readOnly = !isEdit;
    dom.rem.readOnly = !isEdit;
    dom.quoteNo.readOnly = !isEdit;
    dom.quoteDate.disabled = !isEdit;
    dom.refEnqNo.readOnly = !isEdit;
    dom.refEnqDate.disabled = !isEdit;
    dom.optMfg.disabled = !isEdit;
    dom.optLab.disabled = !isEdit;
    dom.terms.readOnly = !isEdit;

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

  function populateCustomerSelect() {
    dom.cust.innerHTML = '<option value="">-- Select Customer --</option>';
    for (const c of meta.customers) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      dom.cust.appendChild(opt);
    }
  }

  function renderGrid() {
    dom.gridBody.innerHTML = "";
    const isEdit = (mode === "new" || mode === "modify");

    if (lines.length === 0 && isEdit) {
      lines.push({
        sl: 1,
        itemId: 0,
        code: "",
        name: "",
        uom: "",
        moq: "",
        rate: "",
        amount: "0.00"
      });
    }

    lines.forEach((line, index) => {
      line.sl = index + 1;
      const tr = document.createElement("tr");

      // Col 1: Sl No
      const tdSl = document.createElement("td");
      tdSl.style.textAlign = "center";
      tdSl.style.whiteSpace = "nowrap";
      if (isEdit) {
        tdSl.innerHTML = `<span style="margin-right:4px;">${line.sl}</span><button type="button" class="quote-row-del" title="Delete row" style="cursor:pointer;color:#c00;border:none;background:none;font-weight:bold;font-size:12px;">×</button>`;
        const delBtn = tdSl.querySelector(".quote-row-del");
        delBtn.addEventListener("click", () => {
          if (lines.length <= 1) {
            lines[0] = { sl: 1, itemId: 0, code: "", name: "", uom: "", moq: "", rate: "", amount: "0.00" };
          } else {
            lines.splice(index, 1);
          }
          recalculateTotal();
          renderGrid();
        });
      } else {
        tdSl.textContent = line.sl;
      }
      tr.appendChild(tdSl);

      // Col 2: Item Code / Part No
      const tdCode = document.createElement("td");
      if (isEdit) {
        const inpCode = document.createElement("input");
        inpCode.type = "text";
        inpCode.className = "quote-grid-input";
        inpCode.value = line.code || "";
        inpCode.setAttribute("list", "quote-items-list");
        inpCode.dataset.field = "code";
        inpCode.dataset.index = index;

        inpCode.addEventListener("change", async () => {
          const val = inpCode.value.trim().toUpperCase();
          inpCode.value = val;
          line.code = val;
          const matched = meta.items.find((it) => it.code.toUpperCase() === val);
          if (matched) {
            line.itemId = matched.id;
            line.name = matched.name;
            line.uom = matched.uom || "";
            const custId = Number(dom.cust.value || 0);
            if (custId && matched.id) {
              try {
                const sug = await apiGet(`/api/quote/item-rate?custId=${custId}&itemId=${matched.id}`);
                if (sug) {
                  if (sug.moq) line.moq = String(sug.moq);
                  if (sug.rate) line.rate = String(sug.rate);
                }
              } catch (e) {
                console.error("item-rate suggest error:", e);
              }
            }
            if (!line.rate && matched.rate) {
              line.rate = String(matched.rate);
            }
            if (!line.moq) line.moq = "1";
            line.amount = fmt2((Number(line.moq) || 0) * (Number(line.rate) || 0));
            recalculateTotal();
            renderGrid();
            // Focus MOQ input
            const nextInp = tr.querySelector('[data-field="moq"]');
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
            const moqInp = tr.querySelector('[data-field="moq"]');
            if (moqInp) moqInp.focus();
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
        inpUom.className = "quote-grid-input";
        inpUom.value = line.uom || "";
        inpUom.dataset.field = "uom";
        inpUom.dataset.index = index;
        inpUom.addEventListener("input", () => {
          line.uom = inpUom.value.trim().toUpperCase();
        });
        inpUom.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const moqInp = tr.querySelector('[data-field="moq"]');
            if (moqInp) moqInp.focus();
          }
        });
        tdUom.appendChild(inpUom);
      } else {
        tdUom.textContent = line.uom || "";
      }
      tr.appendChild(tdUom);

      // Col 5: MOQ
      const tdMoq = document.createElement("td");
      if (isEdit) {
        const inpMoq = document.createElement("input");
        inpMoq.type = "number";
        inpMoq.step = "any";
        inpMoq.className = "quote-grid-input";
        inpMoq.style.textAlign = "right";
        inpMoq.value = line.moq || "";
        inpMoq.dataset.field = "moq";
        inpMoq.dataset.index = index;

        const updateMoq = () => {
          line.moq = inpMoq.value;
          line.amount = fmt2((Number(line.moq) || 0) * (Number(line.rate) || 0));
          const amtTd = tr.querySelector('[data-field="amount"]');
          if (amtTd) amtTd.textContent = line.amount;
          recalculateTotal();
        };

        inpMoq.addEventListener("input", updateMoq);
        inpMoq.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const rateInp = tr.querySelector('[data-field="rate"]');
            if (rateInp) rateInp.focus();
          }
        });
        tdMoq.appendChild(inpMoq);
      } else {
        tdMoq.style.textAlign = "right";
        tdMoq.textContent = line.moq || "";
      }
      tr.appendChild(tdMoq);

      // Col 6: Rate
      const tdRate = document.createElement("td");
      if (isEdit) {
        const inpRate = document.createElement("input");
        inpRate.type = "number";
        inpRate.step = "any";
        inpRate.className = "quote-grid-input";
        inpRate.style.textAlign = "right";
        inpRate.value = line.rate || "";
        inpRate.dataset.field = "rate";
        inpRate.dataset.index = index;

        const updateRate = () => {
          line.rate = inpRate.value;
          line.amount = fmt2((Number(line.moq) || 0) * (Number(line.rate) || 0));
          const amtTd = tr.querySelector('[data-field="amount"]');
          if (amtTd) amtTd.textContent = line.amount;
          recalculateTotal();
        };

        inpRate.addEventListener("input", updateRate);
        inpRate.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            updateRate();
            if (index === lines.length - 1) {
              lines.push({
                sl: lines.length + 1,
                itemId: 0,
                code: "",
                name: "",
                uom: "",
                moq: "",
                rate: "",
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
        tdRate.appendChild(inpRate);
      } else {
        tdRate.style.textAlign = "right";
        tdRate.textContent = line.rate || "";
      }
      tr.appendChild(tdRate);

      // Col 7: Amount
      const tdAmt = document.createElement("td");
      tdAmt.style.textAlign = "right";
      tdAmt.dataset.field = "amount";
      tdAmt.textContent = line.amount || fmt2((Number(line.moq) || 0) * (Number(line.rate) || 0));
      tr.appendChild(tdAmt);

      dom.gridBody.appendChild(tr);
    });

    // Add datalist for items if not present
    let itemsDatalist = document.getElementById("quote-items-list");
    if (!itemsDatalist) {
      itemsDatalist = document.createElement("datalist");
      itemsDatalist.id = "quote-items-list";
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

  function recalculateTotal() {
    let sum = 0;
    for (const l of lines) {
      const amt = (Number(l.moq) || 0) * (Number(l.rate) || 0);
      sum += amt;
    }
    dom.totVal.value = fmt2(sum);
    return sum;
  }

  function renderNote(note) {
    currentNote = note;
    if (!note) {
      dom.cust.value = "";
      dom.kindAttn.value = "";
      dom.kindAttnList.innerHTML = "";
      dom.rem.value = "";
      dom.prefix.value = meta.prefix || "";
      dom.quoteNo.value = "";
      dom.quoteDate.value = todayStr();
      dom.refEnqNo.value = "";
      dom.refEnqDate.value = todayStr();
      dom.optMfg.checked = true;
      dom.totVal.value = "0.00";
      dom.terms.value = "";
      lines = [];
      setMode("view");
      updateCorresButton(0, 0);
      return;
    }

    dom.prefix.value = meta.prefix || "";
    dom.cust.value = note.custId || "";
    dom.kindAttn.value = note.attn || "";
    dom.rem.value = note.remark || "";
    dom.quoteNo.value = note.no || "";
    dom.quoteDate.value = note.date || todayStr();
    dom.refEnqNo.value = note.refEnqNo || "";
    dom.refEnqDate.value = note.refEnqDate || todayStr();
    if (note.mfgOrLab !== false) {
      dom.optMfg.checked = true;
    } else {
      dom.optLab.checked = true;
    }
    dom.terms.value = note.body || "";
    dom.totVal.value = fmt2(note.totVal || 0);

    lines = (note.lines || []).map((l, idx) => ({
      sl: idx + 1,
      itemId: l.itemId || 0,
      code: l.code || "",
      name: l.name || "",
      uom: l.uom || "",
      moq: String(l.moq ?? ""),
      rate: String(l.rate ?? ""),
      amount: fmt2((Number(l.moq) || 0) * (Number(l.rate) || 0))
    }));

    setMode("view");
    updateCorresCount(note.no);
  }

  async function updateCorresCount(quoteNo) {
    if (!quoteNo) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=${encodeURIComponent("Quote")}&ref=${encodeURIComponent(quoteNo)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    dom.btnCorres.textContent = `Correspondences (${curr} / ${tot})`;
  }

  async function loadCustomerAttentionsAndTerms(custId) {
    if (!custId) {
      dom.kindAttnList.innerHTML = "";
      return;
    }
    try {
      const data = await apiGet(`/api/quote/customer-info?custId=${custId}`);
      dom.kindAttnList.innerHTML = "";
      if (Array.isArray(data.attentions)) {
        for (const a of data.attentions) {
          const opt = document.createElement("option");
          opt.value = a;
          dom.kindAttnList.appendChild(opt);
        }
      }
      if (mode === "new") {
        if (data.attentions && data.attentions.length > 0) {
          dom.kindAttn.value = data.attentions[0];
        }
        if (data.lastTerms) {
          dom.terms.value = data.lastTerms;
        }
      }
    } catch (e) {
      console.error("loadCustomerAttentions error:", e);
    }
  }

  async function fetchBundle(targetId, isNew = false, quoteNoParam = "") {
    let url = "/api/quote";
    if (isNew) {
      url += "?new=1";
    } else if (targetId) {
      url += `?id=${targetId}`;
    } else if (quoteNoParam) {
      url += `?quoteNo=${encodeURIComponent(quoteNoParam)}`;
    }

    const data = await apiGet(url);
    if (data.error) {
      alert(data.error);
      return null;
    }

    meta.prefix = data.prefix || "";
    meta.customers = data.customers || [];
    meta.items = data.items || [];
    meta.ids = data.ids || [];
    meta.nextId = data.nextId;
    meta.nextNo = data.nextNo;

    populateCustomerSelect();

    if (!isNew && !data.note && meta.ids.length === 0) {
      isNew = true;
    }

    if (isNew) {
      currentNote = null;
      dom.prefix.value = meta.prefix;
      dom.cust.value = "";
      dom.kindAttn.value = "";
      dom.kindAttnList.innerHTML = "";
      dom.rem.value = "";
      dom.quoteNo.value = meta.nextNo || "1 /26-27";
      dom.quoteDate.value = todayStr();
      dom.refEnqNo.value = "";
      dom.refEnqDate.value = todayStr();
      dom.optMfg.checked = true;
      dom.totVal.value = "0.00";
      dom.terms.value = "";
      lines = [{
        sl: 1,
        itemId: 0,
        code: "",
        name: "",
        uom: "",
        moq: "",
        rate: "",
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
    loadCustomerAttentionsAndTerms(custId);
  });

  dom.totVal.addEventListener("dblclick", () => {
    recalculateTotal();
  });

  // Sequential Enter Progression
  dom.cust.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.kindAttn.focus();
    }
  });

  dom.kindAttn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.rem.focus();
    }
  });

  dom.rem.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.quoteNo.focus();
    }
  });

  dom.quoteNo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dom.refEnqNo.focus();
    }
  });

  dom.refEnqNo.addEventListener("keydown", (e) => {
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
      alert("Please Select a Customer.....");
      dom.cust.focus();
      return;
    }

    const quoteNo = dom.quoteNo.value.trim();
    if (!quoteNo) {
      alert("Enter the Quotation Number..... ");
      dom.quoteNo.focus();
      return;
    }

    const filteredLines = lines.filter((l) => l.code.trim() !== "");
    if (filteredLines.length === 0) {
      alert("Please Enter the item details by clicking the grid heading...");
      return;
    }

    for (let i = 0; i < filteredLines.length; i++) {
      const l = filteredLines[i];
      const sl = i + 1;
      if (!l.code.trim()) {
        alert(`Enter a Valid  Part No.  for the SlNo.${sl}`);
        return;
      }
      const matched = meta.items.find((it) => it.code.toUpperCase() === l.code.trim().toUpperCase());
      if (!matched) {
        alert("Item does not exist ... Press F5 Key to Add New Items!!!");
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
      const moq = Number(l.moq || 0);
      if (moq <= 0 || !Number.isFinite(moq)) {
        alert("Enter the Valid Minimum Order Qty .....  ");
        return;
      }
      const rate = Number(l.rate || 0);
      if (rate <= 0 || !Number.isFinite(rate)) {
        alert("Enter the Valid Rate ");
        return;
      }
    }

    const totVal = recalculateTotal();
    if (totVal <= 0 || !Number.isFinite(totVal)) {
      alert("Enter a Valid  Quotation Value .....");
      return;
    }

    const confirmMsg = (mode === "new") ? "Are You Sure To Save ?" : "Are You Sure To Modify ?";
    if (!confirm(confirmMsg)) return;

    const payload = {
      isNew: (mode === "new"),
      quoteId: currentNote ? currentNote.id : 0,
      custId,
      kindAttn: dom.kindAttn.value.trim(),
      remark: dom.rem.value.trim(),
      quoteNo,
      quoteDate: dom.quoteDate.value,
      refEnqNo: dom.refEnqNo.value.trim(),
      refEnqDate: dom.refEnqDate.value,
      mfgOrLab: dom.optMfg.checked,
      body: dom.terms.value.trim(),
      totVal,
      lines: filteredLines
    };

    const res = await apiPost("/api/quote/save", payload);
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

    const res = await apiPost("/api/quote/delete", { quoteId: currentNote.id });
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
    const qNo = dom.searchInput.value.trim();
    if (!qNo) {
      alert("Enter the Quotation Number..... ");
      dom.searchInput.focus();
      return;
    }
    await fetchBundle(0, false, qNo);
  });

  // Correspondences & Print & Close
  dom.btnCorres.addEventListener("click", () => {
    if (window.openCorres) {
      window.openCorres("Quote", dom.quoteNo.value || "Quote");
    } else {
      alert("Correspondences module");
    }
  });

  async function printQuote() {
    if (!currentNote || !currentNote.quoteNo) {
      alert("No Quotation record loaded to print.");
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

    const rowsHtml = (note.lines || []).map((l, i) => `
      <tr>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
        <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.itemCode || "")}</b><br><small>${escapeHtml(l.itemName || "")}</small></td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.uom || "NOS")}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${l.moq || "-"}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px;">${fmt2(l.rate)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.amount || (Number(l.moq || 0) * Number(l.rate || 0)))}</td>
      </tr>
    `).join("");

    const totalVal = note.totVal || (note.lines || []).reduce((sum, l) => sum + Number(l.amount || (Number(l.moq || 0) * Number(l.rate || 0))), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">QUOTATION</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Customer / Party:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(cust.name || dom.cust.selectedOptions[0]?.textContent || "")}</div>
              <div style="margin-top: 4px;">${escapeHtml(cust.address || dom.custAddr.value || "")}</div>
              ${note.kindAttn ? `<div style="margin-top: 4px;"><b>Kind Attn:</b> ${escapeHtml(note.kindAttn)}</div>` : ""}
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>Quotation No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(dom.quotePrefix.value || "")} ${escapeHtml(note.quoteNo)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>Date:</b></td><td style="padding: 2px 0;">${escapeHtml(note.quoteDate || "")}</td></tr>
                ${note.enqRef ? `<tr><td style="padding: 2px 0;"><b>Ref Enquiry:</b></td><td style="padding: 2px 0;">${escapeHtml(note.enqRef)} ${note.enqDate ? 'Dt: ' + escapeHtml(note.enqDate) : ''}</td></tr>` : ""}
                ${note.validity ? `<tr><td style="padding: 2px 0;"><b>Validity:</b></td><td style="padding: 2px 0;">${escapeHtml(note.validity)}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border-right: 1px solid #777; width: 30px;">Sl</th>
              <th style="padding: 4px; border-right: 1px solid #777;">Item Code / Description</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 50px; text-align: center;">UOM</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 60px; text-align: right;">MOQ</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 75px; text-align: right;">Rate (Rs)</th>
              <th style="padding: 4px; width: 90px; text-align: right;">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: 10px;">No items quoted</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="5" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Quotation Value:</td>
              <td style="padding: 6px; text-align: right; color: #000080;">Rs. ${fmt2(totalVal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="border: 2px solid #000; border-top: none; padding: 8px; font-size: 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            ${note.payment ? `<tr><td style="width: 120px; font-weight: bold;">Payment Terms:</td><td>${escapeHtml(note.payment)}</td></tr>` : ""}
            ${note.delivery ? `<tr><td style="font-weight: bold;">Delivery Terms:</td><td>${escapeHtml(note.delivery)}</td></tr>` : ""}
            ${note.packing ? `<tr><td style="font-weight: bold;">Packing / Forwarding:</td><td>${escapeHtml(note.packing)}</td></tr>` : ""}
            ${note.freight ? `<tr><td style="font-weight: bold;">Freight:</td><td>${escapeHtml(note.freight)}</td></tr>` : ""}
            ${note.remarks ? `<tr><td style="font-weight: bold;">Remarks:</td><td>${escapeHtml(note.remarks)}</td></tr>` : ""}
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; padding: 12px 8px; vertical-align: bottom;">
              <div>Customer Confirmation &amp; Acceptance</div>
            </td>
            <td style="width: 50%; padding: 12px 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 35px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight: bold;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Quotation - ${note.quoteNo}`, docHtml);
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
    printQuote();
  });

  dom.btnClose.addEventListener("click", () => {
    window.closeQuote();
  });

  dom.btnX.addEventListener("click", () => {
    window.closeQuote();
  });

  // Global methods
  window.openQuote = async function () {
    dom.section.hidden = false;
    await fetchBundle(0, false);
    if (!currentNote && mode !== "new") {
      await fetchBundle(0, true);
    }
  };

  window.closeQuote = function () {
    dom.section.hidden = true;
  };
})();
