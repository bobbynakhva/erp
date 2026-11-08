# Estimation (`frmEstimation`) Specification

## 1. Overview
The Estimation module ports legacy Visual Basic 6 form `frmEstimation` to the web-based Smart ERP architecture. It allows engineers to estimate the manufacturing cost of parts and assemblies based on raw material requirements (square section and round section geometry) and multi-step machining operations (hourly rates × hours). It calculates overheads, profit margins, risk factors, and produces the final grand total cost.

---

## 2. Legacy VB6 Reference Architecture

| Attribute | Legacy VB6 Implementation | Web / Node.js Endpoint |
|---|---|---|
| **Form Name** | `frmEstimation` | Section `#esti` in `index.html` |
| **Menu Access** | `mnuEsti` (Planning → Estimation) | `app.js` -> `window.openEsti()` |
| **Database Tables** | `Estimate`, `EstimateSub`, `Item`, `Customer`, `ProcessID`, `Misc` | `estimate`, `estimate_sub`, `item`, `customer`, `process_id`, `misc` |
| **Primary Code Files** | `vbdec/387207520.txt` (Form_Load)<br>`vbdec/1328200421.txt` (cmdNew)<br>`vbdec/581061589.txt` (cmdSave)<br>`vbdec/2074831388.txt` (cmdModify)<br>`vbdec/1938812518.txt` (cmdDelete)<br>`vbdec/1518374891.txt` (cmdPrint)<br>`vbdec/1584348345.txt` (Proc_DD977C Validations)<br>`vbdec/245236208.txt` (Proc_DB6390 Cost Calculations)<br>`vbdec/1904930774.txt` (SubTot Operations Sum)<br>`vbdec/272244188.txt` (SetFlex Grid Setup)<br>`vbdec/2135434535.txt` (Proc_CA9614 Record Deletion)<br>`vbdec/1556375013.txt` (Proc_E6D134 Excel Print Template) | `smart-erp/server.js`<br>`smart-erp/public/esti.js` |

---

## 3. Data Dictionary & Mathematical Calculations

### Header (`estimate`)
- `id`: Auto-incrementing integer identifier (1-based per factory and financial year).
- `sno`: Serial number (text).
- `item_id`: Item Master reference (drawing number).
- `qty`: Part batch/lot quantity (numeric).
- `contact`: Kind Attn / Contact reference (text).
- `dat`: Date string (text / date).
- `typeofwork`: Type of work (e.g. "Manufacturing Work" / "Labour Work") (text).
- `cust_id`: Customer foreign key reference.
- **Square Section Raw Material**:
  - `mtlsqr`: Material type / description.
  - `fnsizesqr`: Finish size.
  - `rmthsqr`: Thickness in mm.
  - `rmwdsqr`: Width in mm.
  - `rmlensqr`: Length in mm.
  - `densqr`: Density in g/cm³.
  - `rmkgsqr`: Weight in kg. Formula: `Round((rmlensqr * rmthsqr * rmwdsqr * densqr) / 1,000,000, 2)`.
  - `rmratesqr`: Raw material rate per kg.
  - `rmcostsqr`: Total square section RM cost: `Round(rmratesqr * rmkgsqr, 2)`.
- **Round Section Raw Material**:
  - `mtlrnd`: Material type / description.
  - `fnsizernd`: Finish size.
  - `rmdiarnd`: Diameter in mm.
  - `rmlenrnd`: Length in mm.
  - `densityrnd`: Density in g/cm³.
  - `rmkgrnd`: Weight in kg. Formula: `(3.14 * rmdiarnd * rmdiarnd / 4 * rmlenrnd * densityrnd) / 1,000,000`.
  - `rmratrnd`: Raw material rate per kg.
  - `rmcostnd`: Total round section RM cost: `Round(rmratrnd * rmkgrnd, 2)`.
- **Totals & Markups**:
  - `totalrmcost`: `rmcostsqr + rmcostnd`.
  - `conv`: Conversion cost (sum of process hourly rate × hours).
  - `totalcost`: `conv + totalrmcost`.
  - `overp`: Overheads percentage.
  - `over_amt`: Overheads amount (`totalcost * overp / 100`).
  - `marp`: Margin / Profit percentage.
  - `mar_amt`: Margin amount (`totalcost * marp / 100`).
  - `riskp`: Risk factor percentage.
  - `risk_amt`: Risk factor amount (`totalcost * riskp / 100`).
  - `grand`: Grand total (`Round(totalcost + over_amt + mar_amt + risk_amt, 2)`).

### Grid Lines (`estimate_sub`)
- `id`: Header reference.
- `proc_id`: Process ID reference from `process_id`.
- `hrly_rate`: Process hourly machine/labour rate.
- `hrs`: Hours consumed for this operation.
- Calculated Line Amount: `hrly_rate * hrs`.

---

## 4. Exact Legacy VB6 Validations & Confirmation Strings

1. **Customer**:
   - `cmbCust` must be selected. If missing:
     `"Please select the Customer Name"`
2. **Serial Number**:
   - `txtSno` must not be blank:
     `"Please Enter the Serial Number "`
3. **Drawing Number**:
   - `cmbDwgno` must not be blank:
     `"Please Enter the Drawing Number "`
   - Drawing number must exist in Item Master (`Item`):
     `"Please Enter the Valid Drawing Number "`
4. **Part Name**:
   - `txtPartname` must not be blank:
     `"Please Enter the Part Name"`
5. **Quantity**:
   - `txtQty` must be non-zero / non-empty:
     `"Please Enter the Quantity"`
6. **Reference**:
   - `txtRef` must not be blank:
     `"Please Enter the Reference "`
7. **Date**:
   - `txtDate` must not be blank:
     `"Please Enter the Date"`
8. **Type of Work**:
   - `txtTypeofWork` must not be blank:
     `"Please Enter the Type of Work  'Manufacturing/Labour Work'"`
9. **Grand Total**:
   - `txtGrand` must be strictly greater than 0:
     `" Grand Total Should Not be  Zero !!!"`
10. **Confirmations**:
    - Save: `"Are You Sure To Save?"`
    - Modify: `"Are You Sure To Modify?"`
    - Delete: `"Are You Sure To Delete?"`
11. **Notifications**:
    - On Save/Modify success: `"Records Stored"`
    - On Delete success: `"Records Deleted"`
    - When no records found: `"No Records to display!"`
