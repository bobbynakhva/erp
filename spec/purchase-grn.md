# Goods Received Note (GRN)

Purchase → Goods Received Note. Form `frmPurchaseGRN`. Year database (`Get_Connection`). Right key `mnuPurchBills`. Photograph `SCREENSHOTS/PURCHASE/003_goods_received_note.png`. Title `Purchase - Goods Received Note`.

## What is on the screen

The form records incoming vendor materials, updates Purchase and PurchaseSub records, adjusts open PO remaining quantities (`PurchPOSub.QtyToReci`), logs transaction tracking into `PurchPOTrack`, and posts inventory inward into `StoreAdd` and `StoreAddSub`.

### Header Fields & Controls
- **Purchase GRN No.**: `PurchId` numeric sequential auto-increment (`SELECT MAX(PurchId) FROM Purchase` + 1, starting at 1).
- **GRN Date & Time**: `dtpGRNdate` date-time picker defaulting to current system date and time.
- **Vendor Details (Left Box)**:
  - **From Vendor**: `cmbVendor` dropdown populated with `SELECT * FROM Vendor WHERE inactive=0 ORDER BY VendorName`.
  - **Cost Center**: `* Cost Center` (`cmbCostCntr`) dropdown from `SELECT * FROM CostCenter WHERE isclosed=false ORDER BY CostCntr` (optional field).
  - **Mode of Transport**: `* Mode of Transport` (`txtTransport`) optional textbox.
  - **Vehicle Number**: `* Vehicle Number` (`txtVehicleNo`) optional textbox.
  - **From**: `* From` (`txtTransFrom`) optional dispatch location.
  - **To**: `* To` (`txtTransTo`) optional destination location.
- **Delivery & Document Details (Right Box)**:
  - **DC NO.**: `txtDCNo` delivery challan number and adjacent `dtpDCDate` date picker defaulting to current date.
  - **P.O NO**: `cmbPONo` dropdown populated with active purchase orders for the selected vendor:
    `SELECT PONo FROM PurchPO WHERE VendorCode={vCode} AND POTally=false AND cancl=false ORDER BY PONo`.
    Adjacent `dtpPODate` date picker displaying the selected PO date.
  - **Open PO Indicator**: `lblOpenPO` displays `"This is an Open PO."` in red if selected PO has `IsOpenPO = true`.
  - **GRN Type**: `cmbGRNType` combobox populated with `SELECT DISTINCT(GRNType) FROM Purchase WHERE GRNType IS NOT NULL ORDER BY GRNType ASC`.
  - **Remarks**: `* Remarks` (`txtRem`) optional remarks textbox.
  - **Add to Store**: `cmbStore` combobox with red label `Add to Store`, populated with `SELECT * FROM Stores WHERE canadd=true`. Default store is preselected from `StoreMap` where `frmname='frmPurchaseGRN'`.
  - **Help Notes Box**:
    `Note-->`
    `Press F5 Key ---> Item Master`
    `Press F11 Key ---> PO Details`
    `* Optional Fields`
- **Search GRN No.**: Bottom text search box with red label `Search GRN. No.` to jump directly to a GRN record.
- **Action Toolbar**: `New`, `Save`, `Modify`, `Delete`, `|<<` (First), `<<` (Previous), `>>` (Next), `>>|` (Last), `Printer`, `Close`.

---

### Detail Grid (`msflex`)
Columns (7 visible, 1 hidden by default):
1. `Sl.No` (Col 0) - Sequential line number.
2. `Item Code / Part No.` (Col 1) - Item code dropdown/autocomplete:
   - When a PO is selected: `SELECT * FROM Item WHERE ItemId IN (SELECT ItemId FROM PurchPOSub WHERE POId=(SELECT POId FROM PurchPO WHERE PONo='...')) AND Hide=0 ORDER BY ItemCode`.
   - When no PO exists for the vendor: `SELECT * FROM Item WHERE ItemId IN (SELECT ItemId FROM ItemSub WHERE NameId=(SELECT VendorCode FROM Vendor WHERE VendorName='...')) AND Hide=0 AND ClassId=3`. If none mapped, fallback to all active items: `SELECT * FROM Item WHERE Hide=0 ORDER BY ItemCode`.
3. `Item Name` (Col 2) - Auto-filled descriptive name.
4. `Qty D.N` (Col 3) - Delivery note quantity dispatched by vendor.
5. `Qty Recd.` (Col 4) - Actual quantity received at inspection / gate.
6. `Qty Rej.` (Col 5) - Quantity rejected (hidden ColWidth=0 by default unless rejection rework is enabled).
7. `Qty. ToStock` (Col 6) - Quantity accepted and added into inventory:
   $$\text{Qty. ToStock} = \text{Qty Recd.} - \text{Qty Rej.}$$
8. `PO Bal.Qty` (Col 7) - Remaining unfulfilled balance on the Purchase Order for this item (`SELECT SUM(QtyToReci) FROM PurchPOSub WHERE ItemId=... AND POId=...`). If Open PO, displays 0.

---

## Business Logic & Save Pipeline

### 1. Pre-Save Validations
1. **Required Fields**:
   - Vendor must be selected.
   - Delivery Challan Number (`DCNo`) is mandatory.
   - Store (`Add to Store`) must be selected.
   - PO selection is required if the vendor has active POs: `"check 'YOUR ORDER NO' i.e Purchase order ..."`.
   - At least 1 item with positive `Qty Recd` must be present.
2. **Duplicate Invoice / DC Detection**:
   Checks if a record with the same Vendor and DC Number already exists in the financial year:
   `SELECT * FROM Purchase WHERE VendorCode={vCode} AND DCNo='...' AND PurchId <> {currentPurchId}`
   If found: `"A Record with same Invoice Number/DC Number already exists ..."`.
3. **Confirmation**:
   Prompts: `"Are You Sure To Save?"`.

### 2. Transaction Execution (Atomic)
All database updates must execute within a single transaction:
1. **Purchase Header**: Insert/Update into `Purchase`:
   - `PurchId`, `GRNDate`, `VendorCode`, `DCNo`, `DCDateT`, `PONo`, `PODate`, `PODateT`, `Transport`, `VehicleNo`, `TransFrom`, `TransTo`, `Remark`, `RecDate`, `NoOfItems`, `RejRem`, `CostCntrId`, `GRNType`, `tmpStoreId`, `tmpStoreAddId`.
2. **Purchase Line Items**: Insert into `PurchaseSub`:
   - `PurchId`, `SlNo`, `CategoryCode`, `ItemId`, `tmpStkQty` (`Qty. ToStock`), `DNQty`, `Qty` (`Qty Recd.`), `RejQty`, `RewQty` (0), `RejRowRem` (' ').
3. **PO Balance Reduction & Tracking**:
   If a closed/standard PO is associated:
   - For each item received, fetch `PurchPOSub` rows where `ItemId = {item}` and `POId = {poid}` and `QtyToReci > 0` ordered by `SlNo`.
   - Deduct `Qty. ToStock` from `PurchPOSub.QtyToReci` sequentially.
   - For each deduction, insert a tracking entry in `PurchPOTrack`:
     `PurchId`, `POId`, `SlNo`, `ItemId`, `QtyReduced`.
   - If all items in `PurchPOSub` have `QtyToReci = 0`, update `PurchPO.POTally = true`.
4. **Inventory Inward Integration**:
   - Create header record in `StoreAdd`:
     `Id` (next auto ID), `DOA` (current timestamp), `TS` = 2 (Transaction Source: GRN), `CostCntrId`, `StoreId`, `PrepBy` (Vendor Name), `RemAny` (' ').
   - Update `Purchase.tmpStoreAddId = {StoreAdd.Id}`.
   - For each item row, insert into `StoreAddSub`:
     `Id`, `SlNo`, `ItemId`, `Qty` (`Qty. ToStock`), `balQty` (`Qty. ToStock`), `Rate` (unit rate retrieved from PO).

---

## Modify & Delete Rules

### Modify Reversal
When modifying an existing GRN:
1. Revert PO balances: Read `PurchPOTrack` for the GRN, add back `QtyReduced` to `PurchPOSub.QtyToReci`, reset `PurchPO.POTally = false`, and delete tracking entries from `PurchPOTrack`.
2. Revert inventory inward: Delete rows from `StoreAddSub` where `Id = {tmpStoreAddId}`, then delete header from `StoreAdd`.
3. Delete old `PurchaseSub` lines.
4. Re-apply the updated GRN header, lines, PO reductions, tracking, and inward inventory records.

### Delete Safeguards
Before deleting a GRN:
1. **Store Credit Note Check**:
   `SELECT * FROM Purchase WHERE SCNPurchId > 0 AND PurchId = {PurchId}`
   If found: `"Deletion not allowed , since Store Credit Note already raised for this GRN!!!"`.
2. **Purchase Invoice Check**:
   `SELECT * FROM Purchase WHERE PurchId = {PurchId} AND InvNo IS NOT NULL AND InvNo <> 'nil'`
   If found: `"Deletion not allowed , since Invoice is made already with this DC!!!"`.
3. **Confirmation**:
   Prompts `"Are You Sure To Delete ?"`.
4. **Execution**:
   Revert PO balances and delete `PurchPOTrack`, delete inward inventory from `StoreAddSub` and `StoreAdd`, delete `PurchaseSub`, and finally delete `Purchase` header.
