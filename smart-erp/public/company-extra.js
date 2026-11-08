(() => {
  const info = document.querySelector("#info");
  const ask = document.querySelector("#ask");
  const morePanel = document.querySelector("#company-more-panel");
  const eouPanel = document.querySelector("#company-eou-panel");
  let moreTitle = "Master - My Company Details - More...";
  let eouTitle = "EOU Details...";
  let moreRows = [];
  let moreStores = [];

  function showInfo(title, message) {
    document.querySelector("#info-title").textContent = title;
    document.querySelector("#info-text").textContent = message;
    info.hidden = false;
    document.querySelector("#info-ok").focus();
  }

  function askYesNo(title, message) {
    return new Promise((resolve) => {
      document.querySelector("#ask-title").textContent = title;
      document.querySelector("#ask-text").textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(answer) {
        ask.hidden = true;
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        resolve(answer);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      no.focus();
    });
  }

  function moneyKey(event) {
    const key = event.key;
    if (key.length !== 1) return;
    const input = event.target;
    if (key >= "0" && key <= "9") return;
    if (key === "." && !input.value.includes(".")) return;
    if (key === "-" && input.dataset.minus === "1" && input.selectionStart === 0 && !input.value.includes("-")) return;
    event.preventDefault();
  }

  document.querySelector("#more-open").addEventListener("keydown", moneyKey);
  document.querySelector("#more-pf").addEventListener("keydown", moneyKey);
  document.querySelector("#more-esi").addEventListener("keydown", moneyKey);
  document.querySelector("#eou-amt").addEventListener("keydown", moneyKey);

  function checked(id) {
    return document.querySelector(id).checked;
  }

  function moreBody() {
    const method = document.querySelector('input[name="more-method"]:checked');
    return {
      caption: document.querySelector("#more-save").textContent,
      sales: checked("#more-sales"),
      labour: checked("#more-labour"),
      subcon: checked("#more-subcon"),
      mfgInvoice: checked("#more-mfg-inv"),
      lbrInvoice: checked("#more-lbr-inv"),
      mfgDc: checked("#more-mfg-dc"),
      lbrDc: checked("#more-lbr-dc"),
      pf: document.querySelector("#more-pf").value,
      esi: document.querySelector("#more-esi").value,
      openBal: document.querySelector("#more-open").value,
      openDate: document.querySelector("#more-date").value,
      method: method ? Number(method.value) : 1,
      combined: checked("#more-combined"),
      original: checked("#more-original"),
      duplicate: checked("#more-duplicate"),
      triplicate: checked("#more-triplicate"),
      extra: checked("#more-extra"),
      rows: moreRows.map((row) => ({
        slno: row.slno,
        screen: row.screen,
        storeId: row.storeId,
        storeName: row.storeName
      }))
    };
  }

  function paintMoreRows() {
    const body = document.querySelector("#more-rows");
    body.replaceChildren();
    moreRows.forEach((row) => {
      const tr = document.createElement("tr");
      const sl = document.createElement("td");
      sl.textContent = String(row.slno);
      const screen = document.createElement("td");
      screen.textContent = row.screen;
      const store = document.createElement("td");
      const select = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "";
      select.append(blank);
      for (const item of moreStores) {
        const option = document.createElement("option");
        option.value = String(item.id);
        option.textContent = item.name;
        if (Number(item.id) === Number(row.storeId)) option.selected = true;
        select.append(option);
      }
      select.addEventListener("change", () => {
        const chosen = select.options[select.selectedIndex];
        row.storeId = chosen.value === "" ? null : Number(chosen.value);
        row.storeName = chosen.value === "" ? "" : chosen.textContent;
      });
      store.append(select);
      tr.append(sl, screen, store);
      body.append(tr);
    });
  }

  function fillMore(data) {
    moreTitle = data.title || moreTitle;
    document.querySelector("#more-sales").checked = !!data.sales;
    document.querySelector("#more-labour").checked = !!data.labour;
    document.querySelector("#more-subcon").checked = !!data.subcon;
    document.querySelector("#more-pf").value = data.pf;
    document.querySelector("#more-esi").value = data.esi;
    document.querySelector("#more-open").value = data.openBal;
    document.querySelector("#more-open").disabled = !!data.locked;
    document.querySelector("#more-date").value = data.openDate;
    const method = document.querySelector('input[name="more-method"][value="' + data.method + '"]');
    if (method) method.checked = true;
    document.querySelector("#more-combined").checked = !!data.combined;
    document.querySelector("#more-original").checked = !!data.original;
    document.querySelector("#more-duplicate").checked = !!data.duplicate;
    document.querySelector("#more-triplicate").checked = !!data.triplicate;
    document.querySelector("#more-extra").checked = !!data.extra;
    document.querySelector("#more-mfg-inv").checked = !!data.mfgInvoice;
    document.querySelector("#more-lbr-inv").checked = !!data.lbrInvoice;
    document.querySelector("#more-mfg-dc").checked = !!data.mfgDc;
    document.querySelector("#more-lbr-dc").checked = !!data.lbrDc;
    document.querySelector("#more-save").textContent = data.caption || "Save";
    moreStores = data.stores || [];
    moreRows = (data.rows || []).map((row) => ({
      slno: row.slno,
      screen: row.screen,
      storeId: row.storeId,
      storeName: row.storeName
    }));
    paintMoreRows();
  }

  async function post(url, payload, title) {
    const probe = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ confirmed: false }, payload))
    });
    const first = await probe.json();
    if (!first.ok) {
      if (first.message) showInfo(title, first.message);
      return null;
    }
    if (!first.ready) return null;
    const yes = await askYesNo(title, first.confirm);
    if (!yes) return null;
    payload.confirmed = true;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) {
      if (data.message) showInfo(title, data.message);
      return null;
    }
    showInfo(title, data.message);
    return data;
  }

  document.querySelector("#more-save").addEventListener("click", async () => {
    const data = await post("/api/company-more", moreBody(), moreTitle);
    if (!data) return;
    document.querySelector("#more-save").textContent = data.caption || "Modify";
    document.querySelector("#more-open").disabled = !!data.locked;
  });
  document.querySelector("#more-close").addEventListener("click", () => { morePanel.hidden = true; });

  function eouBody() {
    return {
      caption: document.querySelector("#eou-save").textContent,
      licNo: document.querySelector("#eou-lic").value,
      licDate: document.querySelector("#eou-lic-date").value,
      licUpto: document.querySelector("#eou-lic-upto").value,
      formType: document.querySelector("#eou-form").value,
      bondNo: document.querySelector("#eou-bond").value,
      formDate: document.querySelector("#eou-form-date").value,
      bondAmt: document.querySelector("#eou-amt").value,
      noteNo: document.querySelector("#eou-note").value,
      noteDate: document.querySelector("#eou-note-date").value,
      person: document.querySelector("#eou-person").value,
      contact: document.querySelector("#eou-contact").value,
      remarks: document.querySelector("#eou-remarks").value
    };
  }

  function fillEou(data) {
    eouTitle = data.title || eouTitle;
    document.querySelector("#eou-lic").value = data.licNo || "";
    document.querySelector("#eou-lic-date").value = data.licDate || "";
    document.querySelector("#eou-lic-upto").value = data.licUpto || "";
    document.querySelector("#eou-form").value = data.formType || "";
    document.querySelector("#eou-bond").value = data.bondNo || "";
    document.querySelector("#eou-form-date").value = data.formDate || "";
    document.querySelector("#eou-amt").value = data.bondAmt == null ? "0" : data.bondAmt;
    document.querySelector("#eou-note").value = data.noteNo || "";
    document.querySelector("#eou-note-date").value = data.noteDate || "";
    document.querySelector("#eou-person").value = data.person || "";
    document.querySelector("#eou-contact").value = data.contact || "";
    document.querySelector("#eou-remarks").value = data.remarks || "";
    document.querySelector("#eou-save").textContent = data.caption || "Save";
  }

  document.querySelector("#eou-save").addEventListener("click", async () => {
    const data = await post("/api/company-eou", eouBody(), eouTitle);
    if (!data) return;
    if (data.caption) document.querySelector("#eou-save").textContent = data.caption;
  });
  document.querySelector("#eou-close").addEventListener("click", () => { eouPanel.hidden = true; });

  window.openCompanyMore = async function openCompanyMore() {
    const response = await fetch("/api/company-more");
    if (!response.ok) return;
    fillMore(await response.json());
    morePanel.hidden = false;
  };

  window.openCompanyEou = async function openCompanyEou() {
    const response = await fetch("/api/company-eou");
    if (!response.ok) return;
    fillEou(await response.json());
    eouPanel.hidden = false;
  };

  const ptPanel = document.querySelector("#pt-details");
  const ptBody = document.querySelector("#pt-rows");
  let ptTitle = "PT Details";
  let ptRows = [];

  function paintPt() {
    ptBody.replaceChildren();
    ptRows.forEach((row, index) => {
      const tr = document.createElement("tr");
      ["pt", "min", "max"].forEach((field) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = row[field];
        input.addEventListener("keydown", (event) => {
          const key = event.key;
          if (key.length === 1 && !(key >= "0" && key <= "9") && !(key === "." && !input.value.includes("."))) {
            event.preventDefault();
          }
          if (key !== "ArrowDown" || index !== ptRows.length - 1) return;
          if (!String(row[field]).trim()) return;
          ptRows.push({ pt: "", min: "", max: "" });
          paintPt();
        });
        input.addEventListener("input", () => { row[field] = input.value; });
        td.append(input);
        tr.append(td);
      });
      ptBody.append(tr);
    });
  }

  document.querySelector("#pt-save").addEventListener("click", async () => {
    const data = await post("/api/pt-details", {
      rows: ptRows.map((row) => ({ pt: row.pt, min: row.min, max: row.max }))
    }, ptTitle);
    if (!data) return;
  });
  document.querySelector("#pt-close").addEventListener("click", () => { ptPanel.hidden = true; });

  window.openPtDetails = async function openPtDetails() {
    const response = await fetch("/api/pt-details");
    if (!response.ok) return;
    const data = await response.json();
    ptTitle = data.title || ptTitle;
    ptRows = (data.rows || []).map((row) => ({ pt: row.pt, min: row.min, max: row.max }));
    if (!ptRows.length) ptRows.push({ pt: "", min: "", max: "" });
    paintPt();
    ptPanel.hidden = false;
  };

  const printPanel = document.querySelector("#print-info");
  const printBody = document.querySelector("#print-rows");
  let printTitle = "PrintInfo";
  let printRows = [];

  function paintPrint() {
    printBody.replaceChildren();
    printRows.forEach((row, index) => {
      const tr = document.createElement("tr");
      ["topic", "curr", "height", "each"].forEach((field) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = row[field];
        input.addEventListener("keydown", (event) => {
          const key = event.key;
          if (key.length === 1 && !(key >= "0" && key <= "9") && !(key === "." && !input.value.includes("."))) {
            event.preventDefault();
          }
          if (key !== "ArrowDown" || index !== printRows.length - 1) return;
          if (!String(row[field]).trim()) return;
          printRows.push({ topic: "", curr: "", height: "", each: "" });
          paintPrint();
        });
        input.addEventListener("input", () => { row[field] = input.value; });
        td.append(input);
        tr.append(td);
      });
      printBody.append(tr);
    });
  }

  document.querySelector("#print-save").addEventListener("click", async () => {
    await post("/api/print-info", {
      rows: printRows.map((row) => ({ topic: row.topic, curr: row.curr, height: row.height, each: row.each }))
    }, printTitle);
  });
  document.querySelector("#print-close").addEventListener("click", () => { printPanel.hidden = true; });

  window.openPrintInfo = async function openPrintInfo() {
    const response = await fetch("/api/print-info");
    if (!response.ok) return;
    const data = await response.json();
    printTitle = data.title || printTitle;
    printRows = (data.rows || []).map((row) => ({
      topic: row.topic, curr: row.curr, height: row.height, each: row.each
    }));
    if (!printRows.length) printRows.push({ topic: "", curr: "", height: "", each: "" });
    paintPrint();
    printPanel.hidden = false;
  };
})();
