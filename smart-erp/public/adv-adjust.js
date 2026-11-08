// SMART-ERP: Advance Adjustments Controller
// Form: frmAdvAdjust (SCREENSHOTS/CASHFLOW/004_advance_adjustments.png)

(() => {
  const state = {
    mode: "new",
    currentAdjNo: 0,
    nextAdjNo: 1,
    isExpense: false, // false = Income, true = Expense
    types: ["Sales", "Labour", "SubContract", "Other"],
    currentType: "Sales",
    currentParty: "",
    amount: 0,
    method: "Cash", // "Bank", "Cash", "Auto Bill", "Manual Bill"
    bankId: null,
    banks: [],
    cashBalance: 0,
    availableAdvance: 0,
    advances: [],
    bills: [],
    selectedBills: []
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

  function formatCurrency(val) {
    const num = Number(val) || 0;
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDisplayDate(val) {
    if (!val) return "";
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(val);
  }

  // Exact VB6 Number to Words conversion
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function pairWords(n) {
    n = Number(n) || 0;
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }

  function moneyToWords(val) {
    let n = Math.floor(Math.abs(Number(val) || 0));
    if (!n) return "";
    const scales = [[10000000, " Crore, "], [100000, " Lakh, "], [1000, " Thousand, "]];
    let text = "";
    for (const [size, label] of scales) {
      const count = Math.floor(n / size);
      if (!count) continue;
      text += `${pairWords(count)}${label}`;
      n %= size;
    }
    const hundred = Math.floor(n / 100);
    if (hundred) text += `${ones[hundred]} Hundred, `;
    if (n % 100) text += pairWords(n % 100);
    return text.replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
  }

  function rupees(total) {
    const num = Number(total) || 0;
    if (!num) return "Rupees Zero Only";
    const whole = Math.floor(Math.abs(num));
    const paise = Math.round((Math.abs(num) - whole) * 100);
    const words = moneyToWords(whole);
    const coins = paise ? ` and Paise ${moneyToWords(paise)}` : "";
    return `Rupees ${words}${coins} Only`.replace(/\s+/g, " ").trim();
  }

  // Render Cash & Bank Balances Table (top right)
  function renderBalancesTable() {
    const tbody = el("advadj-tbody-balances");
    if (!tbody) return;

    let html = `
      <tr style="background: var(--bg-stripe); font-weight: bold;">
        <td style="border: 1px solid var(--border-color); padding: 5px 8px; font-weight: bold; color: var(--primary);">Cash A/c</td>
        <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono); font-weight: bold; color: ${state.cashBalance >= 0 ? 'var(--text-main)' : 'var(--danger, #ff3b30)'};">
          ${formatCurrency(state.cashBalance)}
        </td>
        <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; color: var(--text-muted);">-</td>
      </tr>
    `;

    for (const b of state.banks) {
      const bal = Number(b.balance || 0);
      html += `
        <tr>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px;">${escapeHtml(b.bank_name || b.name)}</td>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono); font-weight: bold; color: ${bal >= 0 ? 'var(--text-main)' : 'var(--danger, #ff3b30)'};">
            ${formatCurrency(bal)}
          </td>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono); color: var(--text-muted);">
            ${formatCurrency(b.credit_limit || 0)}
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  }

  // Populate Bank Select Dropdown
  function renderBankDropdown() {
    const sel = el("advadj-bank");
    if (!sel) return;

    let opts = `<option value="">-- Select Bank A/c --</option>`;
    for (const b of state.banks) {
      const id = b.id || b.bank_id;
      const isSel = (state.bankId && Number(state.bankId) === Number(id)) ? "selected" : "";
      opts += `<option value="${id}" ${isSel}>${escapeHtml(b.bank_name || b.name)}</option>`;
    }
    sel.innerHTML = opts;
  }

  // Populate Type Dropdown (Income vs Expense)
  function renderTypeDropdown() {
    const sel = el("advadj-type");
    if (!sel) return;

    const list = state.isExpense
      ? ["Purchase", "SubContract", "Expense", "Other"]
      : ["Sales", "Labour", "SubContract", "Other"];

    state.types = list;
    if (!list.includes(state.currentType)) {
      state.currentType = list[0];
    }

    let opts = "";
    for (const t of list) {
      const isSel = (t === state.currentType) ? "selected" : "";
      opts += `<option value="${t}" ${isSel}>${t}</option>`;
    }
    sel.innerHTML = opts;

    const lbl = el("advadj-lbl-type");
    if (lbl) {
      lbl.textContent = state.isExpense ? "Expense Type" : "Income Type";
    }

    const badge = el("advadj-flow-badge");
    if (badge) {
      badge.textContent = state.isExpense ? "Outflow" : "Inflow";
      badge.style.color = state.isExpense ? "#c00000" : "#000080";
    }
  }

  // Fetch and Populate Parties for currently selected Type
  async function loadParties() {
    const sel = el("advadj-whom");
    if (!sel) return;

    try {
      const res = await fetch(`/api/adv-adjust/parties?isExpense=${state.isExpense}&type=${encodeURIComponent(state.currentType)}`);
      const data = await res.json();
      const parties = data.parties || [];

      let opts = `<option value="">-- Select Adjust A/c --</option>`;
      for (const p of parties) {
        const isSel = (p === state.currentParty) ? "selected" : "";
        opts += `<option value="${escapeHtml(p)}" ${isSel}>${escapeHtml(p)}</option>`;
      }
      sel.innerHTML = opts;

      await handlePartyChange();
    } catch (err) {
      console.error("loadParties error:", err);
    }
  }

  // Fetch Advances & Pending Bills when party changes
  async function handlePartyChange() {
    const party = el("advadj-whom")?.value || "";
    state.currentParty = party;

    if (!party) {
      state.availableAdvance = 0;
      state.advances = [];
      state.bills = [];
      state.selectedBills = [];
      renderAdvancesTable();
      renderBillsGrid();
      return;
    }

    // Fetch Available Advances
    try {
      const res = await fetch(`/api/adv-adjust/advances?isExpense=${state.isExpense}&partyName=${encodeURIComponent(party)}`);
      const data = await res.json();
      state.availableAdvance = Number(data.totalAdvanceAvailable || 0);
      state.advances = data.advances || [];
      renderAdvancesTable();
    } catch (err) {
      console.error("loadAdvances error:", err);
    }

    // Fetch Bills for Bills Method
    try {
      const res = await fetch(`/api/adv-adjust/bills?isExpense=${state.isExpense}&type=${encodeURIComponent(state.currentType)}&partyName=${encodeURIComponent(party)}`);
      const data = await res.json();
      state.bills = data.bills || [];
      allocateBills();
      renderBillsGrid();
    } catch (err) {
      console.error("loadBills error:", err);
    }
  }

  // Render Available Advances Table (bottom right)
  function renderAdvancesTable() {
    const lbl = el("advadj-lbl-adv-bal");
    if (lbl) {
      lbl.textContent = `Rs. ${formatCurrency(state.availableAdvance)}`;
    }

    const tbody = el("advadj-tbody-advances");
    if (!tbody) return;

    if (!state.advances.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #888; padding: 15px;">No active advances available.</td></tr>`;
      return;
    }

    let html = "";
    for (const a of state.advances) {
      html += `
        <tr>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; font-weight: bold;">${escapeHtml(a.transId)}</td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: center;">${formatDisplayDate(a.transDate)}</td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: right; font-weight: bold; color: #008000;">
            ${formatCurrency(a.advBalance)}
          </td>
        </tr>
      `;
    }
    tbody.innerHTML = html;
  }

  // Automatic bill allocation logic (Auto Bill method)
  function allocateBills() {
    let remaining = Number(state.amount || 0);
    state.selectedBills = [];

    for (const b of state.bills) {
      const pending = Number(b.pendingBal || 0);
      if (state.method === "Auto Bill") {
        if (remaining > 0 && pending > 0) {
          const adj = Math.min(remaining, pending);
          b.adjustedAmount = adj;
          b.selected = true;
          remaining -= adj;
          state.selectedBills.push({ ...b });
        } else {
          b.adjustedAmount = 0;
          b.selected = false;
        }
      } else if (state.method === "Manual Bill") {
        // preserve manual inputs
        if (b.selected && Number(b.adjustedAmount) > 0) {
          state.selectedBills.push({ ...b });
        }
      } else {
        b.adjustedAmount = 0;
        b.selected = false;
      }
    }
  }

  // Render Bills Grid
  function renderBillsGrid() {
    const tbody = el("advadj-tbody-bills");
    if (!tbody) return;

    if (state.method !== "Auto Bill" && state.method !== "Manual Bill") {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">Select Bills mode to view and allocate pending bills.</td></tr>`;
      return;
    }

    if (!state.bills.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">No pending bills found for this account.</td></tr>`;
      return;
    }

    let html = "";
    state.bills.forEach((b, idx) => {
      const isAuto = state.method === "Auto Bill";
      const chkDisabled = isAuto ? "disabled" : "";
      const inputDisabled = isAuto ? "readonly" : "";
      const isSel = b.selected ? "checked" : "";

      html += `
        <tr data-index="${idx}" style="background: ${idx % 2 === 0 ? '#fff' : '#f9fbfd'};">
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: center;">
            <input type="checkbox" class="advadj-bill-chk" data-index="${idx}" ${isSel} ${chkDisabled}>
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; font-weight: bold; color: #000080;">
            ${escapeHtml(b.billNo)}
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: center;">
            ${formatDisplayDate(b.billDate)}
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: right;">
            ${formatCurrency(b.billAmt)}
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: right; font-weight: bold; color: #800000;">
            ${formatCurrency(b.pendingBal)}
          </td>
          <td style="border: 1px solid #c0c0c0; padding: 2px 4px; text-align: right;">
            <input type="number" step="0.01" min="0" max="${b.pendingBal}" class="advadj-bill-adj-input" data-index="${idx}" value="${Number(b.adjustedAmount || 0).toFixed(2)}" style="width: 75px; text-align: right; height: 18px; font-size: 10px; font-weight: bold;" ${inputDisabled}>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach manual bill checkbox & input change handlers
    tbody.querySelectorAll(".advadj-bill-chk").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.index);
        const bill = state.bills[idx];
        if (!bill) return;
        bill.selected = e.target.checked;
        if (bill.selected && !Number(bill.adjustedAmount)) {
          bill.adjustedAmount = Number(bill.pendingBal || 0);
          const inp = tbody.querySelector(`.advadj-bill-adj-input[data-index="${idx}"]`);
          if (inp) inp.value = Number(bill.adjustedAmount).toFixed(2);
        } else if (!bill.selected) {
          bill.adjustedAmount = 0;
          const inp = tbody.querySelector(`.advadj-bill-adj-input[data-index="${idx}"]`);
          if (inp) inp.value = "0.00";
        }
        recalcManualBillTotal();
      });
    });

    tbody.querySelectorAll(".advadj-bill-adj-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        const bill = state.bills[idx];
        if (!bill) return;
        let val = Number(e.target.value) || 0;
        if (val > Number(bill.pendingBal || 0)) {
          val = Number(bill.pendingBal || 0);
          e.target.value = val.toFixed(2);
        }
        bill.adjustedAmount = val;
        bill.selected = val > 0;
        const chk = tbody.querySelector(`.advadj-bill-chk[data-index="${idx}"]`);
        if (chk) chk.checked = bill.selected;
        recalcManualBillTotal();
      });
    });
  }

  function recalcManualBillTotal() {
    state.selectedBills = state.bills.filter((b) => b.selected && Number(b.adjustedAmount) > 0);
  }

  // Handle Method change (Bank, Cash, Auto Bill, Manual Bill)
  function handleMethodChange() {
    const radios = document.getElementsByName("advadj-method");
    let chosen = "Cash";
    for (const r of radios) {
      if (r.checked) {
        chosen = r.value;
        break;
      }
    }
    state.method = chosen;

    const bankFrame = el("advadj-frame-bank");
    const billsFrame = el("advadj-frame-bills");

    if (chosen === "Bank") {
      if (bankFrame) bankFrame.style.display = "block";
      if (billsFrame) billsFrame.style.display = "none";
    } else if (chosen === "Cash") {
      if (bankFrame) bankFrame.style.display = "none";
      if (billsFrame) billsFrame.style.display = "none";
    } else if (chosen === "Auto Bill" || chosen === "Manual Bill") {
      if (bankFrame) bankFrame.style.display = "none";
      if (billsFrame) billsFrame.style.display = "block";
      allocateBills();
      renderBillsGrid();
    }
  }

  // Handle Income vs Expense Radio change
  async function handleOnRadioChange() {
    const isExp = el("advadj-opt-expense")?.checked || false;
    state.isExpense = isExp;

    renderTypeDropdown();
    await loadParties();
  }

  // Apply Bundle data into UI
  function applyBundle(bundle) {
    if (!bundle) return;

    state.banks = bundle.banks || [];
    state.cashBalance = Number(bundle.cashBalance || 0);
    renderBalancesTable();
    renderBankDropdown();

    if (bundle.record) {
      state.mode = "edit";
      const r = bundle.record;
      state.currentAdjNo = Number(r.adjNo || 0);
      state.isExpense = Boolean(r.isExpense);

      if (el("advadj-opt-income")) el("advadj-opt-income").checked = !state.isExpense;
      if (el("advadj-opt-expense")) el("advadj-opt-expense").checked = state.isExpense;

      renderTypeDropdown();

      if (el("advadj-no")) el("advadj-no").value = r.adjNo || "";
      if (el("advadj-date")) el("advadj-date").value = r.adjDate || getTodayDate();
      if (el("advadj-type")) el("advadj-type").value = r.type || "";
      state.currentType = r.type || "";

      state.currentParty = r.partyName || "";

      state.amount = Number(r.amount || 0);
      if (el("advadj-amount")) el("advadj-amount").value = state.amount ? state.amount.toFixed(2) : "";
      if (el("advadj-words")) el("advadj-words").textContent = rupees(state.amount);

      if (el("advadj-desc")) el("advadj-desc").value = r.description || "";

      // Method mapping
      const methodSrc = String(r.sourceDst || "2");
      if (methodSrc === "1") state.method = "Bank";
      else if (methodSrc === "2") state.method = "Cash";
      else if (methodSrc === "3") state.method = "Auto Bill";
      else if (methodSrc === "4") state.method = "Manual Bill";

      const radios = document.getElementsByName("advadj-method");
      for (const rad of radios) {
        rad.checked = (rad.value === state.method);
      }

      state.bankId = r.bankId || null;
      if (el("advadj-bank")) el("advadj-bank").value = r.bankId ? String(r.bankId) : "";
      if (el("advadj-ch-no")) el("advadj-ch-no").value = r.chqNo || "";
      if (el("advadj-ch-date")) el("advadj-ch-date").value = r.chqDate || "";

      handleMethodChange();

      loadParties();

      // Button states
      if (el("advadj-btn-save")) el("advadj-btn-save").disabled = true;
      if (el("advadj-btn-modify")) el("advadj-btn-modify").disabled = false;
      if (el("advadj-btn-delete")) el("advadj-btn-delete").disabled = false;
      if (el("advadj-btn-new")) el("advadj-btn-new").disabled = false;
    } else {
      state.mode = "new";
      state.nextAdjNo = Number(bundle.nextAdjNo || 1);
      state.currentAdjNo = state.nextAdjNo;

      if (el("advadj-no")) el("advadj-no").value = state.nextAdjNo;
      if (el("advadj-date")) el("advadj-date").value = getTodayDate();

      renderTypeDropdown();

      if (el("advadj-amount")) el("advadj-amount").value = "";
      state.amount = 0;
      if (el("advadj-words")) el("advadj-words").textContent = "Rupees Zero Only";

      if (el("advadj-desc")) el("advadj-desc").value = "";

      state.method = "Cash";
      const radCash = el("advadj-opt-cash");
      if (radCash) radCash.checked = true;

      state.bankId = null;
      if (el("advadj-bank")) el("advadj-bank").value = "";
      if (el("advadj-ch-no")) el("advadj-ch-no").value = "";
      if (el("advadj-ch-date")) el("advadj-ch-date").value = "";

      handleMethodChange();
      loadParties();

      if (el("advadj-btn-save")) el("advadj-btn-save").disabled = false;
      if (el("advadj-btn-modify")) el("advadj-btn-modify").disabled = true;
      if (el("advadj-btn-delete")) el("advadj-btn-delete").disabled = true;
      if (el("advadj-btn-new")) el("advadj-btn-new").disabled = true;
    }
  }

  // Load record from server
  async function loadAdjustment(paramStr) {
    try {
      const res = await fetch(`/api/adv-adjust?${paramStr}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error) alert(data.error);
        return;
      }
      if (data.message && !data.record) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadAdjustment error:", err);
      alert("Error loading Advance Adjustment data.");
    }
  }

  // Validation matching exact VB6 decompiled bytecode (Proc_D41BD4, Proc_CB7AB8, Proc_D0D514, Proc_D35378)
  function validateForm() {
    if (state.method === "Bank") {
      const bId = el("advadj-bank")?.value || "";
      if (!bId) {
        alert("Please Select a bank...");
        el("advadj-bank")?.focus();
        return false;
      }
      const chq = el("advadj-ch-no")?.value.trim() || "";
      if (!chq) {
        alert("Please enter the cheque number...");
        el("advadj-ch-no")?.focus();
        return false;
      }
      const chqDate = el("advadj-ch-date")?.value || "";
      if (!chqDate) {
        alert("Please enter the cheque Date...");
        el("advadj-ch-date")?.focus();
        return false;
      }
    }

    const type = el("advadj-type")?.value || "";
    if (!type) {
      if (!state.isExpense) alert("Please Enter the Income Type...");
      else alert("Please Enter the Expense Type...");
      el("advadj-type")?.focus();
      return false;
    }

    const party = el("advadj-whom")?.value || "";
    if (!party) {
      alert("Please Enter the Adjust A/c Name...");
      el("advadj-whom")?.focus();
      return false;
    }

    const amt = Number(el("advadj-amount")?.value || 0);
    if (amt <= 0) {
      alert("Please Enter the Amount...");
      el("advadj-amount")?.focus();
      return false;
    }

    if (amt > Number(state.availableAdvance || 0)) {
      alert("Enter the Amount Lesser than \\ Equal to the Advance Amount");
      el("advadj-amount")?.focus();
      return false;
    }

    if (state.method === "Auto Bill" || state.method === "Manual Bill") {
      recalcManualBillTotal();
      if (!state.selectedBills.length) {
        alert("No Bills Selected.Please Select a Bill");
        return false;
      }
      const totBillAdj = state.selectedBills.reduce((s, b) => s + Number(b.adjustedAmount || 0), 0);
      if (totBillAdj > Number(state.availableAdvance || 0)) {
        alert("Enter the Bill Amount Lesser than \\ Equal to the Advance Amount");
        return false;
      }
    }

    return true;
  }

  // Save Adjustment
  async function handleSave() {
    if (!validateForm()) return;

    if (!confirm("Are You Sure To Save?")) return;

    const payload = {
      isExpense: state.isExpense,
      adjNo: Number(el("advadj-no")?.value || 0),
      adjDate: el("advadj-date")?.value || getTodayDate(),
      type: el("advadj-type")?.value || state.currentType,
      partyName: el("advadj-whom")?.value || state.currentParty,
      amount: Number(el("advadj-amount")?.value || 0),
      method: state.method,
      bankId: state.method === "Bank" ? Number(el("advadj-bank")?.value || 0) : null,
      chqNo: state.method === "Bank" ? el("advadj-ch-no")?.value.trim() : null,
      chqDate: state.method === "Bank" ? el("advadj-ch-date")?.value : null,
      description: el("advadj-desc")?.value.trim() || "",
      selectedBills: (state.method === "Auto Bill" || state.method === "Manual Bill") ? state.selectedBills : []
    };

    try {
      const res = await fetch("/api/adv-adjust/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to save record.");
        return;
      }
      alert(data.message || "Records Saved Successfully...");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving Advance Adjustment: " + (err.message || err));
    }
  }

  // Delete Adjustment
  async function handleDelete() {
    const adjNo = state.currentAdjNo;
    if (!adjNo) {
      alert("Please load an Adjustment first.");
      return;
    }

    if (!confirm("Are You Sure To Delete The Records ?")) return;

    try {
      const res = await fetch("/api/adv-adjust/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjNo })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to delete record.");
        return;
      }
      alert(data.message || "Records Deleted Successfully...");
      applyBundle(data);
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting record: " + (err.message || err));
    }
  }

  // Event Listeners
  function initEvents() {
    el("advadj-opt-income")?.addEventListener("change", handleOnRadioChange);
    el("advadj-opt-expense")?.addEventListener("change", handleOnRadioChange);

    el("advadj-type")?.addEventListener("change", (e) => {
      state.currentType = e.target.value;
      loadParties();
    });

    el("advadj-whom")?.addEventListener("change", handlePartyChange);

    const radios = document.getElementsByName("advadj-method");
    for (const rad of radios) {
      rad.addEventListener("change", handleMethodChange);
    }

    el("advadj-amount")?.addEventListener("input", (e) => {
      state.amount = Number(e.target.value) || 0;
      if (el("advadj-words")) {
        el("advadj-words").textContent = rupees(state.amount);
      }
      if (state.method === "Auto Bill") {
        allocateBills();
        renderBillsGrid();
      }
    });

    el("advadj-btn-new")?.addEventListener("click", () => loadAdjustment("new=1"));
    el("advadj-btn-save")?.addEventListener("click", handleSave);
    el("advadj-btn-delete")?.addEventListener("click", handleDelete);

    // Navigation buttons
    el("advadj-btn-first")?.addEventListener("click", () => loadAdjustment("first=1"));
    el("advadj-btn-last")?.addEventListener("click", () => loadAdjustment("last=1"));
    el("advadj-btn-prev")?.addEventListener("click", () => {
      const curNo = el("advadj-no")?.value || 0;
      loadAdjustment(`prev=1&currentAdjNo=${curNo}`);
    });
    el("advadj-btn-next")?.addEventListener("click", () => {
      const curNo = el("advadj-no")?.value || 0;
      loadAdjustment(`next=1&currentAdjNo=${curNo}`);
    });

    el("advadj-btn-close")?.addEventListener("click", closeAdvAdjust);
    el("advadj-btn-x")?.addEventListener("click", closeAdvAdjust);
  }

  function openAdvAdjust() {
    const sec = el("adv-adjust");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    loadAdjustment("new=1");
  }

  function closeAdvAdjust() {
    const sec = el("adv-adjust");
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  }

  window.openAdvAdjust = openAdvAdjust;
  window.closeAdvAdjust = closeAdvAdjust;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
  } else {
    initEvents();
  }
})();
