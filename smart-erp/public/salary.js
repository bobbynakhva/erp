// Human Resource - Salary (frmSalary)
(function () {
  const state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    salDate: getTodayDate(),
    workingDays: 30,
    staffList: [],
    currentStaffId: null,
    currentStaffName: "",
    mode: "save",
    record: null,
    settings: { pfRate: 12, esiRate: 1.75 }
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function numVal(id) {
    const v = Number(el(id)?.value || 0);
    return isNaN(v) ? 0 : v;
  }

  function setNum(id, val) {
    const elem = el(id);
    if (!elem) return;
    const n = Number(val || 0);
    elem.value = isNaN(n) ? "0.00" : n.toFixed(2);
  }

  async function initSalary() {
    try {
      const res = await fetch(`/api/salary/init?year=${state.year}&month=${state.month}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to initialize salary module.");
        return;
      }

      state.settings = data.settings || state.settings;
      state.workingDays = data.workingDays || 30;
      if (el("sal-working-days")) el("sal-working-days").value = state.workingDays;
      if (el("sal-year")) el("sal-year").value = state.year;
      if (el("sal-date")) el("sal-date").value = state.salDate;

      // Render months
      const monthSel = el("sal-month");
      if (monthSel && data.months) {
        let mOpts = "";
        data.months.forEach((m) => {
          mOpts += `<option value="${m.monthid}" ${m.monthid === state.month ? "selected" : ""}>${escapeHtml(m.monthname)}</option>`;
        });
        monthSel.innerHTML = mOpts;
      }

      state.staffList = data.staffList || [];
      renderStaffList();

      if (state.staffList.length === 0) {
        alert("Without Employee List, You cannot work in this screen");
        return;
      }

      // Auto-select first staff
      selectStaff(state.staffList[0].staff_id);
    } catch (err) {
      console.error("initSalary error:", err);
    }
  }

  function renderStaffList() {
    const listDiv = el("sal-staff-list");
    if (!listDiv) return;

    if (state.staffList.length === 0) {
      listDiv.innerHTML = '<div style="padding: 8px; color: #777; font-size: 11px;">No employees found</div>';
      return;
    }

    let html = "";
    state.staffList.forEach((s) => {
      const isSelected = state.currentStaffId === s.staff_id;
      const bg = isSelected ? "#003399" : "#fff";
      const color = isSelected ? "#fff" : "#000";
      html += `<div class="sal-staff-item" data-id="${s.staff_id}" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: ${bg}; color: ${color}; border-bottom: 1px solid #f0f0f0;">
        ${escapeHtml(s.staff_name)}
      </div>`;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll(".sal-staff-item").forEach((item) => {
      item.addEventListener("click", () => {
        const staffId = Number(item.dataset.id);
        selectStaff(staffId);
      });
    });
  }

  async function selectStaff(staffId) {
    state.currentStaffId = staffId;
    renderStaffList();

    const emp = state.staffList.find((s) => s.staff_id === staffId);
    state.currentStaffName = emp ? emp.staff_name : "";
    if (el("sal-lbl-dept")) el("sal-lbl-dept").textContent = emp?.dept || "-";

    try {
      const res = await fetch(`/api/salary?year=${state.year}&month=${state.month}&staffId=${staffId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load employee salary details.");
        return;
      }

      state.mode = data.mode || "save";
      state.record = data.record || {};
      populateForm(state.record);

      if (el("sal-lbl-mode")) {
        el("sal-lbl-mode").textContent = state.mode === "modify" ? "Saved Salary (Modify Mode)" : "New Salary Entry";
        el("sal-lbl-mode").style.color = state.mode === "modify" ? "#008800" : "#003399";
      }
      if (el("sal-btn-save")) {
        el("sal-btn-save").textContent = state.mode === "modify" ? "Modify" : "Save";
      }

      // If new, automatically calculate initial values
      if (state.mode === "save") {
        await doCalc(false);
      }
    } catch (err) {
      console.error("selectStaff error:", err);
    }
  }

  function populateForm(r) {
    if (!r) return;
    if (el("sal-date")) el("sal-date").value = r.saldate ? String(r.saldate).slice(0, 10) : getTodayDate();
    if (el("sal-working-days")) el("sal-working-days").value = r.workingdays !== undefined ? r.workingdays : state.workingDays;
    if (el("sal-days-present")) el("sal-days-present").value = r.dayspresent !== undefined ? r.dayspresent : 0;
    if (el("sal-leave-days")) el("sal-leave-days").value = r.leavedays !== undefined ? r.leavedays : 0;
    if (el("sal-basic")) el("sal-basic").value = Number(r.basic || 0);
    if (el("sal-da")) el("sal-da").value = Number(r.da || 0);
    if (el("sal-chk-da2pf")) el("sal-chk-da2pf").checked = !!r.da2pf;

    if (el("sal-opt-hra-basic")) el("sal-opt-hra-basic").checked = r.hrabasic !== false;
    if (el("sal-opt-hra-fixed")) el("sal-opt-hra-fixed").checked = r.hrabasic === false;
    if (el("sal-hra")) el("sal-hra").value = Number(r.hra || 0);

    if (el("sal-opt-convey-day")) el("sal-opt-convey-day").checked = r.conveyday !== false;
    if (el("sal-opt-convey-month")) el("sal-opt-convey-month").checked = r.conveyday === false;
    if (el("sal-convey")) el("sal-convey").value = Number(r.conveyance || 0);

    if (el("sal-medical")) el("sal-medical").value = Number(r.medicalallow || 0);
    if (el("sal-chk-attbonus")) el("sal-chk-attbonus").checked = !!r.attbonusapplicable;
    if (el("sal-attbonus")) el("sal-attbonus").value = Number(r.attbonus || 0);

    if (el("sal-ot-hrs")) el("sal-ot-hrs").value = Number(r.ot || 0);
    if (el("sal-ot-times")) el("sal-ot-times").value = Number(r.ottimes || 1);
    if (el("sal-opt-ot-basic")) el("sal-opt-ot-basic").checked = r.otbasic !== false;
    if (el("sal-opt-ot-fixed")) el("sal-opt-ot-fixed").checked = r.otbasic === false;

    if (el("sal-splallow")) el("sal-splallow").value = Number(r.splallow || 0);
    if (el("sal-other-allow")) el("sal-other-allow").value = Number(r.otherallow || 0);
    if (el("sal-misc-earning")) el("sal-misc-earning").value = Number(r.miscearning || 0);
    setNum("sal-gross", r.gross);

    if (el("sal-chk-pf")) el("sal-chk-pf").checked = r.pfapplicable !== false;
    setNum("sal-pf", r.pf);
    if (el("sal-chk-esi")) el("sal-chk-esi").checked = r.esiapplicable !== false;
    setNum("sal-esi", r.esi);
    if (el("sal-chk-pt")) el("sal-chk-pt").checked = r.ptapplicable !== false;
    setNum("sal-pt", r.pt);

    if (el("sal-advance")) el("sal-advance").value = Number(r.saladvance || 0);
    if (el("sal-loan")) el("sal-loan").value = Number(r.loanamtded || 0);
    if (el("sal-tds")) el("sal-tds").value = Number(r.tds || 0);
    if (el("sal-society")) el("sal-society").value = Number(r.society || 0);
    if (el("sal-insurance")) el("sal-insurance").value = Number(r.insurance || 0);
    if (el("sal-fines")) el("sal-fines").value = Number(r.fines || 0);
    if (el("sal-damage")) el("sal-damage").value = Number(r.damageloss || 0);
    if (el("sal-other-ded")) el("sal-other-ded").value = Number(r.otherded || 0);

    setNum("sal-totded", r.totded);
    if (el("sal-oldbal")) el("sal-oldbal").value = Number(r.oldbal || 0);
    setNum("sal-netpay", r.netpay);
    if (el("sal-paid")) el("sal-paid").value = Number(r.paid !== undefined ? r.paid : (r.netpay || 0));
    setNum("sal-balance", r.balance);
  }

  function getFormPayload() {
    return {
      salyear: state.year,
      salmonth: state.month,
      saldate: el("sal-date")?.value || getTodayDate(),
      staffid: state.currentStaffId,
      dept: el("sal-lbl-dept")?.textContent || "",
      workingdays: numVal("sal-working-days"),
      dayspresent: numVal("sal-days-present"),
      leavedays: numVal("sal-leave-days"),
      basic: numVal("sal-basic"),
      da: numVal("sal-da"),
      da2pf: !!el("sal-chk-da2pf")?.checked,
      hrabasic: !!el("sal-opt-hra-basic")?.checked,
      hra: numVal("sal-hra"),
      conveyday: !!el("sal-opt-convey-day")?.checked,
      conveyance: numVal("sal-convey"),
      medicalallow: numVal("sal-medical"),
      attbonusapplicable: !!el("sal-chk-attbonus")?.checked,
      attbonus: numVal("sal-attbonus"),
      ot: numVal("sal-ot-hrs"),
      ottimes: numVal("sal-ot-times"),
      otbasic: !!el("sal-opt-ot-basic")?.checked,
      splallow: numVal("sal-splallow"),
      otherallow: numVal("sal-other-allow"),
      miscearning: numVal("sal-misc-earning"),
      gross: numVal("sal-gross"),
      pfapplicable: !!el("sal-chk-pf")?.checked,
      pf: numVal("sal-pf"),
      pfRate: state.settings.pfRate,
      esiapplicable: !!el("sal-chk-esi")?.checked,
      esi: numVal("sal-esi"),
      esiRate: state.settings.esiRate,
      ptapplicable: !!el("sal-chk-pt")?.checked,
      pt: numVal("sal-pt"),
      saladvance: numVal("sal-advance"),
      loanamtded: numVal("sal-loan"),
      loandedid: state.record?.loandedid || null,
      tds: numVal("sal-tds"),
      society: numVal("sal-society"),
      insurance: numVal("sal-insurance"),
      fines: numVal("sal-fines"),
      damageloss: numVal("sal-damage"),
      otherded: numVal("sal-other-ded"),
      totded: numVal("sal-totded"),
      oldbal: numVal("sal-oldbal"),
      netpay: numVal("sal-netpay"),
      paid: numVal("sal-paid"),
      balance: numVal("sal-balance")
    };
  }

  async function doCalc(showAlerts = true) {
    const payload = getFormPayload();

    try {
      const res = await fetch("/api/salary/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (showAlerts) alert(data.error || "Calculation error.");
        return false;
      }

      setNum("sal-gross", data.gross);
      setNum("sal-pf", data.pf);
      setNum("sal-esi", data.esi);
      setNum("sal-pt", data.pt);
      setNum("sal-totded", data.totded);
      setNum("sal-netpay", data.netpay);
      if (el("sal-paid") && (!el("sal-paid").value || el("sal-paid").value === "0.00" || el("sal-paid").value === "0")) {
        el("sal-paid").value = data.paid;
      }
      const paidVal = numVal("sal-paid");
      const balVal = Math.round((data.netpay - paidVal) * 100) / 100;
      setNum("sal-balance", balVal);
      return true;
    } catch (err) {
      console.error("doCalc error:", err);
      if (showAlerts) alert("Calculation failed: " + err.message);
      return false;
    }
  }

  async function handleSave() {
    if (!state.currentStaffId) {
      alert("Without Employee List, You cannot work in this screen");
      return;
    }

    const calcOk = await doCalc(true);
    if (!calcOk) return;

    const confirmMsg = state.mode === "modify" ? "Are You Sure To Modify?" : "Are You Sure To Save?";
    if (!confirm(confirmMsg)) return;

    const payload = getFormPayload();

    try {
      const res = await fetch("/api/salary/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save salary.");
        return;
      }

      alert(data.message || "Record Stored successfully.");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving salary: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.currentStaffId || state.mode !== "modify") {
      alert("No Data to Delete!!!");
      return;
    }

    if (!confirm("Are You Sure To Delete?")) return;

    try {
      const res = await fetch("/api/salary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salyear: state.year,
          salmonth: state.month,
          staffid: state.currentStaffId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete salary.");
        return;
      }

      alert(data.message || "Record Deleted successfully.");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting salary: " + err.message);
    }
  }

  function handlePrint() {
    if (!state.currentStaffId) {
      alert("Select an employee first.");
      return;
    }
    window.open(`/api/print?type=salary&year=${state.year}&month=${state.month}&staffId=${state.currentStaffId}`, "_blank");
  }

  function handlePrintAll() {
    window.open(`/api/print?type=salary-register&year=${state.year}&month=${state.month}`, "_blank");
  }

  function openSalary() {
    const sec = el("salary");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    initSalary();
  }

  function closeSalary() {
    const sec = el("salary");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function bindEvents() {
    el("sal-btn-close-top")?.addEventListener("click", closeSalary);
    el("sal-btn-exit")?.addEventListener("click", closeSalary);
    el("sal-btn-calc")?.addEventListener("click", () => doCalc(true));
    el("sal-btn-save")?.addEventListener("click", handleSave);
    el("sal-btn-delete")?.addEventListener("click", handleDelete);
    el("sal-btn-print")?.addEventListener("click", handlePrint);
    el("sal-btn-print-all")?.addEventListener("click", handlePrintAll);

    el("sal-year")?.addEventListener("change", (e) => {
      state.year = Number(e.target.value);
      initSalary();
    });

    el("sal-month")?.addEventListener("change", (e) => {
      state.month = Number(e.target.value);
      initSalary();
    });

    el("sal-paid")?.addEventListener("input", () => {
      const netPay = numVal("sal-netpay");
      const paid = numVal("sal-paid");
      setNum("sal-balance", netPay - paid);
    });

    // Auto calculate on basic, ot, etc. changes
    ["sal-basic", "sal-da", "sal-hra", "sal-convey", "sal-medical", "sal-attbonus", "sal-ot-hrs", "sal-ot-times", "sal-advance", "sal-loan"].forEach((id) => {
      el(id)?.addEventListener("blur", () => doCalc(false));
    });

    window.openSalary = openSalary;
    window.closeSalary = closeSalary;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindEvents);
  } else {
    bindEvents();
  }
})();
