/**
 * SMART ERP - One-Click Excel (.xlsx) & CSV Export Engine
 * Pure-JS implementation (no EXCEL.EXE / COM automation required)
 * Formats headers, data types, column widths, and summary total rows.
 */
const XLSX = require("xlsx");
const { calculateStockValuation } = require("./valuation-engine");

function fmtDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toISOString().slice(0, 10);
  } catch (e) {
    return String(d);
  }
}

async function getFactoryHeader(pool, factoryId, yearLabel, subtitle) {
  try {
    const q = await pool.query(
      "SELECT m.print_head, f.name FROM factories f LEFT JOIN misc m ON m.factory_id = f.id AND m.year_label = $2 WHERE f.id = $1 LIMIT 1",
      [factoryId, yearLabel]
    );
    const row = q.rows[0];
    const name = (row?.print_head || row?.name || "Tamba ERP Operating Factory").trim().toUpperCase();
    return `${name} - ${subtitle}`;
  } catch {
    return `TAMBA ERP FACTORY - ${subtitle}`;
  }
}

/**
 * 1. Export Stock Position & AS-2 Valuation to Excel / CSV
 */
async function exportStockExcel(pool, { factoryId, yearLabel, method = "WAC", storeId, categoryId, format = "xlsx" }) {
  const valuation = await calculateStockValuation(pool, { factoryId, yearLabel, method, storeId, categoryId });
  const items = valuation.items || [];
  const s = valuation.summary || {};

  const wb = XLSX.utils.book_new();

  const title = await getFactoryHeader(pool, factoryId, yearLabel, "INVENTORY STOCK POSITION & VALUATION");
  const sheetData = [
    [title],
    [`Financial Year: ${yearLabel}`, `Valuation Standard: AS-2 / Ind AS 2 (${method})`, `Export Date: ${new Date().toISOString().slice(0, 10)}`],
    [],
    [
      "Sl No",
      "Item Code / Part No",
      "Item Description",
      "Category",
      "UOM",
      "Qty On Hand",
      `Valuation Rate (${method})`,
      "Total Stock Value (Rs)",
      "Re-Order Level (ROL)",
      "Rack Location",
      "Movement Status",
      "Ageing Bucket"
    ]
  ];

  let totalQty = 0;
  let totalVal = 0;

  items.forEach((it, idx) => {
    totalQty += Number(it.qtyOnHand || 0);
    totalVal += Number(it.totalVal || 0);

    sheetData.push([
      idx + 1,
      it.code,
      it.name,
      it.categoryName,
      it.unit,
      Number(it.qtyOnHand || 0),
      Number(it.unitRate || 0),
      Number(it.totalVal || 0),
      Number(it.rol || 0),
      it.rack,
      it.movementClass,
      it.ageingBucket
    ]);
  });

  // Summary Totals Row
  sheetData.push([]);
  sheetData.push([
    "TOTALS",
    "",
    `Total Active Items: ${items.length}`,
    "",
    "",
    totalQty,
    "",
    Math.round(totalVal * 100) / 100,
    "",
    "",
    "",
    ""
  ]);

  sheetData.push([]);
  sheetData.push(["VALUATION AGEING BREAKDOWN (AS-2 / IND AS 2):"]);
  sheetData.push(["Fast-Moving (< 30d):", Number(s.fastMovingVal || 0)]);
  sheetData.push(["Normal (31-90d):", Number(s.normalMovingVal || 0)]);
  sheetData.push(["Slow-Moving (91-180d):", Number(s.slowMovingVal || 0)]);
  sheetData.push(["Dead Stock (> 180d):", Number(s.deadStockVal || 0)]);
  sheetData.push([]);
  sheetData.push(["Tamba ERP developed by simplydigitalthings.com"]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws["!cols"] = [
    { wch: 8 },  // Sl No
    { wch: 18 }, // Part Code
    { wch: 32 }, // Item Name
    { wch: 16 }, // Category
    { wch: 8 },  // UOM
    { wch: 14 }, // Qty
    { wch: 18 }, // Rate
    { wch: 22 }, // Value
    { wch: 12 }, // ROL
    { wch: 12 }, // Rack
    { wch: 16 }, // Movement
    { wch: 22 }  // Ageing
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Stock Valuation");

  if (String(format).toLowerCase() === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `Stock_Position_${method}_${yearLabel}.csv`,
      buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), "utf-8")
    };
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `Stock_Position_${method}_${yearLabel}.xlsx`,
    buffer
  };
}

/**
 * 2. Export General Ledger & Tax Invoices Register to Excel / CSV
 */
async function exportInvoicesExcel(pool, { factoryId, yearLabel, fromDate, toDate, format = "xlsx" }) {
  const mfgQ = await pool.query(
    `SELECT 'Mfg' AS type, d.invno, d.invdate, d.dcno, d.dcdate, c.cust_name, c.gstin AS cust_gstin,
            d.pos_state, d.taxable_amt, d.cgst_amt, d.sgst_amt, d.igst_amt, d.round_off, d.totval
     FROM dcinv d
     LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
     WHERE d.factory_id = $1 AND d.year_label = $2 AND d.invno IS NOT NULL AND TRIM(d.invno) <> ''
       AND ($3::date IS NULL OR d.invdate >= $3::date)
       AND ($4::date IS NULL OR d.invdate <= $4::date)
     ORDER BY d.invdate DESC, d.invno DESC`,
    [factoryId, yearLabel, fromDate || null, toDate || null]
  );

  const labQ = await pool.query(
    `SELECT 'Labour' AS type, d.invno, d.invdate, d.dcno, d.dcdate, c.cust_name, c.gstin AS cust_gstin,
            d.pos_state, d.taxable_amt, d.cgst_amt, d.sgst_amt, d.igst_amt, d.round_off, d.totval
     FROM dcoutgoinginv d
     LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
     WHERE d.factory_id = $1 AND d.year_label = $2 AND d.invno IS NOT NULL AND TRIM(d.invno) <> ''
       AND ($3::date IS NULL OR d.invdate >= $3::date)
       AND ($4::date IS NULL OR d.invdate <= $4::date)
     ORDER BY d.invdate DESC, d.invno DESC`,
    [factoryId, yearLabel, fromDate || null, toDate || null]
  );

  const allInvoices = [...mfgQ.rows, ...labQ.rows].sort((a, b) => new Date(b.invdate) - new Date(a.invdate));

  const title = await getFactoryHeader(pool, factoryId, yearLabel, "GENERAL LEDGER / TAX INVOICES REGISTER");
  const sheetData = [
    [title],
    [`Financial Year: ${yearLabel}`, `Period: ${fromDate || "Start"} to ${toDate || "Present"}`, `Generated: ${new Date().toISOString().slice(0, 10)}`],
    [],
    [
      "Sl No",
      "Invoice Type",
      "Invoice No",
      "Invoice Date",
      "Delivery Challan",
      "Customer Name",
      "Customer GSTIN",
      "POS State",
      "Taxable Base (Rs)",
      "CGST (Rs)",
      "SGST (Rs)",
      "IGST (Rs)",
      "Round Off (Rs)",
      "Total Invoice Value (Rs)"
    ]
  ];

  let sumTaxable = 0;
  let sumCgst = 0;
  let sumSgst = 0;
  let sumIgst = 0;
  let sumTot = 0;

  allInvoices.forEach((inv, idx) => {
    const tax = Number(inv.taxable_amt || 0);
    const cgst = Number(inv.cgst_amt || 0);
    const sgst = Number(inv.sgst_amt || 0);
    const igst = Number(inv.igst_amt || 0);
    const tot = Number(inv.totval || 0);

    sumTaxable += tax;
    sumCgst += cgst;
    sumSgst += sgst;
    sumIgst += igst;
    sumTot += tot;

    sheetData.push([
      idx + 1,
      inv.type,
      inv.invno,
      fmtDate(inv.invdate),
      inv.dcno || "-",
      inv.cust_name || "Customer",
      inv.cust_gstin || "URP",
      inv.pos_state || "24",
      tax,
      cgst,
      sgst,
      igst,
      Number(inv.round_off || 0),
      tot
    ]);
  });

  sheetData.push([]);
  sheetData.push([
    "TOTALS",
    "",
    `Total Invoices: ${allInvoices.length}`,
    "",
    "",
    "",
    "",
    "",
    Math.round(sumTaxable * 100) / 100,
    Math.round(sumCgst * 100) / 100,
    Math.round(sumSgst * 100) / 100,
    Math.round(sumIgst * 100) / 100,
    "",
    Math.round(sumTot * 100) / 100
  ]);

  sheetData.push([]);
  sheetData.push(["Tamba ERP developed by simplydigitalthings.com"]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 8 },  // Sl No
    { wch: 12 }, // Type
    { wch: 14 }, // Inv No
    { wch: 12 }, // Inv Date
    { wch: 14 }, // DC No
    { wch: 28 }, // Cust Name
    { wch: 18 }, // GSTIN
    { wch: 10 }, // POS
    { wch: 16 }, // Taxable
    { wch: 14 }, // CGST
    { wch: 14 }, // SGST
    { wch: 14 }, // IGST
    { wch: 12 }, // Round Off
    { wch: 20 }  // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Invoices Register");

  if (String(format).toLowerCase() === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `Invoices_Register_${yearLabel}.csv`,
      buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), "utf-8")
    };
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `Invoices_Register_${yearLabel}.xlsx`,
    buffer
  };
}

/**
 * 3. Export Attendance & Payroll Register to Excel / CSV
 */
async function exportPayrollExcel(pool, { factoryId, year = 2026, month = 11, format = "xlsx" }) {
  const salQ = await pool.query(
    `SELECT s.*, st.staff_name, st.desig, st.dept, st.pf_code, st.esi_code, m.monthname
     FROM salary s
     JOIN staff st ON st.staff_id = s.staffid
     LEFT JOIN month1 m ON m.monthid = s.salmonth
     WHERE s.factory_id = $1 AND s.salyear = $2 AND s.salmonth = $3
     ORDER BY st.staff_name`,
    [factoryId, year, month]
  );

  const rows = salQ.rows;
  const monthName = rows[0]?.monthname || "Month " + month;

  const title = await getFactoryHeader(pool, factoryId, String(year), "ATTENDANCE & PAYROLL REGISTER");
  const sheetData = [
    [title],
    [`Period: ${monthName} ${year}`, `Total Employees: ${rows.length}`, `Export Date: ${new Date().toISOString().slice(0, 10)}`],
    [],
    [
      "Sl No",
      "Staff Code",
      "Employee Name",
      "Designation",
      "Department",
      "Working Days",
      "Present Days",
      "Leave Days",
      "Basic Pay (Rs)",
      "Gross Earnings (Rs)",
      "PF (Rs)",
      "ESI (Rs)",
      "PT (Rs)",
      "Loan Repay (Rs)",
      "Total Deductions (Rs)",
      "Net Payable (Rs)",
      "Amount Paid (Rs)"
    ]
  ];

  let sumGross = 0;
  let sumDed = 0;
  let sumNet = 0;
  let sumPaid = 0;

  rows.forEach((r, idx) => {
    const gross = Number(r.gross || 0);
    const ded = Number(r.totded || 0);
    const net = Number(r.netpay || 0);
    const paid = Number(r.paid || 0);

    sumGross += gross;
    sumDed += ded;
    sumNet += net;
    sumPaid += paid;

    sheetData.push([
      idx + 1,
      r.staffid,
      r.staff_name,
      r.desig || "Staff",
      r.dept || "Production",
      Number(r.workingdays || 0),
      Number(r.dayspresent || 0),
      Number(r.leavedays || 0),
      Number(r.basic || 0),
      gross,
      Number(r.pf || 0),
      Number(r.esi || 0),
      Number(r.pt || 0),
      Number(r.loanamtded || 0),
      ded,
      net,
      paid
    ]);
  });

  sheetData.push([]);
  sheetData.push([
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    Math.round(sumGross * 100) / 100,
    "",
    "",
    "",
    "",
    Math.round(sumDed * 100) / 100,
    Math.round(sumNet * 100) / 100,
    Math.round(sumPaid * 100) / 100
  ]);

  sheetData.push([]);
  sheetData.push(["Tamba ERP developed by simplydigitalthings.com"]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 8 },  // Sl No
    { wch: 12 }, // Code
    { wch: 24 }, // Name
    { wch: 18 }, // Designation
    { wch: 16 }, // Dept
    { wch: 12 }, // Working Days
    { wch: 12 }, // Present
    { wch: 12 }, // Leave
    { wch: 14 }, // Basic
    { wch: 18 }, // Gross
    { wch: 12 }, // PF
    { wch: 12 }, // ESI
    { wch: 10 }, // PT
    { wch: 14 }, // Loan
    { wch: 18 }, // Total Ded
    { wch: 18 }, // Net Pay
    { wch: 16 }  // Paid
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Payroll Register");

  if (String(format).toLowerCase() === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `Payroll_Register_${monthName}_${year}.csv`,
      buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), "utf-8")
    };
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `Payroll_Register_${monthName}_${year}.xlsx`,
    buffer
  };
}

/**
 * 4. Export Order Book & Delivery Challans to Excel / CSV
 */
async function exportOrderBookExcel(pool, { factoryId, yearLabel, format = "xlsx" }) {
  const mfgDcQ = await pool.query(
    `SELECT 'Mfg' AS type, d.dcno, d.dcdate, c.cust_name,
            COALESCE(sub.code, 'B1') AS item_code, COALESCE(sub.name, 'Brass Part') AS item_name,
            COALESCE(sub.qty, d.totqty) AS qty, COALESCE(sub.rate, 0) AS rate,
            COALESCE(sub.amount, d.totval) AS val,
            d.invno, d.invdate
     FROM dcinv d
     LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
     LEFT JOIN dcinvsub sub ON sub.factory_id = d.factory_id AND sub.year_label = d.year_label AND sub.dcinvid = d.dcinvid
     WHERE d.factory_id = $1 AND d.year_label = $2
     ORDER BY d.dcdate DESC, d.dcinvid DESC`,
    [factoryId, yearLabel]
  );

  const labDcQ = await pool.query(
    `SELECT 'Labour' AS type, d.dcno, d.dcdate, c.cust_name,
            COALESCE(sub.code, 'FG1') AS item_code, COALESCE(sub.name, 'Machined Valve') AS item_name,
            COALESCE(sub.qty, d.totqty) AS qty, COALESCE(sub.rate, 0) AS rate,
            COALESCE(sub.amount, d.totval) AS val,
            d.invno, d.invdate
     FROM dcoutgoinginv d
     LEFT JOIN customer c ON c.factory_id = d.factory_id AND c.cust_id = d.custid
     LEFT JOIN dcoutgoingsubinv sub ON sub.factory_id = d.factory_id AND sub.year_label = d.year_label AND sub.dcid = d.id
     WHERE d.factory_id = $1 AND d.year_label = $2
     ORDER BY d.dcdate DESC, d.id DESC`,
    [factoryId, yearLabel]
  );

  const allDcs = [...mfgDcQ.rows, ...labDcQ.rows];

  const title = await getFactoryHeader(pool, factoryId, yearLabel, "ORDER BOOK & DELIVERY CHALLANS REGISTER");
  const sheetData = [
    [title],
    [`Financial Year: ${yearLabel}`, `Total Dispatches: ${allDcs.length}`, `Export Date: ${new Date().toISOString().slice(0, 10)}`],
    [],
    [
      "Sl No",
      "Type",
      "DC No",
      "DC Date",
      "Customer Name",
      "Item Code",
      "Description of Material",
      "Dispatched Qty",
      "Unit Rate (Rs)",
      "Total Value (Rs)",
      "Billing Status",
      "Tax Invoice No",
      "Invoice Date",
      "Pending Invoicing Amount (Rs)"
    ]
  ];

  let sumQty = 0;
  let sumVal = 0;
  let sumPending = 0;

  allDcs.forEach((d, idx) => {
    const qty = Number(d.qty || 0);
    const val = Number(d.val || 0);
    const hasInv = Boolean(d.invno && String(d.invno).trim());
    const pendingAmt = hasInv ? 0 : val;

    sumQty += qty;
    sumVal += val;
    sumPending += pendingAmt;

    sheetData.push([
      idx + 1,
      d.type,
      d.dcno,
      fmtDate(d.dcdate),
      d.cust_name || "Customer",
      d.item_code,
      d.item_name,
      qty,
      Number(d.rate || 0),
      val,
      hasInv ? "BILLED" : "PENDING BILLING",
      d.invno || "-",
      fmtDate(d.invdate),
      pendingAmt
    ]);
  });

  sheetData.push([]);
  sheetData.push([
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    sumQty,
    "",
    Math.round(sumVal * 100) / 100,
    "",
    "",
    "",
    Math.round(sumPending * 100) / 100
  ]);

  sheetData.push([]);
  sheetData.push(["Tamba ERP developed by simplydigitalthings.com"]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 8 },  // Sl No
    { wch: 10 }, // Type
    { wch: 16 }, // DC No
    { wch: 12 }, // DC Date
    { wch: 28 }, // Customer
    { wch: 16 }, // Item Code
    { wch: 28 }, // Material
    { wch: 14 }, // Qty
    { wch: 14 }, // Rate
    { wch: 18 }, // Value
    { wch: 18 }, // Status
    { wch: 16 }, // Inv No
    { wch: 12 }, // Inv Date
    { wch: 24 }  // Pending Amt
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Order Book & DCs");

  if (String(format).toLowerCase() === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `Order_Book_DCs_${yearLabel}.csv`,
      buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), "utf-8")
    };
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `Order_Book_DCs_${yearLabel}.xlsx`,
    buffer
  };
}

module.exports = {
  exportStockExcel,
  exportInvoicesExcel,
  exportPayrollExcel,
  exportOrderBookExcel
};
