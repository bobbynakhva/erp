(() => {
  const panel = document.querySelector("#iwo");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const body = document.querySelector("#iwo-body");
  let lists = { stores: [], customers: [], whom: [], costs: [], items: [], stock: [] };
  let records = [];
  let index = -1;
  let mode = "view";
  let nextNo = "1";

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
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function fillSelect(select, rows, blank) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = blank;
    select.appendChild(empty);
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.name;
      select.appendChild(option);
    });
  }

  function itemCode(id) {
    const found = lists.items.find((item) => Number(item.item_id) === Number(id));
    return found ? found.item_code : "";
  }

  function stockQty(code) {
    const item = lists.items.find((row) => row.item_code === code);
    if (!item) return "";
    const hit = lists.stock.find((row) => Number(row.storeId) === Number(document.querySelector("#iwo-store").value) && Number(row.itemId) === Number(item.item_id));
    return hit ? Number(hit.qty).toFixed(2) : "0.00";
  }

  function rowsFromRecord(record) {
    const grouped = new Map();
    (record.lines || []).forEach((line) => {
      const key = Math.floor(Number(line.slno));
      if (!grouped.has(key)) grouped.set(key, { slno: key, out: "", qtyOut: "", inn: "", qtyIn: "", remarks: "", bal: "" });
      const row = grouped.get(key);
      if (Number(line.slno) === key) {
        row.out = itemCode(line.itemIdOut);
        row.qtyOut = line.qtyOut || "";
        row.remarks = line.remarks || "";
      } else {
        row.inn = itemCode(line.itemId);
        row.qtyIn = line.qty || "";
        row.bal = Number(line.balQty || 0).toFixed(2);
      }
    });
    return [...grouped.values()];
  }

  function paintRows(rows) {
    body.innerHTML = "";
    rows.forEach((row, position) => {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td><input class='out'></td><td><input class='qty-out'></td><td><input class='in'></td><td><input class='qty-in'></td><td><input class='rem'></td><td class='stk'></td><td class='bal'></td>";
      tr.children[0].textContent = row.slno || position + 1;
      tr.querySelector(".out").value = row.out || "";
      tr.querySelector(".qty-out").value = row.qtyOut || "";
      tr.querySelector(".in").value = row.inn || "";
      tr.querySelector(".qty-in").value = row.qtyIn || "";
      tr.querySelector(".rem").value = row.remarks || "";
      tr.querySelector(".stk").textContent = stockQty(row.out || "");
      tr.querySelector(".bal").textContent = row.bal || (row.qtyIn ? Number(row.qtyIn).toFixed(2) : "");
      tr.querySelector(".out").addEventListener("change", () => {
        tr.querySelector(".stk").textContent = stockQty(tr.querySelector(".out").value.trim());
      });
      tr.querySelector(".qty-in").addEventListener("change", () => {
        const qty = Number(tr.querySelector(".qty-in").value);
        tr.querySelector(".bal").textContent = qty > 0 ? qty.toFixed(2) : "";
      });
      tr.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown" || mode === "view") return;
        if (position !== body.children.length - 1) return;
        event.preventDefault();
        addRow();
      });
      body.appendChild(tr);
    });
  }

  function addRow() {
    const current = [...body.querySelectorAll("tr")].map((tr, position) => ({
      slno: position + 1,
      out: tr.querySelector(".out").value,
      qtyOut: tr.querySelector(".qty-out").value,
      inn: tr.querySelector(".in").value,
      qtyIn: tr.querySelector(".qty-in").value,
      remarks: tr.querySelector(".rem").value,
      bal: tr.querySelector(".bal").textContent
    }));
    current.push({ slno: current.length + 1 });
    paintRows(current);
  }

  function collect() {
    return [...body.querySelectorAll("tr")].map((tr, position) => ({
      slno: position + 1,
      out: tr.querySelector(".out").value.trim(),
      qtyOut: tr.querySelector(".qty-out").value,
      in: tr.querySelector(".in").value.trim(),
      qtyIn: tr.querySelector(".qty-in").value,
      remarks: tr.querySelector(".rem").value
    }));
  }

  function showRecord(record) {
    document.querySelector("#iwo-no").value = record ? record.no : "";
    document.querySelector("#iwo-date").value = record ? record.date : localDate();
    document.querySelector("#iwo-whom").value = record ? record.whom : "";
    document.querySelector("#iwo-cost").value = record && record.costId ? String(record.costId) : "";
    document.querySelector("#iwo-remarks").value = record ? record.remarks : "";
    document.querySelector("#iwo-store").value = record && record.storeId ? String(record.storeId) : "";
    document.querySelector("#iwo-customer").value = record && record.customerId ? String(record.customerId) : "";
    document.querySelector("#iwo-po").value = record ? record.poNo : "";
    document.querySelector("#iwo-podate").value = record ? record.poDate : "";
    paintRows(record ? rowsFromRecord(record) : []);
    document.querySelector("#iwo-save").disabled = mode !== "new";
    document.querySelector("#iwo-modify").disabled = mode !== "view" || !record;
    document.querySelector("#iwo-delete").disabled = mode !== "view" || !record;
  }

  async function load() {
    const response = await fetch("/api/iwo");
    const data = await response.json();
    lists = data.lists;
    records = data.records || [];
    nextNo = data.nextNo || "1";
    fillSelect(document.querySelector("#iwo-store"), lists.stores.map((row) => ({ id: row.store_id, name: row.store_name })), "");
    fillSelect(document.querySelector("#iwo-customer"), lists.customers, "");
    fillSelect(document.querySelector("#iwo-cost"), lists.costs.map((row) => ({ id: row.id, name: row.cost_cntr })), "");
    const whom = document.querySelector("#iwo-whom-list");
    whom.innerHTML = "";
    lists.whom.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      whom.appendChild(option);
    });
    mode = "view";
    index = records.length ? records.length - 1 : -1;
    showRecord(records[index] || null);
  }

  document.querySelector("#iwo-head").addEventListener("click", () => {
    if (mode === "view" || body.children.length) return;
    addRow();
  });

  document.querySelector("#iwo-new").addEventListener("click", () => {
    mode = "new";
    index = -1;
    showRecord(null);
    document.querySelector("#iwo-no").value = nextNo;
    document.querySelector("#iwo-save").disabled = false;
    document.querySelector("#iwo-modify").disabled = true;
    document.querySelector("#iwo-delete").disabled = true;
  });

  document.querySelector("#iwo-save").addEventListener("click", async () => {
    const payload = {
      mode: mode === "new" ? "save" : "modify",
      id: mode === "new" ? 0 : (records[index] || {}).id,
      no: document.querySelector("#iwo-no").value,
      date: document.querySelector("#iwo-date").value,
      whom: document.querySelector("#iwo-whom").value,
      costId: document.querySelector("#iwo-cost").value,
      remarks: document.querySelector("#iwo-remarks").value,
      storeId: document.querySelector("#iwo-store").value,
      customerId: document.querySelector("#iwo-customer").value,
      poNo: document.querySelector("#iwo-po").value,
      poDate: document.querySelector("#iwo-podate").value,
      lines: collect(),
      confirmed: false
    };
    let response = await fetch("/api/iwo/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let data = await response.json();
    if (!data.ok) return showInfo(data.message);
    if (data.ready) {
      if (!await askYes(data.confirm)) return;
      payload.confirmed = true;
      response = await fetch("/api/iwo/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      data = await response.json();
      if (!data.ok) return showInfo(data.message);
    }
    await showInfo(data.message);
    await load();
  });

  document.querySelector("#iwo-modify").addEventListener("click", async () => {
    if (!records[index]) return;
    mode = "modify";
    document.querySelector("#iwo-save").click();
  });

  document.querySelector("#iwo-delete").addEventListener("click", async () => {
    const record = records[index];
    if (!record) return;
    let response = await fetch("/api/iwo/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: false }) });
    let data = await response.json();
    if (!data.ok && data.message) return showInfo(data.message);
    if (!await askYes(data.confirm)) return;
    response = await fetch("/api/iwo/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: true }) });
    data = await response.json();
    await showInfo(data.message);
    await load();
  });

  document.querySelector("#iwo-print").addEventListener("click", () => {
    const record = records[index];
    if (!record || !record.id) return showInfo("You should save the Record First in order to take print...");
    if (!record.lines || record.lines.length === 0) return showInfo("No data to Print...");
    window.open(`/api/print?type=iwo&id=${record.id}`, "_blank");
  });

  document.querySelector("#iwo-first").addEventListener("click", () => { if (records.length) { index = 0; mode = "view"; showRecord(records[0]); } });
  document.querySelector("#iwo-prev").addEventListener("click", () => { if (index > 0) { index -= 1; mode = "view"; showRecord(records[index]); } });
  document.querySelector("#iwo-next").addEventListener("click", () => { if (index < records.length - 1) { index += 1; mode = "view"; showRecord(records[index]); } });
  document.querySelector("#iwo-last").addEventListener("click", () => { if (records.length) { index = records.length - 1; mode = "view"; showRecord(records[index]); } });
  document.querySelector("#iwo-close").addEventListener("click", () => { panel.hidden = true; });

  window.openIwo = async () => {
    panel.hidden = false;
    await load();
  };
  window.closeIwo = () => { panel.hidden = true; };
})();
