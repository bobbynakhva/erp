(() => {
  let mode = "view"; // "view" | "new" | "edit"
  let currentNote = null;
  let lines = [];
  let meta = {
    customers: [],
    costCenters: [],
    items: [],
    ids: [],
    nextId: 1
  };

  const dom = {
    section: document.getElementById("labour-po"),
    btnX: document.getElementById("labpo-btn-x"),
    btnClose: document.getElementById("labpo-btn-close"),
    btnCorres: document.getElementById("labpo-btn-corres"),

    chkOpen: document.getElementById("labpo-chk-open"),
    chkSch: document.getElementById("labpo-chk-sch"),

    cust: document.getElementById("labpo-cust"),
    cost: document.getElementById("labpo-cost"),
    payterm: document.getElementById("labpo-payterm"),
    rem: document.getElementById("labpo-rem"),

    no: document.getElementById("labpo-no"),
    date: document.getElementById("labpo-date"),
    validFrom: document.getElementById("labpo-valid-from"),
    validTo: document.getElementById("labpo-valid-to"),
    val: document.getElementById("labpo-val"),

    gridBody: document.getElementById("labpo-grid-body"),

    lineForm: document.getElementById("labpo-line-form"),
    lineItem: document.getElementById("labpo-line-item"),
    lineUom: document.getElementById("labpo-line-uom"),
    lineQty: document.getElementById("labpo-line-qty"),
    lineRate: document.getElementById("labpo-line-rate"),
    lineDisc: document.getElementById("labpo-line-disc"),
    lineDue: document.getElementById("labpo-line-due"),
    btnAddLine: document.getElementById("labpo-btn-add-line"),

    searchNo: document.getElementById("labpo-search-no"),
    btnFind: document.getElementById("labpo-btn-find"),
    followupNo: document.getElementById("labpo-followup-no"),
    chkFollowup: document.getElementById("labpo-chk-followup"),

    btnNew: document.getElementById("labpo-btn-new"),
    btnSave: document.getElementById("labpo-btn-save"),
    btnModify: document.getElementById("labpo-btn-modify"),
    btnDelete: document.getElementById("labpo-btn-delete"),
    btnFirst: document.getElementById("labpo-btn-first"),
    btnPrev: document.getElementById("labpo-btn-prev"),
    btnNext: document.getElementById("labpo-btn-next"),
    btnLast: document.getElementById("labpo-btn-last"),
    btnPrint: document.getElementById("labpo-btn-print")
  };

  function fmt2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
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

  function setMode(m) {
    mode = m;
    const isEdit = (mode === "new" || mode === "edit");

    dom.chkOpen.disabled = !isEdit;
    dom.chkSch.disabled = !isEdit;

    dom.cust.disabled = !isEdit;
    dom.cost.disabled = !isEdit;
    dom.payterm.readOnly = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.readOnly = !isEdit;
    dom.validFrom.readOnly = !isEdit;
    dom.validTo.readOnly = !isEdit;
    dom.val.readOnly = !isEdit;

    dom.chkFollowup.disabled = !isEdit;
    dom.followupNo.readOnly = !isEdit;

    if (dom.lineForm) {
      dom.lineForm.style.display = isEdit ? "flex" : "none";
    }

    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote;
    dom.btnDelete.disabled = isEdit || !currentNote;
    dom.btnNew.disabled = (mode === "new");

    renderLines();
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

    // Items
    dom.lineItem.innerHTML = '<option value="">-- Select Item --</option>';
    for (const it of meta.items) {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = `${it.code} - ${it.name}`;
      opt.dataset.code = it.code;
      opt.dataset.name = it.name;
      opt.dataset.uom = it.uom;
      opt.dataset.rate = it.rate;
      dom.lineItem.appendChild(opt);
    }
  }

  function renderLines() {
    dom.gridBody.innerHTML = "";
    if (lines.length === 0) {
      dom.gridBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#777; font-style:italic; padding:12px;">No items in Work Order.</td></tr>`;
      return;
    }

    lines.forEach((l, idx) => {
      const tr = document.createElement("tr");
      const isEdit = (mode === "new" || mode === "edit");

      tr.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td><b>${escapeHtml(l.code || "")}</b></td>
        <td>${escapeHtml(l.name || "")}</td>
        <td style="text-align: center;">${escapeHtml(l.uom || "")}</td>
        <td style="text-align: right;">${fmt2(l.qty)}</td>
        <td style="text-align: right;">${fmt2(l.rate)}</td>
        <td style="text-align: right;">${fmt2(l.discount)}</td>
        <td style="text-align: center;">${escapeHtml(l.dueDate || "")}</td>
        <td style="text-align: center;">
          ${isEdit ? `<button type="button" class="btn labpo-row-del" data-idx="${idx}" style="color:red; font-weight:bold; padding:0 4px; font-size:10px;">×</button>` : "-"}
        </td>
      `;

      dom.gridBody.appendChild(tr);
    });

    if (mode === "new" || mode === "edit") {
      dom.gridBody.querySelectorAll(".labpo-row-del").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const i = Number(btn.dataset.idx);
          lines.splice(i, 1);
          renderLines();
          recalcVal();
        });
      });
    }
  }

  function recalcVal() {
    let sum = 0;
    for (const l of lines) {
      const q = Number(l.qty || 0);
      const r = Number(l.rate || 0);
      const d = Number(l.discount || 0);
      sum += (q * r) * (1 - d / 100);
    }
    dom.val.value = fmt2(sum);
  }

  function renderNote(note) {
    currentNote = note;
    if (!note) {
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.cust.value = "";
      dom.cost.value = "";
      dom.payterm.value = "";
      dom.rem.value = "";
      dom.no.value = "";
      const today = new Date().toISOString().slice(0, 10);
      dom.date.value = today;
      dom.validFrom.value = today;
      dom.validTo.value = today;
      dom.val.value = "0.00";
      dom.chkFollowup.checked = false;
      dom.followupNo.value = "1";
      lines = [];
      renderLines();
      setMode("view");
      updateCorresButton(0, 0);
      return;
    }

    dom.chkOpen.checked = note.isOpenPo === true;
    dom.chkSch.checked = note.isSchPo === true;
    dom.cust.value = note.custId || "";
    dom.cost.value = note.costCntrId || "";
    dom.payterm.value = note.payTerm || "";
    dom.rem.value = note.remark || "";
    dom.no.value = note.poNo || "";
    dom.date.value = note.poDate || "";
    dom.validFrom.value = note.validFrom || "";
    dom.validTo.value = note.validTo || "";
    dom.val.value = fmt2(note.purchVal || 0);
    dom.chkFollowup.checked = Boolean(note.mfgPoFollowupNo);
    dom.followupNo.value = note.mfgPoFollowupNo || "1";

    lines = (note.lines || []).map((l) => ({ ...l }));
    renderLines();
    setMode("view");
    refreshCorresCount(note.poNo);
  }

  async function refreshCorresCount(ref) {
    if (!ref) {
      updateCorresButton(0, 0);
      return;
    }
    try {
      const data = await apiGet(`/api/corres/count?for=${encodeURIComponent("LabourPO")}&ref=${encodeURIComponent(ref)}`);
      updateCorresButton(data.current || 0, data.total || 0);
    } catch {
      updateCorresButton(0, 0);
    }
  }

  function updateCorresButton(curr, tot) {
    if (dom.btnCorres) dom.btnCorres.textContent = `Correspondences (${curr}/${tot})`;
  }

  async function fetchBundle(id, isNew, poNo) {
    let q = "";
    if (isNew) q = "?new=1";
    else if (id) q = `?id=${encodeURIComponent(id)}`;
    else if (poNo) q = `?poNo=${encodeURIComponent(poNo)}`;

    const data = await apiGet(`/api/labour-po${q}`);
    if (data.error) {
      alert(data.error);
      return false;
    }

    meta.customers = data.customers || [];
    meta.costCenters = data.costCenters || [];
    meta.items = data.items || [];
    meta.ids = data.ids || [];
    meta.nextId = data.nextId || 1;

    populateDropdowns();

    if (isNew) {
      currentNote = null;
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.cust.value = "";
      if (meta.costCenters.length > 0) dom.cost.value = meta.costCenters[0].id;
      dom.payterm.value = "30 Days Net";
      dom.rem.value = "";
      dom.no.value = "";
      const today = new Date().toISOString().slice(0, 10);
      dom.date.value = today;
      dom.validFrom.value = today;
      dom.validTo.value = today;
      dom.val.value = "0.00";
      dom.chkFollowup.checked = false;
      dom.followupNo.value = "1";
      lines = [];
      renderLines();
      setMode("new");
      updateCorresButton(0, 0);
      return true;
    }

    if (data.note) {
      renderNote(data.note);
    } else if (meta.ids.length > 0) {
      await fetchBundle(meta.ids[meta.ids.length - 1], false);
    } else {
      renderNote(null);
    }
    return true;
  }

  // Double click value field to calculate sum of items (txtVal_DblClick)
  dom.val.addEventListener("dblclick", () => {
    recalcVal();
  });

  // Line item change updates UOM, Rate, Due Date
  dom.lineItem.addEventListener("change", () => {
    const chosen = dom.lineItem.selectedOptions[0];
    if (!chosen || !chosen.value) {
      dom.lineUom.value = "";
      dom.lineRate.value = "";
      return;
    }
    dom.lineUom.value = chosen.dataset.uom || "";
    dom.lineRate.value = chosen.dataset.rate || "0.00";
    if (dom.validTo.value) dom.lineDue.value = dom.validTo.value;
  });

  // Add Item to grid
  dom.btnAddLine.addEventListener("click", () => {
    const chosen = dom.lineItem.selectedOptions[0];
    if (!chosen || !chosen.value) {
      alert("Select an Item first.");
      return;
    }
    const qty = Number(dom.lineQty.value || 0);
    if (qty <= 0) {
      alert("Enter a valid Quantity.");
      dom.lineQty.focus();
      return;
    }
    const rate = Number(dom.lineRate.value || 0);
    const disc = Number(dom.lineDisc.value || 0);
    const amt = (qty * rate * (1 - disc / 100)).toFixed(2);

    lines.push({
      itemId: Number(chosen.value),
      code: chosen.dataset.code || "",
      name: chosen.dataset.name || "",
      uom: dom.lineUom.value || "",
      qty,
      rate,
      discount: disc,
      amount: amt,
      dueDate: dom.lineDue.value || dom.validTo.value || ""
    });

    dom.lineItem.value = "";
    dom.lineUom.value = "";
    dom.lineQty.value = "";
    dom.lineRate.value = "";
    dom.lineDisc.value = "0";

    renderLines();
    recalcVal();
  });

  // Toolbar Actions
  dom.btnNew.addEventListener("click", async () => {
    await fetchBundle(null, true);
  });

  dom.btnModify.addEventListener("click", () => {
    if (!currentNote) return;
    setMode("edit");
  });

  dom.btnSave.addEventListener("click", async () => {
    const custId = Number(dom.cust.value || 0);
    if (!custId) {
      alert("Please Select a Customer.....");
      dom.cust.focus();
      return;
    }

    const poNo = dom.no.value.trim();
    if (!poNo) {
      alert("Enter the Work Order Number..... ");
      dom.no.focus();
      return;
    }

    const costCntrId = Number(dom.cost.value || 0);
    if (!costCntrId) {
      alert("Please Select an existing CostCenter....");
      dom.cost.focus();
      return;
    }

    const isOpenPo = dom.chkOpen.checked;
    const isSchPo = dom.chkSch.checked;
    const purchVal = Number(dom.val.value || 0);

    if (!isOpenPo && purchVal <= 0) {
      alert("Enter the purchase Order Value!!! \r\n Double Click the box to obtain value from the system");
      dom.val.focus();
      return;
    }

    if (!confirm("Are You Sure To Save ?")) return;

    const payload = {
      isNew: (mode === "new"),
      poId: currentNote ? currentNote.id : 0,
      custId,
      isOpenPo,
      isSchPo,
      poNo,
      poDate: dom.date.value || null,
      validFrom: dom.validFrom.value || null,
      validTo: dom.validTo.value || null,
      costCntrId,
      remark: dom.rem.value.trim(),
      payTerm: dom.payterm.value.trim(),
      purchVal,
      followupDate: dom.chkFollowup.checked ? (dom.date.value || null) : null,
      mfgPoFollowupNo: dom.chkFollowup.checked ? dom.followupNo.value.trim() : "",
      lines: lines.map((l, idx) => ({
        slno: idx + 1,
        itemId: l.itemId,
        uom: l.uom,
        qty: Number(l.qty || 0),
        rate: Number(l.rate || 0),
        discount: Number(l.discount || 0),
        dueDate: l.dueDate || null
      }))
    };

    const res = await apiPost("/api/labour-po/save", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Record Saved .");
    await fetchBundle(res.note ? res.note.id : null, false, poNo);
  });

  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote) return;
    if (!confirm("Are you sure you want to DELETE this Work Order?")) return;

    const res = await apiPost("/api/labour-po/delete", { poId: currentNote.id });
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Record Deleted.");
    await fetchBundle(null, false);
  });

  // Navigation
  function getCurrentIndex() {
    if (!currentNote) return -1;
    return meta.ids.indexOf(currentNote.id);
  }

  dom.btnFirst.addEventListener("click", async () => {
    if (meta.ids.length > 0) await fetchBundle(meta.ids[0], false);
  });

  dom.btnPrev.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx > 0) await fetchBundle(meta.ids[idx - 1], false);
  });

  dom.btnNext.addEventListener("click", async () => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < meta.ids.length - 1) await fetchBundle(meta.ids[idx + 1], false);
  });

  dom.btnLast.addEventListener("click", async () => {
    if (meta.ids.length > 0) await fetchBundle(meta.ids[meta.ids.length - 1], false);
  });

  dom.btnFind.addEventListener("click", async () => {
    const query = dom.searchNo.value.trim();
    if (!query) {
      alert("Enter the Work Order Number to search.");
      return;
    }
    await fetchBundle(0, false, query);
  });

  // Print Preview
  dom.btnPrint.addEventListener("click", async () => {
    if (!currentNote) {
      alert("No data to Print...");
      return;
    }
    const comp = await apiGet("/api/print-head");
    if (comp.error) {
      alert(comp.error);
      return;
    }

    const headLines = (comp.head || "").split(/\r\n|\n|\r/).filter(Boolean);
    const compName = headLines[0] || "SMART ENTERPRISES";
    const compAddr = headLines.slice(1).join("<br>");

    const html = `
      <div style="font-family:'Segoe UI', Tahoma, Arial, sans-serif; font-size:11px; color:#000; padding:6px;">
        <div style="text-align:center; border:2px solid #000; border-bottom:none; padding:8px; background:#fafafa;">
          <div style="font-size:16px; font-weight:bold; text-transform:uppercase;">LABOUR WORK ORDER (INWARDS)</div>
          <div style="font-size:10px; font-style:italic;">(Job Work Order / Customer Purchase Order)</div>
        </div>

        <table style="width:100%; border-collapse:collapse; border:2px solid #000; font-size:11px;">
          <tr>
            <td style="width:50%; border-right:1px solid #000; padding:6px; vertical-align:top;">
              <div style="font-size:13px; font-weight:bold; color:#000080;">${escapeHtml(compName)}</div>
              <div style="margin-top:3px; line-height:1.3;">${compAddr}</div>
              <div style="margin-top:6px; font-size:10px;">
                <b>GSTIN:</b> ${escapeHtml(comp.gstin || "29AABCB1234F1Z5")}&nbsp;&nbsp;
                ${comp.pan ? `<b>PAN:</b> ${escapeHtml(comp.pan)}` : ""}
              </div>
            </td>
            <td style="width:50%; padding:6px; vertical-align:top;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <tr><td style="font-weight:bold; padding:2px; width:45%;">Work Order No:</td><td style="padding:2px;"><b>${escapeHtml(currentNote.poNo)}</b></td></tr>
                <tr><td style="font-weight:bold; padding:2px;">Work Order Date:</td><td style="padding:2px;">${escapeHtml(currentNote.poDate || "-")}</td></tr>
                <tr><td style="font-weight:bold; padding:2px;">Valid Period:</td><td style="padding:2px;">${escapeHtml(currentNote.validFrom || "-")} to ${escapeHtml(currentNote.validTo || "-")}</td></tr>
                <tr><td style="font-weight:bold; padding:2px;">PO Type:</td><td style="padding:2px;">${currentNote.isOpenPo ? "Open PO" : (currentNote.isSchPo ? "Scheduled PO" : "Regular PO")}</td></tr>
                <tr><td style="font-weight:bold; padding:2px;">Payment Terms:</td><td style="padding:2px;">${escapeHtml(currentNote.payTerm || "-")}</td></tr>
              </table>
            </td>
          </tr>
          <tr style="border-top:1px solid #000;">
            <td colspan="2" style="padding:6px; vertical-align:top;">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">Customer Details:</div>
              <div style="font-weight:bold; font-size:12px;">${escapeHtml(currentNote.custName)}</div>
              <div style="white-space:pre-wrap; line-height:1.3;">${escapeHtml(currentNote.custAddr)}</div>
              ${currentNote.custContact ? `<div><b>Contact:</b> ${escapeHtml(currentNote.custContact)}</div>` : ""}
            </td>
          </tr>
        </table>

        <table style="width:100%; border-collapse:collapse; border:2px solid #000; border-top:none; font-size:11px;">
          <thead>
            <tr style="background:#e8e8e8; border-bottom:1px solid #000;">
              <th style="width:35px; border-right:1px solid #000; padding:4px; text-align:center;">Sl.</th>
              <th style="width:130px; border-right:1px solid #000; padding:4px; text-align:left;">Part No.</th>
              <th style="border-right:1px solid #000; padding:4px; text-align:left;">Item / Component Name</th>
              <th style="width:50px; border-right:1px solid #000; padding:4px; text-align:center;">UOM</th>
              <th style="width:65px; border-right:1px solid #000; padding:4px; text-align:right;">Qty</th>
              <th style="width:75px; border-right:1px solid #000; padding:4px; text-align:right;">Rate (Rs)</th>
              <th style="width:55px; border-right:1px solid #000; padding:4px; text-align:right;">Disc %</th>
              <th style="width:90px; padding:4px; text-align:right;">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map((l, i) => `
              <tr style="border-bottom:1px dotted #ccc;">
                <td style="border-right:1px solid #000; padding:4px; text-align:center;">${i + 1}</td>
                <td style="border-right:1px solid #000; padding:4px;"><b>${escapeHtml(l.code || "")}</b></td>
                <td style="border-right:1px solid #000; padding:4px;">${escapeHtml(l.name || "")}</td>
                <td style="border-right:1px solid #000; padding:4px; text-align:center;">${escapeHtml(l.uom || "")}</td>
                <td style="border-right:1px solid #000; padding:4px; text-align:right;">${fmt2(l.qty)}</td>
                <td style="border-right:1px solid #000; padding:4px; text-align:right;">${fmt2(l.rate)}</td>
                <td style="border-right:1px solid #000; padding:4px; text-align:right;">${fmt2(l.discount)}</td>
                <td style="padding:4px; text-align:right; font-weight:bold;">${fmt2(l.amount)}</td>
              </tr>
            `).join("")}
            <tr style="border-top:2px solid #000; background:#f0f0f0; font-weight:bold;">
              <td colspan="7" style="border-right:1px solid #000; padding:4px; text-align:right;">Total Work Order Value:</td>
              <td style="padding:4px; text-align:right; color:#000080; font-size:12px;">Rs. ${fmt2(currentNote.purchVal)}</td>
            </tr>
          </tbody>
        </table>

        ${currentNote.remark ? `
          <div style="border:2px solid #000; border-top:none; padding:6px; font-size:10px;">
            <b>Remarks:</b> ${escapeHtml(currentNote.remark)}
          </div>
        ` : ""}

        <table style="width:100%; border-collapse:collapse; border:2px solid #000; border-top:none; font-size:11px;">
          <tr>
            <td style="width:50%; padding:10px; vertical-align:bottom;">
              <div style="font-size:10px; color:#555;">Customer Seal &amp; Signature</div>
            </td>
            <td style="width:50%; padding:10px; text-align:right; vertical-align:bottom;">
              <div style="font-weight:bold; margin-bottom:30px;">For ${escapeHtml(compName)}</div>
              <div style="font-weight:bold; font-size:10px;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Print Preview - Labour Work Order (${currentNote.poNo})`, html);
    } else {
      let root = document.getElementById("print-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "print-root";
        document.body.appendChild(root);
      }
      root.innerHTML = html;
      window.print();
    }
  });

  dom.btnX.addEventListener("click", () => window.closeLabourPO());
  dom.btnClose.addEventListener("click", () => window.closeLabourPO());

  // Window openers
  window.openLabourPO = async function () {
    if (window.closeCompany) window.closeCompany();
    if (window.closeProdn) window.closeProdn();
    if (window.closeScn) window.closeScn();
    if (window.closeAssm) window.closeAssm();
    if (window.closeMat) window.closeMat();
    if (window.closeQuote) window.closeQuote();
    if (window.closeMfgPO) window.closeMfgPO();
    if (window.closeDC) window.closeDC();
    if (window.closeInvoiceMfg) window.closeInvoiceMfg();

    dom.section.hidden = false;
    await fetchBundle(null, false);
    if (!currentNote && meta.ids.length === 0) {
      await fetchBundle(null, true);
    }
  };

  window.closeLabourPO = function () {
    dom.section.hidden = true;
  };
})();
