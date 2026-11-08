# Specification: Store Credit Note (General) [frmSCNGen]

## 1. Overview
The Store Credit Note (General) module (`frmSCNGen`) records manual stock credit/inward adjustments into stores (such as trial returns, floor credits, or general shop returns). It creates an addition transaction into `store_add` (with Transaction Source `TS = '1'`) and `store_add_sub` (with `bal_qty = qty, rate = item.rate`), making credited inventory immediately available for issues and transfers.

---

## 2. Bytecode & Form Mapping
- **VB6 Form**: `frmSCNGen`
- **Menu Item**: `mdiSSI.mnuSCNGen_Click` (Inventory -> Store Credit Note (General))
- **Key Bytecode Procedures**:
  - `1979890829.txt`: `Form_Load` - Loads `stores where canadd=true` into `cmbStore`, loads `Item` lists, sets up grid.
  - `1984437548.txt`: `Proc_C6BE24` - Configures MSFlexGrid columns:
    ` Sl.No |          Item Code / Part No./ Drg. No.                    |                  Item/Component Name                 |      Qty      | Remarks      `
  - `2124296897.txt`: `cmdNew_Click` - Clears fields, loads open Cost Centers (`isclosed=false`), calculates next SCN No (`(maxId + 1) & " /" & Right(yr, 2) & "-" & Right(yr+1, 2)`).
  - `1421610649.txt`: `cmdSave_Click` - Validates inputs via `Proc_CF52F8`, duplicate check via `Proc_CBA9CC`, asks `"Are You Sure To Save?"`, executes `Proc_D5EF44` (DB save) and `Proc_D9EA38` (inventory credit to `store_add` / `store_add_sub`), shows `"Record Saved"`.
  - `302500288.txt`: `cmdModify_Click` - Checks `BalQty <> Qty` in `store_add_sub`. If material issued, blocks:
    `"You cannot Modify this Store Transfer Note , since some Material has been Issued from this SCN : " & SCNNo`.
    Otherwise validates, asks `"Are You Sure To Modify?"`, updates records, shows `"Record Modified Successfully."`.
  - `492324204.txt`: `cmdDelete_Click` - Checks `BalQty <> Qty` in `store_add_sub`. If material issued, blocks:
    `"You cannot Modify this Store Transfer Note , since some Material has been Issued Using this Record..."`.
    Asks `"Are You Sure To Delete"`, deletes `store_add_sub`, `store_add`, `scn_gen_sub`, `scn_gen`, shows `"Record Deleted Successfully."`.
  - `361949022.txt`: `Proc_CF52F8` - Comprehensive VB6 validation rules.
  - `1814465395.txt`: `Proc_DE0F30` - Grid line item validations.
  - `1416199113.txt`: `Proc_D48168` - Record load and population.
  - `1825896086.txt`: `Proc_D8011C` - Line items grid retrieval from `SCNGenSub`.

---

## 3. Database Schema
### Tables Involved:
1. `scn_gen`:
   - `factory_id` (int), `year_label` (text), `id` (int, PK)
   - `scn_no` (text)
   - `scn_date` (timestamp)
   - `prep_by` (text)
   - `rem_any` (text)
   - `cost_cntr_id` (int)
   - `store_id` (int)
   - `store_add_id` (int)
2. `scn_gen_sub`:
   - `factory_id` (int), `year_label` (text), `id` (int), `sl_no` (int, PK)
   - `item_id` (int)
   - `qty` (double precision)
   - `rate` (double precision)
   - `dc_row_rem` (text)
3. `store_add` & `store_add_sub`:
   - `store_add`: `id`, `store_id`, `doa`, `ts = '1'`, `cost_cntr_id`, `prep_by`, `rem_any`
   - `store_add_sub`: `id`, `slno`, `item_id`, `qty`, `bal_qty = qty`, `rate = item.rate`, `trak = ''`

---

## 4. Exact Validation Strings & Rules
1. **SCN Number empty**:
   - Error: `"Enter the SCN Number "` (with trailing space). Focus: `txtSCNGenNo`.
2. **Store not selected**:
   - Error: `"Please Select a Store from the list"`. Focus: `cmbStore`.
3. **Invalid Cost Center**:
   - Error: `"Please select an existing Costcenter...."`. Focus: `cmbCostCntr`.
4. **Empty grid lines**:
   - Error: `"Please Enter the ItemName/Item details by clicking the grid heading..."`.
5. **Duplicate Item in lines**:
   - Error: `"Duplication of  Part No./ Items is not allowed. SEE ROWS: X and  Y"`.
6. **Part No. empty**:
   - Error: `"Enter Part No. for the SlNo. " & slNo`.
7. **Part No. not in Item table**:
   - Error: `"Part No. does not exist ... "`.
8. **Item Name empty**:
   - Error: `"Enter a Item/Component Name for the SlNo." & slNo`.
9. **Item Name not in Item table**:
   - Error: `"Item/Component Name does not exist ... "`.
10. **Item Code and Name mismatch**:
    - Error: `"Part No. differs for this Item ... "`.
11. **Invalid Quantity (qty <= 0)**:
    - Error: `"Enter the Valid Qty  "` (with two trailing spaces).
12. **Duplicate SCN No**:
    - Error: `" A Record with same Order No. already exist..."` (with leading space).
13. **Issued Material Lock on Modify**:
    - Error: `"You cannot Modify this Store Transfer Note , since some Material has been Issued from this SCN : <No>"`.
14. **Issued Material Lock on Delete**:
    - Error: `"You cannot Modify this Store Transfer Note , since some Material has been Issued Using this Record..."`.

---

## 5. Endpoints
- `GET /api/scngen`:
  - `?new=1`: Returns empty bundle with `stores`, `costs`, `items`, `nextNo`, `note: null`.
  - `?id=X`: Returns bundle populated with SCN note #X.
  - `?no=X`: Finds SCN note by SCN number.
- `POST /api/scngen/save`:
  - Validates all rules.
  - Inserts/updates `scn_gen` and `scn_gen_sub`.
  - Inserts/updates `store_add` and `store_add_sub` for live stock crediting.
  - Returns `{ ok: true, id: X }`.
- `POST /api/scngen/delete`:
  - Validates `BalQty == Qty` across all lines in `store_add_sub`.
  - Deletes `store_add_sub`, `store_add`, `scn_gen_sub`, `scn_gen`.
  - Returns `{ ok: true }`.
- `GET /api/print?type=scngen&id=X`:
  - Printable certificate with header, pan/gst, store name, cost center, item table, and signatures.
