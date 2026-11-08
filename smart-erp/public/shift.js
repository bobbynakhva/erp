(() => {
  const panel = document.querySelector("#shift");
  const dateBox = document.querySelector("#shift-date");
  const dayLabel = document.querySelector("#shift-day");
  const startLabel = document.querySelector("#shift-start");
  const weekLabel = document.querySelector("#shift-week");
  const body = document.querySelector("#shift-body");
  const saveButton = document.querySelector("#shift-save");
  const status = document.querySelector("#shift-status");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  let title = "";
  let rows = [];

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

  function todayIso() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function asDate(iso) {
    return new Date(iso + "T00:00:00");
  }

  function formatDmy(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return day + "/" + month + "/" + date.getFullYear();
  }

  function mondayOf(iso) {
    const date = asDate(iso);
    const day = date.getDay();
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
    return date;
  }

  function weekNumber(iso) {
    const date = asDate(iso);
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const start = new Date(jan1);
    start.setDate(jan1.getDate() - jan1.getDay());
    return Math.floor((date - start) / 86400000 / 7) + 1;
  }

  function paintDate() {
    const iso = dateBox.value || todayIso();
    dayLabel.textContent = asDate(iso).toLocaleDateString("en-US", { weekday: "long" });
    startLabel.textContent = "Shift Start Date\n" + formatDmy(mondayOf(iso));
    weekLabel.textContent = "Shift Start Week\n" + weekNumber(iso);
  }

  function cellInput(row, key) {
    const input = document.createElement("input");
    input.value = row[key];
    input.maxLength = 1;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "Tab" || event.key === "Enter") return;
      if (event.ctrlKey || event.metaKey || event.key.length !== 1) return;
      const letter = event.key.toUpperCase();
      if (!"ABCG".includes(letter)) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      input.value = letter;
      row[key] = letter;
    });
    input.addEventListener("input", () => {
      const letter = input.value.toUpperCase().replace(/[^ABCG]/g, "").slice(0, 1);
      input.value = letter;
      row[key] = letter;
    });
    return input;
  }

  function cellOff(row) {
    const select = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    select.append(blank);
    for (const day of days) {
      const option = document.createElement("option");
      option.value = day;
      option.textContent = day;
      select.append(option);
    }
    select.value = days.includes(row.woff) ? row.woff : "";
    select.addEventListener("change", () => {
      row.woff = select.value;
    });
    return select;
  }

  function paintRows() {
    body.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.dataset.staffId = String(row.staffId);
      const name = document.createElement("td");
      name.textContent = row.staffName;
      const weeks = ["w1", "w2", "w3", "w4"].map((key) => {
        const td = document.createElement("td");
        td.append(cellInput(row, key));
        return td;
      });
      const off = document.createElement("td");
      off.append(cellOff(row));
      tr.append(name, ...weeks, off);
      body.append(tr);
    }
  }

  function focusCell(staffId, column) {
    const tr = body.querySelector('tr[data-staff-id="' + staffId + '"]');
    if (!tr) return;
    const index = column === 6 ? 5 : column - 1;
    const control = tr.children[index] && tr.children[index].querySelector("input, select");
    if (control) control.focus();
  }

  function payload(confirmed) {
    return {
      prepDate: dateBox.value,
      confirmed,
      rows: rows.map((row) => ({
        staffId: row.staffId,
        staffName: row.staffName,
        w1: row.w1,
        w2: row.w2,
        w3: row.w3,
        w4: row.w4,
        woff: row.woff
      }))
    };
  }

  function applyPrep(prepDate) {
    if (prepDate) {
      dateBox.value = prepDate;
      saveButton.textContent = "Modify";
    } else {
      dateBox.value = todayIso();
      saveButton.textContent = "Save";
    }
    paintDate();
  }

  async function loadShift() {
    const response = await fetch("/api/shift");
    const data = await response.json();
    if (!response.ok) {
      panel.hidden = true;
      return;
    }
    title = data.title || "";
    rows = data.rows || [];
    const byte = data.right == null ? null : (Number(data.right) & 255);
    saveButton.disabled = !(byte > 3);
    applyPrep(data.prepDate);
    paintRows();
    panel.hidden = false;
    panel.focus();
  }

  async function saveShift() {
    status.textContent = "";
    let response = await fetch("/api/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(false))
    });
    let data = await response.json();
    if (!response.ok) return false;
    if (!data.ok) {
      showInfo(data.message);
      if (data.staffId) focusCell(data.staffId, data.column);
      return false;
    }
    if (!await askYesNo("Are You Sure To Save?")) return false;
    response = await fetch("/api/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(true))
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.message) showInfo(data.message);
      return false;
    }
    if (data.prepDate) saveButton.textContent = "Modify";
    showInfo(data.message);
    return true;
  }

  async function printShift() {
    status.textContent = "";
    if (saveButton.textContent === "Save") {
      if (await askYesNo("Do you want to save changes?")) {
        await saveShift();
        return;
      }
    }
    if (!rows.length) {
      showInfo("No data to Print...");
      return;
    }
    if (window.smartPrint) window.smartPrint(document.querySelector("#shift"));
  }

  function openShift() {
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeUserStatus) window.closeUserStatus();
    if (window.closeStaff) window.closeStaff();
    if (window.closeHeadings) window.closeHeadings();
    if (window.closeMachine) window.closeMachine();
    if (window.closeCustomer) window.closeCustomer();
    if (window.closeSupplier) window.closeSupplier();
    if (window.closeVendor) window.closeVendor();
    if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
    status.textContent = "";
    loadShift();
  }

  function closeShift() {
    panel.hidden = true;
  }

  dateBox.addEventListener("change", paintDate);
  saveButton.addEventListener("click", saveShift);
  document.querySelector("#shift-print").addEventListener("click", printShift);
  document.querySelector("#shift-close").addEventListener("click", closeShift);
  window.openShift = openShift;
  window.closeShift = closeShift;
})();
