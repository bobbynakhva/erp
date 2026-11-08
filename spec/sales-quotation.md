# Specification: Quotation Mfg/Labour Work (`frmQuote`)

## 1. Visual Structure & Layout
- **Screenshot:** [SCREENSHOTS/SALES_LABOUR/001_quotation.png](file:///f:/the%20coder%20copu/SCREENSHOTS/SALES_LABOUR/001_quotation.png)
- **Legacy Form:** `frmQuote` (decompiled bytecode: `vbdec/2135050495.txt`, `vbdec/1660404079.txt`, `vbdec/1187126183.txt`, `vbdec/1075079288.txt`, `vbdec/609263298.txt`, `vbdec/1028519664.txt`, `vbdec/27156725.txt`, `vbdec/1544099600.txt`, `vbdec/866101175.txt`, `vbdec/348311176.txt`, `vbdec/431858129.txt`, `vbdec/1428675221.txt`, `vbdec/1331309905.txt`, `vbdec/1976364202.txt`, `vbdec/55375401.txt`, `vbdec/1516524442.txt`, `vbdec/1119879193.txt`, `vbdec/2074404016.txt`, `vbdec/1842789478.txt`, `vbdec/671546808.txt`, `vbdec/1529589866.txt`, `vbdec/1186317320.txt`, `vbdec/972881312.txt`, `vbdec/2129292649.txt`).
- **Menu Route:** `Sales / Labour -> Quotation`

### Header Controls
- **Top Bar:**
  - Form Title: `Quotation Mfg/Labour Work`
  - Top Right: `Correspondences (1/10)` link button (`lblCorres`).
- **Left Panel ("Customer Details"):**
  - `To Customer` (`cmbCust`): Dropdown of active customers (`SELECT cust_id, cust_name FROM customer WHERE inactive = 0 ORDER BY cust_name`).
  - `* Kind Attn` (`cmbKindAttn`): Dropdown / editable text. Populated with distinct previous `kindattn` for this customer (`SELECT DISTINCT kindattn FROM quote WHERE TRIM(kindattn) <> '' AND cust_id = ? ORDER BY kindattn`), or defaults to customer's contact person (`SELECT contact FROM customer WHERE cust_id = ?`).
  - `* Remarks (For internal use)` (`txtRem`): Text input for internal notes.
  - Shortcut Hint: `Press F5 Key ---> Item Master` (`lblMach`).
  - (Hidden/Background: Address display `rtbAddr` populated with `customer.cust_addr`).
- **Right Panel:**
  - `Quotation No.`:
    - Prefix: `txtPrefix` (readonly, from `misc.prefix_quote`).
    - Number: `txtQuoteNo` (auto-numbered e.g. `1 /26-27` or editable, sequential for the financial year).
    - Date: `dtpQuoteDate` (date picker, defaults to today).
  - `* Ref. Enquiry. No.`:
    - Ref Enq No: `txtRefEnqNo` (optional text input).
    - Ref Enq Date: `dtpRefEnqDate` (date picker).
  - Work Type Radio Options:
    - `(•) Manufacturing` (`optMfg`): Default checked (`MfgORLab = 1`).
    - `( ) Labour work` (`OptLab`): (`MfgORLab = 0`).
  - `Total Quote Value`:
    - Value: `txtTotVal` (readonly, in Rs).
    - Note below: `(For Total Quote Value, Double Click the above box )`.
- **Legend:**
  - `* Optional Fields`

### 7-Column Grid (`msflex`)
Columns:
1. `Sl.No`: Serial line number (1, 2, 3...). Readonly.
2. `Item Code / Part No.`: Item code (`item.item_code`). Editable with incremental search dropdown (`lstItemCode`) and F5 Item Master lookup.
3. `Item/Component Name`: Component description (`item.item_name`). Readonly (auto-populated when Item Code is selected).
4. `UOM`: Unit of measurement (`item.measure_unit`). Auto-populated from item master, or editable. If new unit entered, auto-added to `measurement` master.
5. `MOQ`: Minimum Order Quantity. Editable. Defaults from previous quotation for this item/customer.
6. `Rate`: Quoted unit price in Rs. Editable. Defaults from previous quotation for this item/customer.
7. `Amount`: Line total amount in Rs (`MOQ * Rate`, formatted to `0.00`). Auto-calculated.

### Terms & Conditions Area
- Below the grid: Large text area `rtbTerms` for Quotation Terms and Conditions.
- Auto-defaults to previous quotation's terms for the selected customer (`SELECT body FROM quote WHERE cust_id = ? AND quote_id = (SELECT MAX(quote_id) FROM quote WHERE cust_id = ?)`).

### Bottom Bar & Search
- Search: `Search Quote No.` (`txtGO`) + `Find` button (`lblGO`). Pressing Enter in `txtGO` triggers search.
- Toolbar Buttons:
  - `New`: Clears form, loads next auto-sequence Quote No, sets defaults (`optMfg = True`, current date), enables Save, disables Modify/Delete.
  - `Save`: Validates header & grid lines, confirms `Are You Sure To Save ?`, persists to `quote` and `quote_sub`, reloads saved quote.
  - `Modify`: Validates, confirms `Are You Sure To Modify ?`, updates `quote` and `quote_sub`.
  - `Delete`: Confirms `Are You Sure To Delete`, removes quote and its items from `quote` and `quote_sub`.
  - Navigation: `|<< First`, `<< Prev`, `>> Next`, `>>| Last`.
  - `Printer`: Opens print view.
  - `Close`: Closes Quotation window.

---

## 2. Business Rules & Validations (from Bytecode Reverse Engineering)

1. **Customer Validation:**
   - Must select customer: `If cmbCust.ListIndex = -1 Then MsgBox "Please Select a Customer....."`
2. **Quotation Number Validation:**
   - Must not be empty: `If Trim(txtQuoteNo) = "" Then MsgBox "Enter the Quotation Number..... "`
   - Duplicate check: Quote number cannot already exist in current financial year (where QuoteId <> current QuoteId):
     `MsgBox " A Record with same Quotation No. already exist..."`
3. **Grid Items Validation:**
   - At least 1 item required: `If Rows = 1 Then MsgBox "Please Enter the item details by clicking the grid heading..."`
   - For each row:
     - Part No. cannot be empty: `MsgBox "Enter a Valid Part No. for the SlNo." & slNo`
     - Part No. must exist in `item` table: `MsgBox "Item does not exist ... Press F5 Key to Add New Items!!!"`
     - Component Name cannot be empty: `MsgBox "Enter Item/Component Name for the SlNo. " & slNo`
     - UOM cannot be empty: `MsgBox "Enter a Valid 'Unit Of Measurements' 'UOM' in short Form \r\n eg., Kg for Kilograms, Nos for Numbers etc.\r\n for the SlNo." & slNo`
     - MOQ must be > 0: `MsgBox "Enter the Valid Minimum Order Qty ..... "`
     - Rate must be > 0: `MsgBox "Enter the Valid Rate "`
4. **Total Value Validation:**
   - Total quote value must be > 0: `If Val(txtTotVal) = 0 Then MsgBox "Enter a Valid Quotation Value ....."`
5. **Intelligent Previous Rate & MOQ Lookup:**
   - On selecting an item:
     1. Search for previous quote to *this* customer:
        `SELECT rate, moq FROM quote_sub WHERE item_id = ? AND quote_id = (SELECT MAX(quote_id) FROM quote_sub WHERE item_id = ? AND quote_id IN (SELECT quote_id FROM quote WHERE cust_id = ?))`
     2. If found, auto-fill `MOQ` and `Rate`.
     3. If not found for this customer, search across *all* customers:
        `SELECT rate, moq FROM quote_sub WHERE item_id = ? AND quote_id = (SELECT MAX(quote_id) FROM quote_sub WHERE item_id = ?)`
6. **Automatic UOM Registration:**
   - If user enters a UOM not currently in `measurement` master, it is automatically added: `INSERT INTO measurement (measure_code, measure_name) VALUES (uom, '-')`.
7. **Keyboard Ergonomics:**
   - Enter in `txtGO` triggers Find.
   - Enter on `cmbCust` moves to `cmbKindAttn`.
   - Enter on `cmbKindAttn` moves to `txtRem`.
   - Enter on `txtRem` moves to `txtQuoteNo`.
   - Enter on `txtQuoteNo` moves to `txtRefEnqNo`.
   - Enter on `txtRefEnqNo` moves to Grid line 1.
   - In Grid: Enter on Col 1 (Item Code) moves to Col 4 (MOQ) (Col 2 & 3 are auto-filled).
   - Enter on Col 4 (MOQ) moves to Col 5 (Rate).
   - Enter on Col 5 (Rate) updates Amount (`MOQ * Rate`), and moves to next line (creates a new line if on the last row).
   - F5 key opens Item Master.
   - End key triggers Close.
