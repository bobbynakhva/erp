# Specification: Advance Adjustments (`frmAdvAdjust`)

## 1. Overview
The **Advance Adjustments** module (`frmAdvAdjust`) is the 4th and final pillar of the **Cash Flow Suite** in SMART-ERP.
It allows companies to reconcile, settle, and adjust advance funds previously given to Vendors / Payees (Expense Advances) or received from Customers / Payers (Income Advances):
1. **Cash Adjustment / Refund**: Advance refunded or returned in physical cash.
2. **Bank Adjustment / Refund**: Advance refunded or returned via company bank account (cheque / transfer).
3. **Bills - Auto Selection (Adjst Note)**: Advance automatically applied to open unpaid purchase/sales invoices in FIFO order.
4. **Bills - Manual Selection (Adjst Note)**: User selects specific pending invoices from the grid to settle against the advance balance.

The form also displays real-time **Cash & Bank Balance Details** and **Balance Details** for the selected party.

---

## 2. Visual Layout & Form Components
Matches `SCREENSHOTS/CASHFLOW/004_advance_adjustments.png` and decompiled VB6 bytecode (`vbdec/679098378.txt`, `vbdec/2141056390.txt`, `vbdec/1699867355.txt`, `vbdec/39477693.txt`, `vbdec/1012387900.txt`, `vbdec/1780142272.txt`, `vbdec/404739118.txt`):

### Top Section: Direction & Adjustment Info
- **Advance Adjustments On** (`Frame1`):
  - `Income` (`optIncome`, default checked) - Customer advance adjustments
  - `Expense` (`optExpense`) - Vendor / supplier advance adjustments
- **Adjustments** (`Frame2`):
  - `Adjustment No` (`lblAdjId`): Sequential adjustment number.
  - `Date Picker` (`DTPAdjDate`): Date of adjustment.
  - `Income Type` / `Expense Type` (`cmbExpIncType` / `lblType`): Dropdown:
    - Income: `Sales`, `Labour`, `Income`, `Other`
    - Expense: `Purchase`, `SubContract`, `Expense`, `Other`
  - `Adjust A/c` (`txtWhom`): Dropdown / autocomplete of active parties (Customers for Income, Vendors for Expense).
  - `Amount` (`txtAmount`): Numeric adjustment amount.
  - `Amt. in words` (`lblWords`): Real-time conversion into Indian Rupees words.

### Middle Section: Adjustment Method & Bills Grid
- **Advance Adjustments Method** (`Frame3`):
  - `Bank` (`optBank`): Reveals Bank selector (`cmbBank`), Cheque No (`txtChNo`), Cheque Date (`DTPCHDate`).
  - `Cash` (`optCash`, default checked): Physical cash movement.
  - `Bills - Auto Selection (Adjst Note)` (`optAutoBill`): Automatically applies to pending bills.
  - `Bills - Manual Selection (Adjst Note)` (`optManuBill`): User selects specific bills in grid.
- **Bills List Grid** (`msflexBills`):
  - Columns: `Select` | `Bill No` | `Bill Date` | `Bill Amount` | `Pending Balance` | `Adjust Amount`
  - Populates pending unpaid invoices for the selected party.
- **Narration & Flow**:
  - `* Description` (`txtDesc`): Remarks / narration text.
  - `Nature of Flow` (`lblNat`): Displays `Inflow` or `Outflow`.

### Right Panels: Live Balances
- **Cash & Bank Balance Details** (`msfCash`):
  - Shows live cash drawer balance and each company bank account with credit limits.
- **Balance Details** (`msfBal`):
  - Shows total outstanding advance balance for the selected party (`AmtBal` from `fund_trans`).

### Toolbar Buttons:
- `New`: Clears form, loads next adjustment number.
- `Save`: Validates and commits atomic adjustment transaction.
- `Modify`: Allows updating existing adjustment.
- `Delete`: Rolls back adjustment, restoring invoice balances and advance balances.
- `|<`, `<`, `>`, `>|`: Sequential navigation.
- `Close`: Closes window.

---

## 3. Database Schema & Accounting Transactions

### Tables Used:
1. `fund_trans`:
   - `p_r_a`: `4` (identifies Advance Adjustments in SMART-ERP)
   - `fund_trans_id`: Adjustment Number (`lblAdjId`)
   - `is_expense`: `false` (Income) | `true` (Expense)
   - `p_r_a_src_dst`:
     - `'1'` or `'Bank'` for Bank
     - `'2'` or `'Cash'` for Cash
     - `'3'` or `'Auto Bill'` for Bills Auto Selection
     - `'4'` or `'Manual Bill'` for Bills Manual Selection
   - `code`: Income Type or Expense Type
   - `party_name`: Adjust A/c Name
   - `amount`: Adjustment Amount
   - `bank_id`, `bank_name`, `ch_no`, `ch_date`: populated for Bank method
   - `track_bill`: Invoices adjusted against
   - `description`: Narration

2. `bank_trans` (only when Bank method is selected):
   - `p_r_a`: `4`
   - `trans_id`: Adjustment Number
   - If Income (refund to customer): `draw_amt = amount`, `dept_amt = 0`
   - If Expense (refund from vendor): `dept_amt = amount`, `draw_amt = 0`

3. Balance updates:
   - Advance balance: `fund_trans.adv_balance = adv_balance - adjusted_amt`
   - Invoice balance (when bills selected): invoice `balance_amt = balance_amt - adjusted_amt`

---

## 4. Exact Validation Rules (VB6 Decompiled Fidelity)
1. **Bank Selection**:
   - If Bank method is selected and no bank chosen:
     `"Please Select a bank..."`
   - If Cheque No is empty:
     `"Please enter the cheque number..."`
   - If Cheque Date is invalid/empty:
     `"Please enter the cheque Date..."`
2. **Type Selection**:
   - If Income Type empty: `"Please Enter the Income Type..."`
   - If Expense Type empty: `"Please Enter the Expense Type..."`
3. **Party Selection**:
   - If Adjust A/c empty: `"Please Enter the Adjust A/c Name..."`
4. **Amount Validations**:
   - If Amount <= 0: `"Please Enter the Amount..."`
   - If Amount > Available Party Advance:
     `"Enter the Amount Lesser than \\ Equal to the Advance Amount"`
5. **Bill Selection Validations**:
   - If Bills method selected but no bills chosen:
     `"No Bills Selected.Please Select a Bill"`
   - If Bill Amount > Advance:
     `"Enter the Bill Amount Lesser than \\ Equal to the Advance Amount"`
6. **Save Confirmation**:
   - `"Are You Sure To Save?"` -> On commit: `"Records Saved Successfully..."`
