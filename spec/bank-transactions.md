# Specification: Bank Transactions (`frmBankTrans`)

## 1. Overview
The **Bank Transactions** module (`frmBankTrans`) manages all non-invoice cash and bank fund movements within the Cash Flow Suite:
1. **Deposit**: Transfer of physical cash from the cash drawer into a company bank account (Decreases Cash, Increases Bank).
2. **WithDraw**: Withdrawal of funds from a company bank account into the cash drawer (Decreases Bank, Increases Cash).
3. **Bank Transfer**: Electronic/cheque transfer directly between two company bank accounts (Decreases Source Bank, Increases Destination Bank; Cash unaffected).

The screen also features a live real-time flexgrid: **Cash & Bank Balance Details**, showing live balances for the cash drawer and each active company bank account, alongside their approved credit limits.

---

## 2. Visual Layout & Form Components
Matches screenshot `SCREENSHOTS/CASHFLOW/003_bank_transactions.png` and bytecode `vbdec/867701039.txt`:

### Top-Left: Date & Type Selection
- **Transaction Date** (`DTPTransDate`): Transaction date (defaults to current date).
- **Select a Type** (`Frame2`): Radio buttons:
  - `Deposit` (`optDeposit`, default checked)
  - `WithDraw` (`optWithDraw`)
  - `Bank Transfer` (`optBankTrans`)

### Right Panel: Dynamic Transaction Input
- **Deposit / WithDraw Mode** (`frame_Dept_WithDrawl`):
  - Title: dynamically shows **Deposit** or **WithDraw**.
  - `Bank A/c` (`cmbBank`): Dropdown of active company banks (`bank` table).
  - `Amount` (`txtAmount`): Transaction amount (numeric, > 0).
  - `* Description` (`txtDesc`): Transaction narration / remarks.
- **Bank Transfer Mode** (`frameBankTransfer`):
  - Title: **Bank Transfer**.
  - `From Bank A/c` (`cmbFrom`): Source bank dropdown.
  - `To Bank A/c` (`cmbTo`): Destination bank dropdown (cannot equal From Bank).
  - `Amount` (`txtTransAmount`): Transfer amount (numeric, > 0).
  - `Cheque / Ref No` (`txtChNo`): Optional transfer reference / cheque leaf number.
  - `Cheque Date` (`DTPCHDate`): Reference date.
  - `* Description` (`txtTransDesc`): Transfer narration / remarks.
- **Amount in Words** (`lblWords`): Real-time conversion into Indian Rupees words.
- **Transaction ID** (`lblTransId`): Unique sequential transaction identifier.

### Bottom-Left: Live Balances FlexGrid
- **Cash & Bank Balance Details** (`msfCash`):
  - Columns: `Bank Name` | `Balance` | `Credit Limit`
  - Row 1: `Cash Balance` (`<amount> Cr.` / `Dr.`), no credit limit.
  - Following rows: Each bank account with its live computed balance (`Cr.` / `Dr.`) and approved `Credit Limit`.

### Toolbar Buttons
- `New`: Clears form, loads next sequential `trans_id`, defaults to `Deposit` mode.
- `Save`: Validates and commits atomic transaction to database.
- `Modify`: Updates existing transaction.
- `Delete`: Confirms and rolls back bank and fund transaction records.
- `|<`, `<`, `>`, `>|`: Navigation across sequential transactions.
- `Close`: Closes window.

---

## 3. Database Schema & Accounting Transactions

### Tables Used:
1. `bank_trans`:
   - `id`: integer (0)
   - `factory_id`: integer
   - `year_label`: text
   - `trans_id`: integer (sequential group transaction id)
   - `dates`: timestamp
   - `datet`: date
   - `bank_id`: integer
   - `draw_amt`: numeric (withdrawal / debit)
   - `dept_amt`: numeric (deposit / credit)
   - `ch_no`: text
   - `ch_date`: date
   - `descr`: text
   - `p_r_a`: integer (3 = Bank Transaction)
   - `is_hidden_trans`: integer / boolean (1 for Bank Transfer paired entries, 0 for Deposit/WithDraw)

2. `fund_trans`:
   - `id`: integer
   - `factory_id`: integer
   - `year_label`: text
   - `fund_trans_id`: integer
   - `p_r_a`: integer (3 = Bank Transaction)
   - `p_r_a_src_dst`: text / int ('Cash')
   - `is_expense`: boolean (`true` for Cash Out / Deposit; `false` for Cash In / WithDraw)
   - `code`: 'Deposit' | 'WithDraw'
   - `amount`: numeric
   - `bank_id`: integer
   - `bank_name`: text
   - `description`: text
   - `datet`: date
   - `dates`: timestamp

---

## 4. Validation Rules (VB6 Decompiled Fidelity)
1. **Deposit / WithDraw**:
   - `cmbBank` must be selected (`ListIndex <> -1`): `"Please Select a Bank"`.
   - `txtAmount` must be > 0: `"Please Enter the Amount"`.
2. **Bank Transfer**:
   - `cmbFrom` must be selected: `"Please Select a \"From Bank\" "`.
   - `cmbTo` must be selected: `"Please Select a \"To Bank\" "`.
   - `cmbFrom` and `cmbTo` cannot be the same bank:
     `"'From Bank' and 'To Bank' are Same...\r\nIt should be different"`.
   - `txtTransAmount` must be > 0: `"Please Enter the Amount"`.
