(() => {
  const panel = document.querySelector("#iwo-return");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const body = document.querySelector("#ret-body");
  let data = { stores: [], whom: [], costs: [], refs: [], open: [], records: [], nextNo: "1" };
  let records = [];
  let index = -1;
  let mode = "view";

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

  function localDate() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function leftFor(code) {
    const ref = document.querySelector("#ret-ref").value;
    return data.open.filter((row) => row.code === code && (!ref || row.no === ref)).reduce((sum, row) => sum + Number(row.bal), 0);
  }

  function paint(rows) {
    body.innerHTML = "";
    rows.forEach((row, position) => {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td><input class='code'></td><td><input class='part'></td><td><input class='qty'></td><td><input class='rej'></td><td><input class='rem'></td><td class='left'></td>";
      tr.children[0].textContent = position + 1;
      tr.querySelector(".code").value = row.code || "";
      tr.querySelector(".part").value = row.particulars || "";
      tr.querySelector(".qty").value = row.qty || "";
      tr.querySelector(".rej").value = row.rej || "";
      tr.querySelector(".rem").value = row.remarks || "";
      tr.querySelector(".left").textContent = leftFor(row.code || "");
      tr.querySelector(".code").addEventListener("change", () => {
        tr.querySelector(".left").textContent = leftFor(tr.querySelector(".code").value.trim());
      });
      tr.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown" || mode === "view" || position !== body.children.length - 1) return;
        event.preventDefault();
        addRow();
      });
      body.appendChild(tr);
    });
  }

  function addRow() {
    const current = collect();
    current.push({});
    paint(current);
  }

  function collect() {
    return [...body.querySelectorAll("tr")].map((tr, position) => ({
      slno: position + 1,
      code: tr.querySelector(".code").value.trim(),
      particulars: tr.querySelector(".part").value.trim(),
      qty: tr.querySelector(".qty").value,
      rej: tr.querySelector(".rej").value,
      remarks: tr.querySelector(".rem").value
    }));
  }

  function show(record) {
    document.querySelector("#ret-no").value = record ? record.no : "";
    document.querySelector("#ret-date").value = record ? record.date : localDate();
    document.querySelector("#ret-ref").value = record ? record.refNo : "";
    document.querySelector("#ret-refdate").value = record ? record.refDate : "";
    const cost = data.costs.find((row) => Number(row.id) === Number(record && record.costId));
    document.querySelector("#ret-cost").value = cost ? cost.cost_cntr : "";
    document.querySelector("#ret-store").value = record && record.storeId ? String(record.storeId) : "";
    document.querySelector("#ret-whom").value = record ? record.whom : "";
    document.querySelector("#ret-remarks").value = record ? record.remarks : "";
    paint(record ? record.lines : []);
    document.querySelector("#ret-save").disabled = mode !== "new" && mode !== "modify";
    document.querySelector("#ret-modify").disabled = mode !== "view" || !record;
    document.querySelector("#ret-delete").disabled = mode !== "view" || !record;
  }

  async function load() {
    const response = await fetch("/api/iwo-return");
    data = await response.json();
    records = data.records || [];
    const store = document.querySelector("#ret-store");
    store.innerHTML = "<option value=''></option>";
    data.stores.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.store_id;
      option.textContent = row.store_name;
      store.appendChild(option);
    });
    const ref = document.querySelector("#ret-ref");
    ref.innerHTML = "<option value=''></option>";
    data.refs.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.no;
      option.textContent = row.no;
      option.dataset.date = row.date || "";
      option.dataset.cost = row.costId || "";
      ref.appendChild(option);
    });
    const costs = document.querySelector("#ret-cost-list");
    costs.innerHTML = "";
    data.costs.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.cost_cntr;
      costs.appendChild(option);
    });
    const whom = document.querySelector("#ret-whom-list");
    whom.innerHTML = "";
    data.whom.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      whom.appendChild(option);
    });
    mode = "view";
    index = records.length ? records.length - 1 : -1;
    show(records[index] || null);
  }

  document.querySelector("#ret-ref").addEventListener("change", () => {
    const option = document.querySelector("#ret-ref").selectedOptions[0];
    document.querySelector("#ret-refdate").value = option && option.dataset.date ? option.dataset.date : "";
    const cost = data.costs.find((row) => String(row.id) === (option && option.dataset.cost));
    if (cost) document.querySelector("#ret-cost").value = cost.cost_cntr;
    paint(collect());
  });
  document.querySelector("#ret-head").addEventListener("click", () => {
    if (mode === "view" || body.children.length) return;
    addRow();
  });
  document.querySelector("#ret-new").addEventListener("click", () => {
    mode = "new";
    index = -1;
    show(null);
    document.querySelector("#ret-no").value = data.nextNo || "1";
    document.querySelector("#ret-save").disabled = false;
  });
  document.querySelector("#ret-save").addEventListener("click", async () => {
    const payload = {
      mode: mode === "modify" ? "modify" : "save",
      id: mode === "modify" ? (records[index] || {}).id : 0,
      no: document.querySelector("#ret-no").value,
      date: document.querySelector("#ret-date").value,
      refNo: document.querySelector("#ret-ref").value,
      refDate: document.querySelector("#ret-refdate").value,
      costName: document.querySelector("#ret-cost").value,
      storeId: document.querySelector("#ret-store").value,
      whom: document.querySelector("#ret-whom").value,
      remarks: document.querySelector("#ret-remarks").value,
      lines: collect(),
      confirmed: false
    };
    let response = await fetch("/api/iwo-return/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let result = await response.json();
    if (!result.ok) return showInfo(result.message || "The save could not be checked.");
    if (result.ready) {
      if (!await askYes(result.confirm)) return;
      payload.confirmed = true;
      response = await fetch("/api/iwo-return/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      result = await response.json();
      if (!result.ok) return showInfo(result.message);
    }
    await showInfo(result.message);
    await load();
  });
  document.querySelector("#ret-modify").addEventListener("click", () => {
    if (!records[index]) return;
    mode = "modify";
    document.querySelector("#ret-save").disabled = false;
    document.querySelector("#ret-save").click();
  });
  document.querySelector("#ret-delete").addEventListener("click", async () => {
    const record = records[index];
    if (!record) return;
    let response = await fetch("/api/iwo-return/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: false }) });
    let result = await response.json();
    if (!result.ok && result.message) return showInfo(result.message);
    if (!await askYes(result.confirm)) return;
    response = await fetch("/api/iwo-return/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: true }) });
    result = await response.json();
    await showInfo(result.message);
    await load();
  });
  document.querySelector("#ret-first").addEventListener("click", () => { if (records.length) { index = 0; mode = "view"; show(records[0]); } });
  document.querySelector("#ret-prev").addEventListener("click", () => { if (index > 0) { index -= 1; mode = "view"; show(records[index]); } });
  document.querySelector("#ret-next").addEventListener("click", () => { if (index < records.length - 1) { index += 1; mode = "view"; show(records[index]); } });
  document.querySelector("#ret-last").addEventListener("click", () => { if (records.length) { index = records.length - 1; mode = "view"; show(records[index]); } });
  document.querySelector("#ret-close").addEventListener("click", () => { panel.hidden = true; });
  window.openIwoReturn = async () => { panel.hidden = false; await load(); };
  window.closeIwoReturn = () => { panel.hidden = true; };
})();
