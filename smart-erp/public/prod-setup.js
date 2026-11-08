(() => {
  const panel = document.querySelector("#prod-setup");
  const stopBody = document.querySelector("#stop-rows");
  const groupBody = document.querySelector("#group-rows");
  const heads = document.querySelector("#prod-heads");
  const staffList = document.querySelector("#prod-staff");
  const stopSave = document.querySelector("#stop-save");
  const groupSave = document.querySelector("#group-save");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  let title = "Master - My Company Details - Production";
  let stoppages = [];
  let grouped = [];
  let names = [];
  let headId = 0;

  function showInfo(message) {
    document.querySelector("#info-title").textContent = title;
    document.querySelector("#info-text").textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function askYesNo(message) {
    return new Promise((resolve) => {
      document.querySelector("#ask-title").textContent = title;
      document.querySelector("#ask-text").textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(answer) {
        ask.hidden = true;
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        resolve(answer);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      no.focus();
    });
  }

  function paint(body, rows, fields, onDown) {
    body.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      fields.forEach((field) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = row[field];
        input.addEventListener("input", () => { row[field] = input.value; });
        if (field !== "slno") {
          input.addEventListener("keydown", (event) => onDown(event, index));
        }
        td.append(input);
        tr.append(td);
      });
      body.append(tr);
    });
  }

  function paintStops() {
    paint(stopBody, stoppages, ["slno", "type", "perc"], (event, index) => {
      if (event.key !== "ArrowDown" || index !== stoppages.length - 1) return;
      const row = stoppages[index];
      if (!String(row.type).trim() || Number(row.slno) === 0) return;
      stoppages.push({ slno: String(stoppages.length + 1), type: "", perc: "" });
      paintStops();
    });
  }

  function paintGroup() {
    paint(groupBody, grouped, ["slno", "name"], (event, index) => {
      if (event.key === "Enter") {
        const chosen = staffList.options[staffList.selectedIndex];
        if (chosen) {
          event.target.value = chosen.textContent;
          grouped[index].name = chosen.textContent;
        }
      }
      if (event.key !== "ArrowDown" && event.key !== "Enter") return;
      if (index !== grouped.length - 1) return;
      const row = grouped[index];
      if (!String(row.name).trim() || Number(row.slno) === 0) return;
      grouped.push({ slno: String(grouped.length + 1), name: "" });
      paintGroup();
    });
  }

  document.querySelector("#stop-head").addEventListener("click", () => {
    if (stoppages.length) return;
    stoppages.push({ slno: "1", type: "", perc: "" });
    paintStops();
    const type = stopBody.querySelectorAll("input")[1];
    if (type) type.focus();
  });

  document.querySelector("#group-head").addEventListener("click", () => {
    if (grouped.length) return;
    grouped.push({ slno: "1", name: "" });
    paintGroup();
    const name = groupBody.querySelectorAll("input")[1];
    if (name) name.focus();
  });

  staffList.addEventListener("click", () => {
    const chosen = staffList.options[staffList.selectedIndex];
    if (!chosen || !grouped.length) return;
    const active = document.activeElement;
    const inputs = [...groupBody.querySelectorAll("input")];
    const target = inputs.includes(active) && inputs.indexOf(active) % 2 === 1
      ? active
      : inputs[inputs.length - 1];
    if (!target) return;
    target.value = chosen.textContent;
    target.dispatchEvent(new Event("input"));
  });

  heads.addEventListener("change", async () => {
    headId = Number(heads.value);
    const response = await fetch("/api/prod-setup/grouping?staffId=" + encodeURIComponent(headId));
    const data = await response.json();
    grouped = (data.rows || []).map((row) => ({ slno: String(row.slno), name: row.name }));
    groupSave.textContent = data.caption || "Save";
    paintGroup();
  });

  async function store(url, payload, button) {
    const probe = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: false }, payload))
    });
    const first = await probe.json();
    if (!first.ok) {
      if (first.message) showInfo(first.message);
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo("Are You Sure To Store the Data ?");
    if (!yes) return;
    payload.confirmed = true;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    if (data.caption && button) button.textContent = data.caption;
    showInfo(data.message);
  }

  stopSave.addEventListener("click", () => {
    store("/api/prod-setup/stoppages", { rows: stoppages.map((row) => ({ slno: row.slno, type: row.type, perc: row.perc })) }, null);
  });
  groupSave.addEventListener("click", () => {
    store("/api/prod-setup/grouping", {
      staffId: headId,
      rows: grouped.map((row) => ({ slno: row.slno, name: row.name }))
    }, groupSave);
  });
  document.querySelector("#prod-setup-close").addEventListener("click", () => { panel.hidden = true; });

  window.openProdSetup = async function openProdSetup() {
    const response = await fetch("/api/prod-setup");
    if (!response.ok) return;
    const data = await response.json();
    title = data.title || title;
    stoppages = (data.stoppages || []).map((row) => ({ slno: String(row.slno), type: row.type, perc: row.perc }));
    paintStops();
    stopSave.textContent = stoppages.length ? "Save" : "Save";
    heads.replaceChildren();
    for (const row of data.heads || []) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      heads.append(option);
    }
    staffList.replaceChildren();
    names = (data.staff || []).map((row) => row.name);
    for (const name of names) {
      const option = document.createElement("option");
      option.textContent = name;
      staffList.append(option);
    }
    grouped = [];
    headId = 0;
    groupSave.textContent = "Save";
    paintGroup();
    panel.hidden = false;
  };

  window.closeProdSetup = () => { panel.hidden = true; };
})();
