(() => {
  const panel = document.querySelector("#status");
  const onlineBody = document.querySelector("#status-online");
  const systemsBody = document.querySelector("#status-systems");
  const company = document.querySelector("#status-company");
  const total = document.querySelector("#status-total");
  const balance = document.querySelector("#status-balance");

  function cell(text) {
    const td = document.createElement("td");
    td.textContent = text ?? "—";
    return td;
  }

  async function openUserStatus() {
    const response = await fetch("/api/user-status");
    const data = await response.json();
    if (!response.ok) return;
    if (company) company.textContent = data.company || "Factory";
    if (total) total.textContent = String(data.total ?? 0);
    if (balance) balance.textContent = String(data.balance ?? 0);
    
    if (onlineBody) {
      onlineBody.replaceChildren();
      if (!data.online || data.online.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "status-table-empty";
        td.textContent = "No secondary active workstations (Single active session)";
        tr.append(td);
        onlineBody.append(tr);
      } else {
        for (const row of data.online) {
          const tr = document.createElement("tr");
          tr.append(cell(row.slNo), cell(row.loggedAt), cell(row.username), cell(row.sysName), cell(row.sysIp));
          onlineBody.append(tr);
        }
      }
    }

    if (systemsBody) {
      systemsBody.replaceChildren();
      if (!data.systems || data.systems.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "status-table-empty";
        td.textContent = "No registered seed terminals";
        tr.append(td);
        systemsBody.append(tr);
      } else {
        for (const row of data.systems) {
          const tr = document.createElement("tr");
          tr.append(cell(row.sysId), cell(row.sysDate || "—"), cell(row.sysName), cell(row.sysIp));
          systemsBody.append(tr);
        }
      }
    }

    panel.hidden = false;
  }

  function closeUserStatus() {
    panel.hidden = true;
  }

  // Backdrop click dismissal
  panel.addEventListener("click", (e) => {
    if (e.target === panel) closeUserStatus();
  });

  // Escape key dismissal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closeUserStatus();
  });

  const closeBtn = document.querySelector("#status-close");
  if (closeBtn) closeBtn.addEventListener("click", closeUserStatus);

  window.openUserStatus = openUserStatus;
  window.closeUserStatus = closeUserStatus;
})();
