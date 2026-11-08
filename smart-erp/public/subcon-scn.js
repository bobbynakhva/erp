(() => {
  let state = {
    mode: "view", // "view" | "new" | "modify"
    note: null,
    lines: [],
    meta: {
      stores: [],
      costCenters: [],
      openGrns: [],
      nextScnId: 1
    },
    sourceStoreId: 0,
    sourceStoreName: "",
    dcId: 0,
    isLocked: false,
    lockReason: ""
  };

  const section = document.getElementById("subcon-scn");
  if (!section) return;

  const txtId = document.getElementById("subcon-scn-id");
  const dtpDate = document.getElementById("subcon-scn-date");
  const cmbCostCntr = document.getElementById("subcon-scn-cost-cntr");
  const cmbSourceStore = document.getElementById("subcon-scn-source-store");
  const cmbDestStore = document.getElementById("subcon-scn-dest-store");

  const cmbGrnId = document.getElementById("subcon-scn-grn-id");
  const cardDetail = document.getElementById("subcon-scn-grn-detail");
  const lineGrnDate = document.getElementById("subcon-scn-detail-grndate");
  const lineVendor = document.getElementById("subcon-scn-detail-vendor");
  const lineDcNo = document.getElementById("subcon-scn-detail-dcno");
  const lineDcDate = document.getElementById("subcon-scn-detail-dcdate");

  const txtPrepared = document.getElementById("subcon-scn-prepared");
  const txtRemarks = document.getElementById("subcon-scn-remarks");

  const itemsBody = document.getElementById("subcon-scn-items-body");
  const lblGuide = document.getElementById("subcon-scn-unit-guide");

  const txtSearchId = document.getElementById("subcon-scn-search-id");
  const btnSearch = document.getElementById("subcon-scn-btn-search");

  // Toolbar buttons
  const btnNew = document.getElementById("subcon-scn-btn-new");
  const btnSave = document.getElementById("subcon-scn-btn-save");
  const btnModify = document.getElementById("subcon-scn-btn-modify");
  const btnDelete = document.getElementById("subcon-scn-btn-delete");
  const btnFirst = document.getElementById("subcon-scn-btn-first");
  const btnPrev = document.getElementById("subcon-scn-btn-prev");
  const btnNext = document.getElementById("subcon-scn-btn-next");
  const btnLast = document.getElementById("subcon-scn-btn-last");
  const btnPrint = document.getElementById("subcon-scn-btn-print");
  const btnClose = document.getElementById("subcon-scn-btn-close");
  const btnX = document.getElementById("subcon-scn-btn-x");

  function nowIsoDate() {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNum(n) {
    const v = Number(n);
    return isNaN(v) ? "0.00" : v.toFixed(2);
  }

  function updateCardText(grnDate, vendorName, dcNo, dcDate) {
    if (lineGrnDate) lineGrnDate.textContent = `GRN Date: ${grnDate || ""}`;
    if (lineVendor) lineVendor.textContent = `SubContractor: ${vendorName || ""}`;
    if (lineDcNo) lineDcNo.textContent = ` DC No.: ${dcNo || ""}`;
    if (lineDcDate) lineDcDate.textContent = ` DC Date: ${dcDate || ""}`;
  }

  function updateControlsState() {
    const isEditing = state.mode === "new" || state.mode === "modify";
    const hasRecord = state.note && state.note.scnSubConId > 0;

    btnSave.disabled = !isEditing;
    btnNew.disabled = isEditing;
    btnModify.disabled = isEditing || !hasRecord || state.isLocked;
    btnDelete.disabled = isEditing || !hasRecord || state.isLocked;
    btnFirst.disabled = isEditing || !hasRecord;
    btnPrev.disabled = isEditing || !hasRecord;
    btnNext.disabled = isEditing || !hasRecord;
    btnLast.disabled = isEditing || !hasRecord;

    dtpDate.disabled = !isEditing;
    cmbCostCntr.disabled = !isEditing;
    cmbDestStore.disabled = !isEditing;
    cmbGrnId.disabled = state.mode !== "new";
    txtPrepared.readOnly = !isEditing;
    txtRemarks.readOnly = !isEditing;

    const inputs = itemsBody.querySelectorAll("input");
    inputs.forEach((inp) => {
      inp.readOnly = !isEditing;
    });
  }

  function renderLines() {
    if (!state.lines || state.lines.length === 0) {
      itemsBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #888; padding: 12px;">No line items found.</td></tr>`;
      return;
    }

    let html = "";
    state.lines.forEach((line, idx) => {
      const isEditing = state.mode === "new" || state.mode === "modify";
      html += `
        <tr data-index="${idx}">
          <td style="text-align: center;">${line.slno || (idx + 1)}</td>
          <td>${escapeHtml(line.itemCode || "")}</td>
          <td>${escapeHtml(line.itemName || "")}</td>
          <td style="text-align: right;">${formatNum(line.dnQty)}</td>
          <td style="text-align: right;">${formatNum(line.qtyRecd)}</td>
          <td style="text-align: right;">
            <input type="number" step="0.01" class="scnpurch-cell-input txt-accp" value="${formatNum(line.qtyAccp)}" ${!isEditing ? "readonly" : ""} style="text-align: right; width: 100%; box-sizing: border-box;" />
          </td>
          <td style="text-align: right;">
            <input type="number" step="0.01" class="scnpurch-cell-input txt-rej" value="${formatNum(line.qtyRej)}" ${!isEditing ? "readonly" : ""} style="text-align: right; width: 100%; box-sizing: border-box;" />
          </td>
          <td>
            <input type="text" class="scnpurch-cell-input txt-rem" value="${escapeHtml(line.remarks || "")}" ${!isEditing ? "readonly" : ""} style="width: 100%; box-sizing: border-box;" />
          </td>
          <td style="text-align: right;">
            <input type="number" step="0.01" class="scnpurch-cell-input txt-tostock" value="${formatNum(line.qtyToStock)}" ${!isEditing ? "readonly" : ""} style="text-align: right; width: 100%; box-sizing: border-box;" />
          </td>
          <td style="text-align: right;">${formatNum(line.currentStk)}</td>
        </tr>
      `;
    });
    itemsBody.innerHTML = html;
  }

  function attachTableEvents() {
    itemsBody.addEventListener("focusin", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const idx = Number(row.dataset.index);
      const line = state.lines[idx];
      if (line && lblGuide) {
        lblGuide.textContent = `ITEM : ${line.itemCode || ""}    UOM : ${line.uom || ""}`;
      }
    });

    itemsBody.addEventListener("input", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const idx = Number(row.dataset.index);
      const line = state.lines[idx];
      if (!line) return;

      const accpInput = row.querySelector(".txt-accp");
      const rejInput = row.querySelector(".txt-rej");
      const remInput = row.querySelector(".txt-rem");
      const toStockInput = row.querySelector(".txt-tostock");

      if (e.target.classList.contains("txt-accp")) {
        const val = Number(e.target.value) || 0;
        line.qtyAccp = val;
        line.qtyToStock = val;
        if (toStockInput) toStockInput.value = formatNum(val);
      } else if (e.target.classList.contains("txt-rej")) {
        line.qtyRej = Number(e.target.value) || 0;
      } else if (e.target.classList.contains("txt-rem")) {
        line.remarks = e.target.value;
      } else if (e.target.classList.contains("txt-tostock")) {
        line.qtyToStock = Number(e.target.value) || 0;
      }
    });

    itemsBody.addEventListener("change", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const idx = Number(row.dataset.index);
      const line = state.lines[idx];
      if (!line) return;

      if (e.target.classList.contains("txt-accp") || e.target.classList.contains("txt-rej")) {
        const accp = Number(line.qtyAccp) || 0;
        const rej = Number(line.qtyRej) || 0;
        const recd = Number(line.qtyRecd) || 0;

        if (accp <= 0 && rej <= 0) {
          alert("Both Accepted Qty and Rejected Qty should not be Zero... ");
          return;
        }

        if (accp + rej > recd) {
          alert(`Sum of Accepted Qty (${accp}) and Rejected Qty (${rej}) cannot exceed Received Qty (${recd}).`);
          return;
        }
      }
    });
  }

  function setFormData(bundle) {
    if (!bundle) return;

    state.meta.stores = bundle.stores || [];
    state.meta.costCenters = bundle.costCenters || [];
    state.meta.openGrns = bundle.openGrns || [];
    state.meta.nextScnId = bundle.nextScnId || 1;

    renderSelectOptions(cmbDestStore, state.meta.stores, "id", "name", "-- Select Store --");
    renderSelectOptions(cmbCostCntr, state.meta.costCenters, "id", "name", "-- Select Cost Center --");

    // Populate Open GRNs combo
    const grnOptions = state.meta.openGrns.map((g) => ({
      id: g.id,
      text: `${g.dcNo || g.id} (${g.dcDate ? String(g.dcDate).slice(0, 10) : ""})`
    }));
    renderSelectOptions(cmbGrnId, grnOptions, "id", "text", "-- Select SubContract GRN --");

    if (bundle.note) {
      state.note = bundle.note;
      state.mode = "view";
      state.dcId = bundle.note.dcId;
      state.sourceStoreId = bundle.note.sourceStoreId;
      state.sourceStoreName = bundle.note.sourceStoreName;

      txtId.value = bundle.note.scnSubConId || "";
      dtpDate.value = bundle.note.scnSubConDate || nowIsoDate();

      // Ensure GRN is in combo
      if (bundle.note.dcId) {
        let hasGrn = Array.from(cmbGrnId.options).some((o) => Number(o.value) === bundle.note.dcId);
        if (!hasGrn) {
          const opt = document.createElement("option");
          opt.value = bundle.note.dcId;
          opt.textContent = `${bundle.note.dcNo || bundle.note.dcId} (${bundle.note.dcDate ? String(bundle.note.dcDate).slice(0, 10) : ""})`;
          cmbGrnId.appendChild(opt);
        }
        cmbGrnId.value = bundle.note.dcId;
      }

      cmbSourceStore.innerHTML = `<option value="${bundle.note.sourceStoreId}">${escapeHtml(bundle.note.sourceStoreName || "Quarantine")}</option>`;
      cmbDestStore.value = bundle.note.destStoreId || "";
      cmbCostCntr.value = bundle.note.costCntrId || "";
      txtPrepared.value = bundle.note.preparedBy || "";
      txtRemarks.value = bundle.note.remarks || "";

      updateCardText(bundle.note.grnDate, bundle.note.suppName, bundle.note.dcNo, bundle.note.dcDate);

      state.lines = (bundle.note.lines || []).map((l) => ({ ...l }));
      renderLines();
    } else {
      // Empty / New state
      state.note = null;
      state.dcId = 0;
      state.sourceStoreId = 0;
      state.sourceStoreName = "";
      state.lines = [];

      txtId.value = state.meta.nextScnId || "";
      dtpDate.value = nowIsoDate();
      cmbSourceStore.innerHTML = `<option value="">-- Source Store --</option>`;
      cmbDestStore.value = "";
      cmbCostCntr.value = "";
      cmbGrnId.value = "";
      txtPrepared.value = "";
      txtRemarks.value = "";
      updateCardText("", "", "", "");
      renderLines();
    }

    if (lblGuide) lblGuide.textContent = "ITEM :     UOM : ";
    updateControlsState();
  }

  async function loadBundle(query = "") {
    try {
      const res = await fetch(`/api/subcon-scn${query}`, { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load Store Credit Note.");
        return;
      }
      if (data.message) {
        alert(data.message);
        return;
      }
      setFormData(data);
    } catch (err) {
      console.error("loadBundle error:", err);
      alert("Network error loading Store Credit Note.");
    }
  }

  async function onGrnSelected(dcId) {
    if (!dcId) {
      state.dcId = 0;
      state.sourceStoreId = 0;
      state.sourceStoreName = "";
      state.lines = [];
      cmbSourceStore.innerHTML = `<option value="">-- Source Store --</option>`;
      updateCardText("", "", "", "");
      renderLines();
      return;
    }

    try {
      const res = await fetch(`/api/subcon-scn/grn-details?dcId=${dcId}`, { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to load GRN details.");
        return;
      }

      state.dcId = Number(data.dcId);
      state.sourceStoreId = Number(data.sourceStoreId);
      state.sourceStoreName = data.sourceStoreName || "";

      cmbSourceStore.innerHTML = `<option value="${data.sourceStoreId}">${escapeHtml(data.sourceStoreName || "Quarantine")}</option>`;
      if (data.costCntrId) {
        cmbCostCntr.value = data.costCntrId;
      }

      updateCardText(data.grnDate, data.suppName, data.dcNo, data.dcDate);

      state.lines = (data.lines || []).map((l) => ({ ...l }));
      renderLines();
    } catch (err) {
      console.error("onGrnSelected error:", err);
      alert("Network error loading GRN details.");
    }
  }

  function handleNew() {
    state.mode = "new";
    txtId.value = state.meta.nextScnId || 1;
    dtpDate.value = nowIsoDate();
    cmbGrnId.value = "";
    cmbSourceStore.innerHTML = `<option value="">-- Source Store --</option>`;
    cmbDestStore.value = "";
    cmbCostCntr.value = "";
    txtPrepared.value = "";
    txtRemarks.value = "";
    state.dcId = 0;
    state.sourceStoreId = 0;
    state.sourceStoreName = "";
    state.lines = [];
    updateCardText("", "", "", "");
    renderLines();
    updateControlsState();
  }

  function handleModify() {
    if (!state.note || !state.note.scnSubConId) return;
    state.mode = "modify";
    updateControlsState();
  }

  async function handleSave() {
    if (!dtpDate.value) {
      alert("Please enter a valid Date.");
      dtpDate.focus();
      return;
    }

    const grnId = Number(cmbGrnId.value);
    if (!grnId) {
      alert("Please select a SubContract GRN.");
      cmbGrnId.focus();
      return;
    }

    const destStoreId = Number(cmbDestStore.value);
    if (!destStoreId) {
      alert("Please select Destination Store.");
      cmbDestStore.focus();
      return;
    }

    if (state.sourceStoreId && state.sourceStoreId === destStoreId) {
      alert("Both Stores should not be the same ... ");
      cmbDestStore.focus();
      return;
    }

    if (!state.lines || state.lines.length === 0) {
      alert("No line items available in this GRN.");
      return;
    }

    // Line quantity validation
    for (let i = 0; i < state.lines.length; i++) {
      const l = state.lines[i];
      const accp = Number(l.qtyAccp) || 0;
      const rej = Number(l.qtyRej) || 0;
      const recd = Number(l.qtyRecd) || 0;

      if (accp <= 0 && rej <= 0) {
        alert(`Row ${i + 1}: Both Accepted Qty and Rejected Qty should not be Zero... `);
        return;
      }

      if (accp + rej > recd) {
        alert(`Row ${i + 1}: Sum of Accepted Qty (${accp}) and Rejected Qty (${rej}) cannot exceed Received Qty (${recd}).`);
        return;
      }
    }

    const payload = {
      mode: state.mode,
      scnSubConId: state.mode === "modify" && state.note ? state.note.scnSubConId : (Number(txtId.value) || 0),
      scnSubConDate: dtpDate.value,
      dcId: grnId,
      sourceStoreId: state.sourceStoreId,
      destStoreId,
      costCntrId: Number(cmbCostCntr.value) || 0,
      preparedBy: txtPrepared.value.trim(),
      remarks: txtRemarks.value.trim(),
      lines: state.lines
    };

    try {
      const res = await fetch("/api/subcon-scn/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save Store Credit Note.");
        return;
      }

      alert("Record Saved Successfully.");
      state.mode = "view";
      await loadBundle(`?id=${data.scnSubConId || payload.scnSubConId}`);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Network error saving Store Credit Note.");
    }
  }

  async function handleDelete() {
    if (!state.note || !state.note.scnSubConId) return;

    if (!confirm("Do you want to Delete this Store Credit Note?")) {
      return;
    }

    try {
      const res = await fetch("/api/subcon-scn/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scnSubConId: state.note.scnSubConId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete Store Credit Note.");
        return;
      }

      alert(data.message || "Record Deleted Successfully.");
      await loadBundle("?last=1");
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Network error deleting Store Credit Note.");
    }
  }

  async function handlePrint() {
    if (!state.note || !state.note.scnSubConId) {
      alert("Please load or save a Store Credit Note before printing.");
      return;
    }
    const printUrl = `/api/print?type=subcon-scn&id=${state.note.scnSubConId}`;
    try {
      const res = await fetch(printUrl);
      const html = await res.text();
      if (window.openPrintPreview) {
        window.openPrintPreview(`Store Credit Note - ${state.note.scnSubConId}`, html);
      } else {
        const w = window.open(printUrl, "_blank");
      }
    } catch (err) {
      window.open(printUrl, "_blank");
    }
  }

  function handleSearch() {
    const val = (txtSearchId.value || "").trim();
    if (!val) return;
    loadBundle(`?no=${encodeURIComponent(val)}`);
  }

  // Event Listeners
  btnNew.addEventListener("click", handleNew);
  btnSave.addEventListener("click", handleSave);
  btnModify.addEventListener("click", handleModify);
  btnDelete.addEventListener("click", handleDelete);

  btnFirst.addEventListener("click", () => {
    if (state.note && state.note.scnSubConId) loadBundle(`?id=${state.note.scnSubConId}&first=1`);
    else loadBundle("?first=1");
  });
  btnPrev.addEventListener("click", () => {
    if (state.note && state.note.scnSubConId) loadBundle(`?id=${state.note.scnSubConId}&prev=1`);
    else loadBundle("?prev=1");
  });
  btnNext.addEventListener("click", () => {
    if (state.note && state.note.scnSubConId) loadBundle(`?id=${state.note.scnSubConId}&next=1`);
    else loadBundle("?next=1");
  });
  btnLast.addEventListener("click", () => {
    if (state.note && state.note.scnSubConId) loadBundle(`?id=${state.note.scnSubConId}&last=1`);
    else loadBundle("?last=1");
  });

  btnPrint.addEventListener("click", handlePrint);
  btnSearch.addEventListener("click", handleSearch);
  txtSearchId.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  });

  cmbGrnId.addEventListener("change", (e) => {
    onGrnSelected(Number(e.target.value));
  });

  btnClose.addEventListener("click", () => {
    window.closeSubconScn();
  });
  btnX.addEventListener("click", () => {
    window.closeSubconScn();
  });

  attachTableEvents();

  // Global window functions
  window.openSubconScn = function () {
    section.hidden = false;
    section.style.display = "flex";
    loadBundle("?last=1");
  };

  window.closeSubconScn = function () {
    section.hidden = true;
    section.style.display = "none";
  };
})();
