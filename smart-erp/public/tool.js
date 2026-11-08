(() => {
  const panel = document.querySelector("#tool");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  let data = { stores: [], categories: [], items: [], stock: [], open: [] };
  let picked = null;
  let returning = null;

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

  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function asOf(value) {
    const parts = String(value || "").split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function paint() {
    document.querySelector("#tool-asof").textContent = `Materials Issued As On ${asOf(document.querySelector("#tool-date").value)}`;
    document.querySelector("#tool-store").innerHTML = `<option value=""></option>${data.stores.map((row) => `<option value="${row.id}">${row.name}</option>`).join("")}`;
    document.querySelector("#tool-category").innerHTML = data.categories.map((row) => `<option value="${row.id}">${row.name}</option>`).join("");
    const items = data.items.length ? [{ id: 0, code: "ALL" }, ...data.items] : [];
    document.querySelector("#tool-item").innerHTML = items.map((row) => `<option value="${row.id}">${row.code}</option>`).join("");
    document.querySelector("#tool-stock-grid").innerHTML = `<table><thead><tr><th>Sl.No</th><th>Item</th><th>Qty</th></tr></thead><tbody>${
      data.stock.map((row) => `<tr data-stock="${row.id}"><td>${row.sl}</td><td>${row.code}</td><td>${row.qty}</td></tr>`).join("")
    }</tbody></table>`;
    document.querySelector("#tool-open-grid").innerHTML = `<table><thead><tr><th>Sl.No</th><th>Issued To</th><th>Item</th><th>Qty Issued</th><th>Date Issued</th></tr></thead><tbody>${
      data.open.map((row) => `<tr data-open="${row.entryId}"><td>${row.sl}</td><td>${row.whom}</td><td>${row.code}</td><td>${row.qty}</td><td>${row.date}</td></tr>`).join("")
    }</tbody></table>`;
  }

  async function load(extra) {
    const store = document.querySelector("#tool-store").value;
    const category = document.querySelector("#tool-category").value;
    const item = document.querySelector("#tool-item").value;
    const params = new URLSearchParams();
    if (store) params.set("store", store);
    if (extra !== "store" && category) params.set("category", category);
    if (extra === "item" && item) params.set("item", item);
    const response = await fetch(`/api/tool?${params}`);
    if (!response.ok) return;
    const next = await response.json();
    const storeValue = store;
    const categoryValue = extra === "store" ? "" : category;
    const itemValue = extra === "item" ? item : "0";
    data = next;
    paint();
    document.querySelector("#tool-store").value = storeValue;
    if (categoryValue) document.querySelector("#tool-category").value = categoryValue;
    if (document.querySelector("#tool-item").options.length) document.querySelector("#tool-item").value = itemValue || "0";
  }

  document.querySelector("#tool-date").addEventListener("change", () => {
    document.querySelector("#tool-asof").textContent = `Materials Issued As On ${asOf(document.querySelector("#tool-date").value)}`;
    load("item");
  });
  document.querySelector("#tool-store").addEventListener("change", () => load("store"));
  document.querySelector("#tool-category").addEventListener("change", () => {
    if (!document.querySelector("#tool-category").value) return showInfo("Please select a Category.....");
    load("category");
  });
  document.querySelector("#tool-item").addEventListener("change", () => load("item"));
  document.querySelector("#tool-stock-grid").addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-stock]");
    if (!row) return;
    picked = data.stock.find((item) => String(item.id) === row.dataset.stock) || null;
    document.querySelectorAll("#tool-stock-grid tr").forEach((line) => line.classList.toggle("picked", line === row));
    document.querySelector("#tool-unit").textContent = picked ? picked.unit : "";
    document.querySelector("#tool-qty").value = "";
    document.querySelector("#tool-whom").value = "";
    document.querySelector("#tool-desc").value = "";
  });
  document.querySelector("#tool-open-grid").addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-open]");
    if (!row) return;
    returning = data.open.find((item) => String(item.entryId) === row.dataset.open) || null;
    document.querySelectorAll("#tool-open-grid tr").forEach((line) => line.classList.toggle("picked", line === row));
    if (returning) {
      document.querySelector("#tool-back").value = returning.qty || "";
      document.querySelector("#tool-rem").value = "";
    }
  });
  document.querySelector("#tool-issue").addEventListener("click", async () => {
    if (!document.querySelector("#tool-store").value) return showInfo("Please Select a Store from the list");
    const qty = Number(document.querySelector("#tool-qty").value);
    const stock = picked ? Number(picked.qty) : 0;
    if (!(qty > 0) || qty > stock) return showInfo(" Invalid Quantity ... ");
    if (!document.querySelector("#tool-whom").value.trim()) return showInfo(" You must Enter the person name to whom issue is made ... ");
    if (!(await askYes("MAKE SURE YOUR STOCK REDUCTION IS EXACT.\r\nAre You sure to save?"))) return;
    const response = await fetch("/api/tool/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: Number(document.querySelector("#tool-store").value),
        code: picked.code,
        qty,
        whom: document.querySelector("#tool-whom").value,
        remark: document.querySelector("#tool-desc").value
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(body.error || " Invalid Quantity ... ");
    await showInfo(" Stock Altered successfully !!!");
    if (body.rolAlert) {
      await showInfo(body.rolAlert);
    }
    picked = null;
    document.querySelector("#tool-unit").textContent = "";
    await load("item");
  });
  document.querySelector("#tool-return").addEventListener("click", async () => {
    const out = returning ? Number(returning.qty) : 0;
    const qty = Number(document.querySelector("#tool-back").value);
    if (!(qty > 0) || qty > out) return showInfo(`Return Qty. should  be equal to  ${out}`);
    const message = `Do you want to return ?\r\nITEM: ${returning.code}\r\nISSUED TO: ${returning.whom}`;
    if (!(await askYes(message))) return;
    const response = await fetch("/api/tool/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: returning.entryId,
        qty,
        remark: document.querySelector("#tool-rem").value,
        storeId: Number(document.querySelector("#tool-store").value) || returning.storeId,
        whom: document.querySelector("#tool-whom").value,
        formRemark: document.querySelector("#tool-desc").value
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return showInfo(body.error || `Return Qty. should  be equal to  ${out}`);
    document.querySelector("#tool-back").value = "";
    returning = null;
    await load("item");
  });
  document.querySelector("#tool-print").addEventListener("click", () => {
    if (!data.open || data.open.length === 0) {
      return showInfo("No data to Print...");
    }
    const d = document.querySelector("#tool-date").value || "";
    window.open(`/api/print?type=tool-crib&date=${encodeURIComponent(asOf(d))}`, "_blank");
  });
  document.querySelector("#tool-close").addEventListener("click", () => { panel.hidden = true; });

  window.openTool = () => {
    panel.hidden = false;
    document.querySelector("#tool-date").value = today();
    document.querySelector("#tool-store").value = "";
    document.querySelector("#tool-qty").value = "";
    document.querySelector("#tool-whom").value = "";
    document.querySelector("#tool-desc").value = "";
    document.querySelector("#tool-back").value = "";
    document.querySelector("#tool-rem").value = "";
    document.querySelector("#tool-unit").textContent = "";
    picked = null;
    returning = null;
    load("store");
  };
  window.closeTool = () => { panel.hidden = true; };
})();
