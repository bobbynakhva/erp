(() => {
  const panel = document.querySelector("#stores");
  const nameBox = document.querySelector("#store-name");
  const descBox = document.querySelector("#store-desc");
  const addableBox = document.querySelector("#store-addable");
  const issuableBox = document.querySelector("#store-issuable");
  const nameList = document.querySelector("#store-names");
  const countLabel = document.querySelector("#store-count");
  const newButton = document.querySelector("#store-new");
  const saveButton = document.querySelector("#store-save");
  const modifyButton = document.querySelector("#store-modify");
  const deleteButton = document.querySelector("#store-delete");
  const status = document.querySelector("#store-status");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let stores = [];
  let nextId = 1;
  let currentId = 0;
  let mode = "view";
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

  function markTyped() {
    if (mode === "view") return;
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  function renderNames() {
    const selected = nameList.value;
    nameList.replaceChildren();
    const ordered = stores.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const row of ordered) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
    countLabel.textContent = String(stores.length);
    if (selected) nameList.value = selected;
  }

  function showStore(row) {
    mode = "edit";
    currentId = row.id;
    nameBox.value = row.name;
    descBox.value = row.desc;
    addableBox.checked = row.addable;
    issuableBox.checked = row.issuable;
    place = stores.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function showPlace(index) {
    if (!stores.length) return;
    const next = index < 0 ? stores.length - 1 : index % stores.length;
    showStore(stores[next]);
  }

  function startNew() {
    mode = "new";
    place = -1;
    currentId = nextId;
    nameBox.value = "";
    descBox.value = "";
    addableBox.checked = true;
    issuableBox.checked = true;
    nameList.selectedIndex = -1;
    renderNames();
    applyNewButtons();
    nameBox.focus();
  }

  async function loadStores(reason) {
    const response = await fetch("/api/store");
    if (!response.ok) {
      panel.hidden = true;
      return;
    }
    const data = await response.json();
    stores = data.stores || [];
    nextId = data.nextId || 1;
    rightLevel = data.right;
    title = data.title || "";
    panel.hidden = false;
    if (!stores.length) {
      startNew();
      if (reason === "open") showInfo("No Records to Display!");
      return;
    }
    if (reason === "saved") showStore(stores[stores.length - 1]);
    else if (reason === "first") showStore(stores[0]);
    else if (place >= 0 && stores[place]) showStore(stores[place]);
    else showStore(stores[stores.length - 1]);
  }

  async function saveStore() {
    const saving = mode === "new" || !saveButton.disabled;
    const payload = {
      mode: mode === "new" ? "new" : "edit",
      id: currentId,
      name: nameBox.value,
      desc: descBox.value,
      addable: addableBox.checked,
      issuable: issuableBox.checked,
      confirmed: false
    };
    const probe = await fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const first = await probe.json();
    if (!first.ok) {
      showInfo(first.message || "Sign in again.");
      if (first.message && (first.message.indexOf("Store Name") >= 0 || first.message.indexOf("Already Exists") >= 0)) nameBox.focus();
      if (first.message && first.message.indexOf("Issuable") >= 0) issuableBox.focus();
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo(saving ? "Are You Sure To Save ?" : "Are You Sure To Modify ?");
    if (!yes) return;
    payload.confirmed = true;
    const response = await fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) {
      showInfo(data.message || "Sign in again.");
      return;
    }
    showInfo(data.message);
    await loadStores(mode === "new" ? "saved" : "stay");
  }

  async function deleteStore() {
    const probe = await fetch("/api/store/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, confirmed: false })
    });
    const first = await probe.json();
    if (!first.ok) {
      showInfo(first.message || "Sign in again.");
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo("Are You Sure To Delete ?");
    if (!yes) return;
    const response = await fetch("/api/store/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, confirmed: true })
    });
    const data = await response.json();
    if (!data.ok) {
      showInfo(data.message || "Sign in again.");
      return;
    }
    showInfo(data.message);
    await loadStores("first");
  }

  nameBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (nameList.selectedIndex >= 0 && nameList.value) {
      const row = stores.find((item) => String(item.id) === nameList.value);
      if (row) nameBox.value = row.name;
    }
    descBox.focus();
  });
  nameBox.addEventListener("input", markTyped);
  descBox.addEventListener("input", markTyped);
  nameList.addEventListener("click", () => {
    const row = stores.find((item) => String(item.id) === nameList.value);
    if (row) showStore(row);
  });
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveStore);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveButton.disabled = true;
    saveStore();
  });
  deleteButton.addEventListener("click", deleteStore);
  document.querySelector("#store-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#store-last").addEventListener("click", () => showPlace(stores.length - 1));
  document.querySelector("#store-next").addEventListener("click", () => showPlace(place + 1));
  document.querySelector("#store-prev").addEventListener("click", () => showPlace(place - 1));
  document.querySelector("#store-close").addEventListener("click", closeStore);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    showInfo("Help not available");
  });

  function closeStore() {
    panel.hidden = true;
  }

  window.openStore = function openStore() {
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
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
    if (window.closeItem) window.closeItem();
    status.textContent = "";
    loadStores("open");
    panel.hidden = false;
  };

  window.closeStore = closeStore;
})();
