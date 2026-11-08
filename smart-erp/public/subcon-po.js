(() => {
  let mode = "view"; // "view" | "new" | "edit"
  let currentNote = null;
  let lines = [];
  let meta = {
    suppliers: [],
    costCenters: [],
    items: [],
    ids: [],
    nextId: 1,
    prefixWO: ""
  };

  const dom = {
    section: document.getElementById("subcon-po"),
    btnX: document.getElementById("subconpo-btn-x"),
    btnClose: document.getElementById("subconpo-btn-close"),
    btnCorres: document.getElementById("subconpo-btn-corres"),

    chkOpen: document.getElementById("subconpo-chk-open"),
    chkSch: document.getElementById("subconpo-chk-sch"),
    stampCancelled: document.getElementById("subconpo-stamp-cancelled"),

    // Supplier details
    supp: document.getElementById("subconpo-supp"),
    kindAttn: document.getElementById("subconpo-kindattn"),
    addr: document.getElementById("subconpo-addr"),
    kst: document.getElementById("subconpo-kst"),
    cst: document.getElementById("subconpo-cst"),

    // Work Order details
    prefix: document.getElementById("subconpo-prefix"),
    no: document.getElementById("subconpo-no"),
    date: document.getElementById("subconpo-date"),
    refNo: document.getElementById("subconpo-ref-no"),
    refDate: document.getElementById("subconpo-ref-date"),
    validFrom: document.getElementById("subconpo-valid-from"),
    validTo: document.getElementById("subconpo-valid-to"),
    cost: document.getElementById("subconpo-cost"),
    rem: document.getElementById("subconpo-rem"),

    // Grid
    gridBody: document.getElementById("subconpo-grid-body"),

    // Terms & Value
    terms: document.getElementById("subconpo-terms"),
    val: document.getElementById("subconpo-val"),

    // Navigation & Toolbar
    searchNo: document.getElementById("subconpo-search-no"),
    btnFind: document.getElementById("subconpo-btn-find"),

    btnFirst: document.getElementById("subconpo-btn-first"),
    btnPrev: document.getElementById("subconpo-btn-prev"),
    btnNext: document.getElementById("subconpo-btn-next"),
    btnLast: document.getElementById("subconpo-btn-last"),

    btnNew: document.getElementById("subconpo-btn-new"),
    btnSave: document.getElementById("subconpo-btn-save"),
    btnModify: document.getElementById("subconpo-btn-modify"),
    btnDelete: document.getElementById("subconpo-btn-delete"),
    btnPrint: document.getElementById("subconpo-btn-print")
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

    dom.supp.disabled = !isEdit;
    dom.kindAttn.readOnly = !isEdit;

    dom.no.readOnly = !isEdit;
    dom.date.readOnly = !isEdit;
    dom.refNo.readOnly = !isEdit;
    dom.refDate.readOnly = !isEdit;
    dom.validFrom.readOnly = !isEdit;
    dom.validTo.readOnly = !isEdit;
    dom.cost.disabled = !isEdit;
    dom.rem.readOnly = !isEdit;

    dom.terms.readOnly = !isEdit;
    dom.val.readOnly = !isEdit;

    dom.btnSave.disabled = !isEdit;
    dom.btnModify.disabled = isEdit || !currentNote;
    dom.btnDelete.disabled = isEdit || !currentNote;
    dom.btnNew.disabled = (mode === "new");

    renderLines();
  }

  function populateDropdowns() {
    // Suppliers
    dom.supp.innerHTML = '<option value="">-- Select Supplier --</option>';
    for (const s of meta.suppliers) {
      const opt = document.createElement("option");
      opt.value = s.suppId;
      opt.textContent = s.suppName;
      dom.supp.appendChild(opt);
    }

    // Cost Centers
    dom.cost.innerHTML = '<option value="">-- Select Cost Center --</option>';
    for (const cc of meta.costCenters) {
      const opt = document.createElement("option");
      opt.value = cc.id;
      opt.textContent = cc.costCntr;
      dom.cost.appendChild(opt);
    }
  }

  // Supplier on change: auto populate address, KST, CST
  dom.supp.addEventListener("change", () => {
    const sId = Number(dom.supp.value);
    const s = meta.suppliers.find(x => x.suppId === sId);
    if (s) {
      dom.addr.value = s.suppAddr || "";
      dom.kst.value = s.kstNo || "";
      dom.cst.value = s.cstNo || "";
    } else {
      dom.addr.value = "";
      dom.kst.value = "";
      dom.cst.value = "";
    }
  });

  function renderLines() {
    dom.gridBody.innerHTML = "";
    const isEdit = (mode === "new" || mode === "edit");

    if (lines.length === 0 && !isEdit) {
      dom.gridBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#777; font-style:italic; padding:12px;">No items in Work Order.</td></tr>`;
      return;
    }

    lines.forEach((l, idx) => {
      const tr = document.createElement("tr");

      if (isEdit) {
        tr.innerHTML = `
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <select class="mfgpo-ctrl subconpo-row-item" data-idx="${idx}" style="width:100%; font-size:11px;">
              <option value="">-- Item --</option>
              ${meta.items.map(it => `<option value="${it.itemId}" ${Number(l.itemId) === it.itemId ? "selected" : ""}>${escapeHtml(it.itemCode)}</option>`).join("")}
            </select>
          </td>
          <td><input type="text" class="mfgpo-ctrl subconpo-row-name" data-idx="${idx}" value="${escapeHtml(l.itemName || "")}" readonly style="width:100%; background:#f4f2ee;"></td>
          <td style="text-align: center;"><input type="text" class="mfgpo-ctrl subconpo-row-uom" data-idx="${idx}" value="${escapeHtml(l.uom || "")}" readonly style="width:50px; text-align:center; background:#f4f2ee;"></td>
          <td><input type="date" class="mfgpo-ctrl subconpo-row-due" data-idx="${idx}" value="${l.dueDate || ""}" style="width:100%;"></td>
          <td><input type="number" class="mfgpo-ctrl subconpo-row-qty" data-idx="${idx}" step="0.0001" min="0" value="${l.qty || 0}" style="width:100%; text-align:right;"></td>
          <td><input type="number" class="mfgpo-ctrl subconpo-row-rate" data-idx="${idx}" step="0.01" min="0" value="${l.rate || 0}" style="width:100%; text-align:right;"></td>
          <td><input type="number" class="mfgpo-ctrl subconpo-row-disc" data-idx="${idx}" step="0.01" min="0" value="${l.discount || 0}" style="width:100%; text-align:right;"></td>
          <td><input type="text" class="mfgpo-ctrl subconpo-row-amt" data-idx="${idx}" value="${fmt2(l.amount)}" readonly style="width:100%; text-align:right; font-weight:bold; background:#e8e8e8;"></td>
          <td><input type="text" class="mfgpo-ctrl subconpo-row-rem" data-idx="${idx}" value="${escapeHtml(l.dcRowRem || "")}" style="width:100%;"></td>
          <td style="text-align: center;">
            <button type="button" class="btn subconpo-row-del" data-idx="${idx}" style="color:red; font-weight:bold; padding:0 4px; font-size:10px;" title="Remove row">×</button>
          </td>
        `;
      } else {
        tr.innerHTML = `
          <td style="text-align: center;">${idx + 1}</td>
          <td><b>${escapeHtml(l.itemCode || "")}</b></td>
          <td>${escapeHtml(l.itemName || "")}</td>
          <td style="text-align: center;">${escapeHtml(l.uom || "")}</td>
          <td style="text-align: center;">${escapeHtml(l.dueDate || "")}</td>
          <td style="text-align: right;">${fmt2(l.qty)}</td>
          <td style="text-align: right;">${fmt2(l.rate)}</td>
          <td style="text-align: right;">${fmt2(l.discount)}</td>
          <td style="text-align: right; font-weight:bold;">${fmt2(l.amount)}</td>
          <td>${escapeHtml(l.dcRowRem || "")}</td>
          <td style="text-align: center;">-</td>
        `;
      }

      dom.gridBody.appendChild(tr);
    });

    if (isEdit) {
      // Add "Add Row" button at bottom of grid
      const addTr = document.createElement("tr");
      addTr.innerHTML = `
        <td colspan="11" style="text-align: left; padding: 4px;">
          <button type="button" class="btn" id="subconpo-btn-add-row" style="font-size:11px; font-weight:bold;">+ Add Item Row</button>
        </td>
      `;
      dom.gridBody.appendChild(addTr);

      document.getElementById("subconpo-btn-add-row").addEventListener("click", () => {
        lines.push({
          slNo: lines.length + 1,
          itemId: 0,
          itemCode: "",
          itemName: "",
          uom: "",
          dueDate: dom.date.value || new Date().toISOString().slice(0, 10),
          qty: 1,
          rate: 0,
          discount: 0,
          amount: 0,
          dcRowRem: ""
        });
        renderLines();
        recalcVal();
      });

      // Item selector change
      dom.gridBody.querySelectorAll(".subconpo-row-item").forEach(sel => {
        sel.addEventListener("change", (e) => {
          const idx = Number(sel.dataset.idx);
          const itId = Number(sel.value);
          const item = meta.items.find(x => x.itemId === itId);
          if (item) {
            lines[idx].itemId = item.itemId;
            lines[idx].itemCode = item.itemCode;
            lines[idx].itemName = item.itemName;
            lines[idx].uom = item.uom;
          } else {
            lines[idx].itemId = 0;
            lines[idx].itemCode = "";
            lines[idx].itemName = "";
            lines[idx].uom = "";
          }
          renderLines();
          recalcVal();
        });
      });

      // Qty, Rate, Disc change
      const updateRowCalc = (idx) => {
        const row = lines[idx];
        const q = Number(row.qty || 0);
        const r = Number(row.rate || 0);
        const d = Number(row.discount || 0);
        row.amount = Number(((q * r) * (1 - d / 100)).toFixed(2));
        const amtInput = dom.gridBody.querySelector(`.subconpo-row-amt[data-idx="${idx}"]`);
        if (amtInput) amtInput.value = fmt2(row.amount);
        recalcVal();
      };

      dom.gridBody.querySelectorAll(".subconpo-row-qty").forEach(inp => {
        inp.addEventListener("input", () => {
          const idx = Number(inp.dataset.idx);
          lines[idx].qty = Number(inp.value || 0);
          updateRowCalc(idx);
        });
      });

      dom.gridBody.querySelectorAll(".subconpo-row-rate").forEach(inp => {
        inp.addEventListener("input", () => {
          const idx = Number(inp.dataset.idx);
          lines[idx].rate = Number(inp.value || 0);
          updateRowCalc(idx);
        });
      });

      dom.gridBody.querySelectorAll(".subconpo-row-disc").forEach(inp => {
        inp.addEventListener("input", () => {
          const idx = Number(inp.dataset.idx);
          lines[idx].discount = Number(inp.value || 0);
          updateRowCalc(idx);
        });
      });

      dom.gridBody.querySelectorAll(".subconpo-row-due").forEach(inp => {
        inp.addEventListener("change", () => {
          const idx = Number(inp.dataset.idx);
          lines[idx].dueDate = inp.value;
        });
      });

      dom.gridBody.querySelectorAll(".subconpo-row-rem").forEach(inp => {
        inp.addEventListener("input", () => {
          const idx = Number(inp.dataset.idx);
          lines[idx].dcRowRem = inp.value;
        });
      });

      // Delete row
      dom.gridBody.querySelectorAll(".subconpo-row-del").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.idx);
          lines.splice(idx, 1);
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

  dom.val.addEventListener("dblclick", recalcVal);

  function displayRecord(note) {
    currentNote = note;
    if (!note) {
      lines = [];
      dom.supp.value = "";
      dom.kindAttn.value = "";
      dom.addr.value = "";
      dom.kst.value = "";
      dom.cst.value = "";
      dom.prefix.value = meta.prefixWO || "";
      dom.no.value = "";
      dom.date.value = "";
      dom.refNo.value = "";
      dom.refDate.value = "";
      dom.validFrom.value = "";
      dom.validTo.value = "";
      dom.cost.value = "";
      dom.rem.value = "";
      dom.terms.value = "";
      dom.val.value = "0.00";
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.stampCancelled.style.display = "none";
      dom.btnCorres.textContent = "Correspondences (0 / 0)";
      setMode("view");
      return;
    }

    lines = (note.lines || []).map(l => ({ ...l }));
    dom.supp.value = note.suppId || "";
    dom.kindAttn.value = note.kindAttn || "";
    dom.addr.value = note.suppAddr || "";
    dom.kst.value = note.kstNo || "";
    dom.cst.value = note.cstNo || "";
    dom.prefix.value = meta.prefixWO || "";
    dom.no.value = note.poNo || "";
    dom.date.value = note.poDate || "";
    dom.refNo.value = note.refQuoteNo || "";
    dom.refDate.value = note.refQuoteDate || "";
    dom.validFrom.value = note.validFrom || "";
    dom.validTo.value = note.validTo || "";
    dom.cost.value = note.costCntrId || "";
    dom.rem.value = note.remark || "";
    dom.terms.value = note.body || "";
    dom.val.value = fmt2(note.totVal);
    dom.chkOpen.checked = Boolean(note.isOpenPO);
    dom.chkSch.checked = Boolean(note.isSchPO);
    dom.stampCancelled.style.display = note.cancl ? "block" : "none";

    setMode("view");
  }

  async function fetchBundle(targetId = null, isNew = false, targetPoNo = null) {
    let url = "/api/subcon-po";
    if (isNew) {
      url += "?new=1";
    } else if (targetId) {
      url += `?id=${targetId}`;
    } else if (targetPoNo) {
      url += `?poNo=${encodeURIComponent(targetPoNo)}`;
    }

    const data = await apiGet(url);
    if (data.error) {
      alert(data.error);
      return;
    }

    meta.suppliers = data.suppliers || [];
    meta.costCenters = data.costCenters || [];
    meta.items = data.items || [];
    meta.ids = data.ids || [];
    meta.nextId = data.nextId || 1;
    meta.prefixWO = data.prefixWO || "";

    populateDropdowns();

    if (isNew) {
      currentNote = null;
      lines = [];
      dom.supp.value = "";
      dom.kindAttn.value = "";
      dom.addr.value = "";
      dom.kst.value = "";
      dom.cst.value = "";
      dom.prefix.value = meta.prefixWO || "";
      dom.no.value = String(meta.nextId);
      dom.date.value = new Date().toISOString().slice(0, 10);
      dom.refNo.value = "";
      dom.refDate.value = "";
      dom.validFrom.value = "";
      dom.validTo.value = "";
      dom.cost.value = meta.costCenters.length > 0 ? meta.costCenters[0].id : "";
      dom.rem.value = "";
      dom.terms.value = "";
      dom.val.value = "0.00";
      dom.chkOpen.checked = false;
      dom.chkSch.checked = false;
      dom.stampCancelled.style.display = "none";
      dom.btnCorres.textContent = "Correspondences (0 / 0)";

      // Default row
      if (meta.items.length > 0) {
        const first = meta.items[0];
        lines.push({
          slNo: 1,
          itemId: first.itemId,
          itemCode: first.itemCode,
          itemName: first.itemName,
          uom: first.uom,
          dueDate: dom.date.value,
          qty: 1,
          rate: 0,
          discount: 0,
          amount: 0,
          dcRowRem: ""
        });
      }

      setMode("new");
    } else {
      displayRecord(data.note || null);
    }
  }

  // Navigation handlers
  function getCurrentIndex() {
    if (!currentNote) return -1;
    return meta.ids.indexOf(currentNote.poId);
  }

  dom.btnFirst.addEventListener("click", () => {
    if (meta.ids.length > 0) fetchBundle(meta.ids[0]);
  });

  dom.btnPrev.addEventListener("click", () => {
    const idx = getCurrentIndex();
    if (idx > 0) fetchBundle(meta.ids[idx - 1]);
  });

  dom.btnNext.addEventListener("click", () => {
    const idx = getCurrentIndex();
    if (idx >= 0 && idx < meta.ids.length - 1) fetchBundle(meta.ids[idx + 1]);
  });

  dom.btnLast.addEventListener("click", () => {
    if (meta.ids.length > 0) fetchBundle(meta.ids[meta.ids.length - 1]);
  });

  dom.btnFind.addEventListener("click", () => {
    const poNo = dom.searchNo.value.trim();
    if (!poNo) {
      alert("Enter Work Order No to search.");
      return;
    }
    fetchBundle(null, false, poNo);
  });

  // Action buttons
  dom.btnNew.addEventListener("click", () => {
    fetchBundle(null, true);
  });

  dom.btnModify.addEventListener("click", () => {
    if (!currentNote) return;
    setMode("edit");
  });

  dom.btnSave.addEventListener("click", async () => {
    const suppId = Number(dom.supp.value);
    if (!suppId) {
      alert("Please Select a Supplier.....");
      dom.supp.focus();
      return;
    }

    const poNo = dom.no.value.trim();
    if (!poNo) {
      alert("Enter the Work Order Number..... ");
      dom.no.focus();
      return;
    }

    const costCntrId = Number(dom.cost.value);
    if (!costCntrId) {
      alert("Please Select an existing CostCenter....");
      dom.cost.focus();
      return;
    }

    if (lines.length === 0) {
      alert("Select Part No./ Items for the order...");
      return;
    }

    for (const [i, l] of lines.entries()) {
      if (!l.itemId) {
        alert(`Select valid Item/Part No for SlNo ${i + 1}`);
        return;
      }
    }

    recalcVal();
    const totVal = parseFloat(dom.val.value) || 0;
    if (!dom.chkOpen.checked && totVal <= 0) {
      alert("Enter the purchase Order Value!!! \r\n Double Click the box to obtain value from the system");
      dom.val.focus();
      return;
    }

    if (!confirm("Are You Sure To Save ?")) return;

    const payload = {
      isNew: (mode === "new"),
      poId: currentNote ? currentNote.poId : null,
      suppId,
      poNo,
      poDate: dom.date.value || new Date().toISOString().slice(0, 10),
      costCntrId,
      kindAttn: dom.kindAttn.value.trim(),
      refQuoteNo: dom.refNo.value.trim(),
      refQuoteDate: dom.refDate.value || null,
      validFrom: dom.validFrom.value || null,
      validTo: dom.validTo.value || null,
      isOpenPO: dom.chkOpen.checked,
      isSchPO: dom.chkSch.checked,
      totVal,
      remark: dom.rem.value.trim(),
      body: dom.terms.value.trim(),
      lines: lines.map(l => ({
        itemId: l.itemId,
        qty: Number(l.qty || 0),
        rate: Number(l.rate || 0),
        discount: Number(l.discount || 0),
        amount: Number(l.amount || 0),
        dueDate: l.dueDate || null,
        dcRowRem: l.dcRowRem || ""
      }))
    };

    const res = await apiPost("/api/subcon-po/save", payload);
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Record Saved.");
    await fetchBundle(res.poId || null, false, res.poNo);
  });

  dom.btnDelete.addEventListener("click", async () => {
    if (!currentNote) return;
    if (!confirm("Are You Sure To Delete?")) return;

    const res = await apiPost("/api/subcon-po/delete", { poId: currentNote.poId, poNo: currentNote.poNo });
    if (res.error) {
      alert(res.error);
      return;
    }

    alert(res.message || "Record Deleted.");
    await fetchBundle(null, false);
  });

  // Correspondences button
  dom.btnCorres.addEventListener("click", () => {
    if (!currentNote || !currentNote.poNo) {
      alert("Save Work Order record first to manage Correspondences.");
      return;
    }
    if (window.openCorres) {
      window.openCorres("SubConPO", currentNote.poNo, currentNote.suppName || "");
    }
  });

  // Print Preview
  dom.btnPrint.addEventListener("click", async () => {
    if (mode === "new" || mode === "edit") {
      alert("Do you want to save changes?");
      return;
    }
    if (!currentNote || !lines.length) {
      alert("No data to Print...");
      return;
    }

    const headRes = await apiGet("/api/print-head");
    const headText = headRes.head || "";

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px;">${headText.split("\n")[0] || "COMPANY NAME"}</h2>
          <p style="margin: 2px 0; font-size: 11px;">${headText.split("\n").slice(1).join(" | ")}</p>
          <h3 style="margin: 6px 0 0 0; text-decoration: underline; font-size: 14px;">WORK ORDER - OUTWARDS</h3>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; font-size: 11px;">
          <div style="border: 1px solid #777; padding: 8px;">
            <b>To Supplier:</b><br>
            <span style="font-size: 12px; font-weight: bold;">${escapeHtml(currentNote.suppName)}</span><br>
            <span>${escapeHtml(currentNote.suppAddr).replace(/\n/g, "<br>")}</span><br>
            ${currentNote.gstin ? `<b>GSTIN:</b> ${escapeHtml(currentNote.gstin)}<br>` : (currentNote.kstNo ? `<b>GSTIN:</b> ${escapeHtml(currentNote.kstNo)}<br>` : "")}
            ${currentNote.kindAttn ? `Kind Attn: <b>${escapeHtml(currentNote.kindAttn)}</b><br>` : ""}
          </div>
          <div style="border: 1px solid #777; padding: 8px;">
            <b>Work Order No:</b> <span style="font-weight:bold; font-size:12px;">${escapeHtml(currentNote.poNo)}</span><br>
            <b>Date:</b> ${escapeHtml(currentNote.poDate)}<br>
            <b>Cost Center:</b> ${escapeHtml(currentNote.costCntr || "-")}<br>
            ${currentNote.refQuoteNo ? `<b>Ref Quote:</b> ${escapeHtml(currentNote.refQuoteNo)} (${escapeHtml(currentNote.refQuoteDate || "")})<br>` : ""}
            ${currentNote.validFrom ? `<b>Valid Period:</b> ${escapeHtml(currentNote.validFrom)} to ${escapeHtml(currentNote.validTo || "")}<br>` : ""}
            <b>Remarks:</b> ${escapeHtml(currentNote.remark || "-")}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 5px; width: 30px;">Sl</th>
              <th style="border: 1px solid #000; padding: 5px; width: 100px;">Part No</th>
              <th style="border: 1px solid #000; padding: 5px;">Description</th>
              <th style="border: 1px solid #000; padding: 5px; width: 50px;">UOM</th>
              <th style="border: 1px solid #000; padding: 5px; width: 80px;">Delivery</th>
              <th style="border: 1px solid #000; padding: 5px; width: 60px;">Qty</th>
              <th style="border: 1px solid #000; padding: 5px; width: 70px;">Rate</th>
              <th style="border: 1px solid #000; padding: 5px; width: 50px;">Disc %</th>
              <th style="border: 1px solid #000; padding: 5px; width: 80px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map((l, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px;"><b>${escapeHtml(l.itemCode)}</b></td>
                <td style="border: 1px solid #000; padding: 4px;">${escapeHtml(l.itemName)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(l.uom)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(l.dueDate)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.qty)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.rate)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${fmt2(l.discount)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${fmt2(l.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="8" style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">TOTAL VALUE:</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 12px;">Rs. ${fmt2(currentNote.totVal)}</td>
            </tr>
          </tfoot>
        </table>

        ${currentNote.body ? `
          <div style="border: 1px solid #777; padding: 8px; font-size: 10px; margin-bottom: 25px;">
            <b>Terms & Conditions:</b><br>
            ${escapeHtml(currentNote.body).replace(/\n/g, "<br>")}
          </div>
        ` : ""}

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px;">
          <div>Prepared By</div>
          <div>Verified By</div>
          <div style="text-align: right;">Authorised Signatory</div>
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview("Work Order - Outwards", html);
    } else {
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.print();
    }
  });

  // Window openers & closers
  function closeWindow() {
    dom.section.hidden = true;
  }
  dom.btnClose.addEventListener("click", closeWindow);
  dom.btnX.addEventListener("click", closeWindow);

  window.openSubconPO = async function () {
    dom.section.hidden = false;
    await fetchBundle();
  };

  window.closeSubconPO = closeWindow;
})();
