const FORM_RIGHTS = {
  frmUserEntry: "mnuUser",
  frmUserRights: "mnuUserRight",
  frmAuditTrail: "mnuUserRight",
  frmNotificationHub: "mnuInvoice",
  frmBarcodeHub: "mnuInvoice",
  frmViewImpSys: "mnuUserStatus",
  frmStaff: "mnuStaff",
  frmShiftAlloc: "mnuShiftAlloc",
  frmColHeadingPR: "mnuSalHead",
  frmMachine: "mnuMachine",
  frmCustomer: "mnuCustomer",
  frmSupplier: "mnuSupplier",
  frmVendor: "mnuVendor",
  frmCategory: "mnuCategory",
  frmItem: "mnuItem",
  frmStkRedDefine: "mnuBOM",
  frmStores: "mnuStores",
  frmProcessID: "mnuProcID",
  frmExpense: "mnuExpense",
  frmIncome: "mnuIncome",
  frmBanks: "mnuBank",
  frmCurrency: "mnuCurrency",
  frmCurrToday: "mnuCurrToday",
  frmCostCenter: "mnuCostCntr",
  frmMisc: "mnuMisc",
  frmProdn: "mnuProductionLog",
  frmProdnWOIssue: "mnuIWOiss",
  frmProdnWOReturn: "mnuIWOret",
  frmProdnStoreCrNote: "mnuProdnStoreCrNote",
  frmAssmReqAnaly: "mnuAssmReqAnaly",
  frmMatReqAnaly: "mnuMatlReqAnaly",
  frmPlanY: "mnuPlanChart",
  frmPlanProdCapacity: "mnuPlanProdCapa",
  frmProdSchedule: "mnuprodSchd",
  frmEstimation: "mnuEsti",
  frmStock: "mnuStock",
  frmTraceability: "mnuTraceability",
  frmStockIssue: "mnuStkIssueBill",
  frmToolCrib: "mnuToolCrib",
  frmSCNGen: "mnuSCNGen",
  frmStoreInterTrans: "mnuStoreInterTrans",
  frmEnquiry: "mnuEnquiry",
  frmPurchasePO: "mnuPurchPOout",
  frmPurchaseGRN: "mnuPurchBills",
  frmPurchStoreCrNote: "mnuPurchStoreCrNote",
  frmInvoicePurch: "mnuInvPurchIn",
  frmQuote: "mnuQuote",
  frmMfgPO: "mnuMfgPOin",
  frmDC: "mnuMfgDC",
  frmInvoice: "mnuMfgInvoice",
  frmLabourPO: "mnuLabPOin",
  frmDCIncoming: "mnuLabDCin",
  frmDCOutgoing: "mnuLabDCout",
  frmInvoiceL: "mnuLabInv",
  frmSubConPO: "mnuSubConPOout",
  frmDCSubConOut: "mnuDcSubConOut",
  frmDCSubConIn: "mnuDcSubConIn",
  frmDcSubConStoreCrNote: "mnuDcSubConStoreCrNote",
  frmInvoiceSC: "mnuInvSubConIn",
  frmPayments: "mnuPayments",
  frmReceipts: "mnureceipts",
  frmBankTrans: "mnuBankTrans",
  frmAdvAdjust: "mnuAdvAdjust",
  frmAttendance: "mnuAttendance",
  frmSalary: "mnuSalary",
  frmStaffLoan: "mnuStaffLoan",
  frmMaintain: "mnuMaintainSch",
  frmMaintainPro: "mnuMaintainPro",
  frmBrkDnMaint: "mnuBreak",
  frmCalibrate: "mnuCalibrate",
  frmInspection: "mnuInsMfgLabRand",
  frmInspectionInde: "mnuInsMfgLabIndivi",
  frmInspectionSC: "mnuInsSubCon",
  frmInspectionIn: "mnuInsCommon"
};

const MENUS = {
  master: [
    { label: "Admin", children: [
      { label: "Users", form: "frmUserEntry" },
      { label: "User Rights", form: "frmUserRights" },
      { label: "User Status", form: "frmViewImpSys" },
      { label: "Security & Audit Trail", form: "frmAuditTrail" }
    ]},
    { label: "Human Resource", children: [
      { label: "Employee Details", form: "frmStaff" },
      { label: "Shift Allocation", form: "frmShiftAlloc" },
      { label: "Salary Headings", form: "frmColHeadingPR" }
    ]},
    { label: "General", children: [
      { label: "Machine", form: "frmMachine" },
      { label: "Customer (Sales/Labour)", form: "frmCustomer" },
      { label: "Supplier (SubContract)", form: "frmSupplier" },
      { label: "Vendor (Purchase)", form: "frmVendor" }
    ]},
    { label: "Inventory", children: [
      { label: "Category", form: "frmCategory" },
      { label: "Item", form: "frmItem" },
      { label: "Bill Of Materials", form: "frmStkRedDefine" },
      { label: "Stores (Warehouses)", form: "frmStores" }
    ]},
    { label: "Process", form: "frmProcessID" },
    { label: "Accounts", children: [
      { label: "Expense", form: "frmExpense" },
      { label: "Income", form: "frmIncome" },
      { label: "Bank Details", form: "frmBanks" },
      { label: "Currency", form: "frmCurrency" },
      { label: "Currency Today", form: "frmCurrToday" },
      { label: "CostCenter", form: "frmCostCenter" }
    ]},
    { label: "My Company Details", form: "frmMisc" }
  ],
  production: [
    { label: "Production Log", form: "frmProdn" },
    { label: "Internal Work Order cum Material Issue", form: "frmProdnWOIssue" },
    { label: "Produced Material - Return", form: "frmProdnWOReturn" },
    { label: "Store Credit Note", form: "frmProdnStoreCrNote" }
  ],
  planning: [
    { label: "Assembly - Requirement Analysis", form: "frmAssmReqAnaly" },
    { label: "Material - Requirement Analysis", form: "frmMatReqAnaly" },
    { label: "Production Plan Chart", form: "frmPlanY" },
    { label: "Production Capacity", form: "frmPlanProdCapacity" },
    { label: "Production Schedule", form: "frmProdSchedule" },
    { label: "Estimation", form: "frmEstimation" }
  ],
  inventory: [
    { label: "Stock Position", form: "frmStock" },
    { label: "Batch & Heat Traceability", form: "frmTraceability" },
    { label: "Material Issue Note", form: "frmStockIssue" },
    { label: "Tool Crib", form: "frmToolCrib" },
    { label: "Store Credit Note (General)", form: "frmSCNGen" },
    { label: "Inter-Store Transfer", form: "frmStoreInterTrans" }
  ],
  purchase: [
    { label: "Enquiry", form: "frmEnquiry" },
    { label: "Purchase Order - Outgoing", form: "frmPurchasePO" },
    { label: "Goods Received Note", form: "frmPurchaseGRN" },
    { label: "Store Credit Note", form: "frmPurchStoreCrNote" },
    { label: "Invoice Inwards", form: "frmInvoicePurch" }
  ],
  sales: [
    { label: "Quotation", form: "frmQuote" },
    { label: "Manufacturing", children: [
      { label: "Purchase Order - Inwards", form: "frmMfgPO" },
      { label: "DC", form: "frmDC" },
      { label: "Invoice", form: "frmInvoice" }
    ]},
    { label: "Labour", children: [
      { label: "Work Order - Inwards", form: "frmLabourPO" },
      { label: "DC Inwards", form: "frmDCIncoming" },
      { label: "DC Outwards", form: "frmDCOutgoing" },
      { label: "Invoice", form: "frmInvoiceL" }
    ]}
  ],
  contract: [
    { label: "Work Order - Outwards", form: "frmSubConPO" },
    { label: "DC Outwards", form: "frmDCSubConOut" },
    { label: "Goods Received Note", form: "frmDCSubConIn" },
    { label: "Store Credit Note", form: "frmDcSubConStoreCrNote" },
    { label: "Invoice Inwards", form: "frmInvoiceSC" }
  ],
  cash: [
    { label: "Payments", form: "frmPayments" },
    { label: "Receipts", form: "frmReceipts" },
    { label: "Bank Transactions", form: "frmBankTrans" },
    { label: "Advance Adjustments", form: "frmAdvAdjust" }
  ],
  hr: [
    { label: "Attendance", form: "frmAttendance" },
    { label: "Salary", form: "frmSalary", design: true },
    { label: "Staff Loan", form: "frmStaffLoan" }
  ],
  maintenance: [
    { label: "Maintenance Schedule", form: "frmMaintain" },
    { label: "Maintenance Process", form: "frmMaintainPro" },
    { label: "BreakDown Maintenance", form: "frmBrkDnMaint" },
    { label: "Calibration History and Maintenance", form: "frmCalibrate" }
  ],
  inspection: [
    { label: "Manufacturing & Labour", children: [
      { label: "Random Samples", form: "frmInspection" },
      { label: "Individual Samples", form: "frmInspectionInde" }
    ]},
    { label: "SubContract", form: "frmInspectionSC" },
    { label: "Inspection COMMON", form: "frmInspectionIn" }
  ],
  utilities: [
    { label: "Conversion", form: "frmConv" },
    { label: "GST Tax Returns (GSTR-1 & GSTR-3B)", form: "frmGSTReports" },
    { label: "Security & Audit Trail", form: "frmAuditTrail" },
    { label: "WhatsApp & Email Dispatch Hub", form: "frmNotificationHub" },
    { label: "Barcode & QR Label Center", form: "frmBarcodeHub" }
  ]
};

const loginWindow = document.querySelector("#login-window");
const mainWindow = document.querySelector("#main-window");
const closed = document.querySelector("#closed");
const yearSelect = document.querySelector("#year");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const userList = document.querySelector("#user-list");
const popup = document.querySelector("#popup");
const notice = document.querySelector("#notice");
const who = document.querySelector("#who");
let menuRights = {};
const ask = document.querySelector("#ask");
const askText = document.querySelector("#ask-text");
const askNo = document.querySelector("#ask-no");

function upperLetter(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 97 && code <= 122) return String.fromCharCode(code - 32);
  return ch;
}

function allowedUserChar(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return true;
  if (code >= 48 && code <= 57) return true;
  return ch === " ";
}

function showLogin() {
  document.title = "Tamba ERP";
  closed.hidden = true;
  mainWindow.hidden = true;
  loginWindow.hidden = false;
  if (window.closeCompany) window.closeCompany();
  if (window.closeUsers) window.closeUsers();
  if (window.closeUserRights) window.closeUserRights();
  if (window.closeUserStatus) window.closeUserStatus();
  if (window.closeStaff) window.closeStaff();
  if (window.closeShift) window.closeShift();
  if (window.closeHeadings) window.closeHeadings();
  if (window.closeMachine) window.closeMachine();
  if (window.closeCustomer) window.closeCustomer();
  if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
  if (window.closeAuditTrail) window.closeAuditTrail();
  hidePopup();
}

function showClosed() {
  document.title = "Tamba ERP";
  loginWindow.hidden = true;
  mainWindow.hidden = true;
  closed.hidden = false;
  if (window.closeCompany) window.closeCompany();
  if (window.closeUsers) window.closeUsers();
  if (window.closeUserRights) window.closeUserRights();
  if (window.closeUserStatus) window.closeUserStatus();
  if (window.closeStaff) window.closeStaff();
  if (window.closeShift) window.closeShift();
  if (window.closeHeadings) window.closeHeadings();
  if (window.closeMachine) window.closeMachine();
  if (window.closeCustomer) window.closeCustomer();
  if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
  if (window.closeAuditTrail) window.closeAuditTrail();
  hidePopup();
}

function formatLoggedIn(value) {
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return hh + ":" + mm + ":" + ss;
}

function menuOff(item) {
  const key = item.form && FORM_RIGHTS[item.form];
  return !!key && menuRights[key] === 0;
}

function showMain(session) {
  document.title = session.factoryName;
  loginWindow.hidden = true;
  closed.hidden = true;
  mainWindow.hidden = false;
  notice.hidden = true;
  menuRights = session.rights || {};
  const roleDisplay = session.role_name ? ` [${session.role_name}]` : (session.role_key ? ` [${session.role_key}]` : "");
  who.textContent = "User: " + session.username + roleDisplay + "\nLogged In: " + formatLoggedIn(session.loggedInAt);
  if (window.initDashboard) window.initDashboard();
  else if (window.loadDashboard) window.loadDashboard();
  if (!session.rightsMissing) return;
  document.querySelector("#info-title").textContent = session.factoryName || "Tamba ERP";
  document.querySelector("#info-text").textContent = "User Rights for You has not been Made Contact Your Administrator";
  document.querySelector("#info").hidden = false;
  const ok = document.querySelector("#info-ok");
  function done() {
    ok.removeEventListener("click", done);
    fetch("/api/logout", { method: "POST" }).then(() => showLogin());
  }
  ok.addEventListener("click", done);
  ok.focus();
}

function hidePopup() {
  popup.hidden = true;
  popup.innerHTML = "";
}

function showNotice(item) {
  const lines = [item.label, "This screen is not built yet.", "Form: " + item.form];
  if (item.design) lines.push("This screen has no photograph. Its layout is still to be designed.");
  if (item.confirm) lines.push("The form name was matched by elimination and still needs confirmation.");
  notice.textContent = lines.join("\n");
  notice.hidden = false;
  hidePopup();
}

function renderMenu(items, anchor) {
  popup.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.children ? item.label + "  >" : item.label;
    if (menuOff(item)) button.disabled = true;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menuOff(item)) return;
      if (item.children) {
        const rect = button.getBoundingClientRect();
        renderMenu(item.children, { left: rect.right - 4, top: rect.top });
        return;
      }
      hidePopup();
      if (typeof window.toggleDashboard === "function") {
        window.toggleDashboard(false);
      }
      if (item.form !== "frmProdn" && window.closeProdn) window.closeProdn();
      if (item.form !== "frmProdnWOIssue" && window.closeIwo) window.closeIwo();
      if (item.form !== "frmProdnWOReturn" && window.closeIwoReturn) window.closeIwoReturn();
      if (item.form !== "frmProdnStoreCrNote" && window.closeScn) window.closeScn();
      if (item.form !== "frmAssmReqAnaly" && window.closeAssm) window.closeAssm();
      if (item.form !== "frmMatReqAnaly" && window.closeMat) window.closeMat();
      if (item.form !== "frmPlanY" && window.closePlan) window.closePlan();
      if (item.form !== "frmPlanProdCapacity" && window.closeCapa) window.closeCapa();
      if (item.form !== "frmProdSchedule" && window.closeSchd) window.closeSchd();
      if (item.form !== "frmEstimation" && window.closeEsti) window.closeEsti();
      if (item.form !== "frmStock" && window.closeStock) window.closeStock();
      if (item.form !== "frmTraceability" && window.closeTraceability) window.closeTraceability();
      if (item.form !== "frmStockIssue" && window.closeIssue) window.closeIssue();
      if (item.form !== "frmToolCrib" && window.closeTool) window.closeTool();
      if (item.form !== "frmSCNGen" && window.closeScnGen) window.closeScnGen();
      if (item.form !== "frmStoreInterTrans" && window.closeIst) window.closeIst();
      if (item.form !== "frmEnquiry" && window.closeEnq) window.closeEnq();
      if (item.form !== "frmPurchasePO" && window.closePo) window.closePo();
      if (item.form !== "frmPurchaseGRN" && window.closeGrn) window.closeGrn();
      if (item.form !== "frmPurchStoreCrNote" && window.closeScnPurch) window.closeScnPurch();
      if (item.form !== "frmInvoicePurch" && window.closeInvPurch) window.closeInvPurch();
      if (item.form !== "frmQuote" && window.closeQuote) window.closeQuote();
      if (item.form !== "frmMfgPO" && window.closeMfgPO) window.closeMfgPO();
      if (item.form !== "frmDC" && window.closeDC) window.closeDC();
      if (item.form !== "frmInvoice" && window.closeInvoiceMfg) window.closeInvoiceMfg();
      if (item.form !== "frmLabourPO" && window.closeLabourPO) window.closeLabourPO();
      if (item.form !== "frmDCIncoming" && window.closeLabourDCIn) window.closeLabourDCIn();
      if (item.form !== "frmDCOutgoing" && window.closeLabourDCOut) window.closeLabourDCOut();
      if (item.form !== "frmInvoiceL" && window.closeLabourInvoice) window.closeLabourInvoice();
      if (item.form !== "frmSubConPO" && window.closeSubconPO) window.closeSubconPO();
      if (item.form !== "frmDCSubConOut" && window.closeSubconDcOut) window.closeSubconDcOut();
      if (item.form !== "frmDCSubConIn" && window.closeSubconDcIn) window.closeSubconDcIn();
      if (item.form !== "frmDcSubConStoreCrNote" && window.closeSubconScn) window.closeSubconScn();
      if (item.form !== "frmInvoiceSC" && window.closeSubconInvoice) window.closeSubconInvoice();
      if (item.form !== "frmPayments" && window.closePayments) window.closePayments();
      if (item.form !== "frmReceipts" && window.closeReceipts) window.closeReceipts();
      if (item.form !== "frmBankTrans" && window.closeBankTrans) window.closeBankTrans();
      if (item.form !== "frmAdvAdjust" && window.closeAdvAdjust) window.closeAdvAdjust();
      if (item.form !== "frmInspection" && window.closeInspectionRandom) window.closeInspectionRandom();
      if (item.form !== "frmInspectionInde" && window.closeInspectionInde) window.closeInspectionInde();
      if (item.form !== "frmInspectionSC" && window.closeInspectionSC) window.closeInspectionSC();
      if (item.form !== "frmInspectionIn" && window.closeInspectionIn) window.closeInspectionIn();
      if (item.form !== "frmAttendance" && window.closeAttendance) window.closeAttendance();
      if (item.form !== "frmGSTReports" && window.closeGSTReports) window.closeGSTReports();
      if (item.form !== "frmAuditTrail" && window.closeAuditTrail) window.closeAuditTrail();
      if (item.form && typeof window.minimizeDashboard === "function") {
        window.minimizeDashboard();
      }
      if (item.form === "frmMisc") {
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openCompany();
        return;
      }
      if (item.form === "frmUserEntry") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openUsers();
        return;
      }
      if (item.form === "frmUserRights") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openUserRights();
        return;
      }
      if (item.form === "frmViewImpSys") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openUserStatus();
        return;
      }
      if (item.form === "frmStaff") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openStaff();
        return;
      }
      if (item.form === "frmShiftAlloc") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openShift();
        return;
      }
      if (item.form === "frmCustomer") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openCustomer();
        return;
      }
      if (item.form === "frmSupplier") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openSupplier();
        return;
      }
      if (item.form === "frmVendor") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        window.openVendor();
        return;
      }
      if (item.form === "frmCategory") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openCategory();
        return;
      }
      if (item.form === "frmStkRedDefine") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
        if (window.closeItem) window.closeItem();
        window.openBom();
        return;
      }
      if (item.form === "frmStores") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
        if (window.closeItem) window.closeItem();
        window.openStore();
        return;
      }
      if (item.form === "frmProcessID") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
        if (window.closeItem) window.closeItem();
        window.openProcess();
        return;
      }
      if (item.form === "frmPlanY") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        if (window.closeAssm) window.closeAssm();
        if (window.closeMat) window.closeMat();
        if (window.closeCapa) window.closeCapa();
        window.openPlan();
        return;
      }
      if (item.form === "frmPlanProdCapacity") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        if (window.closeAssm) window.closeAssm();
        if (window.closeMat) window.closeMat();
        if (window.closePlan) window.closePlan();
        if (window.closeSchd) window.closeSchd();
        window.openCapa();
        return;
      }
      if (item.form === "frmProdSchedule") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        if (window.closeAssm) window.closeAssm();
        if (window.closeMat) window.closeMat();
        if (window.closePlan) window.closePlan();
        if (window.closeCapa) window.closeCapa();
        if (window.closeEsti) window.closeEsti();
        window.openSchd();
        return;
      }
      if (item.form === "frmStock") {
        window.openStock();
        return;
      }
      if (item.form === "frmTraceability") {
        if (window.openTraceability) window.openTraceability();
        return;
      }
      if (item.form === "frmStockIssue") {
        window.openIssue();
        return;
      }
      if (item.form === "frmToolCrib") {
        window.openTool();
        return;
      }
      if (item.form === "frmSCNGen") {
        window.openScnGen();
        return;
      }
      if (item.form === "frmStoreInterTrans") {
        window.openIst();
        return;
      }
      if (item.form === "frmEnquiry") {
        window.openEnq();
        return;
      }
      if (item.form === "frmPurchasePO") {
        window.openPo();
        return;
      }
      if (item.form === "frmPurchaseGRN") {
        window.openGrn();
        return;
      }
      if (item.form === "frmPurchStoreCrNote") {
        window.openScnPurch();
        return;
      }
      if (item.form === "frmInvoicePurch") {
        window.openInvPurch();
        return;
      }
      if (item.form === "frmQuote") {
        window.openQuote();
        return;
      }
      if (item.form === "frmMfgPO") {
        window.openMfgPO();
        return;
      }
      if (item.form === "frmDC") {
        window.openDC();
        return;
      }
      if (item.form === "frmInvoice") {
        window.openInvoiceMfg();
        return;
      }
      if (item.form === "frmLabourPO") {
        if (window.openLabourPO) window.openLabourPO();
        return;
      }
      if (item.form === "frmDCIncoming") {
        if (window.openLabourDCIn) window.openLabourDCIn();
        return;
      }
      if (item.form === "frmDCOutgoing") {
        if (window.openLabourDCOut) window.openLabourDCOut();
        return;
      }
      if (item.form === "frmInvoiceL") {
        if (window.openLabourInvoice) window.openLabourInvoice();
        return;
      }
      if (item.form === "frmSubConPO") {
        if (window.openSubconPO) window.openSubconPO();
        return;
      }
      if (item.form === "frmDCSubConOut") {
        if (window.openSubconDcOut) window.openSubconDcOut();
        return;
      }
      if (item.form === "frmDCSubConIn") {
        if (window.openSubconDcIn) window.openSubconDcIn();
        return;
      }
      if (item.form === "frmDcSubConStoreCrNote") {
        if (window.openSubconScn) window.openSubconScn();
        return;
      }
      if (item.form === "frmInvoiceSC") {
        if (window.openSubconInvoice) window.openSubconInvoice();
        return;
      }
      if (item.form === "frmPayments") {
        if (window.openPayments) window.openPayments();
        return;
      }
      if (item.form === "frmReceipts") {
        if (window.openReceipts) window.openReceipts();
        return;
      }
      if (item.form === "frmBankTrans") {
        if (window.openBankTrans) window.openBankTrans();
        return;
      }
      if (item.form === "frmAdvAdjust") {
        if (window.openAdvAdjust) window.openAdvAdjust();
        return;
      }
      if (item.form === "frmInspection") {
        if (window.openInspectionRandom) window.openInspectionRandom();
        return;
      }
      if (item.form === "frmInspectionInde") {
        if (window.openInspectionInde) window.openInspectionInde();
        return;
      }
      if (item.form === "frmInspectionSC") {
        if (window.openInspectionSC) window.openInspectionSC();
        return;
      }
      if (item.form === "frmInspectionIn") {
        if (window.openInspectionIn) window.openInspectionIn();
        return;
      }
      if (item.form === "frmAttendance") {
        if (window.openAttendance) window.openAttendance();
        return;
      }
      if (item.form === "frmStaffLoan") {
        if (window.openStaffLoan) window.openStaffLoan();
        return;
      }
      if (item.form === "frmSalary") {
        if (window.openSalary) window.openSalary();
        return;
      }
      if (item.form === "frmMaintain") {
        if (window.openMaintainSch) window.openMaintainSch();
        return;
      }
      if (item.form === "frmMaintainPro") {
        if (window.openMaintainPro) window.openMaintainPro();
        return;
      }
      if (item.form === "frmBrkDnMaint") {
        if (window.openBreakdown) window.openBreakdown();
        return;
      }
      if (item.form === "frmCalibrate") {
        if (window.openCalibrate) window.openCalibrate();
        return;
      }
      if (item.form === "frmConv") {
        if (window.openConvert) window.openConvert();
        return;
      }
      if (item.form === "frmGSTReports") {
        if (window.openGSTReports) window.openGSTReports();
        return;
      }
      if (item.form === "frmAuditTrail") {
        if (window.openAuditTrail) window.openAuditTrail();
        return;
      }
      if (item.form === "frmNotificationHub") {
        if (window.openNotificationModal) window.openNotificationModal();
        return;
      }
      if (item.form === "frmBarcodeHub") {
        if (window.openBarcodeModal) window.openBarcodeModal();
        return;
      }
      if (item.form === "frmEstimation") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        if (window.closeAssm) window.closeAssm();
        if (window.closeMat) window.closeMat();
        if (window.closePlan) window.closePlan();
        if (window.closeCapa) window.closeCapa();
        if (window.closeSchd) window.closeSchd();
        window.openEsti();
        return;
      }
      if (item.form === "frmMatReqAnaly") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        if (window.closeAssm) window.closeAssm();
        window.openMat();
        return;
      }
      if (item.form === "frmAssmReqAnaly") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        if (window.closeScn) window.closeScn();
        window.openAssm();
        return;
      }
      if (item.form === "frmProdnStoreCrNote") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeIwoReturn) window.closeIwoReturn();
        window.openScn();
        return;
      }
      if (item.form === "frmProdnWOReturn") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeIwo) window.closeIwo();
        if (window.closeScn) window.closeScn();
        window.openIwoReturn();
        return;
      }
      if (item.form === "frmProdnWOIssue") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeProdn) window.closeProdn();
        if (window.closeScn) window.closeScn();
        window.openIwo();
        return;
      }
      if (item.form === "frmProdn") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
        if (window.closeItem) window.closeItem();
        if (window.closeScn) window.closeScn();
        window.openProdn();
        return;
      }
      if (item.form === "frmExpense") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
        if (window.closeItem) window.closeItem();
        window.openExpense();
        return;
      }
      if (item.form === "frmIncome") { window.openIncome(); return; }
      if (item.form === "frmBanks") { window.openBanks(); return; }
      if (item.form === "frmCurrency") { window.openCurrency(); return; }
      if (item.form === "frmCurrToday") { window.openCurrToday(); return; }
      if (item.form === "frmCostCenter") { window.openCost(); return; }
      if (item.form === "frmItem") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
        if (window.closeVendor) window.closeVendor();
        if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openItem();
        return;
      }
      if (item.form === "frmMachine") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeHeadings) window.closeHeadings();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openMachine();
        return;
      }
      if (item.form === "frmColHeadingPR") {
        if (window.closeCompany) window.closeCompany();
        if (window.closeUsers) window.closeUsers();
        if (window.closeUserRights) window.closeUserRights();
        if (window.closeUserStatus) window.closeUserStatus();
        if (window.closeStaff) window.closeStaff();
        if (window.closeShift) window.closeShift();
        if (window.closeMachine) window.closeMachine();
        if (window.closeCustomer) window.closeCustomer();
        if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
        window.openHeadings();
        return;
      }
      if (window.closeCompany) window.closeCompany();
      if (window.closeUsers) window.closeUsers();
      if (window.closeUserRights) window.closeUserRights();
      if (window.closeUserStatus) window.closeUserStatus();
      if (window.closeStaff) window.closeStaff();
      if (window.closeShift) window.closeShift();
      if (window.closeHeadings) window.closeHeadings();
      if (window.closeMachine) window.closeMachine();
      if (window.closeCustomer) window.closeCustomer();
      if (window.closeSupplier) window.closeSupplier();
  if (window.closeVendor) window.closeVendor();
  if (window.closeCategory) window.closeCategory();
  if (window.closeItem) window.closeItem();
      showNotice(item);
    });
    popup.appendChild(button);
  });
  popup.hidden = false;
  popup.style.left = anchor.left + "px";
  popup.style.top = anchor.top + "px";
}

document.querySelectorAll(".sidebar button[data-menu]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const rect = button.getBoundingClientRect();
    renderMenu(MENUS[button.dataset.menu], { left: rect.right, top: rect.top });
  });
});

document.addEventListener("click", (event) => {
  if (!popup.hidden && !popup.contains(event.target)) hidePopup();
});

document.querySelector("#chevron").addEventListener("click", () => {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.hidden = !sidebar.hidden;
    document.querySelector("#chevron").textContent = sidebar.hidden ? ">>" : "<<";
  }
  hidePopup();
});

function styleEulaText(rawText) {
  if (!rawText) return "";
  let html = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(
    /End User License Agreement \(EULA\)/g,
    '<div style="text-align: center; color: #ff0000; font-size: 15px; font-weight: bold; text-decoration: underline; margin-bottom: 8px;">End User License Agreement (EULA)</div>'
  );
  html = html.replace(
    /IMPORTANT - READ CAREFULLY:/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">IMPORTANT - READ CAREFULLY:</span>'
  );
  html = html.replace(
    /CopyRight/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">CopyRight</span>'
  );
  html = html.replace(
    /Simply Digital Things/g,
    '<span style="font-weight: bold; color: #008000; text-decoration: underline;">Simply Digital Things</span>'
  );
  html = html.replace(
    /Registered Version/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">Registered Version</span>'
  );
  html = html.replace(
    /\bTransfer\b/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">Transfer</span>'
  );
  html = html.replace(
    /\bdistribution\b/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">distribution</span>'
  );
  html = html.replace(
    /Governing Law/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">Governing Law</span>'
  );
  html = html.replace(
    /Disclaimer of Warranty/g,
    '<span style="font-weight: bold; color: #ff00ff; text-decoration: underline;">Disclaimer of Warranty</span>'
  );

  html = html.replace(/\r?\n/g, "<br>");
  return html;
}

function closeLicenseModal() {
  const modal = document.querySelector("#license-modal");
  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
  const usernameInput = document.querySelector("#username");
  if (usernameInput) usernameInput.focus();
}

document.querySelector("#license-close-x")?.addEventListener("click", closeLicenseModal);

document.querySelector("#license").addEventListener("click", async () => {
  loginMessage.textContent = "";
  const selectedYear = document.querySelector("#year").value || "2026-27";
  try {
    const resp = await fetch(`/api/license?year=${encodeURIComponent(selectedYear)}`);
    const data = await resp.json();
    if (!data.ok) {
      alert("License File is Missing. Contact Your Software Vendor.");
      return;
    }

    const modal = document.querySelector("#license-modal");
    const lblProduct = document.querySelector("#lblProduct");
    const lblVer = document.querySelector("#lblVer");
    const lblCompany = document.querySelector("#lblCompany");
    const rtbEULA = document.querySelector("#rtbEULA");
    const regSection = document.querySelector("#license-register-section");
    const optAgree = document.querySelector("#optAgree");
    const optNAgree = document.querySelector("#optNAgree");
    const txtCompany = document.querySelector("#txtCompany");

    if (lblProduct) lblProduct.textContent = data.product || "Product: Tamba ERP";
    if (lblVer) lblVer.textContent = `Version:   ${data.version || "1.0.0"}`;
    if (lblCompany) {
      if (data.registered) {
        lblCompany.textContent = `Licensed to   :   M/s  ${data.company}\nLicense No   :   ${data.licenseNo}\nLicense Date   :   ${data.licenseDate}`;
      } else {
        lblCompany.textContent = `Company Name\nLicense No   :   ${data.licenseNo}\nLicense Date   :   ${data.licenseDate}`;
      }
    }

    if (rtbEULA) {
      rtbEULA.innerHTML = styleEulaText(data.agreeText);
      rtbEULA.scrollTop = 0;
    }

    if (data.registered) {
      if (regSection) regSection.hidden = true;
    } else {
      if (regSection) regSection.hidden = false;
      if (optAgree) optAgree.checked = true;
      if (optNAgree) optNAgree.checked = false;
      if (txtCompany) txtCompany.value = "";
    }

    if (modal) {
      modal.hidden = false;
      modal.style.display = "flex";
    }
  } catch (err) {
    console.error("Failed to load license:", err);
    alert("License File is Missing. Contact Your Software Vendor.");
  }
});

document.querySelector("#cmdExit")?.addEventListener("click", async () => {
  const regSection = document.querySelector("#license-register-section");
  if (!regSection || regSection.hidden) {
    closeLicenseModal();
    return;
  }

  const optNAgree = document.querySelector("#optNAgree");
  if (optNAgree && optNAgree.checked) {
    if (confirm("Are you sure to DISAGREE this license Agreement?")) {
      closeLicenseModal();
    }
    return;
  }

  const txtComp = document.querySelector("#txtCompany");
  const compVal = (txtComp?.value || "").trim();
  if (!compVal) {
    alert("You should enter your Company Name in order to Register...");
    txtComp?.focus();
    return;
  }

  const selectedYear = document.querySelector("#year").value || "2026-27";
  try {
    const regResp = await fetch("/api/license/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: selectedYear, company: compVal, agree: true })
    });
    const regData = await regResp.json();
    if (regData.ok) {
      alert("License registered successfully.");
      closeLicenseModal();
    } else {
      alert(regData.message || "Registration failed.");
    }
  } catch (err) {
    alert("Registration failed. Please try again.");
  }
});

document.addEventListener("keydown", (e) => {
  const modal = document.querySelector("#license-modal");
  if (!modal || modal.hidden) return;
  if (e.key === "Escape") {
    closeLicenseModal();
  } else if (e.key === "F1") {
    e.preventDefault();
    window.open("/help/License.html", "_blank");
  }
});

document.querySelector("#exit").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showLogin();
});

function askPreviousYear(message) {
  askText.textContent = message;
  ask.hidden = false;
  askNo.focus();
  return new Promise((resolve) => {
    const finish = (answer) => {
      ask.hidden = true;
      document.querySelector("#ask-yes").removeEventListener("click", onYes);
      askNo.removeEventListener("click", onNo);
      resolve(answer);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    document.querySelector("#ask-yes").addEventListener("click", onYes);
    askNo.addEventListener("click", onNo);
  });
}

async function submitLogin(confirmPreviousYear) {
  loginMessage.textContent = "";
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yearLabel: yearSelect.value,
      username: username.value,
      password: password.value,
      confirmPreviousYear
    })
  });
  const body = await response.json();
  if (response.status === 409 && body.previousYear) {
    const yes = await askPreviousYear(body.message);
    if (!yes) {
      yearSelect.value = body.currentYearLabel;
    }
    return submitLogin(yes);
  }
  if (!response.ok) {
    loginMessage.textContent = body.error || "Login failed.";
    if (response.status === 400) yearSelect.focus();
    if (response.status === 401) password.focus();
    return;
  }
  const session = await fetch("/api/session").then((res) => res.json());
  showMain(session);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLogin(false);
});

function closeOnEnd(event) {
  if (event.key === "End") {
    event.preventDefault();
    showClosed();
  }
}
yearSelect.addEventListener("keydown", closeOnEnd);
username.addEventListener("keydown", (event) => {
  closeOnEnd(event);
  if (event.key === "Enter" && username.value.trim() !== "") {
    event.preventDefault();
    password.focus();
  }
});
password.addEventListener("keydown", (event) => {
  closeOnEnd(event);
  if (event.key === "Enter") {
    event.preventDefault();
    submitLogin(false);
  }
});
document.querySelector("#login-button").addEventListener("keydown", closeOnEnd);

username.addEventListener("keypress", (event) => {
  if (event.key.length !== 1) return;
  const upper = upperLetter(event.key);
  if (!allowedUserChar(upper)) {
    event.preventDefault();
    return;
  }
  if (upper !== event.key) {
    event.preventDefault();
    const start = username.selectionStart;
    const end = username.selectionEnd;
    username.value = username.value.slice(0, start) + upper + username.value.slice(end);
    username.selectionStart = username.selectionEnd = start + 1;
  }
});

async function loadLogin() {
  const [years, users] = await Promise.all([
    fetch("/api/login/years").then((res) => res.json()),
    fetch("/api/login/users").then((res) => res.json())
  ]);
  yearSelect.innerHTML = "";
  years.years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year.label;
    option.textContent = year.label;
    if (year.current) option.selected = true;
    yearSelect.appendChild(option);
  });
  userList.innerHTML = "";
  users.users.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    userList.appendChild(option);
  });
}

loadLogin().then(async () => {
  const session = await fetch("/api/session").then((res) => res.json());
  if (session.authenticated) showMain(session);
  else showLogin();
}).catch(() => {
  loginMessage.textContent = "The login data could not be loaded.";
});
