(() => {
  const panel = document.querySelector("#staff");
  const idBox = document.querySelector("#staff-id");
  const nameBox = document.querySelector("#staff-name");
  const dojBox = document.querySelector("#staff-doj");
  const sexBox = document.querySelector("#staff-sex");
  const desigBox = document.querySelector("#staff-desig");
  const fatherBox = document.querySelector("#staff-father");
  const deptBox = document.querySelector("#staff-dept");
  const pfBox = document.querySelector("#staff-pf");
  const esiBox = document.querySelector("#staff-esi");
  const addrBox = document.querySelector("#staff-addr");
  const cityBox = document.querySelector("#staff-city");
  const phoneBox = document.querySelector("#staff-phone");
  const otherBox = document.querySelector("#staff-other");
  const dolLabel = document.querySelector("#staff-dol");
  const nameList = document.querySelector("#staff-names");
  const countLabel = document.querySelector("#staff-count");
  const currentBox = document.querySelector("#staff-current");
  const desigList = document.querySelector("#staff-desigs");
  const deptList = document.querySelector("#staff-depts");
  const newButton = document.querySelector("#staff-new");
  const saveButton = document.querySelector("#staff-save");
  const modifyButton = document.querySelector("#staff-modify");
  const deleteButton = document.querySelector("#staff-delete");
  const status = document.querySelector("#staff-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let employees = [];
  let order = [];
  let usedIds = [];
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

  function today() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function showDate(value) {
    if (!value) return "";
    const parts = String(value).slice(0, 10).split("-");
    if (parts.length !== 3) return value;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function fillLists(desigs, depts) {
    desigList.replaceChildren();
    deptList.replaceChildren();
    for (const value of desigs || []) {
      const option = document.createElement("option");
      option.value = value;
      desigList.append(option);
    }
    for (const value of depts || []) {
      const option = document.createElement("option");
      option.value = value;
      deptList.append(option);
    }
  }

  function renderNames() {
    nameList.replaceChildren();
    for (const row of employees) {
      const option = document.createElement("option");
      option.value = String(row.staffId);
      option.textContent = row.staffName;
      nameList.append(option);
    }
    countLabel.textContent = String(employees.length);
  }

  function applyViewButtons() {
    saveButton.disabled = true;
    newButton.disabled = false;
    deleteButton.disabled = false;
    modifyButton.disabled = false;
    const byte = rightLevel == null ? null : (rightLevel & 255);
    if (byte === 7) deleteButton.disabled = true;
    else if (byte === 3) {
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    } else if (byte === 1 || byte === 0) {
      saveButton.disabled = true;
      newButton.disabled = true;
      deleteButton.disabled = true;
      modifyButton.disabled = true;
    }
    idBox.disabled = true;
  }

  function showEmployee(row) {
    mode = "edit";
    idBox.value = String(row.staffId);
    nameBox.value = row.staffName;
    sexBox.value = row.sex;
    desigBox.value = row.desig.trim();
    fatherBox.value = row.father;
    deptBox.value = row.dept.trim();
    pfBox.value = row.pf;
    esiBox.value = row.esi;
    addrBox.value = row.addr;
    cityBox.value = row.city;
    phoneBox.value = row.phone;
    otherBox.value = row.other;
    dojBox.value = row.doj;
    if (row.dol) {
      dolLabel.textContent = "Date of Leaving : " + showDate(row.dol);
      deleteButton.textContent = "Revoke";
    } else {
      dolLabel.textContent = "";
      deleteButton.textContent = "Delete";
    }
    place = order.indexOf(row.staffId);
    Array.from(nameList.options).forEach((option) => {
      option.selected = Number(option.value) === row.staffId;
    });
    applyViewButtons();
  }

  function startNew() {
    mode = "new";
    idBox.value = String(nextId);
    nameBox.value = "";
    sexBox.value = "";
    desigBox.value = "";
    fatherBox.value = "";
    deptBox.value = "";
    pfBox.value = "";
    esiBox.value = "";
    addrBox.value = "";
    cityBox.value = "";
    phoneBox.value = "";
    otherBox.value = "";
    dojBox.value = today();
    dolLabel.textContent = "";
    deleteButton.textContent = "Delete";
    nameList.selectedIndex = -1;
    place = -1;
    idBox.disabled = false;
    saveButton.disabled = false;
    newButton.disabled = true;
    deleteButton.disabled = true;
    modifyButton.disabled = true;
    nameBox.focus();
  }

  function showAt(index) {
    if (index < 0 || index >= order.length) return;
    const row = employees.find((item) => item.staffId === order[index]);
    if (row) showEmployee(row);
  }

  async function loadStaff(selectId) {
    const current = currentBox.checked ? "1" : "0";
    const response = await fetch("/api/staff?current=" + current);
    const data = await response.json();
    if (!response.ok) return false;
    title = data.title || "";
    rightLevel = data.right;
    employees = data.employees;
    order = data.order;
    usedIds = data.usedIds;
    nextId = data.nextId;
    fillLists(data.desigs, data.depts);
    renderNames();
    if (selectId != null) {
      const row = employees.find((item) => item.staffId === selectId);
      if (row) {
        showEmployee(row);
        return true;
      }
    }
    if (!selectId && order.length) showAt(order.length - 1);
    else if (!order.length && selectId == null) startNew();
    return true;
  }

  function payload(acceptDuplicate) {
    return {
      confirmed: false,
      mode,
      staffId: idBox.value,
      staffName: nameBox.value,
      sex: sexBox.value,
      desig: desigBox.value,
      dept: deptBox.value,
      father: fatherBox.value,
      pf: pfBox.value,
      esi: esiBox.value,
      addr: addrBox.value,
      city: cityBox.value,
      phone: phoneBox.value,
      other: otherBox.value,
      doj: dojBox.value,
      acceptDuplicate
    };
  }

  async function saveStaff() {
    const id = Number(idBox.value);
    if (!Number.isFinite(id) || id === 0) {
      showInfo("Please Enter the  Employee ID.....");
      idBox.focus();
      return;
    }
    if (nameBox.value.trim() === "") {
      showInfo("Please Enter the  Employee Name.....");
      nameBox.focus();
      return;
    }
    if (sexBox.value !== "Male" && sexBox.value !== "Female") {
      showInfo("Please Select the Sex as Male/Female...");
      sexBox.focus();
      return;
    }
    if (desigBox.value.trim() === "") {
      showInfo("Please Enter the designation.....");
      desigBox.focus();
      return;
    }
    if (mode === "new" && usedIds.includes(id)) {
      showInfo("An Entry Already Exists...Try Another!");
      nameBox.focus();
      return;
    }
    let response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let data = await response.json();
    if (!response.ok) return;
    if (data.duplicateId) {
      const text = "The same Employee Name Exists in EmployeeId : " + data.duplicateId
        + "\n\nAnyhow You want to Save the Data?";
      if (!await askYesNo(text)) return;
    } else if (!data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    const sure = mode === "new" ? "Are You Sure To Save?" : "Are You Sure To Modify?";
    if (!await askYesNo(sure)) return;
    response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign(payload(true), { confirmed: true }))
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return;
    }
    await loadStaff(id);
    showInfo(data.message);
  }

  async function openStaff() {
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeShift) window.closeShift();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeMachine) window.closeMachine();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    currentBox.checked = true;
    status.textContent = "";
    panel.hidden = false;
    await loadStaff(null);
  }

  function closeStaff() {
    panel.hidden = true;
  }

  newButton.addEventListener("click", startNew);
  saveButton.addEventListener("click", saveStaff);
  modifyButton.addEventListener("click", saveStaff);
  deleteButton.addEventListener("click", async () => {
    const revoke = deleteButton.textContent === "Revoke";
    const text = revoke
      ? "Are you sure to Revoke this Employee to the Current List...!!!"
      : "BEFORE deleting this Record, ensure all the accounts to this Employee is settled.\nSince after deleting the record, You can't revert back!!!\n\n Are You sure to Delete?";
    if (!await askYesNo(text)) return;
    const response = await fetch("/api/staff/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: Number(idBox.value), revoke })
    });
    const data = await response.json();
    if (!response.ok) return;
    await loadStaff(null);
    if (order.length) showAt(0);
    showInfo(data.message);
  });
  nameList.addEventListener("change", () => {
    const row = employees.find((item) => item.staffId === Number(nameList.value));
    if (row) showEmployee(row);
  });
  currentBox.addEventListener("change", () => loadStaff(mode === "edit" ? Number(idBox.value) : null));
  document.querySelector("#staff-first").addEventListener("click", () => showAt(0));
  document.querySelector("#staff-prev").addEventListener("click", () => showAt(place - 1));
  document.querySelector("#staff-next").addEventListener("click", () => showAt(place + 1));
  document.querySelector("#staff-last").addEventListener("click", () => showAt(order.length - 1));
  document.querySelector("#staff-close").addEventListener("click", closeStaff);
  for (const box of [nameBox, desigBox, fatherBox, deptBox, pfBox, esiBox, addrBox, cityBox, phoneBox, otherBox]) {
    box.addEventListener("input", () => {
      if (mode !== "edit") return;
      newButton.disabled = true;
      deleteButton.disabled = true;
    });
  }
  idBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      nameBox.focus();
    }
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key === "F1") {
      event.preventDefault();
      status.textContent = "Help file: MasHRStaff.htm. That page is not in this copy.";
    }
  });

  window.openStaff = openStaff;
  window.closeStaff = closeStaff;
})();
