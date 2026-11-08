// Final Inspection Report - SubContract (frmInspectionSC)
(function () {
  let state = {
    mode: "new",
    record: null,
    nextInsNo: "1",
    inspectors: [],
    dcs: [],
    items: [],
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
    const tbody = el("inssc-grid-body");
    if (!tbody) return;

    const trs = tbody.querySelectorAll("tr");
    state.gridRows = Array.from(trs).map((tr, idx) => {
      return {
        slNo: idx + 1,
        desc: tr.querySelector(".inssc-col-desc")?.value || "",
        dimens: tr.querySelector(".inssc-col-dimens")?.value || "",
        loTol: tr.querySelector(".inssc-col-lotol")?.value || "",
        hiTol: tr.querySelector(".inssc-col-hitol")?.value || "",
        comp1: tr.querySelector(".inssc-col-comp1")?.value || "",
        comp2: tr.querySelector(".inssc-col-comp2")?.value || "",
        comp3: tr.querySelector(".inssc-col-comp3")?.value || "",
        comp4: tr.querySelector(".inssc-col-comp4")?.value || "",
        comp5: tr.querySelector(".inssc-col-comp5")?.value || "",
        comp6: tr.querySelector(".inssc-col-comp6")?.value || "",
        comp7: tr.querySelector(".inssc-col-comp7")?.value || "",
        comp8: tr.querySelector(".inssc-col-comp8")?.value || "",
        comp9: tr.querySelector(".inssc-col-comp9")?.value || "",
        comp10: tr.querySelector(".inssc-col-comp10")?.value || ""
      };
    });
  }

  function renderGrid() {
    const tbody = el("inssc-grid-body");
    if (!tbody) return;

    if (!state.gridRows || state.gridRows.length === 0) {
      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
    }

    tbody.innerHTML = state.gridRows.map((r, idx) => `
      <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
        <td style="border: 1px solid #c0c0c0; padding: 2px; text-align: center; font-weight: bold; width: 32px;">${idx + 1}</td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 160px;">
          <input type="text" class="invmfg-input inssc-col-desc" data-index="${idx}" value="${escapeHtml(r.desc || "")}" style="width: 100%; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 85px;">
          <input type="text" class="invmfg-input inssc-col-dimens" data-index="${idx}" value="${escapeHtml(r.dimens || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-weight: bold; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 65px;">
          <input type="text" class="invmfg-input inssc-col-lotol" data-index="${idx}" value="${escapeHtml(r.loTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 65px;">
          <input type="text" class="invmfg-input inssc-col-hitol" data-index="${idx}" value="${escapeHtml(r.hiTol || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp1" data-index="${idx}" value="${escapeHtml(r.comp1 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp2" data-index="${idx}" value="${escapeHtml(r.comp2 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp3" data-index="${idx}" value="${escapeHtml(r.comp3 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp4" data-index="${idx}" value="${escapeHtml(r.comp4 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp5" data-index="${idx}" value="${escapeHtml(r.comp5 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp6" data-index="${idx}" value="${escapeHtml(r.comp6 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp7" data-index="${idx}" value="${escapeHtml(r.comp7 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp8" data-index="${idx}" value="${escapeHtml(r.comp8 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp9" data-index="${idx}" value="${escapeHtml(r.comp9 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
        </td>
        <td style="border: 1px solid #c0c0c0; padding: 1px; width: 48px;">
          <input type="text" class="invmfg-input inssc-col-comp10" data-index="${idx}" value="${escapeHtml(r.comp10 || "")}" style="width: 100%; text-align: right; box-sizing: border-box; font-size: 11px;">
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

  function populateDcs() {
    const sel = el("inssc-dc-no");
    if (!sel) return;

    let opts = '<option value="">-- Select DC Number --</option>';
    (state.dcs || []).forEach((d) => {
      opts += `<option value="${escapeHtml(d.dcno)}" data-id="${d.dcid}">${escapeHtml(d.dcno)}</option>`;
    });
    sel.innerHTML = opts;
  }

  function populateInspectors() {
    const sel = el("inssc-inspected-by");
    if (!sel) return;

    let opts = '<option value="">-- Select Inspector --</option>';
    (state.inspectors || []).forEach((ins) => {
      opts += `<option value="${escapeHtml(ins)}">${escapeHtml(ins)}</option>`;
    });
    sel.innerHTML = opts;
  }

  function populateItemCodes(items) {
    const sel = el("inssc-item-code");
    if (!sel) return;

    state.items = items || [];
    let opts = '<option value="">-- Select Item Code --</option>';
    state.items.forEach((it) => {
      opts += `<option value="${escapeHtml(it.item_code)}" data-id="${it.itemid}" data-qty="${it.qty || 0}" data-rej="${it.rejqty || 0}" data-name="${escapeHtml(it.item_name || '')}">${escapeHtml(it.item_code)}</option>`;
    });
    sel.innerHTML = opts;
  }

  async function handleDcChange() {
    const sel = el("inssc-dc-no");
    const dcNo = sel?.value || "";
    if (!dcNo) {
      if (el("inssc-dc-date")) el("inssc-dc-date").value = "";
      if (el("inssc-supp")) el("inssc-supp").value = "";
      if (el("inssc-supp-id")) el("inssc-supp-id").value = "0";
      populateItemCodes([]);
      if (el("inssc-item-name")) el("inssc-item-name").value = "";
      if (el("inssc-item-id")) el("inssc-item-id").value = "0";
      if (el("inssc-dc-qty")) el("inssc-dc-qty").value = "0";
      if (el("inssc-rej-qty")) el("inssc-rej-qty").value = "0";
      return;
    }

    try {
      const res = await fetch(`/api/inspection-sc/dc-meta?dcNo=${encodeURIComponent(dcNo)}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load DC details.");
        return;
      }

      if (el("inssc-dc-date")) el("inssc-dc-date").value = data.dcDate || "";
      if (el("inssc-date") && state.mode === "new") el("inssc-date").value = data.dcDate || getTodayDate();
      if (el("inssc-supp")) el("inssc-supp").value = data.suppName || "";
      if (el("inssc-supp-id")) el("inssc-supp-id").value = String(data.suppId || 0);

      populateItemCodes(data.items || []);

      if (data.items && data.items.length === 1) {
        selItemByIndex(0);
      }
    } catch (err) {
      console.error("handleDcChange error:", err);
    }
  }

  function selItemByIndex(idx) {
    const sel = el("inssc-item-code");
    if (!sel || !state.items || !state.items[idx]) return;
    sel.selectedIndex = idx + 1;
    handleItemCodeChange();
  }

  async function handleItemCodeChange() {
    const sel = el("inssc-item-code");
    const opt = sel?.selectedOptions?.[0];
    if (!opt || !sel.value) {
      if (el("inssc-item-name")) el("inssc-item-name").value = "";
      if (el("inssc-item-id")) el("inssc-item-id").value = "0";
      if (el("inssc-dc-qty")) el("inssc-dc-qty").value = "0";
      return;
    }

    const itemId = Number(opt.dataset.id || 0);
    const itemName = opt.dataset.name || "";
    const qty = Number(opt.dataset.qty || 0);
    const rej = Number(opt.dataset.rej || 0);

    if (el("inssc-item-name")) el("inssc-item-name").value = itemName;
    if (el("inssc-item-id")) el("inssc-item-id").value = String(itemId);
    if (el("inssc-dc-qty")) el("inssc-dc-qty").value = String(qty);
    if (el("inssc-rej-qty") && state.mode === "new") el("inssc-rej-qty").value = String(rej);

    // If new mode and itemId set, load inspect_ref template
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

  function handleRejQtyChange() {
    const dcQty = Number(el("inssc-dc-qty")?.value || 0);
    const rejQty = Number(el("inssc-rej-qty")?.value || 0);
    if (rejQty > dcQty) {
      alert("Rejected Qty Should not exceed " + dcQty);
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;

    state.mode = bundle.mode || "new";
    state.record = bundle.record;
    state.nextInsNo = bundle.nextInsNo || "1";
    state.inspectors = bundle.inspectors || [];
    state.dcs = bundle.dcs || [];

    populateDcs();
    populateInspectors();

    const saveBtn = el("inssc-btn-save");
    const delBtn = el("inssc-btn-delete");

    if (state.mode === "edit" && state.record) {
      const r = state.record;
      if (el("inssc-id")) el("inssc-id").value = String(r.id || 0);
      if (el("inssc-report-no")) el("inssc-report-no").value = r.insNo || "";
      if (el("inssc-date")) el("inssc-date").value = r.insDate || "";
      if (el("inssc-dc-type")) el("inssc-dc-type").value = r.dcType || "SubContract";
      if (el("inssc-dc-no")) el("inssc-dc-no").value = r.dcNo || "";
      if (el("inssc-dc-date")) el("inssc-dc-date").value = r.dcDate || "";
      if (el("inssc-supp")) el("inssc-supp").value = r.suppName || "";
      if (el("inssc-supp-id")) el("inssc-supp-id").value = String(r.suppId || 0);

      // Populate items with current item
      populateItemCodes([{ itemid: r.itemId, item_code: r.itemCode, item_name: r.itemName, qty: r.qty, rejqty: r.rejQty }]);
      if (el("inssc-item-code")) el("inssc-item-code").value = r.itemCode || "";
      if (el("inssc-item-name")) el("inssc-item-name").value = r.itemName || "";
      if (el("inssc-item-id")) el("inssc-item-id").value = String(r.itemId || 0);
      if (el("inssc-dc-qty")) el("inssc-dc-qty").value = String(r.qty || 0);
      if (el("inssc-rej-qty")) el("inssc-rej-qty").value = String(r.rejQty || 0);
      if (el("inssc-inspected-by")) el("inssc-inspected-by").value = r.insBy || "";
      if (el("inssc-remarks")) el("inssc-remarks").value = r.remarks || "";

      state.gridRows = r.gridRows && r.gridRows.length > 0 ? r.gridRows : [1, 2, 3, 4, 5].map(createEmptyGridRow);
      renderGrid();

      if (saveBtn) saveBtn.textContent = "Modify";
      if (delBtn) delBtn.disabled = false;
    } else {
      // New mode
      if (el("inssc-id")) el("inssc-id").value = "0";
      if (el("inssc-report-no")) el("inssc-report-no").value = state.nextInsNo || "1";
      if (el("inssc-date")) el("inssc-date").value = getTodayDate();
      if (el("inssc-dc-type")) el("inssc-dc-type").value = "SubContract";
      if (el("inssc-dc-no")) el("inssc-dc-no").value = "";
      if (el("inssc-dc-date")) el("inssc-dc-date").value = "";
      if (el("inssc-supp")) el("inssc-supp").value = "";
      if (el("inssc-supp-id")) el("inssc-supp-id").value = "0";
      populateItemCodes([]);
      if (el("inssc-item-name")) el("inssc-item-name").value = "";
      if (el("inssc-item-id")) el("inssc-item-id").value = "0";
      if (el("inssc-dc-qty")) el("inssc-dc-qty").value = "0";
      if (el("inssc-rej-qty")) el("inssc-rej-qty").value = "0";
      if (el("inssc-inspected-by")) el("inssc-inspected-by").value = "";
      if (el("inssc-remarks")) el("inssc-remarks").value = "";

      state.gridRows = [1, 2, 3, 4, 5].map(createEmptyGridRow);
      renderGrid();

      if (saveBtn) saveBtn.textContent = "Save";
      if (delBtn) delBtn.disabled = true;
    }
  }

  async function loadReport(paramStr) {
    try {
      const res = await fetch(`/api/inspection-sc?${paramStr}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load Subcontract Inspection Report.");
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

    const id = Number(el("inssc-id")?.value || 0);
    const insNo = String(el("inssc-report-no")?.value || "").trim();
    const insDate = el("inssc-date")?.value || getTodayDate();
    const dcType = el("inssc-dc-type")?.value || "SubContract";
    const dcNo = String(el("inssc-dc-no")?.value || "").trim();
    const dcDate = el("inssc-dc-date")?.value || null;
    const suppId = Number(el("inssc-supp-id")?.value || 0);
    const itemId = Number(el("inssc-item-id")?.value || 0);
    const dcQty = Number(el("inssc-dc-qty")?.value || 0);
    const rejQty = Number(el("inssc-rej-qty")?.value || 0);
    const insBy = String(el("inssc-inspected-by")?.value || "").trim();
    const remarks = String(el("inssc-remarks")?.value || "").trim();

    // Exact VB6 Validations
    if (!insNo) {
      alert("Enter the Inspection Number ");
      el("inssc-report-no")?.focus();
      return;
    }
    if (!dcNo) {
      alert("Please Select a DC Number.....");
      el("inssc-dc-no")?.focus();
      return;
    }
    if (!itemId) {
      alert("Please Select a Item Code/Part No......");
      el("inssc-item-code")?.focus();
      return;
    }
    if (!insBy) {
      alert("Enter the Person who has made the Inspection");
      el("inssc-inspected-by")?.focus();
      return;
    }
    if (rejQty > dcQty) {
      alert("Rejected Qty Should not exceed " + dcQty);
      el("inssc-rej-qty")?.focus();
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
      const res = await fetch("/api/inspection-sc/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          insNo,
          insDate,
          dcType,
          dcNo,
          dcDate,
          suppId,
          itemId,
          qty: dcQty,
          rejQty,
          insBy,
          remarks,
          rows: state.gridRows
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save SubContract Inspection.");
        return;
      }

      alert("Record Stored successfully .");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving SubContract Inspection.");
    }
  }

  async function handleDelete() {
    const id = Number(el("inssc-id")?.value || 0);
    if (!id) {
      alert("Please select a record to delete.");
      return;
    }

    if (!confirm("Are You Sure To Delete The Records ?")) {
      return;
    }

    try {
      const res = await fetch("/api/inspection-sc/delete", {
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
      alert("Error deleting SubContract Inspection.");
    }
  }

  function handlePrint() {
    const saveBtn = el("inssc-btn-save");
    if (saveBtn?.textContent === "Save") {
      alert("You should save the Record First in order to take print...");
      return;
    }

    const id = Number(el("inssc-id")?.value || 0);
    const insNo = String(el("inssc-report-no")?.value || "").trim();
    if (!id && !insNo) {
      alert("You should save the Record First in order to take print...");
      return;
    }

    window.open(`/api/print?type=inspection-sc&id=${id || insNo}`, "_blank");
  }

  function handleSearch() {
    const term = String(el("inssc-search-no")?.value || "").trim();
    if (!term) {
      alert("Please enter an Inspection Number to search.");
      return;
    }
    loadReport(`insNo=${encodeURIComponent(term)}`);
  }

  function handleCorresClick() {
    const insNo = el("inssc-report-no")?.value || "";
    const supp = el("inssc-supp")?.value || "";
    if (window.openCorres) {
      window.openCorres("SubContract Inspection", insNo, supp);
    } else {
      alert(`Correspondences for Inspection No: ${insNo} (${supp})`);
    }
  }

  function initEvents() {
    el("inssc-dc-no")?.addEventListener("change", handleDcChange);
    el("inssc-item-code")?.addEventListener("change", handleItemCodeChange);
    el("inssc-rej-qty")?.addEventListener("change", handleRejQtyChange);
    el("inssc-rej-qty")?.addEventListener("input", handleRejQtyChange);

    el("inssc-btn-add-row")?.addEventListener("click", addRow);
    el("inssc-btn-del-row")?.addEventListener("click", delRow);

    el("inssc-btn-new")?.addEventListener("click", () => loadReport("new=1"));
    el("inssc-btn-save")?.addEventListener("click", handleSave);
    el("inssc-btn-delete")?.addEventListener("click", handleDelete);

    el("inssc-btn-first")?.addEventListener("click", () => loadReport("first=1"));
    el("inssc-btn-last")?.addEventListener("click", () => loadReport("last=1"));
    el("inssc-btn-prev")?.addEventListener("click", () => {
      const curId = Number(el("inssc-id")?.value || 0);
      loadReport(`prev=1&currentId=${curId}`);
    });
    el("inssc-btn-next")?.addEventListener("click", () => {
      const curId = Number(el("inssc-id")?.value || 0);
      loadReport(`next=1&currentId=${curId}`);
    });

    el("inssc-btn-find")?.addEventListener("click", handleSearch);
    el("inssc-search-no")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });

    el("inssc-btn-print")?.addEventListener("click", handlePrint);
    el("inssc-btn-close")?.addEventListener("click", closeInspectionSC);
    el("inssc-btn-x")?.addEventListener("click", closeInspectionSC);
    el("inssc-btn-corres")?.addEventListener("click", handleCorresClick);
  }

  async function openInspectionSC(target) {
    const sec = el("inspection-sc");
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

  function closeInspectionSC() {
    const sec = el("inspection-sc");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  }

  window.openInspectionSC = openInspectionSC;
  window.closeInspectionSC = closeInspectionSC;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
  } else {
    initEvents();
  }
})();
