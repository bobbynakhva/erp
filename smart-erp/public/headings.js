(() => {
  const panel = document.querySelector("#headings");
  const groups = document.querySelector("#headings-groups");
  const modifyButton = document.querySelector("#headings-modify");
  const status = document.querySelector("#headings-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const sections = [
    ["general", "General"],
    ["earnings", "Earnings"],
    ["deductions", "Deductions"]
  ];

  let title = "";
  let data = { general: [], earnings: [], deductions: [] };

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
      yes.focus();
    });
  }

  function paint() {
    groups.replaceChildren();
    for (const [key, label] of sections) {
      const heading = document.createElement("h2");
      heading.textContent = label;
      const table = document.createElement("table");
      table.innerHTML = "<thead><tr><th>Id</th><th>Name in Screen</th><th>Printed As</th><th>Print</th></tr></thead>";
      const body = document.createElement("tbody");
      const inputs = [];
      for (const row of data[key]) {
        const tr = document.createElement("tr");
        const id = document.createElement("td");
        id.textContent = String(row.id);
        const name = document.createElement("td");
        name.textContent = row.scrColName;
        const printed = document.createElement("td");
        const input = document.createElement("input");
        input.value = row.printName;
        input.disabled = modifyButton.disabled;
        input.addEventListener("input", () => {
          row.printName = input.value;
        });
        input.addEventListener("keydown", (event) => {
          const index = inputs.indexOf(input);
          if (event.key === "ArrowUp") {
            if (index <= 0) return;
            event.preventDefault();
            inputs[index - 1].focus();
            inputs[index - 1].select();
            return;
          }
          if (event.key !== "ArrowDown" && event.key !== "Enter") return;
          const text = event.key === "Enter" ? input.value : input.value.trim();
          if (text === "" || index >= inputs.length - 1) {
            if (event.key === "Enter") event.preventDefault();
            return;
          }
          event.preventDefault();
          inputs[index + 1].focus();
          inputs[index + 1].select();
        });
        inputs.push(input);
        printed.append(input);
        const flag = document.createElement("td");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = row.isPrint;
        box.disabled = modifyButton.disabled;
        box.addEventListener("change", () => {
          row.isPrint = box.checked;
        });
        flag.append(box);
        tr.append(id, name, printed, flag);
        body.append(tr);
      }
      table.append(body);
      groups.append(heading, table);
    }
  }

  function payload(confirmed) {
    function copy(rows) {
      return rows.map((row) => ({
        id: row.id,
        scrColName: row.scrColName,
        printName: row.printName,
        isPrint: row.isPrint,
        strRow: row.strRow,
        strCol: row.strCol
      }));
    }
    return {
      confirmed,
      general: copy(data.general),
      earnings: copy(data.earnings),
      deductions: copy(data.deductions)
    };
  }

  async function loadHeadings() {
    const response = await fetch("/api/salary-headings");
    const body = await response.json();
    if (!response.ok) {
      panel.hidden = true;
      return;
    }
    title = body.title || "";
    data = {
      general: body.general || [],
      earnings: body.earnings || [],
      deductions: body.deductions || []
    };
    const byte = body.right == null ? null : (Number(body.right) & 255);
    modifyButton.disabled = !(byte > 1);
    paint();
    panel.hidden = false;
    panel.focus();
  }

  async function saveHeadings() {
    status.textContent = "";
    let response = await fetch("/api/salary-headings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let body = await response.json();
    if (!response.ok) return;
    if (!body.ok) {
      showInfo(body.message);
      return;
    }
    if (!await askYesNo("Are you sure to Modify?")) return;
    response = await fetch("/api/salary-headings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true))
    });
    body = await response.json();
    if (!response.ok || !body.ok) {
      if (body.message) showInfo(body.message);
      return;
    }
    showInfo(body.message);
    loadHeadings();
  }

  function openHeadings() {
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeShift) window.closeShift();
    if (window.closeMachine) window.closeMachine();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    loadHeadings();
  }

  function closeHeadings() {
    panel.hidden = true;
  }

  modifyButton.addEventListener("click", saveHeadings);
  document.querySelector("#headings-close").addEventListener("click", closeHeadings);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "F1") return;
    event.preventDefault();
    status.textContent = "Help file: MasAdmUserRight.htm. That page is not in this copy.";
  });
  window.openHeadings = openHeadings;
  window.closeHeadings = closeHeadings;
})();
