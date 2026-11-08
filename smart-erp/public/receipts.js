// Receipts (frmReceipts) - Cash Flow Suite
(function () {
  let state = {
    mode: "new",
    currentReceiptNo: 0,
    bundle: null,
    payers: [],
    bills: [],
    selectedBills: new Map() // billId -> { billNo, billDate, billAmount, pendingBalance, amountReceived }
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
    const amt = parseFloat(el("recp-amount")?.value || 0) || 0;
    const lbl = el("recp-lbl-words");
    if (lbl) {
      lbl.textContent = numToWords(amt);
    }
  }

  function renderBalances(bundle) {
    const tbody = el("recp-tbody-balances");
    if (!tbody) return;

    let html = "";
    // Cash Balance
    const cashBal = Number(bundle.currentCashBalance || 0);
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
    const sel = el("recp-bank-id");
    if (!sel) return;

    sel.innerHTML = `<option value="">-- Select Bank Account --</option>` +
      (banks || []).map(b => `<option value="${b.bankId || b.bank_id}" ${Number(selectedBankId) === Number(b.bankId || b.bank_id) ? "selected" : ""}>${escapeHtml(b.bankName || b.bank_name)}</option>`).join("");
  }

  function renderPayers(payers, selectedPayerId) {
    const sel = el("recp-from-whom");
    if (!sel) return;

    sel.innerHTML = `<option value="">-- Select Payer --</option>` +
      (payers || []).map(p => `<option value="${p.id}" ${Number(selectedPayerId) === Number(p.id) ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
  }

  function renderBillsGrid() {
    const tbody = el("recp-tbody-bills");
    if (!tbody) return;

    const recpType = el("recp-type")?.value;
    if (recpType !== "Against Bill") {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">Receipt Type is '${escapeHtml(recpType)}'. Bills table is used for 'Against Bill'.</td></tr>`;
      return;
    }

    if (!state.bills || state.bills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 15px;">No open pending invoices for this customer.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.bills.map((b, idx) => {
      const isChecked = state.selectedBills.has(b.billId);
      const selData = state.selectedBills.get(b.billId);
      const allocAmt = isChecked ? (selData.amountReceived || b.pendingBalance) : 0;

      return `
        <tr style="background: ${isChecked ? 'rgba(0, 122, 255, 0.08)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-stripe)')};">
          <td style="border: 1px solid var(--border-color); padding: 4px; text-align: center;">
            <input type="checkbox" class="recp-chk-bill" data-id="${b.billId}" ${isChecked ? "checked" : ""} ${state.mode === 'edit' ? 'disabled' : ''}>
          </td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; font-weight: bold; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(b.billNo)}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: center;">${escapeHtml(b.billDate || "")}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: right; font-family: var(--font-mono);">${formatCurrency(b.billAmount)}</td>
          <td style="border: 1px solid var(--border-color); padding: 4px 6px; text-align: right; color: var(--danger, #ff3b30); font-weight: bold; font-family: var(--font-mono);">${formatCurrency(b.pendingBalance)}</td>
          <td style="border: 1px solid var(--border-color); padding: 2px 4px; text-align: right;">
            <input type="number" step="0.01" min="0" max="${b.pendingBalance}" class="invmfg-input recp-inp-bill-amt" data-id="${b.billId}" value="${Number(allocAmt).toFixed(2)}" style="width: 85px; text-align: right; font-weight: bold; font-family: var(--font-mono);" ${isChecked ? "" : "disabled"} ${state.mode === 'edit' ? 'readonly' : ''}>
          </td>
        </tr>
      `;
    }).join("");

    // Attach events
    tbody.querySelectorAll(".recp-chk-bill").forEach(chk => {
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
            amountReceived: Number(bill.pendingBalance)
          });
        } else {
          state.selectedBills.delete(id);
        }
        recalcAmountFromBills();
        renderBillsGrid();
      });
    });

    tbody.querySelectorAll(".recp-inp-bill-amt").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const id = Number(e.target.dataset.id);
        const val = parseFloat(e.target.value) || 0;
        if (state.selectedBills.has(id)) {
          state.selectedBills.get(id).amountReceived = val;
        }
        recalcAmountFromBills();
      });
    });
  }

  function recalcAmountFromBills() {
    let tot = 0;
    for (const b of state.selectedBills.values()) {
      tot += Number(b.amountReceived || 0);
    }
    const amtInput = el("recp-amount");
    if (amtInput) {
      amtInput.value = tot.toFixed(2);
      updateWordsDisplay();
    }
  }

  async function loadPayers(selectedPayerId) {
    const incType = el("recp-inc-type")?.value || "Sales";
    try {
      const res = await fetch(`/api/receipts/payers?type=${encodeURIComponent(incType)}`);
      const data = await res.json();
      state.payers = data.payers || [];
      renderPayers(state.payers, selectedPayerId);
      await loadPayerDetails(selectedPayerId || state.payers[0]?.id);
    } catch (err) {
      console.error("loadPayers error:", err);
    }
  }

  async function loadPayerDetails(payerId) {
    if (!payerId) {
      state.bills = [];
      state.selectedBills.clear();
      renderBillsGrid();
      if (el("recp-lbl-party-bal")) el("recp-lbl-party-bal").innerHTML = "Customer Bal: <b>Rs. 0.00</b>";
      if (el("recp-lbl-adv-bal")) el("recp-lbl-adv-bal").innerHTML = "Adv Bal: <b>Rs. 0.00</b>";
      return;
    }

    const incType = el("recp-inc-type")?.value || "Sales";
    try {
      // 1. Party balance
      const balRes = await fetch(`/api/receipts/party-balance?type=${encodeURIComponent(incType)}&payerId=${payerId}`);
      const balData = await balRes.json();
      if (el("recp-lbl-party-bal")) el("recp-lbl-party-bal").innerHTML = `Customer Bal: <b>Rs. ${formatCurrency(balData.pendingBalance)}</b>`;
      if (el("recp-lbl-adv-bal")) el("recp-lbl-adv-bal").innerHTML = `Adv Bal: <b>Rs. ${formatCurrency(balData.advanceBalance)}</b>`;

      // 2. Bills
      const billsRes = await fetch(`/api/receipts/bills?type=${encodeURIComponent(incType)}&payerId=${payerId}`);
      const billsData = await billsRes.json();
      state.bills = billsData.bills || [];
      state.selectedBills.clear();
      renderBillsGrid();
    } catch (err) {
      console.error("loadPayerDetails error:", err);
    }
  }

  function applyBundle(bundle) {
    if (!bundle) return;
    state.bundle = bundle;
    state.mode = bundle.mode || "new";
    state.currentReceiptNo = bundle.receiptNo || 0;

    if (el("recp-mode")) el("recp-mode").value = state.mode;
    if (el("recp-no")) el("recp-no").value = String(bundle.receiptNo || "");
    if (el("recp-date")) el("recp-date").value = bundle.receiptDate || "";

    // Bank vs Cash
    if (bundle.isBank) {
      if (el("recp-opt-bank")) el("recp-opt-bank").checked = true;
      if (el("recp-frame-bank")) el("recp-frame-bank").style.display = "";
    } else {
      if (el("recp-opt-cash")) el("recp-opt-cash").checked = true;
      if (el("recp-frame-bank")) el("recp-frame-bank").style.display = "none";
    }

    renderBanks(bundle.banks, bundle.bankId);
    if (el("recp-ch-no")) el("recp-ch-no").value = bundle.chNo || "";
    if (el("recp-ch-date")) el("recp-ch-date").value = bundle.chDate || bundle.receiptDate || "";

    // Balances
    renderBalances(bundle);

    // Income Type & Payer
    if (el("recp-inc-type")) el("recp-inc-type").value = bundle.incomeType || "Sales";
    if (el("recp-type")) el("recp-type").value = bundle.receiptType || "Against Bill";

    if (el("recp-amount")) el("recp-amount").value = Number(bundle.amount || 0).toFixed(2);
    updateWordsDisplay();

    if (el("recp-desc")) el("recp-desc").value = bundle.description || "";

    // Form inputs state
    const isView = state.mode === "view";
    el("recp-btn-modify").disabled = !isView;
    el("recp-btn-delete").disabled = !isView;
    el("recp-btn-save").disabled = isView;
    el("recp-btn-print").disabled = !isView;

    setInputsDisabled(isView);

    // Load Payers and Bills
    loadPayers(bundle.expIncId).then(() => {
      if (bundle.bills && bundle.bills.length > 0) {
        state.selectedBills.clear();
        for (const b of bundle.bills) {
          state.selectedBills.set(b.billId, b);
        }
        renderBillsGrid();
      }
    });
  }

  function setInputsDisabled(disabled) {
    const fields = [
      "recp-date", "recp-opt-bank", "recp-opt-cash", "recp-bank-id", "recp-ch-no",
      "recp-ch-date", "recp-inc-type", "recp-from-whom", "recp-type", "recp-amount", "recp-desc"
    ];
    for (const id of fields) {
      const field = el(id);
      if (field) field.disabled = disabled;
    }
  }

  async function loadNewReceipt() {
    try {
      const res = await fetch("/api/receipts?new=1");
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadNewReceipt error:", err);
    }
  }

  async function loadReceiptByNo(no) {
    if (!no) return;
    try {
      const res = await fetch(`/api/receipts?no=${no}`);
      const data = await res.json();
      if (data.error || data.message) {
        alert(data.error || data.message);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("loadReceiptByNo error:", err);
    }
  }

  async function navigate(direction) {
    try {
      const cur = state.currentReceiptNo || 0;
      let url = `/api/receipts?${direction}=1&currentNo=${cur}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.message) {
        alert(data.message);
        return;
      }
      if (data.error) {
        alert(data.error);
        return;
      }
      applyBundle(data);
    } catch (err) {
      console.error("navigate error:", err);
    }
  }

  async function saveReceipt() {
    const receiptNo = state.mode === "edit" ? state.currentReceiptNo : 0;
    const receiptDate = el("recp-date")?.value;
    const isBank = el("recp-opt-bank")?.checked;
    const bankId = isBank ? el("recp-bank-id")?.value : null;
    const bankName = isBank ? el("recp-bank-id")?.options[el("recp-bank-id")?.selectedIndex]?.text : "";
    const chNo = isBank ? el("recp-ch-no")?.value : "";
    const chDate = isBank ? el("recp-ch-date")?.value : null;
    const incomeType = el("recp-inc-type")?.value || "Sales";
    const payerSelect = el("recp-from-whom");
    const expIncId = payerSelect ? payerSelect.value : "";
    const receivedFrom = payerSelect ? (payerSelect.options[payerSelect.selectedIndex]?.text || "") : "";
    const receiptType = el("recp-type")?.value || "Against Bill";
    const amount = parseFloat(el("recp-amount")?.value || 0) || 0;
    const description = el("recp-desc")?.value || "";

    if (!receivedFrom || receivedFrom === "-- Select Payer --") {
      alert("Please select a Payer / Received From.");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid Receipt Amount greater than 0.");
      return;
    }
    if (isBank) {
      if (!bankId) {
        alert("Please select Our Bank Ac.");
        return;
      }
      if (!chNo) {
        alert("Please enter Cheque / DD No.");
        return;
      }
    }

    if (receiptType === "Against Bill") {
      if (state.selectedBills.size === 0) {
        alert("Please select at least one Invoice to adjust against in 'Against Bill' mode.");
        return;
      }
      let allocTot = 0;
      for (const b of state.selectedBills.values()) {
        allocTot += Number(b.amountReceived || 0);
      }
      if (Math.abs(allocTot - amount) > 0.05) {
        alert(`Total allocated bills (Rs. ${formatCurrency(allocTot)}) does not match Total Amount (Rs. ${formatCurrency(amount)}). Please adjust.`);
        return;
      }
    }

    const payload = {
      receiptNo,
      receiptDate,
      isBank,
      bankId,
      bankName,
      chNo,
      chDate,
      incomeType,
      receivedFrom,
      expIncId,
      receiptType,
      amount,
      description,
      bills: Array.from(state.selectedBills.values())
    };

    if (!confirm("Are You Sure To Save?")) {
      return;
    }

    try {
      const res = await fetch("/api/receipts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert("Error saving receipt: " + data.error);
        return;
      }
      alert(data.message || "Record Saved Successfully...");
      applyBundle(data);
    } catch (err) {
      console.error("saveReceipt error:", err);
      alert("Network error while saving receipt voucher.");
    }
  }

  async function deleteReceipt() {
    if (!state.currentReceiptNo || state.mode !== "view") {
      alert("Please select a valid Receipt Voucher to delete.");
      return;
    }

    if (!confirm("Are You Sure to Delete This Record...?\r\n\r\nMake sure to Delete this Record")) {
      return;
    }

    try {
      const res = await fetch("/api/receipts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNo: state.currentReceiptNo })
      });
      const data = await res.json();
      if (data.error) {
        alert("Error deleting receipt: " + data.error);
        return;
      }
      alert(data.message || "Record Deleted successfully.");
      loadNewReceipt();
    } catch (err) {
      console.error("deleteReceipt error:", err);
      alert("Network error while deleting receipt voucher.");
    }
  }

  function printReceipt() {
    if (!state.currentReceiptNo) {
      alert("Please select a Receipt Voucher to print.");
      return;
    }
    window.open(`/api/print?type=receipt-voucher&no=${state.currentReceiptNo}`, "_blank");
  }

  function setupEvents() {
    // Bank vs Cash radios
    el("recp-opt-bank")?.addEventListener("change", () => {
      if (el("recp-frame-bank")) el("recp-frame-bank").style.display = "";
    });
    el("recp-opt-cash")?.addEventListener("change", () => {
      if (el("recp-frame-bank")) el("recp-frame-bank").style.display = "none";
    });

    // Income Type change
    el("recp-inc-type")?.addEventListener("change", () => {
      loadPayers();
    });

    // Payer change
    el("recp-from-whom")?.addEventListener("change", (e) => {
      loadPayerDetails(e.target.value);
    });

    // Receipt Type change
    el("recp-type")?.addEventListener("change", () => {
      renderBillsGrid();
    });

    // Amount input
    el("recp-amount")?.addEventListener("input", () => {
      updateWordsDisplay();
    });

    // Toolbar buttons
    el("recp-btn-new")?.addEventListener("click", () => {
      loadNewReceipt();
    });

    el("recp-btn-save")?.addEventListener("click", () => {
      saveReceipt();
    });

    el("recp-btn-modify")?.addEventListener("click", () => {
      state.mode = "edit";
      if (el("recp-mode")) el("recp-mode").value = "edit";
      el("recp-btn-save").disabled = false;
      el("recp-btn-modify").disabled = true;
      setInputsDisabled(false);
    });

    el("recp-btn-delete")?.addEventListener("click", () => {
      deleteReceipt();
    });

    // Navigation buttons
    el("recp-btn-first")?.addEventListener("click", () => navigate("first"));
    el("recp-btn-prev")?.addEventListener("click", () => navigate("prev"));
    el("recp-btn-next")?.addEventListener("click", () => navigate("next"));
    el("recp-btn-last")?.addEventListener("click", () => navigate("last"));

    // Print & Close
    el("recp-btn-print")?.addEventListener("click", () => printReceipt());
    el("recp-btn-close")?.addEventListener("click", () => window.closeReceipts());
    el("recp-btn-x")?.addEventListener("click", () => window.closeReceipts());
  }

  window.openReceipts = function () {
    const sec = el("receipts");
    if (sec) {
      sec.hidden = false;
      loadNewReceipt();
    }
  };

  window.closeReceipts = function () {
    const sec = el("receipts");
    if (sec) {
      sec.hidden = true;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    setupEvents();
  });
})();
