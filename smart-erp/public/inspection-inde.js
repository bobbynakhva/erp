// Final Inspection Report - Individual Samples (frmInspectionInde)
(function () {
  let state = {
    mode: "new",
    record: null,
    nextSheetNo: "1",
    inspectors: [],
    customers: [],
    items: [],
    gridRows: [],
    linkedReports: []
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function createEmptyGridRow(slNo) {
    return {
      slNo: slNo,
      desc: "",
      dimens: "",
      loTol: "",
      hiTol: "",
      comp1: "",
      comp2: "",
      comp3: "",
      comp4: "",
      comp5: "",
      comp6: "",
      comp7: "",
      comp8: "",
      comp9: "",
      comp10: ""
    };
  }

  function updateSerialHeaders() {
    const snoVal = String(el("insinde-sno")?.value || "").trim();
    const startNum = parseInt(snoVal, 10);
    const isNum = !isNaN(startNum);
    for (let i = 0; i < 10; i++) {
      const th = el(`insinde-th-${5 + i}`);
      if (th) {
        if (isNum) {
          th.textContent = String(startNum + i);
        } else if (snoVal) {
          th.textContent = `${snoVal}+${i}`;
        } else {
          th.textContent = String(1 + i);
        }
      }
    }
  }

  function syncGridRowsFromDom() {
    const tbody = el("insinde-grid-tbody");
    if (!tbody) return;

    const trs = tbody.querySelectorAll("tr");
    state.gridRows = Array.from(trs).map((tr, idx) => {
      return {
        slNo: idx + 1,
        desc: tr.querySelector(".insinde-col-desc")?.value || "",
        dimens: tr.querySelector(".insinde-col-dimens")?.value || "",
        loTol: tr.querySelector(".insinde-col-lotol")?.value || "",
        hiTol: tr.querySelector(".insinde-col-hitol")?.value || "",
        comp1: tr.querySelector(".insinde-col-comp1")?.value || "",
        comp2: tr.querySelector(".insinde-col-comp2")?.value || "",
        comp3: tr.querySelector(".insinde-col-comp3")?.value || "",
        comp4: tr.querySelector(".insinde-col-comp4")?.value || "",
        comp5: tr.querySelector(".insinde-col-comp5")?.value || "",
        comp6: tr.querySelector(".insinde-col-comp6")?.value || "",
        comp7: tr.querySelector(".insinde-col-comp7")?.value || "",
        comp8: tr.querySelector(".insinde-col-comp8")?.value || "",
        comp9: tr.querySelector(".insinde-col-comp9")?.value || "",
        comp10: tr.querySelector(".insinde-col-comp10")?.value || ""
      };
    });
  }

  function renderGrid() {
    const tbody = el("insinde-grid-tbody");
    if (!tbody) return;

    if (!state.gridRows || state.gridRows.length === 0) {
      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    }

    const locked = Boolean(el("insinde-chk-lock")?.checked);
    const roAttr = locked ? "readonly style=\"background: #f5f5f5; width: 100%; box-sizing: border-box; font-size: 11px;\"" : "style=\"width: 100%; box-sizing: border-box; font-size: 11px;\"";

    tbody.innerHTML = state.gridRows.map((r, idx) => `
      <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: center; font-weight: bold; width: 35px;">${idx + 1}</td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 160px;">
          <input type="text" class="invmfg-input insinde-col-desc" data-index="${idx}" value="${escapeHtml(r.desc || "")}" ${roAttr}>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 70px;">
          <input type="text" class="invmfg-input insinde-col-dimens" data-index="${idx}" value="${escapeHtml(r.dimens || "")}" ${locked ? "readonly style=\"background: #f5f5f5; width: 100%; text-align: right; box-sizing: border-box; font-weight: bold; font-size: 11px;\"" : "style=\"width: 100%; text-align: right; box-sizing: border-box; font-weight: bold; font-size: 11px;\""}>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 55px;">
          <input type="text" class="invmfg-input insinde-col-lotol" data-index="${idx}" value="${escapeHtml(r.loTol || "")}" ${locked ? "readonly style=\"background: #f5f5f5; width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;\"" : "style=\"width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;\""}>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 55px;">
          <input type="text" class="invmfg-input insinde-col-hitol" data-index="${idx}" value="${escapeHtml(r.hiTol || "")}" ${locked ? "readonly style=\"background: #f5f5f5; width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;\"" : "style=\"width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;\""}>
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp1" data-index="${idx}" value="${escapeHtml(r.comp1 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp2" data-index="${idx}" value="${escapeHtml(r.comp2 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp3" data-index="${idx}" value="${escapeHtml(r.comp3 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp4" data-index="${idx}" value="${escapeHtml(r.comp4 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp5" data-index="${idx}" value="${escapeHtml(r.comp5 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp6" data-index="${idx}" value="${escapeHtml(r.comp6 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp7" data-index="${idx}" value="${escapeHtml(r.comp7 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp8" data-index="${idx}" value="${escapeHtml(r.comp8 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp9" data-index="${idx}" value="${escapeHtml(r.comp9 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 50px;">
          <input type="text" class="invmfg-input insinde-col-comp10" data-index="${idx}" value="${escapeHtml(r.comp10 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
      </tr>
    `).join("");

    if (el("insinde-grid-info")) {
      el("insinde-grid-info").textContent = `Total Rows: ${state.gridRows.length}`;
    }
    updateSerialHeaders();
  }

  function addGridRow() {
    syncGridRowsFromDom();
    state.gridRows.push(createEmptyGridRow(state.gridRows.length + 1));
    renderGrid();
  }

  function deleteLastGridRow() {
    syncGridRowsFromDom();
    if (state.gridRows.length <= 1) {
      alert("At least one measurement row must remain.");
      return;
    }
    state.gridRows.pop();
    renderGrid();
  }

  function clearGrid() {
    if (confirm("Clear all measurement rows?")) {
      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
      renderGrid();
    }
  }

  function renderCustomers() {
    const sel = el("insinde-cust");
    if (!sel) return;

    const list = state.customers || [];
    let opts = `<option value="">-- Select Customer --</option>`;
    for (const c of list) {
      opts += `<option value="${c.cust_id}">${escapeHtml(c.cust_name)}</option>`;
    }
    sel.innerHTML = opts;

    if (state.record && state.record.custId) {
      sel.value = String(state.record.custId);
    } else {
      sel.value = "";
    }
  }

  function renderItems() {
    const sel = el("insinde-item-code");
    if (!sel) return;

    const list = state.items || [];
    let opts = `<option value="">-- Select Item --</option>`;
    for (const it of list) {
      opts += `<option value="${it.item_id}">${escapeHtml(it.item_code)}</option>`;
    }
    sel.innerHTML = opts;

    if (state.record && state.record.itemId) {
      sel.value = String(state.record.itemId);
    } else {
      sel.value = "";
    }
  }

  function renderInspectors() {
    const sel = el("insinde-insby");
    if (!sel) return;

    const list = state.inspectors || [];
    let opts = `<option value="">-- Inspector --</option>`;
    for (const name of list) {
      opts += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }
    sel.innerHTML = opts;

    if (state.record && state.record.insBy) {
      sel.value = state.record.insBy;
    } else {
      sel.value = "";
    }
  }

  async function handleItemChange() {
    const itemId = Number(el("insinde-item-code")?.value || 0);
    if (!itemId) {
      if (el("insinde-item-id")) el("insinde-item-id").value = "0";
      if (el("insinde-item-name")) el("insinde-item-name").value = "";
      return;
    }

    if (el("insinde-item-id")) el("insinde-item-id").value = String(itemId);
    const it = state.items.find(x => Number(x.item_id) === itemId);
    if (it) {
      if (el("insinde-item-name")) el("insinde-item-name").value = it.item_name || "";
      if (el("insinde-desc") && !el("insinde-desc").value) {
        el("insinde-desc").value = it.description || it.item_name || "";
      }
    }

    // Attempt to load standard template from inspect_ref
    try {
      const res = await fetch(`/api/inspection/item-template?itemId=${itemId}`);
      const data = await res.json();
      if (data && data.exists && Array.isArray(data.template) && data.template.length > 0) {
        // If current grid is empty or blank, populate with template
        syncGridRowsFromDom();
        const hasContent = state.gridRows.some(r => r.desc || r.dimens);
        if (!hasContent) {
          state.gridRows = data.template.map((t, idx) => ({
            ...createEmptyGridRow(idx + 1),
            desc: t.desc || "",
            dimens: t.dimens || "",
            loTol: t.loTol || "",
            hiTol: t.hiTol || ""
          }));
          renderGrid();
        }
      }
    } catch (err) {
      console.error("handleItemChange template error:", err);
    }
  }

  function handleCustomerChange() {
    const custId = Number(el("insinde-cust")?.value || 0);
    if (el("insinde-cust-id")) el("insinde-cust-id").value = String(custId);
  }

  async function handleLoadExistingData() {
    const custId = Number(el("insinde-cust")?.value || el("insinde-cust-id")?.value || 0);
    const itemId = Number(el("insinde-item-code")?.value || el("insinde-item-id")?.value || 0);

    if (!custId || !itemId) {
      alert("To Use the Existing Inspection reports Data, You should fill the 'Customer Name' and 'Item Code/Part No.' ");
      return;
    }

    try {
      const res = await fetch(`/api/inspection-inde/linked-reports?custId=${custId}&itemId=${itemId}`);
      const data = await res.json();
      if (!res.ok || !data.exists || !data.reports || data.reports.length === 0) {
        alert(data.message || "No Inspection Reports exists for Linking !!! check your 'Customer Name' and 'ItemCode/PartNo'");
        return;
      }

      state.linkedReports = data.reports;
      const listSel = el("insinde-linked-list");
      if (listSel) {
        listSel.innerHTML = data.reports.map((r, idx) => `
          <option value="${idx}">Report: ${escapeHtml(r.no)} (${r.source === "inde" ? "Individual" : "Random"})</option>
        `).join("");
      }

      const modal = el("insinde-linked-modal");
      if (modal) {
        modal.style.display = "flex";
      }
    } catch (err) {
      console.error("handleLoadExistingData error:", err);
      alert("Error querying existing inspection reports.");
    }
  }

  function applyLinkedReport() {
    const listSel = el("insinde-linked-list");
    const idx = Number(listSel?.value || 0);
    const selected = state.linkedReports[idx];
    if (!selected) {
      closeLinkedModal();
      return;
    }

    try {
      let importedRows = [];
      if (selected.ins_data) {
        if (selected.ins_data.trim().startsWith("[")) {
          importedRows = JSON.parse(selected.ins_data);
        } else {
          const lines = selected.ins_data.split(/\r\n|\r|\n/).filter(Boolean);
          importedRows = lines.map((l, i) => {
            const cols = l.split("\t");
            return {
              slNo: i + 1,
              desc: cols[0] || "",
              dimens: cols[1] || "",
              loTol: cols[2] || "",
              hiTol: cols[3] || ""
            };
          });
        }
      }

      if (importedRows.length > 0) {
        // Copy parameters to grid rows keeping current measurements empty
        state.gridRows = importedRows.map((r, i) => ({
          ...createEmptyGridRow(i + 1),
          desc: r.desc || "",
          dimens: r.dimens || "",
          loTol: r.loTol || "",
          hiTol: r.hiTol || ""
        }));
        renderGrid();
      }
    } catch (err) {
      console.error("applyLinkedReport error:", err);
    }
    closeLinkedModal();
  }

  function closeLinkedModal() {
    const modal = el("insinde-linked-modal");
    if (modal) modal.style.display = "none";
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.mode = bundle.mode || "new";
    state.record = bundle.record;
    state.nextSheetNo = bundle.nextSheetNo || "1";
    state.inspectors = bundle.inspectors || [];
    state.customers = bundle.customers || state.customers || [];
    state.items = bundle.items || state.items || [];

    renderCustomers();
    renderItems();
    renderInspectors();

    if (state.mode === "edit" && state.record) {
      const r = state.record;
      if (el("insinde-id")) el("insinde-id").value = String(r.id);
      if (el("insinde-mode")) el("insinde-mode").value = "edit";
      if (el("insinde-sno")) el("insinde-sno").value = r.sno || "";
      if (el("insinde-batchno")) el("insinde-batchno").value = r.batchNo || "";
      if (el("insinde-sheetno")) el("insinde-sheetno").value = r.sheetNo || "";
      if (el("insinde-sheetdate")) el("insinde-sheetdate").value = r.sheetDate || "";
      if (el("insinde-vcno")) el("insinde-vcno").value = r.vcNo || "";
      if (el("insinde-dcno")) el("insinde-dcno").value = r.dcNo || "";
      if (el("insinde-dcdate")) el("insinde-dcdate").value = r.dcDate || "";
      if (el("insinde-cust")) el("insinde-cust").value = String(r.custId || "");
      if (el("insinde-cust-id")) el("insinde-cust-id").value = String(r.custId || "");
      if (el("insinde-qty")) el("insinde-qty").value = Number(r.qty || 0).toFixed(2);
      if (el("insinde-item-code")) el("insinde-item-code").value = String(r.itemId || "");
      if (el("insinde-item-id")) el("insinde-item-id").value = String(r.itemId || "");
      if (el("insinde-item-name")) el("insinde-item-name").value = r.itemName || "";
      if (el("insinde-desc")) el("insinde-desc").value = r.description || "";
      if (el("insinde-pono")) el("insinde-pono").value = r.poNo || "";
      if (el("insinde-insby")) el("insinde-insby").value = r.insBy || "";
      if (el("insinde-remarks")) el("insinde-remarks").value = r.remarks || "";

      state.gridRows = r.gridRows || [];
      renderGrid();

      if (el("insinde-btn-save")) el("insinde-btn-save").textContent = "Modify";
      if (el("insinde-btn-delete")) el("insinde-btn-delete").disabled = false;
    } else {
      resetFormToNew();
    }
  }

  function resetFormToNew() {
    state.mode = "new";
    state.record = null;

    if (el("insinde-id")) el("insinde-id").value = "0";
    if (el("insinde-mode")) el("insinde-mode").value = "new";
    if (el("insinde-sno")) el("insinde-sno").value = "1";
    if (el("insinde-batchno")) el("insinde-batchno").value = "";
    if (el("insinde-sheetno")) el("insinde-sheetno").value = state.nextSheetNo || "1";
    if (el("insinde-sheetdate")) el("insinde-sheetdate").value = getTodayDate();
    if (el("insinde-vcno")) el("insinde-vcno").value = "";
    if (el("insinde-dcno")) el("insinde-dcno").value = "";
    if (el("insinde-dcdate")) el("insinde-dcdate").value = getTodayDate();
    if (el("insinde-cust")) el("insinde-cust").value = "";
    if (el("insinde-cust-id")) el("insinde-cust-id").value = "0";
    if (el("insinde-qty")) el("insinde-qty").value = "0.00";
    if (el("insinde-item-code")) el("insinde-item-code").value = "";
    if (el("insinde-item-id")) el("insinde-item-id").value = "0";
    if (el("insinde-item-name")) el("insinde-item-name").value = "";
    if (el("insinde-desc")) el("insinde-desc").value = "";
    if (el("insinde-pono")) el("insinde-pono").value = "";
    if (el("insinde-insby")) el("insinde-insby").value = "";
    if (el("insinde-remarks")) el("insinde-remarks").value = "";
    if (el("insinde-chk-lock")) el("insinde-chk-lock").checked = false;

    state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    renderGrid();

    if (el("insinde-btn-save")) el("insinde-btn-save").textContent = "Save";
    if (el("insinde-btn-delete")) el("insinde-btn-delete").disabled = true;
  }

  async function loadInspectionInde(paramStr) {
    try {
      const res = await fetch(`/api/inspection-inde?${paramStr}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error) alert(data.error);
        return;
      }
      if (data.message && !data.record) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadInspectionInde error:", err);
    }
  }

  async function handleSave() {
    syncGridRowsFromDom();

    const id = Number(el("insinde-id")?.value || 0);
    const sno = String(el("insinde-sno")?.value || "").trim();
    const batchNo = String(el("insinde-batchno")?.value || "").trim();
    const sheetNo = String(el("insinde-sheetno")?.value || "").trim();
    const sheetDate = String(el("insinde-sheetdate")?.value || "").trim();
    const vcNo = String(el("insinde-vcno")?.value || "").trim();
    const dcNo = String(el("insinde-dcno")?.value || "").trim();
    const dcDate = String(el("insinde-dcdate")?.value || "").trim();
    const custId = Number(el("insinde-cust")?.value || el("insinde-cust-id")?.value || 0);
    const qty = Number(el("insinde-qty")?.value || 0);
    const itemId = Number(el("insinde-item-code")?.value || el("insinde-item-id")?.value || 0);
    const itemName = String(el("insinde-item-name")?.value || "").trim();
    const description = String(el("insinde-desc")?.value || "").trim();
    const poNo = String(el("insinde-pono")?.value || "").trim();
    const insBy = String(el("insinde-insby")?.value || "").trim();
    const remarks = String(el("insinde-remarks")?.value || "").trim();

    // Exact VB6 Validations (Proc_DDC578)
    if (!sno) {
      alert("Enter the Serial Number..... ");
      el("insinde-sno")?.focus();
      return;
    }
    if (!batchNo) {
      alert("Enter the Batch Number..... ");
      el("insinde-batchno")?.focus();
      return;
    }
    if (!sheetNo) {
      alert("Enter the Inspection Number..... ");
      el("insinde-sheetno")?.focus();
      return;
    }
    if (!dcNo) {
      alert("Please Enter a DC Number.....");
      el("insinde-dcno")?.focus();
      return;
    }
    if (!el("insinde-qty")?.value || isNaN(qty) || qty <= 0) {
      alert("Please Enter a DC Quantity.....");
      el("insinde-qty")?.focus();
      return;
    }
    if (!custId) {
      alert("Please Select Customer Name.....");
      el("insinde-cust")?.focus();
      return;
    }
    if (!itemId) {
      alert("Please Select Item Name.....");
      el("insinde-item-code")?.focus();
      return;
    }
    if (!itemName) {
      alert("ItemName does not exist for this ItemCODE. Close this Screen and edit the ItemName from    MENU  Master-->Production-->Component ");
      el("insinde-item-code")?.focus();
      return;
    }
    if (!description) {
      alert(" Please Type the Description ..... ");
      el("insinde-desc")?.focus();
      return;
    }
    if (!poNo) {
      alert("Please Enter the PO Number.....");
      el("insinde-pono")?.focus();
      return;
    }
    if (!insBy) {
      alert("Enter the Person who has made the Inspection.....");
      el("insinde-insby")?.focus();
      return;
    }

    // Dimension check on non-empty rows
    for (let i = 0; i < state.gridRows.length; i++) {
      const r = state.gridRows[i];
      const hasDescOrReadings = (r.desc && r.desc.trim()) ||
        [r.comp1, r.comp2, r.comp3, r.comp4, r.comp5, r.comp6, r.comp7, r.comp8, r.comp9, r.comp10].some(v => v !== undefined && v !== null && String(v).trim() !== "");
      if (hasDescOrReadings && (!r.dimens || !String(r.dimens).trim())) {
        alert("You must fill 'Dimension' column !!!");
        const cell = el("insinde-grid-tbody")?.querySelector(`tr[data-index="${i}"] .insinde-col-dimens`);
        cell?.focus();
        return;
      }
    }

    if (!confirm("Store the data ?")) {
      return;
    }

    try {
      const payload = {
        id,
        sno,
        batchNo,
        sheetNo,
        sheetDate,
        vcNo,
        dcNo,
        dcDate,
        custId,
        qty,
        itemId,
        itemName,
        description,
        poNo,
        insBy,
        remarks,
        rows: state.gridRows
      };

      const res = await fetch("/api/inspection-inde/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to store record.");
        return;
      }

      alert("Record Stored successfully .");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Failed to store inspection report.");
    }
  }

  async function handleDelete() {
    const id = Number(el("insinde-id")?.value || 0);
    if (!id) {
      alert("Select an inspection report first.");
      return;
    }

    if (!confirm("Are You Sure To Delete ?")) {
      return;
    }

    try {
      const res = await fetch("/api/inspection-inde/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }

      alert("Record Deleted Successfully.");
      resetFormToNew();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Failed to delete inspection report.");
    }
  }

  function handleSearch() {
    const val = String(el("insinde-search-no")?.value || "").trim();
    if (!val) {
      alert("Enter Inspection / Sheet Number to search.");
      return;
    }
    loadInspectionInde(`sheetNo=${encodeURIComponent(val)}`);
  }

  function handlePrint() {
    const id = Number(el("insinde-id")?.value || 0);
    if (!id || state.mode === "new") {
      alert("You should save the Record First in order to take print...");
      return;
    }
    window.open(`/api/print?type=inspection-inde&id=${id}`, "_blank");
  }

  function initEvents() {
    el("insinde-sno")?.addEventListener("input", updateSerialHeaders);
    el("insinde-chk-lock")?.addEventListener("change", () => {
      syncGridRowsFromDom();
      renderGrid();
    });

    el("insinde-cust")?.addEventListener("change", handleCustomerChange);
    el("insinde-item-code")?.addEventListener("change", handleItemChange);

    el("insinde-btn-load-data")?.addEventListener("click", handleLoadExistingData);
    el("insinde-btn-linked-ok")?.addEventListener("click", applyLinkedReport);
    el("insinde-btn-linked-cancel")?.addEventListener("click", closeLinkedModal);
    el("insinde-linked-list")?.addEventListener("dblclick", applyLinkedReport);

    el("insinde-btn-add-row")?.addEventListener("click", addGridRow);
    el("insinde-btn-del-row")?.addEventListener("click", deleteLastGridRow);
    el("insinde-btn-clear-grid")?.addEventListener("click", clearGrid);

    el("insinde-btn-new")?.addEventListener("click", () => loadInspectionInde("new=1"));
    el("insinde-btn-save")?.addEventListener("click", handleSave);
    el("insinde-btn-delete")?.addEventListener("click", handleDelete);

    el("insinde-btn-first")?.addEventListener("click", () => loadInspectionInde("first=1"));
    el("insinde-btn-last")?.addEventListener("click", () => loadInspectionInde("last=1"));
    el("insinde-btn-prev")?.addEventListener("click", () => {
      const curId = el("insinde-id")?.value || 0;
      loadInspectionInde(`prev=1&currentId=${curId}`);
    });
    el("insinde-btn-next")?.addEventListener("click", () => {
      const curId = el("insinde-id")?.value || 0;
      loadInspectionInde(`next=1&currentId=${curId}`);
    });

    el("insinde-btn-search")?.addEventListener("click", handleSearch);
    el("insinde-search-no")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    el("insinde-btn-print")?.addEventListener("click", handlePrint);
    el("insinde-btn-close")?.addEventListener("click", closeInspectionInde);
    el("insinde-btn-x")?.addEventListener("click", closeInspectionInde);
  }

  async function openInspectionInde(target) {
    const sec = el("inspection-inde");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    if (target && target.id) {
      await loadInspectionInde(`id=${target.id}`);
    } else if (target && target.sheetNo) {
      await loadInspectionInde(`sheetNo=${encodeURIComponent(target.sheetNo)}`);
    } else {
      await loadInspectionInde("last=1");
    }
  }

  function closeInspectionInde() {
    const sec = el("inspection-inde");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
    closeLinkedModal();
  }

  window.openInspectionInde = openInspectionInde;
  window.closeInspectionInde = closeInspectionInde;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
  } else {
    initEvents();
  }
})();
