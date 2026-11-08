# Purchase Order - Outgoing

Purchase → Purchase Order - Outgoing. Form `frmPurchasePO`. Year database (`Get_Connection`). Right key `mnuPurchPOout`. Photograph `SCREENSHOTS/PURCHASE/002_purchase_order-outgoing.png`. Title `PURCHASE - Purchase Order - Outgoing`.

## What is on the screen

The form header displays the document title and tracking controls for outgoing vendor purchase orders.

### Header Fields & Controls
- **Vendor**: `cmbVendor` dropdown populated with `SELECT * FROM VENDOR WHERE inactive=0 ORDER BY VendorName`.
- **Kind Attn**: `cmbKindAttn` editable combobox (max 250 characters).
- **PO No**: Prefix `txtPrefix` (read-only from `Misc.PrefixPO`) followed by `txtPOno`. In New mode, formatted as `{nextNo} / {YY}-{YY+1}` based on financial year bounds:
  `SELECT POno FROM PurchPo WHERE Poid=(SELECT MAX(Poid) FROM PurchPo WHERE POdateT BETWEEN #4/1/{startYear}# AND #3/31/{endYear} 23:59#)`.
- **PO Date**: `dtpPODate` date picker defaulting to current date.
- **PR No & PR Date**: `txtPRNO` (purchase requisition number) and `dtpPRDate` date picker.
- **Ref Quote No & Ref Quote Date**: `txtRefQuoteNo` and `dtpRefQuoteDate` date picker.
- **Validity Period**: `dtpValidFrom` and `dtpValidTo` date pickers.
- **Cost Center**: `cmbCostCntr` dropdown from `SELECT * FROM CostCenter WHERE isclosed=false ORDER BY CostCntr`.
- **Currency**: `cmbCurrName` dropdown from `SELECT * FROM currencyType WHERE currid IN (SELECT currid FROM currencyToday) ORDER BY CurrName`.
- **Checkboxes**:
  - `chkIsOpenPO`: Open Purchase Order status.
  - `chkIsSchPO`: Scheduled Purchase Order status.
  - `chkTestCert`: "Test Certificate / Warantee Card Required (if YES tick this button)".
  - `chkReTrkRej`: "Rejections Re-Tracking with this PO Required (if YES tick this button)". Default loaded from `Misc.ReTrkRejPurch`.
- **Total Purchase Value**: `txtVal` calculated grand total.
- **Currency Conversion**: `lblTodayVal` displays the current exchange rate (`Rs. {rate}`) and `lblRupees` displays converted amount (`txtVal * rate`). If currency is RUPEES, conversion display is hidden.
- **Terms & Conditions**: `rtbTerms` rich text area stored into `PurchPO.Body`.

### Detail Grid (`msflex`)
Nine columns:
1. `Sl.No` (Col 0) - Sequential 1-based line number.
2. `Item Code / Part No.` (Col 1) - Dropdown/autocomplete of items filtered by vendor:
   `SELECT * FROM Item WHERE itemid IN (SELECT ItemId FROM Itemsub WHERE nameid=(SELECT vendorcode FROM vendor WHERE Vendorname='...') AND Hide=0 AND classId=3)`.
   If no vendor items are mapped, falls back to: `SELECT * FROM Item WHERE Hide=0 ORDER BY ItemCode`.
3. `Item / Part Name` (Col 2) - Read-only item description populated on item selection.
4. `UOM` (Col 3) - Unit of measurement dropdown from `SELECT Measurecode FROM Measurement ORDER BY Measurecode`.
5. `Qty` (Col 4) - Numeric order quantity.
6. `Rate` (Col 5) - Unit rate.
7. `Disc %` (Col 6) - Line discount percentage.
8. `Due Date` (Col 7) - Scheduled delivery due date.
9. `Current Stk.Qty` (Col 8) - Current stock quantity on hand retrieved from `StoreAddSUB` (informational, not persisted in PO sub-table).

### Calculations
Line Net Amount:
$$\text{Line Net} = (\text{Qty} \times \text{Rate}) - \left(\frac{\text{Qty} \times \text{Rate} \times \text{Disc}}{100}\right)$$
Total Value `txtVal` is the sum of Line Net amounts formatted as `0.00`.

## Save and Validations
1. **Vendor Selection**: If no vendor selected: `"Please Select a VENDOR....."`.
2. **PO Number**: If PO number is blank: `"Enter the Purchase Order Number..... "`.
3. **Cost Center**: If cost center is invalid or unselected: `"Please Select an existing CostCenter...."`.
4. **Currency**: If currency is unselected: `"Please Select an existing Currency Name...."`.
5. **Item Validation**: If not a scheduled PO (`chkIsSchPO` is false), at least one line with valid item and quantity > 0 must exist.
6. **Duplicate PO**: On Insert, checks if `PONo` already exists within current financial year bounds.
7. **Lock on Changed Status**: When modifying an existing PO that already has inward entries in `Purchase` table (`SELECT * FROM Purchase WHERE PONo='...' AND VendorCode=...`):
   - Modifying `IsOpenPO` is prohibited:
     `"Some transactions has been made already with this purchase order!!! \r\n Now you cannot change this OPEN PO Status !!!\r\nChange it by [adding/removing a tick mark to it]."`
   - Modifying `chkReTrkRej` is prohibited:
     `"Some transactions has been made already with this purchase order!!! \r\n Now you should not change the 'Rejections Re-Tracking with this PO Required' !!!\r\nChange it by [adding/removing a tick mark to it]."`

## Delete Restrictions
Checks for existing goods receipts:
`SELECT * FROM PurchPOSub WHERE POId={id} AND QtyToReci<>Qty`
If any row has `QtyToReci <> Qty` (meaning material was already received against this PO):
`"You cannot delete this Purchase Order , since some transactions has been made already..."`
Otherwise confirms `"Are You Sure To Delete ?"` and on confirmation removes rows from `PurchPOSub` and `PurchPO`.

## Database Schema Mapping
- `purch_po`: `factory_id`, `year_label`, `poid`, `vendor_code`, `is_open_po`, `issch_po`, `kind_attn`, `pono`, `podate`, `podatet`, `ref_quote_no`, `ref_quote_date`, `prno`, `prdate`, `valid_from`, `valid_to`, `cost_cntr_id`, `remark`, `is_test_cert`, `purch_val`, `curr_id`, `today_val`, `no_of_items`, `body`, `retrk_rej`.
- `purch_po_sub`: `factory_id`, `year_label`, `poid`, `slno`, `category_code`, `item_id`, `uom`, `qty`, `rate`, `discount`, `qty_to_reci`, `duedate`.
