(() => {
  const panel = document.querySelector("#prodn");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const shifts = {
    A: ["06:00", "14:00"],
    B: ["14:00", "22:00"],
    C: ["22:00", "06:00"],
    D: ["08:00", "20:00"],
    N: ["20:00", "08:00"]
  };
  let lists = { machines: [], staff: [], customers: [], items: [], categories: [], stops: [] };
  let mode = "view";
  let slno = 0;
  let calcToken = 0;

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
      function finish(answer) {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        ask.hidden = true;
        resolve(answer);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      yes.focus();
    });
  }

  function localDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function field(id) { return document.querySelector(id); }
  function digits(event) {
    const key = event.key;
    if (key.length === 1 && !(key >= "0" && key <= "9") && !(key === "." && !event.target.value.includes("."))) {
      event.preventDefault();
    }
  }

  function paintStops() {
    const body = document.querySelector("#prodn-stops");
    body.replaceChildren();
    lists.stops.forEach((row) => {
      const tr = document.createElement("tr");
      const sl = document.createElement("td");
      sl.textContent = row.slno;
      const type = document.createElement("td");
      type.textContent = row.type;
      const minutes = document.createElement("td");
      const input = document.createElement("input");
      input.value = row.minutes;
      input.addEventListener("keydown", digits);
      input.addEventListener("input", () => {
        row.minutes = input.value;
        refresh();
      });
      minutes.append(input);
      tr.append(sl, type, minutes);
      body.append(tr);
    });
  }

  function paintLists() {
    const categories = document.querySelector("#prodn-categories");
    categories.replaceChildren();
    lists.categories.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      categories.append(option);
    });
  }

  function buttons() {
    const adding = mode === "new";
    field("#prodn-new").disabled = adding;
    field("#prodn-save").disabled = !adding;
    field("#prodn-modify").disabled = adding || !slno;
    field("#prodn-delete").disabled = adding || !slno;
  }

  function showFigures(data) {
    field("#prodn-hours").textContent = data.hoursLabel || "Hour(s)";
    field("#prodn-cycle").textContent = data.cycleLabel || "Cycle Time in Minutes: -NA-";
    field("#prodn-full").value = data.full || "";
    field("#prodn-targ").value = data.targ || "";
    field("#prodn-work").textContent = "Efficiency for Total Available Hours: " + (data.work || "%");
    field("#prodn-bonus").textContent = "Bonus Efficiency based on Idle Hrs.: " + (data.bonus || "%");
  }

  async function refresh() {
    const token = ++calcToken;
    const response = await fetch("/api/prodn/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload())
    });
    if (!response.ok || token !== calcToken) return;
    showFigures(await response.json());
  }

  function payload() {
    return {
      mode: mode === "new" ? "save" : "modify",
      slno,
      date: field("#prodn-date").value,
      from: field("#prodn-from").value,
      to: field("#prodn-to").value,
      machine: field("#prodn-machine").value,
      operator: field("#prodn-operator").value,
      customer: field("#prodn-customer").value,
      item: field("#prodn-item").value,
      qty: field("#prodn-qty").value,
      rej: field("#prodn-rej").value,
      idle: field("#prodn-idle").value,
      reason: field("#prodn-reason").value,
      category: field("#prodn-category").value,
      remarks: field("#prodn-remarks").value,
      stops: lists.stops.map((row) => ({ slno: row.slno, minutes: row.minutes, perc: row.perc }))
    };
  }

  function applyRecord(data) {
    lists = {
      machines: data.machines || lists.machines,
      staff: data.staff || lists.staff,
      customers: data.customers || lists.customers,
      items: data.items || lists.items,
      categories: data.categories || lists.categories,
      stops: (data.stops || lists.stops).map((row) => ({
        slno: row.slno,
        type: row.type,
        perc: row.perc,
        minutes: data.minutes && data.minutes[row.slno] != null ? String(data.minutes[row.slno]) : (row.minutes || "")
      }))
    };
    if (data.date) field("#prodn-date").value = String(data.date).slice(0, 10);
    if (data.from) field("#prodn-from").value = data.from;
    if (data.to) field("#prodn-to").value = data.to;
    field("#prodn-machine").value = data.machine || "";
    field("#prodn-operator").value = data.operator || "";
    field("#prodn-customer").value = data.customer || "";
    field("#prodn-item").value = data.item || "";
    field("#prodn-qty").value = data.qty || "";
    field("#prodn-rej").value = data.rej || "";
    field("#prodn-idle").value = data.idle || "";
    field("#prodn-reason").value = data.reason || "";
    field("#prodn-category").value = data.category || "";
    field("#prodn-remarks").value = data.remarks || "";
    slno = data.slno || 0;
    mode = data.mode || "view";
    paintLists();
    paintStops();
    buttons();
    if (data.work || data.full || data.cycleLabel) showFigures(data);
    else refresh();
  }

  function blankNew(dateValue) {
    mode = "new";
    slno = 0;
    field("#prodn-machine").value = "";
    field("#prodn-operator").value = "";
    field("#prodn-customer").value = "";
    field("#prodn-item").value = "";
    field("#prodn-qty").value = "";
    field("#prodn-rej").value = "";
    field("#prodn-idle").value = "";
    field("#prodn-reason").value = "";
    field("#prodn-category").value = "";
    field("#prodn-remarks").value = "";
    lists.stops.forEach((row) => { row.minutes = ""; });
    if (dateValue) field("#prodn-date").value = dateValue;
    paintStops();
    buttons();
    refresh();
  }

  function bindPick(input, names) {
    input.addEventListener("focus", () => showPick(input, names));
  }

  function showPick(input, names) {
    const box = document.querySelector("#prodn-pick");
    box.replaceChildren();
    names.forEach((name) => {
      const row = document.createElement("div");
      row.textContent = name;
      row.addEventListener("mousedown", (event) => {
        event.preventDefault();
        input.value = name;
        box.hidden = true;
        refresh();
      });
      box.append(row);
    });
    box.hidden = !names.length;
    const rect = input.getBoundingClientRect();
    const parent = panel.getBoundingClientRect();
    box.style.left = (rect.left - parent.left) + "px";
    box.style.top = (rect.bottom - parent.top) + "px";
    box.style.width = rect.width + "px";
  }

  document.querySelectorAll("#prodn-shift").forEach(() => {});
  document.querySelectorAll("input[name='prodn-shift']").forEach((radio) => {
    radio.addEventListener("change", () => {
      const pair = shifts[radio.value];
      if (!pair) return;
      field("#prodn-from").value = pair[0];
      field("#prodn-to").value = pair[1];
      refresh();
    });
  });
  ["#prodn-from", "#prodn-to", "#prodn-qty", "#prodn-rej", "#prodn-idle", "#prodn-item"].forEach((id) => {
    field(id).addEventListener("change", refresh);
    field(id).addEventListener("input", refresh);
  });
  ["#prodn-qty", "#prodn-rej", "#prodn-idle"].forEach((id) => field(id).addEventListener("keydown", digits));
  bindPick(field("#prodn-machine"), []);
  field("#prodn-machine").addEventListener("focus", () => showPick(field("#prodn-machine"), lists.machines));
  field("#prodn-operator").addEventListener("focus", () => showPick(field("#prodn-operator"), lists.staff));
  field("#prodn-customer").addEventListener("focus", () => showPick(field("#prodn-customer"), lists.customers));
  field("#prodn-item").addEventListener("focus", () => showPick(field("#prodn-item"), lists.items));
  panel.addEventListener("focusout", () => { document.querySelector("#prodn-pick").hidden = true; });

  field("#prodn-new").addEventListener("click", async () => {
    const date = new Date(field("#prodn-date").value + "T00:00:00");
    const limit = new Date();
    limit.setHours(0, 0, 0, 0);
    limit.setDate(limit.getDate() - 1);
    if (date < limit) {
      await showInfo("!!! You are trying to edit the Older data... !!!\r\n\r\nDated : " + field("#prodn-date").value);
    }
    blankNew();
  });

  field("#prodn-save").addEventListener("click", () => store("save"));
  field("#prodn-modify").addEventListener("click", () => store("modify"));

  async function store(which) {
    const body = payload();
    body.mode = which;
    const response = await fetch("/api/prodn/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.message) await showInfo(data.message);
    if (data.timings && data.timings.length) {
      await showInfo(data.timings.map((row) => row.from + "    " + row.to).join("\n"));
    }
    if (!data.ok) return;
    await load("last");
  }

  field("#prodn-delete").addEventListener("click", async () => {
    const probe = await fetch("/api/prodn/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slno })
    });
    const asked = await probe.json();
    if (!asked.confirm) return;
    if (!await askYes(asked.confirm)) return;
    const response = await fetch("/api/prodn/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slno, confirmed: true })
    });
    const data = await response.json();
    if (data.message) await showInfo(data.message);
    const next = await fetch("/api/prodn?dir=last");
    const record = await next.json();
    if (record.empty) {
      lists = record;
      blankNew(localDate(new Date()));
      mode = "view";
      buttons();
      return;
    }
    applyRecord(record);
  });

  async function load(dir) {
    const response = await fetch("/api/prodn?dir=" + dir + "&slno=" + slno);
    const data = await response.json();
    if (data.empty) return;
    applyRecord(data);
  }
  field("#prodn-first").addEventListener("click", () => load("first"));
  field("#prodn-prev").addEventListener("click", () => load("prev"));
  field("#prodn-next").addEventListener("click", () => load("next"));
  field("#prodn-last").addEventListener("click", () => load("last"));
  field("#prodn-close").addEventListener("click", () => { panel.hidden = true; });
  field("#prodn-f5").addEventListener("click", togglePending);
  document.addEventListener("keydown", (event) => {
    if (panel.hidden || event.key !== "F5") return;
    event.preventDefault();
    togglePending();
  });

  async function togglePending() {
    const box = document.querySelector("#prodn-pending");
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    const response = await fetch("/api/prodn?pending=1&date=" + encodeURIComponent(field("#prodn-date").value));
    const data = await response.json();
    box.replaceChildren();
    (data.names || []).forEach((name) => {
      const row = document.createElement("div");
      row.textContent = name;
      row.addEventListener("click", () => {
        field("#prodn-operator").value = name;
        box.hidden = true;
      });
      box.append(row);
    });
    box.hidden = false;
  }

  window.openProdn = async function openProdn() {
    const response = await fetch("/api/prodn");
    if (!response.ok) return;
    const data = await response.json();
    const now = new Date();
    field("#prodn-date").value = localDate(now);
    field("#prodn-from").value = now.toTimeString().slice(0, 5);
    field("#prodn-to").value = now.toTimeString().slice(0, 5);
    document.querySelectorAll("input[name='prodn-shift']").forEach((radio) => { radio.checked = false; });
    applyRecord({ ...data, mode: "view", machine: "", operator: "", customer: "", item: "" });
    mode = "view";
    slno = 0;
    buttons();
    panel.hidden = false;
    document.querySelector("#notice").hidden = true;
    document.querySelector("#popup").hidden = true;
  };
  window.closeProdn = function closeProdn() { panel.hidden = true; };
})();
