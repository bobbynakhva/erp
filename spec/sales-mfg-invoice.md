# Sales / Labour -> Manufacturing -> Invoice (`frmInvoice`) Specification

## 1. Overview & Window Identity
- **Form Name**: `frmInvoice`
- **Window Title**: `Invoice`
- **Menu Path**: `Sales / Labour -> Manufacturing -> Invoice`
- **Screenshot**: `SCREENSHOTS/SALES_LABOUR/Manufacturing/003_invoice.png`
- **Database Tables**: `dcinv`, `dcinvsub`
- **Linked Modules**:
  - Upstream: Delivery Challan (`frmDC`) via `dcinv`
  - Inwards PO: `mfgpo` / `mfgposub`
  - Customer Master: `customer`
  - Currency Master: `currency_type`, `currency_today`
  - Debit Note: `frmCrDbNote`

---

## 2. UI Layout & Controls

### Top Bar & Headers
- Title: **Invoice**
- Top Right Link: `Correspondences (0/0)` (calls `/api/corres/count?for=Invoice&ref=...`)

### Left Panel: "Select Customer & D.C. No."
- **To Customer**: `<select>` dropdown (`cmbCust`)
  - In `New` mode: loads customers with un-invoiced Delivery Challans (`WHERE invno IS NULL`)
  - In `View` / `Modify`: loads all customers who have invoices (`WHERE invno IS NOT NULL`)
- **\* To Party Other than Consignee (Customer)**: `<select>` dropdown (`cmbAltCust`)
  - Optional dropdown of all customers in the database.
- **DC No `Ctrl + Left Mouse Button`**: `<select multiple>` / listbox (`lstDcNo`)
  - Lists open DCs for the selected customer: `SELECT dcinvid, dcno FROM dcinv WHERE custid = $1 AND invno IS NULL ORDER BY dcno DESC`.
  - Multi-select enabled (can select one or more DCs for single consolidated Invoice).
  - Clicking/selecting DC(s) auto-populates the item grid from `dcinvsub`!
- **\* Remarks**: `<input type="text">` / `<textarea>` (`txtInvRem`)
- Button: `[ Debit Note ]` (Post Process--->)
- Footer text: `* Optional Fields`

### Right Panel: "Auto Running No. & Tax Details"
- **Invoice No**: `<input type="text">` (`txtInvNo`) - editable / auto-running suggested number.
- **Invoice Date & Time**: Date picker with timestamp (`dtpInvDate`).
- **\* Payment Terms**: `<input type="text">` (`txtPayTerm`)
- **\* P & F @**: `<input type="number"> %` (OR) `<input type="number"> (In Rs)` (`txtPackForwd`, `txtPackForwardInRs`)
- **Exc Duty @**: `<input type="number"> %` (`txtExcise`)
- **\* Cess On ED**: `<input type="number"> %` (`txtCessED`)
- **\* Higher Ed. Cess On ED**: `<input type="number"> %` (`txtHighCessED`)
- **\* CST @**: `<input type="number"> %` (`txtCST`) with checkbox `[ ] Against Form 'C'` (`chkFormC`)
- **\* SurCharge**: `<input type="number"> (In Rs)` (`txtSurchrg`) with checkbox `[ ] Form 37` (`chkForm37`)
- **\* VAT @**: `<input type="number"> %` (`txtVAT`) with checkbox `[ ] Form 'H' / No Taxes` (`chkFormH`)
- **\* Other Charges**: `<input type="number"> In Rs.` (`txtOtherChrg`)
- **Total Invoice Value**: `<input type="text" readonly>` (`txtTotVal`) in Rs. + Currency Dropdown (`cmbCurrName`)

### Middle Item Grid (`msflex`)
Columns:
1. `SlNo`: 1, 2, 3...
2. `Particulars`: Item Code & Item Name
3. `Qty`: Dispatched quantity from selected DC(s)
4. `Rate`: Unit rate (from DC or PO or Item master) - editable
5. `Discount`: Discount percentage - editable
6. `Amount`: `(Qty * Rate) * (1 - Discount / 100)`

### Bottom Action Bar & Status
- Info display: `ITEM: [code - name]`, `UOM: [unit]`
- Checkbox: `[ ] Pre-Format`
- Printer Buttons:
  - `[ Tax Invoice Printer ]`
  - `[ Exc. Invoice Printer ]`
  - `[ Exp. Invoice Printer ]`
- Center: `Search Inv. No.` `[ text box ]` `[ Find ]`
- Toolbar Buttons:
  - `[ New ]`
  - `[ Save ]`
  - `[ Delete ]`
  - `[ |<< First ]` `[ << Prev ]` `[ Next >> ]` `[ Last >>| ]`
  - `[ EOU ]`
  - `[ Close ]`

---

## 3. Business Logic & Tax Calculations

1. **Subtotal / Basic Amount**:
   $$\text{Basic} = \sum (\text{Qty} \times \text{Rate} \times (1 - \text{Discount} / 100))$$
2. **Packing & Forwarding (P&F)**:
   $$\text{PF Amt} = \begin{cases} \text{Basic} \times (\text{PF\%} / 100) & \text{if PF\%} > 0 \\ \text{PF in Rs} & \text{otherwise} \end{cases}$$
3. **Assessable Value for Excise**:
   $$\text{Assessable} = \text{Basic} + \text{PF Amt}$$
4. **Excise Duty (ED)**:
   $$\text{ED Amt} = \text{Assessable} \times (\text{Excise\%} / 100)$$
5. **Cess on ED**:
   $$\text{Cess Amt} = \text{ED Amt} \times (\text{Cess\%} / 100)$$
6. **Higher Education Cess on ED**:
   $$\text{High Cess Amt} = \text{ED Amt} \times (\text{HighCess\%} / 100)$$
7. **Tax Base for Sales Tax (CST or VAT)**:
   $$\text{Tax Base} = \text{Assessable} + \text{ED Amt} + \text{Cess Amt} + \text{High Cess Amt}$$
8. **Sales Tax (CST or VAT)**:
   $$\text{CST Amt} = \text{Tax Base} \times (\text{CST\%} / 100)$$
   $$\text{VAT Amt} = \text{Tax Base} \times (\text{VAT\%} / 100)$$
9. **Total Invoice Value**:
   $$\text{Total} = \text{Tax Base} + \text{CST Amt} + \text{VAT Amt} + \text{Surcharge} + \text{Other Charges}$$

---

## 4. Validations & Constraints

1. When clicking `New`:
   - If `COUNT(*) FROM dcinv = 0`: alert `"You cannot Create INVOICE without a DC!!!"`.
2. Mandatory Fields on Save:
   - `Select a customer Name.....`
   - `Enter the Invoice Number .....`
   - `Please Select an existing Currency Name....`
   - `Select atleast a DC..... `
   - `Enter a Valid  Invoice Value .....`
3. Duplicate Checks:
   - Within `dcinv`: `" A Record with Same Invoice No. already exists !!!"`
   - Within `dcoutgoinginv` (Labour): `" A Record with Same Invoice No. already made for SALES - Labour Work !!!"`
4. Deletion Protection:
   - If `totval <> balance`: `"Deletion not allowed , since some Cash Flow has been made in this Regard!!!"`
   - On confirm: unlinks DC records (sets `invno = null, invdate = null`), sets `dcinvsub.rate = 0, discount = 0`.
