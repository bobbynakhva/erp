(() => {
  const panel = document.querySelector("#esti");
  const grid = document.querySelector("#esti-grid");
  const idBox = document.querySelector("#esti-id");
  const saveButton = document.querySelector("#esti-save");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  let customers = [];
  let items = [];
  let processes = [];
  let ids = [];
  let nextId = 1;
  let saved = false;
  let hours = {};

  function showInfo(message) {
    return new Promise((resolve) => {
      infoTitle.textContent = document.title || "Tamba ERP";
      infoText.textContent = message;
      info.hidden = false;
      const ok = document.querySelector("#info-ok");
      function done() {
        ok.removeEventListener("click", done);
        info.hidden = true;
        resolve();
      }
      ok.addEventListener("click", done);
      ok.focus();
    });
  }

  function askYes(message) {
    return new Promise((resolve) => {
      askTitle.textContent = document.title || "Tamba ERP";
      askText.textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(value) {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        ask.hidden = true;
        resolve(value);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      yes.focus();
    });
  }

  function num(value) {
    const number = Number(String(value ?? "").trim());
    return Number.isFinite(number) ? number : 0;
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function textOf(value) {
    return String(Math.round(value * 1e12) / 1e12);
  }

  function mode() {
    return document.querySelector("input[name='esti-mode']:checked").value;
  }

  function calculate() {
    const squareKg = round2(num(document.querySelector("#esti-slen").value) * num(document.querySelector("#esti-th").value) * num(document.querySelector("#esti-wd").value) * num(document.querySelector("#esti-sden").value) / 1000000);
    const squareCost = round2(num(document.querySelector("#esti-srate").value) * squareKg);
    const roundKg = 3.14 * num(document.querySelector("#esti-dia").value) * num(document.querySelector("#esti-dia").value) / 4 * num(document.querySelector("#esti-rlen").value) * num(document.querySelector("#esti-rden").value) / 1000000;
    const roundCost = round2(num(document.querySelector("#esti-rrate").value) * num(textOf(roundKg)));
    document.querySelector("#esti-skg").value = textOf(squareKg);
    document.querySelector("#esti-scost").value = textOf(squareCost);
    document.querySelector("#esti-rkg").value = textOf(roundKg);
    document.querySelector("#esti-rcost").value = textOf(roundCost);
    const rmTotal = num(textOf(roundCost)) + num(textOf(squareCost));
    let conv = 0;
    processes.forEach((process) => {
      const amount = num(hours[process.id]) * process.rate;
      conv += amount;
      const cell = grid.querySelector(`[data-amt="${process.id}"]`);
      if (cell) cell.textContent = textOf(amount);
    });
    conv = round2(conv);
    document.querySelector("#esti-conv").value = textOf(conv);
    const total = num(textOf(conv)) + num(textOf(rmTotal));
    const over = total * num(document.querySelector("#esti-overp").value) / 100;
    const mar = total * num(document.querySelector("#esti-marp").value) / 100;
    const risk = total * num(document.querySelector("#esti-riskp").value) / 100;
    const grand = round2(num(textOf(over)) + num(textOf(mar)) + num(textOf(risk)) + num(textOf(total)));
    document.querySelector("#esti-over").value = textOf(over);
    document.querySelector("#esti-mar").value = textOf(mar);
    document.querySelector("#esti-risk").value = textOf(risk);
    document.querySelector("#esti-grand").value = textOf(grand);
    return { squareKg, squareCost, roundKg, roundCost, rmTotal, conv, total, over, mar, risk, grand };
  }

  function paintGrid() {
    grid.innerHTML = `<table><thead><tr><th>Operation</th><th>Hr.Rate</th><th>Hrs.</th><th>Amt.Rs.</th></tr></thead><tbody>${
      processes.map((process) => `<tr>
        <td>${process.name}</td>
        <td>${textOf(process.rate)}</td>
        <td class="hrs"><input data-hours="${process.id}" value="${hours[process.id] || ""}"></td>
        <td data-amt="${process.id}"></td>
      </tr>`).join("")
    }</tbody></table>`;
    calculate();
  }

  function fillLists() {
    document.querySelector("#esti-cust").innerHTML = `<option value=""></option>${customers.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
    document.querySelector("#esti-code").innerHTML = `<option value=""></option>${items.map((row) => `<option value="${row.code}">${row.code}</option>`).join("")}`;
  }

  function dateForPicker(value) {
    const text = String(value || "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!dmy) return "";
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  function blank() {
    ["#esti-part", "#esti-sno", "#esti-date", "#esti-type", "#esti-attn", "#esti-smtl", "#esti-sfn", "#esti-th", "#esti-wd", "#esti-slen", "#esti-sden", "#esti-srate", "#esti-rmtl", "#esti-rfn", "#esti-dia", "#esti-rlen", "#esti-rden", "#esti-rrate"].forEach((selector) => {
      document.querySelector(selector).value = "";
    });
    document.querySelector("#esti-qty").value = "0";
    document.querySelector("#esti-overp").value = "0";
    document.querySelector("#esti-marp").value = "0";
    document.querySelector("#esti-riskp").value = "0";
    document.querySelector("#esti-cust").value = "";
    document.querySelector("#esti-code").value = "";
    hours = {};
  }

  function apply(data) {
    customers = data.customers || [];
    items = data.items || [];
    processes = data.processes || [];
    ids = data.ids || [];
    nextId = data.nextId || 1;
    fillLists();
    if (!data.estimate) {
      saved = false;
      idBox.value = String(nextId);
      blank();
      paintGrid();
      saveButton.textContent = "Save";
      document.querySelector("#esti-delete").disabled = true;
      document.querySelector("#esti-modify").disabled = true;
      return;
    }
    const row = data.estimate;
    saved = true;
    idBox.value = String(row.id);
    document.querySelector("#esti-cust").value = String(row.custId || "");
    document.querySelector("#esti-code").value = row.code;
    const item = items.find((entry) => entry.code === row.code);
    document.querySelector("#esti-part").value = item ? item.name : "";
    document.querySelector("#esti-qty").value = row.qty;
    document.querySelector("#esti-sno").value = row.sno;
    document.querySelector("#esti-date").value = dateForPicker(row.date);
    document.querySelector("#esti-type").value = row.type;
    document.querySelector("#esti-attn").value = row.contact;
    document.querySelector("#esti-smtl").value = row.square.mtl;
    document.querySelector("#esti-sfn").value = row.square.fn;
    document.querySelector("#esti-th").value = row.square.th;
    document.querySelector("#esti-wd").value = row.square.wd;
    document.querySelector("#esti-slen").value = row.square.len;
    document.querySelector("#esti-sden").value = row.square.den;
    document.querySelector("#esti-srate").value = row.square.rate;
    document.querySelector("#esti-rmtl").value = row.round.mtl;
    document.querySelector("#esti-rfn").value = row.round.fn;
    document.querySelector("#esti-dia").value = row.round.dia;
    document.querySelector("#esti-rlen").value = row.round.len;
    document.querySelector("#esti-rden").value = row.round.den;
    document.querySelector("#esti-rrate").value = row.round.rate;
    document.querySelector("#esti-overp").value = row.overp;
    document.querySelector("#esti-marp").value = row.marp;
    document.querySelector("#esti-riskp").value = row.riskp;
    hours = { ...row.hours };
    paintGrid();
    saveButton.textContent = "Modify";
    document.querySelector("#esti-delete").disabled = false;
    document.querySelector("#esti-modify").disabled = false;
  }

  async function load(id) {
    const query = `?mode=${encodeURIComponent(mode())}${id ? `&id=${encodeURIComponent(id)}` : ""}`;
    const response = await fetch(`/api/esti${query}`);
    if (!response.ok) return null;
    return response.json();
  }

  async function refresh(id) {
    const data = await load(id || 0);
    if (!data) return;
    if (!id && !data.ids.length) {
      apply(data);
      await showInfo("No Records to display!");
      return;
    }
    apply(data);
  }

  function payload(calc) {
    return {
      id: Number(idBox.value),
      custId: Number(document.querySelector("#esti-cust").value),
      code: document.querySelector("#esti-code").value,
      sno: document.querySelector("#esti-sno").value,
      qty: document.querySelector("#esti-qty").value,
      date: document.querySelector("#esti-date").value,
      type: document.querySelector("#esti-type").value,
      contact: document.querySelector("#esti-attn").value,
      square: {
        mtl: document.querySelector("#esti-smtl").value,
        fn: document.querySelector("#esti-sfn").value,
        th: document.querySelector("#esti-th").value,
        wd: document.querySelector("#esti-wd").value,
        len: document.querySelector("#esti-slen").value,
        den: document.querySelector("#esti-sden").value,
        rate: document.querySelector("#esti-srate").value
      },
      round: {
        mtl: document.querySelector("#esti-rmtl").value,
        fn: document.querySelector("#esti-rfn").value,
        dia: document.querySelector("#esti-dia").value,
        len: document.querySelector("#esti-rlen").value,
        den: document.querySelector("#esti-rden").value,
        rate: document.querySelector("#esti-rrate").value
      },
      overp: document.querySelector("#esti-overp").value,
      marp: document.querySelector("#esti-marp").value,
      riskp: document.querySelector("#esti-riskp").value,
      squareKg: calc.squareKg,
      squareCost: calc.squareCost,
      roundKg: calc.roundKg,
      roundCost: calc.roundCost,
      rmTotal: calc.rmTotal,
      conv: calc.conv,
      totalCost: calc.total,
      over: calc.over,
      mar: calc.mar,
      risk: calc.risk,
      grand: calc.grand,
      lines: processes.map((process) => ({ procId: process.id, rate: process.rate, hours: hours[process.id] || 0 }))
    };
  }

  async function saveEstimate() {
    if (!document.querySelector("#esti-cust").value) return showInfo("Please select the Customer Name");
    if (!document.querySelector("#esti-sno").value.trim()) return showInfo("Please Enter the Serial Number ");
    if (!document.querySelector("#esti-code").value.trim()) return showInfo("Please Enter the Drawing Number ");
    if (!items.some((item) => item.code === document.querySelector("#esti-code").value)) return showInfo("Please Enter the Valid Drawing Number ");
    if (!document.querySelector("#esti-part").value.trim()) return showInfo("Please Enter the Part Name");
    if (!document.querySelector("#esti-qty").value.trim()) return showInfo("Please Enter the Quantity");
    if (!document.querySelector("#esti-attn").value.trim()) return showInfo("Please Enter the Reference ");
    if (!document.querySelector("#esti-date").value.trim()) return showInfo("Please Enter the Date");
    if (!document.querySelector("#esti-type").value.trim()) return showInfo("Please Enter the Type of Work  'Manufacturing/Labour Work'");
    const calc = calculate();
    if (!(calc.grand > 0)) return showInfo(" Grand Total Should Not be  Zero !!!");
    if (!(await askYes(`Are You Sure To ${saveButton.textContent}?`))) return;
    const response = await fetch("/api/esti/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(calc))
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(body.error || "Please Enter the Valid Drawing Number ");
    await showInfo("Records Stored");
    await refresh(Number(idBox.value));
  }

  async function deleteEstimate() {
    if (!saved) return;
    if (!(await askYes("Are You Sure To Delete?"))) return;
    const response = await fetch("/api/esti/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(idBox.value) })
    });
    if (!response.ok) return;
    await showInfo("Records Deleted");
    const data = await load(0);
    if (!data || !data.ids.length) {
      if (data) apply(data);
      await showInfo("No Records to display!");
      return;
    }
    apply(data);
  }

  async function move(where) {
    if (!ids.length) return showInfo("No Records to display!");
    const current = Number(idBox.value);
    let target = ids[0];
    if (where === "last") target = ids[ids.length - 1];
    if (where === "prev") {
      const earlier = ids.filter((id) => id < current);
      if (!earlier.length) return showInfo("No Records to display!");
      target = earlier[earlier.length - 1];
    }
    if (where === "next") {
      const later = ids.find((id) => id > current);
      if (!later) return showInfo("No Records to display!");
      target = later;
    }
    await refresh(target);
  }

  grid.addEventListener("input", (event) => {
    const box = event.target;
    if (!box.dataset.hours) return;
    hours[box.dataset.hours] = box.value;
    calculate();
  });

  document.querySelector("#esti-code").addEventListener("change", () => {
    const item = items.find((entry) => entry.code === document.querySelector("#esti-code").value);
    document.querySelector("#esti-part").value = item ? item.name : "";
  });

  panel.addEventListener("input", (event) => {
    if (event.target.closest("#esti-grid") || event.target.id === "esti-code") return;
    calculate();
  });

  document.querySelectorAll("input[name='esti-mode']").forEach((box) => {
    box.addEventListener("change", () => { refresh(0); });
  });
  document.querySelector("#esti-new").addEventListener("click", async () => {
    const data = await load(0);
    if (!data) return;
    data.estimate = null;
    apply(data);
  });
  saveButton.addEventListener("click", () => { saveEstimate(); });
  document.querySelector("#esti-modify").addEventListener("click", () => { saveEstimate(); });
  document.querySelector("#esti-delete").addEventListener("click", () => { deleteEstimate(); });
  document.querySelector("#esti-first").addEventListener("click", () => { move("first"); });
  document.querySelector("#esti-prev").addEventListener("click", () => { move("prev"); });
  document.querySelector("#esti-next").addEventListener("click", () => { move("next"); });
  document.querySelector("#esti-last").addEventListener("click", () => { move("last"); });
  document.querySelector("#esti-print").addEventListener("click", () => {
    const id = Number(idBox.value);
    if (!saved || !id) return;
    window.open(`/api/print?type=esti&id=${encodeURIComponent(id)}&mode=${encodeURIComponent(mode())}`, "_blank");
  });
  document.querySelector("#esti-close").addEventListener("click", () => { panel.hidden = true; });

  window.openEsti = () => {
    panel.hidden = false;
    refresh(0);
  };
  window.closeEsti = () => { panel.hidden = true; };
})();
