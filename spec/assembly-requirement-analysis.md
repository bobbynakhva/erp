# Assembly Requirement Analysis (`frmAssmReqAnaly`) Specification

## 1. Overview & Business Workflow
The **Assembly Requirement Analysis** module (`frmAssmReqAnaly`, accessed via `Planning -> Assembly Requirement Analysis`, screenshot `SCREENSHOTS/PLANNING/001_assembly_requirement_analysis.png`) analyzes the component parts, raw materials, utility ratios, and warehouse stock levels required to produce a given quantity of a finished or sub-assembly item. It calculates net material deficiencies and computes the maximum number of assemblies that can be manufactured given current on-hand stock.

### Workflow Summary:
1. **Assembly Selection**:
   - The user selects an assembly from the Assembly list / TreeView (`tviewAssembly`). Assemblies are items configured with Category Code 3 (or containing active BOM definitions in `assmbly_def`).
   - Quick search input (`txtSearch`) allows filtering the assembly list by name or part code.
2. **Requirement Definition**:
   - The user inputs the planned assembly production quantity into `txtReqQty` (defaults to 1).
   - Clicking `Details` (`cmdDetails`) retrieves the Bill of Materials (`assmbly_def`) and warehouse stock balances (`store_add_sub.bal_qty`).
3. **Requirement & Stock Calculations**:
   - For each component item $i$ in the assembly:
     - $\text{Utility Ratio} = \text{util\_qty}$
     - $\text{Req. Qty} = \text{util\_qty} \times \text{txtReqQty}$
     - $\text{On Hand Stock} = \sum \text{bal\_qty}$ for item $i$ from `store_add_sub`
     - $\text{Deficit Qty}$:
       $$\text{Deficit} = \begin{cases} \text{Req. Qty} - \text{On Hand}, & \text{if } \text{On Hand} < \text{Req. Qty} \\ \text{"No Deficiency"}, & \text{if } \text{On Hand} \ge \text{Req. Qty} \end{cases}$$
4. **Assembly Capacity Estimation**:
   - Evaluates the bottleneck component across all non-zero utility items:
     $$\text{Possible Assemblies} = \min_{i \in \text{components}} \left\lfloor \frac{\text{On Hand}_i}{\text{util\_qty}_i} \right\rfloor$$
   - Displays: `"No. of Possible Assemblies : " + Possible Assemblies`.
5. **Print Layout**:
   - Guard: If the report grid is empty, displays `"No data to Print..."` (`0xDD3735`).
   - Renders a formal report with company letterhead, Assembly code, Required Qty, itemized component BOM requirements, on-hand stocks, deficits, and total possible assembly count.

---

## 2. Bytecode Provenance & Mapping

| VB6 Routine | Bytecode File | Description |
|---|---|---|
| `Form_Load` | `vbdec/615463766.txt:1698` | Loads assembly tree/list from `item` where `category_code = 3` and BOM exists in `assmbly_def`. |
| `cmdDetails_Click` | `vbdec/725885555.txt` | Reads selected assembly and `txtReqQty`, queries `StoreAddsub` stock, populates flex grid. |
| `txtReqQty_Change` | `vbdec/2063378941.txt:87` | Recalculates required quantities, deficits, and possible assemblies dynamically on quantity change. |
| `cmdPrint_Click` | `vbdec/1395079226.txt` | Checks for rows (`"No data to Print..."`), exports report to `\Xl\AssmReqAnalysis.xlt`. |
| `txtSearch_KeyPress` | `vbdec/2063378941.txt:92` | On Enter key, locates matching assembly in list and triggers detail loading. |

---

## 3. Database Schema
- **`assmbly_def`**:
  - `assmbly_id integer`: Finished assembly `item_id`.
  - `sl_no integer`: BOM item line number.
  - `item_id integer`: Component/raw material `item_id`.
  - `util_qty double precision`: Quantity of component required per 1 unit of assembly.
- **`item`**:
  - `item_id integer PRIMARY KEY`
  - `item_code text`, `item_name text`, `category_code integer`, `measure_unit text`.
- **`store_add_sub`**:
  - `item_id integer`, `bal_qty double precision`: On-hand balance per stock batch.

---

## 4. API Endpoints
- `GET /api/assm-req`: Returns list of all defined assemblies with their child BOM items, utility ratios, and current on-hand stock balances.
- `GET /api/print?type=assm-req&id=<assmblyId>&qty=<qty>`: Produces printable Assembly Requirement Analysis report.
