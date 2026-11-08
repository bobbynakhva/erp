# Sales / Labour -> Labour -> Invoice (`frmInvoiceL`) Specification

## 1. Overview & Window Identity
- **Form Name**: `frmInvoiceL`
- **Window Title**: `Invoice`
- **Menu Path**: `Sales / Labour -> Labour -> Invoice`
- **Screenshot Reference**: `SCREENSHOTS/SALES_LABOUR/LABOUR/004_invoice.png`
- **Primary Database Tables**: `dcoutgoinginv`, `dcoutgoingsubinv`
- **Linked Modules**:
  - Upstream Dispatched Challans: DC Outwards (`frmDCOutgoing`)
  - Work Order Master: Labour PO (`frmLabourPO`)
  - Customer Raw Material Delivery: DC Inwards (`frmDCIncoming`)
  - Customer Master: `customer`
  - Currency Master: `currency_type`, `currency_today`
  - EOU / Export: ARE-1, ARE-3, CT-3, Annexure D-3 (`frmEOUAgnstInv`)

---

## 2. UI Layout & Controls

### Left Panel: "Select Customer & D.C. No."
- **To Customer** (`invlab-cust`):
  - In `New` mode: Displays customers who have un-invoiced outgoing Delivery Challans (`dcoutgoinginv` where `invno IS NULL`).
  - In `View` / `Modify`: Displays all customers who have invoices.
- **\* To Party Other than Consignee (Customer)** (`invlab-alt-cust`):
  - Optional secondary customer / delivery destination dropdown.
- **DC No `Ctrl + Left Mouse Button`** (`invlab-dcs`):
  - Multi-select listbox of open outgoing DCs for the selected customer.
  - Selecting DC(s) auto-populates the item grid with dispatched products and PO rates/discounts.
- **\* Remarks** (`invlab-rem`):
  - Invoice header remarks / notes.
- **Post Process---> [ Debit Note ]** (`invlab-btn-debit`):
  - Integration with downstream Debit Note.

### Right Panel: "Auto Running No. & Tax Details"
- **Invoice No** (`invlab-no`): Running continuous invoice numbering.
- **Invoice Date & Time** (`invlab-date`, `invlab-time`): Date and time picker.
- **\* Payment Terms** (`invlab-payterm`): Payment term description (e.g. 30 Days).
- **\* P & F @** (`invlab-pf-perc`, `invlab-pf-rs`): Percentage or lump sum Rs.
- **Exc Duty / Service Tax @** (`invlab-excise`): Service tax / excise percentage on labour.
- **\* Cess On ED** (`invlab-cess-ed`): Cess percentage on excise/service tax.
- **\* Higher Ed. Cess On ED** (`invlab-high-cess-ed`): Higher education cess percentage.
- **\* CST @** (`invlab-cst`): CST percentage with checkbox `[ ] Against Form 'C'` (`invlab-chk-c`).
- **\* SurCharge** (`invlab-surchrg`): Surcharge in Rs with checkbox `[ ] Form 37` (`invlab-chk-37`).
- **\* VAT @** (`invlab-vat`): VAT percentage with checkbox `[ ] Form 'H' / No Taxes` (`invlab-chk-h`).
- **\* Other Charges** (`invlab-other-chrg`): Flat other charges in Rs.
- **Total Invoice Value** (`invlab-tot-val`, `invlab-curr`): Computed total value and currency selector.

### Item Grid
Columns:
1. `SlNo`: Row index (1, 2, 3...)
2. `Particulars`: Item Code and Item Description / Process Name
3. `Qty`: Dispatched quantity from selected DC(s)
4. `Rate`: Agreed job-work unit rate (editable)
5. `Discount`: Discount % (editable)
6. `Amount`: `(Qty * Rate) * (1 - Discount / 100)`

### Bottom Bar & Actions
- **Item / UOM Guide**: Displays selected line's item code, name, and unit of measurement.
- **Search Inv. No.**: Quick find box by Invoice Number.
- **Printers**:
  - `Tax Invoice Printer`: A4 Printable preview with full customer, DC, PO, line-item, and tax summary details.
  - `Exc. Invoice Printer`: Excise / Rule 11 Job Work invoice layout.
  - `Exp. Invoice Printer`: Export invoice layout.
- **Action Buttons**:
  - `[ New ]`: Initiates fresh Labour Invoice creation.
  - `[ Save ]`: Validates and commits invoice to `dcoutgoinginv` and `dcoutgoingsubinv`.
  - `[ Delete ]`: Un-invoices DCs and clears invoice details.
  - `[ |<< ] [ << ] [ >> ] [ >>| ]`: First, Previous, Next, Last record navigation.
  - `[ EOU ]`: Opens EOU dialog for ARE-1 / ARE-3 and Annexure D-3 management.
  - `[ Close ]`: Hides window.

---

## 3. Backend Endpoints
- `GET /api/labour-invoice?new=1` / `?invNo=...`
- `GET /api/labour-invoice/customer-dcs?custId=...`
- `GET /api/labour-invoice/dc-lines?dcIds=...`
- `POST /api/labour-invoice/save`
- `POST /api/labour-invoice/delete`
- `POST /api/labour-invoice/eou`
