(() => {
  const panel = document.querySelector("#scn");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const body = document.querySelector("#scn-body");
  let data = { addStores: [], sourceStores: [], costs: [], stock: [], pending: [], records: [], nextNo: "1" };
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

  function money(value) {
    return (Number(value) || 0).toFixed(2);
  }

  function stockFor(storeId, itemId) {
    const row = data.stock.find((item) => Number(item.storeId) === Number(storeId) && Number(item.itemId) === Number(itemId));
    return row ? money(row.qty) : "0.00";
  }

  function fillSelect(select, rows, blank, selected) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = blank || "";
    select.appendChild(empty);
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.label;
      select.appendChild(option);
    });
    select.value = selected ? String(selected) : "";
  }

  function paint(rows) {
    const editing = mode === "new" || mode === "modify";
    const sourceId = document.querySelector("#scn-source").value;
    body.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td><td></td><td><input class='accp'></td><td><input class='rej'></td><td><input class='rem'></td><td class='tostock'></td><td class='stk'></td>";
      tr.children[0].textContent = row.slno;
      tr.children[1].textContent = row.code || "";
      tr.children[2].textContent = row.name || "";
      tr.children[3].textContent = money(row.received);
      tr.querySelector(".accp").value = row.accepted ? money(row.accepted) : "";
      tr.querySelector(".rej").value = row.rejected ? money(row.rejected) : "";
      tr.querySelector(".rem").value = row.remarks || "";
      tr.querySelector(".tostock").textContent = money(row.accepted);
      tr.querySelector(".stk").textContent = stockFor(sourceId, row.itemId);
      tr.dataset.slno = row.slno;
      tr.dataset.itemId = row.itemId || "";
      tr.dataset.code = row.code || "";
      tr.dataset.uom = row.uom || "";
      tr.dataset.received = row.received || 0;
      ["accp", "rej", "rem"].forEach((name) => { tr.querySelector("." + name).disabled = !editing; });
      tr.querySelector(".accp").addEventListener("input", () => {
        tr.querySelector(".tostock").textContent = money(tr.querySelector(".accp").value);
      });
      tr.addEventListener("focusin", () => {
        document.querySelector("#scn-item-name").textContent = "ITEM : " + (tr.dataset.code || "");
        document.querySelector("#scn-item-uom").textContent = "UOM :  " + (tr.dataset.uom || "");
      });
      body.appendChild(tr);
    });
  }

  function collect() {
    return [...body.querySelectorAll("tr")].map((tr) => ({
      slno: Number(tr.dataset.slno),
      accepted: tr.querySelector(".accp").value,
      rejected: tr.querySelector(".rej").value,
      remarks: tr.querySelector(".rem").value
    }));
  }

  function currentLines() {
    return [...body.querySelectorAll("tr")].map((tr) => ({
      slno: Number(tr.dataset.slno),
      itemId: Number(tr.dataset.itemId),
      code: tr.dataset.code,
      uom: tr.dataset.uom,
      name: tr.children[2].textContent,
      received: tr.dataset.received,
      accepted: tr.querySelector(".accp").value,
      rejected: tr.querySelector(".rej").value,
      remarks: tr.querySelector(".rem").value
    }));
  }

  function detailText(row) {
    if (!row) return "";
    return "Prod.Matl.Return Date: " + (row.date || row.returnDate || "") + " IWO Issue No.: " + (row.refNo || "") + " IWO Issue Date: " + (row.refDate || "");
  }

  function show(record) {
    const editing = mode === "new" || mode === "modify";
    document.querySelector("#scn-no").value = record ? (record.scnId || data.nextNo) : "";
    document.querySelector("#scn-date").value = record && record.date ? record.date : localDate();
    const returns = mode === "new"
      ? data.pending.map((row) => ({ id: row.id, label: row.no }))
      : (record ? [{ id: record.id, label: record.returnNo }] : []);
    fillSelect(document.querySelector("#scn-return"), returns, "", record ? record.id : "");
    fillSelect(document.querySelector("#scn-source"), data.sourceStores.map((row) => ({ id: row.store_id, label: row.store_name })), "", record ? record.sourceId : "");
    fillSelect(document.querySelector("#scn-dest"), data.addStores.map((row) => ({ id: row.store_id, label: row.store_name })), "", record ? record.destId : "");
    fillSelect(document.querySelector("#scn-cost"), data.costs.map((row) => ({ id: row.id, label: row.cost_cntr })), "", record ? record.costId : "");
    document.querySelector("#scn-prepared").value = record ? record.prepared || "" : "";
    document.querySelector("#scn-remarks").value = record ? record.remarks || "" : "";
    document.querySelector("#scn-detail").textContent = detailText(record);
    document.querySelector("#scn-item-name").textContent = "ITEM :";
    document.querySelector("#scn-item-uom").textContent = "UOM :";
    paint(record ? record.lines : []);
    document.querySelector("#scn-date").disabled = !editing;
    document.querySelector("#scn-return").disabled = mode !== "new";
    document.querySelector("#scn-source").disabled = !editing;
    document.querySelector("#scn-dest").disabled = !editing;
    document.querySelector("#scn-cost").disabled = !editing;
    document.querySelector("#scn-prepared").disabled = !editing;
    document.querySelector("#scn-remarks").disabled = !editing;
    document.querySelector("#scn-save").disabled = !editing;
    document.querySelector("#scn-modify").disabled = mode !== "view" || !record;
    document.querySelector("#scn-delete").disabled = mode !== "view" || !record;
  }

  async function load() {
    const response = await fetch("/api/scn");
    if (response.status === 401) return;
    data = await response.json();
    records = data.records || [];
    if (mode === "new") {
      show(null);
      document.querySelector("#scn-no").value = data.nextNo || "1";
      return;
    }
    if (!records.length) {
      index = -1;
      mode = "view";
      show(null);
      return;
    }
    if (index < 0 || index >= records.length) index = records.length - 1;
    show(records[index]);
  }

  document.querySelector("#scn-return").addEventListener("change", () => {
    const chosen = data.pending.find((row) => String(row.id) === document.querySelector("#scn-return").value);
    if (!chosen) {
      document.querySelector("#scn-detail").textContent = "";
      paint([]);
      return;
    }
    document.querySelector("#scn-source").value = chosen.storeId ? String(chosen.storeId) : "";
    document.querySelector("#scn-cost").value = chosen.costId ? String(chosen.costId) : "";
    document.querySelector("#scn-detail").textContent = detailText(chosen);
    paint(chosen.lines);
  });

  document.querySelector("#scn-source").addEventListener("change", () => {
    if (mode === "new" || mode === "modify") paint(currentLines());
  });

  document.querySelector("#scn-new").addEventListener("click", async () => {
    mode = "new";
    index = -1;
    await load();
    show(null);
    document.querySelector("#scn-no").value = data.nextNo || "1";
    document.querySelector("#scn-date").value = localDate();
  });

  document.querySelector("#scn-save").addEventListener("click", async () => {
    const payload = {
      mode: mode === "modify" ? "modify" : "save",
      returnId: document.querySelector("#scn-return").value,
      date: document.querySelector("#scn-date").value,
      sourceId: document.querySelector("#scn-source").value,
      destId: document.querySelector("#scn-dest").value,
      costId: document.querySelector("#scn-cost").value,
      prepared: document.querySelector("#scn-prepared").value,
      remarks: document.querySelector("#scn-remarks").value,
      lines: collect(),
      confirmed: false
    };
    let response = await fetch("/api/scn/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    let result = await response.json();
    if (!result.ok) return showInfo(result.message || "The save could not be checked.");
    if (result.ready) {
      if (!await askYes(result.confirm)) return;
      payload.confirmed = true;
      response = await fetch("/api/scn/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      result = await response.json();
      if (!result.ok) return showInfo(result.message);
    }
    await showInfo(result.message);
    mode = "view";
    await load();
  });

  document.querySelector("#scn-modify").addEventListener("click", () => {
    if (!records[index]) return;
    mode = "modify";
    show(records[index]);
  });

  document.querySelector("#scn-delete").addEventListener("click", async () => {
    const record = records[index];
    if (!record) return;
    let response = await fetch("/api/scn/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: false }) });
    let result = await response.json();
    if (!result.ok && result.message) return showInfo(result.message);
    if (!await askYes(result.confirm)) return;
    response = await fetch("/api/scn/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, confirmed: true }) });
    result = await response.json();
    await showInfo(result.message);
    mode = "view";
    await load();
  });

  document.querySelector("#scn-search").addEventListener("change", async () => {
    const wanted = document.querySelector("#scn-search").value.trim();
    if (!wanted) return;
    const found = records.findIndex((row) => String(row.scnId) === wanted);
    if (found < 0) {
      await showInfo(" NO 'Store Credit Note - Production' exists with this No.");
      return;
    }
    index = found;
    mode = "view";
    show(records[index]);
  });

  document.querySelector("#scn-first").addEventListener("click", () => { if (records.length) { index = 0; mode = "view"; show(records[0]); } });
  document.querySelector("#scn-prev").addEventListener("click", () => { if (index > 0) { index -= 1; mode = "view"; show(records[index]); } });
  document.querySelector("#scn-next").addEventListener("click", () => { if (index < records.length - 1) { index += 1; mode = "view"; show(records[index]); } });
  document.querySelector("#scn-last").addEventListener("click", () => { if (records.length) { index = records.length - 1; mode = "view"; show(records[index]); } });
  document.querySelector("#scn-close").addEventListener("click", () => { panel.hidden = true; });
  window.openScn = async () => { panel.hidden = false; mode = "view"; await load(); };
  window.closeScn = () => { panel.hidden = true; };
})();
