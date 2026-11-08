(() => {
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  function showInfo(title, message) {
    infoTitle.textContent = title || "Tamba ERP";
    infoText.textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function askYesNo(title, message) {
    return new Promise((resolve) => {
      askTitle.textContent = title || "Tamba ERP";
      askText.textContent = message;
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

  function byteOf(level) {
    return level == null ? null : (Number(level) & 255);
  }

  function viewButtons(save, neu, modify, del, level) {
    save.disabled = true;
    neu.disabled = false;
    modify.disabled = false;
    del.disabled = false;
    const b = byteOf(level);
    if (b === 12) save.disabled = true;
    else if (b === 7) del.disabled = true;
    else if (b === 3) { del.disabled = true; modify.disabled = true; }
    else if (b === 1 || b === 0) { neu.disabled = true; del.disabled = true; modify.disabled = true; }
  }

  function newButtons(save, neu, modify, del, level) {
    neu.disabled = true;
    save.disabled = false;
    del.disabled = true;
    modify.disabled = true;
    const b = byteOf(level);
    if (b === 1 || b === 0) save.disabled = true;
  }

  function digitsOnly(event, box) {
    if (event.key === "Enter" || event.key === "ArrowUp" || event.key === "Backspace") return;
    if (event.key >= "0" && event.key <= "9") return;
    if (event.key === "." && box.value.indexOf(".") < 0) return;
    event.preventDefault();
  }

  function closeMasters() {
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeShift) window.closeShift();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeMachine) window.closeMachine();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
    if (window.closeItem) window.closeItem();
    if (window.closeExpense) window.closeExpense();
  }

  function bindList(panel, api, options) {
    const nameBox = document.querySelector(options.name);
    const list = document.querySelector(options.list);
    const neu = document.querySelector(options.neu);
    const save = document.querySelector(options.save);
    const modify = document.querySelector(options.modify);
    const del = document.querySelector(options.del);
    const status = document.querySelector(options.status);
    let rows = [];
    let nextId = 1;
    let currentId = 0;
    let mode = "view";
    let right = null;
    let title = "";
    let place = -1;

    function render() {
      const selected = list.value;
      list.replaceChildren();
      const ordered = rows.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      for (const row of ordered) {
        const option = document.createElement("option");
        option.value = String(row.id);
        option.textContent = row.name;
        list.append(option);
      }
      if (selected) list.value = selected;
    }

    function show(row) {
      mode = "edit";
      currentId = row.id;
      options.fill(row);
      place = rows.findIndex((item) => item.id === row.id);
      render();
      list.value = String(row.id);
      viewButtons(save, neu, modify, del, right);
    }

    function showPlace(index) {
      if (!rows.length) return;
      const next = index < 0 ? rows.length - 1 : index % rows.length;
      show(rows[next]);
    }

    function startNew() {
      mode = "new";
      place = options.openLast ? rows.length - 1 : -1;
      currentId = nextId;
      options.clear();
      list.selectedIndex = -1;
      render();
      newButtons(save, neu, modify, del, right);
      nameBox.focus();
    }

    async function load(reason) {
      const response = await fetch(api);
      if (!response.ok) { panel.hidden = true; return; }
      const data = await response.json();
      rows = data.rows || [];
      nextId = data.nextId || 1;
      right = data.right;
      title = data.title || "";
      panel.hidden = false;
      if (!rows.length) {
        startNew();
        if (options.emptyMessage && reason === "open") showInfo(title, options.emptyMessage);
        return;
      }
      if (reason === "added") {
        render();
        const row = rows.find((item) => item.id === currentId);
        if (row) list.value = String(row.id);
        return;
      }
      if (options.openLast && reason === "open") show(rows[rows.length - 1]);
      else if (reason === "first" || reason === "deleted" || reason === "open") show(rows[0]);
      else if (place >= 0 && rows[place]) show(rows[place]);
      else show(rows[0]);
    }

    async function saveRow() {
      if (options.locked && options.locked(currentId, mode)) {
        showInfo(title, options.lockedMessage);
        return;
      }
      const saving = mode === "new";
      const payload = Object.assign({ mode: saving ? "new" : "edit", id: currentId, confirmed: false }, options.payload());
      const probe = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const first = await probe.json();
      if (!first.ok) {
        if (first.message) showInfo(title, first.message);
        if (first.focus === "part" && options.part) options.part.focus();
        else if (first.message) nameBox.focus();
        return;
      }
      if (!first.ready) return;
      const yes = await askYesNo(title, saving ? options.saveAsk : options.modifyAsk);
      if (!yes) return;
      payload.confirmed = true;
      const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!data.ok) { if (data.message) showInfo(title, data.message); return; }
      if (data.id) currentId = data.id;
      showInfo(title, data.message);
      await load(saving ? "added" : "stay");
    }

    async function deleteRow() {
      const probe = await fetch(api + "/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentId, confirmed: false }) });
      const first = await probe.json();
      if (!first.ok) { if (first.message) showInfo(title, first.message); return; }
      if (!first.ready) return;
      const yes = await askYesNo(title, options.deleteAsk);
      if (!yes) return;
      const response = await fetch(api + "/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentId, confirmed: true }) });
      const data = await response.json();
      if (!data.ok) { if (data.message) showInfo(title, data.message); return; }
      showInfo(title, data.message);
      await load("deleted");
    }

    nameBox.addEventListener("keydown", (event) => {
      if (options.blockKeys && options.blockKeys(currentId)) { event.preventDefault(); return; }
      neu.disabled = true;
      del.disabled = true;
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (list.selectedIndex >= 0) nameBox.value = list.options[list.selectedIndex].textContent;
      if (options.afterName) options.afterName();
    });
    nameBox.addEventListener("input", () => {
      const typed = nameBox.value.toUpperCase();
      if (!typed) { list.selectedIndex = -1; return; }
      list.selectedIndex = [...list.options].findIndex((option) => option.textContent.toUpperCase().slice(0, typed.length) === typed);
    });
    list.addEventListener("click", () => {
      const row = rows.find((item) => String(item.id) === list.value);
      if (row) show(row);
    });
    neu.addEventListener("click", startNew);
    save.addEventListener("click", saveRow);
    modify.addEventListener("click", () => { mode = "edit"; saveRow(); });
    del.addEventListener("click", deleteRow);
    document.querySelector(options.first).addEventListener("click", () => showPlace(0));
    document.querySelector(options.last).addEventListener("click", () => showPlace(rows.length - 1));
    document.querySelector(options.next).addEventListener("click", () => showPlace(place + 1));
    document.querySelector(options.prev).addEventListener("click", () => showPlace(place - 1));
    document.querySelector(options.close).addEventListener("click", () => { panel.hidden = true; });
    if (options.help) {
      panel.addEventListener("keydown", (event) => {
        if (event.key !== "F1") return;
        event.preventDefault();
        status.textContent = options.help;
      });
    }
    return { load, panel };
  }

  const incomePanel = document.querySelector("#income");
  const income = bindList(incomePanel, "/api/income", {
    name: "#income-name",
    list: "#income-names",
    neu: "#income-new",
    save: "#income-save",
    modify: "#income-modify",
    del: "#income-delete",
    status: "#income-status",
    first: "#income-first",
    prev: "#income-prev",
    next: "#income-next",
    last: "#income-last",
    close: "#income-close",
    emptyMessage: "No Records to Display!",
    saveAsk: "Are You Sure To Save ?",
    modifyAsk: "Are You Sure To Modify ?",
    deleteAsk: "Are You Sure To Delete ?",
    help: "Help file: MasCHIncom.htm. That page is not in this copy.",
    locked: (id, mode) => mode === "edit" && (id === 1 || id === 2),
    lockedMessage: "This record cannot be Modified !!!",
    blockKeys: (id) => id === 1 || id === 2,
    afterName: () => document.querySelector("#income-desc").focus(),
    fill(row) {
      document.querySelector("#income-name").value = row.name;
      document.querySelector("#income-desc").value = row.desc;
      document.querySelector("#income-direct").checked = row.direct;
      document.querySelector("#income-indirect").checked = !row.direct;
    },
    clear() {
      document.querySelector("#income-name").value = "";
      document.querySelector("#income-desc").value = "";
      document.querySelector("#income-direct").checked = true;
    },
    payload: () => ({
      name: document.querySelector("#income-name").value,
      desc: document.querySelector("#income-desc").value,
      direct: document.querySelector("#income-direct").checked
    })
  });

  const bankPanel = document.querySelector("#banks");
  const banks = bindList(bankPanel, "/api/bank", {
    name: "#bank-name",
    list: "#bank-names",
    neu: "#bank-new",
    save: "#bank-save",
    modify: "#bank-modify",
    del: "#bank-delete",
    status: "#bank-status",
    first: "#bank-first",
    prev: "#bank-prev",
    next: "#bank-next",
    last: "#bank-last",
    close: "#bank-close",
    emptyMessage: "No Records to Display!",
    saveAsk: "Are You Sure To Save Your Editing?",
    modifyAsk: "Are You Sure To Save Your Editing?",
    deleteAsk: "Are You Sure To Delete?",
    fill(row) {
      document.querySelector("#bank-name").value = row.name;
      document.querySelector("#bank-open").value = row.open;
      document.querySelector("#bank-limit").value = row.limit;
      document.querySelector("#bank-debit").checked = row.debit;
      document.querySelector("#bank-credit").checked = !row.debit;
    },
    clear() {
      document.querySelector("#bank-name").value = "";
      document.querySelector("#bank-open").value = "";
      document.querySelector("#bank-limit").value = "";
      document.querySelector("#bank-credit").checked = true;
    },
    payload: () => ({
      name: document.querySelector("#bank-name").value,
      open: document.querySelector("#bank-open").value,
      limit: document.querySelector("#bank-limit").value,
      debit: document.querySelector("#bank-debit").checked
    })
  });
  document.querySelector("#bank-open").addEventListener("keydown", (event) => digitsOnly(event, event.target));
  document.querySelector("#bank-limit").addEventListener("keydown", (event) => digitsOnly(event, event.target));

  const currencyPanel = document.querySelector("#currency");
  const currency = bindList(currencyPanel, "/api/currency", {
    name: "#curr-name",
    part: document.querySelector("#curr-part"),
    list: "#curr-names",
    neu: "#curr-new",
    save: "#curr-save",
    modify: "#curr-modify",
    del: "#curr-delete",
    status: "#curr-status",
    first: "#curr-first",
    prev: "#curr-prev",
    next: "#curr-next",
    last: "#curr-last",
    close: "#curr-close",
    openLast: true,
    saveAsk: "Are You Sure To Save ?",
    modifyAsk: "Are You Sure To Modify ?",
    deleteAsk: "Are You sure to Delete this Record ?",
    afterName: () => document.querySelector("#curr-part").focus(),
    fill(row) {
      document.querySelector("#curr-name").value = row.name;
      document.querySelector("#curr-part").value = row.part;
      document.querySelector("#curr-symbol").value = row.symbol;
    },
    clear() {
      document.querySelector("#curr-name").value = "";
      document.querySelector("#curr-part").value = "";
      document.querySelector("#curr-symbol").value = "";
    },
    payload: () => ({
      name: document.querySelector("#curr-name").value,
      part: document.querySelector("#curr-part").value,
      symbol: document.querySelector("#curr-symbol").value
    })
  });

  const costPanel = document.querySelector("#cost");
  const closedWrap = document.querySelector("#cost-closed-wrap");
  const cost = bindList(costPanel, "/api/cost-center", {
    name: "#cost-name",
    list: "#cost-names",
    neu: "#cost-new",
    save: "#cost-save",
    modify: "#cost-modify",
    del: "#cost-delete",
    status: "#cost-status",
    first: "#cost-first",
    prev: "#cost-prev",
    next: "#cost-next",
    last: "#cost-last",
    close: "#cost-close",
    emptyMessage: "No Records to Display!",
    saveAsk: "Are You Sure To Save Your Editing ?",
    modifyAsk: "Are You Sure To Save Your Editing ?",
    deleteAsk: "Are You Sure To Delete ?",
    help: "Help file: MasInvcat.htm. That page is not in this copy.",
    afterName: () => document.querySelector("#cost-desc").focus(),
    fill(row) {
      document.querySelector("#cost-name").value = row.name;
      document.querySelector("#cost-desc").value = row.desc;
      document.querySelector("#cost-closed").checked = row.closed;
      closedWrap.hidden = false;
    },
    clear() {
      document.querySelector("#cost-name").value = "";
      document.querySelector("#cost-desc").value = "";
      document.querySelector("#cost-closed").checked = false;
      closedWrap.hidden = true;
    },
    payload: () => ({
      name: document.querySelector("#cost-name").value,
      desc: document.querySelector("#cost-desc").value,
      closed: document.querySelector("#cost-closed").checked
    })
  });

  const todayPanel = document.querySelector("#curr-today");
  const todayList = document.querySelector("#curr-today-names");
  const todayRows = document.querySelector("#curr-today-rows");
  const todayRate = document.querySelector("#curr-today-rate");
  const todaySave = document.querySelector("#curr-today-save");
  const todayDelete = document.querySelector("#curr-today-delete");
  const todayDate = document.querySelector("#curr-today-date");
  const todayStatus = document.querySelector("#curr-today-status");
  let todayData = null;
  let todayCurr = 0;
  let todayMode = "save";
  let todayPick = 0;
  let todayTitle = "";
  let todayRight = null;

  function paintToday() {
    todayList.replaceChildren();
    for (const row of todayData.currencies) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      todayList.append(option);
    }
    if (todayCurr) todayList.value = String(todayCurr);
    const currency = todayData.currencies.find((row) => row.id === todayCurr);
    document.querySelector("#curr-today-part").textContent = currency ? currency.part : "PartCurrencyName";
    document.querySelector("#curr-today-one").textContent = currency ? "One " + currency.name : "One";
    const mine = todayData.rates.filter((row) => row.currId === todayCurr);
    const previous = mine.filter((row) => row.date < todayData.today).slice(-1)[0];
    const current = mine.find((row) => row.date === todayData.today);
    document.querySelector("#curr-today-prev").textContent = previous ? previous.rate : "";
    document.querySelector("#curr-today-prev-date").textContent = previous ? previous.date : "";
    if (current && Number(current.rate) !== 0) {
      todayRate.value = current.rate;
      todayMode = "modify";
      todaySave.textContent = "Modify";
    } else {
      todayRate.value = previous ? previous.rate : "";
      todayMode = "save";
      todaySave.textContent = "Save";
    }
    todayRows.replaceChildren();
    todayPick = 0;
    for (const row of mine) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td>";
      tr.children[0].textContent = row.date;
      tr.children[1].textContent = row.rate;
      tr.addEventListener("click", () => {
        todayPick = row.id;
        for (const other of todayRows.children) other.classList.remove("picked");
        tr.classList.add("picked");
      });
      todayRows.append(tr);
      todayPick = row.id;
      for (const other of todayRows.children) other.classList.remove("picked");
      tr.classList.add("picked");
    }
    const level = byteOf(todayRight);
    if (!todayData.currencies.length) todaySave.disabled = true;
    else if (level === 12 || level === 7 || level == null || level === 255) todaySave.disabled = false;
    else if (level === 3) todaySave.disabled = todayMode === "modify";
    else if (level === 1 || level === 0) todaySave.disabled = true;
    todayDelete.disabled = level === 7 || level === 3 || level === 1 || level === 0;
  }

  async function loadToday() {
    const response = await fetch("/api/currency-today");
    if (!response.ok) { todayPanel.hidden = true; return; }
    todayData = await response.json();
    todayTitle = todayData.title || "";
    todayRight = todayData.right;
    todayDate.value = todayData.today;
    todayPanel.hidden = false;
    if (!todayCurr && todayData.rates.length && todayData.currencies.length) todayCurr = todayData.currencies[0].id;
    if (!todayData.currencies.length) {
      todaySave.disabled = true;
      showInfo(todayTitle, "Without Currency Names, You cannot Enter any data in this Screen");
    }
    paintToday();
  }

  todayList.addEventListener("click", () => {
    todayCurr = Number(todayList.value);
    paintToday();
  });
  todayRate.addEventListener("keydown", (event) => digitsOnly(event, todayRate));
  todaySave.addEventListener("click", async () => {
    const payload = { currId: todayCurr, rate: todayRate.value, date: todayDate.value, mode: todayMode, confirmed: false };
    const probe = await fetch("/api/currency-today", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const first = await probe.json();
    if (!first.ok) { if (first.message) showInfo(todayTitle, first.message); return; }
    if (!first.ready) return;
    const yes = await askYesNo(todayTitle, first.confirm);
    if (!yes) return;
    payload.confirmed = true;
    const response = await fetch("/api/currency-today", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!data.ok) { if (data.message) showInfo(todayTitle, data.message); return; }
    showInfo(todayTitle, data.message);
    const keep = todayCurr;
    await loadToday();
    todayCurr = keep;
    paintToday();
  });
  todayDelete.addEventListener("click", async () => {
    const probe = await fetch("/api/currency-today/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: todayPick, confirmed: false }) });
    const first = await probe.json();
    if (!first.ok) { if (first.message) showInfo(todayTitle, first.message); return; }
    const yes = await askYesNo(todayTitle, "Are You sure to Delete this Record ?");
    if (!yes) return;
    const response = await fetch("/api/currency-today/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: todayPick, confirmed: true }) });
    const data = await response.json();
    if (data.message) showInfo(todayTitle, data.message);
    const keep = todayCurr;
    await loadToday();
    todayCurr = keep;
    paintToday();
  });
  document.querySelector("#curr-today-close").addEventListener("click", () => { todayPanel.hidden = true; });

  function prepare(panel) {
    document.querySelector("#notice").hidden = true;
    document.querySelector("#popup").hidden = true;
    closeMasters();
    incomePanel.hidden = true;
    bankPanel.hidden = true;
    currencyPanel.hidden = true;
    todayPanel.hidden = true;
    costPanel.hidden = true;
    panel.hidden = false;
  }

  window.openIncome = function openIncome() { prepare(incomePanel); income.load("open"); };
  window.openBanks = function openBanks() { prepare(bankPanel); banks.load("open"); };
  window.openCurrency = function openCurrency() { prepare(currencyPanel); currency.load("open"); };
  window.openCurrToday = function openCurrToday() { prepare(todayPanel); todayCurr = 0; loadToday(); };
  window.openCost = function openCost() { prepare(costPanel); cost.load("open"); };
  window.closeIncome = () => { incomePanel.hidden = true; };
  window.closeBanks = () => { bankPanel.hidden = true; };
  window.closeCurrency = () => { currencyPanel.hidden = true; };
  window.closeCurrToday = () => { todayPanel.hidden = true; };
  window.closeCost = () => { costPanel.hidden = true; };
})();
