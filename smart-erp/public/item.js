(() => {
  const panel = document.querySelector("#item");
  const categoryList = document.querySelector("#item-categories");
  const changeBox = document.querySelector("#item-change");
  const changeList = document.querySelector("#item-change-list");
  const codeBox = document.querySelector("#item-code");
  const drgBox = document.querySelector("#item-drg");
  const nameBox = document.querySelector("#item-name");
  const detailBox = document.querySelector("#item-detail");
  const desnBox = document.querySelector("#item-desn");
  const rateBox = document.querySelector("#item-rate");
  const rolBox = document.querySelector("#item-rol");
  const rackBox = document.querySelector("#item-rack");
  const tariffBox = document.querySelector("#item-tariff");
  const tariffList = document.querySelector("#item-tariffs");
  const gstRateBox = document.querySelector("#item-gstrate");
  const cycleBox = document.querySelector("#item-cycle");
  const inactiveBox = document.querySelector("#item-inactive");
  const showHiddenBox = document.querySelector("#item-show-hidden");
  const measureBox = document.querySelector("#item-measure");
  const purchaseBox = document.querySelector("#item-purchase");
  const convertBox = document.querySelector("#item-convert");
  const equateRow = document.querySelector("#item-equate");
  const stockLabel = document.querySelector("#item-stock-label");
  const purchaseLabel = document.querySelector("#item-purchase-label");
  const nameList = document.querySelector("#item-names");
  const countLabel = document.querySelector("#item-count");
  const moreButton = document.querySelector("#item-more");
  const assignButton = document.querySelector("#item-assign");
  const newButton = document.querySelector("#item-new");
  const saveButton = document.querySelector("#item-save");
  const modifyButton = document.querySelector("#item-modify");
  const deleteButton = document.querySelector("#item-delete");
  const status = document.querySelector("#item-status");
  const measurePanel = document.querySelector("#measure");
  const measureCode = document.querySelector("#measure-code");
  const measureName = document.querySelector("#measure-name");
  const measureNames = document.querySelector("#measure-names");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let items = [];
  let categories = [];
  let measures = [];
  let nextId = 1;
  let mode = "view";
  let rightLevel = null;
  let title = "";
  let place = -1;
  let currentCategory = null;
  let f6 = 0;
  let openedEmpty = false;

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

  function fillSelect(list, rows, valueKey, textKey) {
    const selected = list.value;
    list.replaceChildren();
    for (const row of rows) {
      const option = document.createElement("option");
      option.value = String(row[valueKey]);
      option.textContent = row[textKey];
      list.append(option);
    }
    if (selected) list.value = selected;
  }

  function inCategory() {
    return items
      .filter((row) => row.categoryId === currentCategory)
      .sort((a, b) => a.id - b.id);
  }

  function visibleRows() {
    return inCategory()
      .filter((row) => (showHiddenBox.checked ? row.hide : !row.hide))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: "base" }));
  }

  function renderNames() {
    const rows = visibleRows();
    fillSelect(nameList, rows, "id", "code");
    countLabel.textContent = String(rows.length);
  }

  function renderMeasures() {
    const stock = measureBox.value;
    const purchase = purchaseBox.value;
    measureBox.replaceChildren();
    purchaseBox.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "";
    measureBox.append(blank);
    purchaseBox.append(blank.cloneNode(true));
    for (const row of measures) {
      const option = document.createElement("option");
      option.value = row.code;
      option.textContent = row.code;
      measureBox.append(option);
      purchaseBox.append(option.cloneNode(true));
    }
    measureBox.value = stock;
    purchaseBox.value = purchase;
    fillSelect(measureNames, measures, "code", "code");
  }

  let conversionKey = "";

  function sameUnits() {
    const measure = measureBox.value.trim();
    const purchase = purchaseBox.value.trim();
    return measure && purchase && measure.toUpperCase() === purchase.toUpperCase();
  }

  function updateLabels(fromUser) {
    const measure = measureBox.value.trim();
    const purchase = purchaseBox.value.trim();
    const key = measure.toUpperCase() + "\n" + purchase.toUpperCase();
    purchaseLabel.textContent = purchase ? "1 " + purchase + " =" : "1 =";
    stockLabel.textContent = measure;
    if (sameUnits()) {
      convertBox.value = "1";
      convertBox.readOnly = true;
    } else {
      convertBox.readOnly = false;
      if (fromUser && key !== conversionKey) convertBox.value = "";
    }
    conversionKey = key;
    equateRow.hidden = false;
  }

  function showItem(row) {
    mode = "edit";
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    currentCategory = row.categoryId;
    categoryList.value = String(row.categoryId);
    codeBox.value = row.code;
    drgBox.value = row.drg || "";
    nameBox.value = row.name;
    detailBox.value = row.detail || "";
    desnBox.value = row.desn || "";
    rateBox.value = row.rate == null ? "" : String(row.rate);
    rolBox.value = row.rol;
    rackBox.value = row.rack;
    tariffBox.value = row.hsnCode || row.tariff || "8482";
    if (gstRateBox) gstRateBox.value = row.gstRate != null ? String(row.gstRate) : "18";
    cycleBox.value = row.cycle == null ? "" : String(row.cycle);
    inactiveBox.checked = row.hide;
    measureBox.value = row.measure;
    purchaseBox.value = row.purchase;
    convertBox.value = row.convert == null ? "" : String(row.convert);
    updateLabels();
    place = inCategory().findIndex((item) => item.id === row.id);
    renderNames();
    nameList.value = String(row.id);
    moreButton.hidden = !(row.categoryId === 2 || row.categoryId === 8);
    assignButton.hidden = false;
    applyViewButtons();
  }

  function showPlace(index) {
    const rows = inCategory();
    if (!rows.length) return;
    showItem(rows[index]);
  }

  function clearFields() {
    codeBox.value = "";
    drgBox.value = "";
    nameBox.value = "";
    detailBox.value = "";
    desnBox.value = "";
    rateBox.value = "";
    rolBox.value = "";
    rackBox.value = "";
  }

  function startNew() {
    mode = "new";
    place = -1;
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    clearFields();
    tariffBox.value = "8482";
    if (gstRateBox) gstRateBox.value = "18";
    moreButton.hidden = true;
    assignButton.hidden = true;
    renderNames();
    nameList.selectedIndex = -1;
    convertBox.value = "";
    conversionKey = "";
    updateLabels(false);
    applyNewButtons();
    codeBox.focus();
  }

  function blankOpen() {
    mode = "view";
    place = -1;
    clearFields();
    renderNames();
    moreButton.hidden = true;
    assignButton.hidden = true;
    applyViewButtons();
  }

  async function refreshMeasures() {
    const response = await fetch("/api/item");
    const data = await response.json();
    if (!response.ok) return;
    measures = data.measures || [];
    const stock = measureBox.value;
    const purchase = purchaseBox.value;
    renderMeasures();
    measureBox.value = stock;
    purchaseBox.value = purchase;
    updateLabels();
    measurePanel.hidden = false;
  }

  async function loadItem(after) {
    const response = await fetch("/api/item");
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error || "";
      return;
    }
    title = data.title || "";
    rightLevel = data.right;
    nextId = data.nextId || 1;
    categories = data.categories || [];
    measures = data.measures || [];
    items = data.items || [];
    fillSelect(categoryList, categories, "id", "name");
    fillSelect(changeList, categories, "id", "name");
    renderMeasures();
    tariffList.replaceChildren();
    for (const tariff of data.tariffs || []) {
      const option = document.createElement("option");
      option.value = tariff;
      tariffList.append(option);
    }
    if (after === "open") {
      panel.hidden = false;
      openedEmpty = items.length === 0;
      if (items.length) {
        currentCategory = data.focusCategoryId;
        categoryList.value = String(currentCategory);
        blankOpen();
      } else {
        currentCategory = categories.length ? categories[0].id : null;
        if (currentCategory != null) categoryList.value = String(currentCategory);
        blankOpen();
        showInfo("No Records to Display!");
      }
      return;
    }
    if (typeof after === "number") {
      const row = items.find((item) => item.id === after);
      if (row) showItem(row);
      else if (inCategory().length) showItem(inCategory()[inCategory().length - 1]);
      else startNew();
      return;
    }
    if (inCategory().length) showItem(inCategory()[inCategory().length - 1]);
    else startNew();
  }

  function payload() {
    return {
      mode,
      id: nextId && mode === "new" ? nextId : Number(items.find((row) => row.code === codeBox.value.trim())?.id || 0),
      code: codeBox.value,
      drg: drgBox.value,
      name: nameBox.value,
      detail: detailBox.value,
      desn: desnBox.value,
      categoryId: Number(categoryList.value),
      measure: measureBox.value,
      purchase: purchaseBox.value,
      convert: convertBox.value,
      rate: rateBox.value,
      rol: rolBox.value,
      rack: rackBox.value,
      tariff: tariffBox.value,
      hsnCode: tariffBox.value || "8482",
      gstRate: gstRateBox ? Number(gstRateBox.value) : 18,
      cycle: cycleBox.value,
      hide: inactiveBox.checked
    };
  }

  async function saveItem() {
    const body = payload();
    if (mode === "edit") {
      const current = inCategory()[place];
      if (current) body.id = current.id;
    }
    const first = await fetch("/api/item", {
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
    const second = await fetch("/api/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const saved = await second.json();
    if (saved.message) showInfo(saved.message);
    if (saved.ok && saved.id) await loadItem(saved.id);
  }

  async function deleteItem() {
    const current = inCategory()[place];
    const body = { id: current ? current.id : 0 };
    const first = await fetch("/api/item/delete", {
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
    const second = await fetch("/api/item/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) await loadItem("stay");
  }

  async function confirmCategory() {
    const categoryId = Number(changeList.value);
    const code = codeBox.value.trim();
    if (!categoryId || !code) {
      showInfo("Category Change Unsuccessful!!!");
      return;
    }
    const response = await fetch("/api/item/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, code })
    });
    const data = await response.json();
    if (data.message) showInfo(data.message);
    f6 = 0;
    changeBox.hidden = true;
    categoryList.disabled = false;
    if (data.ok) {
      currentCategory = categoryId;
      const current = items.find((row) => row.code === code);
      await loadItem(current ? current.id : "stay");
    }
  }

  function markTyped() {
    newButton.disabled = true;
    deleteButton.disabled = true;
  }

  categoryList.addEventListener("click", () => {
    const id = Number(categoryList.value);
    if (!id) return;
    currentCategory = id;
    const rows = inCategory();
    if (!rows.length) {
      renderNames();
      showInfo("No Records in this CATEGORY to Display!");
      startNew();
      return;
    }
    showItem(rows[rows.length - 1]);
  });
  nameList.addEventListener("click", () => {
    const row = items.find((item) => String(item.id) === nameList.value);
    if (row) showItem(row);
  });
  showHiddenBox.addEventListener("change", renderNames);
  measureBox.addEventListener("change", () => updateLabels(true));
  purchaseBox.addEventListener("change", () => {
    if (!measureBox.value && purchaseBox.value) {
      showInfo("You have to select the 'Unit of Measurement (for Stock Purpose)'...");
      measureBox.focus();
    }
    updateLabels(true);
  });
  codeBox.addEventListener("input", markTyped);
  drgBox.addEventListener("input", markTyped);
  nameBox.addEventListener("input", markTyped);
  detailBox.addEventListener("input", markTyped);
  desnBox.addEventListener("input", markTyped);
  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveItem);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveItem();
  });
  deleteButton.addEventListener("click", deleteItem);
  document.querySelector("#item-first").addEventListener("click", () => showPlace(0));
  document.querySelector("#item-last").addEventListener("click", () => showPlace(inCategory().length - 1));
  document.querySelector("#item-next").addEventListener("click", () => {
    const rows = inCategory();
    if (!rows.length || place < 0) return;
    showPlace(place + 1 >= rows.length ? 0 : place + 1);
  });
  document.querySelector("#item-prev").addEventListener("click", () => {
    const rows = inCategory();
    if (!rows.length || place < 0) return;
    showPlace(place - 1 < 0 ? rows.length - 1 : place - 1);
  });
  document.querySelector("#item-upload").addEventListener("click", () => {
    status.textContent = "Form: frmUpload. This screen is not built yet.";
  });
  moreButton.addEventListener("click", () => {
    status.textContent = "Form: frmCompMaster. This screen is not built yet.";
  });
  assignButton.addEventListener("click", () => {
    status.textContent = "Form: frmItemAssign. This screen is not built yet.";
  });
  document.querySelector("#item-add-units").addEventListener("click", () => {
    measurePanel.hidden = false;
    measureCode.value = "";
    measureName.value = "";
    measureCode.focus();
  });
  document.querySelector("#measure-close").addEventListener("click", () => {
    measurePanel.hidden = true;
  });
  document.querySelector("#measure-save").addEventListener("click", async () => {
    const body = { code: measureCode.value, name: measureName.value };
    const first = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!await askYesNo("Are You Sure To Save")) return;
    const second = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) {
      measureCode.value = "";
      measureName.value = "";
      await refreshMeasures();
    }
  });
  document.querySelector("#measure-delete").addEventListener("click", async () => {
    const body = { code: measureNames.value || measureCode.value };
    const first = await fetch("/api/measure/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const preview = await first.json();
    if (!first.ok || preview.ok === false) {
      if (preview.message) showInfo(preview.message);
      return;
    }
    if (!await askYesNo("Are You Sure To Delete ?")) return;
    const second = await fetch("/api/measure/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: true }, body))
    });
    const data = await second.json();
    if (data.message) showInfo(data.message);
    if (data.ok) await refreshMeasures();
  });
  measureNames.addEventListener("click", () => {
    const row = measures.find((item) => item.code === measureNames.value);
    if (!row) return;
    measureCode.value = row.code;
    measureName.value = row.name;
  });
  document.querySelector("#item-close").addEventListener("click", closeItem);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "F1") {
      event.preventDefault();
      status.textContent = "Help file: MasInvItem.htm. That page is not in this copy.";
      return;
    }
    if (event.key !== "F6") return;
    event.preventDefault();
    if (modifyButton.disabled) return;
    if (f6 === 0) {
      categoryList.disabled = true;
      changeBox.hidden = false;
      changeList.value = categoryList.value;
      f6 = 1;
      showInfo("After changing the Category Press F6 Key to Confirm");
      return;
    }
    confirmCategory();
  });

  function closeItem() {
    panel.hidden = true;
    measurePanel.hidden = true;
    if (window.closeBom) window.closeBom();
    if (window.closeStore) window.closeStore();
    if (window.closeProcess) window.closeProcess();
    if (window.closeExpense) window.closeExpense();
    if (window.closeIncome) window.closeIncome();
    if (window.closeBanks) window.closeBanks();
    if (window.closeCurrency) window.closeCurrency();
    if (window.closeCurrToday) window.closeCurrToday();
    if (window.closeCost) window.closeCost();
  }

  window.openItem = function openItem() {
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
    measurePanel.hidden = true;
    loadItem("open");
  };
  window.closeItem = closeItem;
})();
