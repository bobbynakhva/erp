(() => {
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  const missing = "You have to enter your Company Details First in order to take Print Outs!!!\r\n\r\n GoTo :  Master -->My Company Details ";
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "tweleve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "fourty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function showInfo(message) {
    if (!info) {
      alert(message);
      return;
    }
    infoTitle.textContent = document.title || "Tamba ERP";
    infoText.textContent = message;
    info.hidden = false;
    const ok = document.querySelector("#info-ok");
    function done() {
      ok.removeEventListener("click", done);
      info.hidden = true;
    }
    if (ok) {
      ok.addEventListener("click", done);
      ok.focus();
    }
  }

  function askYes(message) {
    return new Promise((resolve) => {
      if (!ask) {
        resolve(confirm(message));
        return;
      }
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

  function escapeText(value) {
    return String(value || "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  }

  function splitMarked(value) {
    return String(value || "").split(/\r\n|\n|\r/).map((line, index) => (index === 0 ? line : line.slice(1))).map((line) => line.trim()).filter(Boolean);
  }

  function pairWords(value) {
    const number = Number(value) || 0;
    if (number < 10) return ones[number];
    if (number < 20) return teens[number - 10];
    const ten = tens[Math.floor(number / 10)];
    const one = ones[number % 10];
    return one ? `${ten} ${one}` : ten;
  }

  function moneyToWords(value) {
    let number = Math.floor(Math.abs(Number(value) || 0));
    if (!number) return "";
    const scales = [[10000000, " CRORE, "], [100000, " LAKH, "], [1000, " THOUSAND, "]];
    let text = "";
    scales.forEach(([size, label]) => {
      const count = Math.floor(number / size);
      if (!count) return;
      text += `${pairWords(count)}${label}`;
      number %= size;
    });
    const hundred = Math.floor(number / 100);
    if (hundred) text += `${ones[hundred]} HUNDRED, `;
    if (number % 100) text += pairWords(number % 100);
    return text.replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
  }

  function rupees(total) {
    const number = Number(total) || 0;
    const whole = Math.floor(Math.abs(number));
    const paise = Math.round((Math.abs(number) - whole) * 100);
    const words = moneyToWords(whole);
    const coins = paise ? ` AND PAISE ${moneyToWords(paise)}` : "";
    return `RUPEES ${words}${coins} ONLY`.replace(/\s+/g, " ").toUpperCase();
  }

  function day(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function copyValues(source, copy) {
    const from = source.querySelectorAll("input, select, textarea");
    const to = copy.querySelectorAll("input, select, textarea");
    from.forEach((el, index) => {
      const dest = to[index];
      if (!dest || !dest.parentNode) return;
      if (el.type === "checkbox" || el.type === "radio") {
        dest.replaceWith(document.createTextNode(el.checked ? "Yes" : ""));
        return;
      }
      if (el.tagName === "SELECT") {
        const chosen = el.options[el.selectedIndex];
        dest.replaceWith(document.createTextNode(chosen ? chosen.textContent : ""));
        return;
      }
      dest.replaceWith(document.createTextNode(el.value || ""));
    });
  }

  function root() {
    let box = document.querySelector("#print-root");
    if (!box) {
      box = document.createElement("div");
      box.id = "print-root";
      document.body.appendChild(box);
    }
    return box;
  }

  function openPrintPreview(title, html) {
    const modal = document.getElementById("print-preview-modal");
    const titleEl = document.getElementById("print-preview-title");
    const sheet = document.getElementById("print-preview-sheet");
    const btnPrint = document.getElementById("print-preview-btn-print");
    const btnClose = document.getElementById("print-preview-btn-close");
    const btnX = document.getElementById("print-preview-btn-x");

    const r = root();
    r.innerHTML = html;

    if (modal && sheet) {
      if (titleEl) titleEl.textContent = title || "Print Preview";
      sheet.innerHTML = html;
      modal.hidden = false;

      if (btnPrint) {
        btnPrint.onclick = () => {
          window.print();
        };
      }
      const close = () => {
        modal.hidden = true;
      };
      if (btnClose) btnClose.onclick = close;
      if (btnX) btnX.onclick = close;
    } else {
      window.print();
    }
  }
  window.openPrintPreview = openPrintPreview;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("print-preview-modal");
      if (modal && !modal.hidden) modal.hidden = true;
    }
  });

  function enquiryLines() {
    return [...document.querySelectorAll("#enq-grid tbody tr")].map((row, index) => ({
      sl: index + 1,
      code: (row.querySelector("[data-code]") || {}).value || "",
      name: (row.querySelector("[data-name]") || {}).value || "",
      uom: (row.querySelector("[data-uom]") || {}).value || "",
      moq: (row.querySelector("[data-moq]") || {}).value || "",
      rate: (row.querySelector("[data-rate]") || {}).value || "",
      amount: (row.querySelector("[data-amt]") || {}).value || ""
    })).filter((line) => line.code.trim() || line.name.trim());
  }

  function enquiryDocument(company) {
    const vendor = document.querySelector("#enq-vendor");
    const chosen = vendor ? vendor.options[vendor.selectedIndex] : null;
    const lines = enquiryLines();
    const total = document.querySelector("#enq-total")?.value || "0.00";
    const head = splitMarked(company.head);
    const address = splitMarked(chosen ? chosen.dataset.addr || "" : "");
    const facts = [
      ["Enquiry No.", `${document.querySelector("#enq-prefix")?.value || ""} ${document.querySelector("#enq-no")?.value || ""}`.trim()],
      ["Enquiry Dt.", day(document.querySelector("#enq-date")?.value)],
      ["Kind Attn", document.querySelector("#enq-attn")?.value.trim() || ""],
      ["Vendor Code", chosen ? (chosen.dataset.cust || "").trim() : ""]
    ].filter((pair) => pair[1]);
    const taxes = [
      ["GSTIN", company.gstin || "29AABCB1234F1Z5"],
      ["PAN", company.pan || company.myPan],
      ["State", "Karnataka (29)"]
    ].filter((pair) => pair[1]);
    const note = document.querySelector("#enq-cert")?.checked
      ? "Note: Enclose All Test Certificate/Warantee Card along with your Material Supply"
      : "";
    return `<article class="enq-print" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 10px;">
      <header style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
        ${head.map((line, index) => `<div style="${index ? "font-size: 11px;" : "font-size: 16px; font-weight: bold; color: #000080;"}">${escapeText(line)}</div>`).join("")}
      </header>
      <h1 style="text-align: center; font-size: 14px; margin: 6px 0; text-decoration: underline; text-transform: uppercase;">ENQUIRY</h1>
      <table class="parties" style="width: 100%; border: none; margin-bottom: 10px;"><tr>
        <td style="border: none; width: 55%; vertical-align: top;">
          <div style="font-weight: bold; font-size: 13px;">${escapeText(chosen ? chosen.textContent : "")}</div>
          ${address.map((line) => `<div style="font-size: 11px;">${escapeText(line)}</div>`).join("")}
        </td>
        <td style="border: none; width: 45%; vertical-align: top;">${facts.map(([label, value]) => `<div style="font-size: 11px; margin-bottom: 2px;"><span><b>${label}:</b> </span>${escapeText(value)}</div>`).join("")}</td>
      </tr></table>
      <table class="items" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead><tr style="background: #e9ecef; border: 1px solid #777;"><th style="padding: 4px; border: 1px solid #777;">Sl.No</th><th style="padding: 4px; border: 1px solid #777;">Item Code / Part No.</th><th style="padding: 4px; border: 1px solid #777;">Item/Component Name</th><th style="padding: 4px; border: 1px solid #777;">UOM</th><th style="padding: 4px; border: 1px solid #777; text-align: right;">MOQ</th><th style="padding: 4px; border: 1px solid #777; text-align: right;">Rate</th><th style="padding: 4px; border: 1px solid #777; text-align: right;">Amount</th></tr></thead>
        <tbody>${lines.map((line) => `<tr>
          <td style="text-align: center; border: 1px solid #777; padding: 4px;">${line.sl}</td>
          <td style="border: 1px solid #777; padding: 4px;">${escapeText(line.code)}</td>
          <td style="border: 1px solid #777; padding: 4px;">${escapeText(line.name)}</td>
          <td style="border: 1px solid #777; padding: 4px; text-align: center;">${escapeText(line.uom)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${escapeText(line.moq)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px;">${escapeText(line.rate)}</td>
          <td style="text-align: right; border: 1px solid #777; padding: 4px; font-weight: bold;">${escapeText(line.amount)}</td>
        </tr>`).join("")}</tbody>
        <tfoot><tr style="font-weight: bold; background: #f0f0f0;"><td colspan="6" style="padding: 4px; text-align: right; border: 1px solid #777;">Total Enquiry Value</td><td style="text-align: right; border: 1px solid #777; padding: 4px; color: #000080;">${escapeText(total)}</td></tr></tfoot>
      </table>
      <p style="font-size: 11px; font-weight: bold; margin-top: 6px;">${escapeText(rupees(total))}</p>
      ${note ? `<p style="font-size: 10px; color: #b00; font-weight: bold;">${escapeText(note)}</p>` : ""}
      <footer style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 11px;">
        <div>${taxes.map(([label, value]) => `<div><span>${label}:</span> ${escapeText(value)}</div>`).join("")}</div>
        <div style="font-weight: bold; text-align: right; margin-top: 25px;">For ${escapeText(head[0] || "")}<br><br><br>Authorised Signatory</div>
      </footer>
    </article>`;
  }

  async function printEnquiry() {
    const save = document.querySelector("#enq-save");
    const modify = document.querySelector("#enq-modify");
    if (modify && modify.disabled) {
      if (await askYes("Do you want to save changes?")) {
        if (save) save.click();
        return;
      }
    }
    if (!enquiryLines().length) return showInfo("No data to Print...");
    const response = await fetch("/api/print-head");
    const company = await response.json();
    if (!response.ok || company.error) return showInfo(company.error || missing);
    openPrintPreview("Enquiry", enquiryDocument(company));
  }

  window.smartPrint = async function smartPrint(section) {
    if (!section || section.hidden) return;
    if (section.id === "enq") return printEnquiry();
    let head = { head: "SMART ENTERPRISES" };
    try {
      const response = await fetch("/api/print-head");
      if (response.ok) {
        const data = await response.json();
        if (data && data.head) head = data;
      }
    } catch (e) {}

    const copy = section.cloneNode(true);
    copyValues(section, copy);
    copy.querySelectorAll("button, .item-menu, .actions, .corres, input[type='file']").forEach((el) => el.remove());
    
    const title = (section.querySelector("h1, h2, legend")?.textContent || "Document Print").trim();
    const docHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 12px; color: #000;">
        <div style="border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; white-space: pre-wrap; color: #000080;">${escapeText(head.head)}</div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 6px; text-transform: uppercase; text-decoration: underline;">${escapeText(title)}</div>
        </div>
        <div>${copy.innerHTML}</div>
      </div>
    `;
    openPrintPreview(title, docHtml);
  };

  // Safe beforeprint handler so calling window.print() directly NEVER outputs an empty page
  window.addEventListener("beforeprint", () => {
    let r = document.getElementById("print-root");
    if (!r || !r.innerHTML.trim()) {
      const visible = [...document.querySelectorAll("section:not([hidden]), .popup:not([hidden]), .modal:not([hidden])")].filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const topSection = visible[visible.length - 1];
      if (topSection) {
        if (!r) {
          r = document.createElement("div");
          r.id = "print-root";
          document.body.appendChild(r);
        }
        const copy = topSection.cloneNode(true);
        copyValues(topSection, copy);
        copy.querySelectorAll("button, .item-menu, .actions, .corres, input[type='file']").forEach((e) => e.remove());
        r.innerHTML = copy.innerHTML;
      }
    }
  });

  // Attach default smartPrint to legacy buttons
  [
    ["#enq-print", "#enq"],
    ["#shift-print", "#shift"]
  ].forEach(([button, panel]) => {
    const el = document.querySelector(button);
    if (el) el.addEventListener("click", () => window.smartPrint(document.querySelector(panel)));
  });
})();
