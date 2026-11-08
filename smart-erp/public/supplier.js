(() => {
  const panel = document.querySelector("#supplier");
  const idBox = document.querySelector("#supplier-id");
  const nameBox = document.querySelector("#supplier-name");
  const inactiveBox = document.querySelector("#supplier-inactive");
  const addrBox = document.querySelector("#supplier-addr");
  const kstBox = document.querySelector("#supplier-kst");
  const cstBox = document.querySelector("#supplier-cst");
  const tinBox = document.querySelector("#supplier-tin");
  const codeBox = document.querySelector("#supplier-code");
  const phoneBox = document.querySelector("#supplier-phone");
  const emailBox = document.querySelector("#supplier-email");
  const typeBox = document.querySelector("#supplier-type");
  const balBox = document.querySelector("#supplier-bal");
  const contactBox = document.querySelector("#supplier-contact");
  const scopeBox = document.querySelector("#supplier-scope");
  const rngBox = document.querySelector("#supplier-rng");
  const diviBox = document.querySelector("#supplier-divi");
  const commissionBox = document.querySelector("#supplier-commission");
  const ceBox = document.querySelector("#supplier-ce");
  const gstinBox = document.querySelector("#supplier-gstin");
  const stateBox = document.querySelector("#supplier-state");
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
  const nameList = document.querySelector("#supplier-names");
  const countLabel = document.querySelector("#supplier-count");
  const showInactive = document.querySelector("#supplier-show-inactive");
  const newButton = document.querySelector("#supplier-new");
  const saveButton = document.querySelector("#supplier-save");
  const modifyButton = document.querySelector("#supplier-modify");
  const deleteButton = document.querySelector("#supplier-delete");
  const status = document.querySelector("#supplier-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let suppliers = [];
  let types = [];
  let nextId = 1;
  let mode = "new";
  let rightLevel = null;
  let title = "";
  let place = -1;

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

  function visibleSuppliers() {
    return suppliers.filter((row) => showInactive.checked ? row.inactive : !row.inactive);
  }

  function renderNames() {
    const rows = visibleSuppliers().slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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
    typeBox.value = [...typeBox.options].some((option) => option.value === current) ? current : "";
  }

  function showBal(value) {
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : "0";
  }

  function showSupplier(row) {
    mode = "edit";
    idBox.value = String(row.id);
    nameBox.value = row.name;
    inactiveBox.checked = row.inactive;
    addrBox.value = row.addr;
    kstBox.value = row.kst;
    cstBox.value = row.cst;
    tinBox.value = row.tin;
    codeBox.value = row.code;
    phoneBox.value = row.phone;
    emailBox.value = row.email;
    typeBox.value = row.busiType == null ? "" : String(row.busiType);
    balBox.value = showBal(row.openBal);
    balBox.disabled = Number(row.openBal) !== Number(row.openBalPndg);
    contactBox.value = row.contact;
    scopeBox.value = row.scope;
    rngBox.value = row.rng;
    diviBox.value = row.divi;
    commissionBox.value = row.commission;
    ceBox.value = row.ce;
    if (gstinBox) gstinBox.value = row.gstin || "";
    if (stateBox) stateBox.value = row.stateCode || "29";
    place = suppliers.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function startNew() {
    mode = "new";
    idBox.value = String(nextId);
    nameBox.value = "";
    addrBox.value = "";
    kstBox.value = "";
    cstBox.value = "";
    tinBox.value = "";
    codeBox.value = "";
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
    applyNewButtons();
    nameBox.focus();
  }

  function showPlace(index) {
    if (!suppliers.length || index < 0 || index >= suppliers.length) return;
    showSupplier(suppliers[index]);
  }

  function clearInactiveFilter() {
    showInactive.checked = false;
    renderNames();
  }

  async function loadSupplier(which) {
    await loadGstStates();
    const response = await fetch("/api/supplier");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Sign in again.";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    types = data.types || [];
    suppliers = data.suppliers || [];
    nextId = data.nextId || 1;
    fillTypes();
    renderNames();
    panel.hidden = false;
    if (!suppliers.length) {
      place = -1;
      startNew();
      if (which === "open") showInfo("No Records to Display!");
      return;
    }
    if (which === "first") showPlace(0);
    else if (which === "same") {
      const found = suppliers.findIndex((row) => String(row.id) === idBox.value);
      showPlace(found === -1 ? suppliers.length - 1 : found);
    } else if (typeof which === "number") {
      const found = suppliers.findIndex((row) => row.id === which);
      showPlace(found === -1 ? suppliers.length - 1 : found);
    } else showPlace(suppliers.length - 1);
  }

  function payload(confirmed) {
    return {
      mode, confirmed, id: Number(idBox.value), name: nameBox.value, addr: addrBox.value,
      inactive: inactiveBox.checked, kst: kstBox.value, cst: cstBox.value, tin: tinBox.value,
      code: codeBox.value, phone: phoneBox.value, email: emailBox.value, busiType: typeBox.value,
      openBal: balBox.value, openBalLocked: balBox.disabled, contact: contactBox.value,
      scope: scopeBox.value, rng: rngBox.value, divi: diviBox.value, commission: commissionBox.value,
      ce: ceBox.value,
      gstin: gstinBox ? gstinBox.value.trim() : "",
      stateCode: stateBox ? stateBox.value : "29",
      stateName: stateBox && stateBox.selectedOptions[0] ? stateBox.selectedOptions[0].textContent.replace(/^\d+\s*-\s*/, '') : "Karnataka"
    };
  }

  async function saveSupplier() {
    let response = await fetch("/api/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let data = await response.json();
    if (!response.ok || !data.ok) {
      clearInactiveFilter();
      if (data.message) showInfo(data.message);
      else if (data.error) status.textContent = data.error;
      return;
    }
    const question = mode === "edit" ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!await askYesNo(question)) {
      clearInactiveFilter();
      return;
    }
    response = await fetch("/api/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true))
    });
    data = await response.json();
    clearInactiveFilter();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      else if (data.error) status.textContent = data.error;
      return;
    }
    await loadSupplier(data.id || "last");
    showInfo(data.message);
  }

  async function deleteSupplier() {
    const body = { id: Number(idBox.value), name: nameBox.value, confirmed: false };
    let response = await fetch("/api/supplier/delete", {
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
    response = await fetch("/api/supplier/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadSupplier("first");
    showInfo(data.message);
  }

  function lockNewDelete() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  function enterNext(event, next) {
    lockNewDelete();
    if (event.key !== "Enter") return;
    event.preventDefault();
    next.focus();
  }

  nameBox.addEventListener("keydown", (event) => {
    lockNewDelete();
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (nameList.selectedIndex >= 0) nameBox.value = nameList.options[nameList.selectedIndex].text;
    addrBox.focus();
  });
  addrBox.addEventListener("keydown", (event) => {
    lockNewDelete();
    if (event.key !== "Enter" || !addrBox.value.endsWith("\n")) return;
    event.preventDefault();
    kstBox.focus();
  });
  kstBox.addEventListener("keydown", (event) => enterNext(event, cstBox));
  cstBox.addEventListener("keydown", (event) => enterNext(event, tinBox));
  tinBox.addEventListener("keydown", (event) => enterNext(event, codeBox));
  codeBox.addEventListener("keydown", (event) => enterNext(event, phoneBox));
  phoneBox.addEventListener("keydown", (event) => enterNext(event, emailBox));
  emailBox.addEventListener("keydown", (event) => enterNext(event, typeBox));
  typeBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (balBox.disabled) contactBox.focus();
    else balBox.focus();
  });
  typeBox.addEventListener("change", () => {
    lockNewDelete();
    if (balBox.disabled) contactBox.focus();
    else balBox.focus();
  });
  balBox.addEventListener("keydown", (event) => enterNext(event, contactBox));
  contactBox.addEventListener("keydown", (event) => enterNext(event, scopeBox));
  scopeBox.addEventListener("keydown", (event) => {
    lockNewDelete();
    if (event.key !== "Enter" || !scopeBox.value.endsWith("\n")) return;
    event.preventDefault();
    rngBox.focus();
  });
  rngBox.addEventListener("keydown", (event) => enterNext(event, diviBox));
  diviBox.addEventListener("keydown", (event) => enterNext(event, commissionBox));
  commissionBox.addEventListener("keydown", (event) => enterNext(event, ceBox));
  ceBox.addEventListener("keydown", (event) => {
    lockNewDelete();
    if (event.key !== "Enter" || !scopeBox.value.endsWith("\n")) return;
    event.preventDefault();
    if (saveButton.disabled) modifyButton.focus();
    else saveButton.focus();
  });
  inactiveBox.addEventListener("change", lockNewDelete);

  nameList.addEventListener("click", () => {
    const row = suppliers.find((item) => String(item.id) === nameList.value);
    if (row) showSupplier(row);
  });
  showInactive.addEventListener("change", renderNames);
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveSupplier);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveSupplier();
  });
  deleteButton.addEventListener("click", deleteSupplier);
  document.querySelector("#supplier-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#supplier-last").addEventListener("click", () => showPlace(suppliers.length - 1));
  document.querySelector("#supplier-next").addEventListener("click", () => {
    if (!suppliers.length || place < 0) return;
    showPlace(place + 1 >= suppliers.length ? 0 : place + 1);
  });
  document.querySelector("#supplier-prev").addEventListener("click", () => {
    if (!suppliers.length || place < 0) return;
    showPlace(place - 1 < 0 ? suppliers.length - 1 : place - 1);
  });
  document.querySelector("#supplier-close").addEventListener("click", closeSupplier);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasGenSupp.htm. That page is not in this copy.";
  });

  function closeSupplier() {
    panel.hidden = true;
  }

  window.openSupplier = function openSupplier() {
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
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    inactiveBox.checked = false;
    showInactive.checked = false;
    loadSupplier("open");
  };
  window.closeSupplier = closeSupplier;
})();
