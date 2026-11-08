# SMART module index

Sources: the 19 menu images in `G:\ERP SS\MENUS`, the screen images under `G:\ERP SS`, and the menu-click procedures in `vbdec`. A handler is listed only when that click procedure names the form. Table names are words that follow `from`, `join`, `into`, or `update` inside that form's own procedures. `userrights` and `ViewRights` show up on almost every form as the rights check, so they are not repeated on each line. Mixed spellings of the same table are collapsed. `smart-erp-modern` was not used.

This index does not list columns. The dummy MDB column layouts are not the source for columns.

## How to read a row

- **Proven** means the click procedure names that form.
- **By controls** means the form's control names match the screenshot, and the click procedure names that form, even when the internal menu name is different.
- **By remaining handler** means the other entries in that menu already have their own proven forms, and one click is left. Confirm this on the old program before that screen is coded.
- **Design** means there is no screenshot. Recovered SQL stays. The layout is designed later and waits for sign-off.
- **Out of scope** means the entry stays out of the web menu.

## Login and main window

| Screen | Image | Form | Notes |
| --- | --- | --- | --- |
| Login | chat image, not in `G:\ERP SS` | `frmLogin` | Spec: [login.md](login.md) |
| Main window | `MENUS\MAIN SCREEN.png` | `mdiSSI` | Spec: [main-window.md](main-window.md) |

## Master

| Menu label | Screenshot | Handler | Form | Match | Business tables touched by that form |
| --- | --- | --- | --- | --- | --- |
| My Company Details | `MASTER\002_my_company_details.png` | `mnuMisc_Click` | `frmMisc` | By controls. The screenshot buttons and fields match `cmdMore`, `cmdPT`, `lblProd`, `lblEOU`, `cmdModify`, `cmdExit`, the round-off checkboxes, the book-type options, the tax boxes, and the document prefixes. | Misc |
| Admin → Users | `MASTER\ADMIN\001_users.png` | `mnuUser_Click` | `frmUserEntry` | Proven | user1 |
| Admin → User Rights | none | `mnuUserRight_Click` | `frmUserRights` | Proven. Design. | user1, ViewRights, userRights |
| Admin → User Status | `MASTER\ADMIN\003_user_status.png` | `mnuUserStatus_Click` | `frmViewImpSys` | Proven | ImpSystems, License, OnlineUsers |
| Human Resource → Employee Details | `MASTER\HUMAN_RESOURCE\001_employee_details.png` | `mnuStaff_Click` | `frmStaff` | Proven | Attendance, DailyProd, FundTrans, Salary, Staff, StaffLoan |
| Human Resource → Shift Allocation | `MASTER\HUMAN_RESOURCE\002_shift_allocation.png` | `mnuShiftAlloc_Click` | `frmShiftAlloc` | Proven | Misc, Staff |
| Human Resource → Salary Headings | none | `mnuSalHead_Click` | `frmColHeadingPR` | Proven. Design. | SalaryPrint |
| General → Machine | `MASTER\GENERAL\001_machine.png` | `mnuMachine_Click` | `frmMachine` | Proven | BrkDown, DailyProd, Machine, MaintainSch |
| General → Customer (Sales/Labour) | `MASTER\GENERAL\002_customer_sales&labour.png` | `mnuCustomer_Click` | `frmCustomer` | Proven | BusinessType, Customer, CustomerIndirect, DailyProd, DCIncoming, DCINV, FundTrans, InspectionInde, LABPO, MfgPO, ProdnIWOIss, QUOTE |
| General → Supplier (SubContract) | `MASTER\GENERAL\003_supplier_subcontract.png` | `mnuSupplier_Click` | `frmSupplier` | Proven | BusinessType, DCSUBCONOUTGOING, FundTrans, SubConPO, SUPPLIER |
| General → Vendor (Purchase) | `MASTER\GENERAL\004_vendor_purchase.png` | `mnuVendor_Click` | `frmVendor` | Proven | BusinessType, FundTrans, Purchase, PurchPO, Vendor, VendorInDirect |
| Inventory → Category | `MASTER\INVENTORY\001_category.png` | `mnuCategory_Click` | `frmCategory` | Proven | CATEGORY, Item, PurchaseSub, PurchPOSub |
| Inventory → Item | `MASTER\INVENTORY\002_item-inventory.png` | `mnuItem_Click` | `frmItem` | Proven | AssmblyDef, CATEGORY, CompMaster, DailyProd, DcIncomingSub, DCINVSUB, DcSubConOutgoingSub, Estimate, InspectionIn, InspectionInde, Item, ItemSub, LABPOsub, Measurement, MfgPOSub, PurchaseSub, PurchPOSub, QuoteSub, StoreAddSUB |
| Inventory → Bill Of Materials | `MASTER\INVENTORY\003_bill_of_materials.png` | `mnuBOM_Click` | `frmStkRedDefine` | Proven. The internal form name is not "BOM". | AssmblyDef, CATEGORY, Item |
| Inventory → Stores (Warehouses) | `MASTER\INVENTORY\004_stores_warehouse.png` | `mnuStores_Click` | `frmStores` | Proven | StoreAdd, StoreMAP, Stores |
| Process | `MASTER\001_process.png` | `mnuProcId_Click` | `frmProcessID` | Proven | EstimateSub, ProcessID |
| Accounts → Expense | `MASTER\ACCOUNTS\001_expense.png` | `mnuExpense_Click` | `frmExpense` | Proven | EXPENSE, FundTrans |
| Accounts → Income | `MASTER\ACCOUNTS\002_income.png` | `mnuIncome_Click` | `frmIncome` | Proven | FundTrans, INCOME |
| Accounts → Bank Details | `MASTER\ACCOUNTS\003_bank_details.png` | `mnuBank_Click` | `frmBanks` | Proven | Banks, BankTrans, FundTrans |
| Accounts → Currency | `MASTER\ACCOUNTS\004_currency.png` | `mnuCurrency_Click` | `frmCurrency` | Proven | CurrencyToday, CurrencyType |
| Accounts → Currency Today | `MASTER\ACCOUNTS\005_currency_today.png` | `mnuCurrToday_Click` | `frmCurrToday` | Proven | CurrencyToday, CurrencyType |
| Accounts → CostCenter | `MASTER\ACCOUNTS\006_cost_centre.png` | `mnuCostCntr_Click` | `frmCostCenter` | Proven | CostCenter, Purchase |

`frmCompMaster` is not the company screen. It is opened from `frmItem.lblMoreDet_Click`.

## Production

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Production Log | `PRODUCTION\001_production_log.png` | `mnuProductionLog_Click` | `frmProdn` | Proven | Customer, DailyProd, DailyProdsub, Item, Machine, ProdEffConstraints, STAFF |
| Internal Work Order cum Material Issue | `PRODUCTION\002_internal_work_order_cum_material_issue.png` | `mnuIWOIss_Click` | `frmProdnWOIssue` | Proven | AssmblyDef, AutoCITI, CompMaster, CostCenter, Customer, Item, ItemSub, MfgPO, Misc, PrintInfo, ProdnIWOIss, ProdnIWOissSub, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Produced Material - Return | `PRODUCTION\003_production_material_return_note.png` | `mnuIWOret_Click` | `frmProdnWOReturn` | Proven | AutoCITS, CostCenter, Item, Misc, ProdnIWOIss, ProdnIWOissSub, ProdnIWORet, ProdnIWORetSub, ProductL, ProductS, StoreAdd, StoreAddSUB, StoreMAP, Stores |
| Store Credit Note | `PRODUCTION\004_store_credit_note_production.png` | `mnuProdnStoreCrNote_Click` | `frmProdnStoreCrNote` | Proven | AutoCITI, AutoCITS, CostCenter, Item, ProdnIWORet, ProdnIWORetSub, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |

## Planning

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Assembly - Requirement Analysis | `PLANNING\001_assembly_requirement_analysis.png` | `mnuAssmReqAnaly_Click` | `frmAssmReqAnaly` | Proven | AssmblyDef, CATEGORY, Item, Misc |
| Material - Requirement Analysis | `PLANNING\002_material_requirement_analysis.png` | `mnuMatlReqAnaly_Click` | `frmMatReqAnaly` | Proven | AssmblyDef, CATEGORY, CompMaster, Item, MfgPOSub, StoreAddSUB |
| Production Plan Chart | `PLANNING\003_production_plan_chart.png` | `mnuPlanChart_Click` | `frmPlanY` | Proven | Item, itm_legend, Machine, planchart |
| Production Capacity | `PLANNING\004_production_capacity_planningg_left_columns.png` and `PLANNING\004_production_capacity_planningg_right_columns.png` | `mnuPlanProdCapa_Click` | `frmPlanProdCapacity` | Proven | Item, PlanProdCapa, ProcessID |
| Production Schedule | `PLANNING\005_production_schedule.png` | `mnuProdSchd_Click` | `frmProdSchedule` | Proven | DCINV, DCINVSUB, DCOUTGOINGINV, DcOutgoingSubInv, Item, Month1, ProdSchd, ProdSchdSub |
| Estimation | `PLANNING\006_estimation.png` | `mnuEsti_Click` | `frmEstimation` | Proven | AssmblyDef, Customer, Estimate, EstimateSub, Item, Misc, ProcessID |

## Inventory

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Stock Position | `INVENTORY\001_stock_position.png` | `mnuStock_Click` | `frmStock` | Proven | CATEGORY, Item, StoreAdd, StoreAddSUB, Stores |
| Material Issue Note | `INVENTORY\002_material_issue_note.png` | `mnuStkIssueBill_Click` | `frmStockIssue` | Proven | AssmblyDef, AutoCITI, CostCenter, Item, MatlIssNote, MatlIssNoteSub, Misc, PrintInfo, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Tool Crib | `INVENTORY\003_tool_crib.png` | `mnuToolCrib_Click` | `frmToolCrib` | Proven | AutoCITI, CATEGORY, Item, Misc, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, Stores, TOOLCRIB |
| Store Credit Note (General) | `INVENTORY\004_store_credit_note_general.png` | `mnuSCNGen_Click` | `frmSCNGen` | Proven | AutoCITS, CostCenter, Item, SCNGen, SCNGenSub, StoreAdd, StoreAddSUB, StoreMAP, Stores |
| Inter-Store Transfer | `INVENTORY\005_inter-store_transfer.png` | `mnuStoreInterTrans_Click` | `frmStoreInterTrans` | Proven | AutoCITI, AutoCITS, CostCenter, Item, StoreAdd, StoreAddSUB, StoreInterTrans, StoreInterTransSub, StoreIss, StoreIssSub, StoreMAP, Stores |

## Purchase

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Enquiry | `PURCHASE\001_enquiry.png` | `mnuEnquiry_Click` | `frmEnquiry` | Proven | Enquiry, EnquirySub, Item, ItemSub, Measurement, Misc, PrintInfo, Vendor |
| Purchase Order - Outgoing | `PURCHASE\002_purchase_order-outgoing.png` | `mnuPurchPOout_Click` | `frmPurchasePO` | Proven | CostCenter, CurrencyToday, CurrencyType, Item, ItemSub, Measurement, Misc, PrintInfo, Purchase, PurchPO, PurchPOSub, StoreAddSUB, Vendor |
| Goods Received Note | `PURCHASE\003_goods_received_note.png` | `mnuPurchBills_Click` | `frmPurchaseGRN` | By remaining handler. The other four Purchase entries have their own proven forms. Confirm before coding. | AutoCITS, CostCenter, Item, ItemSub, Misc, PrintInfo, Purchase, PurchaseSub, PurchPO, PurchPOSub, PurchPOTrack, StoreAdd, StoreAddSUB, StoreMAP, Stores, Vendor |
| Store Credit Note | `PURCHASE\004_store_credit_note.png` | `mnuPurchStoreCrNote_Click` | `frmPurchStoreCrNote` | Proven | AutoCITI, AutoCITS, CostCenter, Item, Purchase, PurchaseSub, PurchPO, PurchPOSub, PurchPOTrack, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Invoice Inwards | `PURCHASE\005_invoice_inwards.png` | `mnuInvPurchIn_Click` | `frmInvoicePurch` | Proven | CurrencyToday, CurrencyType, DCSubConIncoming, Item, ItemSub, Misc, Purchase, PurchaseSub, PurchPO, PurchPOSub, StoreAddSUB, Vendor, VendorInDirect |

## Sales / Labour

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Quotation | `SALES_LABOUR\001_quotation.png` | `mnuQuote_Click` | `frmQuote` | Proven | Customer, Item, ItemSub, Measurement, Misc, PrintInfo, QUOTE, QuoteSub |
| Manufacturing → Purchase Order - Inwards | `SALES_LABOUR\Manufacturing\001_purchase_order_inwards.png` | `mnuMfgPOIn_Click` | `frmMfgPO` | Proven | CostCenter, CurrencyToday, CurrencyType, Customer, DCINV, Item, ItemSub, Measurement, MfgPO, MfgPOSub, Misc, PrintInfo |
| Manufacturing → DC | `SALES_LABOUR\Manufacturing\002_delivery_challan.png` | `mnuMfgDc_Click` | `frmDC` | Proven | AutoCITI, CostCenter, Customer, DCINV, DCINVSUB, DCOUTGOINGINV, DCSUBCONOUTGOING, Item, ItemSub, MfgPO, MfgPOSub, MfgPOTrack, Misc, PrintInfo, ProductS, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Manufacturing → Invoice | `SALES_LABOUR\Manufacturing\003_invoice.png` | `mnuMfgInvoice_Click` | `frmInvoice` | Proven | CurrencyToday, CurrencyType, Customer, CustomerIndirect, DCINV, DCINVSUB, DCOUTGOINGINV, Item, ItemSub, MfgPO, MfgPOSub, Misc, PrintInfo |
| Labour → Work Order - Inwards | `SALES_LABOUR\LABOUR\001_work_order_inwards.png` | `mnuLabPOIn_Click` | `frmLabourPO` | Proven | CostCenter, Customer, DCIncoming, Item, ItemSub, LABPO, LABPOsub, Measurement, Misc, PrintInfo |
| Labour → DC Inwards | `SALES_LABOUR\LABOUR\002_dc_inwards.png` | `mnuLabDCin_Click` | `frmDCIncoming` | Proven | AutoCITS, CostCenter, Customer, DCIncoming, DcIncomingSub, Item, ItemSub, LABPO, LABPOsub, Misc, StoreAdd, StoreAddSUB, StoreMAP, Stores |
| Labour → DC Outwards | `SALES_LABOUR\LABOUR\003_dc_outwards.png` | `mnuLabDcOut_Click` | `frmDCOutgoing` | Proven | AutoCITI, Customer, DCIncoming, DcIncomingSub, DCINV, DCOUTGOINGINV, DcOutgoingSubInv, DCSUBCONOUTGOING, Item, LABPO, LABPOsub, LABPOTrack, Misc, PrintInfo, ProductL, ProductS, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Labour → Invoice | `SALES_LABOUR\LABOUR\004_invoice.png` | `mnuLabInv_Click` | `frmInvoiceL` | Proven | Customer, DCINV, DCOUTGOINGINV, DcOutgoingSubInv, Item, ItemSub, LABPO, LABPOsub, Misc, PrintInfo |

## Sub Contract

Menu image: `MENUS\CONTRACT.png`. Sidebar label on the main screen: Sub Contract.

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Work Order - Outwards | `CONTRACT\001_work_order_outwards.png` | `mnuSubConPOOut_Click` | `frmSubConPO` | Proven | CostCenter, DCSUBCONOUTGOING, Item, ItemSub, Measurement, Misc, PrintInfo, SubConPO, SubConPOSub, SUPPLIER |
| DC Outwards | `CONTRACT\002_dc_outwards.png` | `mnuDcSubConOut_Click` | `frmDCSubConOut` | Proven | AssmblyDef, AutoCITI, CompMaster, CostCenter, DCINV, DCOUTGOINGINV, DCSUBCONOUTGOING, DcSubConOutgoingSub, Item, ItemSub, Misc, PrintInfo, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores, SubConPO, SubConPOSub, SUPPLIER |
| Goods Received Note | `CONTRACT\003_goods_received_note.png` | `mnuDcSubConIn_Click` | `frmDCSubConIn` | By remaining handler. Confirm before coding. | AutoCITS, DCSubConIncoming, DCSubConIncomingSub, DCSUBCONOUTGOING, DcSubConOutgoingSub, Item, Misc, PrintInfo, StoreAdd, StoreAddSUB, StoreMAP, Stores, SubConPO, SubConPOSub, SubConPOTrack, SUPPLIER |
| Store Credit Note | `CONTRACT\004_store_credit_note.png` | `mnuDcSubConStoreCrNote_Click` | `frmDcSubConStoreCrNote` | Proven | AutoCITI, AutoCITS, CostCenter, DCSubConIncoming, DCSubConIncomingSub, Item, StoreAdd, StoreAddSUB, StoreIss, StoreIssSub, StoreMAP, Stores |
| Invoice Inwards | `CONTRACT\005_invoice_inwards.png` | `mnuInvSubConIn_Click` | `frmInvoiceSC` | Proven | DCSubConIncoming, DCSubConIncomingSub, Item, ItemSub, Misc, StoreAddSUB, SubConPO, SubConPOSub, SUPPLIER |

## Cash Flow

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Payments | `CASHFLOW\001_payments.png` | `mnuPayments_Click` | `frmPayments` | Proven | Banks, BankTrans, DCSubConIncoming, EXPENSE, FundTrans, Misc, Purchase, STAFF, SUPPLIER, Vendor |
| Receipts | `CASHFLOW\002_receipts.png` | `mnuReceipts_Click` | `frmReceipts` | Proven | Banks, BankTrans, Customer, DCINV, DCOUTGOINGINV, FundTrans, INCOME, Misc |
| Bank Transactions | `CASHFLOW\003_bank_transactions.png` | `mnuBankTrans_Click` | `frmBankTrans` | Proven | Bank, Banks, BankTrans, FundTrans, Misc |
| Advance Adjustments | `CASHFLOW\004_advance_adjustments.png` | `mnuAdvAdjust_Click` | `frmAdvAdjust` | Proven | Banks, BankTrans, Customer, DCINV, DCOUTGOINGINV, DCSubConIncoming, EXPENSE, FundTrans, INCOME, Misc, Purchase, SUPPLIER, Vendor |

## Human Resource

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Attendance | `HUMAN_RESOURCE\001_attendance.png` | `mnuAttendance_Click` | `frmAttendance` | Proven | Attendance, Holidays, Misc, Month1, STAFF |
| Salary | none | `mnuSalary_Click` | `frmSalary` | Proven. Design. | Attendance, FundTrans, Misc, ProfessionalTax, Salary, SalaryPrint, STAFF, StaffLoan, StaffLoanDedTrack |
| Staff Loan | `HUMAN_RESOURCE\003_staff_loan.png` | `mnuStaffLoan_Click` | `frmStaffLoan` | Proven | Salary, STAFF, StaffLoan |

## Maintenance

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Maintenance Schedule | `MAINTENANCE\001_maintenance_schedule.png` | `mnuMaintainSch_Click` | `frmMaintain` | Proven | Machine, MaintainSch, Maintenance |
| Maintenance Process | `MAINTENANCE\002_maintenance_process.png` | `mnuMaintainPro_Click` | `frmMaintainPro` | Proven | Machine, MaintainData, MaintainSch |
| BreakDown Maintenance | `MAINTENANCE\003_breakdown_maintenance.png` | `mnuBreak_Click` | `frmBrkDnMaint` | Proven | BrkDown, Machine |
| Calibration History and Maintenance | `MAINTENANCE\004_calibration_history_and_maintenance.png` | `mnuCalibrate_Click` | `frmCalibrate` | Proven | Calibrate, CalibrateRep, Item |

## Inspection

| Menu label | Screenshot | Handler | Form | Match | Business tables |
| --- | --- | --- | --- | --- | --- |
| Manufacturing & Labour → Random Samples | `INSPECTION\MANUFACTURING_&_LABOUR\001_random_samples.png` | `mnuInsMfgLabRand_Click` | `frmInspection` | Proven | Customer, DCINV, DCINVSUB, DCOUTGOINGINV, DcOutgoingSubInv, Inspection, InspectionIn, InspectionInde, InspectRef, Item, Misc |
| Manufacturing & Labour → Individual Samples | `INSPECTION\MANUFACTURING_&_LABOUR\002_individual_samples.png` | `mnuInsMfgLabIndivi_Click` | `frmInspectionInde` | Proven | Customer, Inspection, InspectionIn, InspectionInde, InspectRef, Item, Misc |
| SubContract | `INSPECTION\001_subcontract.png` | `mnuInsSubCon_Click` | `frmInspectionSC` | Proven | DCSubConIncoming, DCSubConIncomingSub, InspectionSC, InspectRef, Item, Misc, SUPPLIER |
| Inspection COMMON | `INSPECTION\002_inspection_common.png` | `mnuInsCommon_Click` | `frmInspectionIn` | Proven | Customer, InspectionIn, InspectRef, Item, Misc |

## Utilities

| Menu label | Screenshot | Handler | Form | Scope |
| --- | --- | --- | --- | --- |
| Conversion | `UTILITY\001_conversion.png` | `mnuConversion_Click` | `frmConv` | In scope. No `from` / `join` / `into` / `update` string in this form's procedures. |
| Correspondences | none | `mnuFileCorres_Click` | `frmFileCorres` | Out of scope |
| Calculator | none | `mnuCalculator_Click` | `frmCal` | Out of scope |
| MESSENGER | none | `mnuMessenger_Click` | `frmMessenger` | Out of scope |
| Organiser | none | `mnuOrganiser_Click` | `frmOrganise` | Out of scope |
| Compact Database | none | `mnuCompDB_Click` | no form | Out of scope. This click compacts the Access file. It is not My Company Details. |

## Open checks before those screens are coded

1. Purchase → Goods Received Note is `frmPurchaseGRN` only by elimination.
2. Sub Contract → Goods Received Note is `frmDCSubConIn` only by elimination.
3. Bill Of Materials opens `frmStkRedDefine`. The name and the menu label do not match. The screenshot still has to be checked field by field against that form.
