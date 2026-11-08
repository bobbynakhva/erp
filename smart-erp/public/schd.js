(() => {
  const panel = document.querySelector("#schd");
  const grid = document.querySelector("#schd-grid");
  const yearBox = document.querySelector("#schd-year");
  const monthBox = document.querySelector("#schd-month");
  const idBox = document.querySelector("#schd-id");
  const saveButton = document.querySelector("#schd-save");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let rows = [];
  let items = [];
  let ids = [];
  let nextId = 1;
  let saved = false;
  let days = 0;

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

  function daysInMonth(month, year) {
    if (month === 12) return 31;
    const start = Date.UTC(year, month - 1, 1);
    const next = Date.UTC(year, month, 1);
    return Math.round((next - start) / 86400000);
  }

  function blank() {
    return { code: "", target: "", days: Array(days).fill("") };
  }

  function numberAt(text) {
    const value = Number(String(text || "").trim());
    return Number.isFinite(value) ? value : 0;
  }

  function totalOf(row) {
    return row.days.reduce((sum, value) => sum + numberAt(value), 0);
  }

  function money(value) {
    return value ? value.toFixed(2) : "";
  }

  function escapeAttr(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function paint() {
    const month = Number(monthBox.value);
    const year = Number(yearBox.value);
    days = month && year ? daysInMonth(month, year) : 0;
    rows.forEach((row) => {
      while (row.days.length < days) row.days.push("");
      row.days.length = days;
    });
    const heads = ["Component Name", "Target Qty", ...Array.from({ length: days }, (_, index) => String(index + 1)), "Total Plan Qty"];
    const body = rows.map((row, index) => `<tr data-row="${index}">
      <td><input data-col="code" list="schd-items" value="${escapeAttr(row.code)}">${index === 0 ? `<datalist id="schd-items">${items.map((code) => `<option>${escapeAttr(code)}</option>`).join("")}</datalist>` : ""}</td>
      <td><input data-col="target" value="${escapeAttr(row.target)}"></td>
      ${row.days.map((value, day) => `<td><input data-col="day" data-day="${day}" value="${escapeAttr(value)}"></td>`).join("")}
      <td class="calc">${money(totalOf(row))}</td>
    </tr>`).join("");
    grid.innerHTML = days ? `<table><thead><tr>${heads.map((name) => `<th>${name}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${heads.length}">Click here to add an item</td></tr>`}</tbody></table>` : "";
    panel.classList.toggle("lock", document.querySelector("#schd-lock").checked);
    document.querySelector("#schd-delete").disabled = !saved;
    document.querySelector("#schd-modify").disabled = !saved;
    saveButton.textContent = saved ? "Modify" : "Save";
  }

  function readInputs() {
    grid.querySelectorAll("tr[data-row]").forEach((tr) => {
      const row = rows[Number(tr.dataset.row)];
      tr.querySelectorAll("input").forEach((box) => {
        if (box.dataset.col === "code") row.code = box.value;
        if (box.dataset.col === "target") row.target = box.value;
        if (box.dataset.col === "day") row.days[Number(box.dataset.day)] = box.value;
      });
    });
  }

  async function load(schId) {
    const query = `?year=${encodeURIComponent(yearBox.value || 0)}&month=${encodeURIComponent(monthBox.value || 0)}${schId ? `&schId=${encodeURIComponent(schId)}` : ""}`;
    const response = await fetch(`/api/schd${query}`);
    if (!response.ok) return null;
    return response.json();
  }

  function apply(data) {
    items = data.items || [];
    ids = data.ids || [];
    nextId = data.nextId || 1;
    if (!data.plan) {
      rows = [];
      idBox.value = String(nextId);
      saved = false;
      paint();
      return;
    }
    idBox.value = String(data.plan.schId);
    saved = true;
    rows = data.plan.lines.map((line) => ({
      code: line.code,
      target: line.target,
      days: (line.days || []).map((value) => value == null || Number(value) === 0 ? "" : String(value))
    }));
    paint();
  }

  function fillYears() {
    const now = new Date().getFullYear();
    yearBox.innerHTML = "";
    for (let year = 2000; year <= now + 3; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      if (year === now) option.selected = true;
      yearBox.appendChild(option);
    }
    monthBox.innerHTML = `<option value=""></option>${MONTHS.map((name, index) => `<option value="${index + 1}">${name}</option>`).join("")}`;
  }

  async function refresh() {
    if (!yearBox.value || !monthBox.value) {
      rows = [];
      days = 0;
      paint();
      return;
    }
    const data = await load(0);
    if (!data) return;
    if (!data.ids.length) {
      apply(data);
      return;
    }
    apply(data);
  }

  async function savePlan() {
    readInputs();
    const filled = rows.filter((row) => row.code.trim() || row.target.trim() || row.days.some((value) => String(value).trim()));
    if (!filled.length) {
      await showInfo("Please Enter the ItemName/Item details by clicking the grid heading...");
      return;
    }
    const seen = new Map();
    for (let index = 0; index < filled.length; index += 1) {
      const code = filled[index].code.trim();
      if (!code) {
        await showInfo("Enter Valid Component ");
        return;
      }
      if (!items.includes(code)) {
        await showInfo("Part No. does not exist ... Press F5 Key to Add New Items!!!");
        return;
      }
      if (seen.has(code)) {
        await showInfo(`Duplication of  Part No./ Items is not allowed. SEE ROWS: ${seen.get(code)} and  ${index + 1}`);
        return;
      }
      seen.set(code, index + 1);
      if (!(totalOf(filled[index]) > 0)) {
        await showInfo("Total Qty Should be greater than Zero");
        return;
      }
    }
    const verb = saveButton.textContent;
    if (!(await askYes(`Are You Sure To ${verb}?`))) return;
    const response = await fetch("/api/schd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schId: Number(idBox.value),
        year: Number(yearBox.value),
        month: Number(monthBox.value),
        lines: filled.map((row) => ({ code: row.code.trim(), target: row.target, days: row.days }))
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      await showInfo(body.error || "Please Enter the ItemName/Item details by clicking the grid heading...");
      return;
    }
    await showInfo("Record Saved Successfully!!!");
    const data = await load(Number(idBox.value));
    if (data) apply(data);
  }

  async function deletePlan() {
    if (!saved) return;
    if (!(await askYes("Are You sure to Delete this Record ?"))) return;
    const current = Number(idBox.value);
    const response = await fetch("/api/schd/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schId: current })
    });
    if (!response.ok) return;
    await showInfo("Records Deleted Successfully!!!");
    const data = await load(0);
    if (!data || !data.ids.length) {
      if (data) apply(data);
      await showInfo("No Records to Display...");
      return;
    }
    apply(data);
  }

  async function move(where) {
    if (!ids.length) {
      await showInfo("No Records to Display...");
      return;
    }
    const current = Number(idBox.value);
    let target = ids[0];
    if (where === "last") target = ids[ids.length - 1];
    if (where === "prev") {
      const earlier = ids.filter((id) => id < current);
      if (!earlier.length) {
        await showInfo("No Records to Display...");
        return;
      }
      target = earlier[earlier.length - 1];
    }
    if (where === "next") {
      const later = ids.find((id) => id > current);
      if (!later) {
        await showInfo("No Records to Display...");
        return;
      }
      target = later;
    }
    const data = await load(target);
    if (data) apply(data);
  }

  grid.addEventListener("click", (event) => {
    if (rows.length || !days || !event.target.closest("td")) return;
    rows.push(blank());
    paint();
    const input = grid.querySelector("input");
    if (input) input.focus();
  });

  grid.addEventListener("change", () => {
    readInputs();
    paint();
  });

  yearBox.addEventListener("change", () => { refresh(); });
  monthBox.addEventListener("change", () => { refresh(); });
  document.querySelector("#schd-lock").addEventListener("change", () => { panel.classList.toggle("lock", document.querySelector("#schd-lock").checked); });
  document.querySelector("#schd-new").addEventListener("click", () => {
    rows = [];
    idBox.value = String(nextId);
    saved = false;
    paint();
  });
  saveButton.addEventListener("click", () => { savePlan(); });
  document.querySelector("#schd-modify").addEventListener("click", () => { savePlan(); });
  document.querySelector("#schd-delete").addEventListener("click", () => { deletePlan(); });
  document.querySelector("#schd-print")?.addEventListener("click", async () => {
    if (!saved || !idBox.value || Number(idBox.value) <= 0) {
      await showInfo("You should save the Record First in order to take print...");
      return;
    }
    window.open(`/api/print?type=schd&id=${encodeURIComponent(idBox.value)}`, "_blank");
  });
  document.querySelector("#schd-first").addEventListener("click", () => { move("first"); });
  document.querySelector("#schd-prev").addEventListener("click", () => { move("prev"); });
  document.querySelector("#schd-next").addEventListener("click", () => { move("next"); });
  document.querySelector("#schd-last").addEventListener("click", () => { move("last"); });
  document.querySelector("#schd-close").addEventListener("click", () => { panel.hidden = true; });

  window.openSchd = async () => {
    panel.hidden = false;
    if (!yearBox.options.length) fillYears();
    await refresh();
  };
  window.closeSchd = () => { panel.hidden = true; };
})();
