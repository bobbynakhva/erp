# Internal Work Order cum Material Issue Specification (`frmProdnWOIssue`)

## 1. Overview
The Internal Work Order cum Material Issue module allows production managers to issue materials/components out of a raw material store into a production/assembly cost center, specifying the expected finished/in-process item to be produced.

- **Legacy VB6 Form**: `frmProdnWOIssue`
- **Database Tables**:
  - `prodn_iwo_iss`: Header record (factory_id, year_label, dc_id, dc_no, dc_date, to_whom, dc_rem, cost_cntr_id, store_id, cust_id, po_no, po_date, store_iss_id).
  - `prodn_iwo_iss_sub`: Line items containing OUT items (slno integer) and expected IN items (slno + 0.01) with balance tracking (`bal_qty`).
  - `store_iss` & `store_iss_sub`: Material store issue debit tracking lot allocation and reducing `store_add_sub.bal_qty`.

---

## 2. Numbering Scheme
The work order number format follows:
`NextNo /YY-YY` (e.g. `1 /26-27`), calculated within the financial year window (April 1 to March 31).

---

## 3. Stock Movement & Integrity
- When saving an IWO, raw material inventory is issued from the selected store:
  - Deducts `store_add_sub.bal_qty` in FIFO receipt order.
  - Generates `store_iss` and `store_iss_sub` records with transaction trace lot tracking (`trak`).
- Stores both OUT item and IN item pairs in `prodn_iwo_iss_sub`:
  - OUT line: `slno` (e.g. 1.00), `item_id_out`, `qty_out`.
  - IN line: `slno + 0.01` (e.g. 1.01), `item_id`, `qty`, `bal_qty` (initially equal to `qty`).
- As Produced Material Returns (`frmProdnWOReturn`) are received against the work order, `bal_qty` is decreased.
- If `bal_qty <> qty`, subsequent transactions have occurred, blocking modification or deletion.

---

## 4. Exact Legacy VB6 Validations
1. Missing DC Number:
   `"Enter the Internal Work Order Cum ISSUE Number..."`
2. Missing Store:
   `"Please Select a Store from the list"`
3. Empty Grid / Missing Items:
   `"Please Enter the item details by clicking the grid heading....."`
4. Incomplete First Row:
   `"First Row of the Int.Work Order should be filled completely ( slNo. 1 )!!!"`
5. Missing / Closed Cost Center:
   `"Please Select an existing CostCenter...."`
6. Missing OUT Item Code:
   `"Enter Incomplete 'Item Code/Part No. - OUT' for the SlNo. " + slno`
7. Invalid OUT Item Code:
   `"Enter valid 'Item Code/Part No. - OUT' for the SlNo. " + slno`
8. Invalid OUT Quantity:
   `"Enter valid 'Item Code/Part No. - OUT' Quantity for the SlNo. " + slno`
9. Out Quantity Exceeds Stock:
   `"Qty should not Exceed the Stock Qty for the SlNo. " + slno`
10. Duplicate DC No:
    `" A Record with same Int.Work Order NO. already exists ..."`
11. Save Confirmation:
    `"Are You Sure To Save?"`
12. Save Success:
    `"Record Saved"`
13. Modify Blocked by Downstream Transactions:
    `"You cannot Modify this Internal work order cum Material Issue , since further Transactions has been made already in this regard !!!"`
14. Modify Confirmation:
    `"Are You Sure To Modify ?"`
15. Modify Success:
    `"Record Modified ."`
16. Delete Blocked by Downstream Transactions:
    `"You cannot delete this Internal work Order cum Material Issue , since further Transactions has been made already in this regard!!!"`
17. Delete Confirmation:
    `"Are You Sure To Delete"`
18. Delete Success:
    `"Record Deleted Successfully."`
19. Print with No Data:
    `"No data to Print..."`

---

## 5. API Endpoints
- `GET /api/iwo`: Retrieves active stores, customers, whom datalist, cost centers, active items, stock levels, and existing work order records with paired lines.
- `POST /api/iwo/save`: Validates inputs, manages stock deduction in `store_add_sub` / `store_iss_sub`, and saves/updates `prodn_iwo_iss` and `prodn_iwo_iss_sub`.
- `POST /api/iwo/delete`: Checks downstream references (`bal_qty == qty`), prompts confirmation, and removes the work order.
- `GET /api/print?type=iwo&id=<id>`: Renders printable Internal Work Order Cum Material Issue sheet with header details, items OUT and expected items IN.
