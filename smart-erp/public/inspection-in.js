// Final Inspection Report - Common (frmInspectionIn)
(function () {
  let state = {
    mode: "new",
    record: null,
    nextInsNo: "1",
    customers: [],
    items: [],
    inspectors: [],
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
    const tbody = el("insin-grid-body");
    if (!tbody) return;

    const trs = tbody.querySelectorAll("tr");
    state.gridRows = Array.from(trs).map((tr, idx) => {
      return {
        slNo: idx + 1,
        desc: tr.querySelector(".insin-col-desc")?.value || "",
        dimens: tr.querySelector(".insin-col-dimens")?.value || "",
        loTol: tr.querySelector(".insin-col-lotol")?.value || "",
        hiTol: tr.querySelector(".insin-col-hitol")?.value || "",
        comp1: tr.querySelector(".insin-col-comp1")?.value || "",
        comp2: tr.querySelector(".insin-col-comp2")?.value || "",
        comp3: tr.querySelector(".insin-col-comp3")?.value || "",
        comp4: tr.querySelector(".insin-col-comp4")?.value || "",
        comp5: tr.querySelector(".insin-col-comp5")?.value || "",
        comp6: tr.querySelector(".insin-col-comp6")?.value || "",
        comp7: tr.querySelector(".insin-col-comp7")?.value || "",
        comp8: tr.querySelector(".insin-col-comp8")?.value || "",
        comp9: tr.querySelector(".insin-col-comp9")?.value || "",
        comp10: tr.querySelector(".insin-col-comp10")?.value || ""
      };
    });
  }

  function renderGrid() {
    const tbody = el("insin-grid-body");
    if (!tbody) return;

    if (!state.gridRows || state.gridRows.length === 0) {
      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    }

    tbody.innerHTML = state.gridRows.map((r, idx) => `
      <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: center; font-weight: bold; width: 32px;">${idx + 1}</td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 160px;">
          <input type="text" class="invmfg-input insin-col-desc" data-index="${idx}" value="${escapeHtml(r.desc || "")}" style="width: 100%; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 85px;">
          <input type="text" class="invmfg-input insin-col-dimens" data-index="${idx}" value="${escapeHtml(r.dimens || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-weight: bold; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 65px;">
          <input type="text" class="invmfg-input insin-col-lotol" data-index="${idx}" value="${escapeHtml(r.loTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 65px;">
          <input type="text" class="invmfg-input insin-col-hitol" data-index="${idx}" value="${escapeHtml(r.hiTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp1" data-index="${idx}" value="${escapeHtml(r.comp1 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp2" data-index="${idx}" value="${escapeHtml(r.comp2 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp3" data-index="${idx}" value="${escapeHtml(r.comp3 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp4" data-index="${idx}" value="${escapeHtml(r.comp4 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp5" data-index="${idx}" value="${escapeHtml(r.comp5 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp6" data-index="${idx}" value="${escapeHtml(r.comp6 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp7" data-index="${idx}" value="${escapeHtml(r.comp7 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp8" data-index="${idx}" value="${escapeHtml(r.comp8 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp9" data-index="${idx}" value="${escapeHtml(r.comp9 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input insin-col-comp10" data-index="${idx}" value="${escapeHtml(r.comp10 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("change", syncGridRowsFromDom);
    });
  }

  function addRow() {
    syncGridRowsFromDom();
    state.gridRows.push(createEmptyGridRow(state.gridRows.length + 1));
    renderGrid();
  }

  function delRow() {
    syncGridRowsFromDom();
    if (state.gridRows.length > 1) {
      state.gridRows.pop();
      renderGrid();
    }
  }

  function populateCustomers() {
    const sel = el("insin-cust");
    if (!sel) return;

    let opts = '<option value="">-- Select Customer --</option>';
    (state.customers || []).forEach((c) => {
      opts += `<option value="${c.cust_id}">${escapeHtml(c.cust_name)}</option>`;
    });
    sel.innerHTML = opts;
  }

  function populateItems() {
    const sel = el("insin-item-code");
    if (!sel) return;

    let opts = '<option value="">-- Select Item Code --</option>';
    (state.items || []).forEach((it) => {
      opts += `<option value="${it.item_id}" data-name="${escapeHtml(it.item_name || '')}">${escapeHtml(it.item_code)}</option>`;
    });
    sel.innerHTML = opts;
  }

  function populateInspectors() {
    const sel = el("insin-inspected-by");
    if (!sel) return;

    let opts = '<option value="">-- Select Inspector --</option>';
    (state.inspectors || []).forEach((ins) => {
      opts += `<option value="${escapeHtml(ins)}">${escapeHtml(ins)}</option>`;
    });
    sel.innerHTML = opts;
  }

  async function handleItemChange() {
    const sel = el("insin-item-code");
    const opt = sel?.selectedOptions?.[0];
    const itemId = Number(sel?.value || 0);

    if (!itemId) {
      if (el("insin-item-name")) el("insin-item-name").value = "";
      if (el("insin-item-id")) el("insin-item-id").value = "0";
      return;
    }

    const itemName = opt ? opt.dataset.name || "" : "";
    if (el("insin-item-name")) el("insin-item-name").value = itemName;
    if (el("insin-item-id")) el("insin-item-id").value = String(itemId);

    // If in new mode, fetch inspect_ref template for this item
    if (state.mode === "new" && itemId > 0) {
      try {
        const res = await fetch(`/api/inspection/item-template?itemId=${itemId}`);
        if (res.ok) {
          const tData = await res.json();
          const tRows = tData.template || tData.rows || [];
          if (tRows.length > 0) {
            state.gridRows = tRows.map((r, i) => ({
              slNo: i + 1,
              desc: r.desc || "",
              dimens: r.dimens || "",
              loTol: r.loTol || "",
              hiTol: r.hiTol || "",
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
          }
        }
      } catch (err) {
        console.error("load inspect_ref error:", err);
      }
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;

    state.mode = bundle.mode || "new";
    state.record = bundle.record;
    state.nextInsNo = bundle.nextInsNo || "1";
    state.customers = bundle.customers || [];
    state.items = bundle.items || [];
    state.inspectors = bundle.inspectors || [];

    populateCustomers();
    populateItems();
    populateInspectors();

    const saveBtn = el("insin-btn-save");
    const delBtn = el("insin-btn-delete");

    if (state.mode === "edit" && state.record) {
      const r = state.record;
      if (el("insin-id")) el("insin-id").value = String(r.id || 0);
      if (el("insin-report-no")) el("insin-report-no").value = r.insNo || "";
      if (el("insin-date")) el("insin-date").value = r.insDate || "";
      if (el("insin-cust")) el("insin-cust").value = String(r.custId || "");
      if (el("insin-cust-id")) el("insin-cust-id").value = String(r.custId || 0);
      if (el("insin-item-code")) el("insin-item-code").value = String(r.itemId || "");
      if (el("insin-item-id")) el("insin-item-id").value = String(r.itemId || 0);
      if (el("insin-item-name")) el("insin-item-name").value = r.itemName || "";
      if (el("insin-qty")) el("insin-qty").value = String(r.qty || 0);
      if (el("insin-inspected-by")) el("insin-inspected-by").value = r.insBy || "";
      if (el("insin-remarks")) el("insin-remarks").value = r.remarks || "";

      state.gridRows = r.gridRows && r.gridRows.length > 0 ? r.gridRows : [1, 2, 3, 4, 5].map(createEmptyGridRow);
      renderGrid();

      if (saveBtn) saveBtn.textContent = "Modify";
      if (delBtn) delBtn.disabled = false;
    } else {
      // New mode
      if (el("insin-id")) el("insin-id").value = "0";
      if (el("insin-report-no")) el("insin-report-no").value = state.nextInsNo || "1";
      if (el("insin-date")) el("insin-date").value = getTodayDate();
      if (el("insin-cust")) el("insin-cust").value = "";
      if (el("insin-cust-id")) el("insin-cust-id").value = "0";
      if (el("insin-item-code")) el("insin-item-code").value = "";
      if (el("insin-item-id")) el("insin-item-id").value = "0";
      if (el("insin-item-name")) el("insin-item-name").value = "";
      if (el("insin-qty")) el("insin-qty").value = "0";
      if (el("insin-inspected-by")) el("insin-inspected-by").value = "";
      if (el("insin-remarks")) el("insin-remarks").value = "";

      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
      renderGrid();

      if (saveBtn) saveBtn.textContent = "Save";
      if (delBtn) delBtn.disabled = true;
    }
  }

  async function loadReport(paramStr) {
    try {
      const res = await fetch(`/api/inspection-in?${paramStr}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load Common Inspection Report.");
        return;
      }
      if (data.message && !data.record) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadReport error:", err);
    }
  }

  async function handleSave() {
    syncGridRowsFromDom();

    const id = Number(el("insin-id")?.value || 0);
    const insNo = String(el("insin-report-no")?.value || "").trim();
    const insDate = el("insin-date")?.value || getTodayDate();
    const custId = Number(el("insin-cust")?.value || 0);
    const itemId = Number(el("insin-item-code")?.value || 0);
    const qty = Number(el("insin-qty")?.value || 0);
    const insBy = String(el("insin-inspected-by")?.value || "").trim();
    const remarks = String(el("insin-remarks")?.value || "").trim();

    // Exact VB6 Validations (Proc_D4CD68)
    if (!insNo) {
      alert("Enter the Inspection Number...");
      el("insin-report-no")?.focus();
      return;
    }
    if (!custId) {
      alert("Please Select a Customer.....");
      el("insin-cust")?.focus();
      return;
    }
    if (!itemId) {
      alert("Please Select a Item Code/Part No......");
      el("insin-item-code")?.focus();
      return;
    }
    if (!qty) {
      alert("Please Enter the Qty");
      el("insin-qty")?.focus();
      return;
    }
    if (!insBy) {
      alert("Enter the Person who has made the Inspection");
      el("insin-inspected-by")?.focus();
      return;
    }

    // Dimension validation
    for (let i = 0; i < state.gridRows.length; i++) {
      const r = state.gridRows[i];
      const hasContent = (r.desc && r.desc.trim()) ||
        [r.comp1, r.comp2, r.comp3, r.comp4, r.comp5, r.comp6, r.comp7, r.comp8, r.comp9, r.comp10].some(v => v !== undefined && v !== null && String(v).trim() !== "");
      if (hasContent && (!r.dimens || !r.dimens.trim())) {
        alert("You must fill 'Dimension' column !!!");
        return;
      }
    }

    if (!confirm("Store the data ?")) {
      return;
    }

    try {
      const res = await fetch("/api/inspection-in/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          insNo,
          insDate,
          custId,
          itemId,
          qty,
          insBy,
          remarks,
          rows: state.gridRows
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save Common Inspection Report.");
        return;
      }

      alert("Record Stored successfully .");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving Common Inspection Report.");
    }
  }

  async function handleDelete() {
    const id = Number(el("insin-id")?.value || 0);
    if (!id) {
      alert("Please select a record to delete.");
      return;
    }

    if (!confirm("Are You Sure To Delete The Records ?")) {
      return;
    }

    try {
      const res = await fetch("/api/inspection-in/delete", {
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
      applyBundle(data);
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting Common Inspection Report.");
    }
  }

  function handlePrint() {
    const saveBtn = el("insin-btn-save");
    if (saveBtn?.textContent === "Save") {
      alert("You should save the Record First in order to take print...");
      return;
    }

    const id = Number(el("insin-id")?.value || 0);
    const insNo = String(el("insin-report-no")?.value || "").trim();
    if (!id && !insNo) {
      alert("You should save the Record First in order to take print...");
      return;
    }

    window.open(`/api/print?type=inspection-common&id=${id || insNo}`, "_blank");
  }

  function handleSearch() {
    const term = String(el("insin-search-no")?.value || "").trim();
    if (!term) {
      alert("Please enter an Inspection Number to search.");
      return;
    }
    loadReport(`insNo=${encodeURIComponent(term)}`);
  }

  function handleCorresClick() {
    const insNo = el("insin-report-no")?.value || "";
    const cust = el("insin-cust")?.selectedOptions?.[0]?.textContent || "";
    if (window.openCorres) {
      window.openCorres("Common Inspection", insNo, cust);
    } else {
      alert(`Correspondences for Common Inspection No: ${insNo} (${cust})`);
    }
  }

  function initEvents() {
    el("insin-item-code")?.addEventListener("change", handleItemChange);

    el("insin-btn-add-row")?.addEventListener("click", addRow);
    el("insin-btn-del-row")?.addEventListener("click", delRow);

    el("insin-btn-new")?.addEventListener("click", () => loadReport("new=1"));
    el("insin-btn-save")?.addEventListener("click", handleSave);
    el("insin-btn-delete")?.addEventListener("click", handleDelete);

    el("insin-btn-first")?.addEventListener("click", () => loadReport("first=1"));
    el("insin-btn-last")?.addEventListener("click", () => loadReport("last=1"));
    el("insin-btn-prev")?.addEventListener("click", () => {
      const curId = Number(el("insin-id")?.value || 0);
      loadReport(`prev=1&currentId=${curId}`);
    });
    el("insin-btn-next")?.addEventListener("click", () => {
      const curId = Number(el("insin-id")?.value || 0);
      loadReport(`next=1&currentId=${curId}`);
    });

    el("insin-btn-find")?.addEventListener("click", handleSearch);
    el("insin-search-no")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    el("insin-btn-print")?.addEventListener("click", handlePrint);
    el("insin-btn-close")?.addEventListener("click", closeInspectionIn);
    el("insin-btn-x")?.addEventListener("click", closeInspectionIn);
    el("insin-btn-corres")?.addEventListener("click", handleCorresClick);
  }

  async function openInspectionIn(target) {
    const sec = el("inspection-in");
    if (!sec) return;

    sec.hidden = false;
    sec.style.display = "flex";

    if (target && target.id) {
      await loadReport(`id=${target.id}`);
    } else if (target && target.insNo) {
      await loadReport(`insNo=${encodeURIComponent(target.insNo)}`);
    } else {
      await loadReport("last=1");
    }
  }

  function closeInspectionIn() {
    const sec = el("inspection-in");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  }

  window.openInspectionIn = openInspectionIn;
  window.closeInspectionIn = closeInspectionIn;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
  } else {
    initEvents();
  }
})();
