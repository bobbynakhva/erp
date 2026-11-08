const company = document.querySelector("#company");
const companyStatus = document.querySelector("#company-status");
const companyModify = document.querySelector("#company-modify");
const info = document.querySelector("#info");
const infoTitle = document.querySelector("#info-title");
const infoText = document.querySelector("#info-text");

const ENTER_NEXT = {
  "my-kst": "my-cst",
  "my-cst": "my-vat",
  "my-vat": "my-serv",
  "my-serv": "my-pan",
  "my-pan": "rng",
  rng: "divi",
  divi: "commission",
  commission: "my-ce",
  "my-ce": "acct-circle",
  "acct-circle": "prefix-quote",
  "prefix-quote": "prefix-po",
  "prefix-po": "prefix-wo",
  "prefix-wo": "prefix-enq",
  "roff-purchase": "roff-sales",
  "roff-sales": "roff-labour",
  "roff-labour": "roff-sub",
  "roff-sub": "stk-sales",
  "stk-sales": "book-1",
  "stk-labour": "stk-sub",
  "stk-sub": "stk-iwo",
  "stk-iwo": "book-1",
  "book-1": "book-2",
  "book-2": "book-3",
  "book-3": "retrk-purch",
  "retrk-purch": "retrk-mfg",
  "retrk-mfg": "company-modify"
};

const LATER = {};

function stripTrailingCrLf(value) {
  let text = String(value ?? "");
  while (text.endsWith("\r") || text.endsWith("\n")) text = text.slice(0, -1);
  return text;
}

function paintGroup(name) {
  document.querySelectorAll('input[name="' + name + '"]').forEach((input) => {
    input.parentElement.style.color = input.checked ? "#0000ff" : "#000";
  });
}

function selectedValue(name) {
  const chosen = document.querySelector('input[name="' + name + '"]:checked');
  return chosen ? Number(chosen.value) : null;
}

function setGroup(name, value) {
  document.querySelectorAll('input[name="' + name + '"]').forEach((input) => {
    input.checked = Number(input.value) === Number(value);
  });
  paintGroup(name);
}

function fillCompany(data) {
  document.querySelector("#print-head").value = data.printHead;
  document.querySelector("#print-addr").value = data.printShortAddr;
  if (document.querySelector("#my-gstin")) document.querySelector("#my-gstin").value = data.gstin || data.myGstin || "";
  document.querySelector("#my-kst").value = data.myKst;
  document.querySelector("#my-cst").value = data.myCst;
  document.querySelector("#my-vat").value = data.myVat;
  document.querySelector("#my-serv").value = data.myServ;
  document.querySelector("#my-pan").value = data.myPan;
  document.querySelector("#rng").value = data.rng;
  document.querySelector("#divi").value = data.divi;
  document.querySelector("#commission").value = data.commission;
  document.querySelector("#my-ce").value = data.myCe;
  document.querySelector("#acct-circle").value = data.acctCircle;
  document.querySelector("#prefix-quote").value = data.prefixQuote;
  document.querySelector("#prefix-po").value = data.prefixPo;
  document.querySelector("#prefix-wo").value = data.prefixWo;
  document.querySelector("#prefix-enq").value = data.prefixEnq;
  document.querySelector("#roff-purchase").checked = data.roffPurchase;
  document.querySelector("#roff-sales").checked = data.roffSales;
  document.querySelector("#roff-labour").checked = data.roffLabour;
  document.querySelector("#roff-sub").checked = data.roffSub;
  document.querySelector("#retrk-purch").checked = data.retrkPurch;
  document.querySelector("#retrk-mfg").checked = data.retrkMfg;
  document.querySelector("#stk-sales").checked = data.stkSales;
  document.querySelector("#stk-labour").checked = data.stkLabour;
  document.querySelector("#stk-sub").checked = data.stkSub;
  document.querySelector("#stk-iwo").checked = data.stkIwo;
  if (data.exists) {
    setGroup("bookType", data.bookType);
    setGroup("bookTypeInv", data.bookTypeInv);
  } else {
    setGroup("bookType", 1);
    setGroup("bookTypeInv", 1);
  }
  companyModify.textContent = data.modifyCaption;
  document.querySelector("#company-more").hidden = !data.showMore;
  document.querySelector("#company-eou").hidden = !data.showEou;
  companyStatus.textContent = "";
}

function showInfo(title, message) {
  infoTitle.textContent = title;
  infoText.textContent = message;
  info.hidden = false;
  document.querySelector("#info-ok").focus();
}

async function loadCompany() {
  const response = await fetch("/api/company");
  if (!response.ok) {
    companyStatus.textContent = "The company record could not be read.";
    return;
  }
  fillCompany(await response.json());
}

window.openCompany = function openCompany() {
  document.querySelector("#notice").hidden = true;
  document.querySelector("#popup").hidden = true;
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
  company.hidden = false;
  loadCompany();
};

window.closeCompany = function closeCompany() {
  company.hidden = true;
  companyStatus.textContent = "";
};

company.addEventListener("keydown", (event) => {
  if (event.key === "F1") {
    event.preventDefault();
    companyStatus.textContent = "Help file: MasMisc.htm. That page is not in this copy.";
    return;
  }
  if (event.key !== "Enter") return;
  const id = event.target.id;
  if (id === "print-head" || id === "print-addr") {
    const text = event.target.value;
    const ends = text.endsWith("\n") || text.endsWith("\r");
    if (!ends) return;
    event.preventDefault();
    const next = id === "print-head" ? "print-addr" : "my-kst";
    document.querySelector("#" + next).focus();
    return;
  }
  const nextId = ENTER_NEXT[id];
  if (!nextId) return;
  if (nextId === "company-modify" && companyModify.disabled) return;
  event.preventDefault();
  document.querySelector("#" + nextId).focus();
});

["print-head", "print-addr"].forEach((id) => {
  const box = document.querySelector("#" + id);
  box.addEventListener("blur", () => {
    box.value = stripTrailingCrLf(box.value);
  });
});

document.querySelector("#print-addr").addEventListener("focus", () => {
  const addr = document.querySelector("#print-addr");
  if (addr.value.trim() !== "") return;
  addr.value = document.querySelector("#print-head").value;
});

["bookType", "bookTypeInv"].forEach((name) => {
  document.querySelectorAll('input[name="' + name + '"]').forEach((input) => {
    input.addEventListener("change", () => paintGroup(name));
  });
});

document.querySelector("#company-prod").addEventListener("click", () => {
  if (window.openProdSetup) window.openProdSetup();
});
document.querySelector("#company-more").addEventListener("click", () => {
  if (window.openCompanyMore) window.openCompanyMore();
});
document.querySelector("#company-eou").addEventListener("click", () => {
  if (window.openCompanyEou) window.openCompanyEou();
});
document.querySelector("#company-pt").addEventListener("click", () => {
  if (window.openPtDetails) window.openPtDetails();
});
document.querySelector("#company-print").addEventListener("click", () => {
  if (window.openPrintInfo) window.openPrintInfo();
});

Object.keys(LATER).forEach((id) => {
  document.querySelector("#" + id).addEventListener("click", () => {
    const [label, form] = LATER[id];
    companyStatus.textContent = label + "\nThis screen is not built yet.\nForm: " + form;
  });
});

document.querySelector("#company-close").addEventListener("click", () => {
  window.closeCompany();
});

companyModify.addEventListener("click", async () => {
  const body = {
    printHead: document.querySelector("#print-head").value,
    printShortAddr: document.querySelector("#print-addr").value,
    gstin: document.querySelector("#my-gstin")?.value || "",
    myKst: document.querySelector("#my-kst").value,
    myCst: document.querySelector("#my-cst").value,
    myVat: document.querySelector("#my-vat").value,
    myServ: document.querySelector("#my-serv").value,
    myPan: document.querySelector("#my-pan").value,
    rng: document.querySelector("#rng").value,
    divi: document.querySelector("#divi").value,
    commission: document.querySelector("#commission").value,
    myCe: document.querySelector("#my-ce").value,
    acctCircle: document.querySelector("#acct-circle").value,
    prefixQuote: document.querySelector("#prefix-quote").value,
    prefixPo: document.querySelector("#prefix-po").value,
    prefixWo: document.querySelector("#prefix-wo").value,
    prefixEnq: document.querySelector("#prefix-enq").value,
    bookType: selectedValue("bookType"),
    bookTypeInv: selectedValue("bookTypeInv"),
    roffPurchase: document.querySelector("#roff-purchase").checked,
    roffSales: document.querySelector("#roff-sales").checked,
    roffLabour: document.querySelector("#roff-labour").checked,
    roffSub: document.querySelector("#roff-sub").checked,
    retrkPurch: document.querySelector("#retrk-purch").checked,
    retrkMfg: document.querySelector("#retrk-mfg").checked,
    stkSales: document.querySelector("#stk-sales").checked,
    stkLabour: document.querySelector("#stk-labour").checked,
    stkSub: document.querySelector("#stk-sub").checked,
    stkIwo: document.querySelector("#stk-iwo").checked
  };
  const response = await fetch("/api/company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    companyStatus.textContent = "The company record could not be saved.";
    return;
  }
  const saved = await response.json();
  companyModify.textContent = saved.modifyCaption;
  document.querySelector("#company-more").hidden = !saved.showMore;
  document.querySelector("#company-eou").hidden = !saved.showEou;
  showInfo(saved.title, saved.message);
});

document.querySelector("#info-ok").addEventListener("click", () => {
  info.hidden = true;
});
