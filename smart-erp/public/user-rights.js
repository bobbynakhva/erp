(function () {
const rights = document.querySelector("#rights");
const rightsUsers = document.querySelector("#rights-users");
const rightsBody = document.querySelector("#rights-body");
const rightsModify = document.querySelector("#rights-modify");
const rightsStatus = document.querySelector("#rights-status");
const info = document.querySelector("#info");
const infoTitle = document.querySelector("#info-title");
const infoText = document.querySelector("#info-text");

let title = "";
let ownByte = 0;
let catalog = [];
let stored = {};
let userCode = null;

function flagsFor(level) {
  const n = Number(level) || 0;
  const flags = { all: false, read: false, write: false, modify: false, delete: false };
  if (n > 0) flags.read = true;
  if (n === 12) {
    flags.all = true;
    flags.write = true;
    flags.modify = true;
    flags.delete = true;
  } else if (n === 7) {
    flags.write = true;
    flags.modify = true;
  } else if (n === 3) {
    flags.write = true;
  }
  return flags;
}

function setBox(row, col, value) {
  const box = row.querySelector(`[data-col="${col}"]`);
  if (box) box.checked = value;
}

function applyCheck(row, col, on) {
  if (col === "all") {
    ["all", "read", "write", "modify", "delete"].forEach((name) => setBox(row, name, on));
  } else if (col === "read") {
    if (on) setBox(row, "read", true);
    else ["all", "read", "write", "modify", "delete"].forEach((name) => setBox(row, name, false));
  } else if (col === "write") {
    if (on) {
      setBox(row, "read", true);
      setBox(row, "write", true);
    } else {
      setBox(row, "write", false);
      setBox(row, "modify", false);
      setBox(row, "delete", false);
      setBox(row, "all", false);
    }
  } else if (col === "modify") {
    if (on) {
      setBox(row, "read", true);
      setBox(row, "write", true);
      setBox(row, "modify", true);
    } else {
      setBox(row, "modify", false);
      setBox(row, "delete", false);
      setBox(row, "all", false);
    }
  } else if (col === "delete") {
    if (on) ["all", "read", "write", "modify", "delete"].forEach((name) => setBox(row, name, true));
    else {
      setBox(row, "delete", false);
      setBox(row, "all", false);
    }
  }
}

function paintChecks() {
  const levels = stored[String(userCode)] || {};
  rightsBody.querySelectorAll("tr").forEach((row) => {
    const flags = flagsFor(levels[row.dataset.key]);
    ["all", "read", "write", "modify", "delete"].forEach((name) => setBox(row, name, flags[name]));
  });
}

function buildGrid() {
  rightsBody.innerHTML = "";
  let previous = "";
  catalog.forEach((item) => {
    const row = document.createElement("tr");
    row.dataset.sl = String(item.slNo);
    row.dataset.key = item.ctrlKey || "";
    const topic = document.createElement("td");
    topic.textContent = item.topic === previous ? "" : item.topic;
    previous = item.topic;
    const sub = document.createElement("td");
    sub.textContent = item.subTopic;
    row.appendChild(topic);
    row.appendChild(sub);
    ["all", "read", "write", "modify", "delete"].forEach((name) => {
      const cell = document.createElement("td");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.dataset.col = name;
      cell.appendChild(box);
      row.appendChild(cell);
    });
    rightsBody.appendChild(row);
  });
}

async function loadRoles() {
  const roleSelect = document.getElementById("rights-role-select");
  if (!roleSelect) return;
  try {
    const res = await fetch("/api/rbac/roles");
    const json = await res.json();
    if (json.ok && json.roles) {
      roleSelect.innerHTML = json.roles.map(r => `<option value="${r.key}">${r.badge} - ${r.name}</option>`).join("");
    }
  } catch (e) {
    console.error("Failed to load roles:", e);
  }
}

async function updateSecurityBadge() {
  const badgeEl = document.getElementById("rights-role-badge");
  const roleSelect = document.getElementById("rights-role-select");
  if (!userCode) return;
  try {
    const res = await fetch(`/api/rbac/user-profile?userCode=${userCode}`);
    const json = await res.json();
    if (json.ok && json.profile) {
      if (badgeEl) badgeEl.textContent = json.profile.badge || json.profile.roleName;
      if (roleSelect && json.profile.roleKey) roleSelect.value = json.profile.roleKey;
    }
  } catch (e) {
    console.error("Failed to fetch user security profile:", e);
  }
}

function fillUsers(users) {
  rightsUsers.innerHTML = "";
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = String(user.userCode);
    option.textContent = user.username;
    rightsUsers.appendChild(option);
  });
  if (users.length === 0) {
    userCode = null;
    rightsModify.disabled = true;
    rightsBody.querySelectorAll("input").forEach((box) => { box.disabled = true; });
    return;
  }
  rightsUsers.selectedIndex = 0;
  userCode = users[0].userCode;
  rightsModify.disabled = !(ownByte > 3);
  rightsBody.querySelectorAll("input").forEach((box) => { box.disabled = false; });
  paintChecks();
  updateSecurityBadge();
}

function showInfo(message) {
  infoTitle.textContent = title || "Tamba ERP";
  infoText.textContent = message;
  info.hidden = false;
  document.querySelector("#info-ok").focus();
}

function rowPayload() {
  return Array.from(rightsBody.querySelectorAll("tr")).map((row) => ({
    slNo: Number(row.dataset.sl),
    all: row.querySelector('[data-col="all"]').checked,
    read: row.querySelector('[data-col="read"]').checked,
    write: row.querySelector('[data-col="write"]').checked,
    modify: row.querySelector('[data-col="modify"]').checked
  }));
}

function rememberSaved() {
  const levels = {};
  rightsBody.querySelectorAll("tr").forEach((row) => {
    const key = row.dataset.key;
    if (!key) return;
    const all = row.querySelector('[data-col="all"]').checked;
    const read = row.querySelector('[data-col="read"]').checked;
    const write = row.querySelector('[data-col="write"]').checked;
    const modify = row.querySelector('[data-col="modify"]').checked;
    let level = 0;
    if (all) level = 12;
    else if (modify) level = 7;
    else if (write) level = 3;
    else if (read) level = 1;
    levels[key] = level;
  });
  stored[String(userCode)] = levels;
  paintChecks();
}

window.openUserRights = async function openUserRights() {
  if (window.closeCompany) window.closeCompany();
  if (window.closeUsers) window.closeUsers();
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
  rights.hidden = false;
  rightsStatus.textContent = "";

  await loadRoles();

  const response = await fetch("/api/user-rights");
  const data = await response.json();
  if (!response.ok) {
    rightsStatus.textContent = data.error || "Sign in again.";
    return;
  }
  title = data.title || "";
  ownByte = data.ownRight == null ? 0 : (Number(data.ownRight) & 255);
  catalog = data.rows || [];
  stored = data.rights || {};
  buildGrid();
  fillUsers(data.users || []);
};

window.closeUserRights = function closeUserRights() {
  rights.hidden = true;
  rightsStatus.textContent = "";
};

rightsBody.addEventListener("change", (event) => {
  const box = event.target;
  if (!box.dataset || !box.dataset.col) return;
  applyCheck(box.closest("tr"), box.dataset.col, box.checked);
});

rightsUsers.addEventListener("change", () => {
  userCode = Number(rightsUsers.value);
  paintChecks();
  updateSecurityBadge();
});

rightsModify.addEventListener("click", async () => {
  if (!userCode) return;
  rightsStatus.textContent = "";
  const response = await fetch("/api/user-rights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userCode, rows: rowPayload() })
  });
  const data = await response.json();
  if (!response.ok) {
    rightsStatus.textContent = data.error || "Sign in again.";
    return;
  }
  if (!data.ok) return;
  rememberSaved();
  title = data.title || title;
  showInfo(data.message);
});

// Wire RBAC Apply Role Button
const applyRoleBtn = document.getElementById("rights-btn-apply-role");
if (applyRoleBtn) {
  applyRoleBtn.addEventListener("click", async () => {
    if (!userCode) return;
    const roleKey = document.getElementById("rights-role-select")?.value;
    if (!roleKey) return;

    try {
      rightsStatus.textContent = "Applying role preset...";
      const res = await fetch("/api/rbac/apply-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode, roleKey })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showInfo(json.error || "Failed to apply role.");
        return;
      }
      showInfo(json.message);
      await updateSecurityBadge();

      // Refresh stored rights from server and repaint
      const response = await fetch("/api/user-rights");
      const data = await response.json();
      stored = data.rights || {};
      paintChecks();
      rightsStatus.textContent = `Applied ${json.roleName} successfully.`;
    } catch (e) {
      showInfo("Failed to apply role: " + e.message);
    }
  });
}

// Wire Open Audit Trail Button
const openAuditBtn = document.getElementById("rights-btn-open-audit");
if (openAuditBtn) {
  openAuditBtn.addEventListener("click", () => {
    if (window.openAuditTrail) window.openAuditTrail();
  });
}

document.querySelector("#rights-close").addEventListener("click", () => window.closeUserRights());

rights.addEventListener("keydown", (event) => {
  if (event.key !== "F1") return;
  rightsStatus.textContent = "Help file: MasAdmUserRight.htm. That page is not in this copy.";
  event.preventDefault();
});
})();
