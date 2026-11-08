# Production Schedule (`frmProdSchedule`) Specification

## 1. Overview & Business Workflow
The **Production Schedule** module (`frmProdSchedule`, accessed via `Production -> Production Schedule`) allows production planners to establish monthly item-wise production targets and assign day-by-day scheduled quantities for each calendar day of the selected month (1 through 28, 29, 30, or 31 days depending on leap years).

### Workflow Summary:
1. **Year and Month Selection**:
   - The user selects the planning year (dropdown populated from 2000 to current year + 3).
   - The user selects the planning month (January through December).
   - Changing year or month automatically recalculates the number of calendar days ($N \in \{28, 29, 30, 31\}$) and reconstructs the grid columns.
2. **Dynamic Schedule Grid Setup**:
   - Column 0: `Component Name` (Item Code with datalist/auto-complete dropdown from `item`).
   - Column 1: `Target Qty` (Planned monthly production target).
   - Columns 2 through $N + 1$: Daily columns labeled `1` through `N`.
   - Column $N + 2$: `Total Plan Qty` (Calculated row total: $\sum_{d=1}^{N} \text{Day}_d$).
3. **Validations & Constraints**:
   - `Please Select a Year`: If Year dropdown is not selected.
   - `Please Select a Month`: If Month dropdown is not selected.
   - `Please Enter the ItemName/Item details by clicking the grid heading...`: If the schedule grid has no filled rows.
   - `Enter Valid Component `: If any row has a blank item code.
   - `Part No. does not exist ... Press F5 Key to Add New Items!!!`: If the entered item code does not exist in the `item` master.
   - `Duplication of  Part No./ Items is not allowed. SEE ROWS: X and  Y`: Distinct item policy across rows; identical item cannot be scheduled more than once in the same monthly schedule.
   - `Total Qty Should be greater than Zero`: The sum of scheduled daily quantities for any scheduled component must be $> 0$.
   - Save / Modify Prompt: `"Are You Sure To " + ("Modify" | "Save") + "?"`.
   - Delete Prompt: `"Are You sure to Delete this Record ?"`.
   - Print Guard: `"You should save the Record First in order to take print..."` if printing is attempted without saving.
4. **Database State Transitions**:
   - Master Table: `prod_schd` (`sch_id`, `sch_year`, `sch_month`, `factory_id`, `year_label`).
   - Detail Table: `prod_schd_sub` (`sch_id`, `sl_no`, `item_id`, `target_qty`, `day_qty double precision[]`).
   - Saving performs a clean transactional replace of detail rows (`DELETE FROM prod_schd_sub WHERE sch_id = ...` followed by batch insert of line items).
   - Deletion removes all sub rows and the master schedule row.
5. **Printable Schedule**:
   - In VB6, printed using `\XL\ProdSched.xlt` Excel template.
   - In the web system, serviced via `/api/print?type=schd&id=<schId>`, outputting a formal tabular production schedule with company letterhead, monthly target totals, daily planned quantities, and signature verification blocks.

---

## 2. Bytecode Provenance & Mapping

| VB6 Routine | Bytecode File | Description |
|---|---|---|
| `Form_Load` | `vbdec/1276523671.txt` | Form initialization, UserRights verification, year combo population. |
| `cmdNew_Click` | `vbdec/1222852687.txt` | Clears grid rows, loads next schedule ID, resets button states. |
| `cmdSave_Click` | `vbdec/1681856375.txt` | Concurrency check, validates inputs via `Proc_C8F05C`, confirms prompt, calls DB upserts. |
| `cmdModify_Click` | `vbdec/131576885.txt` | Delegates to `cmdSave_Click` with Modify caption state. |
| `cmdDelete_Click` | `vbdec/1478546706.txt` | Confirms `"Are You sure to Delete this Record ?"`, deletes sub and master rows via `Proc_C56904`. |
| `cmdPrint_Click` | `vbdec/2049664109.txt` | Checks if saved (if not, prompts `"You should save the Record First in order to take print..."`), exports to `ProdSched.xlt`. |
| `Proc_C8F05C` | `vbdec/989150740.txt` | Header validation: checks year and month selection, delegates grid check to `Proc_D740B4`. |
| `Proc_D740B4` | `vbdec/724190449.txt` | Detailed grid validation: empty grid, item existence in master, duplicate item rows, row total $> 0$. |
| `Proc_CD5444` | `vbdec/1481188135.txt` | Master header upsert into `ProdSchd` (`SchId`, `SchYear`, `SchMonth`). |
| `Proc_C56904` | `vbdec/512958594.txt` | Deletes detail lines: `Delete * from ProdSchdSub Where SchId=<id>`. |
| `Proc_D567B4` | `vbdec/1340265523.txt` | Inserts detail rows into `ProdSchdSub` (`SchId`, `SlNo`, `ItemId`, `TargetQty`, `Day1`..`DayN`). |
| `Proc_D16748` | `vbdec/184264193.txt` | Dynamic column header assembly: `Component Name | Target Qty | 1 | 2 | ... | N | Total Plan Qty`. |
| `Proc_CAF4B8` | `vbdec/565336954.txt` | Year/Month change listener triggering grid reconfiguration and existing schedule retrieval. |

---

## 3. Database Schema

### Table: `prod_schd`
- `factory_id integer NOT NULL REFERENCES factories(id)`
- `year_label text NOT NULL`
- `sch_id integer NOT NULL`
- `sch_year integer`
- `sch_month integer`
- `PRIMARY KEY (factory_id, year_label, sch_id)`

### Table: `prod_schd_sub`
- `factory_id integer NOT NULL REFERENCES factories(id)`
- `year_label text NOT NULL`
- `sch_id integer NOT NULL`
- `sl_no integer NOT NULL`
- `item_id integer`
- `target_qty double precision`
- `day_qty double precision[]`
- `PRIMARY KEY (factory_id, year_label, sch_id, sl_no)`

---

## 4. API Endpoints
- `GET /api/schd?year=<year>&month=<month>&schId=<id>`: Returns available items, existing schedule IDs, next ID, and detailed plan payload.
- `POST /api/schd/save`: Transactionally upserts `prod_schd` and replaces rows in `prod_schd_sub`.
- `POST /api/schd/delete`: Transactionally removes records from `prod_schd_sub` and `prod_schd`.
- `GET /api/print?type=schd&id=<schId>`: Generates formal printable production schedule document.
