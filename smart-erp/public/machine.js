(() => {
  const panel = document.querySelector("#machine");
  const idBox = document.querySelector("#machine-id");
  const nameBox = document.querySelector("#machine-name");
  const rateBox = document.querySelector("#machine-rate");
  const capaBox = document.querySelector("#machine-capa");
  const accuBox = document.querySelector("#machine-accu");
  const modelBox = document.querySelector("#machine-model");
  const otherBox = document.querySelector("#machine-other");
  const nameList = document.querySelector("#machine-names");
  const countLabel = document.querySelector("#machine-count");
  const newButton = document.querySelector("#machine-new");
  const saveButton = document.querySelector("#machine-save");
  const modifyButton = document.querySelector("#machine-modify");
  const deleteButton = document.querySelector("#machine-delete");
  const status = document.querySelector("#machine-status");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let machines = [];
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

  function askYesNo(message, dialogTitle) {
    return new Promise((resolve) => {
      askTitle.textContent = dialogTitle || title || "Tamba ERP";
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

  function renderNames() {
    const selected = nameList.value;
    nameList.replaceChildren();
    const ordered = machines.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const row of ordered) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
    countLabel.textContent = String(machines.length);
    if (selected) nameList.value = selected;
  }

  function rateText(value) {
    if (value == null || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : "";
  }

  function showMachine(row) {
    mode = "edit";
    idBox.value = String(row.id);
    nameBox.value = row.name;
    rateBox.value = rateText(row.rate);
    capaBox.value = row.capa;
    accuBox.value = row.accu;
    modelBox.value = row.model;
    otherBox.value = row.other;
    place = machines.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function startNew() {
    mode = "new";
    idBox.value = String(nextId);
    nameBox.value = "";
    capaBox.value = "";
    accuBox.value = "";
    modelBox.value = "";
    otherBox.value = "";
    applyNewButtons();
    nameBox.focus();
  }

  function showPlace(index) {
    if (!machines.length || index < 0 || index >= machines.length) return;
    showMachine(machines[index]);
  }

  async function loadMachine(which) {
    const response = await fetch("/api/machine");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "Sign in again.";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    machines = data.machines || [];
    nextId = data.nextId || 1;
    renderNames();
    panel.hidden = false;
    if (!machines.length) {
      place = -1;
      if (which === "open") rateBox.value = "";
      startNew();
      if (which === "open") showInfo("No Records to Display!");
      return;
    }
    if (which === "first") showPlace(0);
    else if (which === "same") {
      const found = machines.findIndex((row) => String(row.id) === idBox.value);
      showPlace(found === -1 ? machines.length - 1 : found);
    } else showPlace(machines.length - 1);
  }

  function payload(confirmed) {
    return {
      mode,
      confirmed,
      id: Number(idBox.value),
      name: nameBox.value,
      rate: rateBox.value,
      capa: capaBox.value,
      accu: accuBox.value,
      model: modelBox.value,
      other: otherBox.value
    };
  }

  async function saveMachine() {
    let response = await fetch("/api/machine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    const question = mode === "edit" ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    const dialogTitle = mode === "edit" ? "Modification Confirmation" : title;
    if (!await askYesNo(question, dialogTitle)) return;
    response = await fetch("/api/machine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true))
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadMachine(mode === "edit" ? "same" : "last");
    showInfo(data.message);
  }

  async function deleteMachine() {
    const body = { id: Number(idBox.value), confirmed: false };
    let response = await fetch("/api/machine/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    if (!await askYesNo("Are You sure to delete this Machine with the Maintainance Schedules?")) return;
    body.confirmed = true;
    response = await fetch("/api/machine/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadMachine("first");
    showInfo(data.message);
  }

  function lockNewDelete() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  function onEnter(event, next) {
    lockNewDelete();
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (next) next.focus();
  }

  nameBox.addEventListener("keydown", (event) => {
    onEnter(event, rateBox);
    if (event.key === "Enter" && nameList.selectedIndex >= 0) {
      nameBox.value = nameList.options[nameList.selectedIndex].textContent;
    }
  });
  rateBox.addEventListener("keydown", (event) => {
    onEnter(event, capaBox);
    if (event.key === "Enter" || event.key === "Backspace" || event.key === "Delete" || event.key === "Tab" || event.key.startsWith("Arrow") || event.ctrlKey || event.metaKey) return;
    if (event.key >= "0" && event.key <= "9") return;
    if (event.key === "." && !rateBox.value.includes(".")) return;
    event.preventDefault();
  });
  capaBox.addEventListener("keydown", (event) => onEnter(event, accuBox));
  accuBox.addEventListener("keydown", (event) => onEnter(event, modelBox));
  modelBox.addEventListener("keydown", (event) => onEnter(event, otherBox));
  otherBox.addEventListener("keydown", lockNewDelete);

  nameList.addEventListener("click", () => {
    const row = machines.find((item) => String(item.id) === nameList.value);
    if (row) showMachine(row);
  });
  nameList.addEventListener("dblclick", () => {
    const row = machines.find((item) => String(item.id) === nameList.value);
    if (row) showMachine(row);
  });

  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveMachine);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveMachine();
  });
  deleteButton.addEventListener("click", deleteMachine);
  document.querySelector("#machine-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#machine-last").addEventListener("click", () => showPlace(machines.length - 1));
  document.querySelector("#machine-next").addEventListener("click", () => {
    if (!machines.length || place < 0) return;
    showPlace(place + 1 >= machines.length ? 0 : place + 1);
  });
  document.querySelector("#machine-prev").addEventListener("click", () => {
    if (!machines.length || place < 0) return;
    showPlace(place - 1 < 0 ? machines.length - 1 : place - 1);
  });
  document.querySelector("#machine-close").addEventListener("click", closeMachine);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasGenMach.htm. That page is not in this copy.";
  });

  function closeMachine() {
    panel.hidden = true;
  }

  window.openMachine = function openMachine() {
    document.querySelector("#notice").hidden = true;
    document.querySelector("#popup").hidden = true;
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeShift) window.closeShift();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    loadMachine("open");
  };
  window.closeMachine = closeMachine;
})();
