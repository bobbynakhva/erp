# Receipts (`frmReceipts`) Specification

## 1. Overview
- **Menu Route:** Cash Flow → Receipts
- **Menu Click:** `mnuReceipts_Click`
- **Internal VB6 Form:** `frmReceipts`
- **Primary Database Tables:** `fund_trans`, `bank_trans`, `bank`, `customer`, `income`, `dcinv`, `dcoutgoinginv`, `misc`
- **Screenshot Reference:** `SCREENSHOTS/CASHFLOW/002_receipts.png`

---

## 2. Visual Layout & UI Controls

### Top-Left: Receipt Running No. (`Frame4`)
- **Receipt No (`lblRecpId` / `txtReceiptNo`):** Auto-increment voucher ID (`P_R_A`), searchable and navigable.
- **Receipt Dt. (`DTPRecpDate`):** Receipt date picker (defaults to system date).

### Top-Right: Cash & Bank Balance Details (`Frame5` / `msfCash`, `msfBal`)
- FlexGrid table with 3 columns:
  - `Bank Name`
  - `Balance`
  - `Credit Limit`
- Lists:
  - `Cash Balance`: calculated from `Misc.openbal` + cash receipts - cash payments.
  - Active Banks: calculated from `bank_op_bal` + bank receipts/deposits (`DeptAmt`) - withdrawals (`DrawAmt`).

### Middle-Left: Select Bank Or Cash Type (`Frame3`)
- Radio options:
  - `Bank` (`optBank`): Enables nested Bank Details.
  - `Cash` (`optCash`): Disables Bank Details.
- **Bank Details (`frameBank`):**
  - `Our Bank Ac` (`cmbBank`): Dropdown of active bank accounts.
  - `Cheque / DD No.` (`txtChNo`): Cheque / DD number string.
  - `Cheque / DD Date` (`DTPCHDate`): Cheque / DD date picker.

### Bottom-Left: Receipt Details (`frame`)
- **Income Type (`txtIncType` / combo):**
  - `Sales` (Customer sales invoices `dcinv`)
  - `Labour` (Customer labour invoices `dcoutgoinginv`)
  - `Income` (Direct / Indirect Income heads from `income` table)
  - `Other` (General / Miscellaneous receipts)
- **Received From (`txtFromWhom`):** Searchable autocomplete or dropdown of payers based on Income Type:
  - If `Sales`: Active Customers from `customer` table
  - If `Labour`: Active Customers from `customer` table
  - If `Income`: Active Income account heads from `income` table
  - If `Other`: General party name
- **Receipt Type (`txtRecpType`):**
  - `Against Bill`: Displays unpaid / open invoices in the bills grid.
  - `On Account`: Applies receipt against overall customer ledger.
  - `Advance`: Records an advance receipt tracked in `AdvAmount` / `AdvBalance`.
- **Amount (`txtAmount`):** Total receipt amount. Automatically calculated from selected bill allocations in `Against Bill` mode, or manually entered for `On Account` / `Advance`.
- **Description (`txtDesc`):** Narrative description / remarks for receipt voucher.

### Middle-Right: Against Bill Grid (`msflexBills`)
- Visible when `Receipt Type` is `Against Bill`:
  - Columns:
    1. `Bill No` (Sales Invoice `dcno` or Labour Invoice `dcno`)
    2. `Bill Date`
    3. `Bill Amount`
    4. `Pending Balance`
    5. `Receipt / Adjust Amount` (User editable / allocated amount)
  - Auto-allocates or updates total `txtAmount` as user adjusts line payments.

### Bottom Toolbar
- `New`: Resets form to create a new receipt voucher with the next available running voucher number.
- `Save`: Validates all inputs and stores the receipt into `fund_trans`, creates deposit entry in `bank_trans` if Bank, and reduces invoice balances if Against Bill.
- `Modify`: Allows updating description or details of existing receipt.
- `Delete`: Confirms deletion, rolls back invoice balances, and removes entries from `fund_trans` and `bank_trans`.
- `Navigation Buttons` (`|<<`, `<<`, `>>`, `>>|`): Navigates through recorded receipt vouchers.
- `Printer`: Opens printable official Receipt Voucher.
- `Close`: Closes the Receipts window.

---

## 3. Database Schema & Business Logic

### Table `fund_trans` (Receipt Header & Ledger Entry)
- `factory_id`, `year_label`
- `fund_trans_id`: Sequential transaction ID.
- `p_r_a`: Receipt voucher running number (e.g. 1, 2, 3...).
- `dates`, `datet`: Receipt date.
- `is_expense`: `false` (CR / Money Received).
- `code`: Income Type (`Sales`, `Labour`, `Income`, `Other`).
- `party_name`: Received From name.
- `exp_inc_id`: Customer ID or Income Head ID.
- `p_r_a_type`: `Against Bill`, `On Account`, or `Advance`.
- `p_r_a_src_dst`: `Bank` or `Cash`.
- `amount`: Receipt amount.
- `amt_bal`: Remaining balance (tracks advance receipt balance if `Advance`).
- `adv_amount`: Set to receipt amount if `Advance`, else 0.
- `adv_balance`: Initialized to receipt amount if `Advance`, else 0.
- `bank_id`, `bank_name`, `ch_no`, `ch_date`: Cheque / Bank details.
- `description`: Voucher description.
- `track_bill`: Comma-separated list of settled bill numbers.
- `status_c`: Active status flag (`true`).

### Table `bank_trans` (Bank Deposit Entry)
When `optBank` is selected:
- `trans_id`: Next bank transaction ID.
- `dates`, `datet`: Receipt date.
- `bank_id`: Selected bank account ID.
- `draw_amt`: 0.00
- `dept_amt`: Receipt amount (Deposit / Credit).
- `ch_no`, `ch_date`: Cheque details.
- `descr`: Receipt voucher description or party name.
- `fund_trans_id`: Linked `fund_trans.fund_trans_id`.
- `p_r_a`: Linked Receipt voucher number.

### Invoice Balance Reduction
When `Receipt Type` is `Against Bill`:
- For `Sales` (`dcinv`):
  `UPDATE dcinv SET balance = GREATEST(0, balance - $alloc) WHERE factory_id = $1 AND year_label = $2 AND dcinvid = $3`
- For `Labour` (`dcoutgoinginv`):
  `UPDATE dcoutgoinginv SET balance = GREATEST(0, balance - $alloc) WHERE factory_id = $1 AND year_label = $2 AND id = $3`

### Delete / Reversal Logic
When a receipt voucher is deleted:
- Reverts invoice balances:
  `balance = balance + allocated`
- Deletes bank transaction:
  `DELETE FROM bank_trans WHERE factory_id = $1 AND year_label = $2 AND p_r_a = $3 AND dept_amt > 0`
- Deletes fund transaction:
  `DELETE FROM fund_trans WHERE factory_id = $1 AND year_label = $2 AND p_r_a = $3 AND is_expense = false`

---

## 4. Endpoints Specification
- `GET /api/receipts?new=1` - Generates next receipt voucher number, live cash & bank balances, active bank accounts list.
- `GET /api/receipts?no=...` / `first=1` / `last=1` / `prev=1` / `next=1` - Navigates and loads receipt vouchers.
- `GET /api/receipts/payers?type=Sales|Labour|Income|Other` - Returns list of customers or income heads.
- `GET /api/receipts/bills?type=Sales|Labour&payerId=...` - Returns open unpaid invoices with balances > 0.
- `GET /api/receipts/party-balance?type=...&payerId=...` - Returns customer advance and pending invoice balance.
- `POST /api/receipts/save` - Validates, stores receipt, updates invoice balances & bank trans.
- `POST /api/receipts/delete` - Rolls back invoice balances and deletes voucher.
- `GET /api/print?type=receipt-voucher&no=...` - Generates printable official receipt voucher.
