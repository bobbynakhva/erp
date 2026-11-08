(() => {
  const panel = document.querySelector("#customer");
  const idBox = document.querySelector("#customer-id");
  const nameBox = document.querySelector("#customer-name");
  const inactiveBox = document.querySelector("#customer-inactive");
  const addrBox = document.querySelector("#customer-addr");
  const kstBox = document.querySelector("#customer-kst");
  const cstBox = document.querySelector("#customer-cst");
  const tinBox = document.querySelector("#customer-tin");
  const vendBox = document.querySelector("#customer-vend");
  const phoneBox = document.querySelector("#customer-phone");
  const emailBox = document.querySelector("#customer-email");
  const typeBox = document.querySelector("#customer-type");
  const balBox = document.querySelector("#customer-bal");
  const contactBox = document.querySelector("#customer-contact");
  const scopeBox = document.querySelector("#customer-scope");
  const rngBox = document.querySelector("#customer-rng");
  const diviBox = document.querySelector("#customer-divi");
  const commissionBox = document.querySelector("#customer-commission");
  const ceBox = document.querySelector("#customer-ce");
  const gstinBox = document.querySelector("#customer-gstin");
  const stateBox = document.querySelector("#customer-state");
  let gstStates = [];

  async function loadGstStates() {
    if (gstStates.length || !stateBox) return;
    try {
      const res = await fetch("/api/gst/states");
      const d = await res.json();
      if (d.ok && Array.isArray(d.states)) {
        gstStates = d.states;
        stateBox.replaceChildren();
        for (const s of gstStates) {
          const opt = document.createElement("option");
          opt.value = s.code;
          opt.textContent = `${s.code} - ${s.name}`;
          stateBox.append(opt);
        }
        stateBox.value = "29";
      }
    } catch (e) {
      console.warn("Failed to load GST states", e);
    }
  }

  if (gstinBox) {
    gstinBox.addEventListener("input", () => {
      const g = gstinBox.value.trim();
      if (g.length >= 2) {
        const prefix = g.slice(0, 2);
        if (stateBox && gstStates.some(s => s.code === prefix)) {
          stateBox.value = prefix;
        }
      }
    });
  }
  const lineBody = document.querySelector("#customer-lines");
  const nameList = document.querySelector("#customer-names");
  const countLabel = document.querySelector("#customer-count");
  const showInactive = document.querySelector("#customer-show-inactive");
  const newButton = document.querySelector("#customer-new");
  const saveButton = document.querySelector("#customer-save");
  const modifyButton = document.querySelector("#customer-modify");
  const deleteButton = document.querySelector("#customer-delete");
  const eouButton = document.querySelector("#customer-eou");
  const status = document.querySelector("#customer-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const columns = ["slNo", "name", "addr1", "addr2", "city", "country", "phone", "tin", "ce"];

  let customers = [];
  let types = [];
  let nextId = 1;
  let mode = "new";
  let rightLevel = null;
  let title = "";
  let place = -1;
  let lines = [];

  function showInfo(message) {
    infoTitle.textContent = title || "Tamba ERP";
    infoText.textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function askYesNo(message) {
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

  function byte() {
    return rightLevel == null ? null : (Number(rightLevel) & 255);
  }

  function applyViewButtons() {
    saveButton.disabled = true;
    newButton.disabled = false;
    deleteButton.disabled = false;
    modifyButton.disabled = false;
    const level = byte();
    if (level === 7) deleteButton.disabled = true;
    else if (level === 3) {
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    } else if (level === 1 || level === 0) {
      newButton.disabled = true;
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    }
  }

  function applyNewButtons() {
    saveButton.disabled = false;
    newButton.disabled = true;
    deleteButton.disabled = true;
    modifyButton.disabled = true;
    const level = byte();
    if (level === 1 || level === 0) saveButton.disabled = true;
  }

  function blankLine() {
    return { slNo: "", name: "", addr1: "", addr2: "", city: "", country: "", phone: "", tin: "", ce: "" };
  }

  function readLines() {
    return [...lineBody.querySelectorAll("tr")].map((row) => {
      const line = {};
      columns.forEach((key) => {
        line[key] = row.querySelector(`[data-key="${key}"]`).value;
      });
      return line;
    });
  }

  function renderLines() {
    const source = lines.slice();
    const last = source[source.length - 1];
    if (!last || last.name.trim()) source.push(blankLine());
    lineBody.replaceChildren();
    source.forEach((line, index) => {
      const row = document.createElement("tr");
      columns.forEach((key) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.dataset.key = key;
        input.value = key === "slNo" ? String(index + 1) : (line[key] || "");
        if (key === "slNo") input.readOnly = true;
        input.addEventListener("input", () => {
          lockNewDelete();
          if (key !== "name" || row !== lineBody.lastElementChild || !input.value.trim()) return;
          appendBlank();
        });
        cell.append(input);
        row.append(cell);
      });
      lineBody.append(row);
    });
  }

  function appendBlank() {
    const index = lineBody.children.length;
    const row = document.createElement("tr");
    columns.forEach((key) => {
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.dataset.key = key;
      input.value = key === "slNo" ? String(index + 1) : "";
      if (key === "slNo") input.readOnly = true;
      input.addEventListener("input", () => {
        lockNewDelete();
        if (key !== "name" || row !== lineBody.lastElementChild || !input.value.trim()) return;
        appendBlank();
      });
      cell.append(input);
      row.append(cell);
    });
    lineBody.append(row);
  }

  function visibleCustomers() {
    return customers.filter((row) => showInactive.checked ? row.inactive : !row.inactive);
  }

  function renderNames() {
    const rows = visibleCustomers().slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    nameList.replaceChildren();
    for (const row of rows) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
    countLabel.textContent = String(rows.length);
  }

  function fillTypes() {
    const current = typeBox.value;
    typeBox.replaceChildren();
    typeBox.append(new Option("", ""));
    for (const row of types) typeBox.append(new Option(row.name, String(row.id)));
    typeBox.value = current;
  }

  function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  }

  function showCustomer(row) {
    mode = "edit";
    idBox.value = String(row.id);
    nameBox.value = row.name;
    inactiveBox.checked = row.inactive;
    addrBox.value = row.addr;
    kstBox.value = row.kst;
    cstBox.value = row.cst;
    tinBox.value = row.tin;
    vendBox.value = row.vend;
    phoneBox.value = row.phone;
    emailBox.value = row.email;
    typeBox.value = row.busiType == null ? "" : String(row.busiType);
    balBox.value = money(row.openBal);
    balBox.disabled = Number(row.openBal) !== Number(row.openBalPndg);
    contactBox.value = row.contact;
    scopeBox.value = row.scope;
    rngBox.value = row.rng;
    diviBox.value = row.divi;
    commissionBox.value = row.commission;
    ceBox.value = row.ce;
    if (gstinBox) gstinBox.value = row.gstin || "";
    if (stateBox) stateBox.value = row.stateCode || "29";
    lines = (row.lines || []).map((line) => Object.assign(blankLine(), line));
    renderLines();
    place = customers.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    eouButton.hidden = false;
    applyViewButtons();
  }

  function startNew() {
    mode = "new";
    idBox.value = String(nextId);
    nameBox.value = "";
    inactiveBox.checked = false;
    addrBox.value = "";
    kstBox.value = "";
    cstBox.value = "";
    tinBox.value = "";
    vendBox.value = "";
    phoneBox.value = "";
    emailBox.value = "";
    typeBox.value = "";
    balBox.value = "";
    balBox.disabled = false;
    contactBox.value = "";
    scopeBox.value = "";
    rngBox.value = "";
    diviBox.value = "";
    commissionBox.value = "";
    ceBox.value = "";
    if (gstinBox) gstinBox.value = "";
    if (stateBox) stateBox.value = "29";
    lines = [];
    renderLines();
    eouButton.hidden = true;
    applyNewButtons();
    nameBox.focus();
  }

  function showPlace(index) {
    if (!customers.length || index < 0 || index >= customers.length) return;
    showCustomer(customers[index]);
  }

  async function loadCustomer(which) {
    await loadGstStates();
    const response = await fetch("/api/customer");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Sign in again.";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    types = data.types || [];
    customers = data.customers || [];
    nextId = data.nextId || 1;
    fillTypes();
    renderNames();
    panel.hidden = false;
    if (!customers.length) {
      place = -1;
      startNew();
      if (which === "open") showInfo("No Records to Display!");
      return;
    }
    if (which === "first") showPlace(0);
    else if (which === "same") {
      const found = customers.findIndex((row) => String(row.id) === idBox.value);
      showPlace(found === -1 ? customers.length - 1 : found);
    } else if (typeof which === "number") {
      const found = customers.findIndex((row) => row.id === which);
      showPlace(found === -1 ? customers.length - 1 : found);
    } else showPlace(customers.length - 1);
  }

  function payload(confirmed) {
    return {
      mode, confirmed, id: Number(idBox.value), name: nameBox.value, addr: addrBox.value,
      inactive: inactiveBox.checked, kst: kstBox.value, cst: cstBox.value, tin: tinBox.value,
      vend: vendBox.value, phone: phoneBox.value, email: emailBox.value, busiType: typeBox.value,
      openBal: balBox.value, openBalLocked: balBox.disabled, contact: contactBox.value,
      scope: scopeBox.value, rng: rngBox.value, divi: diviBox.value, commission: commissionBox.value,
      ce: ceBox.value,
      gstin: gstinBox ? gstinBox.value.trim() : "",
      stateCode: stateBox ? stateBox.value : "29",
      stateName: stateBox && stateBox.selectedOptions[0] ? stateBox.selectedOptions[0].textContent.replace(/^\d+\s*-\s*/, '') : "Karnataka",
      lines: readLines()
    };
  }

  async function saveCustomer() {
    let response = await fetch("/api/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      else if (data.error) status.textContent = data.error;
      return;
    }
    const question = mode === "edit" ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!await askYesNo(question)) return;
    response = await fetch("/api/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true))
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      else if (data.error) status.textContent = data.error;
      return;
    }
    showInactive.checked = false;
    await loadCustomer(data.id || "last");
    showInfo(data.message);
  }

  async function deleteCustomer() {
    const body = { id: Number(idBox.value), name: nameBox.value, confirmed: false };
    let response = await fetch("/api/customer/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    if (!await askYesNo("Are You Sure To Delete ?")) return;
    body.confirmed = true;
    response = await fetch("/api/customer/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadCustomer("first");
    showInfo(data.message);
  }

  function lockNewDelete() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  [nameBox, addrBox, kstBox, cstBox, tinBox, vendBox, phoneBox, emailBox, contactBox, scopeBox, rngBox, diviBox, commissionBox, ceBox, balBox].forEach((box) => {
    box.addEventListener("keydown", (event) => {
      lockNewDelete();
      if (event.key === "Enter" && box === balBox) {
        event.preventDefault();
        contactBox.focus();
      }
    });
  });

  nameList.addEventListener("click", () => {
    const row = customers.find((item) => String(item.id) === nameList.value);
    if (row) showCustomer(row);
  });
  showInactive.addEventListener("change", renderNames);
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveCustomer);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveCustomer();
  });
  deleteButton.addEventListener("click", deleteCustomer);
  document.querySelector("#customer-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#customer-last").addEventListener("click", () => showPlace(customers.length - 1));
  document.querySelector("#customer-next").addEventListener("click", () => {
    if (!customers.length || place < 0) return;
    showPlace(place + 1 >= customers.length ? 0 : place + 1);
  });
  document.querySelector("#customer-prev").addEventListener("click", () => {
    if (!customers.length || place < 0) return;
    showPlace(place - 1 < 0 ? customers.length - 1 : place - 1);
  });
  eouButton.addEventListener("click", () => {
    status.textContent = "Form: frmEOUMaster. This screen is not built yet.";
  });
  document.querySelector("#customer-close").addEventListener("click", closeCustomer);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasGenCust.htm. That page is not in this copy.";
  });

  function closeCustomer() {
    panel.hidden = true;
  }

  window.openCustomer = function openCustomer() {
    document.querySelector("#notice").hidden = true;
    document.querySelector("#popup").hidden = true;
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeShift) window.closeShift();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeMachine) window.closeMachine();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    showInactive.checked = false;
    loadCustomer("open");
  };
  window.closeCustomer = closeCustomer;
})();
