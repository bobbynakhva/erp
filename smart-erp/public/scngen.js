(() => {
  const panel = document.querySelector("#scngen");
  const grid = document.querySelector("#scngen-grid");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
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

  function nowStamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  const menu = document.createElement("div");
  menu.className = "item-menu";
  menu.hidden = true;
  panel.appendChild(menu);

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

  function choose(code) {
    const index = menu.dataset.index;
    const item = itemByCode(code);
    menu.hidden = true;
    if (!item || index == null) return;
    readLines();
    lines[index].code = item.code;
    lines[index].name = item.name;
    paint();
    const qty = grid.querySelector(`[data-qty="${index}"]`);
    if (qty) qty.focus();
  }

  function paint() {
    menu.hidden = true;
    grid.innerHTML = `<table><thead><tr>
      <th>Sl.No</th><th>Item Code / Part No./ Drg. No.</th><th>Item/Component Name</th><th>Qty</th><th>Remarks</th>
    </tr></thead><tbody>${lines.map((line, index) => `<tr>
      <td>${index + 1}</td>
      <td><div class="item-pick"><input data-code="${index}" value="${esc(itemLabel(line.code))}" autocomplete="off"><button type="button" class="item-open" data-open="${index}" tabindex="-1">&#9662;</button></div></td>
      <td><input data-name="${index}" value="${esc(line.name)}"></td>
      <td><input data-qty="${index}" value="${esc(line.qty)}"></td>
      <td><input data-rem="${index}" value="${esc(line.remark)}"></td>
    </tr>`).join("")}</tbody></table>`;
    const current = lines.find((line) => line.code);
    const item = current && (data.items || []).find((row) => row.code === current.code);
    document.querySelector("#scngen-meta").textContent = item ? `ITEM : ${item.name}    UOM :  ${item.unit}` : "";
  }

  function readLines() {
    lines.forEach((line, index) => {
      const code = grid.querySelector(`[data-code="${index}"]`);
      const name = grid.querySelector(`[data-name="${index}"]`);
      const qty = grid.querySelector(`[data-qty="${index}"]`);
      const remark = grid.querySelector(`[data-rem="${index}"]`);
      if (code) {
        const item = findTyped(code.value);
        line.code = item ? item.code : code.value.trim();
        if (item) line.name = item.name;
        else if (name) line.name = name.value;
      } else if (name) line.name = name.value;
      if (qty) line.qty = qty.value;
      if (remark) line.remark = remark.value;
    });
  }

  function fillLists() {
    document.querySelector("#scngen-store").innerHTML = `<option value=""></option>${data.stores.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
    const costs = data.note ? data.costs : data.costs.filter((row) => !row.closed);
    document.querySelector("#scngen-cost").innerHTML = `<option value="0"></option>${costs.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
  }

  function apply(next, blank) {
    data = next;
    saved = Boolean(next.note) && !blank;
    fillLists();
    const note = blank ? null : next.note;
    document.querySelector("#scngen-no").value = note ? note.no : next.nextNo;
    document.querySelector("#scngen-date").value = note && note.date ? note.date : nowStamp();
    document.querySelector("#scngen-by").value = note ? note.by.trim() : "";
    document.querySelector("#scngen-remark").value = note ? note.remark.trim() : "";
    document.querySelector("#scngen-store").value = note ? String(note.storeId || "") : "";
    document.querySelector("#scngen-cost").value = note ? String(note.costId || 0) : "0";
    lines = note ? note.lines.map((line) => ({ ...line })) : [];
    document.querySelector("#scngen-modify").disabled = !saved;
    document.querySelector("#scngen-delete").disabled = !saved;
    paint();
  }

  async function load(query) {
    const response = await fetch(`/api/scngen${query || ""}`);
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
    return {
      id: saved && data.note ? data.note.id : 0,
      no: document.querySelector("#scngen-no").value,
      date: document.querySelector("#scngen-date").value,
      by: document.querySelector("#scngen-by").value,
      remark: document.querySelector("#scngen-remark").value,
      storeId: Number(document.querySelector("#scngen-store").value),
      costId: Number(document.querySelector("#scngen-cost").value),
      lines
    };
  }

  function check(body) {
    if (!String(body.no || "").trim()) return "Enter the SCN Number ";
    if (!body.storeId) return "Please Select a Store from the list";
    if (body.costId && !(data.costs || []).some((row) => row.id === body.costId)) return "Please select an existing Costcenter....";
    if (!body.lines.length) return "Please Enter the ItemName/Item details by clicking the grid heading...";
    const seen = new Map();
    for (let index = 0; index < body.lines.length; index += 1) {
      const code = String(body.lines[index].code || "").trim();
      if (!code) continue;
      const sl = index + 1;
      if (seen.has(code)) return `Duplication of  Part No./ Items is not allowed. SEE ROWS: ${seen.get(code)} and  ${sl}`;
      seen.set(code, sl);
    }
    for (let index = 0; index < body.lines.length; index += 1) {
      const line = body.lines[index];
      const sl = index + 1;
      const code = String(line.code || "").trim();
      const name = String(line.name || "").trim();
      if (!code) return "Enter Part No. for the SlNo. ";
      const item = (data.items || []).find((row) => row.code === code);
      if (!item) return "Part No. does not exist ... ";
      if (!name) return `Enter a Item/Component Name for the SlNo.${sl}`;
      if (item.name !== name) {
        const named = (data.items || []).some((row) => row.name === name);
        return named ? "Part No. differs for this Item ... " : "Item/Component Name does not exist ... ";
      }
      if (!(Number(line.qty) > 0)) return "Enter the Valid Qty  ";
    }
    return "";
  }

  async function save(modify) {
    const body = payload();
    const problem = check(body);
    if (problem) return showInfo(problem);
    if (!(await askYes(modify ? "Are You Sure To Modify?" : "Are You Sure To Save?"))) return;
    const response = await fetch("/api/scngen/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, modify })
    });
    const savedBody = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(savedBody.error || "Enter the SCN Number ");
    await showInfo(modify ? "Record Modified." : "Record Saved");
    await open(`?id=${savedBody.id}`);
  }

  menu.addEventListener("mousedown", (event) => {
    const button = event.target.closest("[data-pick]");
    if (!button) return;
    event.preventDefault();
    choose(button.dataset.pick);
  });
  grid.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open]");
    if (opener) {
      const input = grid.querySelector(`[data-code="${opener.dataset.open}"]`);
      if (input) {
        input.focus();
        showMenu(input, "");
      }
      return;
    }
    if (event.target.tagName !== "TH" || lines.length) return;
    lines.push({ code: "", name: "", qty: "", remark: "" });
    paint();
    const input = grid.querySelector('[data-code="0"]');
    if (input) input.focus();
  });
  grid.addEventListener("focusin", (event) => {
    if (event.target.dataset.code == null) return;
    event.target.select();
    showMenu(event.target, "");
  });
  grid.addEventListener("input", (event) => {
    if (event.target.dataset.code == null) return;
    showMenu(event.target, event.target.value);
  });
  grid.addEventListener("focusout", (event) => {
    const input = event.target;
    if (input.dataset.code == null) return;
    const index = input.dataset.code;
    const typed = input.value;
    setTimeout(() => {
      if (!menu.hidden && menu.dataset.index === index && document.activeElement && menu.contains(document.activeElement)) return;
      menu.hidden = true;
      if (!input.isConnected) return;
      const item = findTyped(typed);
      if (item) {
        lines[index].code = item.code;
        lines[index].name = item.name;
        input.value = itemLabel(item.code);
        const name = grid.querySelector(`[data-name="${index}"]`);
        if (name) name.value = item.name;
      } else if (!String(typed).trim()) {
        lines[index].code = "";
        lines[index].name = "";
        const name = grid.querySelector(`[data-name="${index}"]`);
        if (name) name.value = "";
      } else {
        input.value = itemLabel(lines[index].code);
      }
    }, 0);
  });
  grid.addEventListener("keydown", (event) => {
    const input = event.target.dataset && event.target.dataset.code != null ? event.target : null;
    if (input) {
      const buttons = [...menu.querySelectorAll("[data-pick]")];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (menu.hidden || !buttons.length) {
          showMenu(input, input.value);
          return;
        }
        const step = event.key === "ArrowDown" ? 1 : -1;
        let active = Number(menu.dataset.active || 0) + step;
        if (active < 0) active = buttons.length - 1;
        if (active >= buttons.length) active = 0;
        menu.dataset.active = String(active);
        buttons.forEach((button, index) => button.classList.toggle("on", index === active));
        buttons[active].scrollIntoView({ block: "nearest" });
        return;
      }
      if (event.key === "Enter" && !menu.hidden && buttons.length) {
        event.preventDefault();
        choose(buttons[Number(menu.dataset.active || 0)].dataset.pick);
        return;
      }
      if (event.key === "Escape") menu.hidden = true;
      return;
    }
    if (event.key !== "ArrowDown") return;
    const index = Number(event.target.dataset.name ?? event.target.dataset.qty ?? event.target.dataset.rem);
    if (index !== lines.length - 1) return;
    readLines();
    lines.push({ code: "", name: "", qty: "", remark: "" });
    paint();
  });
  document.querySelector("#scngen-new").addEventListener("click", () => open("?new=1"));
  document.querySelector("#scngen-save").addEventListener("click", () => save(false));
  document.querySelector("#scngen-modify").addEventListener("click", () => save(true));
  document.querySelector("#scngen-print")?.addEventListener("click", () => {
    if (!saved || !data || !data.note) {
      alert("Please select or save a Store Credit Note first.");
      return;
    }
    window.open(`/api/print?type=scngen&id=${data.note.id}`, "_blank");
  });
  document.querySelector("#scngen-delete").addEventListener("click", async () => {
    if (!saved || !data.note) return;
    if (!(await askYes("Are You Sure To Delete"))) return;
    const response = await fetch("/api/scngen/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.note.id })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(body.error || "Are You Sure To Delete");
    await showInfo("Record Deleted Successfully.");
    await open("");
  });
  document.querySelector("#scngen-find").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    open(`?no=${encodeURIComponent(event.target.value)}`);
  });
  document.querySelector("#scngen-first").addEventListener("click", () => data.ids[0] && open(`?id=${data.ids[0]}`));
  document.querySelector("#scngen-last").addEventListener("click", () => data.ids.length && open(`?id=${data.ids[data.ids.length - 1]}`));
  document.querySelector("#scngen-prev").addEventListener("click", () => {
    if (!data.note) return;
    const index = data.ids.indexOf(data.note.id);
    if (index > 0) open(`?id=${data.ids[index - 1]}`);
  });
  document.querySelector("#scngen-next").addEventListener("click", () => {
    if (!data.note) return;
    const index = data.ids.indexOf(data.note.id);
    if (index >= 0 && index < data.ids.length - 1) open(`?id=${data.ids[index + 1]}`);
  });
  document.querySelector("#scngen-close").addEventListener("click", () => { panel.hidden = true; });

  window.openScnGen = () => {
    panel.hidden = false;
    open("");
  };
  window.closeScnGen = () => { panel.hidden = true; };
})();
