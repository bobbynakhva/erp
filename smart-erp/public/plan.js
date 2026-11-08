(() => {
  const panel = document.querySelector("#plan");
  const grid = document.querySelector("#plan-grid");
  const yearBox = document.querySelector("#plan-year");
  const machineBox = document.querySelector("#plan-machine");
  const itemBox = document.querySelector("#plan-items");
  const colors = document.querySelector("#plan-colors");
  const shiftBox = document.querySelector("#plan-shift");
  const fromBox = document.querySelector("#plan-from");
  const countBox = document.querySelector("#plan-count");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const JOIN = "\u008e";
  let weeks = [];
  let dayNames = [];
  let colorsGrid = [];
  let itemsGrid = [];
  let legend = [];
  let picked = -1;
  let direction = "";
  let catalog = { machines: [], items: [] };

  function showInfo(message) {
    return new Promise((resolve) => {
      infoTitle.textContent = document.title || "Tamba ERP";
      infoText.textContent = message;
      info.hidden = false;
      const ok = document.querySelector("#info-ok");
      function done() {
        ok.removeEventListener("click", done);
        info.hidden = true;
        resolve();
      }
      ok.addEventListener("click", done);
      ok.focus();
    });
  }

  function askYes(message) {
    return new Promise((resolve) => {
      askTitle.textContent = document.title || "Tamba ERP";
      askText.textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(answer) {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        ask.hidden = true;
        resolve(answer);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      yes.focus();
    });
  }

  function blankGrid() {
    return Array.from({ length: 52 }, () => [0, 0, 0, 0, 0, 0, 0]);
  }

  function clipOf(rows) {
    return rows.map((row) => row.map((value) => (value ? String(value) : "")).join("\t")).join("\r");
  }

  function parseClip(text) {
    const lines = String(text || "").split("\r");
    return Array.from({ length: 52 }, (_, index) => {
      const parts = (lines[index] || "").split("\t");
      return Array.from({ length: 7 }, (__, column) => Number(parts[column]) || 0);
    });
  }

  function applyPlan(planData) {
    const parts = String(planData || "").split(JOIN);
    itemsGrid = parts.length === 2 ? parseClip(parts[0]) : blankGrid();
    colorsGrid = parts.length === 2 ? parseClip(parts[1]) : blankGrid();
  }

  function oleCss(value) {
    const color = Number(value) >>> 0;
    const blue = color & 255;
    const green = (color >> 8) & 255;
    const red = (color >> 16) & 255;
    return "rgb(" + red + "," + green + "," + blue + ")";
  }

  function rollColor() {
    const used = new Set(legend.map((row) => Number(row.color)));
    function mix(redMax, greenMax, blueMax) {
      const red = Math.floor(Math.random() * redMax) % 256;
      const green = Math.floor(Math.random() * greenMax) % 256;
      const blue = Math.floor(Math.random() * blueMax) % 256;
      return blue + green * 256 + red * 65536;
    }
    let color = mix(0x28a, 0x15e, 0xfa);
    if (used.has(color) || color === 0) color = mix(0xfa, 0x60e, 0x28a);
    if (used.has(color) || color === 0) color = mix(0x28a, 0x15e, 0xfa) || 1;
    return color;
  }

  function ordinal(value) {
    const number = Number(value);
    if (number > 10 && number < 20) return "th";
    const last = number % 10;
    if (last === 1) return "st";
    if (last === 2) return "nd";
    if (last === 3) return "rd";
    return "th";
  }

  function digitsOnly(event) {
    if (event.key.length === 1 && (event.key < "0" || event.key > "9")) event.preventDefault();
  }

  function buildCalendar(year) {
    dayNames = [];
    for (let day = 1; day <= 7; day += 1) dayNames.push(WEEKDAYS[new Date(year, 0, day).getDay()]);
    const start = new Date(year, 0, 1);
    weeks = [];
    for (let index = 0; index < 52; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * 7);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      weeks.push({
        week: index + 1,
        date: day + "-" + month + "-" + date.getFullYear(),
        month: MONTHS[date.getMonth()]
      });
    }
  }

  function paintColors() {
    colors.innerHTML = "";
    const eraser = document.createElement("button");
    eraser.type = "button";
    eraser.textContent = "ERASER";
    eraser.style.background = "#d0d0d0";
    if (picked === 0) eraser.classList.add("picked");
    eraser.addEventListener("click", () => {
      picked = 0;
      paintColors();
    });
    colors.appendChild(eraser);
    legend.forEach((row, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = row.code;
      button.style.background = oleCss(row.color);
      if (picked === index + 1) button.classList.add("picked");
      button.addEventListener("click", () => {
        picked = index + 1;
        paintColors();
      });
      colors.appendChild(button);
    });
  }

  function paintGrid() {
    const table = document.createElement("table");
    const head = document.createElement("tr");
    ["Week", "Date"].concat(dayNames).concat(["Month"]).forEach((name) => {
      const cell = document.createElement("th");
      cell.textContent = name;
      head.appendChild(cell);
    });
    table.appendChild(head);
    weeks.forEach((week, rowIndex) => {
      const row = document.createElement("tr");
      const weekCell = document.createElement("td");
      weekCell.className = "plan-stub";
      weekCell.textContent = String(week.week);
      const dateCell = document.createElement("td");
      dateCell.className = "plan-stub";
      dateCell.textContent = week.date;
      row.appendChild(weekCell);
      row.appendChild(dateCell);
      for (let column = 0; column < 7; column += 1) {
        const cell = document.createElement("td");
        cell.className = "plan-day";
        const color = colorsGrid[rowIndex][column];
        if (color) {
          cell.style.background = oleCss(color);
          cell.style.color = oleCss(color);
          cell.textContent = String(color);
        }
        cell.addEventListener("click", () => paintDay(rowIndex, column));
        row.appendChild(cell);
      }
      const monthCell = document.createElement("td");
      monthCell.className = "plan-stub";
      monthCell.textContent = week.month;
      row.appendChild(monthCell);
      table.appendChild(row);
    });
    grid.innerHTML = "";
    grid.appendChild(table);
  }

  function paintDay(rowIndex, column) {
    if (!machineBox.value || picked < 0) return;
    if (picked === 0) {
      colorsGrid[rowIndex][column] = 0;
      itemsGrid[rowIndex][column] = 0;
    } else {
      const row = legend[picked - 1];
      colorsGrid[rowIndex][column] = Number(row.color);
      itemsGrid[rowIndex][column] = Number(row.itemId);
    }
    paintGrid();
  }

  function fillYears() {
    const current = new Date().getFullYear();
    yearBox.innerHTML = "";
    for (let year = 1980; year <= 2030; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      if (year === current) option.selected = true;
      yearBox.appendChild(option);
    }
  }

  function fillLists() {
    const selected = machineBox.value;
    machineBox.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = " ";
    machineBox.appendChild(blank);
    catalog.machines.forEach((machine) => {
      const option = document.createElement("option");
      option.value = String(machine.id);
      option.textContent = machine.name;
      machineBox.appendChild(option);
    });
    machineBox.value = selected;
    itemBox.innerHTML = "";
    catalog.items.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = item.code;
      itemBox.appendChild(option);
    });
  }

  async function loadPlan() {
    const year = yearBox.value;
    const mach = machineBox.value;
    shiftBox.disabled = !mach;
    if (!mach) {
      legend = [];
      picked = -1;
      applyPlan("");
      paintColors();
      paintGrid();
      return;
    }
    const response = await fetch("/api/plan?year=" + encodeURIComponent(year) + "&mach=" + encodeURIComponent(mach));
    if (response.status === 401) return;
    const data = await response.json();
    legend = data.legend || [];
    picked = -1;
    applyPlan(data.planData || "");
    paintColors();
    paintGrid();
  }

  async function savePlan() {
    if (!machineBox.value || legend.length === 0) {
      await showInfo("Save not allowed. You have not planned Anything");
      return;
    }
    const yes = await askYes("Are You Sure To Save Your Editing ?");
    if (!yes) return;
    const response = await fetch("/api/plan/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(yearBox.value),
        machId: Number(machineBox.value),
        legend: legend.map((row) => ({ itemId: row.itemId, color: row.color })),
        planData: clipOf(itemsGrid) + JOIN + clipOf(colorsGrid)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      await showInfo(data.error || "Save not allowed. You have not planned Anything");
      return;
    }
    await showInfo("Records Stored.");
  }

  async function shiftPlans() {
    if (!machineBox.value) return;
    if (fromBox.value === "" || countBox.value === "") {
      await showInfo("For Shifting Schedules, 'From Week' and 'How many Weeks' Values are required!!!");
      return;
    }
    const fromWeek = Number(fromBox.value);
    const howMany = Number(countBox.value);
    const down = direction === "down";
    if (down) {
      if (fromWeek + howMany > 52) {
        await showInfo("Shifting Operation is not possible!!! check your values 'From Week' and 'How Many Weeks'!!! ");
        return;
      }
    } else if (howMany === 0 || fromWeek === 0 || fromWeek <= howMany || fromWeek - howMany < 1) {
      await showInfo("Shifting Operation is not possible!!! check your values 'From Week' and 'How Many Weeks'!!! ");
      return;
    }
    const suffix = ordinal(fromWeek);
    const message = down
      ? "Are you sure to shift  DOWN  your Plans for " + countBox.value + " weeks, from " + fromBox.value + suffix + " Week "
      : "Are you sure to shift UP your Plans " + countBox.value + " weeks, from " + fromBox.value + suffix + " Week ";
    const yes = await askYes(message);
    if (!yes) return;
    if (down) {
      for (let count = 0; count < howMany; count += 1) {
        colorsGrid.splice(fromWeek - 1, 0, [0, 0, 0, 0, 0, 0, 0]);
        itemsGrid.splice(fromWeek - 1, 0, [0, 0, 0, 0, 0, 0, 0]);
      }
      colorsGrid.length = 52;
      itemsGrid.length = 52;
    } else {
      const index = fromWeek - howMany - 1;
      for (let count = 0; count < howMany; count += 1) {
        colorsGrid.splice(index, 1);
        itemsGrid.splice(index, 1);
      }
      while (colorsGrid.length < 52) {
        colorsGrid.push([0, 0, 0, 0, 0, 0, 0]);
        itemsGrid.push([0, 0, 0, 0, 0, 0, 0]);
      }
    }
    fromBox.value = "";
    countBox.value = "";
    paintGrid();
  }

  function markDirection(next) {
    direction = next;
    document.querySelector("#plan-up").style.outline = next === "up" ? "2px solid #000" : "";
    document.querySelector("#plan-down").style.outline = next === "down" ? "2px solid #000" : "";
  }

  yearBox.addEventListener("change", () => {
    buildCalendar(Number(yearBox.value));
    loadPlan();
  });
  machineBox.addEventListener("change", loadPlan);
  itemBox.addEventListener("dblclick", () => {
    const option = itemBox.selectedOptions[0];
    if (!option) return;
    if (legend.some((row) => row.code === option.textContent)) return;
    legend.push({ itemId: Number(option.value), code: option.textContent, color: rollColor() });
    picked = legend.length;
    paintColors();
  });
  fromBox.addEventListener("keypress", digitsOnly);
  countBox.addEventListener("keypress", digitsOnly);
  document.querySelector("#plan-up").addEventListener("click", () => markDirection("up"));
  document.querySelector("#plan-down").addEventListener("click", () => markDirection("down"));
  document.querySelector("#plan-go").addEventListener("click", shiftPlans);
  document.querySelector("#plan-save").addEventListener("click", savePlan);
  document.querySelector("#plan-close").addEventListener("click", () => { panel.hidden = true; });

  window.openPlan = async function openPlan() {
    panel.hidden = false;
    fillYears();
    const response = await fetch("/api/plan");
    if (response.status === 401) return;
    catalog = await response.json();
    fillLists();
    machineBox.value = "";
    buildCalendar(Number(yearBox.value));
    await loadPlan();
  };

  window.closePlan = function closePlan() {
    panel.hidden = true;
  };
})();
