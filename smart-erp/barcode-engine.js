/**
 * SMART ERP - Industrial Barcode & QR Label Generation Engine
 * Generates ISO/IEC 15417 Code 128 (1D) Barcodes, 2D QR Traceability Codes,
 * A4 24-Up Sticker Sheets, Direct Thermal Roll Labels (50x25mm & 100x50mm),
 * and Raw Zebra ZPL-II Command Streams for MSME Factory Floor Printing.
 */

const QRCode = require('qrcode');

// ISO/IEC 15417 Code 128 Patterns (Table 1: Indices 0 to 106)
// Each 6-character string represents alternating widths of bars and spaces (sum=11).
// Stop pattern (index 106) has 7 characters (sum=13).
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', // 100=Code B, 101=Code A, 102=FNC1
  '211412', // 103: Start A
  '211214', // 104: Start B
  '211232', // 105: Start C
  '2331112'  // 106: Stop (7 elements)
];

/**
 * Pure JavaScript Code 128 Barcode Generator (Code 128-B Alphanumeric)
 * Returns a crisp, scalable SVG string.
 */
function generateCode128Svg(text, options = {}) {
  const str = String(text || '').trim();
  if (!str) return '';

  const height = Number(options.height) || 45;
  const moduleWidth = Number(options.moduleWidth) || 1.8;
  const includeText = options.includeText !== false;
  const fontSize = Number(options.fontSize) || 11;
  const quietZone = 10; // 10 modules on each side

  // Convert ASCII characters to Code 128-B symbols (ASCII 32 to 127)
  const symbols = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      symbols.push(code - 32);
    } else {
      symbols.push(0); // fallback space
    }
  }

  // Checksum calculation: (104 + sum((i + 1) * symbol)) % 103
  let checksum = 104; // Start B
  for (let i = 0; i < symbols.length; i++) {
    checksum += (i + 1) * symbols[i];
  }
  checksum %= 103;

  const sequence = [104, ...symbols, checksum, 106];

  // Build bars (even index) and spaces (odd index)
  let currentX = quietZone;
  const rects = [];

  for (const symIdx of sequence) {
    const pattern = CODE128_PATTERNS[symIdx];
    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10);
      if (p % 2 === 0) {
        // Bar
        rects.push(`<rect x="${(currentX * moduleWidth).toFixed(1)}" y="0" width="${(w * moduleWidth).toFixed(1)}" height="${height}" fill="#000000" />`);
      }
      currentX += w;
    }
  }

  const totalModules = currentX + quietZone;
  const totalWidth = (totalModules * moduleWidth).toFixed(1);
  const totalHeight = includeText ? height + fontSize + 4 : height;

  const textElement = includeText
    ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${totalHeight - 2}" font-family="Consolas, monospace, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(str)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" shape-rendering="crispEdges">
  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
  ${rects.join('\n  ')}
  ${textElement}
</svg>`;
}

/**
 * Generates high-density vector QR code for Heat & Material Traceability (EN 10204 3.1)
 */
async function generateQrCodeSvg(text, options = {}) {
  const str = String(text || '').trim();
  if (!str) return '';

  const width = options.width || 90;
  const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
  const margin = options.margin !== undefined ? options.margin : 1;

  try {
    const svgString = await QRCode.toString(str, {
      type: 'svg',
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return svgString;
  } catch (err) {
    console.error('QR generation error:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" width="90" height="90"><rect width="90" height="90" fill="#f8f9fa"/><text x="45" y="48" font-size="10" text-anchor="middle" fill="#dc3545">QR Error</text></svg>`;
  }
}

/**
 * Generates raw Zebra Programming Language (ZPL II) code stream
 * for direct industrial thermal printing (Zebra ZT230, GK420d, TSC, Citizen).
 */
function generateZplCode(labelData, options = {}) {
  const copies = Math.max(1, parseInt(options.copies, 10) || 1);
  const company = cleanZpl(labelData.companyName || 'TAMBA ERP INDUSTRIAL MFG');
  const itemCode = cleanZpl(labelData.itemCode || 'PART-001');
  const itemName = cleanZpl(labelData.itemName || 'PRECISION MACHINED COMPONENT');
  const drgNo = cleanZpl(labelData.drgNo || '-');
  const matGrade = cleanZpl(labelData.matGrade || 'STD');
  const heatNo = cleanZpl(labelData.heatNo || 'HT-GEN-01');
  const batchNo = cleanZpl(labelData.batchNo || 'BT-2026-01');
  const qty = cleanZpl(String(labelData.qty || '100'));
  const uom = cleanZpl(labelData.uom || 'NOS');
  const dateStr = cleanZpl(labelData.date || new Date().toISOString().slice(0, 10));

  // Compact 2D industrial traceability payload
  const qrPayload = JSON.stringify({
    erp: 'Tamba ERP',
    item: itemCode,
    heat: heatNo,
    batch: batchNo,
    qty: qty,
    uom: uom,
    dt: dateStr
  });

  const template = options.template || 'THERMAL-100x50';

  if (template === 'THERMAL-50x25') {
    // 50mm x 25mm Label (~400 x 200 dots @ 203 dpi)
    return [
      '^XA',
      '^PW400',
      '^LL200',
      `^FO15,15^A0N,18,18^FD${company.slice(0, 24)}^FS`,
      `^FO15,38^A0N,24,24^FD${itemCode}^FS`,
      `^FO15,64^A0N,16,16^FDHeat: ${heatNo}^FS`,
      `^FO15,82^A0N,16,16^FDBatch: ${batchNo} | Qty: ${qty} ${uom}^FS`,
      `^FO15,105^BY2,2.5,45^BCN,45,Y,N,N^FD${itemCode}^FS`,
      `^FO280,35^BQN,2,3^FDMA,${cleanZpl(qrPayload)}^FS`,
      `^PQ${copies}`,
      '^XZ'
    ].join('\n');
  }

  // Default: Industrial 100mm x 50mm Shipping / Inward Label (~800 x 400 dots @ 203 dpi)
  return [
    '^XA',
    '^PW800',
    '^LL400',
    '^FO30,15^GB740,0,2^FS',
    `^FO40,25^A0N,24,24^FD${company}^FS`,
    `^FO40,55^A0N,32,32^FDPART: ${itemCode}^FS`,
    `^FO40,95^A0N,20,20^FDDESC: ${itemName.slice(0, 36)}^FS`,
    `^FO40,122^A0N,20,20^FDDRG: ${drgNo}  |  GRADE: ${matGrade}^FS`,
    `^FO40,150^A0N,22,22^FDHEAT NO: ${heatNo}  |  BATCH: ${batchNo}^FS`,
    `^FO40,178^A0N,20,20^FDQTY: ${qty} ${uom}  |  DATE: ${dateStr}^FS`,
    `^FO40,225^BY2,3,70^BCN,70,Y,N,N^FD${itemCode}^FS`,
    `^FO550,45^BQN,2,5^FDMA,${cleanZpl(qrPayload)}^FS`,
    `^FO540,225^A0N,18,18^FDEN 10204 3.1 TRACE^FS`,
    `^FO540,250^A0N,18,18^FDHEAT: ${heatNo}^FS`,
    '^FO30,370^GB740,0,2^FS',
    `^PQ${copies}`,
    '^XZ'
  ].join('\n');
}

/**
 * Builds Full HTML Print Sheet / Label Document
 * Supports A4-24UP (3x8 grid), THERMAL-100x50, and THERMAL-50x25.
 */
async function generateLabelHtml(labelData, template = 'A4-24UP', copies = 24) {
  const itemCode = labelData.itemCode || 'PART-001';
  const itemName = labelData.itemName || 'PRECISION COMPONENT';
  const drgNo = labelData.drgNo || '-';
  const matGrade = labelData.matGrade || 'SS-304';
  const heatNo = labelData.heatNo || 'HT-BRASS-704';
  const batchNo = labelData.batchNo || 'BT-2026-081';
  const qty = labelData.qty || '100';
  const uom = labelData.uom || 'NOS';
  const company = labelData.companyName || 'GREY INDUSTRIES LTD';
  const dateStr = labelData.date || new Date().toISOString().slice(0, 10);

  // Traceability Payload for 2D scanner
  const qrPayload = JSON.stringify({
    erp: 'Tamba ERP',
    item: itemCode,
    heat: heatNo,
    batch: batchNo,
    drg: drgNo,
    qty: qty,
    uom: uom,
    dt: dateStr
  });

  const barcodeSvg = generateCode128Svg(itemCode, {
    height: template === 'A4-24UP' ? 26 : template === 'THERMAL-50x25' ? 24 : 45,
    moduleWidth: template === 'A4-24UP' ? 1.2 : template === 'THERMAL-50x25' ? 1.1 : 1.8,
    includeText: template !== 'A4-24UP' && template !== 'THERMAL-50x25',
    fontSize: 10
  });

  const qrSvg = await generateQrCodeSvg(qrPayload, {
    width: template === 'A4-24UP' ? 52 : template === 'THERMAL-50x25' ? 48 : 88,
    margin: 0
  });

  if (template === 'A4-24UP') {
    // 3 columns x 8 rows = 24 labels per A4 page
    const totalStickers = Math.max(1, Math.min(96, parseInt(copies, 10) || 24));
    const stickersHtml = [];

    for (let i = 0; i < totalStickers; i++) {
      stickersHtml.push(`
      <div class="a4-sticker">
        <div class="sticker-head">
          <span class="sticker-comp">${escapeXml(company.slice(0, 20))}</span>
          <span class="sticker-heat">HT: ${escapeXml(heatNo)}</span>
        </div>
        <div class="sticker-code">${escapeXml(itemCode)}</div>
        <div class="sticker-desc">${escapeXml(itemName.slice(0, 26))}</div>
        <div class="sticker-body">
          <div class="sticker-barcode-box">
            ${barcodeSvg}
            <div class="sticker-subtext">DRG: ${escapeXml(drgNo)} | BATCH: ${escapeXml(batchNo)}</div>
          </div>
          <div class="sticker-qr-box">
            ${qrSvg}
          </div>
        </div>
      </div>`);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode Sheet (A4 24-Up) - ${escapeXml(itemCode)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    .toolbar-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar-btn:hover { background: #1d4ed8; }
    .sheet-container {
      width: 198mm;
      min-height: 281mm;
      margin: 15px auto;
      background: #ffffff;
      padding: 2mm;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 33.8mm;
      gap: 2mm;
    }
    .a4-sticker {
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      padding: 2.5mm 3mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #fff;
    }
    .sticker-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #64748b;
      font-weight: 600;
      line-height: 1;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 1.5px;
    }
    .sticker-heat {
      color: #0369a1;
      background: #e0f2fe;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .sticker-code {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      line-height: 1.2;
      margin-top: 1px;
    }
    .sticker-desc {
      font-size: 8px;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
    }
    .sticker-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-top: 1px;
    }
    .sticker-barcode-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      overflow: hidden;
    }
    .sticker-barcode-box svg {
      max-width: 100%;
      height: 18px;
    }
    .sticker-subtext {
      font-size: 7px;
      color: #64748b;
      font-family: Consolas, monospace;
      margin-top: 1px;
    }
    .sticker-qr-box svg {
      width: 28px;
      height: 28px;
    }
    @media print {
      body { background: transparent; }
      .no-print-toolbar { display: none !important; }
      .sheet-container {
        margin: 0;
        padding: 0;
        box-shadow: none;
        width: 100%;
        min-height: auto;
      }
      .a4-sticker {
        border: 0.5px dashed #cbd5e1;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div><strong>A4 Sticker Sheet (24-Up: 3x8 Grid)</strong> &mdash; ${totalStickers} stickers for <code>${escapeXml(itemCode)}</code></div>
    <div>
      <button class="toolbar-btn" onclick="window.print()">🖨️ Print Sheet</button>
      <button class="toolbar-btn" style="background:#475569; margin-left:8px;" onclick="window.close()">Close</button>
    </div>
  </div>
  <div class="sheet-container">
    ${stickersHtml.join('\n')}
  </div>
</body>
</html>`;
  }

  if (template === 'THERMAL-50x25') {
    // 50mm x 25mm Compact Thermal Part Label
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Thermal Label (50x25mm) - ${escapeXml(itemCode)}</title>
  <style>
    @page {
      size: 50mm 25mm;
      margin: 1mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f8fafc;
      color: #000;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #fff;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .toolbar-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 6px 12px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    .label-preview-wrapper {
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .thermal-50x25 {
      width: 50mm;
      height: 25mm;
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: 2px;
      padding: 1.5mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .t-head {
      display: flex;
      justify-content: space-between;
      font-size: 7px;
      font-weight: bold;
      color: #334155;
      line-height: 1;
    }
    .t-code {
      font-size: 10px;
      font-weight: 800;
      color: #000;
      line-height: 1.1;
    }
    .t-sub {
      font-size: 6.5px;
      color: #475569;
      line-height: 1;
    }
    .t-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3px;
    }
    .t-bc-box {
      flex: 1;
    }
    .t-bc-box svg {
      width: 100%;
      height: 14px;
    }
    .t-qr-box svg {
      width: 22px;
      height: 22px;
    }
    @media print {
      body { background: transparent; }
      .no-print-toolbar, .label-preview-wrapper { padding: 0; }
      .no-print-toolbar { display: none !important; }
      .thermal-50x25 {
        border: none;
        box-shadow: none;
        width: 100%;
        height: 100%;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div><strong>Thermal Label (50mm x 25mm)</strong> &mdash; <code>${escapeXml(itemCode)}</code></div>
    <div>
      <button class="toolbar-btn" onclick="window.print()">🖨️ Print Thermal</button>
      <button class="toolbar-btn" style="background:#475569; margin-left:8px;" onclick="window.close()">Close</button>
    </div>
  </div>
  <div class="label-preview-wrapper">
    <div class="thermal-50x25">
      <div class="t-head">
        <span>${escapeXml(company.slice(0, 18))}</span>
        <span>HT: ${escapeXml(heatNo)}</span>
      </div>
      <div class="t-code">${escapeXml(itemCode)}</div>
      <div class="t-sub">BT: ${escapeXml(batchNo)} | QTY: ${escapeXml(qty)} ${escapeXml(uom)}</div>
      <div class="t-body">
        <div class="t-bc-box">
          ${barcodeSvg}
        </div>
        <div class="t-qr-box">
          ${qrSvg}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // Default: THERMAL-100x50 (Standard Industrial Shipping / Inward Label)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Industrial Thermal Label (100x50mm) - ${escapeXml(itemCode)}</title>
  <style>
    @page {
      size: 100mm 50mm;
      margin: 2mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      z-index: 100;
    }
    .toolbar-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    .label-preview-wrapper {
      padding: 30px;
      display: flex;
      justify-content: center;
    }
    .thermal-100x50 {
      width: 100mm;
      height: 50mm;
      background: #ffffff;
      border: 2px solid #0f172a;
      border-radius: 4px;
      padding: 3mm 4mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.12);
    }
    .th-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 1.5mm;
    }
    .th-comp {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .th-badge {
      background: #0284c7;
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 2px;
      letter-spacing: 0.5px;
    }
    .th-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 1.5mm;
    }
    .th-details {
      flex: 1;
    }
    .th-code {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .th-desc {
      font-size: 9.5px;
      color: #334155;
      font-weight: 600;
      line-height: 1.2;
      margin-top: 1px;
    }
    .th-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm;
      margin-top: 2mm;
      font-size: 8.5px;
      line-height: 1.2;
    }
    .th-meta-item strong {
      color: #64748b;
      font-size: 7.5px;
      display: block;
      text-transform: uppercase;
    }
    .th-meta-item span {
      font-weight: 700;
      color: #0f172a;
    }
    .th-qr {
      width: 25mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-left: 2mm;
    }
    .th-qr svg {
      width: 24mm;
      height: 24mm;
    }
    .th-qr-tag {
      font-size: 6.5px;
      font-weight: bold;
      color: #64748b;
      text-align: center;
      margin-top: 1px;
    }
    .th-bottom {
      border-top: 1px dashed #cbd5e1;
      padding-top: 1.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .th-barcode-box svg {
      width: 85mm;
      height: 12mm;
    }
    @media print {
      body { background: transparent; }
      .no-print-toolbar, .label-preview-wrapper { padding: 0; }
      .no-print-toolbar { display: none !important; }
      .thermal-100x50 {
        border: 1px solid #000;
        box-shadow: none;
        width: 100%;
        height: 100%;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div><strong>Industrial Thermal Label (100mm x 50mm)</strong> &mdash; <code>${escapeXml(itemCode)}</code></div>
    <div>
      <button class="toolbar-btn" onclick="window.print()">🖨️ Print Label</button>
      <button class="toolbar-btn" style="background:#475569; margin-left:8px;" onclick="window.close()">Close</button>
    </div>
  </div>
  <div class="label-preview-wrapper">
    <div class="thermal-100x50">
      <div class="th-top">
        <span class="th-comp">${escapeXml(company)}</span>
        <span class="th-badge">EN 10204 3.1 TRACE</span>
      </div>
      <div class="th-main">
        <div class="th-details">
          <div class="th-code">${escapeXml(itemCode)}</div>
          <div class="th-desc">${escapeXml(itemName)}</div>
          <div class="th-meta-grid">
            <div class="th-meta-item">
              <strong>Heat / Melt No</strong>
              <span>${escapeXml(heatNo)}</span>
            </div>
            <div class="th-meta-item">
              <strong>Batch / Lot</strong>
              <span>${escapeXml(batchNo)}</span>
            </div>
            <div class="th-meta-item">
              <strong>Drg / Mat Grade</strong>
              <span>${escapeXml(drgNo)} / ${escapeXml(matGrade)}</span>
            </div>
            <div class="th-meta-item">
              <strong>Quantity / Date</strong>
              <span>${escapeXml(qty)} ${escapeXml(uom)} (${escapeXml(dateStr)})</span>
            </div>
          </div>
        </div>
        <div class="th-qr">
          ${qrSvg}
          <div class="th-qr-tag">SCAN 2D TRACE</div>
        </div>
      </div>
      <div class="th-bottom">
        <div class="th-barcode-box">
          ${barcodeSvg}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Retrieves item metadata and company header from DB for label generation
 */
async function getLabelItemData(pool, { factoryId, yearLabel, itemId, itemCode, heatNo, batchNo, qty }) {
  const fId = factoryId || 1;
  const yr = yearLabel || '2026-27';

  // 1. Fetch Company Header
  const compRes = await pool.query(
    `SELECT f.name, f.gstin, m.print_head, m.print_short_addr
     FROM factories f
     LEFT JOIN misc m ON m.factory_id = f.id
     WHERE f.id = $1 LIMIT 1`,
    [fId]
  );
  const companyName = compRes.rows[0]?.print_head || compRes.rows[0]?.name || 'GREY INDUSTRIES LTD';

  // 2. Fetch Item
  let itemRow = null;
  if (itemId) {
    const res = await pool.query(
      `SELECT item_id, item_code, item_name, measure_unit, drg_no, rack_no, item_desn, hsn_code
       FROM item
       WHERE factory_id = $1 AND year_label = $2 AND item_id = $3 LIMIT 1`,
      [fId, yr, itemId]
    );
    itemRow = res.rows[0];
  } else if (itemCode) {
    const res = await pool.query(
      `SELECT item_id, item_code, item_name, measure_unit, drg_no, rack_no, item_desn, hsn_code
       FROM item
       WHERE factory_id = $1 AND year_label = $2 AND LOWER(item_code) = LOWER($3) LIMIT 1`,
      [fId, yr, itemCode]
    );
    itemRow = res.rows[0];
  }

  // Fallback to first item if not found
  if (!itemRow) {
    const res = await pool.query(
      `SELECT item_id, item_code, item_name, measure_unit, drg_no, rack_no, item_desn, hsn_code
       FROM item
       WHERE factory_id = $1 AND year_label = $2 ORDER BY item_id ASC LIMIT 1`,
      [fId, yr]
    );
    itemRow = res.rows[0] || {
      item_id: 1,
      item_code: 'B1',
      item_name: 'BRASS BALL VALVE',
      measure_unit: 'KGs',
      drg_no: 'D1',
      rack_no: '1'
    };
  }

  return {
    factoryId: fId,
    yearLabel: yr,
    companyName,
    itemId: itemRow.item_id,
    itemCode: itemRow.item_code,
    itemName: itemRow.item_name,
    drgNo: itemRow.drg_no || 'D1',
    matGrade: itemRow.item_desn || 'SS-304',
    rackNo: itemRow.rack_no || 'RACK-01',
    uom: itemRow.measure_unit || 'NOS',
    qty: qty || '100',
    heatNo: heatNo || 'HT-BRASS-704',
    batchNo: batchNo || 'BT-2026-081',
    date: new Date().toISOString().slice(0, 10)
  };
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanZpl(str) {
  return String(str || '').replace(/[\^\~]/g, '');
}

module.exports = {
  CODE128_PATTERNS,
  generateCode128Svg,
  generateQrCodeSvg,
  generateZplCode,
  generateLabelHtml,
  getLabelItemData
};
