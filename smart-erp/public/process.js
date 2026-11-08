(() => {
  const panel = document.querySelector("#process");
  const nameBox = document.querySelector("#process-name");
  const rateBox = document.querySelector("#process-rate");
  const nameList = document.querySelector("#process-names");
  const countLabel = document.querySelector("#process-count");
  const newButton = document.querySelector("#process-new");
  const saveButton = document.querySelector("#process-save");
  const modifyButton = document.querySelector("#process-modify");
  const deleteButton = document.querySelector("#process-delete");
  const status = document.querySelector("#process-status");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let processes = [];
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
    applyMatrix();
  }

  function applyMatrix() {
    const level = byte();
    if (level === 12) {
      saveButton.disabled = true;
      newButton.disabled = false;
      deleteButton.disabled = false;
      modifyButton.disabled = false;
    } else if (level === 7) {
      saveButton.disabled = true;
      newButton.disabled = false;
      deleteButton.disabled = true;
      modifyButton.disabled = false;
    } else if (level === 3) {
      saveButton.disabled = true;
      newButton.disabled = false;
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    } else if (level === 1 || level === 0) {
      saveButton.disabled = true;
      newButton.disabled = true;
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    }
  }

  function renderNames() {
    const selected = nameList.value;
    nameList.replaceChildren();
    const ordered = processes.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const row of ordered) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
    countLabel.textContent = String(processes.length);
    if (selected) nameList.value = selected;
  }

  function highlightPrefix() {
    const typed = nameBox.value.toUpperCase();
    if (!typed) {
      nameList.selectedIndex = -1;
      return;
    }
    const match = [...nameList.options].findIndex((option) => option.textContent.toUpperCase().slice(0, typed.length) === typed);
    nameList.selectedIndex = match;
  }

  function showProcess(row) {
    mode = "edit";
    currentId = row.id;
    nameBox.value = row.name;
    rateBox.value = row.rate;
    place = processes.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function showPlace(index) {
    if (!processes.length) return;
    const next = index < 0 ? processes.length - 1 : index % processes.length;
    showProcess(processes[next]);
  }

  function startNew() {
    mode = "new";
    place = -1;
    currentId = nextId;
    nameBox.value = "";
    rateBox.value = "";
    nameList.selectedIndex = -1;
    renderNames();
    newButton.disabled = true;
    saveButton.disabled = false;
    deleteButton.disabled = true;
    modifyButton.disabled = true;
    const level = byte();
    if (level === 1 || level === 0) saveButton.disabled = true;
    nameBox.focus();
  }

  function clearAfterDelete() {
    mode = "view";
    place = -1;
    currentId = 0;
    nameBox.value = "";
    rateBox.value = "";
    renderNames();
    applyViewButtons();
  }

  async function loadProcesses(reason) {
    const response = await fetch("/api/process");
    if (!response.ok) {
      panel.hidden = true;
      return;
    }
    const data = await response.json();
    processes = data.processes || [];
    nextId = data.nextId || 1;
    rightLevel = data.right;
    title = data.title || "";
    panel.hidden = false;
    if (!processes.length) {
      if (reason === "open") {
        startNew();
        showInfo("No Records to Display!");
      } else if (reason === "deleted") clearAfterDelete();
      else startNew();
      return;
    }
    if (reason === "added") {
      renderNames();
      const row = processes.find((item) => item.id === currentId);
      if (row) nameList.value = String(row.id);
      applyMatrix();
      return;
    }
    if (reason === "first" || reason === "deleted") showProcess(processes[0]);
    else if (place >= 0 && processes[place]) showProcess(processes[place]);
    else showProcess(processes[processes.length - 1]);
  }

  async function saveProcess() {
    const saving = mode === "new";
    const payload = {
      mode: saving ? "new" : "edit",
      id: currentId,
      name: nameBox.value,
      rate: rateBox.value,
      confirmed: false
    };
    const probe = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const first = await probe.json();
    if (!first.ok) {
      if (first.message) showInfo(first.message);
      if (first.message && first.message.indexOf("Process Name") >= 0) nameBox.focus();
      if (first.message && first.message.indexOf("HourlyRate") >= 0) rateBox.focus();
      if (first.message && first.message.indexOf("Already Exists") >= 0) nameBox.focus();
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo(saving ? "Are You Sure To Save" : "Are You Sure To Modify");
    if (!yes) return;
    payload.confirmed = true;
    const response = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    if (data.id) currentId = data.id;
    showInfo(data.message);
    await loadProcesses(saving ? "added" : "stay");
  }

  async function deleteProcess() {
    const probe = await fetch("/api/process/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, confirmed: false })
    });
    const first = await probe.json();
    if (!first.ok) {
      if (first.message) showInfo(first.message);
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo("Are You Sure To Delete");
    if (!yes) return;
    const response = await fetch("/api/process/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, confirmed: true })
    });
    const data = await response.json();
    if (!data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    showInfo(data.message);
    await loadProcesses("deleted");
  }

  nameBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (nameList.selectedIndex >= 0) nameBox.value = nameList.options[nameList.selectedIndex].textContent;
    rateBox.focus();
  });
  nameBox.addEventListener("input", highlightPrefix);
  rateBox.addEventListener("keydown", (event) => {
    newButton.disabled = true;
    deleteButton.disabled = true;
    if (event.key === "Enter") {
      event.preventDefault();
      if (!saveButton.disabled) saveButton.focus();
      else if (!modifyButton.disabled) modifyButton.focus();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      nameBox.focus();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete" || event.key === "Tab" || event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") return;
    if (event.key === "." && rateBox.value.indexOf(".") < 0) return;
    if (event.key.length === 1 && event.key >= "0" && event.key <= "9") return;
    event.preventDefault();
  });
  nameList.addEventListener("click", () => {
    const row = processes.find((item) => String(item.id) === nameList.value);
    if (row) showProcess(row);
  });
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveProcess);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveProcess();
  });
  deleteButton.addEventListener("click", deleteProcess);
  document.querySelector("#process-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#process-last").addEventListener("click", () => showPlace(processes.length - 1));
  document.querySelector("#process-next").addEventListener("click", () => showPlace(place + 1));
  document.querySelector("#process-prev").addEventListener("click", () => showPlace(place - 1));
  document.querySelector("#process-close").addEventListener("click", closeProcess);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasProcess.htm. That page is not in this copy.";
  });

  function closeProcess() {
    panel.hidden = true;
  }

  window.openProcess = function openProcess() {
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
    loadProcesses("open");
    panel.hidden = false;
  };

  window.closeProcess = closeProcess;
})();
