(() => {
  const panel = document.querySelector("#po");
  const grid = document.querySelector("#po-grid");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  const menu = document.createElement("div");
  menu.className = "item-menu";
  menu.hidden = true;
  panel.appendChild(menu);

  let data = null;
  let lines = [];
  let saved = false;

  function showInfo(message) {
    return new Promise((resolve) => {
      infoTitle.textContent = document.title || "Tamba ERP";
      infoText.textContent = message;
      info.hidden = false;
      const ok = document.querySelector("#info-ok");
      function done() {
        ok.removeEventListener("click", done);
        info.hidden = true;
        resolve();
      }
      ok.addEventListener("click", done);
      ok.focus();
    });
  }

  function askYes(message) {
    return new Promise((resolve) => {
      askTitle.textContent = document.title || "Tamba ERP";
      askText.textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(value) {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        ask.hidden = true;
        resolve(value);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      yes.focus();
    });
  }

  function today() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  }

  function itemByCode(code) {
    return (data && data.items ? data.items : []).find((row) => row.code === code) || null;
  }

  function findTyped(text) {
    const typed = String(text || "").trim();
    if (!typed) return null;
    return (data && data.items ? data.items : []).find((row) => row.code === typed || `${row.code}  ${row.name}` === typed) || null;
  }

  function showMenu(input, query) {
    const q = String(query || "").trim().toLowerCase();
    const rows = (data && data.items ? data.items : []).filter((row) => !q || row.code.toLowerCase().includes(q) || String(row.name || "").toLowerCase().includes(q));
    menu.dataset.index = input.dataset.code;
    menu.dataset.active = "0";
    menu.innerHTML = rows.length
      ? rows.map((row, index) => `<button type="button" data-pick="${esc(row.code)}" class="${index === 0 ? "on" : ""}">${esc(row.code)}  ${esc(row.name)}</button>`).join("")
      : `<div class="none">No match</div>`;
    const rect = input.getBoundingClientRect();
    const host = panel.getBoundingClientRect();
    menu.style.left = `${rect.left - host.left - panel.clientLeft + panel.scrollLeft}px`;
    menu.style.top = `${rect.bottom - host.top - panel.clientTop + panel.scrollTop}px`;
    menu.style.width = `${Math.max(rect.width + 18, 260)}px`;
    menu.hidden = false;
  }

  function choose(code) {
    const index = Number(menu.dataset.index);
    const item = itemByCode(code);
    menu.hidden = true;
    if (!item || !Number.isFinite(index)) return;
    readLines();
    lines[index].code = item.code;
    lines[index].name = item.name;
    lines[index].uom = item.uom || (data.measurements && data.measurements[0]) || "NOS";
    if (!lines[index].rate && item.rate) lines[index].rate = item.rate;
    lines[index].currentStock = Number(item.currentStock) || 0;
    paint();
    total();
    calcCurrency();
  }

  function total() {
    const sum = lines.reduce((amount, line) => {
      const gross = (Number(line.qty) || 0) * (Number(line.rate) || 0);
      const net = gross - (gross * (Number(line.discount) || 0) / 100);
      return amount + net;
    }, 0);
    document.querySelector("#po-total").value = money(sum);
    calcCurrency();
  }

  function calcCurrency() {
    const currSelect = document.querySelector("#po-curr");
    const currId = Number(currSelect.value) || 0;
    const currObj = (data && data.currencies ? data.currencies : []).find((c) => c.id === currId);
    const todayLabel = document.querySelector("#po-today-val");
    const rupeesLabel = document.querySelector("#po-rupees-label");
    const totalVal = Number(document.querySelector("#po-total").value) || 0;

    if (!currObj || String(currObj.name || "").trim().toUpperCase() === "RUPEES" || String(currObj.name || "").trim().toUpperCase() === "RS") {
      todayLabel.textContent = "";
      todayLabel.hidden = true;
      rupeesLabel.textContent = "(In Rs)";
    } else {
      const rate = Number(currObj.rateToday) || 1.0;
      todayLabel.textContent = `Rs. ${rate.toFixed(2)}`;
      todayLabel.hidden = false;
      const converted = totalVal * rate;
      rupeesLabel.textContent = `(In Rs. ${converted.toFixed(2)})`;
    }
  }

  function paint() {
    menu.hidden = true;
    const uoms = (data && data.measurements) ? data.measurements : ["NOS", "KGS", "MTR", "SET"];
    grid.innerHTML = `<table><thead><tr>
      <th style="width:45px">Sl.No</th>
      <th style="width:140px">Item Code / Part No.</th>
      <th style="width:180px">Item / Part Name</th>
      <th style="width:70px">UOM</th>
      <th style="width:75px">Qty</th>
      <th style="width:75px">Rate</th>
      <th style="width:60px">Disc %</th>
      <th style="width:105px">Due Date</th>
      <th style="width:80px">Current Stk.Qty</th>
    </tr></thead><tbody>${lines.map((line, index) => `<tr>
      <td style="text-align:center">${index + 1}</td>
      <td><div class="item-pick"><input data-code="${index}" value="${esc(line.code)}" autocomplete="off"><button type="button" class="item-open" data-open="${index}" tabindex="-1">&#9662;</button></div></td>
      <td><input data-name="${index}" value="${esc(line.name)}" readonly></td>
      <td>
        <select data-uom="${index}">
          ${uoms.map((u) => `<option value="${esc(u)}" ${u === line.uom ? "selected" : ""}>${esc(u)}</option>`).join("")}
        </select>
      </td>
      <td><input data-qty="${index}" value="${esc(line.qty)}" style="text-align:right"></td>
      <td><input data-rate="${index}" value="${esc(line.rate)}" style="text-align:right"></td>
      <td><input data-disc="${index}" value="${esc(line.discount)}" style="text-align:right"></td>
      <td><input data-due="${index}" type="date" value="${esc(line.dueDate || "")}"></td>
      <td><input data-stk="${index}" class="calc" value="${esc(line.currentStock ?? "")}" readonly style="text-align:right"></td>
    </tr>`).join("")}</tbody></table>`;
  }

  function readLines() {
    lines.forEach((line, index) => {
      const code = grid.querySelector(`[data-code="${index}"]`);
      const name = grid.querySelector(`[data-name="${index}"]`);
      const uom = grid.querySelector(`[data-uom="${index}"]`);
      const qty = grid.querySelector(`[data-qty="${index}"]`);
      const rate = grid.querySelector(`[data-rate="${index}"]`);
      const disc = grid.querySelector(`[data-disc="${index}"]`);
      const due = grid.querySelector(`[data-due="${index}"]`);
      if (code) {
        const item = findTyped(code.value);
        line.code = item ? item.code : code.value.trim();
        if (item) line.name = item.name;
      }
      if (name && line.name === undefined) line.name = name.value;
      if (uom) line.uom = uom.value;
      if (qty) line.qty = qty.value;
      if (rate) line.rate = rate.value;
      if (disc) line.discount = disc.value;
      if (due) line.dueDate = due.value;
    });
  }

  function attentions() {
    const names = (data.attentions || []).filter(Boolean);
    document.querySelector("#po-attn-list").innerHTML = [...new Set(names)].map((name) => `<option value="${esc(name)}"></option>`).join("");
  }

  async function onVendorChange() {
    const vendorCode = Number(document.querySelector("#po-vendor").value) || 0;
    if (vendorCode) {
      const resp = await fetch(`/api/po/vendor-items?vendor=${vendorCode}`);
      if (resp.ok) {
        const res = await resp.json();
        data.items = res.items || [];
      }
    }
  }

  function fillLists() {
    document.querySelector("#po-vendor").innerHTML = `<option value=""></option>${(data.vendors || []).map((row) => `<option value="${row.code}">${esc(row.name)}</option>`).join("")}`;
    document.querySelector("#po-cost-center").innerHTML = `<option value=""></option>${(data.costCenters || []).map((row) => `<option value="${row.id}">${esc(row.name)}</option>`).join("")}`;
    document.querySelector("#po-curr").innerHTML = `${(data.currencies || []).map((row) => `<option value="${row.id}">${esc(row.name)}</option>`).join("")}`;
    document.querySelector("#po-prefix").value = data.prefix || "";
  }

  function apply(next, blank) {
    data = next;
    saved = Boolean(next.note) && !blank;
    fillLists();
    const note = blank ? null : next.note;

    document.querySelector("#po-no").value = note ? note.no : (blank && next.next ? next.next.no : "");
    document.querySelector("#po-date").value = note && note.date ? note.date : today();
    document.querySelector("#po-vendor").value = note ? String(note.vendorCode || "") : "";
    document.querySelector("#po-attn").value = note ? note.kindAttn : "";
    document.querySelector("#po-open").checked = note ? note.isOpenPo : false;
    document.querySelector("#po-sch").checked = note ? note.isSchPo : false;
    document.querySelector("#po-remark").value = note ? note.remark : "";
    document.querySelector("#po-terms").value = note ? note.body : "";
    document.querySelector("#po-pr-no").value = note ? note.prNo : "";
    document.querySelector("#po-pr-date").value = note ? note.prDate : "";
    document.querySelector("#po-quote-no").value = note ? note.refQuoteNo : "";
    document.querySelector("#po-quote-date").value = note ? note.refQuoteDate : "";
    document.querySelector("#po-valid-from").value = note ? note.validFrom : today();
    document.querySelector("#po-valid-to").value = note ? note.validTo : today();
    document.querySelector("#po-cost-center").value = note && note.costCntrId ? String(note.costCntrId) : (data.costCenters[0] ? String(data.costCenters[0].id) : "");
    document.querySelector("#po-curr").value = note && note.currId ? String(note.currId) : (data.currencies[0] ? String(data.currencies[0].id) : "");
    document.querySelector("#po-cert").checked = note ? note.isTestCert : false;
    document.querySelector("#po-retrk").checked = note ? note.retrkRej : (data.defaultRetrkRej ?? false);

    lines = note ? note.lines.map((line) => ({ ...line })) : [];

    document.querySelector("#po-new").disabled = !saved && blank;
    document.querySelector("#po-modify").disabled = !saved;
    document.querySelector("#po-delete").disabled = !saved;
    document.querySelector("#po-save").disabled = false;

    const corres = document.querySelector("#po .corres");
    corres.hidden = !saved;
    if (saved && note && window.corresCaption) {
      window.corresCaption("PurchasePO", note.id).then((text) => { corres.textContent = text; });
    }

    attentions();
    paint();
    total();
    calcCurrency();

    if (note && note.purchVal) {
      document.querySelector("#po-total").value = money(note.purchVal);
    }
  }

  async function load(query) {
    const response = await fetch(`/api/po${query || ""}`);
    if (!response.ok) return null;
    return response.json();
  }

  async function open(query) {
    const next = await load(query);
    if (!next) return;
    if (next.message) {
      await showInfo(next.message);
      return;
    }
    apply(next, query === "?new=1");
  }

  function payload() {
    readLines();
    total();
    return {
      id: saved && data.note ? data.note.id : 0,
      vendorCode: Number(document.querySelector("#po-vendor").value) || 0,
      isOpenPo: document.querySelector("#po-open").checked,
      isSchPo: document.querySelector("#po-sch").checked,
      kindAttn: document.querySelector("#po-attn").value,
      no: document.querySelector("#po-no").value,
      date: document.querySelector("#po-date").value,
      prNo: document.querySelector("#po-pr-no").value,
      prDate: document.querySelector("#po-pr-date").value || null,
      refQuoteNo: document.querySelector("#po-quote-no").value,
      refQuoteDate: document.querySelector("#po-quote-date").value || null,
      validFrom: document.querySelector("#po-valid-from").value || null,
      validTo: document.querySelector("#po-valid-to").value || null,
      costCntrId: Number(document.querySelector("#po-cost-center").value) || 0,
      currId: Number(document.querySelector("#po-curr").value) || 0,
      isTestCert: document.querySelector("#po-cert").checked,
      retrkRej: document.querySelector("#po-retrk").checked,
      remark: document.querySelector("#po-remark").value,
      body: document.querySelector("#po-terms").value,
      lines
    };
  }

  function check(body) {
    if (!body.vendorCode) return "Please Select a VENDOR.....";
    if (!String(body.no || "").trim()) return "Enter the Purchase Order Number..... ";
    if (!body.costCntrId) return "Please Select an existing CostCenter....";
    if (!body.currId) return "Please Select an existing Currency Name....";

    if (!body.isSchPo) {
      if (!body.lines.length) return "Part No./ Items";
      const seen = new Map();
      for (let index = 0; index < body.lines.length; index += 1) {
        const line = body.lines[index];
        const sl = index + 1;
        const code = String(line.code || "").trim();
        if (!code) continue;
        if (seen.has(code)) return `Duplication of  Part No./ Items is not allowed. SEE ROWS: ${seen.get(code)} and  ${sl}`;
        seen.set(code, sl);
        const item = itemByCode(code);
        if (!item) return `Select Valid Part No. for the SlNo. ${sl}`;
        const qty = Number(line.qty);
        if (!Number.isFinite(qty) || qty <= 0) return "Enter the Valid Qty  ";
      }
      if (seen.size === 0) return "Part No./ Items";
    }
    return "";
  }

  async function save(modify) {
    const body = payload();
    const problem = check(body);
    if (problem) return showInfo(problem);
    if (!(await askYes(modify ? "Are You Sure To Modify ?" : "Are You Sure To Save ?"))) return;

    const response = await fetch("/api/po/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    apply(result, false);
    await showInfo(modify ? "Record Modified ." : "Record Saved .");
  }

  function digitsOnly(event) {
    const box = event.target;
    if (!box.matches("[data-qty], [data-rate], [data-disc]")) return;
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey) return;
    const digit = event.key >= "0" && event.key <= "9";
    const dot = event.key === "." && !box.value.includes(".");
    if (!digit && !dot) event.preventDefault();
  }

  grid.addEventListener("click", (event) => {
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      const input = grid.querySelector(`[data-code="${openBtn.dataset.open}"]`);
      if (input) showMenu(input, "");
      return;
    }
    if (event.target.tagName === "TH" && !lines.length) {
      lines.push({ code: "", name: "", uom: (data.measurements && data.measurements[0]) || "NOS", qty: "", rate: "", discount: "0", dueDate: today(), currentStock: 0 });
      paint();
      const input = grid.querySelector('[data-code="0"]');
      if (input) input.focus();
    }
  });

  grid.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-code]")) showMenu(input, input.value);
    if (input.matches("[data-qty], [data-rate], [data-disc]")) {
      readLines();
      total();
    }
  });

  grid.addEventListener("keydown", (event) => {
    digitsOnly(event);
    const input = event.target;
    if (input.matches("[data-code]") && !menu.hidden) {
      const buttons = [...menu.querySelectorAll("[data-pick]")];
      let active = Number(menu.dataset.active || 0);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        active = event.key === "ArrowDown" ? Math.min(buttons.length - 1, active + 1) : Math.max(0, active - 1);
        menu.dataset.active = String(active);
        buttons.forEach((button, index) => button.classList.toggle("on", index === active));
        return;
      }
      if (event.key === "Enter" && buttons[active]) {
        event.preventDefault();
        choose(buttons[active].dataset.pick);
        return;
      }
    }
    if (event.key === "Enter" && input.matches("[data-code]")) {
      const item = findTyped(input.value);
      if (item) {
        event.preventDefault();
        menu.dataset.index = input.dataset.code;
        choose(item.code);
        return;
      }
    }
    if (event.key === "ArrowDown" && input.matches("[data-qty], [data-rate], [data-disc], [data-due]")) {
      const index = Number(input.dataset.qty || input.dataset.rate || input.dataset.disc || input.dataset.due);
      if (index === lines.length - 1) {
        readLines();
        lines.push({ code: "", name: "", uom: (data.measurements && data.measurements[0]) || "NOS", qty: "", rate: "", discount: "0", dueDate: today(), currentStock: 0 });
        paint();
        total();
        const nextInput = grid.querySelector(`[data-code="${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  });

  grid.addEventListener("change", (event) => {
    const input = event.target;
    if (input.matches("[data-code]")) {
      const item = findTyped(input.value);
      if (item) {
        menu.dataset.index = input.dataset.code;
        choose(item.code);
      }
    }
    if (input.matches("[data-uom]")) {
      readLines();
    }
  });

  menu.addEventListener("mousedown", (event) => {
    const button = event.target.closest("[data-pick]");
    if (!button) return;
    event.preventDefault();
    choose(button.dataset.pick);
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key === "End") {
      event.preventDefault();
      window.closePo();
      return;
    }
    if (event.key === "F5") {
      event.preventDefault();
      if (window.openItem) window.openItem();
    }
  });

  document.querySelector("#po-vendor").addEventListener("change", () => {
    onVendorChange().then(() => {
      attentions();
    });
  });

  document.querySelector("#po-curr").addEventListener("change", calcCurrency);

  document.querySelector("#po-new").addEventListener("click", () => open("?new=1"));
  document.querySelector("#po-save").addEventListener("click", () => save(saved));
  document.querySelector("#po-modify").addEventListener("click", () => save(true));
  document.querySelector("#po-delete").addEventListener("click", async () => {
    if (!saved || !data.note) return;
    if (!(await askYes("Are You Sure To Delete ?"))) return;
    const response = await fetch("/api/po/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.note.id })
    });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    apply(result, false);
    await showInfo("Record Deleted Successfully.");
  });

  document.querySelector("#po-find").addEventListener("keydown", (event) => {
    if (event.key === "Enter") open(`?no=${encodeURIComponent(event.target.value.trim())}`);
  });
  document.querySelector(".po .issue-search").addEventListener("click", (event) => {
    if (event.target.id === "po-find") return;
    open(`?no=${encodeURIComponent(document.querySelector("#po-find").value.trim())}`);
  });

  document.querySelector("#po-first").addEventListener("click", () => data && data.ids[0] && open(`?id=${data.ids[0]}`));
  document.querySelector("#po-last").addEventListener("click", () => data && data.ids.length && open(`?id=${data.ids[data.ids.length - 1]}`));
  document.querySelector("#po-prev").addEventListener("click", () => {
    if (!data || !data.note) return;
    const place = data.ids.indexOf(data.note.id);
    if (place > 0) open(`?id=${data.ids[place - 1]}`);
  });
  document.querySelector("#po-next").addEventListener("click", () => {
    if (!data || !data.note) return;
    const place = data.ids.indexOf(data.note.id);
    if (place >= 0 && place < data.ids.length - 1) open(`?id=${data.ids[place + 1]}`);
  });

  async function printPo() {
    if (!saved || !data || !data.note) {
      await showInfo("No data to Print...");
      return;
    }
    const note = data.note;
    const vendor = (data.vendors || []).find((v) => String(v.code) === String(note.vendorCode)) || {};
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
        <td style="border: 1px solid #777; padding: 4px;"><b>${esc(l.code)}</b><br><small>${esc(l.name)}</small></td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${esc(l.uom || "NOS")}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${money(l.qty)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px;">${money(l.rate)}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px;">${l.discount ? Number(l.discount).toFixed(2) + '%' : '-'}</td>
        <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${money(l.amount || (Number(l.qty || 0) * Number(l.rate || 0) * (1 - (Number(l.discount || 0) / 100))))}</td>
        <td style="text-align: center; border: 1px solid #777; padding: 4px;">${l.dueDate ? esc(l.dueDate) : '-'}</td>
      </tr>
    `).join("");

    const totalVal = note.purchVal || (note.lines || []).reduce((sum, l) => sum + Number(l.amount || (Number(l.qty || 0) * Number(l.rate || 0) * (1 - (Number(l.discount || 0) / 100)))), 0);

    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #000; padding: 8px;">
        <div style="border: 2px solid #000; padding: 8px; text-align: center; background: #fafafa;">
          <div style="font-size: 16px; font-weight: bold; color: #000080;">${esc(compName)}</div>
          <div style="font-size: 11px; line-height: 1.3; margin-top: 3px;">${compAddr}</div>
          <div style="font-size: 15px; font-weight: bold; margin-top: 6px; text-decoration: underline; text-transform: uppercase;">PURCHASE ORDER</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 8px; vertical-align: top;">
              <b>Supplier / Vendor:</b><br>
              <div style="font-size: 13px; font-weight: bold; color: #333; margin-top: 2px;">${esc(vendor.name || document.querySelector("#po-vendor option:checked")?.textContent || "")}</div>
              <div style="margin-top: 4px;">${esc(vendor.address || "")}</div>
              ${note.kindAttn ? `<div style="margin-top: 4px;"><b>Kind Attn:</b> ${esc(note.kindAttn)}</div>` : ""}
            </td>
            <td style="width: 50%; padding: 8px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="padding: 2px 0;"><b>P.O. No:</b></td><td style="padding: 2px 0; font-weight: bold; color: #000080;">${esc(document.querySelector("#po-prefix")?.value || "")} ${esc(note.no)}</td></tr>
                <tr><td style="padding: 2px 0;"><b>P.O. Date:</b></td><td style="padding: 2px 0;">${esc(note.date || "")}</td></tr>
                ${note.refQuoteNo ? `<tr><td style="padding: 2px 0;"><b>Ref. Quotation:</b></td><td style="padding: 2px 0;">${esc(note.refQuoteNo)} ${note.refQuoteDate ? 'Dt: ' + esc(note.refQuoteDate) : ''}</td></tr>` : ""}
                ${note.prNo ? `<tr><td style="padding: 2px 0;"><b>PR No:</b></td><td style="padding: 2px 0;">${esc(note.prNo)} ${note.prDate ? 'Dt: ' + esc(note.prDate) : ''}</td></tr>` : ""}
                ${note.validFrom ? `<tr><td style="padding: 2px 0;"><b>Validity:</b></td><td style="padding: 2px 0;">${esc(note.validFrom)} to ${esc(note.validTo || "")}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; border-bottom: 2px solid #000;">
              <th style="padding: 4px; border-right: 1px solid #777; width: 30px;">Sl</th>
              <th style="padding: 4px; border-right: 1px solid #777;">Item Code / Description</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 45px;">UOM</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 60px; text-align: right;">Qty</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 65px; text-align: right;">Rate</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 50px; text-align: right;">Disc%</th>
              <th style="padding: 4px; border-right: 1px solid #777; width: 75px; text-align: right;">Amount</th>
              <th style="padding: 4px; width: 75px; text-align: center;">Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align: center; padding: 10px;">No items in purchase order</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #f0f0f0;">
              <td colspan="6" style="padding: 6px; text-align: right; border-right: 1px solid #777;">Total Order Value:</td>
              <td style="padding: 6px; text-align: right; color: #000080; border-right: 1px solid #777;">Rs. ${money(totalVal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        ${note.body ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px;">
            <b>Terms & Conditions:</b><br>
            <div style="white-space: pre-wrap; margin-top: 2px;">${esc(note.body)}</div>
          </div>
        ` : ""}
        ${note.remark ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px;">
            <b>Remarks:</b> ${esc(note.remark)}
          </div>
        ` : ""}
        ${note.isTestCert ? `
          <div style="border: 2px solid #000; border-top: none; padding: 6px; font-size: 10px; font-weight: bold; color: #b00;">
            Note: Enclose All Test Certificate / Warranty Card along with your Material Supply.
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; font-size: 11px;">
          <tr>
            <td style="width: 50%; padding: 12px 8px; vertical-align: bottom;">
              <div>Supplier's Acceptance Signature</div>
            </td>
            <td style="width: 50%; padding: 12px 8px; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; margin-bottom: 35px;">For ${esc(compName)}</div>
              <div style="font-weight: bold;">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(`Purchase Order - ${note.no}`, docHtml);
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

  document.querySelector("#po-print")?.addEventListener("click", printPo);
  document.querySelector("#po-close").addEventListener("click", () => window.closePo());
  document.querySelector("#po-btn-close-x")?.addEventListener("click", () => window.closePo());

  document.querySelector("#po-corres").addEventListener("click", () => {
    if (!saved || !data.note || !window.openCorres) return;
    window.openCorres({
      cat: "PurchasePO",
      key: String(data.note.id),
      onChange: () => window.corresCaption("PurchasePO", data.note.id).then((text) => {
        document.querySelector("#po-corres").textContent = text;
      })
    });
  });

  window.openPo = function openPo(isNew) {
    panel.hidden = false;
    open(isNew ? "?new=1" : "");
  };
  window.openPO = window.openPo;

  window.closePo = function closePo() {
    menu.hidden = true;
    panel.hidden = true;
    if (window.closeCorres) window.closeCorres();
  };
  window.closePO = window.closePo;
})();
