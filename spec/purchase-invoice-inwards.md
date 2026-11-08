# Specification: Invoice (Inwards) / Purchase Bills (`frmInvoicePurch`)

## 1. Visual Structure & Layout
- **Screenshot:** [SCREENSHOTS/PURCHASE/005_invoice_inwards.png](file:///f:/the%20coder%20copu/SCREENSHOTS/PURCHASE/005_invoice_inwards.png)
- **Legacy Form:** `frmInvoicePurch` (decompiled bytecode: `vbdec/66681143.txt`, `vbdec/1990605227.txt`, `vbdec/1576386714.txt`, `vbdec/1745918342.txt`, `vbdec/459368859.txt`, `vbdec/962984259.txt`, `vbdec/1472126348.txt`, `vbdec/1588940135.txt`, `vbdec/757901259.txt`).
- **Menu Route:** `Purchase -> Invoice Inwards`

### Header Controls
- **Top Row Right:**
  - `Correspondences (1/10)` link button (`lblCorres`).
- **Left Panel ("Vendor Details"):**
  - `From Vendor` (`cmbVendor`): Select vendor. In `New` mode, lists vendors who have uninvoiced GRNs (`invno IS NULL OR invno = '' OR invno = 'Nil'`). In Browse mode, lists all vendors who have purchase bills.
  - `* From Party Other than Consignee (Vendor)` (`cmbAltVendor`): Optional consignor/alternate vendor.
  - `DC No Ctrl + Left Mouse Button` (`lstDcNo`): Multi-select listbox showing all uninvoiced Delivery Challans (GRNs) for the selected vendor (`WHERE vendorCode = ? AND invno IS NULL AND scnpurchid > 0 AND purchid IN (SELECT purchid FROM purchasesub WHERE accpqty > 0)`).
  - `* Remarks` (`txtInvRem`): Multi-line remarks text area.
  - `Post Process--> [Credit Note]` (`lblCreditNote`): Opens Debit/Credit Note module (`frmDbCrNote`) with mode `'PURCH'`.
  - Legend: `* Optional Fields`.
- **Right Panel:**
  - `Invoice No` (`txtInvNo`): Textbox for Vendor's tax invoice number.
  - `Invoice Date` (`dtpInvDate`): Date picker.
  - `* Payment Terms` (`txtPayTerm`): Textbox (e.g. 30 Days, Immediate).
  - `* Packing _ Forwarding @` (`txtPackForwd`): Textbox for P&F percentage (`%`).
  - `* Insurance @` (`txtInsurance`): Textbox for Insurance percentage (`%`).
  - `* Any Other Charges` (`txtOtherChrg`): Textbox for additional charges in rupees (`Rs`).
  - Radio options: `(•) VAT` (`optVAT`) / `( ) CST` (`optCST`).
  - `Total Invoice Value` (`txtTotVal`): Calculated total invoice amount in Rupees `(In Rs)`.
  - `Currency` (`cmbCurrName`): Currency dropdown (Rupees, USD, etc.).

### 11-Column Grid (`msflex`)
Columns:
1. `DcNo`: Delivery Challan No from GRN (`purchase.dcno`). Readonly.
2. `SlNo`: Line number within the DC (`purchase_sub.slno`). Readonly.
3. `Particulars`: Item code and name (`item.item_code + " " + item.item_name`). Readonly.
4. `Qty`: Accepted quantity from SCN (`purchase_sub.accpqty`). Readonly.
5. `Rate`: Unit rate in Rupees (`purchase_sub.rate`). Editable. Defaults from PO.
6. `Disc%`: Discount percentage (`purchase_sub.discount`). Editable. Defaults from PO.
7. `Excise%`: Central Excise Duty % (`purchase_sub.excise`). Editable. Defaults from vendor history or item master.
8. `ED.Cess%`: Education Cess on Excise % (`purchase_sub.cessoned`). Editable (typically 2%).
9. `H.ED.Cess%`: Higher Education Cess on Excise % (`purchase_sub.highcessoned`). Editable (typically 1%).
10. `Tax%`: VAT or CST tax percentage (`purchase_sub.taxes`). Editable.
11. `Amount`: Net row total amount. Readonly (auto-calculated).

### Calculation Logic (Pre-GST Indian Central Excise & VAT/CST)
1. **Item Base Amount:**
   `ItemBase = (Qty * Rate) - ((Qty * Rate) * (Disc% / 100))`
2. **Assessable Value (with P&F):**
   `AssessableVal = ItemBase + (ItemBase * PackForwd% / 100)`
3. **Central Excise Duty:**
   `ExciseAmt = AssessableVal * (Excise% / 100)`
4. **Education Cess (on Excise Duty):**
   `EDCessAmt = ExciseAmt * (EDCess% / 100)`
5. **Higher Education Cess (on Excise Duty):**
   `HEDCessAmt = ExciseAmt * (HEDCess% / 100)`
6. **Total Excise Duties:**
   `TotalExcise = ExciseAmt + EDCessAmt + HEDCessAmt`
7. **Taxable Base for VAT / CST:**
   `TaxableBase = AssessableVal + TotalExcise`
8. **Sales Tax / VAT / CST:**
   `TaxAmt = TaxableBase * (Tax% / 100)`
9. **Row Amount (Column 11):**
   `RowAmount = TaxableBase + TaxAmt`
10. **Total Invoice Value:**
    `TotalItemBase = Sum(ItemBase across all rows)`
    `InsuranceAmt = TotalItemBase * (Insurance% / 100)`
    `TotalInvoiceValue = Sum(RowAmount across all rows) + InsuranceAmt + Val(OtherCharges)`

### Bottom Bar & Navigation
- Labels: `ITEM: [code - name]` | `UOM: [measure_unit]`
- Search: `Search Inv. No.` (`txtGO`) + `Find` button (`lblGO`).
- Toolbar:
  - `New`: Clears form, loads uninvoiced vendors.
  - `Save`: Validates and commits invoice inwards.
  - `Delete`: Checks if cash flow or material issue has taken place; deletes/clears invoice.
  - Navigation: `|<< First`, `<< Prev`, `>> Next`, `>>| Last`.
  - `EOU`: Export Oriented Unit details (allowed only when 1 GRN is selected).
  - `Close`: Exits the window.

## 2. Validation & Business Logic
1. **Vendor Required:** `Select a vendor Name.....`
2. **Invoice Number Required:** `Enter the Invoice Number .....`
3. **At Least One DC Selected:** `Select atleast One DC..... `
4. **Currency Required:** `Please Select an existing Currency Name....`
5. **Valid Total Invoice Value:** `Enter a Valid Invoice Value .....`
6. **Duplicate Invoice Number:**
   `Invoice Number already exists...` checked per vendor: `WHERE invno = ? AND vendorcode = ? AND purchid <> ?`
7. **Modification Locked:**
   `Modification not allowed in this Context, Since some cash flow has been made!!!` (if `totval <> balance`).
8. **Deletion Restrictions:**
   - If `totval <> balance`: `Deletion not allowed , since some Cash Flow has been made in this Regard!!!`
   - If material has been issued out of `store_add`: `Deletion not Allowed, Since Some material has been issued in this Bill Regard!!!`
