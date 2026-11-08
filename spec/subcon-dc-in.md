# Specification: Sub Contract Goods Received Note - Inwards (`frmDCSubConIn`)

## 1. Overview
The **Sub Contract Goods Received Note - Inwards** (`frmDCSubConIn`) module manages the inward receipt of finished or processed goods from external subcontractors against previously issued Outward Delivery Challans (`frmDCSubConOut`) and Subcontract Purchase Orders / Work Orders (`frmSubConPO`).

### Visual Interface (as per `SCREENSHOTS/CONTRACT/003_goods_received_note.png`)
- **Title Bar**: `DC Subcontract-Inwards`
- **Top Bar**:
  - `GRN No.` (`txtDcID`): System-generated auto-increment sequence number.
  - `Date & Time` (`dtpGRNdate`): Inward receipt timestamp.
- **Sub Contractor Details (Left Frame)**:
  - `From Sub Contractor/ Supplier` (`cmbSupp`): Dropdown listing subcontractors with active/open outward dispatches.
  - `Add To Store` (`cmbStore`): Dropdown with red label highlighting warehouse store where incoming stock will be added.
  - `* Cost Center` (`lblCostCntr`): Associated cost center inherited from referenced DC or PO.
  - `* Mode of Transport` (`txtTransport`): Text input.
  - `* Vehicle Number` (`txtVehicleNo`): Text input.
  - `* From` (`txtTransFrom`): Text input.
  - `* To` (`txtTransTo`): Text input.
- **DC Details (Right Frame)**:
  - `Party DC No.` (`txtDCNo`): External delivery challan number provided by the subcontractor.
  - `Date` (`dtpDCDate`): Date of the party delivery challan.
  - `Our PO No.` (`cmbPONo`): Internal Work Order / Subcontract PO reference.
  - `Date` (`dtpPODate`): Date of internal PO.
  - `Signed and Returned` (`chkDCSigned`): Checkbox confirming party signed DC returned.
  - `Our DC No.` (`cmbRefDCno`): Reference to our outward delivery challan under which raw material was issued.
  - `Date` (`dtpRefDcDate`): Date of our outward DC.
  - `* Remarks` (`txtRem`): Freeform remarks.
  - `Post Process-->` (`lblMoreDet`): Modal link to record Rejection and Rework quantities and remarks.
  - Helper Labels:
    - `+ PO Bal. Qty ---> Balance Qty. to be Received as per PO`
    - `+ Qty Left ---> Unfinished Qty. available with supplier`
- **Incoming Items Grid (`msflex`)**:
  - Col 0: `Sl.No`
  - Col 1: `Item Code / Part No.`
  - Col 2: `Item Name`
  - Col 3: `Qty D.N` (Delivery Note Qty)
  - Col 4: `Qty Recd.` (Accepted / Inward Qty)
  - Col 5: `Qty. LeftWithSupplier` (`Qty Left` - balance remaining with supplier from outward DC)
  - Col 6: `PO Bal.Qty` (Balance qty yet to be received against PO)
- **Footer Controls**:
  - `Click me for Search Report` (`lblAdvSrch`): Advanced search report lookup.
  - `Search GRN No.` (`txtGO`): Direct jump to GRN ID.
  - Navigation: `|<` (First), `<<` (Previous), `>>` (Next), `>|` (Last).
  - Action Buttons: `New`, `Save`, `Modify`, `Delete`, `Printer`, `Close`.

---

## 2. Bytecode & VTable Architecture (VB6 Decompiled Disassembly)

| Procedure Address | VB6 Handler / Function | Functionality |
| :--- | :--- | :--- |
| `DA2204` | `frmDCSubConIn.Form_Load` | Loads stores (`canadd=true`), checks user permissions, loads subcontractors with pending outward DCs |
| `D0C0A0` | `frmDCSubConIn.cmdSave_Click` | Executes validations (`D5C4F8`), duplicate check (`D0D284`), confirm prompt, save execution (`E5DB38`), prompts `"Record Saved ."` |
| `D3FDF4` | `frmDCSubConIn.cmdModify_Click` | Downstream check (`D49298`), duplicate check (`D0D284`), invoice caution prompt, save execution, prompts `"Record Modified ."` |
| `D19ABC` | `frmDCSubConIn.cmdDelete_Click` | Downstream check (`D49298`), confirm `"Are You Sure To Delete"`, reverses balances (`D78CC8`), deletes header & lines, deletes store add (`CD4910`), prompts `"Record Deleted Successfully."` |
| `D30684` | `frmDCSubConIn.cmdNew_Click` | Resets form state, queries `MAX(DcId) + 1`, sets default store from `storeMAP` |
| `EAD520` | `frmDCSubConIn.cmdPrint_Click` | Exports to Excel template `\Xl\GRNSupplier.xlt` |
| `C98C34` | `frmDCSubConIn.cmbSupp_Click` | Triggers open PO lookup (`CF3390`), open outward DC lookup (`D3E048`), and expected items (`DFF890`) |
| `D52D64` | `frmDCSubConIn.cmbPONo_Click` | Loads PO date, alerts `"This is an Open PO."` if `IsOpenPO=true` |
| `D47DF8` | `frmDCSubConIn.cmbRefDCno_Click` | Loads outward DC date, sets cost center from outward DC |
| `D5C4F8` | Validation Routine | Sequential field checks and grid row verification |
| `D0D284` | Duplicate DC No Check | Queries `SELECT * FROM DcSubConIncoming WHERE DcNo='...' AND SuppId='...'` |
| `E5DB38` | Save Header | Writes `dcsubconincoming` record and triggers line item processing |
| `EB16B8` | Save Lines & Deplete Balances | Writes `dcsubconincomingsub`, depletes `dcsubconoutgoingsub.balqty`, updates `updatetrack`, depletes `subconposub.qtytoreci`, writes `subconpotrack` |
| `D78CC8` | Reverse Balances | Reverses outward DC balances using `updatetrack`, reverses PO balances using `subconpotrack` |
| `CD4910` | Delete Store Add | Deletes `store_add` and `store_add_sub` records |
| `D49298` | Downstream Safety Integrity Checks | Blocks deletion/modification if Store Credit Note raised, Invoice exists, Cash flow recorded, or Store material already issued |

---

## 3. Database Schema

### Header Table: `dcsubconincoming`
```sql
CREATE TABLE IF NOT EXISTS dcsubconincoming (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  dcid integer NOT NULL,
  dcno text NOT NULL,
  dcdate date,
  dcdatet text,
  grndate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suppid integer NOT NULL,
  storeid integer,
  tmpstoreid integer,
  tmpstoreaddid integer,
  costcntrid integer,
  pono text,
  podate date,
  podatet text,
  refdcno text,
  refdcdate date,
  refdcdatet text,
  dcsign boolean DEFAULT false,
  transport text,
  vehicleno text,
  transfrom text,
  transto text,
  dcrem text,
  rejrem text,
  noofitems integer DEFAULT 0,
  goodsqty double precision DEFAULT 0,
  goodsval double precision DEFAULT 0,
  invno text,
  invdate date,
  invdatet text,
  totval double precision DEFAULT 0,
  balance double precision DEFAULT 0,
  scnsubconid integer DEFAULT 0,
  scnsubcondate date,
  cancl boolean DEFAULT false,
  statusc boolean DEFAULT false,
  PRIMARY KEY (factory_id, year_label, dcid)
);
```

### Line Items Table: `dcsubconincomingsub`
```sql
CREATE TABLE IF NOT EXISTS dcsubconincomingsub (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  dcid integer NOT NULL,
  slno numeric(8,2) NOT NULL,
  itemid integer,
  dnqty double precision DEFAULT 0,
  qty double precision DEFAULT 0,
  rejqty double precision DEFAULT 0,
  rewqty double precision DEFAULT 0,
  rate double precision DEFAULT 0,
  amount double precision DEFAULT 0,
  dcrowrem text,
  rejrowrem text,
  updatetrack text,
  PRIMARY KEY (factory_id, year_label, dcid, slno)
);
```

---

## 4. Business Logic & Integrity Constraints

### 4.1 Subcontract Delivery Challan Depletion & Updatetrack
When incoming finished goods are received:
1. If `refdcno` is specified, the system queries matching items in `dcsubconoutgoingsub` under that specific outward DC.
2. If `refdcno` is omitted, the system queries open outward DCs for that supplier/PO.
3. It depletes `balqty = balqty - recdQty` in `dcsubconoutgoingsub`.
4. It records the deduction sequence in `updatetrack`: `"dcid,qtyDeducted,dcid,qtyDeducted"`.
5. If an outward DC has zero balance remaining across all lines, it sets `dcsubconoutgoing.dctally = true`.

### 4.2 Subcontract PO Depletion & Subconpotrack
1. If a PO is referenced (`poNo`), the system queries `subconposub` rows for `(poid, itemid)` with `qtytoreci > 0`.
2. It reduces `qtytoreci = qtytoreci - recdQty`.
3. It writes an audit log to `subconpotrack`: `(factory_id, year_label, poid, dcid, slno, itemid, qtyreduced)`.
4. If all lines for a PO have `qtytoreci == 0`, it sets `subconpo.potally = true`.

### 4.3 Store Inventory Addition
1. Creates an entry in `store_add` with `(store_id, doa, ts, cost_cntr_id, prep_by, rem_any)`.
2. Sets `dcsubconincoming.tmpstoreaddid = store_add.id`.
3. For each line item received, inserts into `store_add_sub` with `(id, slno, item_id, qty, bal_qty, rate)`.
4. Stock immediately becomes available in the designated store.

### 4.4 Downstream Safety Checks (Proc_D49298)
Deletion and Modification are strictly blocked under any of the following conditions:
1. **Store Credit Note Raised**: `scnsubconid > 0` -> `"Deletion/Modification not allowed , since Store Credit Note  already raised for this GRN!!!"`
2. **Downstream Invoice Exists**: `invno IS NOT NULL AND invno <> ''` -> `"Deletion not allowed with this DC NO: <dcno>, since Invoice is made already with this DC!!!"`
3. **Cash Flow / Payment Linked**: `totval <> balance` -> `"Deletion not allowed with this GRN NO: <dcid>, since some Cash Flow has been made in this Regard!!!"`
4. **Material Issued from Store**: `store_add_sub.bal_qty <> qty` -> `"Deletion/Modification is not Allowed, Since Some material has been issued  after this GRN ( <dcid> ) has been made!!! "`

---

## 5. Exact VB6 Error and Warning Messages

| Validation Event | Exact VB6 Message Text |
| :--- | :--- |
| Missing Supplier | `"Please Select a Supplier....."` |
| Missing Store | `"Please Select a Store from the list"` |
| Missing DC No | `"Enter the DC Number..... "` |
| Missing PO when POs exist | `"You have to select a PO Number from the list....."` |
| Empty Grid Lines | `"Please Enter the item details by clicking the grid heading....."` |
| Invalid Item Code | `"Select Valid Item Code/Part No. for the SlNo. <n>"` |
| Missing / Zero DN Qty | `"Enter Quantity as per Delivery Note... for the SlNo:  <n>"` |
| Missing / Zero Recd Qty | `"Qty should be greater than zero and less than  ..."` |
| Duplicate DC No | `" A Record with same DC NO. already exist..."` |
| Save Confirmation | `"Are You Sure To Save?"` |
| Save Success | `"Record Saved ."` |
| Modify Confirmation (Standard) | `"Are You Sure To Modify ?"` |
| Modify Confirmation (Invoice active) | `"CAUTION: Your Previous INVOICE Values with respect to this DCNO will be Made as ZERO !!!\r\n\r\nAre You Sure To Modify ?"` |
| Modify Success | `"Record Modified ."` |
| Delete Confirmation | `"Are You Sure To Delete"` |
| Delete Success | `"Record Deleted Successfully."` |
| Search Not Found | `" NO GRN exists with this No."` |
| Open PO Alert | `"This is an Open PO."` |
| No Print Data | `"No data to Print..."` |

---

## 6. Verification and Test Results
Comprehensive simulation test suite `test_subcon_dcin_simulation.js` passed 100%:
- All 8 VB6 validation error strings matched exactly.
- Duplicate DC No prevention verified.
- New record save, store inventory addition, and balance depletion verified.
- Record modification and data persistence verified.
- Downstream safety deletion checks verified.
- Balance reversal and clean record deletion verified.
- Full regression suite across Sub Contract DC Outwards, Subcontract PO, and Labour Invoice passed 100%.
