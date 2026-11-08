(() => {
  const panel = document.querySelector("#vendor");
  const idBox = document.querySelector("#vendor-id");
  const nameBox = document.querySelector("#vendor-name");
  const inactiveBox = document.querySelector("#vendor-inactive");
  const addrBox = document.querySelector("#vendor-addr");
  const kstBox = document.querySelector("#vendor-kst");
  const cstBox = document.querySelector("#vendor-cst");
  const tinBox = document.querySelector("#vendor-tin");
  const codeBox = document.querySelector("#vendor-code");
  const phoneBox = document.querySelector("#vendor-phone");
  const emailBox = document.querySelector("#vendor-email");
  const typeBox = document.querySelector("#vendor-type");
  const balBox = document.querySelector("#vendor-bal");
  const contactBox = document.querySelector("#vendor-contact");
  const scopeBox = document.querySelector("#vendor-scope");
  const rngBox = document.querySelector("#vendor-rng");
  const diviBox = document.querySelector("#vendor-divi");
  const commissionBox = document.querySelector("#vendor-commission");
  const ceBox = document.querySelector("#vendor-ce");
  const gstinBox = document.querySelector("#vendor-gstin");
  const stateBox = document.querySelector("#vendor-state");
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
  const lineBody = document.querySelector("#vendor-lines");
  const nameList = document.querySelector("#vendor-names");
  const countLabel = document.querySelector("#vendor-count");
  const showInactive = document.querySelector("#vendor-show-inactive");
  const newButton = document.querySelector("#vendor-new");
  const saveButton = document.querySelector("#vendor-save");
  const modifyButton = document.querySelector("#vendor-modify");
  const deleteButton = document.querySelector("#vendor-delete");
  const eouButton = document.querySelector("#vendor-eou");
  const status = document.querySelector("#vendor-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const columns = ["slNo", "name", "addr1", "addr2", "city", "country", "phone", "tin", "ce"];
  const fields = [nameBox, addrBox, kstBox, cstBox, tinBox, codeBox, phoneBox, emailBox, typeBox, balBox, contactBox, scopeBox, rngBox, diviBox, commissionBox, ceBox];

  let vendors = [];
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

  function lockFields(locked) {
    fields.forEach((box) => { box.disabled = locked; });
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

  function visibleVendors() {
    return vendors.filter((row) => showInactive.checked ? row.inactive : !row.inactive);
  }

  function renderNames() {
    const rows = visibleVendors().slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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

  function showVendor(row) {
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
    contactBox.value = row.contact;
    scopeBox.value = row.scope;
    rngBox.value = row.rng;
    diviBox.value = row.divi;
    commissionBox.value = row.commission;
    ceBox.value = row.ce;
    if (gstinBox) gstinBox.value = row.gstin || "";
    if (stateBox) stateBox.value = row.stateCode || "29";
    lockFields(row.inactive === true);
    lines = (row.lines || []).map((line) => Object.assign(blankLine(), line));
    renderLines();
    place = vendors.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    eouButton.hidden = false;
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
    contactBox.value = "";
    scopeBox.value = "";
    rngBox.value = "";
    diviBox.value = "";
    commissionBox.value = "";
    ceBox.value = "";
    if (gstinBox) gstinBox.value = "";
    if (stateBox) stateBox.value = "29";
    lockFields(false);
    lines = [];
    renderLines();
    eouButton.hidden = true;
    applyNewButtons();
    nameBox.focus();
  }

  function showPlace(index) {
    if (!vendors.length || index < 0 || index >= vendors.length) return;
    showVendor(vendors[index]);
  }

  function clearInactiveFilter() {
    showInactive.checked = false;
    renderNames();
  }

  async function loadVendor(which) {
    await loadGstStates();
    const response = await fetch("/api/vendor");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Sign in again.";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    types = data.types || [];
    vendors = data.vendors || [];
    nextId = data.nextId || 1;
    fillTypes();
    renderNames();
    panel.hidden = false;
    if (!vendors.length) {
      place = -1;
      startNew();
      if (which === "open") showInfo("No Records to Display!");
      return;
    }
    if (which === "first") showPlace(0);
    else if (which === "same") {
      const found = vendors.findIndex((row) => String(row.id) === idBox.value);
      showPlace(found === -1 ? vendors.length - 1 : found);
    } else if (typeof which === "number") {
      const found = vendors.findIndex((row) => row.id === which);
      showPlace(found === -1 ? vendors.length - 1 : found);
    } else showPlace(vendors.length - 1);
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
      stateName: stateBox && stateBox.selectedOptions[0] ? stateBox.selectedOptions[0].textContent.replace(/^\d+\s*-\s*/, '') : "Karnataka",
      lines: readLines()
    };
  }

  async function saveVendor() {
    let response = await fetch("/api/vendor", {
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
    response = await fetch("/api/vendor", {
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
    await loadVendor(data.id || "last");
    showInfo(data.message);
  }

  async function deleteVendor() {
    const body = { id: Number(idBox.value), name: nameBox.value, confirmed: false };
    let response = await fetch("/api/vendor/delete", {
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
    response = await fetch("/api/vendor/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadVendor("first");
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
    const row = vendors.find((item) => String(item.id) === nameList.value);
    if (row) showVendor(row);
  });
  showInactive.addEventListener("change", renderNames);
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveVendor);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveVendor();
  });
  deleteButton.addEventListener("click", deleteVendor);
  document.querySelector("#vendor-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#vendor-last").addEventListener("click", () => showPlace(vendors.length - 1));
  document.querySelector("#vendor-next").addEventListener("click", () => {
    if (!vendors.length || place < 0) return;
    showPlace(place + 1 >= vendors.length ? 0 : place + 1);
  });
  document.querySelector("#vendor-prev").addEventListener("click", () => {
    if (!vendors.length || place < 0) return;
    showPlace(place - 1 < 0 ? vendors.length - 1 : place - 1);
  });
  eouButton.addEventListener("click", () => {
    status.textContent = "Form: frmEOUMaster. This screen is not built yet.";
  });
  document.querySelector("#vendor-close").addEventListener("click", closeVendor);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasGenVend.htm. That page is not in this copy.";
  });

  function closeVendor() {
    panel.hidden = true;
  }

  window.openVendor = function openVendor() {
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
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    inactiveBox.checked = false;
    showInactive.checked = false;
    loadVendor("open");
  };
  window.closeVendor = closeVendor;
})();
