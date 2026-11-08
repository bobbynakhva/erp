# Sub Contract - DC Outwards (`frmDCSubConOut`) Specification

## 1. Overview
The **DC Outwards (Sub Contract)** module corresponds to `frmDCSubConOut` in the original Visual Basic 6 SMART-ERP system. Located under the menu path **Contract -> DC Outwards** (`mnuDcSubConOut`), this module handles the outward dispatch of raw materials, parts, or semi-finished items to sub-contractors/job-work suppliers for specialized processing, machining, or conversion, and tracks the expected return items against open Sub Contract Work Orders (`frmSubConPO`).

---

## 2. Database Schema

### Header Table: `dcsubconoutgoing`
| Column | Type | Description |
|---|---|---|
| `factory_id` | `VARCHAR(50)` | Multi-tenant factory identifier |
| `year_label` | `VARCHAR(20)` | Financial year identifier |
| `dcid` | `INTEGER` | Primary key identifier (Auto-increment per FY) |
| `dcno` | `VARCHAR(50)` | Delivery Challan Number (e.g. `1 / 26-27`) |
| `dcdate` | `DATE` | Delivery Challan Date |
| `suppid` | `INTEGER` | Supplier / Sub-Contractor ID (FK: `supplier`) |
| `pono` | `VARCHAR(50)` | Sub-Contract Work Order Reference (FK: `subconpo`) |
| `podate` | `DATE` | Work Order Date |
| `costcntrid` | `INTEGER` | Cost Center ID (FK: `cost_center`) |
| `storeid` | `INTEGER` | Store ID issuing the outward goods (FK: `stores`) |
| `transport` | `VARCHAR(100)` | Transport mode / carrier name |
| `vehicleno` | `VARCHAR(50)` | Transport vehicle number |
| `transfrom` | `VARCHAR(100)` | Despatch source location |
| `transto` | `VARCHAR(100)` | Despatch destination location |
| `dcrem` | `TEXT` | Overall remarks |
| `noofitems` | `INTEGER` | Count of line items |
| `goodsqty` | `NUMERIC(14,4)`| Total outward goods quantity |
| `balqty` | `NUMERIC(14,4)`| Total remaining return quantity balance |
| `dctally` | `BOOLEAN` | Tally export flag |
| `cancl` | `BOOLEAN` | Cancellation status flag |
| `annexno` | `VARCHAR(50)` | Annexure II document number |
| `annexslno` | `VARCHAR(50)` | Annexure serial number |
| `annexnature` | `VARCHAR(100)`| Nature of processing |
| `annextariff` | `VARCHAR(50)` | Central Excise / Customs Tariff classification |
| `annexprocplace` | `VARCHAR(100)`| Place of processing |
| `annexduration` | `VARCHAR(50)` | Duration / expected completion period |
| `annexqty` | `NUMERIC(14,4)`| Annexure quantity |
| `annexestival` | `NUMERIC(14,2)`| Annexure estimated value |
| `annexgoodsdesc` | `TEXT` | Detailed goods description for excise |
| `purpose` | `VARCHAR(100)`| Purpose of removal under Central Excise |
| `docunature` | `VARCHAR(100)`| Document nature |
| `form39lrno` | `VARCHAR(50)` | Form 39 L.R. (Lorry Receipt) Number |
| `form39no` | `VARCHAR(50)` | Commercial Tax Form 39 Number |

### Line Items Table: `dcsubconoutgoingsub`
| Column | Type | Description |
|---|---|---|
| `factory_id` | `VARCHAR(50)` | Factory identifier |
| `year_label` | `VARCHAR(20)` | Financial year identifier |
| `dcid` | `INTEGER` | Reference to `dcsubconoutgoing.dcid` |
| `slno` | `NUMERIC(8,2)` | Line item serial number (integer slno used for unified line) |
| `itemidout` | `INTEGER` | Raw Material / Component sent OUT (`item.item_id`) |
| `qtyout` | `NUMERIC(14,4)`| Quantity of material sent OUT |
| `itemid` | `INTEGER` | Expected Processed / Finished item to come IN (`item.item_id`) |
| `qty` | `NUMERIC(14,4)`| Expected inward quantity |
| `balqty` | `NUMERIC(14,4)`| Remaining inward quantity to be received back |
| `dcrowrem` | `TEXT` | Row-level remarks |
| `rate` | `NUMERIC(14,4)`| Item processing / valuation rate |
| `amount` | `NUMERIC(14,2)`| Line valuation amount |

### Tracking Table: `subconpotrack`
| Column | Type | Description |
|---|---|---|
| `factory_id` | `VARCHAR(50)` | Factory identifier |
| `year_label` | `VARCHAR(20)` | Financial year identifier |
| `poid` | `INTEGER` | Sub-Contract PO reference |
| `dcid` | `INTEGER` | Sub-Contract DC reference |
| `slno` | `INTEGER` | PO line serial number |
| `itemid` | `INTEGER` | Item ID |
| `qtyreduced` | `NUMERIC(14,4)`| Quantity committed / tracked against the PO |

---

## 3. Business Logic & Validation Rules (VB6 Disassembly Parity)

1. **Supplier Selection Mandatory:**
   - If Supplier is empty, abort with: `"Please Select a Supplier"`
2. **Store Selection Mandatory:**
   - If Store is empty, abort with: `"Please Select a Store from the list"`
3. **DC Number Mandatory:**
   - If DC No is empty, abort with: `"Enter the DC Number "`
4. **Grid Non-Empty:**
   - If grid has 0 lines, abort with: `"Please Enter the item details by clicking the grid heading....."`
5. **First Row Completeness:**
   - First row must have valid OUT item & quantity > 0, and valid IN item & quantity > 0.
   - If missing, abort with: `"First Row of the DC should be filled completely ( slNo. 1 )!!!"`
6. **No Intermediate Empty Rows (`Proc_CF72C8`):**
   - No completely blank intermediate row allowed.
   - If found at index `i`, abort with: `"Empty rows not allowed !!! (see SlNo. <n> )"`
7. **Line Item & Quantity Validation (`Proc_E69514`):**
   - Each non-empty row must specify a valid registered `Item Code/Part No. - OUT` and `Qty > 0`.
     - Message: `"Enter valid 'Item Code/Part No. - OUT' for the SlNo."` / `"Enter valid 'Item Code/Part No. - OUT' Quantity for the SlNo."`
   - Each non-empty row must specify a valid registered `Item Code/Part No. - IN` and `Qty > 0`.
     - Message: `"Enter valid 'Item Code/Part No. - IN' for the SlNo."` / `"Enter valid 'Item Code/Part No. - IN' Quantity for the SlNo."`
8. **Cost Center Validation:**
   - If Cost Center is specified, it must exist in `cost_center`.
   - Message: `"Please Select an existing CostCenter...."`
9. **Duplicate DC Number Check:**
   - On new record or renaming DC No, check if another record has the same DC No.
   - Message: `" A Record with same DC NO. already exists ..."`
10. **Downstream Received Integrity on Modify:**
    - On modifying an existing DC where partial goods have already been received back:
      - `new_qty >= received_qty` (`qty - balqty`)
      - Message: `"Since <rec> <uom> of '<name>' has been Received Already from SubContractor/Supplier, \r\n Qty should be greater or equal to <rec>"`
11. **Downstream Received Integrity on Delete:**
    - If any row in `dcsubconoutgoingsub` has `balqty <> qty` (items received back in GRN / Inwards):
      - Abort with: `"You cannot delete this DC , since some Finished Items has been received back from this supplier in this regard!!!"`

---

## 4. API Endpoints

- `GET /api/subcon-dc-out`: Fetches suppliers, stores, cost centers, items, next DC number, ID list, and current/latest DC record. Supports `?new=1`, `?id=<id>`, or `?dcNo=<dcNo>`.
- `GET /api/subcon-dc-out/supplier-pos?suppId=<id>`: Returns open PO numbers for the supplier.
- `GET /api/subcon-dc-out/po-lines?poNo=<no>&suppId=<id>`: Returns line items for auto-filling the DC.
- `POST /api/subcon-dc-out/save`: Validates and saves new or updated DC Outwards record.
- `POST /api/subcon-dc-out/delete`: Checks downstream integrity and deletes DC Outwards record.

---

## 5. Dual Item Codes Architecture
In Sub-Contract job-work:
- **`ItemIdOut` / `QtyOut`**: Raw material or component supplied to the vendor (depleted from raw store).
- **`ItemId` / `Qty` / `BalQty`**: Processed component or finished good expected back (received back into finished/subcon store in DC Inwards / GRN).
