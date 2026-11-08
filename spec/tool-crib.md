# Technical Specification: Tool Crib (`frmToolCrib`)

## 1. Overview
The Tool Crib module manages tools and materials temporarily or permanently issued to factory staff/operators. It supports:
- Dynamic store, category, and item selection.
- Real-time stock display for available items in the selected store.
- Re-order Level (ROL) monitoring and automated alert triggers when stock drops below threshold.
- Live FIFO stock reduction into `store_add_sub` with audit records in `store_iss` (`ti = 5`) and `store_iss_sub`.
- Historical tracking in `toolcrib` table.
- Return workflow with partial or full return capabilities, live stock restoration, and return remark logging.
- Printable statement of issued materials as on date.

---

## 2. Database Schema
### Table: `tool_crib`
```sql
CREATE TABLE IF NOT EXISTS tool_crib (
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  entry_id integer NOT NULL,
  sl_no integer NOT NULL,
  item_id integer,
  qty_reduced double precision,
  qty_issued double precision,
  date_trans text,
  date_trans_t timestamp,
  descr text,
  issued_to text,
  store_id integer,
  returnn boolean DEFAULT false,
  return_rem text,
  ret_date timestamp,
  store_iss_id integer,
  PRIMARY KEY (factory_id, year_label, entry_id, sl_no)
);
```

---

## 3. Bytecode Verification & Logic Mapping
| VB6 Procedure / Offset | Trigger / Control | Backend / Logic Action |
|---|---|---|
| `D36000` (`Form_Load`) | Window Open | Load stores (`canissue=true`), set default date, populate initial issued list (`returnn=false`), disable Save/Delete |
| `C71548` (`cmbStore_Click`) | Store Combo Changed | Load categories containing items with stock in selected store |
| `CC1714` (`cmbcatgry_Click`) | Category Combo Changed | Load items in category that have stock in `store_add_sub` |
| `CC0634` (`cmbItem_Click`) | Item Combo Changed | Load grid with stock qty for item (or all items if ListIndex=0), update UOM label |
| `CF5C08` (Validations) | Pre-Save Validation | Validate store selection, positive qty <= available stock, person name |
| `D09AB8` (`cmdSave_Click`) | Save Button | Prompt confirm -> Live FIFO deduction -> Insert into `toolcrib`, `store_iss` (`ti=5`), `store_iss_sub` -> Check ROL alert -> Success msg |
| `CAC440` (`msflexdata_Click`) | Issued Row Select | Populate Return inputs, enable Return button if eligible |
| `DFB050` / `DFA90C` (`cmdDelete_Click`) | Return Button | Prompt confirm -> Validate return qty -> Reverse FIFO stock -> Update `toolcrib` (set `returnn=true` if full, adjust `qtyreduced`, record `retdate` and `returnrem`) |
| `DE2380` (`cmdPrint_Click`) | Print Button | Check rows >= 2 else `"No data to Print..."` -> Generate printable statement |

---

## 4. UI Layout (`frmToolCrib`)
- Classic 3-Panel Retro Win98/Win2K ERP Frame layout:
  - **Left / Top Panel**: Store, Category, and Item dropdowns with live stock grid (`msflex`) showing `Sl.No`, `Item Code / Name`, `Available Qty`.
  - **Middle Panel**: Issue details: Date (`dtpStkIssue`), Qty Issued (`txtIssQty`), Unit (`lblUnit`), Issued To (`txtIssuedpers`), Remarks (`txtDesc`), and `Save` button.
  - **Right / Bottom Panel**: Materials Issued As On Date (`msflexdata`): `Sl.No`, `Issued To`, `Item`, `Qty Issued`, `Date Issued`. Below it: Return inputs (`txtReturned`, `txtRetnRem`), `Return` button, `Print` button, and `Exit` button.
