(() => {
  const panel = document.querySelector("#expense");
  const nameBox = document.querySelector("#expense-name");
  const descBox = document.querySelector("#expense-desc");
  const directBox = document.querySelector("#expense-direct");
  const indirectBox = document.querySelector("#expense-indirect");
  const nameList = document.querySelector("#expense-names");
  const newButton = document.querySelector("#expense-new");
  const saveButton = document.querySelector("#expense-save");
  const modifyButton = document.querySelector("#expense-modify");
  const deleteButton = document.querySelector("#expense-delete");
  const status = document.querySelector("#expense-status");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let expenses = [];
  let nextId = 5;
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

  function locked() {
    return currentId >= 1 && currentId <= 4;
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
    const ordered = expenses.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const row of ordered) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
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

  function showExpense(row) {
    mode = "edit";
    currentId = row.id;
    nameBox.value = row.name;
    descBox.value = row.desc;
    directBox.checked = row.direct;
    indirectBox.checked = !row.direct;
    place = expenses.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function showPlace(index) {
    if (!expenses.length) return;
    const next = index < 0 ? expenses.length - 1 : index % expenses.length;
    showExpense(expenses[next]);
  }

  function startNew() {
    mode = "new";
    place = -1;
    currentId = nextId;
    nameBox.value = "";
    descBox.value = "";
    directBox.checked = true;
    indirectBox.checked = false;
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

  async function loadExpenses(reason) {
    const response = await fetch("/api/expense");
    if (!response.ok) {
      panel.hidden = true;
      return;
    }
    const data = await response.json();
    expenses = data.expenses || [];
    nextId = data.nextId || 5;
    rightLevel = data.right;
    title = data.title || "";
    panel.hidden = false;
    if (!expenses.length) {
      if (reason === "open") {
        startNew();
        showInfo("No Records to Display!");
      } else if (reason === "deleted") startNew();
      else startNew();
      return;
    }
    if (reason === "added") {
      renderNames();
      const row = expenses.find((item) => item.id === currentId);
      if (row) nameList.value = String(row.id);
      applyMatrix();
      return;
    }
    if (reason === "first" || reason === "deleted") showExpense(expenses[0]);
    else if (place >= 0 && expenses[place]) showExpense(expenses[place]);
    else showExpense(expenses[0]);
  }

  async function saveExpense() {
    if (mode === "edit" && locked()) {
      showInfo("This record cannot be Modified!!!");
      return;
    }
    const saving = mode === "new";
    const payload = {
      mode: saving ? "new" : "edit",
      id: currentId,
      name: nameBox.value,
      desc: descBox.value,
      direct: directBox.checked,
      confirmed: false
    };
    const probe = await fetch("/api/expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const first = await probe.json();
    if (!first.ok) {
      if (first.message) showInfo(first.message);
      if (first.message && first.message.indexOf("Expense Name") >= 0) nameBox.focus();
      if (first.message && first.message.indexOf("Already Exists") >= 0) nameBox.focus();
      return;
    }
    if (!first.ready) return;
    const yes = await askYesNo(saving ? "Are You Sure To Save ?" : "Are You Sure To Modify ?");
    if (!yes) return;
    payload.confirmed = true;
    const response = await fetch("/api/expense", {
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
    await loadExpenses(saving ? "added" : "stay");
  }

  async function deleteExpense() {
    const probe = await fetch("/api/expense/delete", {
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
    const yes = await askYesNo("Are You Sure To Delete ?");
    if (!yes) return;
    const response = await fetch("/api/expense/delete", {
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
    await loadExpenses("deleted");
  }

  function typingOff() {
    if (locked()) return;
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  nameBox.addEventListener("keydown", (event) => {
    if (locked()) {
      event.preventDefault();
      return;
    }
    typingOff();
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (nameList.selectedIndex >= 0) nameBox.value = nameList.options[nameList.selectedIndex].textContent;
    descBox.focus();
  });
  nameBox.addEventListener("input", () => {
    if (locked()) return;
    highlightPrefix();
  });
  descBox.addEventListener("keydown", (event) => {
    if (locked()) {
      event.preventDefault();
      return;
    }
    typingOff();
    if (event.key !== "Enter") return;
    if (!descBox.value.endsWith("\n")) return;
    event.preventDefault();
    if (!saveButton.disabled) saveButton.focus();
    else if (!modifyButton.disabled) modifyButton.focus();
  });
  nameList.addEventListener("click", () => {
    const row = expenses.find((item) => String(item.id) === nameList.value);
    if (row) showExpense(row);
  });
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveExpense);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveExpense();
  });
  deleteButton.addEventListener("click", deleteExpense);
  document.querySelector("#expense-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#expense-last").addEventListener("click", () => showPlace(expenses.length - 1));
  document.querySelector("#expense-next").addEventListener("click", () => showPlace(place + 1));
  document.querySelector("#expense-prev").addEventListener("click", () => showPlace(place - 1));
  document.querySelector("#expense-close").addEventListener("click", closeExpense);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasCHExpen.htm. That page is not in this copy.";
  });

  function closeExpense() {
    panel.hidden = true;
  }

  window.openExpense = function openExpense() {
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
    loadExpenses("open");
    panel.hidden = false;
  };

  window.closeExpense = closeExpense;
})();
