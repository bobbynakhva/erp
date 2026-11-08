(() => {
  const panel = document.querySelector("#assm");
  const list = document.querySelector("#assm-list");
  const body = document.querySelector("#assm-body");
  const possible = document.querySelector("#assm-possible");
  let assemblies = [];
  let shown = null;

  function textNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return String(number);
  }

  function paintList(rows) {
    list.innerHTML = "";
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = String(row.id);
      option.textContent = row.code;
      list.appendChild(option);
    });
  }

  function reportRows(assembly, required) {
    return assembly.lines.map((line) => {
      const need = line.util * required;
      const deficit = line.onHand >= need ? "No Deficiency" : textNumber(need - line.onHand);
      return {
        slno: line.slno,
        code: line.code,
        util: line.util,
        need,
        onHand: line.onHand,
        deficit,
        uom: line.uom
      };
    });
  }

  function paintReport(rows) {
    body.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      [row.slno, row.code, textNumber(row.util), textNumber(row.need), textNumber(row.onHand), row.deficit, row.uom].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    const usable = rows.filter((row) => row.util !== 0);
    if (!usable.length) {
      possible.hidden = true;
      return;
    }
    const count = usable.reduce((lowest, row) => {
      const made = Math.floor(row.onHand / row.util);
      return lowest === null || made < lowest ? made : lowest;
    }, null);
    possible.hidden = false;
    possible.textContent = "No. of Possible Assemblies : " + count;
  }

  function requiredQty() {
    const value = Number(document.querySelector("#assm-qty").value);
    return Number.isFinite(value) ? value : 0;
  }

  function refresh() {
    if (!shown) {
      paintReport([]);
      possible.hidden = true;
      return;
    }
    paintReport(reportRows(shown, requiredQty()));
  }

  async function load() {
    const response = await fetch("/api/assm-req");
    if (response.status === 401) return;
    const data = await response.json();
    assemblies = data.assemblies || [];
    paintList(assemblies);
    shown = null;
    body.innerHTML = "";
    possible.hidden = true;
  }

  list.addEventListener("change", () => {
    shown = assemblies.find((row) => String(row.id) === list.value) || null;
  });

  document.querySelector("#assm-search").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const wanted = event.target.value.trim().toLowerCase();
    const found = assemblies.find((row) => row.code.toLowerCase().includes(wanted));
    if (!found) return;
    list.value = String(found.id);
    shown = found;
  });

  document.querySelector("#assm-qty").addEventListener("input", () => {
    const box = document.querySelector("#assm-qty");
    box.value = box.value.replace(/[^\d]/g, "");
    if (body.children.length) refresh();
  });

  document.querySelector("#assm-details").addEventListener("click", () => {
    shown = assemblies.find((row) => String(row.id) === list.value) || null;
    if (!shown) return;
    refresh();
  });

  document.querySelector("#assm-print")?.addEventListener("click", () => {
    if (!shown || !body.children.length) {
      alert("No data to Print...");
      return;
    }
    const qty = requiredQty() || 1;
    window.open(`/api/print?type=assm-req&id=${encodeURIComponent(shown.id)}&qty=${encodeURIComponent(qty)}`, "_blank");
  });

  document.querySelector("#assm-close").addEventListener("click", () => { panel.hidden = true; });
  window.openAssm = async () => { panel.hidden = false; await load(); };
  window.closeAssm = () => { panel.hidden = true; };
})();
