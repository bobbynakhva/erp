# Produced Material Return Note Specification (`frmProdnWOReturn`)

## 1. Overview
The Produced Material Return Note module records finished or semi-finished goods returned from the shop floor against previously issued Internal Work Orders (`frmProdnWOIssue`). Returned materials are deposited into a specified receiving store (temporary store addition) and reduce the outstanding unfinished balance on the referenced internal work orders.

- **Legacy VB6 Form**: `frmProdnWOReturn`
- **Database Tables**:
  - `prodn_iwo_ret`: Return header containing `factory_id`, `year_label`, `dc_id`, `dc_no`, `dc_date`, `from_whom`, `ref_dc_no`, `ref_dc_date`, `dc_rem`, `cost_cntr_id`, `store_id`, `tmp_store_add_id`, `scn_prod_id`.
  - `prodn_iwo_ret_sub`: Return lines containing `factory_id`, `year_label`, `dc_id`, `slno`, `item_id`, `product_id`, `qty`, `rej_qty`, `dc_row_rem`, `update_track`.
  - `store_add` & `store_add_sub`: Temporary store receipt records created when materials return to the store (`can_add = true`).
  - `product_l`: Dynamic lookup table of product names / particulars.

---

## 2. Outstanding Balance & FIFO Allocation
- When returning items, the outstanding unfinished quantity across open work orders is computed:
  $$\text{left} = \sum_{\text{open IWO lines}} \text{bal\_qty}$$
- Returned quantity must satisfy: $0 < \text{qty} \le \text{left}$.
- On save:
  - Deducts `bal_qty` from referenced or open `prodn_iwo_iss_sub` lines in FIFO order.
  - Generates transaction tracking string `update_track` (e.g. `dc_id_1,qty_1,dc_id_2,qty_2`) to allow accurate restoration on modification or deletion.
  - Adds received good quantity ($\text{qty} - \text{rej\_qty}$) into `store_add_sub` for the receiving store.

---

## 3. Downstream Integrity Locks
- If a Store Credit Note - Production (`frmProdnStoreCrNote`) has already been raised (`scn_prod_id > 0`), deletion is strictly blocked:
  `"Deletion not allowed , since Store Credit Note  already raised for this GRN!!!"`
- If material from the temporary store receipt has been issued downstream (`store_add_sub.bal_qty <> qty`):
  - Modification is blocked:
    `"Modification is not Allowed, Since Some material has been issued  after receiving this challan: " + dc_no`
  - Deletion is blocked:
    `"Deletion is not Allowed, Since Some material has been issued  after receiving this challan: " + dc_no`

---

## 4. Exact Legacy VB6 Validations
1. Missing Return Note No:
   `"Enter the Production-Material Return  Number..... "`
2. Missing Store:
   `"Please Select a Store from the list"`
3. Empty Grid / Missing Items:
   `"Please Enter the item details by clicking the grid heading....."`
4. Invalid Item Code:
   `"Select Valid Item Code/Part No. for the SlNo."`
5. Missing Particulars:
   `"Enter Particulars for the SlNo. " + slno`
6. Returned Quantity Exceeds Outstanding Balance:
   `"Qty should be greater than zero and less than  " + left`
7. Duplicate Return Note No:
   - Save: `" A Record with same Material Return NO. already exist..."`
   - Modify: `" A Record with same Production - Material Return Note NO. already exist..."`
8. Save Confirmation:
   `"Are You Sure To Save?"`
9. Save Success:
   `"Record Saved ."`
10. Modify Confirmation:
    `"Are You Sure To Modify ?"`
11. Modify Success:
    `"Record Modified ."`
12. Delete Confirmation:
    `"Are You Sure To Delete"`
13. Delete Success:
    `"Record Deleted Successfully."`

---

## 5. API Endpoints
- `GET /api/iwo-return`: Returns receiving stores (`can_add = true`), returners datalist, cost centers, open work order reference numbers with outstanding balances, and historical return records.
- `POST /api/iwo-return/save`: Validates return quantities against open work order balances, updates work order balances via FIFO tracking, creates temporary store receipt, and saves return header and detail lines.
- `POST /api/iwo-return/delete`: Reverts work order balances using stored `update_track`, removes temporary store receipts, and deletes return record.
