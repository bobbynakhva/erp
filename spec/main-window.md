# Main window

Form: `mdiSSI`. Layout image: `G:\ERP SS\MENUS\MAIN SCREEN.png`. The submenu words are the words on the other 18 files in `G:\ERP SS\MENUS`. Which form each entry opens is in [module-index.md](module-index.md).

## What the picture shows

- Title bar: `Bilva Technologies Pvt. Ltd.`
- Orange bar across the top with a `>>` button at the left of that bar.
- Left sidebar, top to bottom: Master, Production, Planning, Inventory, Purchase, Sales / Labour, Sub Contract, Cash Flow, Human Resource, Maintenance, Inspection, Utilities, Exit.
- Under Exit, in red: `User:` and the name, then `Logged In:` and the time.
- The rest of the window is the water-ripple picture and the words `The SMART Application` with `Simple Manufacturing & Administrative Recording Tool` under `SMART`.

The web shell uses this order and these words. Utilities in the web shell lists Conversion only. The other Utilities entries stay off that menu.

## What the clicks do

`lblMaster_Click` reads the Master label's position and opens `mnuMaster` with `PopupMenu`.

`lblProd_Click` opens `mnuProduction` with `PopupMenu`.

`lblExit_Click` unloads `mdiSSI`.

The other sidebar labels have click handlers (`lblPlan_Click`, `lblInventory_Click`, `lblPurchase_Click`, `lblSales_Click`, `lblSubContract_Click`, `lblCash_Click`, `lblStaffWelf_Click`, `lblMaintain_Click`, `lblInspection_Click`, `lblUtilities_Click`). Each one is the same kind of handler. Only Master, Production, and Exit were read line by line for this spec. The others are not described beyond the menu pictures until those procedures are read.

`mnuBack_Click` and `mnuFront_Click` do not open a form. They are not items on the photographed menus.

## Submenus, in the order on the images

Master

- Admin: Users, User Rights, User Status
- Human Resource: Employee Details, Shift Allocation, Salary Headings
- General: Machine, Customer (Sales/Labour), Supplier (SubContract), Vendor (Purchase)
- Inventory: Category, Item, Bill Of Materials, Stores (Warehouses)
- Process
- Accounts: Expense, Income, Bank Details, Currency, Currency Today, CostCenter
- My Company Details

Production: Production Log, Internal Work Order cum Material Issue, Produced Material - Return, Store Credit Note

Planning: Assembly - Requirement Analysis, Material - Requirement Analysis, Production Plan Chart, Production Capacity, Production Schedule, Estimation

Inventory: Stock Position, Material Issue Note, Tool Crib, Store Credit Note (General), Inter-Store Transfer

Purchase: Enquiry, Purchase Order - Outgoing, Goods Received Note, Store Credit Note, Invoice Inwards

Sales / Labour: Quotation, then Manufacturing (Purchase Order - Inwards, DC, Invoice), then Labour (Work Order - Inwards, DC Inwards, DC Outwards, Invoice)

Sub Contract: Work Order - Outwards, DC Outwards, Goods Received Note, Store Credit Note, Invoice Inwards

Cash Flow: Payments, Receipts, Bank Transactions, Advance Adjustments

Human Resource: Attendance, Salary, Staff Loan

Maintenance: Maintenance Schedule, Maintenance Process, BreakDown Maintenance, Calibration History and Maintenance

Inspection: Manufacturing & Labour (Random Samples, Individual Samples), SubContract, Inspection COMMON

Utilities on the old program: Correspondences, Calculator, Conversion, MESSENGER, Organiser, Compact Database. The web menu keeps Conversion only.

## After login

`Proc_E0B74C` writes `Bilva Technologies Pvt. Ltd.` onto this window and calls `mdiSSI.Show`. The user name and the logged-in time on the sidebar are visible in the screenshot. The procedure that writes those two red lines was not read for this spec.

An entry that is not built yet stays on the menu and opens a plain "not built yet" state. It does not open a made-up screen.

## UNKNOWN, left uncoded

- What the `>>` button does.
- The line-by-line popup behaviour of every sidebar label except Master, Production, and Exit.
- Which procedure writes `User:` and `Logged In:` on the sidebar.
- Access keys or underlined shortcuts. None are claimed from the pictures.
