// Final Inspection Report - Random Samples (frmInspection)
(function () {
  let state = {
    mode: "new",
    record: null,
    nextInsNo: "1",
    inspectors: [],
    dcTypes: ["Manufacturing", "Labour"],
    dcs: [],
    dcItems: [],
    gridRows: []
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

  function syncGridRowsFromDom() {
    const tbody = el("ins-grid-tbody");
    if (!tbody) return;

    const trs = tbody.querySelectorAll("tr");
    state.gridRows = Array.from(trs).map((tr, idx) => {
      return {
        slNo: idx + 1,
        desc: tr.querySelector(".ins-col-desc")?.value || "",
        dimens: tr.querySelector(".ins-col-dimens")?.value || "",
        loTol: tr.querySelector(".ins-col-lotol")?.value || "",
        hiTol: tr.querySelector(".ins-col-hitol")?.value || "",
        comp1: tr.querySelector(".ins-col-comp1")?.value || "",
        comp2: tr.querySelector(".ins-col-comp2")?.value || "",
        comp3: tr.querySelector(".ins-col-comp3")?.value || "",
        comp4: tr.querySelector(".ins-col-comp4")?.value || "",
        comp5: tr.querySelector(".ins-col-comp5")?.value || "",
        comp6: tr.querySelector(".ins-col-comp6")?.value || "",
        comp7: tr.querySelector(".ins-col-comp7")?.value || "",
        comp8: tr.querySelector(".ins-col-comp8")?.value || "",
        comp9: tr.querySelector(".ins-col-comp9")?.value || "",
        comp10: tr.querySelector(".ins-col-comp10")?.value || ""
      };
    });
  }

  function renderGrid() {
    const tbody = el("ins-grid-tbody");
    if (!tbody) return;

    if (!state.gridRows || state.gridRows.length === 0) {
      // Default to 5 blank rows
      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    }

    tbody.innerHTML = state.gridRows.map((r, idx) => `
      <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: center; font-weight: bold; width: 35px;">${idx + 1}</td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 150px;">
          <input type="text" class="invmfg-input ins-col-desc" data-index="${idx}" value="${escapeHtml(r.desc || "")}" style="width: 100%; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 65px;">
          <input type="text" class="invmfg-input ins-col-dimens" data-index="${idx}" value="${escapeHtml(r.dimens || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-weight: bold; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 55px;">
          <input type="text" class="invmfg-input ins-col-lotol" data-index="${idx}" value="${escapeHtml(r.loTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 55px;">
          <input type="text" class="invmfg-input ins-col-hitol" data-index="${idx}" value="${escapeHtml(r.hiTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp1" data-index="${idx}" value="${escapeHtml(r.comp1 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp2" data-index="${idx}" value="${escapeHtml(r.comp2 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp3" data-index="${idx}" value="${escapeHtml(r.comp3 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp4" data-index="${idx}" value="${escapeHtml(r.comp4 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp5" data-index="${idx}" value="${escapeHtml(r.comp5 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp6" data-index="${idx}" value="${escapeHtml(r.comp6 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp7" data-index="${idx}" value="${escapeHtml(r.comp7 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp8" data-index="${idx}" value="${escapeHtml(r.comp8 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp9" data-index="${idx}" value="${escapeHtml(r.comp9 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input ins-col-comp10" data-index="${idx}" value="${escapeHtml(r.comp10 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
      </tr>
    `).join("");
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

  function renderInspectors() {
    const sel = el("ins-inspected-by");
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

  function renderDcs() {
    const sel = el("ins-dc-no");
    if (!sel) return;

    const list = state.dcs || [];
    let opts = `<option value="">-- Select DC No --</option>`;
    for (const d of list) {
      opts += `<option value="${escapeHtml(d.dcno)}">${escapeHtml(d.dcno)}</option>`;
    }
    sel.innerHTML = opts;

    if (state.record && state.record.dcNo) {
      sel.value = state.record.dcNo;
    } else {
      sel.value = "";
    }
  }

  function renderDcItems() {
    const sel = el("ins-item-code");
    if (!sel) return;

    const list = state.dcItems || [];
    let opts = `<option value="">-- Select Item --</option>`;
    for (const it of list) {
      opts += `<option value="${it.itemid}">${escapeHtml(it.item_code || String(it.itemid))}</option>`;
    }
    sel.innerHTML = opts;

    if (state.record && state.record.itemId) {
      sel.value = String(state.record.itemId);
    } else if (list.length === 1) {
      sel.value = String(list[0].itemid);
      handleItemCodeChange();
    } else {
      sel.value = "";
    }
  }

  async function handleDcTypeChange() {
    const dcType = el("ins-dc-type")?.value || "Manufacturing";
    try {
      const res = await fetch(`/api/inspection/dcs?dcType=${encodeURIComponent(dcType)}`);
      const data = await res.json();
      state.dcs = data.dcs || [];
      renderDcs();

      // Clear DC Details
      if (el("ins-dc-date")) el("ins-dc-date").value = "";
      if (el("ins-cust-name")) el("ins-cust-name").value = "";
      if (el("ins-cust-id")) el("ins-cust-id").value = "0";
      if (el("ins-dc-qty")) el("ins-dc-qty").value = "";
      if (el("ins-item-name")) el("ins-item-name").value = "";
      state.dcItems = [];
      renderDcItems();
    } catch (err) {
      console.error("handleDcTypeChange error:", err);
    }
  }

  async function handleDcNoChange() {
    const dcType = el("ins-dc-type")?.value || "Manufacturing";
    const dcNo = el("ins-dc-no")?.value || "";
    if (!dcNo) {
      if (el("ins-dc-date")) el("ins-dc-date").value = "";
      if (el("ins-cust-name")) el("ins-cust-name").value = "";
      if (el("ins-cust-id")) el("ins-cust-id").value = "0";
      if (el("ins-dc-qty")) el("ins-dc-qty").value = "";
      if (el("ins-item-name")) el("ins-item-name").value = "";
      state.dcItems = [];
      renderDcItems();
      return;
    }

    try {
      const res = await fetch(`/api/inspection/dc-meta?dcType=${encodeURIComponent(dcType)}&dcNo=${encodeURIComponent(dcNo)}`);
      const data = await res.json();
      if (data.dc) {
        if (el("ins-dc-date")) el("ins-dc-date").value = data.dc.dcdate || "";
        if (el("ins-cust-name")) el("ins-cust-name").value = data.dc.cust_name || "";
        if (el("ins-cust-id")) el("ins-cust-id").value = String(data.dc.custid || 0);
      }
      state.dcItems = data.items || [];
      renderDcItems();
    } catch (err) {
      console.error("handleDcNoChange error:", err);
    }
  }

  function handleItemCodeChange() {
    const itemId = Number(el("ins-item-code")?.value || 0);
    if (el("ins-item-id")) el("ins-item-id").value = String(itemId);

    const found = state.dcItems.find(it => it.itemid === itemId);
    if (found) {
      if (el("ins-item-name")) el("ins-item-name").value = found.item_name || "";
      if (el("ins-dc-qty")) el("ins-dc-qty").value = Number(found.qty || 0).toFixed(2);
    } else {
      if (el("ins-item-name")) el("ins-item-name").value = "";
      if (el("ins-dc-qty")) el("ins-dc-qty").value = "";
    }
  }

  async function handleLoadTemplate() {
    const itemId = Number(el("ins-item-id")?.value || el("ins-item-code")?.value || 0);
    if (!itemId) {
      alert("Please Select a Item Code/Part No......");
      el("ins-item-code")?.focus();
      return;
    }

    try {
      const res = await fetch(`/api/inspection/item-template?itemId=${itemId}`);
      const data = await res.json();
      if (data.exists && Array.isArray(data.template) && data.template.length > 0) {
        syncGridRowsFromDom();
        state.gridRows = data.template.map((t, idx) => ({
          slNo: idx + 1,
          desc: t.desc || "",
          dimens: t.dimens || "",
          loTol: t.loTol || "",
          hiTol: t.hiTol || "",
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
        }));
        renderGrid();
      } else {
        alert("No Inspection Template found for this Item.");
      }
    } catch (err) {
      console.error("handleLoadTemplate error:", err);
      alert("Failed to load template data.");
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.mode = bundle.mode || "new";
    state.record = bundle.record;
    state.nextInsNo = bundle.nextInsNo || "1";
    state.inspectors = bundle.inspectors || [];
    state.dcTypes = bundle.dcTypes || ["Manufacturing", "Labour"];

    renderInspectors();

    if (state.mode === "edit" && state.record) {
      const r = state.record;
      if (el("ins-id")) el("ins-id").value = String(r.id);
      if (el("ins-mode")) el("ins-mode").value = "edit";
      if (el("ins-report-no")) el("ins-report-no").value = r.insNo || "";
      if (el("ins-date")) el("ins-date").value = r.insDate || getTodayDate();
      if (el("ins-dc-type")) el("ins-dc-type").value = r.dcType || "Manufacturing";
      if (el("ins-dc-date")) el("ins-dc-date").value = r.dcDate || "";
      if (el("ins-cust-name")) el("ins-cust-name").value = r.custName || "";
      if (el("ins-cust-id")) el("ins-cust-id").value = String(r.custId || 0);
      if (el("ins-dc-qty")) el("ins-dc-qty").value = Number(r.qty || 0).toFixed(2);
      if (el("ins-item-id")) el("ins-item-id").value = String(r.itemId || 0);
      if (el("ins-item-name")) el("ins-item-name").value = r.itemName || "";
      if (el("ins-remarks")) el("ins-remarks").value = r.remarks || "";
      if (el("ins-inspected-by")) el("ins-inspected-by").value = r.insBy || "";

      // Load DCs and set selected DC
      handleDcTypeChange().then(() => {
        if (el("ins-dc-no")) el("ins-dc-no").value = r.dcNo || "";
        handleDcNoChange().then(() => {
          if (el("ins-item-code")) el("ins-item-code").value = String(r.itemId || 0);
          handleItemCodeChange();
        });
      });

      state.gridRows = r.gridRows || [];
      renderGrid();

      if (el("ins-btn-save")) el("ins-btn-save").textContent = "Modify";
      if (el("ins-btn-delete")) el("ins-btn-delete").disabled = false;
    } else {
      resetFormToNew();
    }
  }

  function resetFormToNew() {
    state.mode = "new";
    state.record = null;

    if (el("ins-id")) el("ins-id").value = "0";
    if (el("ins-mode")) el("ins-mode").value = "new";
    if (el("ins-report-no")) el("ins-report-no").value = state.nextInsNo || "1";
    if (el("ins-date")) el("ins-date").value = getTodayDate();
    if (el("ins-dc-type")) el("ins-dc-type").value = "Manufacturing";
    if (el("ins-dc-date")) el("ins-dc-date").value = "";
    if (el("ins-cust-name")) el("ins-cust-name").value = "";
    if (el("ins-cust-id")) el("ins-cust-id").value = "0";
    if (el("ins-dc-qty")) el("ins-dc-qty").value = "";
    if (el("ins-item-id")) el("ins-item-id").value = "0";
    if (el("ins-item-name")) el("ins-item-name").value = "";
    if (el("ins-remarks")) el("ins-remarks").value = "";
    if (el("ins-inspected-by")) el("ins-inspected-by").value = "";

    state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    renderGrid();

    handleDcTypeChange();

    if (el("ins-btn-save")) el("ins-btn-save").textContent = "Save";
    if (el("ins-btn-delete")) el("ins-btn-delete").disabled = true;
  }

  async function loadInspection(paramStr) {
    try {
      const res = await fetch(`/api/inspection?${paramStr}`);
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
      console.error("loadInspection error:", err);
    }
  }

  async function handleSave() {
    syncGridRowsFromDom();

    const id = Number(el("ins-id")?.value || 0);
    const insNo = String(el("ins-report-no")?.value || "").trim();
    const insDate = String(el("ins-date")?.value || "").trim();
    const dcType = String(el("ins-dc-type")?.value || "Manufacturing").trim();
    const dcNo = String(el("ins-dc-no")?.value || "").trim();
    const dcDate = String(el("ins-dc-date")?.value || "").trim();
    const custId = Number(el("ins-cust-id")?.value || 0);
    const qty = Number(el("ins-dc-qty")?.value || 0);
    const itemId = Number(el("ins-item-id")?.value || el("ins-item-code")?.value || 0);
    const insBy = String(el("ins-inspected-by")?.value || "").trim();
    const remarks = String(el("ins-remarks")?.value || "").trim();

    // Exact VB6 Validations
    if (!insNo) {
      alert("Enter the Inspection Number...");
      el("ins-report-no")?.focus();
      return;
    }
    if (!dcNo) {
      alert("Please Select a DC Number.....");
      el("ins-dc-no")?.focus();
      return;
    }
    if (!itemId) {
      alert("Please Select a Item Code/Part No......");
      el("ins-item-code")?.focus();
      return;
    }
    if (!insBy) {
      alert("Enter the Person who has made the Inspection");
      el("ins-inspected-by")?.focus();
      return;
    }

    // Dimension check
    for (let i = 0; i < state.gridRows.length; i++) {
      const r = state.gridRows[i];
      const hasDescOrReadings = (r.desc && r.desc.trim()) ||
        [r.comp1, r.comp2, r.comp3, r.comp4, r.comp5, r.comp6, r.comp7, r.comp8, r.comp9, r.comp10].some(v => v !== undefined && v !== null && String(v).trim() !== "");
      if (hasDescOrReadings && (!r.dimens || !String(r.dimens).trim())) {
        alert("You must fill 'Dimension' column !!!");
        const cell = el("ins-grid-tbody")?.querySelector(`tr[data-index="${i}"] .ins-col-dimens`);
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
        insNo,
        insDate,
        dcType,
        dcNo,
        dcDate,
        custId,
        qty,
        itemId,
        insBy,
        remarks,
        rows: state.gridRows
      };

      const res = await fetch("/api/inspection/save", {
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
    const id = Number(el("ins-id")?.value || 0);
    if (!id) {
      alert("Select an inspection report first.");
      return;
    }

    if (!confirm("Are You Sure To Delete The Records ?")) {
      return;
    }

    try {
      const res = await fetch("/api/inspection/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }

      alert("Records Deleted");
      resetFormToNew();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Failed to delete inspection report.");
    }
  }

  function handleSearch() {
    const searchNo = String(el("ins-search-no")?.value || "").trim();
    if (!searchNo) {
      alert("Enter an Inspection Report Number to search.");
      el("ins-search-no")?.focus();
      return;
    }
    loadInspection(`insNo=${encodeURIComponent(searchNo)}`);
  }

  function handlePrint() {
    const id = Number(el("ins-id")?.value || 0);
    const insNo = String(el("ins-report-no")?.value || "").trim();
    if (!id && !insNo) {
      alert("Save or select an inspection report first.");
      return;
    }
    const param = id > 0 ? `id=${id}` : `insNo=${encodeURIComponent(insNo)}`;
    window.open(`/api/print?type=inspection-random&${param}`, "_blank");
  }

  function initEvents() {
    el("ins-dc-type")?.addEventListener("change", handleDcTypeChange);
    el("ins-dc-no")?.addEventListener("change", handleDcNoChange);
    el("ins-item-code")?.addEventListener("change", handleItemCodeChange);

    el("ins-btn-load-data")?.addEventListener("click", handleLoadTemplate);
    el("ins-btn-add-row")?.addEventListener("click", addGridRow);
    el("ins-btn-del-row")?.addEventListener("click", deleteLastGridRow);

    el("ins-btn-new")?.addEventListener("click", () => loadInspection("new=1"));
    el("ins-btn-save")?.addEventListener("click", handleSave);
    el("ins-btn-delete")?.addEventListener("click", handleDelete);

    el("ins-btn-first")?.addEventListener("click", () => loadInspection("first=1"));
    el("ins-btn-last")?.addEventListener("click", () => loadInspection("last=1"));
    el("ins-btn-prev")?.addEventListener("click", () => {
      const curId = el("ins-id")?.value || 0;
      loadInspection(`prev=1&currentId=${curId}`);
    });
    el("ins-btn-next")?.addEventListener("click", () => {
      const curId = el("ins-id")?.value || 0;
      loadInspection(`next=1&currentId=${curId}`);
    });

    el("ins-btn-search")?.addEventListener("click", handleSearch);
    el("ins-search-no")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    el("ins-btn-print")?.addEventListener("click", handlePrint);
    el("ins-btn-close")?.addEventListener("click", closeInspectionRandom);
    el("ins-btn-x")?.addEventListener("click", closeInspectionRandom);
  }

  async function openInspectionRandom(target) {
    const sec = el("inspection-random");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    if (target && target.id) {
      await loadInspection(`id=${target.id}`);
    } else if (target && target.insNo) {
      await loadInspection(`insNo=${encodeURIComponent(target.insNo)}`);
    } else {
      await loadInspection("last=1");
    }
  }

  function closeInspectionRandom() {
    const sec = el("inspection-random");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  }

  window.openInspectionRandom = openInspectionRandom;
  window.closeInspectionRandom = closeInspectionRandom;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initEvents();
    });
  } else {
    initEvents();
  }
})();
