// Payments (frmPayments) - Cash Flow Suite
(function () {
  let state = {
    mode: "new",
    currentPRA: 0,
    bundle: null,
    payees: [],
    bills: [],
    selectedBills: new Map() // billId -> { billNo, billDate, billAmount, pendingBalance, amountPaid }
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

  function updateWordsDisplay() {
    const amt = parseFloat(el("pay-amount")?.value || 0) || 0;
    const lbl = el("pay-lbl-words");
    if (lbl) {
      lbl.textContent = numToWords(amt);
    }
  }

  function renderBalances(bundle) {
    const tbody = el("pay-tbody-balances");
    if (!tbody) return;

    let html = "";
    // Cash Balance
    const cashBal = Number(bundle.cashBalance || 0);
    const cashSign = cashBal >= 0 ? "Cr." : "Dr.";
    html += `
      <tr style="background: var(--bg-stripe); font-weight: bold;">
        <td style="border: 1px solid var(--border-color); padding: 5px 8px;">Cash Balance</td>
        <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono); color: ${cashBal >= 0 ? 'var(--text-main)' : 'var(--danger, #ff3b30)'};">${formatCurrency(Math.abs(cashBal))} ${cashSign}</td>
        <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; color: var(--text-muted);">-</td>
      </tr>
    `;

    // Bank Balances
    for (const b of (bundle.bankBalances || [])) {
      const bal = Number(b.balance || 0);
      const sign = bal >= 0 ? "Cr." : "Dr.";
      html += `
        <tr>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px;">${escapeHtml(b.bankName)}</td>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono); font-weight: bold; color: ${bal >= 0 ? 'var(--text-main)' : 'var(--danger, #ff3b30)'};">${formatCurrency(Math.abs(bal))} ${sign}</td>
          <td style="border: 1px solid var(--border-color); padding: 5px 8px; text-align: right; font-family: var(--font-mono);">${formatCurrency(b.creditLimit)}</td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  }

  function renderBanks(banks, selectedBankId) {
    const sel = el("pay-bank-id");
    if (!sel) return;

    sel.innerHTML = `<option value="">-- Select Bank Account --</option>` +
      (banks || []).map(b => `<option value="${b.bank_id}" ${Number(selectedBankId) === Number(b.bank_id) ? "selected" : ""}>${escapeHtml(b.bank_name)}</option>`).join("");
  }

  function renderPayees(payees, selectedPayeeId) {
    const sel = el("pay-to-whom");
    if (!sel) return;

    sel.innerHTML = `<option value="">-- Select Payee --</option>` +
      (payees || []).map(p => `<option value="${p.id}" ${Number(selectedPayeeId) === Number(p.id) ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
  }

  function renderBillsGrid() {
    const tbody = el("pay-tbody-bills");
    if (!tbody) return;

    const payType = el("pay-type")?.value;
    if (payType !== "Against Bill") {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">Payment Type is '${escapeHtml(payType)}'. Bills table is used for 'Against Bill'.</td></tr>`;
      return;
    }

    if (!state.bills || state.bills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">No open pending bills for this party.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.bills.map((b, idx) => {
      const isChecked = state.selectedBills.has(b.billId);
      const selData = state.selectedBills.get(b.billId);
      const allocAmt = isChecked ? (selData.amountPaid || b.pendingBalance) : 0;

      return `
        <tr style="background: ${isChecked ? 'rgba(0, 122, 255, 0.08)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-stripe)')};">
          <td style="border: 1px solid var(--border-color); padding: 4px; text-align: center;">
            <input type="checkbox" class="pay-chk-bill" data-id="${b.billId}" ${isChecked ? "checked" : ""} ${state.mode === 'edit' ? 'disabled' : ''}>
          </td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; font-weight: bold; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(b.billNo)}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: center;">${escapeHtml(b.billDate || "")}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: right; font-family: var(--font-mono);">${formatCurrency(b.billAmount)}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: right; color: var(--danger, #ff3b30); font-weight: bold; font-family: var(--font-mono);">${formatCurrency(b.pendingBalance)}</td>
          <td style="border: 1px solid var(--border-color); padding: 2px 4px; text-align: right;">
            <input type="number" step="0.01" min="0" max="${b.pendingBalance}" class="invmfg-input pay-inp-bill-amt" data-id="${b.billId}" value="${Number(allocAmt).toFixed(2)}" style="width: 85px; text-align: right; font-weight: bold; font-family: var(--font-mono);" ${isChecked ? "" : "disabled"} ${state.mode === 'edit' ? 'readonly' : ''}>
          </td>
        </tr>
      `;
    }).join("");

    // Attach events
    tbody.querySelectorAll(".pay-chk-bill").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const id = Number(e.target.dataset.id);
        const bill = state.bills.find(x => Number(x.billId) === id);
        if (e.target.checked) {
          state.selectedBills.set(id, {
            billId: bill.billId,
            billNo: bill.billNo,
            billDate: bill.billDate,
            billAmount: bill.billAmount,
            pendingBalance: bill.pendingBalance,
            amountPaid: Number(bill.pendingBalance)
          });
        } else {
          state.selectedBills.delete(id);
        }
        recalcAmountFromBills();
        renderBillsGrid();
      });
    });

    tbody.querySelectorAll(".pay-inp-bill-amt").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const id = Number(e.target.dataset.id);
        const val = parseFloat(e.target.value) || 0;
        if (state.selectedBills.has(id)) {
          state.selectedBills.get(id).amountPaid = val;
        }
        recalcAmountFromBills();
      });
    });
  }

  function recalcAmountFromBills() {
    let tot = 0;
    for (const b of state.selectedBills.values()) {
      tot += Number(b.amountPaid || 0);
    }
    const amtInput = el("pay-amount");
    if (amtInput) {
      amtInput.value = tot.toFixed(2);
      updateWordsDisplay();
    }
  }

  async function loadPayees(selectedPayeeId) {
    const expType = el("pay-exp-type")?.value || "Purchase";
    try {
      const res = await fetch(`/api/payments/payees?type=${encodeURIComponent(expType)}`);
      const data = await res.json();
      state.payees = data.payees || [];
      renderPayees(state.payees, selectedPayeeId);
      await loadPayeeDetails(selectedPayeeId || state.payees[0]?.id);
    } catch (err) {
      console.error("loadPayees error:", err);
    }
  }

  async function loadPayeeDetails(payeeId) {
    if (!payeeId) {
      state.bills = [];
      state.selectedBills.clear();
      renderBillsGrid();
      if (el("pay-lbl-party-bal")) el("pay-lbl-party-bal").innerHTML = "Party Bal: <b>Rs. 0.00</b>";
      if (el("pay-lbl-adv-bal")) el("pay-lbl-adv-bal").innerHTML = "Adv Bal: <b>Rs. 0.00</b>";
      return;
    }

    const expType = el("pay-exp-type")?.value || "Purchase";
    try {
      // 1. Party balance
      const balRes = await fetch(`/api/payments/party-balance?type=${encodeURIComponent(expType)}&payeeId=${payeeId}`);
      const balData = await balRes.json();
      if (el("pay-lbl-party-bal")) el("pay-lbl-party-bal").innerHTML = `Party Bal: <b>Rs. ${formatCurrency(balData.pendingBalance)}</b>`;
      if (el("pay-lbl-adv-bal")) el("pay-lbl-adv-bal").innerHTML = `Adv Bal: <b>Rs. ${formatCurrency(balData.advanceBalance)}</b>`;

      // 2. Bills
      const billsRes = await fetch(`/api/payments/bills?type=${encodeURIComponent(expType)}&payeeId=${payeeId}`);
      const billsData = await billsRes.json();
      state.bills = billsData.bills || [];
      state.selectedBills.clear();
      renderBillsGrid();
    } catch (err) {
      console.error("loadPayeeDetails error:", err);
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.bundle = bundle;
    state.mode = bundle.mode || "new";
    state.currentPRA = bundle.paymentNo || 0;

    if (el("pay-mode")) el("pay-mode").value = state.mode;
    if (el("pay-no")) el("pay-no").value = String(bundle.paymentNo || "");
    if (el("pay-date")) el("pay-date").value = bundle.paymentDate || "";

    // Bank vs Cash
    if (bundle.isBank) {
      if (el("pay-opt-bank")) el("pay-opt-bank").checked = true;
      if (el("pay-frame-bank")) el("pay-frame-bank").style.display = "";
    } else {
      if (el("pay-opt-cash")) el("pay-opt-cash").checked = true;
      if (el("pay-frame-bank")) el("pay-frame-bank").style.display = "none";
    }

    renderBanks(bundle.banks, bundle.bankId);
    if (el("pay-ch-no")) el("pay-ch-no").value = bundle.chNo || "";
    if (el("pay-ch-date")) el("pay-ch-date").value = bundle.chDate || bundle.paymentDate || "";

    if (el("pay-exp-type")) el("pay-exp-type").value = bundle.expenseType || "Purchase";
    if (el("pay-type")) el("pay-type").value = bundle.paymentType || "Against Bill";
    if (el("pay-amount")) el("pay-amount").value = Number(bundle.amount || 0).toFixed(2);
    updateWordsDisplay();
    if (el("pay-desc")) el("pay-desc").value = bundle.description || "";

    renderBalances(bundle);

    const saveBtn = el("pay-btn-save");
    const modBtn = el("pay-btn-modify");
    const delBtn = el("pay-btn-delete");

    if (state.mode === "edit") {
      if (saveBtn) saveBtn.disabled = true;
      if (modBtn) modBtn.disabled = false;
      if (delBtn) delBtn.disabled = false;
      loadPayees(bundle.expIncId);
    } else {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
      if (modBtn) modBtn.disabled = true;
      if (delBtn) delBtn.disabled = true;
      loadPayees();
    }
  }

  async function loadPayment(paramStr) {
    try {
      const res = await fetch(`/api/payments?${paramStr}`);
      const data = await res.json();
      if (data.message && !data.paymentNo) {
        alert(data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadPayment error:", err);
    }
  }

  async function handleSave() {
    const payNo = Number(el("pay-no")?.value || 0);
    const payDate = el("pay-date")?.value || "";
    const isBank = el("pay-opt-bank")?.checked;
    const bankId = Number(el("pay-bank-id")?.value || 0);
    const bankName = el("pay-bank-id")?.selectedOptions?.[0]?.textContent || "";
    const chNo = String(el("pay-ch-no")?.value || "").trim();
    const chDate = el("pay-ch-date")?.value || "";
    const expenseType = el("pay-exp-type")?.value || "Purchase";
    const expIncId = Number(el("pay-to-whom")?.value || 0);
    const payTo = el("pay-to-whom")?.selectedOptions?.[0]?.textContent || "";
    const paymentType = el("pay-type")?.value || "Against Bill";
    const amount = parseFloat(el("pay-amount")?.value || 0) || 0;
    const description = String(el("pay-desc")?.value || "").trim();

    if (!expIncId) {
      alert("Select a Payee Name.....");
      return;
    }
    if (!amount || amount <= 0) {
      alert("Enter the Valid Amount .....");
      return;
    }
    if (isBank) {
      if (!bankId) {
        alert("Select Bank Account.....");
        return;
      }
      if (!chNo) {
        alert("Enter Cheque Number.....");
        return;
      }
    }

    const billsPayload = Array.from(state.selectedBills.values());

    const payload = {
      paymentNo: payNo,
      paymentDate: payDate,
      isBank,
      bankId,
      bankName,
      chNo,
      chDate,
      expenseType,
      expIncId,
      payTo,
      paymentType,
      amount,
      description,
      bills: billsPayload
    };

    try {
      const res = await fetch("/api/payments/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Record Stored successfully .");
      applyBundle(data);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving payment.");
    }
  }

  async function handleDelete() {
    const payNo = state.currentPRA || Number(el("pay-no")?.value || 0);
    if (!payNo) {
      alert("No Payment record selected to delete.");
      return;
    }
    if (!confirm(`Are you sure you want to delete Payment Voucher #${payNo}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/payments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentNo: payNo })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message || "Record Deleted successfully.");
      loadPayment("last=1");
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting payment.");
    }
  }

  function handleChequePrint() {
    const payNo = state.currentPRA || Number(el("pay-no")?.value || 0);
    if (!payNo) {
      alert("Please load a Payment Voucher first.");
      return;
    }
    const isBank = el("pay-opt-bank")?.checked;
    if (!isBank) {
      alert("Cheque printing is only applicable for Bank payments.");
      return;
    }
    window.open(`/api/print?type=cheque-leaf&no=${payNo}`, "_blank");
  }

  function handleVoucherPrint() {
    const payNo = state.currentPRA || Number(el("pay-no")?.value || 0);
    if (!payNo) {
      alert("Please load a Payment Voucher first.");
      return;
    }
    window.open(`/api/print?type=payment-voucher&no=${payNo}`, "_blank");
  }

  function initEvents() {
    el("pay-btn-x")?.addEventListener("click", closePayments);
    el("pay-btn-close")?.addEventListener("click", closePayments);

    // Bank / Cash toggle
    el("pay-opt-bank")?.addEventListener("change", () => {
      if (el("pay-frame-bank")) el("pay-frame-bank").style.display = "";
    });
    el("pay-opt-cash")?.addEventListener("change", () => {
      if (el("pay-frame-bank")) el("pay-frame-bank").style.display = "none";
    });

    // Expense type changed -> load corresponding payees
    el("pay-exp-type")?.addEventListener("change", () => {
      loadPayees();
    });

    // Payee changed -> load details and bills
    el("pay-to-whom")?.addEventListener("change", (e) => {
      loadPayeeDetails(Number(e.target.value));
    });

    // Payment type changed -> update bills visibility/selection
    el("pay-type")?.addEventListener("change", () => {
      renderBillsGrid();
    });

    // Amount input -> live words
    el("pay-amount")?.addEventListener("input", updateWordsDisplay);

    // Toolbar buttons
    el("pay-btn-new")?.addEventListener("click", () => {
      loadPayment("new=1");
    });
    el("pay-btn-save")?.addEventListener("click", handleSave);
    el("pay-btn-modify")?.addEventListener("click", () => {
      state.mode = "edit";
      if (el("pay-btn-save")) {
        el("pay-btn-save").disabled = false;
        el("pay-btn-save").textContent = "Update";
      }
      if (el("pay-btn-modify")) el("pay-btn-modify").disabled = true;
    });
    el("pay-btn-delete")?.addEventListener("click", handleDelete);

    // Navigation buttons
    el("pay-btn-first")?.addEventListener("click", () => loadPayment("first=1"));
    el("pay-btn-last")?.addEventListener("click", () => loadPayment("last=1"));
    el("pay-btn-prev")?.addEventListener("click", () => {
      loadPayment(`prev=1&currentNo=${state.currentPRA}`);
    });
    el("pay-btn-next")?.addEventListener("click", () => {
      loadPayment(`next=1&currentNo=${state.currentPRA}`);
    });

    // Print buttons
    el("pay-btn-cheque")?.addEventListener("click", handleChequePrint);
    el("pay-btn-print")?.addEventListener("click", handleVoucherPrint);
  }

  function openPayments(target) {
    const sec = el("payments");
    if (!sec) return;
    sec.hidden = false;

    if (target && target.paymentNo) {
      loadPayment(`no=${target.paymentNo}`);
    } else {
      loadPayment("last=1");
    }
  }

  function closePayments() {
    const sec = el("payments");
    if (sec) sec.hidden = true;
  }

  window.openPayments = openPayments;
  window.closePayments = closePayments;

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
  });
})();
