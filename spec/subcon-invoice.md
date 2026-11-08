# Sub Contract - Invoice Inwards (`frmInvoiceSC`) Specification

## 1. Overview & Business Workflow
The **Sub Contract Invoice Inwards** module (`frmInvoiceSC`, accessed via `Sub Contract -> Invoice Inwards`, screenshot `SCREENSHOTS/CONTRACT/005_invoice_inwards.png`) bills and records supplier invoices received against one or multiple inspected Delivery Challans (GRNs) for subcontracting work.

### Workflow Summary:
1. When subcontractor goods are inspected and cleared via Store Credit Note (`frmDcSubConStoreCrNote`, `scnsubconid > 0`), the accepted quantities (`accpqty > 0`) become eligible for invoicing.
2. In `frmInvoiceSC`:
   - The user selects a SubContractor (Supplier).
   - The system loads all unbilled GRNs (`invno IS NULL AND scnsubconid > 0 AND accpqty > 0`).
   - The user selects one or more Delivery Challans (multi-DC selection via listbox or single DC if `subcon1to1` policy is enabled).
   - All accepted line items are populated into the invoice grid (`msflex`).
   - Rates and discount percentages default from the SubContract Purchase Order (`subconposub`) or prior invoice rates.
   - The user enters invoice metadata: `Invoice No`, `Invoice Date`, `Receipt Date`, `Payment Terms`, and taxes/charges (`P & F`, `VAT %`, `Service Tax %`, `Cess on ST %`, `Higher Edu Cess on ST %`, `Other Charges`).
3. Total Invoice Value Calculation (`txtTotVal_DblClick`):
   - $\text{Basic Total} = \sum \left(\text{AccpQty} \times \text{Rate} \times \left(1 - \frac{\text{Disc}}{100}\right)\right)$
   - $\text{VAT} = \text{Basic Total} \times \frac{\text{VAT}\%}{100}$
   - $\text{Cess on ST} = (\text{Basic Total} + \text{VAT}) \times \frac{\text{ServiceTax}\%}{100} \times \frac{\text{CessOnST}\%}{100}$
   - $\text{Higher Edu Cess} = \text{Basic Total} \times \frac{\text{ServiceTax}\%}{100} \times \frac{\text{HighCess}\%}{100}$
   - $\text{Service Tax Value} = (\text{Basic Total} + \text{VAT}) \times \frac{\text{ServiceTax}\%}{100} + \text{Cess on ST}$
   - $\text{Total Invoice Value} = \text{Basic Total} + \text{VAT} + \text{Service Tax Value} + \text{Higher Edu Cess} + \text{Other Charges} + \text{P \& F}$
   - If `roffsubcon` (round-off) is enabled in `misc`, rounded to nearest whole integer; otherwise formatted to 2 decimals.
4. Saving:
   - Updates `dcsubconincoming` for all billed DCs: `invno`, `invdate`, `invdatet`, `recdate`, `packforwd`, `anyotherchrg`, `payterm`, `vat`, `totval`, `balance = totval`, `creditamt = 0`, `creditrem = ''`, `servtax`, `cessonservtax`, `highcessonservtax`, `invrem`, `invsign = true`.
   - Updates `dcsubconincomingsub` for all line items: `rate`, `discount`, `amount`.
5. Downstream Protection & Constraints:
   - Modification is blocked if payments or debit notes have altered balance: `totval <> balance` -> `"Modification not allowed  in this Context!!!"`.
   - Deletion is blocked if cash flow has occurred: `totval <> balance` -> `"Deletion not allowed , since some Cash Flow has been made in this Regard!!!"`.
   - Deletion is blocked if material has been issued from destination store (`bal_qty <> qty` and `red_stk_sc = true`) -> `"Deletion  not Allowed, Since Some material has been issued  in this Bill Regard!!!"`.
   - On deletion, clears all invoice columns from `dcsubconincoming` and resets `rate = 0, discount = 0, amount = 0` on `dcsubconincomingsub`.

---

## 2. Bytecode Provenance & Mapping
Reverse-engineered directly from disassembled VB6 routines:

| VB6 Routine | Source File | Description |
|---|---|---|
| `Form_Load` | `vbdec/1034171124.txt` | Form setup, UserRights check, combo population, loads last invoice via `cmdMoveLast_Click`. |
| `cmbSupp_Click` | `vbdec/1121839154.txt` | Populates open GRNs for selected supplier: `where suppId=<id> and InvNo is Null and SCNSubConId>0 and dcid in (select dcid from DcSubConIncomingSub where AccpQty>0)`. |
| `lstDcNo_Click` | `vbdec/532644780.txt` | Multi-DC selection, policy enforcement (`subcon1to1` single-DC restriction). |
| `Proc_CEC23C` | `vbdec/622699587.txt` | Gathers selected DCs and triggers header (`Proc_E11F64`) and line loading (`Proc_E53C38`). |
| `Proc_E53C38` | `vbdec/2042530657.txt` | Loads accepted line items (`AccpQty > 0`), resolves PO rates fallback from `subconposub`. |
| `txtTotVal_DblClick` | `vbdec/772524513.txt` | Exact tax calculations: Basic Total, VAT, Service Tax, Cess, Higher Edu Cess, Other Charges, Round Off policy. |
| `Proc_D231EC` | `vbdec/2018750632.txt` | Header validations: supplier, invoice number, DC selection, positive invoice value. |
| `Proc_CB4680` | `vbdec/1608871729.txt` | Grid validations: non-empty grid, per-row valid rate check (`rate > 0`). |
| `Proc_C7ADC4` | `vbdec/1663792760.txt` | Modification downstream check (`totval <> balance`). |
| `Proc_E283DC` | `vbdec/332239007.txt` | Header save logic updating `dcsubconincoming` across all selected DCs. |
| `Proc_CFB0F0` | `vbdec/1473169480.txt` | Line save logic updating `rate` and `discount` on `dcsubconincomingsub`. |
| `cmdDelete_Click` | `vbdec/787892777.txt` | Deletion checks (Cash Flow & Issued Stock), clears invoice columns, resets line rates to 0. |

---

## 3. Database Schema & State Transitions
- **`dcsubconincoming`**:
  - `invno text`: Supplier's invoice number.
  - `invdate date`: Date of the invoice.
  - `invdatet text`: Formatted invoice date (`dd-mm-yyyy`).
  - `recdate date`: Receipt date of invoice.
  - `packforwd double precision`: Packing & Forwarding charges in Rs.
  - `vat double precision`: VAT rate in %.
  - `servtax double precision`: Service Tax rate in %.
  - `cessonservtax double precision`: Cess on Service Tax in %.
  - `highcessonservtax double precision`: Higher Education Cess on Service Tax in %.
  - `anyotherchrg double precision`: Other miscellaneous charges in Rs.
  - `payterm text`: Payment terms.
  - `totval double precision`: Total invoice value in Rs.
  - `balance double precision`: Remaining balance (initialized to `totval`).
  - `creditamt double precision`: Credit amount (default 0).
  - `creditrem text`: Credit remarks.
  - `invrem text`: Invoice remarks.
  - `invsign boolean`: Invoice status flag (`true` when billed).
- **`dcsubconincomingsub`**:
  - `rate double precision`: Billing rate per unit.
  - `discount double precision`: Discount percentage per item.
  - `amount double precision`: Line total amount $\text{AccpQty} \times \text{Rate} \times (1 - \text{Discount}/100)$.

---

## 4. API Endpoints
- `GET /api/subcon-invoice`: Returns invoice bundle with navigation (`new=1`, `first=1`, `prev=1`, `next=1`, `last=1`, `no=...`, `id=...`).
- `GET /api/subcon-invoice/supplier-dcs`: Returns open eligible DCs for selected supplier.
- `GET /api/subcon-invoice/dc-lines`: Returns line items for selected DCs with PO rate fallback.
- `POST /api/subcon-invoice/save`: Transactional save / modify with all 7 legacy validation checks.
- `POST /api/subcon-invoice/delete`: Transactional deletion with cash flow and stock draw protection.
- `GET /api/print?type=subcon-invoice&invNo=...&suppId=...`: Complete professional print layout with company letterhead, metadata, items, tax summary, and signature blocks.

---

## 5. Verification & Test Suite
Automated regression test suite in `test_subcon_invoice_simulation.js`:
- Complete lifecycle: GRN lookup -> Line retrieval -> Validation checks -> Save -> Navigation -> Modification block -> Deletion blocks -> Print layout -> Successful Deletion.
- Zero regressions across all 13 system-wide simulation tests:
  - `test_dc_simulation.js`
  - `test_invoice_simulation.js`
  - `test_labourpo_simulation.js`
  - `test_labour_dcin_simulation.js`
  - `test_labour_dcout_simulation.js`
  - `test_labour_invoice_simulation.js`
  - `test_mfgpo_simulation.js`
  - `test_quote_simulation.js`
  - `test_subconpo_simulation.js`
  - `test_subcon_dcout_simulation.js`
  - `test_subcon_dcin_simulation.js`
  - `test_subcon_scn_simulation.js`
  - `test_subcon_invoice_simulation.js`
