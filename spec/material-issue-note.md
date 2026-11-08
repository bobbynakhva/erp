# Specification: Material Issue Note (`frmStockIssue`)

## 1. Overview
The **Material Issue Note** module (`frmStockIssue`) manages inventory issue operations from company warehouses/stores to shop floor, departments, workers, or cost centers.
When an Issue Note is saved:
1. It records the header in `matl_iss_note` and line items in `matl_iss_note_sub`.
2. It automatically creates warehouse stock issue records in `store_iss` and `store_iss_sub`.
3. It deducts the issued quantity from `store_add_sub.bal_qty` using FIFO batch consumption.
4. When deleted or modified, stock balances are automatically restored back to `store_add_sub`.

---

## 2. Visual Layout & Controls
Matches `SCREENSHOTS/INVENTORY/002_material_issue_note.png` and bytecode `vbdec/1289785807.txt`, `419439805.txt`, `1023815114.txt`:

### Header Controls:
- **Issue No.** (`txtIssueNo`): Sequential issue identifier (e.g. `1 /26-27`).
- **Issue Date** (`dtpIssueDate`): Defaults to current date.
- **Store / Warehouse** (`cmbStore`): Dropdown of active stores with `can_issue = true`.
- **Cost Center** (`cmbCostCntr`): Optional cost center assignment.
- **To Whom** (`cmbToWhom`): Person/department receiving the material.
- **Remarks** (`txtRemark`): General issue remarks.

### FlexGrid Line Items (`msflex`):
6 Columns:
1. `Sl.No`
2. `Item Code / Part No./ Drg. No.` (`item_code`)
3. `Item/Component Name` (`item_name`)
4. `Qty` (`qty` issued)
5. `Remarks` (`remark`)
6. `Stk.Qty` (Live available stock in selected warehouse for that item)

### Toolbar Buttons:
- `New`: Clears form and loads next sequential Issue No.
- `Save`: Commits issue and deducts warehouse stock.
- `Modify`: Edits existing issue note.
- `Delete`: Prompts for confirmation, deletes issue records, and restores stock to warehouse.
- `Print`: Validates that rows exist, otherwise `"No data to Print..."`, and generates printable Material Issue Note certificate.
- Navigation (`|<`, `<`, `>`, `>|`): Move across issue records.
- `Close`: Closes window.

---

## 3. Database Schema & Tables
1. `matl_iss_note`:
   - `factory_id`: integer
   - `year_label`: text
   - `id`: integer primary key
   - `issue_no`: text
   - `issue_date`: date
   - `to_whom`: text
   - `remark`: text
   - `cost_cntr_id`: integer
   - `store_id`: integer
   - `no_of_items`: integer
   - `store_iss_id`: integer (references `store_iss.id`)

2. `matl_iss_note_sub`:
   - `factory_id`: integer
   - `year_label`: text
   - `id`: integer (references `matl_iss_note.id`)
   - `sl_no`: integer
   - `item_id`: integer
   - `qty`: double precision
   - `dc_row_rem`: text

3. `store_iss`:
   - `factory_id`: integer
   - `year_label`: text
   - `id`: integer
   - `doi`: date
   - `ti`: text (time)
   - `cost_cntr_id`: integer
   - `store_id`: integer
   - `to_whom`: text
   - `rem_any`: text

4. `store_iss_sub`:
   - `factory_id`: integer
   - `year_label`: text
   - `id`: integer
   - `slno`: integer
   - `item_id`: integer
   - `qty`: double precision
   - `store_add_sub_id`: integer
   - `rem_any`: text

---

## 4. Exact VB6 Validation Rules
1. `txtIssueNo`: `"Enter the ISSUE Number..."`
2. `cmbStore`: `"Please Select a Store from the list"`
3. Empty grid lines: `"Please Enter the ItemName/Item details by clicking the grid heading..."`
4. Missing item code: `"Enter ItemCode/Part No. for the SlNo. "`
5. Missing item name: `"Enter a Item/Component Name for the SlNo.<sl>"`
6. Invalid item code: `"Part No. does not exist ... "`
7. Invalid item name: `"Item/Component Name does not exist ... "`
8. Item code & name mismatch: `"Part No. differs for this Item ... "`
9. Quantity <= 0: `"Enter the Valid Qty  "`
10. Quantity > Stock on hand: `"Qty should not Exceed the Stock Qty for the SlNo.<sl>"`
11. Duplicate item: `"Duplication of  Part No./ Items is not allowed. SEE ROWS: <r1> and  <r2>"`
12. Duplicate Issue No.: `" A Record with same Issue NO. already exists ..."`
13. Print with no rows: `"No data to Print..."`
