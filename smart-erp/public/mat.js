(() => {
  const panel = document.querySelector("#mat");
  const list = document.querySelector("#mat-list");
  const grid = document.querySelector("#mat-grid");
  const filters = document.querySelector("#mat-filters");
  const corner = document.querySelector("#mat-corner");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  let data = { assemblies: [], parts: [], components: [] };
  let shown = null;

  function showInfo(message) {
    infoTitle.textContent = document.title || "Tamba ERP";
    infoText.textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function amount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function textOf(value) {
    if (!Number.isFinite(value)) return "";
    return String(Math.round(value * 1000) / 1000);
  }

  function paintList(rows) {
    list.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All";
    list.appendChild(all);
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.code;
      list.appendChild(option);
    });
    list.selectedIndex = -1;
  }

  function mode() {
    return document.querySelector("#mat-assm").checked ? "assembly" : "component";
  }

  function chosenParts(assemblyId) {
    if (assemblyId === "all") return data.parts.slice();
    return data.parts
      .filter((part) => Object.prototype.hasOwnProperty.call(part.utils, assemblyId))
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  function applyNumbers() {
    if (!shown) return;
    shown.parts.forEach((part) => {
      let required = 0;
      shown.assemblies.forEach((assembly) => {
        required += amount(assembly.po) * amount(part.utils[String(assembly.id)]);
      });
      part.required = required > 0 ? required : null;
      if (part.required === null || part.required === part.stock) part.deficit = null;
      else part.deficit = Math.abs(part.required - part.stock);
      const raw = amount(part.weight) * amount(part.deficit);
      part.rawNeed = raw > 0 ? raw : null;
    });
  }

  function paintGrid() {
    grid.innerHTML = "";
    if (!shown) return;
    const table = document.createElement("table");
    const head = document.createElement("tr");
    const label = document.createElement("th");
    label.textContent = corner.textContent;
    head.appendChild(label);
    shown.assemblies.forEach((assembly) => {
      const cell = document.createElement("th");
      cell.textContent = assembly.code;
      cell.dataset.col = "assembly";
      cell.dataset.id = String(assembly.id);
      head.appendChild(cell);
    });
    ["Req. Qty", "Stock", "Deficit Qty", "Raw Material Name", "RM Qty / Unit", "Req. RM Qty"].forEach((name, index) => {
      const cell = document.createElement("th");
      cell.textContent = name;
      if (index < 3) cell.dataset.mid = "1";
      head.appendChild(cell);
    });
    table.appendChild(head);
    shown.parts.forEach((part) => {
      const row = document.createElement("tr");
      row.dataset.row = "part";
      const name = document.createElement("td");
      name.textContent = part.code;
      row.appendChild(name);
      shown.assemblies.forEach((assembly) => {
        const cell = document.createElement("td");
        cell.dataset.col = "assembly";
        cell.dataset.id = String(assembly.id);
        const util = part.utils[String(assembly.id)];
        cell.textContent = util === undefined ? "" : textOf(util);
        row.appendChild(cell);
      });
      const required = document.createElement("td");
      required.dataset.mid = "1";
      required.textContent = part.required === null ? "" : textOf(part.required);
      const stock = document.createElement("td");
      stock.dataset.mid = "1";
      stock.textContent = textOf(part.stock);
      const deficit = document.createElement("td");
      deficit.dataset.mid = "1";
      deficit.textContent = part.deficit === null ? "" : textOf(part.deficit);
      const rawName = document.createElement("td");
      rawName.textContent = part.category === 2 ? part.rmCode : "";
      if (part.rawNeed !== null && part.rmUnit) rawName.textContent += "  " + part.rmUnit;
      const rawEach = document.createElement("td");
      rawEach.textContent = part.weight === null || part.weight === undefined ? "" : textOf(Math.round(part.weight * 1000) / 1000);
      const rawNeed = document.createElement("td");
      rawNeed.dataset.raw = "1";
      rawNeed.textContent = part.rawNeed === null ? "" : textOf(part.rawNeed);
      [required, stock, deficit, rawName, rawEach, rawNeed].forEach((cell) => row.appendChild(cell));
      table.appendChild(row);
    });
    const poRow = document.createElement("tr");
    poRow.dataset.row = "po";
    const poLabel = document.createElement("td");
    poLabel.textContent = "PO Balance";
    poLabel.style.color = "#0000ff";
    poRow.appendChild(poLabel);
    shown.assemblies.forEach((assembly) => {
      const cell = document.createElement("td");
      cell.dataset.col = "assembly";
      cell.dataset.id = String(assembly.id);
      const input = document.createElement("input");
      input.value = assembly.po ? textOf(assembly.po) : "";
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^\d.]/g, "");
        assembly.po = amount(input.value);
      });
      cell.appendChild(input);
      poRow.appendChild(cell);
    });
    for (let extra = 0; extra < 6; extra += 1) {
      const cell = document.createElement("td");
      if (extra < 3) cell.dataset.mid = "1";
      poRow.appendChild(cell);
    }
    table.appendChild(poRow);
    grid.appendChild(table);
    applyFilter();
  }

  function applyFilter() {
    const rows = grid.querySelectorAll("tr[data-row='part']");
    const assemblyCells = grid.querySelectorAll("[data-col='assembly']");
    rows.forEach((row) => row.classList.remove("mat-hide"));
    assemblyCells.forEach((cell) => cell.classList.remove("mat-hide"));
    if (!shown || document.querySelector("#mat-all").checked) return;
    if (document.querySelector("#mat-po").checked) {
      shown.assemblies.forEach((assembly) => {
        if (amount(assembly.po) !== 0) return;
        grid.querySelectorAll(`[data-col='assembly'][data-id='${assembly.id}']`).forEach((cell) => {
          cell.classList.add("mat-hide");
        });
      });
      grid.querySelectorAll("[data-mid]").forEach((cell) => cell.classList.add("mat-hide"));
      return;
    }
    rows.forEach((row) => {
      const raw = row.querySelector("[data-raw]");
      if (!raw || amount(raw.textContent) === 0) row.classList.add("mat-hide");
    });
  }

  function view() {
    if (list.selectedIndex < 0) {
      showInfo("Select the Item ");
      return;
    }
    if (mode() === "component") {
      shown = null;
      grid.innerHTML = "";
      filters.hidden = true;
      showInfo(" No data to calculate....");
      return;
    }
    const assemblyId = list.value;
    const assemblies = assemblyId === "all"
      ? data.assemblies.slice()
      : data.assemblies.filter((row) => String(row.id) === assemblyId);
    const parts = chosenParts(assemblyId).map((part) => ({ ...part, utils: { ...part.utils } }));
    if (assemblies.length < 1 || parts.length < 1) {
      shown = null;
      grid.innerHTML = "";
      filters.hidden = true;
      showInfo(" No data to calculate....");
      return;
    }
    shown = { assemblies, parts };
    applyNumbers();
    filters.hidden = false;
    document.querySelector("#mat-all").checked = true;
    paintGrid();
  }

  document.querySelector("#mat-comp").addEventListener("change", () => {
    if (!document.querySelector("#mat-comp").checked) return;
    corner.textContent = "Raw Material\\Component-->";
    shown = null;
    grid.innerHTML = "";
    filters.hidden = true;
    paintList(data.components);
  });
  document.querySelector("#mat-assm").addEventListener("change", () => {
    if (!document.querySelector("#mat-assm").checked) return;
    corner.textContent = "Item\\Assembly-->";
    shown = null;
    grid.innerHTML = "";
    filters.hidden = true;
    paintList(data.assemblies);
  });
  document.querySelector("#mat-view").addEventListener("click", view);
  document.querySelector("#mat-calc").addEventListener("click", () => {
    if (!shown || shown.assemblies.length < 1 || shown.parts.length < 1) {
      showInfo(" No data to calculate....");
      return;
    }
    applyNumbers();
    paintGrid();
  });
  ["#mat-all", "#mat-po", "#mat-deficit"].forEach((selector) => {
    document.querySelector(selector).addEventListener("change", applyFilter);
  });
  document.querySelector("#mat-close").addEventListener("click", () => { panel.hidden = true; });

  window.openMat = async () => {
    panel.hidden = false;
    const response = await fetch("/api/mat-req");
    if (response.status === 401) return;
    data = await response.json();
    document.querySelector("#mat-comp").checked = true;
    corner.textContent = "Raw Material\\Component-->";
    shown = null;
    grid.innerHTML = "";
    filters.hidden = true;
    paintList(data.components || []);
  };
  window.closeMat = () => { panel.hidden = true; };
})();
