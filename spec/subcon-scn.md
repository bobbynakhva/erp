# Sub Contract - Store Credit Note (`frmDcSubConStoreCrNote`) Specification

## 1. Overview & Business Workflow
The **Sub Contract Store Credit Note** module (`frmDcSubConStoreCrNote`, accessed via `Sub Contract -> Store Credit Note`) performs quality inspection, material acceptance/rejection, and warehouse stock receipt for items previously received from a subcontractor via Goods Received Note (GRN - `frmDCSubConIn`).

### Workflow Summary:
1. When goods arrive from a subcontractor, they are initially recorded in `frmDCSubConIn` and placed into a quarantine/inspection store (`tmpstoreid`).
2. Quality Control (QC) inspects the goods in `frmDcSubConStoreCrNote`:
   - `Qty Accp.` (Accepted Quantity) is cleared to be moved into production / main store.
   - `Qty Rej.` (Rejected Quantity) remains in quarantine or is scheduled for return.
3. Upon saving:
   - Quarantine store (`tmpstoreid`) stock is issued out with FIFO depletion tracking.
   - Destination store (`storeid`) stock is created with `bal_qty = qty = Qty.To Stock`.
   - The SCN ID is linked back to `dcsubconincoming.scnsubconid`.
4. Downstream Protection:
   - Modification or deletion is blocked if stock has already been drawn from the destination store (`store_add_sub.bal_qty <> store_add_sub.qty`).
   - Modification or deletion is blocked if an invoice has already been generated against the GRN (`dcsubconincoming.invno IS NOT NULL`).

---

## 2. Bytecode Provenance & Mapping
Reverse-engineered directly from disassembled VB6 routines:

| VB6 Routine | Source File | Description |
|---|---|---|
| `Proc_D439F8` | `vbdec/835499397.txt` | Header validations: date, GRN selection, store selection, duplicate store check (`"Both Stores should not be the same ... "`). |
| `Proc_CCDD20` | `vbdec/916377667.txt` | Row quantity validation: `"Both Accepted Qty and Rejected Qty should not be Zero... "`, and sum check against `Qty Recd.`. |
| `Proc_D4C670` | `vbdec/502110271.txt` | Header save logic updating `dcsubconincoming` (`scnsubconid`, `scnsubcondate`, `prepby`, `remany`, `storeid`). |
| `Proc_D0BB90` | `vbdec/1739631645.txt` | Line save logic updating `dcsubconincomingsub` (`accpqty`, `rejqty`, `rejrowrem`). |
| `Proc_E4E418` | `vbdec/1950880246.txt` | Quarantine store FIFO stock depletion (`store_iss`/`store_iss_sub` with `TI = '11'`). |
| `Proc_D9F968` | `vbdec/328572808.txt` | Destination store stock receipt (`store_add`/`store_add_sub` with `TS = '11'`). |
| `Proc_CCFD80` | `vbdec/561684994.txt` | Downstream integrity blocks: checks `bal_qty <> qty` and `invno` check. |
| `cmdDelete_Click` | `vbdec/1228334388.txt` | Deletion logic: checks downstream dependencies, restores source store FIFO balance, deletes store records, resets GRN. |
| `Proc_DE3EDC` | `vbdec/1300121181.txt` | Grid population for the 10 columns: `Sl.No`, `Item Code / Part No.`, `Item Name`, `Qty D.N`, `Qty Recd.`, `Qty Accp.`, `Qty Rej.`, `Remarks`, `Qty.To Stock`, `Stk. Qty`. |
| `txtEdit_Change` | `vbdec/305498537.txt` | Grid inline edit events, unit guide update (`ITEM : <code/name>    UOM : <measureunit>`), auto-mirroring `Qty.To Stock` from `Qty Accp.`. |

---

## 3. Database Schema

### `dcsubconincoming`
- `scnsubconid integer DEFAULT 0`: SCN number.
- `scnsubcondate date`: SCN creation date.
- `storeid integer`: Destination store ID where accepted material is transferred.
- `storeissid integer DEFAULT 0`: Link to `store_iss.id` for quarantine store outward issue.
- `storeaddid integer DEFAULT 0`: Link to `store_add.id` for destination store inward add.
- `prepby text`: Prepared by user name.
- `remany text`: Remarks.

### `dcsubconincomingsub`
- `accpqty double precision DEFAULT 0`: Accepted quantity.
- `rejqty double precision DEFAULT 0`: Rejected quantity.
- `rejrowrem text`: Line-level rejection/QC remarks.

---

## 4. API Endpoints

- `GET /api/subcon-scn`: Bundle loader (`first`, `prev`, `next`, `last`, `new`, `no`, `id`). Returns stores, cost centers, open GRNs, next SCN ID, and existing record data with lines and current stock.
- `GET /api/subcon-scn/grn-details`: Loads line items, quarantine store balance, and metadata for a selected open GRN.
- `POST /api/subcon-scn/save`: Transactional save supporting new and modify modes with FIFO deduction, stock addition, and downstream validation.
- `POST /api/subcon-scn/delete`: Transactional deletion with downstream guards, FIFO balance restoration, and GRN reset.
- `GET /api/print?type=subcon-scn&id=<id>`: Standard print preview document.

---

## 5. Verification & Test Suite
Automated regression and simulation suite:
- `test_subcon_scn_simulation.js`: 10-step full lifecycle test (Bundle -> GRN selection -> Validations -> Save -> Modify -> Downstream block -> Delete & FIFO restore -> Print preview). **100% PASSING**.
