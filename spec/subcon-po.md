# Sub Contract - Work Order - Outwards (`frmSubConPO`) Specification

## 1. Overview
- **Legacy Form:** `frmSubConPO` (`Sales / Labour -> Sub Contract -> Work Order - Outwards` or `Sub Contract -> Work Order - Outwards`).
- **Menu Route:** `contract` -> `frmSubConPO`.
- **Primary Tables:**
  - `subconpo`: Work Order header records.
  - `subconposub`: Work Order item lines.
- **Related / Downstream Tables:**
  - `supplier`: Sub-contract suppliers / vendors.
  - `cost_center`: Cost centers.
  - `item`: Catalog items & UOM.
  - `dcsubconoutgoing`: Subcontract Outward DCs (blocks deletion if any transactions exist).

---

## 2. Database Schema (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS subconpo (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  poid integer NOT NULL,
  pono text NOT NULL,
  podate date NOT NULL,
  podatet text,
  suppid integer NOT NULL,
  costcntrid integer,
  kindattn text,
  refquoteno text,
  refquotedate date,
  validfrom date,
  validto date,
  isopenpo boolean DEFAULT false,
  isschpo boolean DEFAULT false,
  totval numeric(14,2) DEFAULT 0,
  remark text,
  body text,
  cancl boolean DEFAULT false,
  potally boolean DEFAULT false,
  PRIMARY KEY (factory_id, year_label, poid)
);

CREATE TABLE IF NOT EXISTS subconposub (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  poid integer NOT NULL,
  slno integer NOT NULL,
  itemid integer NOT NULL,
  qty numeric(14,4) NOT NULL DEFAULT 0,
  qtytoreci numeric(14,4) NOT NULL DEFAULT 0,
  rate numeric(14,4) NOT NULL DEFAULT 0,
  discount numeric(8,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  duedate date,
  dcrowrem text,
  PRIMARY KEY (factory_id, year_label, poid, slno)
);

CREATE TABLE IF NOT EXISTS dcsubconoutgoing (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  dcid integer NOT NULL,
  dcno text NOT NULL,
  dcdate date NOT NULL,
  suppid integer NOT NULL,
  pono text,
  costcntrid integer,
  PRIMARY KEY (factory_id, year_label, dcid)
);
```

---

## 3. Business Rules & Validations (from VB6 Bytecode)

1. **Next PO ID & Auto-numbering:**
   - Next `poid = COALESCE(MAX(poid), 0) + 1`.
   - Default `pono = String(next_poid)`.
   - `txtPrefix` defaults from `misc.prefix_wo`.
2. **Supplier Selection:**
   - Must select an active supplier: `"Please Select a Supplier....."`.
   - On supplier select, load supplier address, KST, CST, and default terms from previous PO.
3. **Work Order Number:**
   - Cannot be blank: `"Enter the Work Order Number..... "`.
   - Duplicate check: `" A Record with same Order No. already exist..."`.
4. **Cost Center:**
   - Must be selected: `"Please Select an existing CostCenter...."`.
5. **Open PO vs Valued PO:**
   - If `isOpenPO == false`, total value must be $> 0$:
     `"Enter the purchase Order Value!!! \r\n Double Click the box to obtain value from the system"`.
6. **Line Items:**
   - At least 1 item line must have valid Item, Qty, and Rate.
   - Initial `qtytoreci = qty`.
7. **Deletion Safety:**
   - Blocked if `dcsubconoutgoing` has an entry with matching `pono` and `suppid`.
   - Blocked if any line in `subconposub` has `qtytoreci <> qty`.
   - Error: `"You cannot delete this Work Order , since some transactions has been made already..."`.
   - Confirmation: `"Are You Sure To Delete?"`.
   - Success: `"Record Deleted."`.
8. **Save Confirmation & Message:**
   - Confirm: `"Are You Sure To Save ?"`.
   - Success: `"Record Saved."` (or `"Record Modified."` on modify).

---

## 4. API Endpoints

- `GET /api/subcon-po`: Fetch bundle (all suppliers, cost centers, items, terms, IDs, or specific record by `poId` or `poNo`).
- `POST /api/subcon-po/save`: Create or update SubContract Work Order.
- `POST /api/subcon-po/delete`: Delete SubContract Work Order with safety transaction checks.
