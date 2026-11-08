# Material Requirement Analysis (`frmMatReqAnaly`) Specification

## 1. Overview & Business Workflow
The **Material Requirement Analysis** module (`frmMatReqAnaly`, accessed via `Planning -> Material Requirement Analysis`, screenshot `SCREENSHOTS/PLANNING/002_material_requirement_analysis.png`) provides high-level production requirement planning across either:
1. **Component Mode** (`optComp`): Evaluates raw material requirements for components from `comp_master`.
2. **Assembly Mode** (`optAssm`): Cross-matrix analysis mapping multiple assemblies against child parts, factoring in PO Balance quantities, warehouse stocks, component deficits, and raw material conversion weights.

### Workflow Summary:
1. **Selection & Mode**:
   - Radio buttons toggle between `Component` (`optComp`) and `Assembly` (`optAssm`).
   - In Component Mode, lists components defined in `comp_master`.
   - In Assembly Mode, lists assemblies (`assmbly_def`) plus an `"All"` option to build a multi-assembly production matrix.
2. **Validation**:
   - If user clicks `View` (`cmdView`) without selecting an item: `"Select the Item "`.
   - If user clicks `View` in Component Mode without data, or if no BOM lines exist: `" No data to calculate...."`.
3. **Matrix Calculations** (`cmdCalc_Click`):
   - For each part in the matrix:
     - $\text{Req. Qty} = \sum_{a \in \text{assemblies}} \left(\text{PO Balance}_a \times \text{util\_qty}_{a, \text{part}}\right)$
     - $\text{Deficit Qty} = \max(0, \text{Req. Qty} - \text{Stock})$
     - $\text{Req. RM Qty} = \text{Deficit Qty} \times \text{RM Weight per Unit}$
4. **Filter Modes**:
   - `All` (`optAll`): Displays all rows and columns.
   - `Pending PO` (`optPndgPO`): Displays only assemblies with active PO balance ($> 0$).
   - `Deficit` (`optDeficit`): Displays only rows where raw material deficit is $> 0$.
5. **Print Layout**:
   - If grid has fewer than 3 rows: `"No data to Print..."` (`0xCE07AF`).
   - Otherwise, exports printable Material Requirement Analysis sheet.

---

## 2. Bytecode Provenance & Mapping

| VB6 Routine | Bytecode File | Description |
|---|---|---|
| `Form_Load` | `vbdec/615463766.txt:1378` | Initializes form, checks permissions, loads component/assembly lists. |
| `optComp_Click` | `vbdec/615463766.txt:1384` | Switches to Component mode, populates component list. |
| `optAssm_Click` | `vbdec/615463766.txt:1383` | Switches to Assembly mode, populates assemblies list with "All" option. |
| `cmdView_Click` | `vbdec/615463766.txt:1369` | Validates selection (`"Select the Item "` / `" No data to calculate...."`), builds matrix columns and rows. |
| `cmdCalc_Click` | `vbdec/615463766.txt:1366` | Recalculates requirements, deficits, and required RM weights based on user-entered PO balances. |
| `optAll_Click` | `vbdec/615463766.txt:1400` | Removes column/row visibility filters. |
| `optPndgPO_Click` | `vbdec/615463766.txt:1401` | Filters columns to only non-zero PO balances. |
| `optDeficit_Click` | `vbdec/615463766.txt:1402` | Filters rows to only items with positive raw material deficit. |
| `cmdPrint_Click` | `vbdec/1159942280.txt` | Validates row count (`"No data to Print..."`), exports to Excel print preview. |

---

## 3. Database Schema
- **`assmbly_def`**: Finished assemblies and child BOM usage.
- **`comp_master`**: Component mapping to raw material `rm_id` and unit `weight`.
- **`item`**: Catalog of raw materials (`category_code = 1`), components (`category_code = 2`), and assemblies (`category_code = 3`).
- **`store_add_sub`**: Current stock balance per item (`bal_qty`).

---

## 4. API Endpoints
- `GET /api/mat-req`: Returns assemblies, parts with utility cross-reference, current stock, and component raw material conversion weights.
- `GET /api/print?type=mat-req&...`: Produces printable Material Requirement matrix document.
