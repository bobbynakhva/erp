// Bank Transactions (frmBankTrans) - Cash Flow Suite
(function () {
  let state = {
    mode: "new",
    currentTransId: 0,
    bundle: null,
    banks: []
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
    const num = Number(val || 0);
    return isNaN(num) ? "0.00" : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function numToWords(n) {
    const num = Math.round(Number(n || 0));
    if (num <= 0) return "Rupees Zero Only";
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(val) {
      if (val < 20) return a[val];
      if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
      if (val < 1000) return a[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " and " + inWords(val % 100) : "");
      if (val < 100000) return inWords(Math.floor(val / 1000)) + " Thousand" + (val % 1000 !== 0 ? " " + inWords(val % 1000) : "");
      if (val < 10000000) return inWords(Math.floor(val / 100000)) + " Lakh" + (val % 100000 !== 0 ? " " + inWords(val % 100000) : "");
      return inWords(Math.floor(val / 10000000)) + " Crore" + (val % 10000000 !== 0 ? " " + inWords(val % 10000000) : "");
    }

    return "Rupees " + inWords(num) + " Only";
  }

  function getSelectedType() {
    if (el("banktrans-opt-withdraw")?.checked) return "withdraw";
    if (el("banktrans-opt-transfer")?.checked) return "bank-transfer";
    return "deposit";
  }

  function updateTypeView() {
    const type = getSelectedType();
    const pnlDepWith = el("banktrans-panel-deposit-withdraw");
    const pnlTrans = el("banktrans-panel-transfer");
    const legDepWith = el("banktrans-legend-dept-withdraw");

    if (type === "bank-transfer") {
      if (pnlDepWith) pnlDepWith.hidden = true;
      if (pnlTrans) pnlTrans.hidden = false;
      updateWordsDisplay();
    } else {
      if (pnlDepWith) pnlDepWith.hidden = false;
      if (pnlTrans) pnlTrans.hidden = true;
      if (legDepWith) {
        legDepWith.textContent = type === "withdraw" ? "WithDraw" : "Deposit";
      }
      updateWordsDisplay();
    }
  }

  function updateWordsDisplay() {
    const type = getSelectedType();
    let amt = 0;
    if (type === "bank-transfer") {
      amt = parseFloat(el("banktrans-trans-amount")?.value || 0) || 0;
    } else {
      amt = parseFloat(el("banktrans-amount")?.value || 0) || 0;
    }
    const lbl = el("banktrans-words");
    if (lbl) lbl.textContent = numToWords(amt);
  }

  function renderBalancesTable(balances) {
    const tbody = el("banktrans-tbody-balances");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!balances || balances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #888; padding: 15px;">No account data found.</td></tr>`;
      return;
    }

    balances.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.style.background = idx % 2 === 0 ? "transparent" : "var(--bg-stripe)";
      tr.style.borderBottom = "1px solid var(--border-color)";

      const isCash = idx === 0 || row.name === "Cash Balance";
      const nameStyle = isCash ? "font-weight: bold; color: var(--primary);" : "color: var(--text-main);";
      const balColor = String(row.balance).includes("Dr.") ? "var(--danger, #ff3b30)" : "var(--success, #34c759)";

      tr.innerHTML = `
        <td style="padding: 5px 8px; border-right: 1px solid var(--border-color); ${nameStyle}">${escapeHtml(row.name)}</td>
        <td style="padding: 5px 8px; text-align: right; border-right: 1px solid var(--border-color); font-family: var(--font-mono); font-weight: bold; color: ${balColor};">${escapeHtml(row.balance)}</td>
        <td style="padding: 5px 8px; text-align: right; font-family: var(--font-mono); color: var(--text-muted);">${escapeHtml(row.creditLimit || "-")}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function populateBankDropdowns(banks) {
    state.banks = banks || [];

    const cmbBank = el("banktrans-bank");
    const cmbFrom = el("banktrans-from-bank");
    const cmbTo = el("banktrans-to-bank");

    const buildOptions = (placeholder) => {
      let html = `<option value="">-- ${placeholder} --</option>`;
      state.banks.forEach(b => {
        html += `<option value="${b.id}">${escapeHtml(b.bank_name)}</option>`;
      });
      return html;
    };

    if (cmbBank) {
      const cur = cmbBank.value;
      cmbBank.innerHTML = buildOptions("Select Bank");
      if (cur) cmbBank.value = cur;
      else if (state.banks.length > 0) cmbBank.value = state.banks[0].id;
    }

    if (cmbFrom) {
      const cur = cmbFrom.value;
      cmbFrom.innerHTML = buildOptions("Select From Bank");
      if (cur) cmbFrom.value = cur;
      else if (state.banks.length > 0) cmbFrom.value = state.banks[0].id;
    }

    if (cmbTo) {
      const cur = cmbTo.value;
      cmbTo.innerHTML = buildOptions("Select To Bank");
      if (cur) cmbTo.value = cur;
      else if (state.banks.length > 1) cmbTo.value = state.banks[1].id;
      else if (state.banks.length > 0) cmbTo.value = state.banks[0].id;
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.bundle = bundle;

    populateBankDropdowns(bundle.banks);
    renderBalancesTable(bundle.bankBalances);

    if (bundle.record) {
      // Edit / View existing record
      state.mode = "edit";
      state.currentTransId = bundle.record.transId;
      if (el("banktrans-mode")) el("banktrans-mode").value = "edit";
      if (el("banktrans-trans-id")) el("banktrans-trans-id").textContent = `#${bundle.record.transId}`;

      const rec = bundle.record;
      if (rec.type === "withdraw") {
        if (el("banktrans-opt-withdraw")) el("banktrans-opt-withdraw").checked = true;
      } else if (rec.type === "bank-transfer") {
        if (el("banktrans-opt-transfer")) el("banktrans-opt-transfer").checked = true;
      } else {
        if (el("banktrans-opt-deposit")) el("banktrans-opt-deposit").checked = true;
      }

      updateTypeView();

      if (el("banktrans-date")) {
        el("banktrans-date").value = rec.transDate || new Date().toISOString().slice(0, 10);
      }

      if (rec.type === "bank-transfer") {
        if (el("banktrans-from-bank")) el("banktrans-from-bank").value = rec.fromBankId || "";
        if (el("banktrans-to-bank")) el("banktrans-to-bank").value = rec.toBankId || "";
        if (el("banktrans-trans-amount")) el("banktrans-trans-amount").value = rec.amount || "";
        if (el("banktrans-ch-no")) el("banktrans-ch-no").value = rec.chNo || "";
        if (el("banktrans-ch-date")) el("banktrans-ch-date").value = rec.chDate || "";
        if (el("banktrans-trans-desc")) el("banktrans-trans-desc").value = rec.description || "";
      } else {
        if (el("banktrans-bank")) el("banktrans-bank").value = rec.bankId || "";
        if (el("banktrans-amount")) el("banktrans-amount").value = rec.amount || "";
        if (el("banktrans-desc")) el("banktrans-desc").value = rec.description || "";
      }

      updateWordsDisplay();

      if (el("banktrans-btn-save")) {
        el("banktrans-btn-save").disabled = false;
        el("banktrans-btn-save").textContent = "Update";
      }
      if (el("banktrans-btn-modify")) el("banktrans-btn-modify").disabled = true;
      if (el("banktrans-btn-delete")) el("banktrans-btn-delete").disabled = false;
    } else {
      // New record state
      resetNew(bundle.nextTransId || 1);
    }
  }

  function resetNew(nextId) {
    state.mode = "new";
    state.currentTransId = 0;
    if (el("banktrans-mode")) el("banktrans-mode").value = "new";
    if (el("banktrans-trans-id")) el("banktrans-trans-id").textContent = `#${nextId || 1}`;

    if (el("banktrans-opt-deposit")) el("banktrans-opt-deposit").checked = true;
    updateTypeView();

    if (el("banktrans-date")) {
      el("banktrans-date").value = new Date().toISOString().slice(0, 10);
    }

    if (el("banktrans-amount")) el("banktrans-amount").value = "";
    if (el("banktrans-desc")) el("banktrans-desc").value = "";
    if (el("banktrans-trans-amount")) el("banktrans-trans-amount").value = "";
    if (el("banktrans-ch-no")) el("banktrans-ch-no").value = "";
    if (el("banktrans-ch-date")) el("banktrans-ch-date").value = "";
    if (el("banktrans-trans-desc")) el("banktrans-trans-desc").value = "";

    updateWordsDisplay();

    if (el("banktrans-btn-save")) {
      el("banktrans-btn-save").disabled = false;
      el("banktrans-btn-save").textContent = "Save";
    }
    if (el("banktrans-btn-modify")) el("banktrans-btn-modify").disabled = true;
    if (el("banktrans-btn-delete")) el("banktrans-btn-delete").disabled = true;
  }

  async function loadBankTrans(query) {
    try {
      const url = query ? `/api/bank-trans?${query}` : `/api/bank-trans`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Failed to load bank transaction (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadBankTrans error:", err);
      alert("Error loading bank transaction: " + err.message);
    }
  }

  async function handleSave() {
    const type = getSelectedType();
    const transDate = el("banktrans-date")?.value || "";

    let payload = {
      type,
      transDate,
      transId: state.mode === "edit" ? state.currentTransId : 0
    };

    if (type === "deposit" || type === "withdraw") {
      const bankId = Number(el("banktrans-bank")?.value || 0);
      const amount = parseFloat(el("banktrans-amount")?.value || 0) || 0;
      const description = el("banktrans-desc")?.value || "";

      // Exact VB6 Validations
      if (!bankId) {
        alert("Please Select a Bank");
        el("banktrans-bank")?.focus();
        return;
      }
      if (amount <= 0) {
        alert("Please Enter the Amount");
        el("banktrans-amount")?.focus();
        return;
      }

      payload.bankId = bankId;
      payload.amount = amount;
      payload.description = description;
    } else if (type === "bank-transfer") {
      const fromBankId = Number(el("banktrans-from-bank")?.value || 0);
      const toBankId = Number(el("banktrans-to-bank")?.value || 0);
      const amount = parseFloat(el("banktrans-trans-amount")?.value || 0) || 0;
      const chNo = el("banktrans-ch-no")?.value || "";
      const chDate = el("banktrans-ch-date")?.value || "";
      const description = el("banktrans-trans-desc")?.value || "";

      // Exact VB6 Validations
      if (!fromBankId) {
        alert('Please Select a "From Bank" ');
        el("banktrans-from-bank")?.focus();
        return;
      }
      if (!toBankId) {
        alert('Please Select a "To Bank" ');
        el("banktrans-to-bank")?.focus();
        return;
      }
      if (fromBankId === toBankId) {
        alert("'From Bank' and 'To Bank' are Same...\r\nIt should  be different");
        el("banktrans-to-bank")?.focus();
        return;
      }
      if (amount <= 0) {
        alert("Please Enter the Amount");
        el("banktrans-trans-amount")?.focus();
        return;
      }

      payload.fromBankId = fromBankId;
      payload.toBankId = toBankId;
      payload.amount = amount;
      payload.chNo = chNo;
      payload.chDate = chDate;
      payload.description = description;
    }

    try {
      const res = await fetch("/api/bank-trans/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save bank transaction");
        return;
      }
      alert(data.message || "Record Saved Successfully...");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving bank transaction: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.currentTransId) {
      alert("No bank transaction selected to delete.");
      return;
    }
    if (!confirm("Are you sure to delete this Bank Transaction?")) {
      return;
    }

    try {
      const res = await fetch("/api/bank-trans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transId: state.currentTransId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete bank transaction");
        return;
      }
      alert(data.message || "Record Deleted.");
      loadBankTrans("last=1");
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting bank transaction: " + err.message);
    }
  }

  function initEvents() {
    // Type radio changes
    el("banktrans-opt-deposit")?.addEventListener("change", updateTypeView);
    el("banktrans-opt-withdraw")?.addEventListener("change", updateTypeView);
    el("banktrans-opt-transfer")?.addEventListener("change", updateTypeView);

    // Dynamic amount words
    el("banktrans-amount")?.addEventListener("input", updateWordsDisplay);
    el("banktrans-trans-amount")?.addEventListener("input", updateWordsDisplay);

    // Toolbar buttons
    el("banktrans-btn-new")?.addEventListener("click", () => {
      loadBankTrans("new=1");
    });
    el("banktrans-btn-save")?.addEventListener("click", handleSave);
    el("banktrans-btn-modify")?.addEventListener("click", () => {
      state.mode = "edit";
      if (el("banktrans-btn-save")) {
        el("banktrans-btn-save").disabled = false;
        el("banktrans-btn-save").textContent = "Update";
      }
      if (el("banktrans-btn-modify")) el("banktrans-btn-modify").disabled = true;
    });
    el("banktrans-btn-delete")?.addEventListener("click", handleDelete);
    el("banktrans-btn-close")?.addEventListener("click", closeBankTrans);
    el("banktrans-btn-x")?.addEventListener("click", closeBankTrans);

    // Navigation buttons
    el("banktrans-btn-first")?.addEventListener("click", () => loadBankTrans("first=1"));
    el("banktrans-btn-last")?.addEventListener("click", () => loadBankTrans("last=1"));
    el("banktrans-btn-prev")?.addEventListener("click", () => {
      loadBankTrans(`prev=1&currentTransId=${state.currentTransId}`);
    });
    el("banktrans-btn-next")?.addEventListener("click", () => {
      loadBankTrans(`next=1&currentTransId=${state.currentTransId}`);
    });
  }

  function openBankTrans(target) {
    const sec = el("bank-trans");
    if (!sec) return;
    sec.hidden = false;

    if (target && target.transId) {
      loadBankTrans(`id=${target.transId}`);
    } else {
      loadBankTrans("last=1");
    }
  }

  function closeBankTrans() {
    const sec = el("bank-trans");
    if (sec) sec.hidden = true;
  }

  window.openBankTrans = openBankTrans;
  window.closeBankTrans = closeBankTrans;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
  } else {
    initEvents();
  }
})();
