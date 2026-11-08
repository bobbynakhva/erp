(function () {
const users = document.querySelector("#users");
const userName = document.querySelector("#user-name");
const userPassword = document.querySelector("#user-password");
const userConfirm = document.querySelector("#user-confirm");
const nameList = document.querySelector("#user-names");
const userMask = document.querySelector("#user-mask");
const userNew = document.querySelector("#user-new");
const userSave = document.querySelector("#user-save");
const userModify = document.querySelector("#user-modify");
const userDelete = document.querySelector("#user-delete");
const usersStatus = document.querySelector("#users-status");
const info = document.querySelector("#info");
const infoTitle = document.querySelector("#info-title");
const infoText = document.querySelector("#info-text");
const ask = document.querySelector("#ask");
const askTitle = document.querySelector("#ask-title");
const askText = document.querySelector("#ask-text");

let records = [];
let index = 0;
let mode = "edit";
let userCode = null;
let title = "";
let rightLevel = null;

function stripTrailingBreak(value) {
  let text = String(value ?? "");
  while (text.endsWith("\n") || text.endsWith("\r")) text = text.slice(0, -1);
  return text;
}

function showInfo(message, after) {
  infoTitle.textContent = title || "Tamba ERP";
  infoText.textContent = message;
  info.hidden = false;
  const ok = document.querySelector("#info-ok");
  ok.focus();
  if (!after) return;
  function done() {
    ok.removeEventListener("click", done);
    after();
  }
  ok.addEventListener("click", done);
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
      yes.removeEventListener("click", finishYes);
      no.removeEventListener("click", finishNo);
      resolve(answer);
    }
    function finishYes() { finish(true); }
    function finishNo() { finish(false); }
    yes.addEventListener("click", finishYes);
    no.addEventListener("click", finishNo);
    no.focus();
  });
}

function setMask(on) {
  const type = on ? "password" : "text";
  userPassword.type = type;
  userConfirm.type = type;
  userMask.textContent = on ? "Show Password" : "Hide Password";
}

function applyButtons() {
  const editing = mode === "edit";
  userSave.disabled = editing;
  userNew.disabled = !editing;
  userDelete.disabled = !editing;
  userModify.disabled = !editing;
  const byte = rightLevel == null ? null : (rightLevel & 255);
  if (byte === 7) userDelete.disabled = true;
  else if (byte === 3) {
    userDelete.disabled = true;
    userModify.disabled = true;
  } else if (byte === 1 || byte === 0) {
    userSave.disabled = true;
    userNew.disabled = true;
    userDelete.disabled = true;
    userModify.disabled = true;
  }
  userName.disabled = editing && userCode === 1;
}

function fillRecord(record) {
  userCode = record ? record.userCode : null;
  userName.value = record ? record.username : "";
  userPassword.value = record ? record.password : "";
  userConfirm.value = record ? record.password : "";
  mode = "edit";
  applyButtons();
  const name = record ? record.username : "";
  Array.from(nameList.options).forEach((option) => {
    option.selected = option.value === name;
  });
}

function renderList(names) {
  nameList.innerHTML = "";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    nameList.appendChild(option);
  });
}

async function loadUsers(selectCode) {
  const response = await fetch("/api/users");
  if (!response.ok) {
    usersStatus.textContent = "The user list could not be read.";
    return;
  }
  const data = await response.json();
  title = data.title || title;
  rightLevel = data.right;
  records = data.records || [];
  renderList(data.names || []);
  if (!records.length) {
    fillRecord(null);
    return;
  }
  let next = 0;
  if (selectCode != null) {
    const found = records.findIndex((row) => row.userCode === selectCode);
    if (found >= 0) next = found;
  }
  index = next;
  fillRecord(records[index]);
}

function showAt(next) {
  if (!records.length) return;
  const count = records.length;
  index = ((next % count) + count) % count;
  fillRecord(records[index]);
}

function focusField(which, select) {
  const field = which === "name" ? userName : userPassword;
  field.focus();
  if (select) field.select();
}

window.openUsers = function openUsers() {
  document.querySelector("#notice").hidden = true;
  document.querySelector("#popup").hidden = true;
  if (window.closeCompany) window.closeCompany();
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
  users.hidden = false;
  setMask(true);
  usersStatus.textContent = "";
  loadUsers(null);
};

window.closeUsers = function closeUsers() {
  users.hidden = true;
  usersStatus.textContent = "";
};

userMask.addEventListener("click", () => {
  setMask(userMask.textContent === "Show Password" ? false : true);
});

userName.addEventListener("keydown", (event) => {
  if (event.key === "Tab" || event.key === "Shift") return;
  userNew.disabled = true;
  userDelete.disabled = true;
  if (event.key === "Enter") {
    event.preventDefault();
    userPassword.focus();
  }
});

userPassword.addEventListener("focus", () => {
  const stripped = stripTrailingBreak(userPassword.value);
  if (stripped !== userPassword.value) userPassword.value = stripped;
});

userPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    userConfirm.focus();
  }
});

userConfirm.addEventListener("keydown", (event) => {
  if (event.key === "Tab" || event.key === "Shift") return;
  userNew.disabled = true;
  userDelete.disabled = true;
  if (event.key === "Enter") {
    event.preventDefault();
    if (!userSave.disabled) userSave.focus();
    else userModify.focus();
  }
});

nameList.addEventListener("change", () => {
  const found = records.findIndex((row) => row.username === nameList.value);
  if (found < 0) return;
  index = found;
  fillRecord(records[index]);
});

userNew.addEventListener("click", async () => {
  const response = await fetch("/api/users/next");
  if (!response.ok) return;
  const data = await response.json();
  userCode = data.userCode;
  userName.value = "";
  userPassword.value = "";
  userConfirm.value = "";
  mode = "new";
  applyButtons();
  userName.focus();
});

async function saveUsers() {
  const savedCode = userCode;
  const wasNew = mode === "new";
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      userCode,
      username: userName.value,
      password: userPassword.value,
      confirm: userConfirm.value
    })
  });
  const data = await response.json();
  if (!data.ok) {
    if (data.message) showInfo(data.message, () => focusField(data.focus, data.select));
    else if (data.focus) focusField(data.focus, data.select);
    return;
  }
  await loadUsers(wasNew ? null : savedCode);
  if (wasNew && records.length) showAt(records.length - 1);
  showInfo(data.message);
}

async function confirmSave() {
  const name = userName.value.trim();
  const password = userPassword.value.trim();
  const confirm = userConfirm.value.trim();
  if (name === "") {
    showInfo("Please Enter the user Name.....", () => focusField("name"));
    return;
  }
  if (password === "") {
    showInfo("Please Enter the Password.....", () => focusField("password"));
    return;
  }
  if (password !== confirm) {
    showInfo("Your Passwords are not Identical .....", () => focusField("password", true));
    return;
  }
  const clash = records.some((row) => row.username === name && row.userCode !== userCode);
  if (clash) {
    showInfo("An Entry Already Exists...Try Another!", () => focusField("name"));
    return;
  }
  const word = userSave.disabled ? "Modify" : "Save";
  const yes = await askYesNo("Are You Sure To " + word + "?");
  if (!yes) {
    mode = "edit";
    applyButtons();
    return;
  }
  await saveUsers();
}

userSave.addEventListener("click", confirmSave);
userModify.addEventListener("click", confirmSave);

userDelete.addEventListener("click", async () => {
  if (userName.value.trim() === "ADMINISTRATOR" || userCode === 1) {
    showInfo("You can't Delete this user!!!");
    return;
  }
  const yes = await askYesNo("Are You Sure To Delete?");
  if (!yes) return;
  const response = await fetch("/api/users/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userCode, username: userName.value })
  });
  const data = await response.json();
  if (!data.ok) {
    if (data.message) showInfo(data.message);
    return;
  }
  userCode = null;
  await loadUsers(null);
  showInfo(data.message);
});

document.querySelector("#user-first").addEventListener("click", () => showAt(0));
document.querySelector("#user-prev").addEventListener("click", () => showAt(index - 1));
document.querySelector("#user-next").addEventListener("click", () => showAt(index + 1));
document.querySelector("#user-last").addEventListener("click", () => showAt(records.length - 1));
document.querySelector("#user-close").addEventListener("click", () => window.closeUsers());

users.addEventListener("keydown", (event) => {
  if (event.key === "F1") {
    event.preventDefault();
    usersStatus.textContent = "Help file: MasAdmUser.htm. That page is not in this copy.";
  }
});
})();