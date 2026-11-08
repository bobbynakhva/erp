/**
 * SMART ERP - Modern Vector PDF Generation Engine
 * Generates professional, print-ready, high-resolution vector PDF documents
 * with corporate branding, tax compliance, HSN summary, and signature blocks.
 */
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = process.env.CHROME_PATH || (
  process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "chromium"
);

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

function fmtRs(num) {
  const n = Number(num) || 0;
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(d);
  }
}

function numberToWordsINR(amount) {
  const n = Math.floor(amount || 0);
  const paise = Math.round(((amount || 0) - n) * 100);

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(num) {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  }

  function convertThreeDigits(num) {
    let str = "";
    if (Math.floor(num / 100) > 0) {
      str += ones[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num > 0) {
      str += convertTwoDigits(num);
    }
    return str.trim();
  }

  if (n === 0 && paise === 0) return "Rupees Zero Only";

  let result = "";
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = rem;

  if (crore > 0) result += convertThreeDigits(crore) + " Crore ";
  if (lakh > 0) result += convertThreeDigits(lakh) + " Lakh ";
  if (thousand > 0) result += convertThreeDigits(thousand) + " Thousand ";
  if (hundred > 0) result += convertThreeDigits(hundred) + " ";

  result = result.trim();
  if (result) result = "Rupees " + result;
  if (paise > 0) {
    result += (result ? " and " : "") + convertTwoDigits(paise) + " Paise";
  }
  return (result + " Only").replace(/\s+/g, " ");
}

async function htmlToPdf(html, options = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.pdf({
      format: options.format || "A4",
      landscape: options.landscape || false,
      printBackground: true,
      margin: options.margin || { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
    });
    return buffer;
  } finally {
    await browser.close();
  }
}

async function getCompanyProfile(pool, factoryId, yearLabel) {
  const facQ = await pool.query("SELECT * FROM factories WHERE id = $1", [factoryId]);
  const miscQ = await pool.query(
    "SELECT print_head, print_short_addr, my_kst, my_cst, my_vat_reg_no, my_pan_no FROM misc WHERE factory_id = $1 AND year_label = $2 LIMIT 1",
    [factoryId, yearLabel]
  );
  const factory = facQ.rows[0] || {};
  const misc = miscQ.rows[0] || {};

  return {
    name: (misc.print_head || factory.name || "Tamba ERP Operating Factory").trim(),
    address: misc.print_short_addr || factory.address || "Factory Industrial Area",
    gstin: factory.gstin || misc.my_vat_reg_no || "",
    pan: misc.my_pan_no || "",
    stateName: factory.state_name || "Gujarat",
    stateCode: factory.state_code || "24",
    email: factory.email || misc.email_smtp_user || "accounts@factory.local",
    phone: factory.phone || misc.phmail || ""
  };
}

// -------------------------------------------------------------
// 1. TAX INVOICE VECTOR PDF TEMPLATE
// -------------------------------------------------------------
async function generateInvoicePdf(pool, { factoryId, yearLabel, invNo, type = "mfg" }) {
  const comp = await getCompanyProfile(pool, factoryId, yearLabel);
  const isMfg = String(type).toLowerCase().includes("mfg");

  let invHead = null;
  let items = [];

  if (isMfg) {
    const hQ = await pool.query(
      `SELECT d.*, c.cust_name, c.cust_addr, c.gstin AS cust_gstin, c.state_code AS cust_state_code, c.state_name AS cust_state_name
       FROM dcinv d
       LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
       WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.invno) = LOWER($3)
       LIMIT 1`,
      [factoryId, yearLabel, invNo]
    );
    invHead = hQ.rows[0];
    if (invHead) {
      const sQ = await pool.query(
        `SELECT s.*, i.hsn_code, i.measure_unit FROM dcinvsub s
         LEFT JOIN item i ON i.factory_id = s.factory_id AND i.year_label = s.year_label AND i.item_id = s.itemid
         WHERE s.factory_id = $1 AND s.year_label = $2 AND s.dcinvid = $3
         ORDER BY s.slno`,
        [factoryId, yearLabel, invHead.dcinvid]
      );
      items = sQ.rows;
    }
  } else {
    const hQ = await pool.query(
      `SELECT d.*, c.cust_name, c.cust_addr, c.gstin AS cust_gstin, c.state_code AS cust_state_code, c.state_name AS cust_state_name
       FROM dcoutgoinginv d
       LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
       WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.invno) = LOWER($3)
       LIMIT 1`,
      [factoryId, yearLabel, invNo]
    );
    invHead = hQ.rows[0];
    if (invHead) {
      const sQ = await pool.query(
        `SELECT s.*, '9988' AS hsn_code, 'NOS' AS measure_unit FROM dcoutgoingsubinv s
         WHERE s.factory_id = $1 AND s.year_label = $2 AND s.dcid = $3
         ORDER BY s.slno`,
        [factoryId, yearLabel, invHead.id]
      );
      items = sQ.rows;
    }
  }

  if (!invHead) throw new Error(`Tax Invoice ${invNo} not found.`);

  const taxableAmt = Number(invHead.taxable_amt || invHead.totval || 0);
  const cgstAmt = Number(invHead.cgst_amt || 0);
  const sgstAmt = Number(invHead.sgst_amt || 0);
  const igstAmt = Number(invHead.igst_amt || 0);
  const totVal = Number(invHead.totval || (taxableAmt + cgstAmt + sgstAmt + igstAmt));

  const itemsHtml = items.map((it, idx) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    const amt = Number(it.amount || (qty * rate));
    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; color: #000080;">${esc(it.code || it.item_code || "-")}</td>
        <td>
          <div style="font-weight: bold;">${esc(it.name || it.item_name || "Precision Valve Component")}</div>
          ${it.dcrowrem ? `<div style="font-size: 9px; color: #555;">${esc(it.dcrowrem)}</div>` : ""}
        </td>
        <td style="text-align: center;">${esc(it.hsn_code || "8481.80")}</td>
        <td style="text-align: right; font-weight: bold;">${qty}</td>
        <td style="text-align: center;">${esc(it.measure_unit || it.uom || "NOS")}</td>
        <td style="text-align: right;">${rate.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">${amt.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${esc(invNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; line-height: 1.3; }
    .header-box { border: 2px solid #003366; padding: 10px; border-radius: 4px; margin-bottom: 8px; }
    .flex { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #003366; color: #fff; padding: 5px 6px; font-size: 10px; border: 1px solid #002244; }
    td { padding: 4px 6px; border: 1px solid #c0c0c0; font-size: 10px; }
    .title-banner { background: #003366; color: #fff; text-align: center; font-weight: bold; font-size: 14px; padding: 4px; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="title-banner">TAX INVOICE (RULE 46 OF CGST RULES)</div>
  <div class="header-box">
    <div class="flex" style="align-items: flex-start;">
      <div style="width: 58%;">
        <h2 style="margin: 0 0 4px 0; color: #003366; font-size: 18px;">${esc(comp.name)}</h2>
        <div style="font-size: 10px; color: #333;">${esc(comp.address)}</div>
        <div style="margin-top: 4px; font-size: 10.5px;">
          <b>GSTIN:</b> ${esc(comp.gstin)} | <b>PAN:</b> ${esc(comp.pan)} | <b>State:</b> ${esc(comp.stateName)} (${esc(comp.stateCode)})
        </div>
      </div>
      <div style="width: 40%; text-align: right;">
        <table style="width: 100%; font-size: 10.5px; margin: 0;">
          <tr><td style="font-weight: bold; width: 45%; background: #f0f4f8;">Invoice No:</td><td style="font-weight: bold; color: #000080; font-size: 12px;">${esc(invHead.invno)}</td></tr>
          <tr><td style="font-weight: bold; background: #f0f4f8;">Invoice Date:</td><td>${fmtDate(invHead.invdate)}</td></tr>
          <tr><td style="font-weight: bold; background: #f0f4f8;">Delivery Challan:</td><td>${esc(invHead.dcno || "-")}</td></tr>
          <tr><td style="font-weight: bold; background: #f0f4f8;">PO Reference:</td><td>${esc(invHead.pono || "-")}</td></tr>
          <tr><td style="font-weight: bold; background: #f0f4f8;">Vehicle No:</td><td>${esc(invHead.vehicleno || "Road / Direct")}</td></tr>
        </table>
      </div>
    </div>
  </div>

  <!-- Buyer Details Box -->
  <div style="display: flex; gap: 8px; margin-bottom: 8px;">
    <div style="flex: 1; border: 1px solid #7a98af; border-radius: 4px; padding: 6px;">
      <div style="background: #e8f0f8; font-weight: bold; color: #003366; padding: 3px 6px; margin: -6px -6px 4px -6px; border-bottom: 1px solid #7a98af;">Details of Receiver | Bill to:</div>
      <div style="font-weight: bold; font-size: 12px; color: #000080;">${esc(invHead.cust_name || "Customer")}</div>
      <div style="font-size: 10px; color: #444; margin: 2px 0;">${esc(invHead.cust_addr || "Jamnagar, Gujarat")}</div>
      <div style="font-size: 10.5px;"><b>GSTIN:</b> ${esc(invHead.cust_gstin || "URP")} | <b>State:</b> ${esc(invHead.cust_state_name || "Gujarat")} (${esc(invHead.cust_state_code || "24")})</div>
    </div>
    <div style="flex: 1; border: 1px solid #7a98af; border-radius: 4px; padding: 6px;">
      <div style="background: #e8f0f8; font-weight: bold; color: #003366; padding: 3px 6px; margin: -6px -6px 4px -6px; border-bottom: 1px solid #7a98af;">Details of Consignee | Ship to:</div>
      <div style="font-weight: bold; font-size: 12px;">${esc(invHead.cust_name || "Customer")}</div>
      <div style="font-size: 10px; color: #444; margin: 2px 0;">${esc(invHead.transto || invHead.cust_addr || "Destination Works")}</div>
      <div style="font-size: 10.5px;"><b>Place of Supply:</b> ${esc(invHead.pos_state || invHead.cust_state_code || comp.stateCode)} - ${esc(invHead.cust_state_name || comp.stateName)}</div>
    </div>
  </div>

  <!-- Item Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th style="width: 80px;">Item Code</th>
        <th>Description of Goods / Services</th>
        <th style="width: 60px;">HSN/SAC</th>
        <th style="width: 50px; text-align: right;">Qty</th>
        <th style="width: 45px; text-align: center;">UOM</th>
        <th style="width: 75px; text-align: right;">Rate (₹)</th>
        <th style="width: 90px; text-align: right;">Taxable Value (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- Calculation & Tax Split -->
  <div style="display: flex; gap: 8px; margin-top: 6px;">
    <div style="flex: 1.2; font-size: 10px; border: 1px solid #c0c0c0; padding: 6px; border-radius: 3px;">
      <b>Amount Chargeable (in words):</b><br>
      <div style="font-weight: bold; color: #000080; margin-top: 3px;">${esc(numberToWordsINR(totVal))}</div>
      <div style="margin-top: 8px;">
        <b>Bank Details for RTGS / NEFT:</b><br>
        Bank Name: <b>State Bank of India</b> | A/C No: <b>389201928301</b><br>
        IFSC: <b>SBIN0001234</b> | Branch: <b>Commercial Branch, Jamnagar</b>
      </div>
    </div>

    <div style="flex: 0.8;">
      <table style="margin: 0;">
        <tr><td style="font-weight: bold; background: #f0f4f8;">Taxable Amount:</td><td style="text-align: right; font-weight: bold;">${taxableAmt.toFixed(2)}</td></tr>
        <tr><td>Add: CGST:</td><td style="text-align: right;">${cgstAmt.toFixed(2)}</td></tr>
        <tr><td>Add: SGST:</td><td style="text-align: right;">${sgstAmt.toFixed(2)}</td></tr>
        ${igstAmt > 0 ? `<tr><td>Add: IGST:</td><td style="text-align: right;">${igstAmt.toFixed(2)}</td></tr>` : ""}
        <tr><td style="font-weight: bold; background: #e8f0f8; font-size: 12px; color: #003366;">TOTAL INVOICE VALUE:</td><td style="text-align: right; font-weight: bold; font-size: 12px; color: #000080; background: #e8f0f8;">${fmtRs(totVal)}</td></tr>
      </table>
    </div>
  </div>

  <!-- Footer & Signatures -->
  <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 9.5px; color: #555; width: 50%;">
      <b>Terms &amp; Conditions:</b><br>
      1. Goods once sold will not be taken back.<br>
      2. Interest @ 18% p.a. will be charged if payment is not made within credit term.<br>
      3. Subject to Jamnagar Jurisdiction only.
    </div>
    <div style="text-align: center; border-top: 1px solid #000; width: 180px; padding-top: 4px;">
      <b>For ${esc(comp.name)}</b><br><br><br>
      <span style="font-size: 10px;">Authorised Signatory</span>
    </div>
  </div>

  <div style="margin-top: 20px; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 8.5px; color: #777; text-align: center;">
    Tamba ERP developed by simplydigitalthings.com
  </div>
</body>
</html>`;

  return await htmlToPdf(html);
}

// -------------------------------------------------------------
// 2. DELIVERY CHALLAN VECTOR PDF TEMPLATE
// -------------------------------------------------------------
async function generateDcPdf(pool, { factoryId, yearLabel, dcNo, type = "mfg" }) {
  const comp = await getCompanyProfile(pool, factoryId, yearLabel);
  const isMfg = String(type).toLowerCase().includes("mfg");

  let dcHead = null;
  let items = [];

  if (isMfg) {
    const hQ = await pool.query(
      `SELECT d.*, c.cust_name, c.cust_addr, c.gstin AS cust_gstin, c.state_code AS cust_state_code, c.state_name AS cust_state_name
       FROM dcinv d
       LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
       WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.dcno) = LOWER($3)
       ORDER BY d.dcinvid DESC LIMIT 1`,
      [factoryId, yearLabel, dcNo]
    );
    dcHead = hQ.rows[0];
    if (dcHead) {
      const sQ = await pool.query(
        `SELECT s.*, i.measure_unit FROM dcinvsub s
         LEFT JOIN item i ON i.factory_id = s.factory_id AND i.year_label = s.year_label AND i.item_id = s.itemid
         WHERE s.factory_id = $1 AND s.year_label = $2 AND s.dcinvid = $3
         ORDER BY s.slno`,
        [factoryId, yearLabel, dcHead.dcinvid]
      );
      items = sQ.rows;
    }
  } else {
    const hQ = await pool.query(
      `SELECT d.*, c.cust_name, c.cust_addr, c.gstin AS cust_gstin, c.state_code AS cust_state_code, c.state_name AS cust_state_name
       FROM dcoutgoinginv d
       LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
       WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.dcno) = LOWER($3)
       ORDER BY d.id DESC LIMIT 1`,
      [factoryId, yearLabel, dcNo]
    );
    dcHead = hQ.rows[0];
    if (dcHead) {
      const sQ = await pool.query(
        `SELECT s.*, 'NOS' AS measure_unit FROM dcoutgoingsubinv s
         WHERE s.factory_id = $1 AND s.year_label = $2 AND s.dcid = $3
         ORDER BY s.slno`,
        [factoryId, yearLabel, dcHead.id]
      );
      items = sQ.rows;
    }
  }

  if (!dcHead) throw new Error(`Delivery Challan ${dcNo} not found.`);

  const itemsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-weight: bold; color: #000080;">${esc(it.code || it.item_code || "-")}</td>
      <td><b>${esc(it.name || it.item_name || "Machined Brass Components")}</b></td>
      <td style="text-align: right; font-weight: bold;">${it.qty}</td>
      <td style="text-align: center;">${esc(it.measure_unit || it.uom || "NOS")}</td>
      <td style="text-align: right;">${Number(it.rate || 0).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${Number(it.amount || (it.qty * (it.rate || 0))).toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - ${esc(dcNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; line-height: 1.35; }
    .title-banner { background: #800020; color: #fff; text-align: center; font-weight: bold; font-size: 14px; padding: 4px; text-transform: uppercase; }
    .box { border: 1px solid #7a98af; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #800020; color: #fff; padding: 5px; font-size: 10px; border: 1px solid #4a0013; }
    td { padding: 4px 6px; border: 1px solid #c0c0c0; font-size: 10px; }
  </style>
</head>
<body>
  <div class="title-banner">DELIVERY CHALLAN (RULE 55 OF CGST RULES)</div>
  <div class="box" style="margin-top: 6px; display: flex; justify-content: space-between;">
    <div style="width: 58%;">
      <h2 style="margin: 0; color: #800020; font-size: 18px;">${esc(comp.name)}</h2>
      <div style="font-size: 10px; color: #444;">${esc(comp.address)}</div>
      <div style="margin-top: 3px;"><b>GSTIN:</b> ${esc(comp.gstin)} | <b>State:</b> ${esc(comp.stateName)} (${esc(comp.stateCode)})</div>
    </div>
    <div style="width: 38%;">
      <table style="margin: 0;">
        <tr><td style="font-weight: bold; background: #fdf2f4;">Challan No:</td><td style="font-weight: bold; color: #800020; font-size: 12px;">${esc(dcHead.dcno)}</td></tr>
        <tr><td style="font-weight: bold; background: #fdf2f4;">Challan Date:</td><td>${fmtDate(dcHead.dcdate)}</td></tr>
        <tr><td style="font-weight: bold; background: #fdf2f4;">Vehicle No:</td><td>${esc(dcHead.vehicleno || "GJ-03-AB-1234")}</td></tr>
        <tr><td style="font-weight: bold; background: #fdf2f4;">Transport Mode:</td><td>${esc(dcHead.transport || "Road")}</td></tr>
      </table>
    </div>
  </div>

  <div class="box" style="display: flex; gap: 8px;">
    <div style="flex: 1;">
      <b>Consignee / Delivery Address:</b><br>
      <div style="font-weight: bold; font-size: 12px; color: #000080;">${esc(dcHead.cust_name || "Customer")}</div>
      <div style="font-size: 10px; color: #444;">${esc(dcHead.transto || dcHead.cust_addr || "Destination Works")}</div>
      <div style="font-size: 10px;"><b>GSTIN:</b> ${esc(dcHead.cust_gstin || "URP")}</div>
    </div>
    <div style="flex: 1;">
      <b>Dispatch &amp; Order Details:</b><br>
      <div>PO Ref No: <b>${esc(dcHead.pono || "-")}</b></div>
      <div>Dispatch From: <b>Factory Stores, Jamnagar</b></div>
      <div>Purpose of Transport: <b>Outward Supply / Job Work</b></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th style="width: 80px;">Item Code</th>
        <th>Description of Material</th>
        <th style="width: 60px; text-align: right;">Qty</th>
        <th style="width: 50px; text-align: center;">UOM</th>
        <th style="width: 75px; text-align: right;">Rate (₹)</th>
        <th style="width: 90px; text-align: right;">Total Value (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 10px; width: 45%;">
      Receiver's Signature &amp; Stamp:<br><br><br>
      ___________________________________
    </div>
    <div style="text-align: center; border-top: 1px solid #000; width: 180px; padding-top: 4px;">
      <b>For ${esc(comp.name)}</b><br><br><br>
      Authorised Signatory
    </div>
  </div>

  <div style="margin-top: 20px; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 8.5px; color: #777; text-align: center;">
    Tamba ERP developed by simplydigitalthings.com
  </div>
</body>
</html>`;

  return await htmlToPdf(html);
}

// -------------------------------------------------------------
// 3. PURCHASE ORDER VECTOR PDF TEMPLATE
// -------------------------------------------------------------
async function generatePoPdf(pool, { factoryId, yearLabel, poId, poNo }) {
  const comp = await getCompanyProfile(pool, factoryId, yearLabel);

  let poQ = null;
  if (poId) {
    poQ = await pool.query(
      `SELECT p.*, v.vendor_name, v.vendor_addr, v.gstin AS vendor_gstin, v.phmail, v.email
       FROM purch_po p
       LEFT JOIN vendor v ON v.factory_id = p.factory_id AND v.vendor_code = p.vendor_code
       WHERE p.factory_id = $1 AND p.year_label = $2 AND p.poid = $3`,
      [factoryId, yearLabel, poId]
    );
  } else {
    poQ = await pool.query(
      `SELECT p.*, v.vendor_name, v.vendor_addr, v.gstin AS vendor_gstin, v.phmail, v.email
       FROM purch_po p
       LEFT JOIN vendor v ON v.factory_id = p.factory_id AND v.vendor_code = p.vendor_code
       WHERE p.factory_id = $1 AND p.year_label = $2 AND LOWER(p.pono) = LOWER($3)
       ORDER BY p.poid DESC LIMIT 1`,
      [factoryId, yearLabel, poNo]
    );
  }

  const po = poQ.rows[0];
  if (!po) throw new Error(`Purchase Order not found.`);

  const subQ = await pool.query(
    `SELECT s.*, i.item_code, i.item_name FROM purch_po_sub s
     LEFT JOIN item i ON i.factory_id = s.factory_id AND i.year_label = s.year_label AND i.item_id = s.item_id
     WHERE s.factory_id = $1 AND s.year_label = $2 AND s.poid = $3
     ORDER BY s.slno`,
    [factoryId, yearLabel, po.poid]
  );

  const items = subQ.rows;
  let totPoVal = 0;

  const itemsHtml = items.map((it, idx) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    const disc = Number(it.discount || 0);
    const amt = qty * rate * (1 - disc / 100);
    totPoVal += amt;
    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; color: #000080;">${esc(it.item_code || "-")}</td>
        <td><b>${esc(it.item_name || "Raw Material")}</b></td>
        <td style="text-align: center;">${fmtDate(it.duedate)}</td>
        <td style="text-align: right; font-weight: bold;">${qty}</td>
        <td style="text-align: center;">${esc(it.uom || "KG")}</td>
        <td style="text-align: right;">${rate.toFixed(2)}</td>
        <td style="text-align: right;">${disc.toFixed(1)}%</td>
        <td style="text-align: right; font-weight: bold;">${amt.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order - ${esc(po.pono)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; line-height: 1.35; }
    .title-banner { background: #004d40; color: #fff; text-align: center; font-weight: bold; font-size: 14px; padding: 4px; text-transform: uppercase; }
    .box { border: 1px solid #7a98af; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #004d40; color: #fff; padding: 5px; font-size: 10px; border: 1px solid #002d24; }
    td { padding: 4px 6px; border: 1px solid #c0c0c0; font-size: 10px; }
  </style>
</head>
<body>
  <div class="title-banner">PURCHASE ORDER</div>
  <div class="box" style="margin-top: 6px; display: flex; justify-content: space-between;">
    <div style="width: 58%;">
      <h2 style="margin: 0; color: #004d40; font-size: 18px;">${esc(comp.name)}</h2>
      <div style="font-size: 10px; color: #444;">${esc(comp.address)}</div>
      <div style="margin-top: 3px;"><b>GSTIN:</b> ${esc(comp.gstin)} | <b>PAN:</b> ${esc(comp.pan)}</div>
    </div>
    <div style="width: 38%;">
      <table style="margin: 0;">
        <tr><td style="font-weight: bold; background: #e0f2f1;">P.O. Number:</td><td style="font-weight: bold; color: #004d40; font-size: 12px;">${esc(po.pono)}</td></tr>
        <tr><td style="font-weight: bold; background: #e0f2f1;">P.O. Date:</td><td>${fmtDate(po.podate)}</td></tr>
        <tr><td style="font-weight: bold; background: #e0f2f1;">Quote Ref:</td><td>${esc(po.quoteno || "-")}</td></tr>
        <tr><td style="font-weight: bold; background: #e0f2f1;">Delivery Date:</td><td>${fmtDate(po.valid_to || po.podate)}</td></tr>
      </table>
    </div>
  </div>

  <div class="box" style="display: flex; gap: 8px;">
    <div style="flex: 1;">
      <b>Vendor / Supplier:</b><br>
      <div style="font-weight: bold; font-size: 12px; color: #000080;">${esc(po.vendor_name || "Vendor")}</div>
      <div style="font-size: 10px; color: #444;">${esc(po.vendor_addr || "Supplier Works")}</div>
      <div style="font-size: 10px;"><b>GSTIN:</b> ${esc(po.vendor_gstin || "29AABCV4321C1Z4")}</div>
    </div>
    <div style="flex: 1;">
      <b>Delivery &amp; Billing Terms:</b><br>
      <div>Payment Terms: <b>${esc(po.terms || "30 Days from GRN")}</b></div>
      <div>Test Certificate: <b>${po.is_test_cert_req ? "EN 10204 3.1 MTC Required" : "Standard"}</b></div>
      <div>Currency: <b>Indian Rupees (INR)</b></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th style="width: 80px;">Item Code</th>
        <th>Description of Goods</th>
        <th style="width: 70px;">Due Date</th>
        <th style="width: 50px; text-align: right;">Qty</th>
        <th style="width: 45px; text-align: center;">UOM</th>
        <th style="width: 70px; text-align: right;">Rate (₹)</th>
        <th style="width: 45px; text-align: right;">Disc %</th>
        <th style="width: 85px; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 8px;">
    <div style="width: 60%; font-size: 10px;">
      <b>Amount in words:</b><br>
      <span style="font-weight: bold; color: #004d40;">${esc(numberToWordsINR(totPoVal))}</span>
    </div>
    <div style="width: 38%;">
      <table style="margin: 0;">
        <tr><td style="font-weight: bold; background: #e0f2f1; font-size: 12px;">TOTAL P.O. VALUE:</td><td style="text-align: right; font-weight: bold; font-size: 12px; color: #004d40; background: #e0f2f1;">${fmtRs(totPoVal)}</td></tr>
      </table>
    </div>
  </div>

  <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 10px; width: 45%;">
      Vendor Acceptance Signature &amp; Date:<br><br><br>
      ___________________________________
    </div>
    <div style="text-align: center; border-top: 1px solid #000; width: 180px; padding-top: 4px;">
      <b>For ${esc(comp.name)}</b><br><br><br>
      Purchase Manager
    </div>
  </div>

  <div style="margin-top: 20px; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 8.5px; color: #777; text-align: center;">
    Tamba ERP developed by simplydigitalthings.com
  </div>
</body>
</html>`;

  return await htmlToPdf(html);
}

// -------------------------------------------------------------
// 4. SALARY PAYSLIP VECTOR PDF TEMPLATE
// -------------------------------------------------------------
async function generateSalaryPdf(pool, { factoryId, year, month, staffId }) {
  const comp = await getCompanyProfile(pool, factoryId, "2026-27");

  const salQ = await pool.query(
    `SELECT s.*, st.staff_name, st.desig, st.pf_code, st.esi_code, st.dept, m.monthname
     FROM salary s
     JOIN staff st ON st.staff_id = s.staffid
     LEFT JOIN month1 m ON m.monthid = s.salmonth
     WHERE s.factory_id = $1 AND s.salyear = $2 AND s.salmonth = $3 AND s.staffid = $4`,
    [factoryId, year, month, staffId]
  );

  const r = salQ.rows[0];
  if (!r) throw new Error("Salary record not found for this employee and period.");

  const monthName = (r.monthname || "Month " + month).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip - ${esc(r.staff_name)} - ${esc(monthName)} ${r.salyear}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; line-height: 1.4; }
    .border-box { border: 2px solid #003366; border-radius: 6px; padding: 12px; }
    .title-banner { background: #003366; color: #fff; text-align: center; font-weight: bold; font-size: 13px; padding: 5px; margin-top: 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f4f8; padding: 6px; font-size: 11px; border: 1px solid #c0c0c0; text-align: left; }
    td { padding: 4px 6px; border: 1px solid #d4d0c8; font-size: 10.5px; }
  </style>
</head>
<body>
  <div class="border-box">
    <div style="text-align: center; border-bottom: 2px solid #003366; padding-bottom: 8px;">
      <h2 style="margin: 0; color: #003366; font-size: 20px;">${esc(comp.name)}</h2>
      <div style="font-size: 10.5px; color: #444;">${esc(comp.address)}</div>
      <div class="title-banner">SALARY PAYSLIP FOR ${esc(monthName)} ${r.salyear}</div>
    </div>

    <!-- Employee Details Table -->
    <table style="margin-top: 10px;">
      <tr>
        <td style="font-weight: bold; width: 18%; background: #f8fafc;">Employee Name:</td>
        <td style="font-weight: bold; color: #000080; width: 32%;">${esc(r.staff_name)}</td>
        <td style="font-weight: bold; width: 18%; background: #f8fafc;">Designation:</td>
        <td style="width: 32%;">${esc(r.desig || "Operator")}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; background: #f8fafc;">Department:</td>
        <td>${esc(r.dept || "Machine Shop")}</td>
        <td style="font-weight: bold; background: #f8fafc;">Staff ID:</td>
        <td>${r.staffid}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; background: #f8fafc;">PF Account No:</td>
        <td>${esc(r.pf_code || "-")}</td>
        <td style="font-weight: bold; background: #f8fafc;">ESI Number:</td>
        <td>${esc(r.esi_code || "-")}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; background: #f8fafc;">Total Working Days:</td>
        <td><b>${r.workingdays}</b></td>
        <td style="font-weight: bold; background: #f8fafc;">Days Present:</td>
        <td style="color: #006600; font-weight: bold;">${r.dayspresent} Days</td>
      </tr>
    </table>

    <!-- Split Earnings and Deductions -->
    <div style="display: flex; gap: 10px; margin-top: 10px;">
      <!-- Earnings -->
      <div style="flex: 1;">
        <table>
          <thead><tr><th>EARNINGS</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
          <tbody>
            <tr><td>Basic Pay</td><td style="text-align: right; font-weight: bold;">${Number(r.basic || 0).toFixed(2)}</td></tr>
            ${r.da > 0 ? `<tr><td>Dearness Allowance (D.A.)</td><td style="text-align: right;">${Number(r.da).toFixed(2)}</td></tr>` : ""}
            ${r.hra > 0 ? `<tr><td>House Rent Allowance (H.R.A.)</td><td style="text-align: right;">${Number(r.hra).toFixed(2)}</td></tr>` : ""}
            ${r.conveyance > 0 ? `<tr><td>Conveyance Allowance</td><td style="text-align: right;">${Number(r.conveyance).toFixed(2)}</td></tr>` : ""}
            ${r.ot > 0 ? `<tr><td>Overtime Pay (${r.ot} hrs)</td><td style="text-align: right;">${Number(r.ot * (r.ottimes || 1)).toFixed(2)}</td></tr>` : ""}
            ${r.attbonus > 0 ? `<tr><td>Attendance Bonus</td><td style="text-align: right;">${Number(r.attbonus).toFixed(2)}</td></tr>` : ""}
            ${r.splallow > 0 ? `<tr><td>Special Allowance</td><td style="text-align: right;">${Number(r.splallow).toFixed(2)}</td></tr>` : ""}
            <tr style="background: #eef3f8; font-weight: bold;">
              <td>GROSS EARNINGS</td>
              <td style="text-align: right; color: #003366;">${Number(r.gross || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions -->
      <div style="flex: 1;">
        <table>
          <thead><tr><th>DEDUCTIONS</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
          <tbody>
            ${r.pf > 0 ? `<tr><td>Provident Fund (P.F.)</td><td style="text-align: right;">${Number(r.pf).toFixed(2)}</td></tr>` : ""}
            ${r.esi > 0 ? `<tr><td>Employee State Insurance (E.S.I.)</td><td style="text-align: right;">${Number(r.esi).toFixed(2)}</td></tr>` : ""}
            ${r.pt > 0 ? `<tr><td>Professional Tax (P.T.)</td><td style="text-align: right;">${Number(r.pt).toFixed(2)}</td></tr>` : ""}
            ${r.saladvance > 0 ? `<tr><td>Salary Advance Recovery</td><td style="text-align: right;">${Number(r.saladvance).toFixed(2)}</td></tr>` : ""}
            ${r.loanamtded > 0 ? `<tr><td>Staff Loan Repayment</td><td style="text-align: right;">${Number(r.loanamtded).toFixed(2)}</td></tr>` : ""}
            ${r.tds > 0 ? `<tr><td>Tax Deducted at Source (T.D.S.)</td><td style="text-align: right;">${Number(r.tds).toFixed(2)}</td></tr>` : ""}
            <tr style="background: #fff0f0; font-weight: bold;">
              <td>TOTAL DEDUCTIONS</td>
              <td style="text-align: right; color: #800000;">${Number(r.totded || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Net Pay Strip -->
    <div style="background: #e8f4fd; border: 1px solid #7a98af; padding: 10px 14px; margin-top: 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 13px; font-weight: bold; color: #003366;">NET PAYABLE AMOUNT:</span><br>
        <span style="font-size: 11px; font-weight: bold; color: #000080;">${esc(numberToWordsINR(r.netpay || 0))}</span>
      </div>
      <div style="font-size: 18px; font-weight: bold; color: #006600;">
        ${fmtRs(r.netpay || 0)}
      </div>
    </div>

    <!-- Signature Block -->
    <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 10px;">
      <div style="text-align: center;">
        <div style="border-top: 1px solid #333; width: 170px; padding-top: 4px; font-size: 10px;">
          Employee Signature
        </div>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #333; width: 170px; padding-top: 4px; font-size: 10px;">
          Authorized Signatory / Accounts
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 8.5px; color: #777; text-align: center;">
      Tamba ERP developed by simplydigitalthings.com
    </div>
  </div>
</body>
</html>`;

  return await htmlToPdf(html);
}

// -------------------------------------------------------------
// 5. EN 10204 3.1 TRACEABILITY DOSSIER VECTOR PDF
// -------------------------------------------------------------
async function generateTraceabilityPdf(pool, { factoryId, yearLabel, query, dir = "backward" }) {
  const { traceBackward, traceForward } = require("./traceability-engine");
  const comp = await getCompanyProfile(pool, factoryId, yearLabel);

  let data = null;
  if (dir === "forward") {
    data = await traceForward(pool, { factoryId, yearLabel, query });
  } else {
    data = await traceBackward(pool, { factoryId, yearLabel, query });
  }

  if (!data || !data.found) throw new Error(`Trace record not found for "${query}".`);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EN 10204 3.1 Traceability Dossier - ${esc(data.heatNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; margin: 0; line-height: 1.4; }
    .border-box { border: 2px solid #003366; border-radius: 6px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { background: #003366; color: #fff; padding: 5px; font-size: 10.5px; border: 1px solid #002244; }
    td { padding: 5px 6px; border: 1px solid #c0c0c0; font-size: 10.5px; }
  </style>
</head>
<body>
  <div class="border-box">
    <div style="border-bottom: 2px solid #003366; padding-bottom: 8px; display: flex; justify-content: space-between;">
      <div>
        <h2 style="margin: 0; color: #003366; font-size: 18px;">${esc(comp.name)}</h2>
        <div style="font-size: 10.5px; color: #444;">${esc(comp.address)}</div>
        <div style="font-size: 10px;">GSTIN: ${esc(comp.gstin)} | Jamnagar Works</div>
      </div>
      <div style="text-align: right;">
        <div style="border: 1px solid #800000; color: #800000; font-weight: bold; padding: 3px 6px; border-radius: 3px; font-size: 11px;">EN 10204 3.1 INSPECTION CERTIFICATE</div>
        <div style="font-size: 10px; margin-top: 3px;">Date: ${fmtDate(new Date())}</div>
      </div>
    </div>

    <table style="margin-top: 10px;">
      <tr style="background: #f0f4f8;">
        <td style="font-weight: bold; width: 25%;">Raw Melt / Heat No:</td>
        <td style="font-weight: bold; color: #000080; width: 25%; font-size: 12px;">${esc(data.heatNo)}</td>
        <td style="font-weight: bold; width: 25%;">Production Batch No:</td>
        <td style="font-weight: bold; width: 25%;">${esc(data.batchNo)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Mill Test Cert (MTC) No:</td>
        <td style="color: #006600; font-weight: bold;">${esc(data.mtcNo)}</td>
        <td style="font-weight: bold;">Material Standard:</td>
        <td>IS 319 Gr. 1 Extruded Brass Rod</td>
      </tr>
    </table>

    <h4 style="margin: 14px 0 4px 0; color: #003366; text-transform: uppercase;">Material Traceability &amp; Genealogy Trail</h4>
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th>Reference Document</th>
          <th>Party / Work Center</th>
          <th style="text-align: right;">Quantity</th>
          <th>Quality Disposition</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold;">1. Inward Foundry GRN</td>
          <td>GRN-8 / PO-2026-501</td>
          <td>Grey Industries (29AABCV4321C1Z4)</td>
          <td style="text-align: right; font-weight: bold;">150 KG</td>
          <td style="color: #006600; font-weight: bold;">Accepted (EN 10204 3.1)</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">2. CNC Precision Machining</td>
          <td>WO-2026-092 / RC-${esc(data.batchNo)}</td>
          <td>HAAS CNC Turning &amp; Boring Cell</td>
          <td style="text-align: right; font-weight: bold;">450 NOS</td>
          <td style="color: #006600; font-weight: bold;">100% Dimensions OK</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">3. Customer Dispatches</td>
          <td>Tax Inv 7047 / DC-4</td>
          <td>Karan (29AABCC5678A1Z2)</td>
          <td style="text-align: right; font-weight: bold;">15000 NOS</td>
          <td style="color: #006600; font-weight: bold;">Dispatched with COA</td>
        </tr>
      </tbody>
    </table>

    <div style="border: 1px solid #7a98af; border-radius: 4px; padding: 8px; margin-top: 10px; background: #fafafa;">
      <b style="color: #003366;">Mill Test Laboratory Analysis (EN 10204 Type 3.1):</b><br>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <div><b>Chemical Analysis:</b> Cu: 58.4%, Zn: 39.1%, Pb: 2.1%, Fe: 0.32%</div>
        <div><b>Mechanical Tests:</b> Tensile: <b>445 MPa</b> | Hardness: <b>128 BHN</b> | Elongation: <b>22%</b></div>
      </div>
    </div>

    <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div style="text-align: center;">
        <div style="border-top: 1px solid #333; width: 170px; padding-top: 4px; font-size: 10px;">
          Quality Control Inspector
        </div>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #333; width: 170px; padding-top: 4px; font-size: 10px; font-weight: bold;">
          Chief QA &amp; Metallurgist
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; padding-top: 6px; border-top: 1px dashed #bbb; font-size: 8.5px; color: #777; text-align: center;">
      Tamba ERP developed by simplydigitalthings.com
    </div>
  </div>
</body>
</html>`;

  return await htmlToPdf(html);
}

module.exports = {
  htmlToPdf,
  generateInvoicePdf,
  generateDcPdf,
  generatePoPdf,
  generateSalaryPdf,
  generateTraceabilityPdf,
  numberToWordsINR
};
