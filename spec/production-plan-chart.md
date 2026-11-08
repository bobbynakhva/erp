# Production Plan Chart (`frmPlanY`) Specification

## 1. Overview & Business Workflow
The **Production Plan Chart** module (`frmPlanY`, accessed via `Planning -> Production Plan Chart`, screenshot `SCREENSHOTS/PLANNING/003_production_plan_chart.png`) provides visual gantt-style weekly and monthly machine scheduling across 52 weeks of the year.

### Workflow Summary:
1. **Machine and Year Selection**:
   - The user selects the machine from `machine` master.
   - The user selects the planning year (dropdown with years).
2. **Visual Gantt Matrix (52 Weeks x 7 Days)**:
   - Rows: 52 weeks of the calendar year, labeled with week start date and month group.
   - Columns: 7 calendar days (`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`).
   - Legend: Items scheduled on this machine assigned distinct colors.
3. **Shift Allocation & Fill**:
   - Selecting an item from the legend and clicking a day or range of days paints the item schedule into the visual matrix.
   - Supports shift-based scheduling (`Day`, `Night`, `General`).
4. **Validations & Constraints**:
   - `Save not allowed. You have not planned Anything`: If save is attempted without assigning items or on an empty plan.
   - `Select the Machine`: If machine is not selected.
   - Confirm Prompt: `"Are You Sure To Save?"` / `"Are You Sure To Modify?"`.
   - Delete Confirmation: `"Are You sure to Delete this Record ?"`.
5. **Database State Transitions**:
   - Stored in table `plan_chart` (`factory_id`, `year_label`, `plan_year`, `mach_id`, `plan_data`).
   - `plan_data`: Serialized item matrix and color matrix joined by delimiter `\u008e`.

---

## 2. Bytecode Provenance & Mapping

| VB6 Routine | Bytecode File | Description |
|---|---|---|
| `Form_Load` | `vbdec/615463766.txt:1193` | Form setup, UserRights check, loads machines and items, populates year dropdown. |
| `cmbMachine_Click` | `vbdec/615463766.txt:1188` | Loads saved plan for selected machine and year from `plan_chart`. |
| `cmdSave_Click` | `vbdec/615463766.txt:1190` | Validates plan content (`"Save not allowed. You have not planned Anything"`), saves to `plan_chart`. |
| `cmdShiftGo_Click` | `vbdec/615463766.txt:1191` | Bulk applies item color across specified number of days/shifts. |
| `cmdPrint_Click` | `vbdec/615463766.txt:1220` | Generates printable machine scheduling chart. |

---

## 3. Database Schema
- **`plan_chart`**:
  - `factory_id integer NOT NULL REFERENCES factories(id)`
  - `year_label text NOT NULL`
  - `plan_year integer NOT NULL`
  - `mach_id integer NOT NULL REFERENCES machine(mach_id)`
  - `plan_data text`
  - `PRIMARY KEY (factory_id, year_label, plan_year, mach_id)`

---

## 4. API Endpoints
- `GET /api/plan?year=<year>&mach=<machId>`: Returns machines, item list, and saved plan data for machine and year.
- `POST /api/plan/save`: Validates machine, year, item legend, and upserts `plan_chart`.
