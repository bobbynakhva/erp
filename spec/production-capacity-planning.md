# Production Capacity Planning (`frmPlanProdCapacity`) Specification

## 1. Overview & Business Workflow
The **Production Capacity Planning** module (`frmPlanProdCapacity`, accessed via `Planning -> Production Capacity Planning`, screenshots `SCREENSHOTS/PLANNING/004_production_capacity_planningg_left_columns.png` and `...right_columns.png`) calculates required machines and production runtimes based on start and end calendar dates, scheduled product quantities, and process piece-rates.

### Workflow Summary:
1. **Schedule Grid Definition**:
   The grid columns are structured with formulas and markings matching legacy VB6:
   - **Col 0**: `Start Date` (A) - Input date format `DD/MM/YYYY`.
   - **Col 1**: `End Date` (B) - Input date format `DD/MM/YYYY`.
   - **Col 2**: `Planned No of Days` (C) = `(B) - (A)` (Inclusive calendar days between Start and End Date).
   - **Col 3**: `Item Code` (D) - Component item code (with master catalog auto-complete).
   - **Col 4**: `Qty Scheduled` (E) - Scheduled quantity to produce.
   - **Col 5**: `Qty /Day` (F) = `(E) / (C)` (Planned daily output rate rounded to 4 decimals).
   - **Col 6**: `Process Name` (G) - Selected machine or manual manufacturing operation from `process_id`.
   - **Col 7**: `Pcs /Day` (H) - Machine/process capacity output rating per day.
   - **Col 8**: `No of M/c` (I) = `(F) / (H)` (Number of machines required rounded to whole integer).
   - **Col 9**: `Difference` (J) = `(E) - [(I) * (H) * (C)]` (Excess or deficit pieces produced).
   - **Col 10**: `Extra M/c No of days` (K) = `(J) / (H)` (Number of extra machine-days needed).

2. **Validations & Constraints**:
   - `FromDate or ToDate is not a valid Date`: If entered date text fails valid calendar date parsing.
   - `Item Does not exist`: If entered item code is not present in the `item` master.
   - `Scheduled Qty not specified`: If quantity scheduled is 0 or empty.
   - `Process Does not exist`: If entered process is not present in `process_id`.
   - `Production Capacity not Planned `: If save is attempted on an empty grid.
   - Save Confirmation: `"Are You Sure To Save?"` / `"Are You Sure To Modify?"`.
   - Delete Confirmation: `"Are You sure to Delete this Record ?"`.
   - Success Notices: `"Record Saved Successfully!!!"`, `"Record Deleted Successfully!!!"`.
   - Print Guard: `"No data to Print..."` if printing is attempted on an empty grid ($< 3$ rows).

3. **Database State Transitions**:
   - Stored in table `plan_prod_capa` (`plan_id`, `flex_rows`, `details`, `factory_id`, `year_label`).
   - Details stored as tab/carriage-return serialized string preserving the exact multi-row calculations.

---

## 2. Bytecode Provenance & Mapping

| VB6 Routine | Bytecode File | Description |
|---|---|---|
| `Form_Load` | `vbdec/615463766.txt:1447` | Form setup, UserRights check, loads item and process catalogs, navigates to last saved plan. |
| `cmdNew_Click` | `vbdec/615463766.txt:1441` | Clears grid rows, initializes new plan ID. |
| `cmdSave_Click` | `vbdec/615463766.txt:1445` | Concurrency check, validates rows via `checkRow`, prompts confirmation, saves into `plan_prod_capa`. |
| `cmdModify_Click` | `vbdec/615463766.txt:1440` | Delegates to `cmdSave_Click` with Modify caption state. |
| `cmdDelete_Click` | `vbdec/615463766.txt:1438` | Prompts `"Are You sure to Delete this Record ?"`, deletes from `plan_prod_capa`. |
| `cmdPrint_Click` | `vbdec/167785596.txt` | Prompts to save if dirty, checks for data (`"No data to Print..."`), exports to Excel print preview. |
| Navigation | `cmdMoveFirst`, `cmdMovePrevious`, `cmdMoveNext`, `cmdMoveLast` | Iterates across saved plans in `plan_prod_capa`. |

---

## 3. Database Schema
- **`plan_prod_capa`**:
  - `factory_id integer NOT NULL REFERENCES factories(id)`
  - `year_label text NOT NULL`
  - `plan_id integer NOT NULL`
  - `flex_rows integer`
  - `details text`
  - `PRIMARY KEY (factory_id, year_label, plan_id)`

---

## 4. API Endpoints
- `GET /api/capa?planId=<id>`: Returns available items, processes, plan ID list, next ID, and plan details.
- `POST /api/capa/save`: Validates items, processes, date calculations, and upserts `plan_prod_capa`.
- `POST /api/capa/delete`: Deletes plan from `plan_prod_capa`.
