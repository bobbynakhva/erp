(() => {
  const panel = document.querySelector("#enq");
  const grid = document.querySelector("#enq-grid");
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

  function itemLabel(code) {
    const item = itemByCode(code);
    return item ? `${item.code}  ${item.name}` : (code || "");
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

  async function fillPrice(index) {
    const line = lines[index];
    const item = itemByCode(line.code);
    if (!item) return;
    const vendor = Number(document.querySelector("#enq-vendor").value) || 0;
    const response = await fetch(`/api/enquiry/rate?vendor=${vendor}&item=${item.id}`);
    if (!response.ok) return;
    const price = await response.json();
    line.rate = price.rate || "";
    line.moq = price.moq || "";
    line.amount = money((Number(line.moq) || 0) * (Number(line.rate) || 0));
    paint();
    total();
  }

  function choose(code) {
    const index = Number(menu.dataset.index);
    const item = itemByCode(code);
    menu.hidden = true;
    if (!item || !Number.isFinite(index)) return;
    readLines();
    lines[index].code = item.code;
    lines[index].name = item.name;
    lines[index].uom = item.unit || "";
    paint();
    fillPrice(index);
  }

  function total() {
    const sum = lines.reduce((amount, line) => amount + (Number(line.moq) || 0) * (Number(line.rate) || 0), 0);
    document.querySelector("#enq-total").value = money(sum);
  }

  function paint() {
    menu.hidden = true;
    grid.innerHTML = `<table><thead><tr>
      <th>Sl.No</th><th>Item Code / Part No.</th><th>Item/Component Name</th><th>UOM</th><th>MOQ</th><th>Rate</th><th>Amount</th>
    </tr></thead><tbody>${lines.map((line, index) => `<tr>
      <td>${index + 1}</td>
      <td><div class="item-pick"><input data-code="${index}" value="${esc(line.code)}" autocomplete="off"><button type="button" class="item-open" data-open="${index}" tabindex="-1">&#9662;</button></div></td>
      <td><input data-name="${index}" value="${esc(line.name)}"></td>
      <td><input data-uom="${index}" value="${esc(line.uom)}"></td>
      <td><input data-moq="${index}" value="${esc(line.moq)}"></td>
      <td><input data-rate="${index}" value="${esc(line.rate)}"></td>
      <td><input data-amt="${index}" class="calc" value="${esc(line.amount || "0.00")}" readonly></td>
    </tr>`).join("")}</tbody></table>`;
  }

  function readLines() {
    lines.forEach((line, index) => {
      const code = grid.querySelector(`[data-code="${index}"]`);
      const name = grid.querySelector(`[data-name="${index}"]`);
      const uom = grid.querySelector(`[data-uom="${index}"]`);
      const moq = grid.querySelector(`[data-moq="${index}"]`);
      const rate = grid.querySelector(`[data-rate="${index}"]`);
      if (code) {
        const item = findTyped(code.value);
        line.code = item ? item.code : code.value.trim();
      }
      if (name) line.name = name.value;
      if (uom) line.uom = uom.value;
      if (moq) line.moq = moq.value;
      if (rate) line.rate = rate.value;
      line.amount = money((Number(line.moq) || 0) * (Number(line.rate) || 0));
    });
  }

  function attentions() {
    const vendor = Number(document.querySelector("#enq-vendor").value) || 0;
    const names = (data.attentions || []).filter((row) => row.vendorCode === vendor).map((row) => row.name);
    const contact = ((data.vendors || []).find((row) => row.code === vendor) || {}).contact || "";
    if (contact) names.push(contact);
    document.querySelector("#enq-attn-list").innerHTML = [...new Set(names.filter(Boolean))].map((name) => `<option value="${esc(name)}"></option>`).join("");
  }

  function fillLists() {
    document.querySelector("#enq-vendor").innerHTML = `<option value=""></option>${(data.vendors || []).map((row) => `<option value="${row.code}" data-addr="${esc(row.addr || "").replace(/\r\n|\n|\r/g, "&#10;")}" data-cust="${esc(row.cust || "")}">${esc(row.name)}</option>`).join("")}`;
    document.querySelector("#enq-prefix").value = data.prefix || "";
  }

  function apply(next, blank) {
    data = next;
    saved = Boolean(next.note) && !blank;
    fillLists();
    const note = blank ? null : next.note;
    document.querySelector("#enq-no").value = note ? note.no : (blank ? next.nextNo : "");
    document.querySelector("#enq-date").value = note && note.date ? note.date : today();
    document.querySelector("#enq-vendor").value = note ? String(note.vendorCode || "") : "";
    document.querySelector("#enq-attn").value = note ? note.attn : "";
    document.querySelector("#enq-remark").value = note ? note.remark : "";
    document.querySelector("#enq-cert").checked = note ? note.cert : false;
    lines = note ? note.lines.map((line) => ({ ...line })) : [];
    document.querySelector("#enq-new").disabled = !saved && blank;
    document.querySelector("#enq-modify").disabled = !saved;
    document.querySelector("#enq-delete").disabled = !saved;
    document.querySelector("#enq-save").disabled = false;
    const corres = document.querySelector("#enq .corres");
    corres.hidden = !saved;
    if (saved && note && window.corresCaption) window.corresCaption("Enquiry", note.id).then((text) => { corres.textContent = text; });
    attentions();
    paint();
    total();
    if (note) document.querySelector("#enq-total").value = note.total || document.querySelector("#enq-total").value;
  }

  async function load(query) {
    const response = await fetch(`/api/enquiry${query || ""}`);
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
      no: document.querySelector("#enq-no").value,
      date: document.querySelector("#enq-date").value,
      vendorCode: Number(document.querySelector("#enq-vendor").value),
      attn: document.querySelector("#enq-attn").value,
      remark: document.querySelector("#enq-remark").value,
      cert: document.querySelector("#enq-cert").checked,
      lines
    };
  }

  function check(body) {
    if (!body.vendorCode) return "Please Select a Vendor.....";
    if (!String(body.no || "").trim()) return "Enter the Enquiry Number..... ";
    if (!body.lines.length) return "Please Enter the item details by clicking the grid heading...";
    for (let index = 0; index < body.lines.length; index += 1) {
      const line = body.lines[index];
      const sl = index + 1;
      const code = String(line.code || "").trim();
      const name = String(line.name || "").trim();
      const uom = String(line.uom || "").trim();
      if (!code) return `Enter a Valid  Part No.  for the SlNo.${sl}`;
      if (!itemByCode(code)) return "Item does not exist ... Press F5 Key to Add New Items!!!";
      if (!name) return `Enter Item/Component Name for the SlNo. ${sl}`;
      if (!uom) return `Enter a Valid 'Unit Of Measurements' 'UOM'  in short Form \r\n eg., Kg for Kilograms, Nos for Numbers etc.\r\n for the SlNo.${sl}`;
      const moq = Number(line.moq);
      if (!Number.isFinite(moq) || moq === 0) return "Enter the Valid Minimum Order Qty .....  ";
    }
    return "";
  }

  async function save(modify) {
    const body = payload();
    const problem = check(body);
    if (problem) return showInfo(problem);
    if (!(await askYes(modify ? "Are You Sure To Modify ?" : "Are You Sure To Save ?"))) return;
    const response = await fetch("/api/enquiry/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    apply(result, false);
    await showInfo(modify ? "Record Modified." : "Record Saved .");
  }

  function digitsOnly(event) {
    const box = event.target;
    if (!box.matches("[data-moq], [data-rate], #enq-total")) return;
    if (event.key === "Enter" && box.id === "enq-total") {
      event.preventDefault();
      document.querySelector("#enq-remark").focus();
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey) return;
    const digit = event.key >= "0" && event.key <= "9";
    const dot = event.key === "." && !box.value.includes(".");
    if (!digit && !dot) event.preventDefault();
  }

  grid.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open]");
    if (open) {
      const input = grid.querySelector(`[data-code="${open.dataset.open}"]`);
      if (input) showMenu(input, "");
      return;
    }
    if (event.target.tagName === "TH" && !lines.length) {
      lines.push({ code: "", name: "", uom: "", moq: "", rate: "", amount: "0.00" });
      paint();
      const input = grid.querySelector('[data-code="0"]');
      if (input) input.focus();
    }
  });

  grid.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-code]")) showMenu(input, input.value);
    if (input.matches("[data-moq], [data-rate]")) {
      readLines();
      const index = input.dataset.moq || input.dataset.rate;
      const amount = grid.querySelector(`[data-amt="${index}"]`);
      if (amount) amount.value = lines[index].amount;
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
      }
    }
    if (event.key === "ArrowDown" && input.matches("[data-name], [data-uom], [data-moq], [data-rate]")) {
      const index = Number(input.dataset.name || input.dataset.uom || input.dataset.moq || input.dataset.rate);
      if (index === lines.length - 1) {
        readLines();
        lines.push({ code: "", name: "", uom: "", moq: "", rate: "", amount: "0.00" });
        paint();
        total();
        const next = grid.querySelector(`[data-code="${index + 1}"]`);
        if (next) next.focus();
      }
    }
  });

  grid.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches("[data-code]")) return;
    const item = findTyped(input.value);
    if (!item) return;
    menu.dataset.index = input.dataset.code;
    choose(item.code);
  });

  menu.addEventListener("mousedown", (event) => {
    const button = event.target.closest("[data-pick]");
    if (!button) return;
    event.preventDefault();
    choose(button.dataset.pick);
  });

  document.querySelector("#enq-vendor").addEventListener("change", attentions);
  document.querySelector("#enq-total").addEventListener("keydown", digitsOnly);
  document.querySelector("#enq-total").addEventListener("dblclick", () => { readLines(); total(); });
  document.querySelector("#enq-new").addEventListener("click", () => open("?new=1"));
  document.querySelector("#enq-save").addEventListener("click", () => save(saved));
  document.querySelector("#enq-modify").addEventListener("click", () => save(true));
  document.querySelector("#enq-delete").addEventListener("click", async () => {
    if (!saved || !data.note) return;
    if (!(await askYes("Are You Sure To Delete"))) return;
    const response = await fetch("/api/enquiry/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.note.id }) });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    apply(result, false);
    await showInfo("Record Deleted Successfully.");
  });
  document.querySelector("#enq-find").addEventListener("keydown", (event) => {
    if (event.key === "Enter") open(`?no=${encodeURIComponent(event.target.value.trim())}`);
  });
  document.querySelector(".enq .issue-search").addEventListener("click", (event) => {
    if (event.target.id === "enq-find") return;
    open(`?no=${encodeURIComponent(document.querySelector("#enq-find").value.trim())}`);
  });
  document.querySelector("#enq-first").addEventListener("click", () => data && data.ids[0] && open(`?id=${data.ids[0]}`));
  document.querySelector("#enq-last").addEventListener("click", () => data && data.ids.length && open(`?id=${data.ids[data.ids.length - 1]}`));
  document.querySelector("#enq-prev").addEventListener("click", () => {
    if (!data || !data.note) return;
    const place = data.ids.indexOf(data.note.id);
    if (place > 0) open(`?id=${data.ids[place - 1]}`);
  });
  document.querySelector("#enq-next").addEventListener("click", () => {
    if (!data || !data.note) return;
    const place = data.ids.indexOf(data.note.id);
    if (place >= 0 && place < data.ids.length - 1) open(`?id=${data.ids[place + 1]}`);
  });
  document.querySelector("#enq-close").addEventListener("click", () => window.closeEnq());
  document.querySelector("#enq .corres").addEventListener("click", () => {
    if (!saved || !data.note || !window.openCorres) return;
    window.openCorres({
      cat: "Enquiry",
      key: String(data.note.id),
      onChange: () => window.corresCaption("Enquiry", data.note.id).then((text) => {
        document.querySelector("#enq .corres").textContent = text;
      })
    });
  });

  window.openEnq = function openEnq() {
    panel.hidden = false;
    open("");
  };
  window.closeEnq = function closeEnq() {
    menu.hidden = true;
    panel.hidden = true;
    if (window.closeCorres) window.closeCorres();
  };
})();
