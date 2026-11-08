(() => {
  const panel = document.querySelector("#issue");
  const grid = document.querySelector("#issue-grid");
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

  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function stockOf(code) {
    const item = (data.items || []).find((row) => row.code === code);
    const storeId = Number(document.querySelector("#issue-store").value);
    if (!item || !storeId) return 0;
    const row = (data.stock || []).find((entry) => entry.itemId === item.id && entry.storeId === storeId);
    return row ? row.qty : 0;
  }

  function paint() {
    grid.innerHTML = `<table><thead><tr>
      <th>Sl.No</th><th>Item Code / Part No./ Drg. No.</th><th>Item/Component Name</th><th>Qty</th><th>Remarks</th><th>Stk.Qty</th>
    </tr></thead><tbody>${lines.map((line, index) => `<tr>
      <td>${index + 1}</td>
      <td><input data-code="${index}" value="${line.code}"></td>
      <td><input data-name="${index}" value="${line.name}"></td>
      <td><input data-qty="${index}" value="${line.qty}"></td>
      <td><input data-rem="${index}" value="${line.remark}"></td>
      <td>${stockOf(line.code).toFixed(2)}</td>
    </tr>`).join("")}</tbody></table>`;
    const current = lines.find((line) => line.code);
    const item = current && (data.items || []).find((row) => row.code === current.code);
    document.querySelector("#issue-meta").textContent = item ? `ITEM : ${item.name}    UOM :  ${item.unit}` : "";
  }

  function readLines() {
    lines.forEach((line, index) => {
      const code = grid.querySelector(`[data-code="${index}"]`);
      const name = grid.querySelector(`[data-name="${index}"]`);
      const qty = grid.querySelector(`[data-qty="${index}"]`);
      const remark = grid.querySelector(`[data-rem="${index}"]`);
      if (code) line.code = code.value;
      if (name) line.name = name.value;
      if (qty) line.qty = qty.value;
      if (remark) line.remark = remark.value;
    });
  }

  function fillLists() {
    document.querySelector("#issue-store").innerHTML = `<option value=""></option>${data.stores.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
    const costs = data.note ? data.costs : data.costs.filter((row) => !row.closed);
    document.querySelector("#issue-cost").innerHTML = `<option value="0"></option>${costs.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
    document.querySelector("#issue-whom-list").innerHTML = data.whom.map((name) => `<option value="${name}"></option>`).join("");
  }

  function apply(next, blank) {
    data = next;
    saved = Boolean(next.note) && !blank;
    fillLists();
    const note = blank ? null : next.note;
    document.querySelector("#issue-no").value = note ? note.no : next.nextNo;
    document.querySelector("#issue-date").value = note && note.date ? String(note.date).slice(0, 10) : today();
    document.querySelector("#issue-whom").value = note ? note.whom.trim() : "";
    document.querySelector("#issue-remark").value = note ? note.remark.trim() : "";
    document.querySelector("#issue-store").value = note ? String(note.storeId || "") : "";
    document.querySelector("#issue-cost").value = note ? String(note.costId || 0) : "0";
    lines = note ? note.lines.map((line) => ({ ...line })) : [];
    document.querySelector("#issue-modify").disabled = !saved;
    document.querySelector("#issue-delete").disabled = !saved;
    paint();
  }

  async function load(query) {
    const response = await fetch(`/api/issue${query || ""}`);
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
      no: document.querySelector("#issue-no").value,
      date: document.querySelector("#issue-date").value,
      whom: document.querySelector("#issue-whom").value,
      remark: document.querySelector("#issue-remark").value,
      storeId: Number(document.querySelector("#issue-store").value),
      costId: Number(document.querySelector("#issue-cost").value),
      lines
    };
  }

  function check(body) {
    if (!String(body.no || "").trim()) return "Enter the ISSUE Number...";
    if (!body.storeId) return "Please Select a Store from the list";
    if (!body.lines.length) return "Please Enter the ItemName/Item details by clicking the grid heading...";
    const seen = new Map();
    for (let index = 0; index < body.lines.length; index += 1) {
      const line = body.lines[index];
      const sl = index + 1;
      const code = String(line.code || "").trim();
      const name = String(line.name || "").trim();
      if (!code) return "Enter ItemCode/Part No. for the SlNo. ";
      const item = (data.items || []).find((row) => row.code === code);
      if (!item) return "Part No. does not exist ... ";
      if (!name) return `Enter a Item/Component Name for the SlNo.${sl}`;
      if (item.name !== name) {
        const named = (data.items || []).some((row) => row.name === name);
        return named ? "Part No. differs for this Item ... " : "Item/Component Name does not exist ... ";
      }
      if (!(Number(line.qty) > 0)) return "Enter the Valid Qty  ";
      if (Number(line.qty) > stockOf(code)) return { error: `Qty should not Exceed the Stock Qty for the SlNo.${sl}`, sl, stock: stockOf(code) };
      if (seen.has(code)) return `Duplication of  Part No./ Items is not allowed. SEE ROWS: ${seen.get(code)} and  ${sl}`;
      seen.set(code, sl);
    }
    return "";
  }

  async function save(modify) {
    const body = payload();
    const problem = check(body);
    if (problem) {
      if (problem.sl) {
        const qty = grid.querySelector(`[data-qty="${problem.sl - 1}"]`);
        if (qty) qty.value = Number(problem.stock).toFixed(2);
        return showInfo(problem.error);
      }
      return showInfo(problem);
    }
    if (!(await askYes(modify ? "Are You Sure To Modify ?" : "Are You Sure To Save?"))) return;
    const response = await fetch("/api/issue/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const savedBody = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(savedBody.error || "Enter the ISSUE Number...");
    await showInfo(modify ? "Record Modified ." : "Record Saved");
    await open(`?id=${savedBody.id}`);
  }

  grid.addEventListener("click", (event) => {
    if (event.target.tagName !== "TH" || lines.length) return;
    lines.push({ code: "", name: "", qty: "", remark: "" });
    paint();
  });

  grid.addEventListener("change", (event) => {
    const code = event.target.dataset.code;
    if (code == null) return;
    readLines();
    const item = (data.items || []).find((row) => row.code === lines[code].code);
    if (item && !lines[code].name) lines[code].name = item.name;
    paint();
    const box = grid.querySelector(`[data-code="${code}"]`);
    if (box) {
      box.focus();
      const end = box.value.length;
      box.setSelectionRange(end, end);
    }
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    const index = Number(event.target.dataset.code ?? event.target.dataset.name ?? event.target.dataset.qty ?? event.target.dataset.rem);
    if (index !== lines.length - 1) return;
    readLines();
    lines.push({ code: "", name: "", qty: "", remark: "" });
    paint();
  });

  document.querySelector("#issue-store").addEventListener("change", () => paint());
  document.querySelector("#issue-new").addEventListener("click", () => open("?new=1"));
  document.querySelector("#issue-save").addEventListener("click", () => save(false));
  document.querySelector("#issue-modify").addEventListener("click", () => save(true));
  document.querySelector("#issue-delete").addEventListener("click", async () => {
    if (!saved || !data.note) return;
    if (!(await askYes("Are You Sure To Delete"))) return;
    const response = await fetch("/api/issue/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.note.id })
    });
    if (!response.ok) return;
    await showInfo("Record Deleted Successfully.");
    await open("");
  });
  document.querySelector("#issue-find").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    open(`?no=${encodeURIComponent(event.target.value)}`);
  });
  document.querySelector("#issue-first").addEventListener("click", () => data.ids[0] && open(`?id=${data.ids[0]}`));
  document.querySelector("#issue-last").addEventListener("click", () => data.ids.length && open(`?id=${data.ids[data.ids.length - 1]}`));
  document.querySelector("#issue-prev").addEventListener("click", () => {
    if (!data.note) return;
    const index = data.ids.indexOf(data.note.id);
    if (index > 0) open(`?id=${data.ids[index - 1]}`);
  });
  document.querySelector("#issue-next").addEventListener("click", () => {
    if (!data.note) return;
    const index = data.ids.indexOf(data.note.id);
    if (index >= 0 && index < data.ids.length - 1) open(`?id=${data.ids[index + 1]}`);
  });
  document.querySelector("#issue-print").addEventListener("click", async () => {
    if (!data || !data.note || !data.note.id) {
      await showInfo("No data to Print...");
      return;
    }
    window.open(`/api/print?type=material-issue&id=${data.note.id}`, "_blank");
  });
  document.querySelector("#issue-close").addEventListener("click", () => { panel.hidden = true; });

  window.openIssue = () => {
    panel.hidden = false;
    open("");
  };
  window.closeIssue = () => { panel.hidden = true; };
})();
