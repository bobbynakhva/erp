(() => {
  const panel = document.querySelector("#category");
  const codeBox = document.querySelector("#category-code");
  const nameBox = document.querySelector("#category-name");
  const descBox = document.querySelector("#category-desc");
  const nameList = document.querySelector("#category-names");
  const newButton = document.querySelector("#category-new");
  const saveButton = document.querySelector("#category-save");
  const modifyButton = document.querySelector("#category-modify");
  const deleteButton = document.querySelector("#category-delete");
  const status = document.querySelector("#category-status");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let categories = [];
  let nextId = 1;
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

  function renderNames() {
    const selected = nameList.value;
    nameList.replaceChildren();
    const ordered = categories.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const row of ordered) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.name;
      nameList.append(option);
    }
    if (selected) nameList.value = selected;
  }

  function showCategory(row) {
    mode = "edit";
    codeBox.value = String(row.id);
    nameBox.value = row.name;
    descBox.value = row.desc;
    place = categories.findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    applyViewButtons();
  }

  function showPlace(index) {
    if (!categories.length) return;
    showCategory(categories[index]);
  }

  function startEmpty() {
    mode = "view";
    place = -1;
    codeBox.value = "";
    nameBox.value = "";
    descBox.value = "";
    renderNames();
    applyViewButtons();
  }

  function startNew() {
    mode = "new";
    place = -1;
    codeBox.value = String(nextId);
    nameBox.value = "";
    descBox.value = "";
    nameList.selectedIndex = -1;
    applyNewButtons();
    nameBox.focus();
  }

  async function loadCategory(after) {
    const response = await fetch("/api/category");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    nextId = data.nextId || 1;
    categories = data.categories || [];
    if (after === "open") {
      panel.hidden = false;
      if (categories.length) showCategory(categories[0]);
      else startEmpty();
      return;
    }
    if (typeof after === "number") {
      const row = categories.find((item) => item.id === after);
      if (row) showCategory(row);
      else if (categories.length) showCategory(categories[0]);
      else startEmpty();
      return;
    }
    if (categories.length) showCategory(categories[0]);
    else startEmpty();
  }

  function payload() {
    return {
      mode,
      id: Number(codeBox.value),
      name: nameBox.value,
      desc: descBox.value
    };
  }

  async function saveCategory() {
    const body = payload();
    const first = await fetch("/api/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!preview.ready) return;
    const question = mode === "edit" ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!await askYesNo(question)) return;
    const second = await fetch("/api/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok && data.id) await loadCategory(data.id);
  }

  async function deleteCategory() {
    const body = { id: Number(codeBox.value), name: nameBox.value };
    const first = await fetch("/api/category/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!preview.ready) return;
    if (!await askYesNo("Are You Sure To Delete ?")) return;
    const second = await fetch("/api/category/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) await loadCategory("first");
  }

  function markTyped() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  nameBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const selected = nameList.selectedOptions[0];
    if (selected) nameBox.value = selected.textContent;
    descBox.focus();
  });
  descBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (!descBox.value.endsWith("\n")) return;
    event.preventDefault();
    if (!saveButton.disabled) saveButton.focus();
    else modifyButton.focus();
  });
  nameBox.addEventListener("input", markTyped);
  descBox.addEventListener("input", markTyped);
  nameList.addEventListener("click", () => {
    const row = categories.find((item) => String(item.id) === nameList.value);
    if (row) showCategory(row);
  });
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveCategory);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveCategory();
  });
  deleteButton.addEventListener("click", deleteCategory);
  document.querySelector("#category-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#category-last").addEventListener("click", () => showPlace(categories.length - 1));
  document.querySelector("#category-next").addEventListener("click", () => {
    if (!categories.length || place < 0) return;
    showPlace(place + 1 >= categories.length ? 0 : place + 1);
  });
  document.querySelector("#category-prev").addEventListener("click", () => {
    if (!categories.length || place < 0) return;
    showPlace(place - 1 < 0 ? categories.length - 1 : place - 1);
  });
  document.querySelector("#category-close").addEventListener("click", closeCategory);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasInvcat.htm. That page is not in this copy.";
  });

  function closeCategory() {
    panel.hidden = true;
  }

  window.openCategory = function openCategory() {
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
    if (window.closeItem) window.closeItem();
    status.textContent = "";
    loadCategory("open");
  };
  window.closeCategory = closeCategory;
})();
