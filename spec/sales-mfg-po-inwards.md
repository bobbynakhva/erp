# Specification: Purchase Order - Inwards (`frmMfgPO`)

## 1. Overview & Business Context
- **Module:** Sales / Labour -> Manufacturing -> Purchase Order - Inwards
- **Legacy Form:** `frmMfgPO`
- **Bytecode References:** `vbdec/1080876595.txt`, `vbdec/1282835113.txt` (`Form_Load`), `vbdec/1557669934.txt` (`cmdSave_Click`), `vbdec/1521983726.txt` (`cmdModify_Click`), `vbdec/1861709784.txt` (`Proc_E3B3A0` header save), `vbdec/1382716585.txt` (`Proc_DB3624` detail lines save), `vbdec/1168238495.txt` (`Proc_E1FBC4` header validations), `vbdec/592191821.txt` (`Proc_E483BC` grid validations), `vbdec/716698631.txt` (`cmbCust_Click`), `vbdec/1537704628.txt` (`Proc_C6E638` navigation).
- **Screenshot:** [SCREENSHOTS/SALES_LABOUR/Manufacturing/001_purchase_order_inwards.png](file:///f:/the%20coder%20copu/SCREENSHOTS/SALES_LABOUR/Manufacturing/001_purchase_order_inwards.png)

When a customer issues a purchase order to our brass parts factory to manufacture components, this is an **Inward Purchase Order** (Sales Order).

---

## 2. Form Controls & Layout

### Header: Top Bar
- Title: `SALES - Manufacturing-Purchase Order (Inwards)`
- Top Right: `×` close button.

### PO Type Frame (`Frame1`)
- `[ ] Open PO` (`chkIsOpenPO`): When checked, Qty can be 0 (open quantity purchase contract).
- `[ ] Scheduled PO` (`chkIsSchPO`): Scheduled delivery purchase order.

### Customer Details Frame (`Frame3`)
- `From Customer` (`cmbCust`): Dropdown of active customers (`SELECT cust_id, cust_name FROM customer WHERE NOT COALESCE(inactive, false) ORDER BY cust_name`).
- `* Cost Center` (`cmbCostCntr`): Dropdown of cost centers (`SELECT cost_id, cost_name FROM cost_center ORDER BY cost_name`).
- `* Remarks` (`txtRem`): Text input for internal remarks.
- Note Label & Shortcuts:
  - `Press F5 Key ---> Item Master`
  - `Press F10 Key ---> Cancel PO`
  - `Press F11 Key ---> PO Details`
  - `Press F12 Key ---> Change PO No.`

### Right Panel: PO Details (`Frame5`)
- `Party PO No.` (`txtPOno`): Customer's PO Number.
- `PO Date` (`dtpPoDate`): Date picker (defaults to today).
- `P.O. VALID--> * FROM` (`dtpValidFrom`) `* To` (`dtpValidTo`): Validity date range.
- `[ ] *Rejections Re-Tracking with this PO Required` (`chkReTrkRej`): Checkbox.
- `* Payment Terms` (`txtPayTerm`): Text input (e.g. `30 Days Net`).
- Taxes:
  - `* VAT` (`txtTINperc`): % input.
  - `* CST` (`txtCSTperc`): % input.
- `PO Value (inclusive of Taxes)` (`txtVal`): Numeric input formatted to `0.00`.
  - Blue label note: `(Double click to recalculate)`.
- `Currency` (`cmbCurrName`): Dropdown from `currencyType` / `currencyToday`.
  - Label: `TodayVal` / `lblTodayVal` (exchange rate).
- Legend: `* Optional Fields`.

---

## 3. 8-Column Grid: Incoming Items Details (`msflex`)
Columns:
1. `Sl.No`: Serial line number (1, 2, 3...).
2. `Item Code / Part No.`: Item code with autocomplete / search list from `item` master. F5 key opens Item Master.
3. `Item/Comp. Name`: Readonly description populated from `item.item_name`.
4. `UOM`: Unit of measurement (`item.measure_unit`). Editable; auto-registers if new.
5. `Qty`: Numeric input. Validated > 0 unless `Open PO` is checked.
6. `Rate`: Numeric unit price. Validated > 0.
7. `Disc%`: Discount percentage (defaults to 0.00).
8. `Due Date`: Delivery date for this line item (defaults to Valid To or PO Date).

---

## 4. Bottom Toolbar & Navigation
- Search:
  - `Search PO No.` (`txtGO` input) + `Find` button. Enter in `txtGO` triggers search.
- Follow-up controls:
  - `[1] [✓] FollowUp?` (`txtFollowUpNo`, `chkFollowup`).
- Buttons:
  - `New`: Clears form, loads defaults.
  - `Save`: Validates and saves to `mfgpo` and `mfgposub`.
  - `Modify`: Enables editing of current PO.
  - `Delete`: Deletes current PO and its lines.
  - Navigation: `|<< First`, `<< Prev`, `>> Next`, `>>| Last`.
  - `Print`: Prints order details.
  - `Close`: Closes window.

---

## 5. Calculations & Business Logic

1. **Customer Selection Behavior (`cmbCust_Click`):**
   - Pre-fills `Currency` to customer's previous PO currency, or default `RUPEES`.
   - Pre-fills `VAT %` and `CST %` from customer's previous PO.
2. **Line Calculation:**
   - Line Amount = `Qty * Rate * (1 - Disc% / 100)`.
3. **Total PO Value Calculation (`txtVal_DblClick`):**
   - Line Total = Sum of all line amounts.
   - Tax = `Line Total * ((VAT% + CST%) / 100)`.
   - Total PO Value = `Line Total + Tax`, formatted to 2 decimals (`0.00`).
4. **Validations (`Proc_E1FBC4` & `Proc_E483BC`):**
   - Customer must be selected: `Please Select a Customer .....`
   - PO No must be entered: `Enter the Purchase Order Number..... `
   - Duplicate PO No for the same customer: `A Record with same Order No. already exist.....`
   - Cost Center must be valid: `Please Select an existing CostCenter....`
   - Currency must be valid: `Please Select an existing Currency Name....`
   - At least 1 item detail required: `Please Enter the Item details by clicking the grid heading...`
   - Line Part No: `Enter a Valid Item Code/Part No. for the SlNo. .....`
   - Part No exists: `Part No. does not exist ... !!!`
   - Component Name: `Enter Item/Component Name for the SlNo. `
   - UOM: `Enter a Valid 'Unit Of Measurements' 'UOM'  in short Form \r\n eg., Kg for Kilograms, Nos for Numbers etc.\r\n for the SlNo.`
   - Qty: If not Open PO and Qty <= 0: `Enter the Valid Qty ..... `
   - Rate: If Rate <= 0: `Enter the Valid Rate `
