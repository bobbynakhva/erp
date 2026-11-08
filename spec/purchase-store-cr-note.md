# Store Credit Note - Purchase (SCN)

Purchase → Store Credit Note - Purchase. Form `frmPurchStoreCrNote`. Year database (`Get_Connection`). Right key `mnuPurchStoreCrNote`. Photograph `SCREENSHOTS/PURCHASE/004_store_credit_note.png`. Title `Purchase - Store Credit Note`.

## What is on the screen

The Store Credit Note (Purchase) inspection screen inspects materials received via Goods Received Note (GRN) into a temporary/holding inspection store (`tmpstoreid`), records accepted and rejected quantities, logs rejection remarks, tracks rework/rejections against the original Purchase Order if re-tracking is enabled, transfers accepted stock into the permanent production/warehouse store (`storeid`), and deducts received goods from the inspection store.

### Header Fields & Controls
- **Store Credit Note No.**: `txtId` numeric sequential identifier:
  - If no prior records exist (`SELECT COUNT(*) FROM Purchase WHERE SCNPurchId > 0` = 0), defaults to `1`.
  - Otherwise `SELECT MAX(SCNPurchId) + 1 FROM Purchase`.
- **Date**: `dtpSCNPurchDate` date-time picker defaulting to current system date.
- **Purchase GRN No.**: `cmbPurchGRNId` combobox / autocomplete populated with pending GRNs:
  `SELECT PurchId FROM Purchase WHERE SCNPurchId = 0 AND InvNo IS NULL ORDER BY PurchId DESC`.
- **GRN Detail Card (`lblPurchGRNDetail`)**:
  Multi-line info box automatically populated when a GRN is selected:
  ```text
  GRN Date: {GRNDate}
  Vendor: {VendorName}
  DC No.: {DCNo}
  DC Date: {DCDate}
  ```
- **Source Store (Store to Reduce Stock)**: `cmbSourceStore` combobox populated with `SELECT * FROM Stores`.
  Auto-selected from `Purchase.tmpStoreId` of the selected GRN.
- **Destination Store (Store to Add Stock)**: `cmbDestStore` combobox populated with `SELECT * FROM Stores WHERE canadd = true`.
  Default store pre-selected from `StoreMap WHERE frmname = 'frmPurchStoreCrNote'` (or first available destination store).
- **Cost Center**: `cmbCostCntr` combobox populated with `SELECT * FROM CostCenter WHERE isclosed = false ORDER BY CostCntr`.
  Auto-selected from `Purchase.CostCntrId`.
- **Prepared By**: `txtPrepared` optional textbox for inspector / storekeeper name.
- **Remarks**: `txtRemAny` optional textbox for general inspection / credit note remarks.
- **Search SCN No. / GO**: `txtGO` and `lblGO` jump button to navigate directly to an existing SCN number.
- **Action Toolbar**: `New`, `Save`, `Modify`, `Delete`, `|<<` (First), `<<` (Previous), `>>` (Next), `>>|` (Last), `Printer`, `Close`.

---

### Detail Grid (`msflex`)
Columns (10 columns):
1. `Sl.No` (Col 0) - Line number (1-based integer).
2. `Item Code / Part No.` (Col 1) - `Item.ItemCode` (read-only).
3. `Item Name` (Col 2) - `Item.ItemName` (read-only).
4. `Qty D.N` (Col 3) - `PurchaseSub.DNQty` formatted `0.00` (delivery challan quantity dispatched by vendor).
5. `Qty Recd.` (Col 4) - `PurchaseSub.Qty` formatted `0.00` (actual quantity received at gate/GRN).
6. `Qty Accp.` (Col 5) - Editable numeric quantity accepted after inspection. Formatted `0.00`.
   - On change, recalculates: $\text{Qty Rej.} = \max(0, \text{Qty Recd.} - \text{Qty Accp.})$.
   - Updates `Qty. ToStock` = $\text{Qty Accp.}$.
7. `Qty Rej.` (Col 6) - Editable numeric quantity rejected. Formatted `0.00`.
   - On change, recalculates: $\text{Qty Accp.} = \max(0, \text{Qty Recd.} - \text{Qty Rej.})$.
   - Updates `Qty. ToStock` = $\text{Qty Accp.}$.
8. `Remarks` (Col 7) - Editable text for rejection reason / rework notes (`PurchaseSub.RejRowRem`).
9. `Qty. ToStock` (Col 8) - Converted stocking quantity transferred into permanent inventory (`PurchaseSub.QtyConv` / `StkQty`), equal to accepted quantity in stock UOM.
10. `Current Stk.Qty` (Col 9) - Live stock balance of the item currently available in the Source Store (`StoreAddSub.balqty` for `storeid = tmpStoreId`).

---

## Business Logic & Save Pipeline

### 1. Pre-Save Validations
1. **Valid GRN Number**: Must select a valid GRN (`"Not a Valid GRN Number..."`).
2. **Source Store Selection**: Must select source store (`"Please Select a Store from which the Stock is to be Reduced"`).
3. **Destination Store Selection**: Must select destination store (`"Please Select a Store to which the stock is to be Added"`).
4. **Distinct Stores**: Source store and destination store must not be identical (`"Both Stores should not be the same ... "`).
5. **Item Presence**: Detail grid must have at least 1 valid line item (`"Part No./ Items"` / `"Please Enter the ItemName/Item details by clicking the grid heading..."`).
6. **Non-Zero Quantity**: For every item line, $\text{Qty Accp.} + \text{Qty Rej.}$ cannot be zero (`"Both Accepted Qty and Rejected Qty should not be Zero... "`).
7. **Balanced Quantities**: For every item line, $\text{Qty Accp.} + \text{Qty Rej.} = \text{Qty Recd.}$.
8. **Confirmation**: Modal confirm prompt: `"Are You Sure To Save?"`.

### 2. Transaction Execution (Atomic)
All database modifications run in a single PostgreSQL transaction:
1. **Purchase Header Update**:
   Update `purchase` where `purchid = {GRN_PurchId}`:
   - `scnpurchid = {txtId}`
   - `scnpurchdate = {dtpSCNPurchDate}`
   - `prepby = {txtPrepared}`
   - `remany = {txtRemAny}`
   - `storeid = {cmbDestStore}`
2. **Purchase Line Items Update**:
   For each item row in the grid, update `purchase_sub` where `purchid = {GRN_PurchId} AND slno = {row.SlNo}`:
   - `accpqty = {row.QtyAccp}`
   - `rejqty = {row.QtyRej}`
   - `rejrowrem = {row.Remarks}`
   - `stkqty = {row.QtyToStock}`
   - `qtyconv = {row.QtyToStock}`
3. **Rejection Re-tracking to PO**:
   If the parent PO has `re_trk_rej = true` and `is_open_po = false`:
   - If rejected quantity > 0, track rejections against PO line items for replacement delivery.
4. **Inventory Issue from Source Inspection Store (`tmpstoreid`)**:
   - Create entry in `store_iss`:
     `id` (next auto ID), `doi = {dtpSCNPurchDate}`, `ti = 'SCN'`, `cost_cntr_id = {cmbCostCntr}`, `store_id = {tmpstoreid}`, `prep_by = {txtPrepared}`, `rem_any = {txtRemAny}`, `ts = 2`.
   - Update `purchase.storeissid = {store_iss.id}`.
   - For each item line, insert into `store_iss_sub`:
     `id = {store_iss.id}`, `slno = {row.SlNo}`, `item_id = {row.item_id}`, `qty = {row.QtyRecd}`, `iss_qty = {row.QtyRecd}`, `trak = {tmpstoreaddid}`.
   - Deduct `bal_qty` in `store_add_sub` for the inward GRN record (`tmpstoreaddid`).
5. **Inventory Addition to Destination Store (`storeid`)**:
   - Create entry in `store_add`:
     `id` (next auto ID), `doa = {dtpSCNPurchDate}`, `ts = '2'`, `cost_cntr_id = {cmbCostCntr}`, `store_id = {cmbDestStore}`, `prep_by = {txtPrepared}`, `rem_any = {txtRemAny}`.
   - Update `purchase.storeaddid = {store_add.id}`.
   - For each item line where accepted quantity > 0:
     Insert into `store_add_sub`:
     `id = {store_add.id}`, `slno = {row.SlNo}`, `item_id = {row.item_id}`, `qty = {row.QtyToStock}`, `bal_qty = {row.QtyToStock}`, `rate = {rate}`.
6. **Completion**:
   Show `"Record Saved"` alert and display the saved SCN.

---

## Modify & Delete Rules

### Modify Reversal
1. Restore deducted `bal_qty` in source store (`tmpstoreaddid`) and delete `store_iss` / `store_iss_sub` records.
2. Remove added stock from destination store (`store_add` / `store_add_sub`).
3. If PO rejection re-tracking was applied, revert PO tracked quantities.
4. Re-apply updated Store Credit Note using the Save pipeline.

### Delete
1. Revert inventory additions (`store_add` / `store_add_sub`).
2. Revert inventory issues (`store_iss` / `store_iss_sub`) and restore `store_add_sub.bal_qty` on the temporary GRN store.
3. If PO rejection re-tracking was applied, revert PO rejections.
4. Reset `purchase` header: `UPDATE purchase SET scnpurchid = 0, prepby = ' ', remany = ' ', storeid = 0, storeissid = NULL, storeaddid = NULL WHERE purchid = {GRN_PurchId}`.
5. Reset `purchase_sub` lines: `UPDATE purchase_sub SET accpqty = 0, rejqty = 0, rejrowrem = ' ', stkqty = 0, qtyconv = 0 WHERE purchid = {GRN_PurchId}`.
