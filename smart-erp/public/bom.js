(() => {
  const panel = document.querySelector("#bom");
  const assemblyBox = document.querySelector("#bom-assembly");
  const assyName = document.querySelector("#bom-assy-name");
  const body = document.querySelector("#bom-body");
  const heading = document.querySelector("#bom-heading");
  const obsoleteBox = document.querySelector("#bom-obsolete");
  const saveButton = document.querySelector("#bom-save");
  const modifyButton = document.querySelector("#bom-modify");
  const copyButton = document.querySelector("#bom-copy");
  const uploadButton = document.querySelector("#bom-upload");
  const closeButton = document.querySelector("#bom-close");
  const status = document.querySelector("#bom-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");

  let assemblies = [];
  let parts = [];
  let level = null;
  let itemLevel = null;
  let title = "";
  let mode = "new";

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

  function applyButtons() {
    const canSave = level == null || level > 1;
    const canModify = level == null || level > 3;
    saveButton.hidden = mode === "edit";
    modifyButton.hidden = mode !== "edit";
    saveButton.disabled = !canSave;
    modifyButton.disabled = !canModify;
  }

  function selectedAssembly() {
    return assemblies.find((row) => String(row.id) === assemblyBox.value) || null;
  }

  function addRow(line) {
    const tr = document.createElement("tr");
    const sl = document.createElement("td");
    const itemCell = document.createElement("td");
    const unitCell = document.createElement("td");
    const qtyCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const select = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    select.append(blank);
    for (const part of parts) {
      const option = document.createElement("option");
      option.value = part.code;
      option.textContent = part.code;
      select.append(option);
    }
    const qty = document.createElement("input");
    select.value = line && line.code ? line.code : "";
    qty.value = line && line.qty != null ? String(line.qty) : "";
    function fill() {
      const part = parts.find((row) => row.code === select.value);
      unitCell.textContent = part ? part.unit : "";
      nameCell.textContent = part ? part.name : "";
    }
    select.addEventListener("change", fill);
    itemCell.append(select);
    qtyCell.append(qty);
    tr.append(sl, itemCell, unitCell, qtyCell, nameCell);
    body.append(tr);
    fill();
    numberRows();
  }

  function numberRows() {
    [...body.rows].forEach((row, index) => {
      row.cells[0].textContent = String(index + 1);
    });
  }

  function readLines() {
    return [...body.rows].map((row) => ({
      slNo: Number(row.cells[0].textContent),
      code: row.cells[1].querySelector("select").value,
      qty: row.cells[3].querySelector("input").value
    }));
  }

  function showAssembly(data) {
    body.replaceChildren();
    const hasLines = data.lines && data.lines.length;
    mode = hasLines ? "edit" : "new";
    obsoleteBox.checked = data.obsolete === true;
    (data.lines || []).forEach(addRow);
    const chosen = selectedAssembly();
    assyName.textContent = chosen && chosen.name ? chosen.name : "Assembly";
    applyButtons();
  }

  async function loadBom(assemblyId) {
    const query = assemblyId ? "?assemblyId=" + encodeURIComponent(assemblyId) : "";
    const response = await fetch("/api/bom" + query);
    const data = await response.json();
    if (!response.ok) return;
    assemblies = data.assemblies || [];
    parts = data.parts || [];
    level = data.level;
    itemLevel = data.itemLevel;
    const keep = assemblyId || assemblyBox.value;
    assemblyBox.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    assemblyBox.append(empty);
    for (const row of assemblies) {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.code;
      assemblyBox.append(option);
    }
    assemblyBox.value = assemblies.some((row) => String(row.id) === String(keep)) ? String(keep) : "";
    showAssembly(data);
  }

  async function saveBom() {
    const editing = mode === "edit";
    const response = await fetch("/api/bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        assemblyId: Number(assemblyBox.value),
        obsolete: obsoleteBox.checked,
        lines: readLines(),
        confirmed: false
      })
    });
    const data = await response.json();
    if (!response.ok) return;
    if (!data.ok) return showInfo(data.message);
    if (data.ready) {
      const yes = await askYesNo(editing ? "Are You Sure To Modify ?" : "Are You Sure To Save ?");
      if (!yes) return;
      const saved = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          assemblyId: Number(assemblyBox.value),
          obsolete: obsoleteBox.checked,
          lines: readLines(),
          confirmed: true
        })
      });
      const result = await saved.json();
      if (!result.ok) return showInfo(result.message);
      showInfo(result.message);
      mode = "edit";
      applyButtons();
    }
  }

  heading.addEventListener("click", () => addRow());
  assemblyBox.addEventListener("change", () => {
    const chosen = selectedAssembly();
    assyName.textContent = chosen && chosen.name ? chosen.name : "Assembly";
    loadBom(assemblyBox.value);
  });
  saveButton.addEventListener("click", saveBom);
  modifyButton.addEventListener("click", () => {
    mode = "edit";
    saveBom();
  });
  copyButton.addEventListener("click", async () => {
    const response = await fetch("/api/bom/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assemblyId: Number(assemblyBox.value) })
    });
    const data = await response.json();
    if (!data.ok) return showInfo(data.message);
    await loadBom(data.id);
  });
  uploadButton.addEventListener("click", () => {
    status.textContent = "Form: frmUpload. This screen is not built yet.";
  });
  closeButton.addEventListener("click", closeBom);
  document.addEventListener("keyup", (event) => {
    if (panel.hidden) return;
    if (event.key === "F1") {
      status.textContent = "Help file: MasInvAssmDef.htm. That page is not in this copy.";
    }
    if (event.key === "F5") {
      if (!(Number(itemLevel) > 1)) {
        showInfo("You have no rights to add New Items!!! Contact your administrator!!!");
        return;
      }
      if (window.openItem) window.openItem();
    }
  });

  function closeBom() {
    panel.hidden = true;
  }

  window.openBom = function openBom() {
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
    panel.hidden = false;
    status.textContent = "";
    fetch("/api/session").then((response) => response.json()).then((data) => {
      title = data.factoryName || "Tamba ERP";
    });
    loadBom("");
  };

  window.closeBom = closeBom;
})();
