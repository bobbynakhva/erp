# Specification: Delivery Challan Mfg (`frmDC`)

## 1. Visual Structure & Layout
- **Screenshot:** [SCREENSHOTS/SALES_LABOUR/Manufacturing/002_delivery_challan.png](file:///f:/the%20coder%20copu/SCREENSHOTS/SALES_LABOUR/Manufacturing/002_delivery_challan.png)
- **Legacy Form:** `frmDC` (decompiled bytecode: `vbdec/1022887123.txt`, `vbdec/1049939301.txt`, `vbdec/1227804744.txt`, `vbdec/1364299939.txt`, `vbdec/1381261817.txt`, `vbdec/2052268544.txt`, `vbdec/312921303.txt`, `vbdec/447209930.txt`, `vbdec/866681514.txt`).
- **Menu Route:** `Sales / Labour -> Manufacturing -> Delivery Challan`

### Header Controls
- **Window Title:** `Delevery Challan` (exact legacy spelling preserved).
- **Left Panel ("Customer Details"):**
  - `To Customer` (`cmbCust`): Dropdown of active customers (`SELECT cust_id, cust_name FROM customer WHERE COALESCE(inactive, false) = false ORDER BY cust_name`).
  - `* Cost Center` (`cmbCostCntr`): Dropdown of cost centers (`SELECT id, cost_cntr FROM costcenter ORDER BY cost_cntr`).
  - `Issue From Store` (`cmbStore`): Dropdown of stores (`SELECT store_id, store_name FROM stores ORDER BY store_name`).
  - `* Mode of Transport` (`txtTransport`): Text input.
  - `* Vehicle Number` (`txtVehicleNo`): Text input.
  - `* From` (`txtTransFrom`): Text input (defaults to factory city / origin).
  - `* To` (`txtTransTo`): Text input (auto-defaults to customer destination address).
- **Right Panel ("DC Details"):**
  - `Our DC NO.` (`txtDCNo`): Text input (auto-numbered or manual, e.g. `1` or `1 /26-27`).
  - DC Date (`dtpDCDate`): Date picker (defaults to today).
  - `Customer PO` (`cmbPONo`): Dropdown of customer's active POs from `mfgpo` (`SELECT DISTINCT pono FROM mfgpo WHERE cust_id = ? AND potally = false AND cancl = false`).
  - PO Date (`dtpPODate`): Date picker (auto-filled from selected PO).
  - `GIR NO` (`txtgirno`): Text input.
  - `[ ] Signed and Returned` (`chkDCSigned`): Checkbox (`dcsign`).
  - `* Note:(Remarks)` (`txtRem`): Text input / textarea.
  - `Open PO Indicator` (`lblOpenPO`): Displays `This is an Open PO.` if selected PO has `isopenpo = true`.
  - Links / Buttons: `Form VAT 515` (`lblForm39`), `Rejections` (`lblRejRework`).
  - Shortcut Hints:
    - `Press F5 Key ---> Item Master`
    - `Press F11 Key ---> PO Details`
    - `* Optional Fields`

### 7-Column Grid (`msflex`)
Columns:
1. `SlNo`: Serial number (1, 2, 3...). Readonly.
2. `Item Code / Part No.`: Item code (`item.item_code`). Dropdown / autocomplete from PO items or item master.
3. `Particulars`: Description / Item name (`item.item_name`). Readonly.
4. `Qty`: Dispatched quantity. Editable.
5. `Remarks`: Line remark (`dcrowrem`). Editable.
6. `Stk.Qty`: Current stock quantity in the selected store (`StoreAddsub.balqty`). Readonly.
7. `PO Bal.Qty`: Remaining quantity to send for the selected PO (`mfgposub.qty_to_send`). Readonly.

### Bottom Bar & Search
- Search: `Search DC No.` (`txtGO` in red) + Find button (`lblGO`).
- Options: `[ ] Pre-Format` (`chkPreformat`).
- Toolbar Buttons:
  - `New`: Clears form, loads next auto DC No, enables inputs.
  - `Save`: Validates header & grid, confirms `Are You Sure To Save ?`, persists to `dcinv` and `dcinvsub`, deducts store stock and PO balance, shows `Record Saved .`.
  - `Modify`: Edits existing DC.
  - `Delete`: Deletes DC and reverses stock/PO deductions.
  - Navigation: `|<< First`, `<< Prev`, `>> Next`, `>>| Last`.
  - `Printer`: Print delivery challan document.
  - `Close`: Closes delivery challan window.

---

## 2. Business Rules & Validations (from Bytecode)

1. **Customer Validation:**
   - `If cmbCust.ListIndex = -1 Then MsgBox "Please Select a Customer"`
2. **Store Validation:**
   - `If cmbStore.ListIndex = -1 Then MsgBox "Please Select a Store from the list"`
3. **DC Number Validation:**
   - `If Trim(txtDCNo) = "" Then MsgBox "Enter the DC Number "`
4. **PO Validation:**
   - If customer has active POs:
     `If cmbPONo.ListCount > 0 And cmbPONo.ListIndex = -1 Then MsgBox "You have to select a PO Number from the list..."`
5. **Cost Center Validation:**
   - `If Not isvalid_CostCenter Then MsgBox "Please Select an existing CostCenter...."`
6. **Stock & PO Balance Qty Validation:**
   - For each line item:
     - `Qty > 0` required.
     - `If Qty > StkQty Then MsgBox "In Row: " & row & " , Qty should not be greater than " & StkQty`
     - If PO is NOT an open PO:
       `If Qty > POBalQty Then MsgBox "In Row: " & row & " , Qty should not be greater than " & POBalQty`
7. **Confirmation & Stock / PO Deductions:**
   - Confirm: `Are You Sure To Save ?`
   - Updates `dcinv` (Header) and `dcinvsub` (Lines).
   - Deducts dispatched qty from `mfgposub.qty_to_send`. If balance reaches 0, sets line status / PO tally.
   - Deducts dispatched qty from store inventory.
   - Message: `Record Saved .`
