(() => {
  let state = {
    mode: "view", // "view" | "new" | "modify"
    note: null,
    lines: [],
    meta: {
      pendingGrns: [],
      stores: [],
      destStores: [],
      costCenters: [],
      defaultDestStoreId: 0
    },
    nextId: 1,
    isLocked: false,
    lockReason: ""
  };

  const section = document.getElementById("scnpurch");
  if (!section) return;

  const txtId = document.getElementById("scnpurch-id");
  const dtpDate = document.getElementById("scnpurch-date");
  const cmbGrnId = document.getElementById("scnpurch-grn-id");
  const cardDetail = document.getElementById("scnpurch-grn-detail");
  const lineGrnDate = document.getElementById("scnpurch-detail-grndate");
  const lineVendor = document.getElementById("scnpurch-detail-vendor");
  const lineDcNo = document.getElementById("scnpurch-detail-dcno");
  const lineDcDate = document.getElementById("scnpurch-detail-dcdate");

  const cmbSourceStore = document.getElementById("scnpurch-source-store");
  const cmbDestStore = document.getElementById("scnpurch-dest-store");
  const cmbCostCntr = document.getElementById("scnpurch-cost-cntr");
  const txtPrepared = document.getElementById("scnpurch-prepared");
  const txtRemarks = document.getElementById("scnpurch-remarks");

  const itemsBody = document.getElementById("scnpurch-items-body");
  const txtSearchId = document.getElementById("scnpurch-search-id");
  const btnSearch = document.getElementById("scnpurch-btn-search");

  // Toolbar buttons
  const btnNew = document.getElementById("scnpurch-btn-new");
  const btnSave = document.getElementById("scnpurch-btn-save");
  const btnModify = document.getElementById("scnpurch-btn-modify");
  const btnDelete = document.getElementById("scnpurch-btn-delete");
  const btnFirst = document.getElementById("scnpurch-btn-first");
  const btnPrev = document.getElementById("scnpurch-btn-prev");
  const btnNext = document.getElementById("scnpurch-btn-next");
  const btnLast = document.getElementById("scnpurch-btn-last");
  const btnPrint = document.getElementById("scnpurch-btn-print");
  const btnClose = document.getElementById("scnpurch-btn-close");
  const btnX = document.getElementById("scnpurch-btn-x");

  function nowIsoDate() {
    return new Date().toISOString().split("T")[0];
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
    lineGrnDate.textContent = `GRN Date: ${grnDate || ""}`;
    lineVendor.textContent = `Vendor: ${vendorName || ""}`;
    lineDcNo.textContent = ` DC No.: ${dcNo || ""}`;
    lineDcDate.textContent = ` DC Date: ${dcDate || ""}`;
  }

  function updateControlsState() {
    const isEditing = state.mode === "new" || state.mode === "modify";
    const hasRecord = state.note && state.note.scnPurchId > 0;

    btnSave.disabled = !isEditing;
    btnNew.disabled = isEditing;
    btnModify.disabled = isEditing || !hasRecord || state.isLocked;
    btnDelete.disabled = isEditing || !hasRecord || state.isLocked;
    btnFirst.disabled = isEditing || !hasRecord;
    btnPrev.disabled = isEditing || !hasRecord;
    btnNext.disabled = isEditing || !hasRecord;
    btnLast.disabled = isEditing || !hasRecord;

    dtpDate.disabled = !isEditing;
    cmbGrnId.disabled = state.mode !== "new";
    cmbDestStore.disabled = !isEditing;
    cmbCostCntr.disabled = !isEditing;
    txtPrepared.disabled = !isEditing;
    txtRemarks.disabled = !isEditing;

    // Render table inputs readonly vs editable
    renderGrid();
  }

  function renderGrid() {
    itemsBody.innerHTML = "";
    const isEditing = state.mode === "new" || state.mode === "modify";

    state.lines.forEach((line, idx) => {
      const tr = document.createElement("tr");
      tr.dataset.idx = idx;

      tr.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td>${escapeHtml(line.itemCode)}</td>
        <td>${escapeHtml(line.itemName)}</td>
        <td style="text-align: right;">${formatNum(line.dnQty)}</td>
        <td style="text-align: right;">${formatNum(line.qtyRecd)}</td>
        <td>
          ${
            isEditing
              ? `<input type="number" step="0.01" class="scnpurch-cell-accp" data-idx="${idx}" value="${line.qtyAccp}" style="text-align: right;" />`
              : `<span style="display:block; text-align: right;">${formatNum(line.qtyAccp)}</span>`
          }
        </td>
        <td>
          ${
            isEditing
              ? `<input type="number" step="0.01" class="scnpurch-cell-rej" data-idx="${idx}" value="${line.qtyRej}" style="text-align: right;" />`
              : `<span style="display:block; text-align: right;">${formatNum(line.qtyRej)}</span>`
          }
        </td>
        <td>
          ${
            isEditing
              ? `<input type="text" class="scnpurch-cell-rem uppercase" data-idx="${idx}" value="${escapeHtml(line.remarks || "")}" maxlength="100" />`
              : `<span>${escapeHtml(line.remarks || "")}</span>`
          }
        </td>
        <td style="text-align: right;" id="scnpurch-tostock-${idx}">${formatNum(line.qtyToStock)}</td>
        <td style="text-align: right;">${formatNum(line.currentStk)}</td>
      `;

      itemsBody.appendChild(tr);
    });

    attachGridEvents();
  }

  function attachGridEvents() {
    itemsBody.querySelectorAll(".scnpurch-cell-accp").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const line = state.lines[idx];
        if (!line) return;
        let accp = parseFloat(e.target.value) || 0;
        if (accp < 0) accp = 0;
        if (accp > line.qtyRecd) {
          alert("Accepted Qty cannot be more than Recd Qty");
          accp = line.qtyRecd;
          e.target.value = accp;
        }
        line.qtyAccp = accp;
        line.qtyRej = Math.max(0, +(line.qtyRecd - accp).toFixed(2));
        line.qtyToStock = accp;

        const rejInput = itemsBody.querySelector(`.scnpurch-cell-rej[data-idx="${idx}"]`);
        if (rejInput) rejInput.value = line.qtyRej;
        const toStockCell = document.getElementById(`scnpurch-tostock-${idx}`);
        if (toStockCell) toStockCell.textContent = formatNum(line.qtyToStock);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const idx = Number(e.target.dataset.idx);
          const rejInput = itemsBody.querySelector(`.scnpurch-cell-rej[data-idx="${idx}"]`);
          if (rejInput) {
            rejInput.focus();
            rejInput.select();
          }
        }
      });
    });

    itemsBody.querySelectorAll(".scnpurch-cell-rej").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const line = state.lines[idx];
        if (!line) return;
        let rej = parseFloat(e.target.value) || 0;
        if (rej < 0) rej = 0;
        if (rej > line.qtyRecd) {
          alert("Rejected Qty cannot be more than Recd Qty");
          rej = line.qtyRecd;
          e.target.value = rej;
        }
        line.qtyRej = rej;
        line.qtyAccp = Math.max(0, +(line.qtyRecd - rej).toFixed(2));
        line.qtyToStock = line.qtyAccp;

        const accpInput = itemsBody.querySelector(`.scnpurch-cell-accp[data-idx="${idx}"]`);
        if (accpInput) accpInput.value = line.qtyAccp;
        const toStockCell = document.getElementById(`scnpurch-tostock-${idx}`);
        if (toStockCell) toStockCell.textContent = formatNum(line.qtyToStock);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const idx = Number(e.target.dataset.idx);
          const remInput = itemsBody.querySelector(`.scnpurch-cell-rem[data-idx="${idx}"]`);
          if (remInput) {
            remInput.focus();
            remInput.select();
          }
        }
      });
    });

    itemsBody.querySelectorAll(".scnpurch-cell-rem").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const line = state.lines[idx];
        if (line) line.remarks = e.target.value.toUpperCase();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const idx = Number(e.target.dataset.idx);
          if (idx + 1 < state.lines.length) {
            const nextAccp = itemsBody.querySelector(`.scnpurch-cell-accp[data-idx="${idx + 1}"]`);
            if (nextAccp) {
              nextAccp.focus();
              nextAccp.select();
            }
          } else {
            btnSave.focus();
          }
        }
      });
    });
  }

  function applyBundle(data) {
    if (!data) return;
    if (data.meta) state.meta = data.meta;
    state.nextId = data.nextId || 1;
    state.isLocked = !!data.isLocked;
    state.lockReason = data.lockReason || "";

    // Populate combo options
    renderSelectOptions(cmbSourceStore, state.meta.stores || [], "id", "name", "(Select Source Store)");
    renderSelectOptions(cmbDestStore, state.meta.destStores || [], "id", "name", "(Select Destination Store)");
    renderSelectOptions(cmbCostCntr, state.meta.costCenters || [], "id", "name", "(None)");

    if (data.note) {
      state.mode = "view";
      state.note = data.note;
      state.lines = data.lines || [];

      txtId.value = data.note.scnPurchId || "";
      dtpDate.value = data.note.scnPurchDate || nowIsoDate();

      // For existing record, show current GRN in dropdown
      cmbGrnId.innerHTML = `<option value="${data.note.purchId}">${data.note.purchId}</option>`;
      cmbGrnId.value = String(data.note.purchId);

      updateCardText(data.note.grnDate, data.note.vendorName, data.note.dcNo, data.note.dcDate);

      cmbSourceStore.value = String(data.note.sourceStoreId || "");
      cmbDestStore.value = String(data.note.destStoreId || "");
      cmbCostCntr.value = String(data.note.costCntrId || "");
      txtPrepared.value = data.note.preparedBy || "";
      txtRemarks.value = data.note.remarks || "";
    } else {
      // Empty or New Mode
      txtId.value = state.nextId;
      dtpDate.value = nowIsoDate();

      renderSelectOptions(cmbGrnId, state.meta.pendingGrns || [], "purchId", "purchId", "(Select GRN No.)");

      updateCardText("", "", "", "");
      cmbSourceStore.value = "";
      cmbDestStore.value = String(state.meta.defaultDestStoreId || "");
      cmbCostCntr.value = "";
      txtPrepared.value = "";
      txtRemarks.value = "";
      state.lines = [];
    }

    updateControlsState();
  }

  async function loadInitial() {
    try {
      const res = await fetch("/api/scnpurch?last=1");
      const data = await res.json();
      if (data.message && data.message.includes("No Store Credit Note")) {
        startNew();
      } else {
        applyBundle(data);
      }
    } catch (err) {
      console.error("Failed to load initial SCN:", err);
    }
  }

  async function startNew() {
    try {
      const res = await fetch("/api/scnpurch?new=1");
      const data = await res.json();
      state.mode = "new";
      state.note = null;
      applyBundle(data);
      cmbGrnId.focus();
    } catch (err) {
      console.error("Failed to start new SCN:", err);
    }
  }

  async function onGrnSelected() {
    const purchId = Number(cmbGrnId.value);
    if (!purchId) {
      updateCardText("", "", "", "");
      cmbSourceStore.value = "";
      cmbCostCntr.value = "";
      state.lines = [];
      renderGrid();
      return;
    }

    try {
      const res = await fetch(`/api/scnpurch/grn-details?purchId=${purchId}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      updateCardText(data.grnDate, data.vendorName, data.dcNo, data.dcDate);
      cmbSourceStore.value = String(data.sourceStoreId || "");
      if (data.costCntrId) cmbCostCntr.value = String(data.costCntrId);

      state.lines = data.lines || [];
      renderGrid();

      // Focus destination store
      cmbDestStore.focus();
    } catch (err) {
      console.error("Failed to load GRN details:", err);
    }
  }

  async function doSave() {
    const purchId = Number(cmbGrnId.value);
    if (!purchId) {
      alert("Not a Valid GRN Number...");
      cmbGrnId.focus();
      return;
    }

    const sourceStoreId = Number(cmbSourceStore.value);
    if (!sourceStoreId) {
      alert("Please Select a Store from which the Stock is to be Reduced");
      cmbSourceStore.focus();
      return;
    }

    const destStoreId = Number(cmbDestStore.value);
    if (!destStoreId) {
      alert("Please Select a Store to which the stock is to be Added");
      cmbDestStore.focus();
      return;
    }

    if (sourceStoreId === destStoreId) {
      alert("Both Stores should not be the same ... ");
      cmbDestStore.focus();
      return;
    }

    if (!state.lines.length) {
      alert("Part No./ Items");
      return;
    }

    for (let i = 0; i < state.lines.length; i++) {
      const l = state.lines[i];
      if (l.qtyAccp + l.qtyRej === 0 && l.qtyRecd > 0) {
        alert("Both Accepted Qty and Rejected Qty should not be Zero... ");
        const accpInput = itemsBody.querySelector(`.scnpurch-cell-accp[data-idx="${i}"]`);
        if (accpInput) accpInput.focus();
        return;
      }
      if (Math.abs(l.qtyAccp + l.qtyRej - l.qtyRecd) > 0.0001) {
        alert(`Line ${i + 1}: Accepted Qty + Rejected Qty (${l.qtyAccp + l.qtyRej}) must equal Received Qty (${l.qtyRecd})`);
        const accpInput = itemsBody.querySelector(`.scnpurch-cell-accp[data-idx="${i}"]`);
        if (accpInput) accpInput.focus();
        return;
      }
    }

    if (!confirm("Are You Sure To Save?")) return;

    const payload = {
      scnPurchId: Number(txtId.value) || 0,
      scnPurchDate: dtpDate.value || nowIsoDate(),
      purchId,
      sourceStoreId,
      destStoreId,
      costCntrId: Number(cmbCostCntr.value) || null,
      preparedBy: txtPrepared.value.trim().toUpperCase(),
      remarks: txtRemarks.value.trim(),
      lines: state.lines
    };

    try {
      const res = await fetch("/api/scnpurch/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Record Saved");
      state.mode = "view";
      applyBundle(data);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save Store Credit Note.");
    }
  }

  async function doDelete() {
    if (!state.note || !state.note.scnPurchId) return;
    if (state.isLocked) {
      alert(state.lockReason || "Deletion not allowed on this record.");
      return;
    }

    if (!confirm("Are You Sure To Delete The Record?")) return;

    try {
      const res = await fetch("/api/scnpurch/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.note.scnPurchId })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Record Deleted .");
      applyBundle(data);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete Store Credit Note.");
    }
  }

  async function doSearch() {
    const term = txtSearchId.value.trim();
    if (!term) return;
    try {
      const res = await fetch(`/api/scnpurch?no=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("Search error:", err);
    }
  }

  async function navigate(direction) {
    const current = state.note ? state.note.scnPurchId : 0;
    try {
      const res = await fetch(`/api/scnpurch?${direction}=1&current=${current}`);
      const data = await res.json();
      if (data && data.note) {
        applyBundle(data);
      }
    } catch (err) {
      console.error(`Nav ${direction} error:`, err);
    }
  }

  function startModify() {
    if (!state.note || !state.note.scnPurchId) return;
    if (state.isLocked) {
      alert(state.lockReason || "Modification not allowed on this record.");
      return;
    }
    state.mode = "modify";
    updateControlsState();
    cmbDestStore.focus();
  }

  // Keyboard navigation across form controls
  cmbGrnId.addEventListener("change", onGrnSelected);
  cmbGrnId.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      cmbDestStore.focus();
    }
  });

  cmbDestStore.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      cmbCostCntr.focus();
    }
  });

  cmbCostCntr.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      txtPrepared.focus();
    }
  });

  txtPrepared.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      txtRemarks.focus();
    }
  });

  txtRemarks.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const firstAccp = itemsBody.querySelector(".scnpurch-cell-accp");
      if (firstAccp) {
        firstAccp.focus();
        firstAccp.select();
      } else {
        btnSave.focus();
      }
    }
  });

  txtSearchId.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  // Uppercase transformers
  document.querySelectorAll(".scnpurch-window input.uppercase").forEach((inp) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
    });
  });

  // Toolbar events
  btnNew.addEventListener("click", startNew);
  btnSave.addEventListener("click", doSave);
  btnModify.addEventListener("click", startModify);
  btnDelete.addEventListener("click", doDelete);
  btnSearch.addEventListener("click", doSearch);

  btnFirst.addEventListener("click", () => navigate("first"));
  btnPrev.addEventListener("click", () => navigate("prev"));
  btnNext.addEventListener("click", () => navigate("next"));
  btnLast.addEventListener("click", () => navigate("last"));

  async function printScnPurch() {
    if (!state.note || !state.note.scnPurchId) {
      alert("No Store Credit Note loaded to print.");
      return;
    }
    const note = state.note;
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

    const rowsHtml = (state.lines || []).map((l, i) => `
      <tr>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${i + 1}</td>
        <td style="border: 1px solid #777; padding: 4px;"><b>${escapeHtml(l.itemCode || "")}</b><br><small>${escapeHtml(l.itemName || "")}</small></td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${escapeHtml(l.uom || "NOS")}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${fmt2(l.qty)}</td>
        <td style="border: 1px solid #777; padding: 4px;">${escapeHtml(l.remarks || "")}</td>
      </tr>
    `).join("");

    const totalQty = (state.lines || []).reduce((acc, l) => acc + (Number(l.qty) || 0), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">STORE CREDIT NOTE (PURCHASE)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Vendor:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${escapeHtml(note.vendorName || cardVendor.textContent || "")}</div>
              ${note.dcNo ? `<div style="margin-top: 4px;"><b>Supplier DC / Inv:</b> ${escapeHtml(note.dcNo)} ${note.dcDate ? 'Dt: ' + escapeHtml(note.dcDate) : ''}</div>` : ""}
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>SCN No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${escapeHtml(note.scnPurchId)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>SCN Date:</b></td><td style="padding: 2px 0;">${escapeHtml(note.scnPurchDate || dtpDate.value || "")}</td></tr>
                <tr><td style="padding: 2px 0;"><b>GRN Ref:</b></td><td style="padding: 2px 0;">${escapeHtml(note.purchId)} ${note.grnDate ? 'Dt: ' + escapeHtml(note.grnDate) : ''}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border-right: 1px solid #777; width: 35px;">Sl</th>
              <th style="padding: 4px; border-right: 1px solid #777;">Item Code / Description</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 50px; text-align: center;">UOM</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 80px; text-align: right;">Accepted Qty</th>
              <th style="padding: 4px; width: 150px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="5" style="text-align: center; padding: 10px;">No items in SCN</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="3" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Quantity Credited to Store:</td>
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
              <div>Store Keeper</div>
            </td>
            <td style="width: 33%; padding: 16px 8px; text-align: center; vertical-align: bottom;">
              <div>Received By</div>
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
      window.openPrintPreview(`SCN Purchase - ${note.scnPurchId}`, docHtml);
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
    printScnPurch();
  });

  function closeWindow() {
    section.hidden = true;
    state.mode = "view";
  }

  btnClose.addEventListener("click", closeWindow);
  btnX.addEventListener("click", closeWindow);

  // Keyboard shortcuts (End = Exit)
  section.addEventListener("keydown", (e) => {
    if (e.key === "End") {
      e.preventDefault();
      closeWindow();
    }
  });

  window.openScnPurch = function () {
    section.hidden = false;
    loadInitial();
  };

  window.closeScnPurch = function () {
    closeWindow();
  };
})();
