// attendance.js - Human Resource: Attendance (frmAttendance)
// 100% legacy fidelity matching VB6 frmAttendance bytecode and UI screenshot

(function () {
  let activeYear = new Date().getFullYear();
  let activeMonthId = new Date().getMonth() + 1;
  let activeMonthName = "";
  let daysInMonth = 30;
  let monthsList = [];
  let holidaysStr = "";
  let staffList = [];
  let isModified = false;

  const section = document.getElementById("attendance");
  const yearInput = document.getElementById("att-year");
  const monthLabel = document.getElementById("att-month-label");
  const monthListEl = document.getElementById("att-month-list");
  const holidayListEl = document.getElementById("att-holiday-list");
  const dayNamesEl = document.getElementById("att-day-names");
  const gridHeader = document.getElementById("att-grid-header");
  const gridBody = document.getElementById("att-grid-body");
  const btnSave = document.getElementById("att-btn-save");
  const btnPrinter = document.getElementById("att-btn-printer");
  const btnClose = document.getElementById("att-btn-close");
  const btnCloseTop = document.getElementById("att-btn-close-top");

  const ALLOWED_ATT_CHARS = ["P", "L", "M", "A", "N", "H", " "];

  async function loadAttendanceData(year, monthId) {
    try {
      const res = await fetch(`/api/attendance?year=${year}&monthId=${monthId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to load attendance data");
        return;
      }
      const data = await res.json();
      activeYear = data.year;
      activeMonthId = data.monthId;
      activeMonthName = data.monthName || "";
      daysInMonth = data.daysInMonth;
      monthsList = data.months || [];
      holidaysStr = data.holidays || "".padEnd(daysInMonth, "0");
      staffList = data.staff || [];
      isModified = false;

      yearInput.value = activeYear;
      monthLabel.textContent = (activeMonthName || "MONTH").toUpperCase();

      renderMonthList();
      renderHolidays();
      renderGrid();
    } catch (e) {
      console.error("Attendance fetch error:", e);
      alert("Error loading attendance: " + e.message);
    }
  }

  function renderMonthList() {
    if (!monthListEl) return;
    monthListEl.innerHTML = "";
    monthsList.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m.monthname;
      li.style.padding = "3px 6px";
      li.style.cursor = "pointer";
      if (Number(m.monthid) === Number(activeMonthId)) {
        li.style.background = "#000080";
        li.style.color = "#ffffff";
        li.style.fontWeight = "bold";
      } else {
        li.style.background = "#ffffff";
        li.style.color = "#000000";
      }
      li.addEventListener("click", () => {
        if (Number(m.monthid) !== Number(activeMonthId)) {
          if (isModified && !confirm("Discard unsaved changes?")) {
            return;
          }
          activeMonthId = Number(m.monthid);
          loadAttendanceData(activeYear, activeMonthId);
        }
      });
      monthListEl.appendChild(li);
    });
  }

  function renderHolidays() {
    if (!holidayListEl || !dayNamesEl) return;

    // Render day initials for days 1..7 (lblDay in VB6 CD9AEC)
    dayNamesEl.innerHTML = "";
    for (let d = 1; d <= 7; d++) {
      const dt = new Date(activeYear, activeMonthId - 1, d);
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short" })[0]; // 'S', 'M', 'T', ...
      const div = document.createElement("div");
      div.textContent = dayName;
      dayNamesEl.appendChild(div);
    }

    // Render 1..daysInMonth checkboxes
    holidayListEl.innerHTML = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const isChecked = holidaysStr[d - 1] === "1";
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "2px";
      label.style.cursor = "pointer";
      label.style.fontSize = "11px";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = isChecked;
      chk.dataset.day = d;

      chk.addEventListener("change", (e) => {
        isModified = true;
        const dayIdx = Number(e.target.dataset.day) - 1;
        const checked = e.target.checked;
        const arr = holidaysStr.split("");
        arr[dayIdx] = checked ? "1" : "0";
        holidaysStr = arr.join("");

        // Legacy behavior (vbdec/128530379.txt lstHoliday_ItemCheck):
        // Automatically fills 'H' on checked, or clears 'H' on unchecked, for all staff attendance rows
        staffList.forEach((st) => {
          let lArr = (st.ldetail || "").padEnd(daysInMonth, " ").split("");
          if (checked) {
            lArr[dayIdx] = "H";
          } else {
            if (lArr[dayIdx] === "H") lArr[dayIdx] = " ";
          }
          st.ldetail = lArr.join("");
        });

        renderGrid();
      });

      label.appendChild(chk);
      label.appendChild(document.createTextNode(d));
      holidayListEl.appendChild(label);
    }
  }

  function renderGrid() {
    if (!gridHeader || !gridBody) return;

    // Build Header
    gridHeader.innerHTML = `
      <th style="border: 1px solid #999; padding: 4px; width: 35px; background: #d4d0c8;">Sl</th>
      <th style="border: 1px solid #999; padding: 4px; width: 55px; background: #d4d0c8;">StaffId</th>
      <th style="border: 1px solid #999; padding: 4px; text-align: left; min-width: 160px; background: #d4d0c8;">Name</th>
    `;
    for (let d = 1; d <= daysInMonth; d++) {
      const isH = holidaysStr[d - 1] === "1";
      const th = document.createElement("th");
      th.style.border = "1px solid #999";
      th.style.padding = "2px 4px";
      th.style.minWidth = "22px";
      th.style.background = isH ? "#ffd0d0" : "#d4d0c8";
      th.style.color = isH ? "#cc0000" : "#000000";
      th.textContent = d;
      gridHeader.appendChild(th);
    }

    // Build Body (2 alternating rows per staff)
    gridBody.innerHTML = "";
    if (staffList.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${daysInMonth + 3}" style="padding: 16px; color: #888; font-style: italic;">No Staff List available!!!</td>`;
      gridBody.appendChild(tr);
      return;
    }

    staffList.forEach((st, sIdx) => {
      const ldetailArr = (st.ldetail || "").padEnd(daysInMonth, " ").split("");
      const otdetailArr = (st.otdetail || "").split(",").map((v) => Number(v) || 0);
      while (otdetailArr.length < daysInMonth) otdetailArr.push(0);

      // Row 1: Attendance marks
      const trAtt = document.createElement("tr");
      trAtt.style.background = "#f4f4f4";

      const tdSl = document.createElement("td");
      tdSl.style.border = "1px solid #ccc";
      tdSl.style.padding = "2px";
      tdSl.textContent = sIdx + 1;
      trAtt.appendChild(tdSl);

      const tdId = document.createElement("td");
      tdId.style.border = "1px solid #ccc";
      tdId.style.padding = "2px";
      tdId.textContent = st.staffId;
      trAtt.appendChild(tdId);

      const tdName = document.createElement("td");
      tdName.style.border = "1px solid #ccc";
      tdName.style.padding = "2px 6px";
      tdName.style.textAlign = "left";
      tdName.style.fontWeight = "bold";
      tdName.textContent = st.staffName;
      trAtt.appendChild(tdName);

      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement("td");
        td.style.border = "1px solid #ccc";
        td.style.padding = "1px";
        const isH = holidaysStr[d - 1] === "1";
        if (isH) td.style.background = "#fff0f0";

        const inp = document.createElement("input");
        inp.type = "text";
        inp.maxLength = 1;
        inp.value = ldetailArr[d - 1] === " " ? "" : ldetailArr[d - 1];
        inp.style.width = "18px";
        inp.style.textAlign = "center";
        inp.style.fontWeight = "bold";
        inp.style.border = "none";
        inp.style.background = "transparent";
        inp.style.fontSize = "11px";
        if (isH) inp.style.color = "#cc0000";

        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" || e.key === "Delete") {
            inp.value = "";
            ldetailArr[d - 1] = " ";
            st.ldetail = ldetailArr.join("");
            isModified = true;
          }
        });

        inp.addEventListener("input", (e) => {
          let val = (e.target.value || "").toUpperCase();
          if (!ALLOWED_ATT_CHARS.includes(val)) {
            val = "";
          }
          inp.value = val;
          ldetailArr[d - 1] = val || " ";
          st.ldetail = ldetailArr.join("");
          isModified = true;
        });

        td.appendChild(inp);
        trAtt.appendChild(td);
      }
      gridBody.appendChild(trAtt);

      // Row 2: Overtime hours (OT hrs)
      const trOt = document.createElement("tr");
      trOt.style.background = "#ffffff";

      const tdOtBlank1 = document.createElement("td");
      tdOtBlank1.style.border = "1px solid #ccc";
      trOt.appendChild(tdOtBlank1);

      const tdOtBlank2 = document.createElement("td");
      tdOtBlank2.style.border = "1px solid #ccc";
      trOt.appendChild(tdOtBlank2);

      const tdOtLabel = document.createElement("td");
      tdOtLabel.style.border = "1px solid #ccc";
      tdOtLabel.style.padding = "2px 6px";
      tdOtLabel.style.textAlign = "left";
      tdOtLabel.style.fontStyle = "italic";
      tdOtLabel.style.color = "#555";
      tdOtLabel.textContent = "OT hrs";
      trOt.appendChild(tdOtLabel);

      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement("td");
        td.style.border = "1px solid #ccc";
        td.style.padding = "1px";

        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = otdetailArr[d - 1] > 0 ? otdetailArr[d - 1] : "";
        inp.style.width = "22px";
        inp.style.textAlign = "center";
        inp.style.border = "none";
        inp.style.background = "transparent";
        inp.style.fontSize = "10px";
        inp.style.color = "#000080";

        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" || e.key === "Delete") {
            inp.value = "";
            otdetailArr[d - 1] = 0;
            st.otdetail = otdetailArr.join(",");
            isModified = true;
          }
        });

        inp.addEventListener("change", (e) => {
          let num = parseFloat(e.target.value);
          if (isNaN(num) || num <= 0) {
            num = 0;
            inp.value = "";
          } else {
            inp.value = num;
          }
          otdetailArr[d - 1] = num;
          st.otdetail = otdetailArr.join(",");
          isModified = true;
        });

        td.appendChild(inp);
        trOt.appendChild(td);
      }
      gridBody.appendChild(trOt);
    });
  }

  async function saveAttendance() {
    if (staffList.length === 0) {
      alert("No Staff List available!!!");
      return;
    }

    const payload = {
      year: activeYear,
      monthId: activeMonthId,
      holidays: holidaysStr,
      records: staffList.map((st) => ({
        staffId: st.staffId,
        ldetail: (st.ldetail || "").padEnd(daysInMonth, " ").slice(0, daysInMonth),
        otdetail: (st.otdetail || new Array(daysInMonth).fill("0").join(","))
      }))
    };

    try {
      const res = await fetch("/api/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save attendance.");
        return;
      }
      alert(data.message || "Data Stored Successfully .");
      isModified = false;
      loadAttendanceData(activeYear, activeMonthId);
    } catch (e) {
      console.error("Save error:", e);
      alert("Error saving attendance: " + e.message);
    }
  }

  function printAttendance() {
    if (isModified) {
      if (confirm("Do you want to save changes?")) {
        saveAttendance().then(() => {
          openPrintWindow();
        });
        return;
      }
    }
    openPrintWindow();
  }

  function openPrintWindow() {
    window.open(`/api/print?type=attendance&year=${activeYear}&monthId=${activeMonthId}`, "_blank");
  }

  function openAttendance() {
    if (!section) return;
    section.hidden = false;
    section.focus?.();
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    loadAttendanceData(curYear, curMonth);
  }

  function closeAttendance() {
    if (!section) return;
    if (isModified && !confirm("Discard unsaved changes?")) {
      return;
    }
    section.hidden = true;
  }

  // Event Listeners
  if (yearInput) {
    yearInput.addEventListener("change", () => {
      const yr = Number(yearInput.value);
      if (yr >= 1990 && yr <= 2099) {
        activeYear = yr;
        loadAttendanceData(activeYear, activeMonthId);
      }
    });
  }

  if (btnSave) btnSave.addEventListener("click", saveAttendance);
  if (btnPrinter) btnPrinter.addEventListener("click", printAttendance);
  if (btnClose) btnClose.addEventListener("click", closeAttendance);
  if (btnCloseTop) btnCloseTop.addEventListener("click", closeAttendance);

  // Global window exposure
  window.openAttendance = openAttendance;
  window.closeAttendance = closeAttendance;
})();
