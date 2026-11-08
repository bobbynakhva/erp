# Inter-Store Transfer (`frmStoreInterTrans`) Specification

## 1. Overview
The Inter-Store Transfer module ports legacy Visual Basic 6 form `frmStoreInterTrans` to the web-based Smart ERP architecture. It manages the movement of inventory stock between different internal factory warehouses/stores (e.g., Godown 1 to Godown 2), handling simultaneous FIFO stock deduction from the source store and inventory addition into the destination store.

---

## 2. Legacy VB6 Reference Architecture

| Attribute | Legacy VB6 Implementation | Web / Node.js Endpoint |
|---|---|---|
| **Form Name** | `frmStoreInterTrans` | Section `#ist` in `index.html` |
| **Menu Access** | `mnuStoreInterTrans` | `app.js` -> `window.openIst()` |
| **Database Tables** | `StoreInterTrans`, `StoreInterTransSub`, `Store_Iss`, `Store_Iss_Sub`, `Store_Add`, `Store_Add_Sub` | `store_inter_trans`, `store_inter_trans_sub`, `store_iss`, `store_iss_sub`, `store_add`, `store_add_sub` |
| **Primary Code Files** | `vbdec/740209696.txt` (Form_Load)<br>`vbdec/616323667.txt` (cmdNew)<br>`vbdec/1045992495.txt` (cmdSave)<br>`vbdec/819770213.txt` (cmdModify)<br>`vbdec/1441457343.txt` (cmdDelete)<br>`vbdec/324334901.txt` (Proc_D4DEEC Validations)<br>`vbdec/1665903762.txt` (Proc_DE086C Grid Validations)<br>`vbdec/687500592.txt` (Proc_D77780 Save Transaction)<br>`vbdec/1374348339.txt` (Proc_E40F04 Source Issue)<br>`vbdec/2005229920.txt` (Proc_D9EF48 Dest Addition)<br>`vbdec/790112267.txt` (Proc_C5CA00 Stock Reversal) | `smart-erp/server.js`<br>`smart-erp/public/ist.js` |

---

## 3. Data Dictionary & Transactional Integrity

### Header (`store_inter_trans`)
- `id`: Primary Key (integer, auto-incrementing / max+1 per factory & financial year).
- `ist_no`: Inter-Store Transfer Number (varchar/text, auto-incrementing integer string).
- `ist_date`: Transfer date (timestamp/date).
- `prep_by`: Prepared by user tag (varchar).
- `rem_any`: Optional remarks (text).
- `cost_cntr_id`: Cost Center foreign key reference (integer, optional).
- `store_sour_id`: Source Store foreign key reference (`store.can_issue = true`).
- `store_dest_id`: Destination Store foreign key reference (`store.can_add = true`).
- `store_iss_id`: Corresponding stock deduction issue record in `store_iss` (`ti = '9'`).
- `store_add_id`: Corresponding stock addition credit record in `store_add` (`ts = '9'`).

### Lines (`store_inter_trans_sub`)
- `id`: Foreign key referencing `store_inter_trans.id`.
- `sl_no`: 1-based sequential line number.
- `item_id`: Item Master foreign key reference.
- `qty`: Transfer quantity (numeric).
- `rate`: Item rate captured at transfer time (numeric).

### Inventory Movements
1. **Source Store Deduction**:
   - Creates a record in `store_iss` (`ti = '9'`) linked to `store_sour_id`.
   - Iterates FIFO through available batches in `store_add_sub` for `store_sour_id`, deducting `bal_qty`.
   - Appends records to `store_iss_sub` tracking the deduction.
2. **Destination Store Addition**:
   - Creates a record in `store_add` (`ts = '9'`) linked to `store_dest_id`.
   - Appends records to `store_add_sub` with `bal_qty = qty`, `qty = qty`, and `rate = item.rate`.

---

## 4. Legacy VB6 Business Logic & Validation Rules

1. **IST Number Required (`Proc_D4DEEC`)**:
   - Prompt: `"Enter the InterStore Transfer Number "`
2. **Source Store Required (`Proc_D4DEEC`)**:
   - Prompt: `"Please Select a Store from which the Stock is to be Reduced"`
3. **Destination Store Required (`Proc_D4DEEC`)**:
   - Prompt: `"Please Select a Store to which the stock is to be Added"`
4. **Different Stores Enforced (`Proc_D4DEEC`)**:
   - Prompt: `"Both Stores should not be the same ... "`
5. **Cost Center Validation (`Proc_D4DEEC`)**:
   - Prompt: `"Please select an existing Costcenter...."`
6. **Grid Lines Required (`Proc_DE086C`)**:
   - Prompt: `"Please Enter the ItemName/Item details by clicking the grid heading..."`
7. **No Duplicate Items (`clsProd.msf_check_valid_itm`)**:
   - Prompt: `"Duplication of  Part No./ Items is not allowed. SEE ROWS: X and  Y"`
8. **Item Code Required (`Proc_DE086C`)**:
   - Prompt: `"Enter Part No. for the SlNo. <X>"`
9. **Item Code Must Exist (`Proc_DE086C`)**:
   - Prompt: `"Part No. does not exist ... "`
10. **Item Name Required (`Proc_DE086C`)**:
    - Prompt: `"Enter a Item/Component Name for the SlNo.<X>"`
11. **Item Code / Name Consistency (`Proc_DE086C`)**:
    - Prompt: `"Part No. differs for this Item ... "` / `"Item/Component Name does not exist ... "`
12. **Positive Quantity Required (`Proc_DE086C`)**:
    - Prompt: `"Enter the Valid Qty  "`
13. **Stock Quantity Check (`clsProd.msf_RowQty_OK_with_StockPO`)**:
    - Prompt: `"Qty should not be greater than <stock>"`
14. **Duplicate IST Number (`Proc_C74C9C`)**:
    - Save: `" A Record with same Inter-Store Transfer No. already exist..."`
    - Modify: `" A Record with same Order No. already exist..."`
15. **Issued Material Lock (`cmdModify_Click` & `cmdDelete_Click`)**:
    - If `bal_qty <> qty` in `store_add_sub` for the destination store addition record:
      - Modify: `"Modification is not Allowed, Since Some material has been issued  after Transfer of Stock"`
      - Delete: `"Deletion is not Allowed, Since Some material has been issued  after Transfer of Stock"`
16. **Confirmation Prompts**:
    - Save: `"Are You Sure To Save?"` -> `"Record Saved"`
    - Modify: `"Are You Sure To Modify?"` -> `"Record Modified."`
    - Delete: `"Are You Sure To Delete"` -> `"Record Deleted Successfully."`

---

## 5. Verification & Test Suite
Simulation test suite `test_ist_simulation.js` verifies:
- Initial state bundle load (`/api/ist?new=1`), store lists, cost center list, item stock map.
- All 15 validation rules.
- Live dual inventory movement: source store stock decrements, destination store stock increments.
- Duplicate IST number rejection.
- Navigation and search (`?no=`, `?id=`).
- Issued material lock on modify and delete.
- Record deletion with reciprocal stock restoration.
- Printable IST Note generation (`/api/print?type=ist&id=<id>`).
