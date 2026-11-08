// Human Resource - Staff Loan (frmStaffLoan)
(function () {
  const state = {
    currentStaffId: null,
    currentStaffName: "",
    staffList: [],
    loans: [],
    recovery: [],
    totalBalance: 0,
    mode: "save",
    currentOnly: true
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

  function formatDateForDisplay(dStr) {
    if (!dStr) return "";
    if (dStr.includes("/")) return dStr;
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  }

  async function loadStaffList() {
    const listDiv = el("loan-staff-list");
    if (!listDiv) return;

    try {
      const res = await fetch(`/api/staff-loan?current=${state.currentOnly}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load staff list.");
        return;
      }
      state.staffList = data.staffList || [];
      renderStaffList();
    } catch (err) {
      console.error("loadStaffList error:", err);
    }
  }

  function renderStaffList() {
    const listDiv = el("loan-staff-list");
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
      html += `<div class="loan-staff-item" data-id="${s.staff_id}" style="padding: 4px 8px; font-size: 11px; cursor: pointer; background: ${bg}; color: ${color}; border-bottom: 1px solid #f0f0f0;">
        ${escapeHtml(s.staff_name)}
      </div>`;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll(".loan-staff-item").forEach((item) => {
      item.addEventListener("click", () => {
        const staffId = Number(item.dataset.id);
        selectStaff(staffId);
      });
    });
  }

  async function selectStaff(staffId) {
    state.currentStaffId = staffId;
    renderStaffList();

    try {
      const res = await fetch(`/api/staff-loan?staffId=${staffId}&current=${state.currentOnly}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load employee loan details.");
        return;
      }

      state.currentStaffName = data.selectedStaff ? data.selectedStaff.staff_name : "";
      state.loans = data.loans || [];
      state.recovery = data.recovery || [];
      state.totalBalance = Number(data.totalBalance || 0);
      state.mode = data.mode || "save";

      if (el("loan-lbl-name")) {
        el("loan-lbl-name").textContent = state.currentStaffName || "Staff #" + staffId;
      }
      if (el("loan-lbl-bal")) {
        el("loan-lbl-bal").textContent = state.totalBalance.toFixed(2);
      }
      if (el("loan-btn-save")) {
        el("loan-btn-save").textContent = state.mode === "modify" ? "Modify" : "Save";
      }

      renderMainGrid();
      renderRecoveryGrid();

      if (state.loans.length === 0) {
        // Legacy message when an employee with no loans is clicked:
        // "No Loans available for this Employee."
        // We will add an empty row ready for input so user can conveniently enter the loan
        addLoanRow();
      }
    } catch (err) {
      console.error("selectStaff error:", err);
    }
  }

  function addLoanRow() {
    const slNo = state.loans.length + 1;
    state.loans.push({
      loanId: 0,
      slNo: slNo,
      description: "",
      loanAmt: 0,
      repayPeriod: 1,
      loanDate: getTodayDate(),
      balance: 0,
      isNew: true
    });
    renderMainGrid();
  }

  function renderMainGrid() {
    const tbody = el("loan-tbody-main");
    if (!tbody) return;

    if (state.loans.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 12px; color: #777;">Click "+ Add Loan Row" to add a new loan</td></tr>';
      return;
    }

    let html = "";
    state.loans.forEach((l, idx) => {
      const slNo = idx + 1;
      l.slNo = slNo;
      const loanNoDisplay = l.loanId && l.loanId > 0 ? l.loanId : "(New)";
      const isExisting = l.loanId && l.loanId > 0;

      html += `<tr data-idx="${idx}" style="border-bottom: 1px solid #ddd; background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 4px; text-align: center; font-weight: bold; color: #555;">${loanNoDisplay}</td>
        <td style="padding: 4px; text-align: center;">${slNo}</td>
        <td style="padding: 4px;">
          <input type="text" class="loan-input-desc" data-idx="${idx}" value="${escapeHtml(l.description || l.reason || '')}" style="width: 100%; box-sizing: border-box; padding: 2px 4px; font-size: 11px; border: 1px solid #ccc;" placeholder="Loan Description / Reason" />
        </td>
        <td style="padding: 4px; text-align: right;">
          <input type="number" step="0.01" min="0" class="loan-input-amt" data-idx="${idx}" value="${Number(l.loanAmt || l.loanamt || 0)}" style="width: 80px; text-align: right; box-sizing: border-box; padding: 2px 4px; font-size: 11px; border: 1px solid #ccc;" />
        </td>
        <td style="padding: 4px; text-align: center;">
          <input type="number" step="1" min="1" class="loan-input-months" data-idx="${idx}" value="${Number(l.repayPeriod || l.repayperiod || 1)}" style="width: 60px; text-align: center; box-sizing: border-box; padding: 2px 4px; font-size: 11px; border: 1px solid #ccc;" />
        </td>
        <td style="padding: 4px; text-align: center;">
          <input type="date" class="loan-input-date" data-idx="${idx}" value="${l.loanDate || l.loandate || getTodayDate()}" style="width: 105px; box-sizing: border-box; padding: 1px 2px; font-size: 10px; border: 1px solid #ccc;" />
        </td>
        <td style="padding: 4px; text-align: right; font-weight: bold;">
          <span class="loan-cell-bal" data-idx="${idx}">${Number(l.balance !== undefined ? l.balance : (l.loanAmt || l.loanamt || 0)).toFixed(2)}</span>
        </td>
        <td style="padding: 4px; text-align: center;">
          ${!isExisting ? `<button type="button" class="loan-btn-del-row" data-idx="${idx}" style="background: none; border: none; color: #b00; cursor: pointer; font-size: 12px; font-weight: bold;">✕</button>` : ''}
        </td>
      </tr>`;
    });

    tbody.innerHTML = html;

    // Attach row input listeners
    tbody.querySelectorAll(".loan-input-desc").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].description = e.target.value;
      });
    });

    tbody.querySelectorAll(".loan-input-amt").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const val = Number(e.target.value || 0);
        if (state.loans[idx]) {
          state.loans[idx].loanAmt = val;
          // For newly added loans, balance starts equal to loan amount
          if (!state.loans[idx].loanId) {
            state.loans[idx].balance = val;
            const balSpan = tbody.querySelector(`.loan-cell-bal[data-idx="${idx}"]`);
            if (balSpan) balSpan.textContent = val.toFixed(2);
            updateTotalBalance();
          }
        }
      });
    });

    tbody.querySelectorAll(".loan-input-months").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].repayPeriod = Number(e.target.value || 1);
      });
    });

    tbody.querySelectorAll(".loan-input-date").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].loanDate = e.target.value;
      });
    });

    tbody.querySelectorAll(".loan-btn-del-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.loans.splice(idx, 1);
        renderMainGrid();
        updateTotalBalance();
      });
    });
  }

  function updateTotalBalance() {
    state.totalBalance = state.loans.reduce((sum, l) => sum + Number(l.balance !== undefined ? l.balance : (l.loanAmt || l.loanamt || 0)), 0);
    if (el("loan-lbl-bal")) {
      el("loan-lbl-bal").textContent = state.totalBalance.toFixed(2);
    }
  }

  function renderRecoveryGrid() {
    const tbody = el("loan-tbody-recovery");
    if (!tbody) return;

    if (state.recovery.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 8px; color: #777;">No recovery deductions recorded</td></tr>';
      return;
    }

    let html = "";
    state.recovery.forEach((r, idx) => {
      html += `<tr style="border-bottom: 1px solid #ddd; background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 4px; text-align: center;">${r.loandedid || '-'}</td>
        <td style="padding: 4px; text-align: center;">${r.saldate_display || formatDateForDisplay(r.saldate)}</td>
        <td style="padding: 4px; text-align: right; font-weight: bold;">${Number(r.loanamtded || 0).toFixed(2)}</td>
        <td style="padding: 4px; text-align: center;">(Salary)</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  async function handleSave() {
    if (!state.currentStaffId) {
      alert("No Employee Name selected..... ");
      return;
    }

    if (state.loans.length === 0) {
      alert("Please Enter the  details by clicking the grid heading.....");
      return;
    }

    // VB6 row validations
    for (let i = 0; i < state.loans.length; i++) {
      const l = state.loans[i];
      const slNo = l.slNo || (i + 1);
      const desc = String(l.description || l.reason || "").trim();
      const amt = Number(l.loanAmt !== undefined ? l.loanAmt : (l.loanamt || 0));
      const months = Number(l.repayPeriod !== undefined ? l.repayPeriod : (l.repayperiod || 0));
      const rawDate = String(l.loanDate || l.loandate || "").trim();

      if (!desc) {
        alert("Enter the Description for the SlNo. " + slNo);
        return;
      }
      if (amt <= 0) {
        alert("Enter the Loan Amount for the SlNo. " + slNo);
        return;
      }
      if (months <= 0) {
        alert("Enter the No. of Months within which the loan amount has to be recovered  ");
        return;
      }
      if (!rawDate || isNaN(new Date(rawDate).getTime())) {
        alert("Enter the valid Date of Issue of Loan Amount (in dd/mm/yyyy format)...");
        return;
      }
    }

    const confirmMsg = state.mode === "modify" ? "Are You Sure To Modify?" : "Are You Sure To Save?";
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch("/api/staff-loan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: state.currentStaffId,
          loans: state.loans
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save record.");
        return;
      }

      alert(data.message || "Record succussfully Stored .");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving record: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.currentStaffId) {
      alert("No Employee Name selected..... ");
      return;
    }

    const confirmMsg = "This will Delete all the Loans containing 'Balance=Loan Amount(Issued)'\r\n\r\nAre You Sure To Delete?";
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch("/api/staff-loan/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: state.currentStaffId })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }

      alert(data.message || "Record succussfully Deleted .");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting record: " + err.message);
    }
  }

  function handlePrint() {
    if (!state.currentStaffId) {
      alert("Please select an employee first.");
      return;
    }
    window.open(`/api/print?type=staff-loan&staffId=${state.currentStaffId}`, "_blank");
  }

  function openStaffLoan() {
    const sec = el("staff-loan");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    loadStaffList();
  }

  function closeStaffLoan() {
    const sec = el("staff-loan");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("loan-btn-close-top")?.addEventListener("click", closeStaffLoan);
    el("loan-btn-exit")?.addEventListener("click", closeStaffLoan);
    el("loan-btn-save")?.addEventListener("click", handleSave);
    el("loan-btn-delete")?.addEventListener("click", handleDelete);
    el("loan-btn-print")?.addEventListener("click", handlePrint);
    el("loan-btn-add-row")?.addEventListener("click", () => {
      if (!state.currentStaffId) {
        alert("No Employee Name selected..... ");
        return;
      }
      addLoanRow();
    });

    el("loan-chk-current")?.addEventListener("change", (e) => {
      state.currentOnly = e.target.checked;
      loadStaffList();
    });

    el("loan-chk-details")?.addEventListener("change", (e) => {
      const recFrame = el("loan-recovery-frame");
      if (recFrame) {
        recFrame.style.display = e.target.checked ? "flex" : "none";
      }
    });

    window.openStaffLoan = openStaffLoan;
    window.closeStaffLoan = closeStaffLoan;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
