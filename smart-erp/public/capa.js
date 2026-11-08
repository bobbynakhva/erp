(() => {
  const panel = document.querySelector("#capa");
  const grid = document.querySelector("#capa-grid");
  const idBox = document.querySelector("#capa-id");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const HEADS = ["Start Date", "End Date", "Planned No of Days", "Item Code", "Qty Scheduled", "Qty /Day", "Process Name", "Pcs /Day", "No of M/c", "Difference", "Extra M/c No of days"];
  const MARKS = ["(A)", "(B)", "(C)=(B)-(A)", "(D)", "(E)", "(F)=(E)/(C)", "(G)", "(H)", "(I)=(F)/(H)", "(J)=(E)-[(I)*(H)*(E)]", "(K)=(J)/(H)"];
  const EDIT = [0, 1, 3, 4, 6, 7];
  let rows = [];
  let ids = [];
  let items = [];
  let processes = [];
  let nextId = 1;
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

  function blank() {
    return ["", "", "", "", "", "", "", "", "", "", ""];
  }

  function parseDate(text) {
    const match = String(text || "").trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function inclusiveDays(start, end) {
    const ms = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    return Math.round(ms / 86400000) + 1;
  }

  function roundTo(value, digits) {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function numText(value, digits) {
    if (!Number.isFinite(value)) return "";
    const rounded = roundTo(value, digits);
    return String(rounded);
  }

  function numberAt(text) {
    const value = Number(String(text || "").trim());
    return Number.isFinite(value) ? value : 0;
  }

  function nearest(index, col, accept) {
    for (let i = index; i >= 0; i -= 1) {
      if (accept(rows[i][col])) return rows[i][col];
    }
    return "";
  }

  function recalc(index) {
    const row = rows[index];
    const start = parseDate(row[0]);
    const end = parseDate(row[1]);
    if (start && end) row[2] = String(inclusiveDays(start, end));
    const daysText = nearest(index, 2, (text) => numberAt(text) > 0);
    const days = numberAt(daysText);
    const qtyText = String(row[4] || "").trim();
    if (qtyText !== "" && days > 0) row[5] = numText(numberAt(qtyText) / days, 4);
    const pcs = numberAt(row[7]);
    const qtyDayText = nearest(index, 5, (text) => numberAt(text) !== 0);
    const qtyDay = numberAt(qtyDayText);
    if (pcs > 0 && qtyDay !== 0) row[8] = numText(qtyDay / pcs, 0);
    const schedText = nearest(index, 4, (text) => numberAt(text) !== 0);
    const machines = numberAt(row[8]);
    if (pcs > 0 && machines !== 0 && days > 0 && String(schedText).trim() !== "") {
      const difference = numberAt(schedText) - (machines * pcs * days);
      row[9] = numText(difference, 0);
      row[10] = numText(numberAt(row[9]) / pcs, 0);
    }
  }

  function paint() {
    const head = `<tr>${HEADS.map((name) => `<th>${name}</th>`).join("")}</tr><tr>${MARKS.map((name) => `<th>${name}</th>`).join("")}</tr>`;
    const body = rows.map((row, index) => `<tr data-row="${index}">${row.map((cell, col) => {
      if (!EDIT.includes(col)) return `<td class="calc">${cell}</td>`;
      if (col === 3) {
        const options = items.map((code) => `<option>${code}</option>`).join("");
        return `<td><input list="capa-items" data-col="${col}" value="${escapeAttr(cell)}">${index === 0 ? `<datalist id="capa-items">${options}</datalist>` : ""}</td>`;
      }
      if (col === 6) {
        const options = processes.map((name) => `<option>${escapeAttr(name)}</option>`).join("");
        return `<td><select data-col="${col}"><option value=""></option>${options}</select></td>`;
      }
      return `<td><input data-col="${col}" value="${escapeAttr(cell)}"></td>`;
    }).join("")}</tr>`).join("");
    grid.innerHTML = `<table><thead>${head}</thead><tbody>${body || `<tr><td colspan="11">Click here to start a row</td></tr>`}</tbody></table>`;
    rows.forEach((row, index) => {
      const select = grid.querySelector(`tr[data-row="${index}"] select`);
      if (select) select.value = row[6] || "";
    });
    document.querySelector("#capa-delete").disabled = !saved;
    document.querySelector("#capa-modify").disabled = !saved;
  }

  function escapeAttr(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function readInputs() {
    grid.querySelectorAll("tr[data-row]").forEach((tr) => {
      const index = Number(tr.dataset.row);
      tr.querySelectorAll("[data-col]").forEach((box) => {
        rows[index][Number(box.dataset.col)] = box.value;
      });
    });
  }

  function rowEmpty(row) {
    return EDIT.every((col) => String(row[col] || "").trim() === "");
  }

  async function checkRow(index) {
    const row = rows[index];
    if (rowEmpty(row)) return true;
    const start = String(row[0] || "").trim();
    const end = String(row[1] || "").trim();
    if ((start || end) && (!parseDate(start) || !parseDate(end))) {
      await showInfo("FromDate or ToDate is not a valid Date");
      return false;
    }
    const item = String(row[3] || "").trim();
    if (item && !items.includes(item)) {
      await showInfo("Item Does not exist");
      return false;
    }
    const qty = String(row[4] || "").trim();
    if (qty === "" || numberAt(qty) === 0) {
      await showInfo("Scheduled Qty not specified");
      return false;
    }
    const processName = String(row[6] || "").trim();
    if (processName && !processes.includes(processName)) {
      await showInfo("Process Does not exist");
      return false;
    }
    return true;
  }

  async function loadCatalog(planId) {
    const query = planId ? `?planId=${encodeURIComponent(planId)}` : "";
    const response = await fetch(`/api/capa${query}`);
    if (!response.ok) return null;
    return response.json();
  }

  function applyPlan(data, plan) {
    ids = data.ids || [];
    items = data.items || [];
    processes = data.processes || [];
    nextId = data.nextId || 1;
    if (!plan) {
      rows = [];
      idBox.value = "";
      saved = false;
      paint();
      return;
    }
    idBox.value = String(plan.planId);
    saved = ids.includes(Number(plan.planId));
    rows = String(plan.details || "").split("\r").filter((line) => line !== "").map((line) => {
      const cells = line.split("\t");
      while (cells.length < 11) cells.push("");
      return cells.slice(0, 11);
    });
    paint();
  }

  async function openAt(planId) {
    const data = await loadCatalog(planId);
    if (!data) return;
    applyPlan(data, data.plan);
  }

  function startNew() {
    rows = [];
    idBox.value = String(nextId);
    saved = false;
    paint();
  }

  function addFirstRow() {
    if (rows.length) return;
    rows.push(blank());
    paint();
    const input = grid.querySelector("input");
    if (input) input.focus();
  }

  async function savePlan() {
    readInputs();
    const filled = rows.filter((row) => !rowEmpty(row));
    if (!filled.length) {
      await showInfo("Production Capacity not Planned ");
      return;
    }
    for (let index = 0; index < rows.length; index += 1) {
      if (rowEmpty(rows[index])) continue;
      recalc(index);
      if (!(await checkRow(index))) return;
      const row = rows[index];
      if (!parseDate(row[0]) || !parseDate(row[1]) || !items.includes(String(row[3]).trim()) || !processes.includes(String(row[6]).trim()) || numberAt(row[7]) <= 0) {
        await showInfo(`Invalid Row Found @ Row ${index + 2}`);
        return;
      }
    }
    paint();
    if (!(await askYes("Are You Sure To Save?"))) return;
    const details = filled.map((row) => row.join("\t")).join("\r");
    const response = await fetch("/api/capa/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: Number(idBox.value), flexRows: filled.length + 2, details })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      await showInfo(body.error || "Production Capacity not Planned ");
      return;
    }
    await showInfo("Records Stored Successfully");
    await openAt(Number(idBox.value));
  }

  async function deletePlan() {
    if (!saved) return;
    if (!(await askYes("Are You Sure To Delete ?"))) return;
    const current = Number(idBox.value);
    const response = await fetch("/api/capa/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: current })
    });
    if (!response.ok) return;
    await showInfo("Records Deleted Successfully");
    const data = await loadCatalog(0);
    if (!data) return;
    const rest = (data.ids || []).filter((id) => id !== current);
    if (!rest.length) {
      applyPlan(data, null);
      await showInfo("No Records to Display");
      startNew();
      return;
    }
    const next = rest.find((id) => id > current) || rest[rest.length - 1];
    await openAt(next);
  }

  async function move(where) {
    if (!ids.length) {
      await showInfo("No Records to Display");
      return;
    }
    const current = Number(idBox.value);
    let target = ids[0];
    if (where === "last") target = ids[ids.length - 1];
    if (where === "prev") {
      const earlier = ids.filter((id) => id < current);
      if (!earlier.length) {
        await showInfo("No Records to Display");
        return;
      }
      target = earlier[earlier.length - 1];
    }
    if (where === "next") {
      const later = ids.find((id) => id > current);
      if (!later) {
        await showInfo("No Records to Display");
        return;
      }
      target = later;
    }
    await openAt(target);
  }

  grid.addEventListener("click", (event) => {
    if (!rows.length && event.target.closest("td")) addFirstRow();
  });

  grid.addEventListener("change", async (event) => {
    const box = event.target.closest("[data-col]");
    if (!box) return;
    readInputs();
    const index = Number(box.closest("tr").dataset.row);
    const col = Number(box.dataset.col);
    if (col === 0 || col === 1) {
      const start = String(rows[index][0] || "").trim();
      const end = String(rows[index][1] || "").trim();
      if ((start || end) && start && end && (!parseDate(start) || !parseDate(end))) {
        await showInfo("FromDate or ToDate is not a valid Date");
      }
    }
    if (col === 3 && String(rows[index][3]).trim() && !items.includes(String(rows[index][3]).trim())) {
      await showInfo("Item Does not exist");
    }
    if (col === 6 && String(rows[index][6]).trim() && !processes.includes(String(rows[index][6]).trim())) {
      await showInfo("Process Does not exist");
    }
    recalc(index);
    paint();
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    const box = event.target.closest("[data-col]");
    if (!box) return;
    readInputs();
    const index = Number(box.closest("tr").dataset.row);
    if (index !== rows.length - 1) return;
    const row = rows[index];
    if (![0, 1, 3, 4].every((col) => String(row[col] || "").trim() !== "")) return;
    event.preventDefault();
    rows.push(blank());
    paint();
  });

  document.querySelector("#capa-new").addEventListener("click", startNew);
  document.querySelector("#capa-save").addEventListener("click", () => { savePlan(); });
  document.querySelector("#capa-modify").addEventListener("click", () => { savePlan(); });
  document.querySelector("#capa-delete").addEventListener("click", () => { deletePlan(); });
  document.querySelector("#capa-first").addEventListener("click", () => { move("first"); });
  document.querySelector("#capa-prev").addEventListener("click", () => { move("prev"); });
  document.querySelector("#capa-next").addEventListener("click", () => { move("next"); });
  document.querySelector("#capa-last").addEventListener("click", () => { move("last"); });
  document.querySelector("#capa-close").addEventListener("click", () => { panel.hidden = true; });

  window.openCapa = async () => {
    panel.hidden = false;
    const data = await loadCatalog(0);
    if (!data) return;
    if (!data.ids.length) {
      applyPlan(data, null);
      await showInfo("No Records to Display");
      startNew();
      return;
    }
    await openAt(data.ids[data.ids.length - 1]);
  };
  window.closeCapa = () => { panel.hidden = true; };
})();
