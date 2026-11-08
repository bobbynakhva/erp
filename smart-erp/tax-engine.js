/**
 * SMART ERP - Modern GST Tax Engine
 * Handles CGST, SGST, IGST determination, HSN/SAC summaries, and GSTR reporting.
 */

const STATE_CODES = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh"
};

const GST_RATES = [0, 5, 12, 18, 28];

/**
 * Validates a 15-character Indian GSTIN format
 * Format: 2 digits (State) + 10 chars (PAN) + 1 digit (Entity) + 1 char ('Z') + 1 check digit
 */
function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== "string") {
    return { valid: false, error: "GSTIN is required" };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { valid: false, error: "GSTIN must be exactly 15 characters long" };
  }
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return { valid: false, error: "Invalid GSTIN format. Expected format: 29ABCDE1234F1Z5" };
  }
  const stateCode = clean.slice(0, 2);
  const stateName = STATE_CODES[stateCode] || "Unknown State";
  return { valid: true, gstin: clean, stateCode, stateName };
}

/**
 * Determines whether the supply is Intra-State (same state -> CGST+SGST)
 * or Inter-State (different state -> IGST).
 */
function isSameState(supplierState, buyerState) {
  const sCode = String(supplierState || "").trim().padStart(2, "0").slice(0, 2);
  const bCode = String(buyerState || "").trim().padStart(2, "0").slice(0, 2);
  if (!sCode || !bCode) return true; // Default to intra-state if missing
  return sCode === bCode;
}

/**
 * Calculates GST breakdown for a single item/service line
 */
function calculateLineGST({
  qty = 1,
  rate = 0,
  discount = 0,
  gstRate = 18,
  isIntraState = true,
  hsnCode = "8482"
}) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  const discPct = Number(discount) || 0;
  const taxRate = Number(gstRate) || 0;

  const gross = Math.round(q * r * 100) / 100;
  const discountAmt = Math.round(gross * (discPct / 100) * 100) / 100;
  const taxableAmt = Math.max(0, Math.round((gross - discountAmt) * 100) / 100);

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  if (taxRate > 0) {
    if (isIntraState) {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmt = Math.round(taxableAmt * (cgstRate / 100) * 100) / 100;
      sgstAmt = Math.round(taxableAmt * (sgstRate / 100) * 100) / 100;
    } else {
      igstRate = taxRate;
      igstAmt = Math.round(taxableAmt * (igstRate / 100) * 100) / 100;
    }
  }

  const totalGst = Math.round((cgstAmt + sgstAmt + igstAmt) * 100) / 100;
  const lineTotal = Math.round((taxableAmt + totalGst) * 100) / 100;

  return {
    hsnCode: String(hsnCode || "").trim(),
    qty: q,
    rate: r,
    discountPct: discPct,
    discountAmt,
    taxableAmt,
    gstRate: taxRate,
    cgstRate,
    cgstAmt,
    sgstRate,
    sgstAmt,
    igstRate,
    igstAmt,
    totalGst,
    lineTotal
  };
}

/**
 * Calculates complete GST invoice aggregates, HSN table, and grand total
 */
function calculateInvoiceGST({
  lines = [],
  isIntraState = true,
  packForward = 0,
  otherCharges = 0,
  roundOff = true
}) {
  const pf = Number(packForward) || 0;
  const other = Number(otherCharges) || 0;

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const hsnMap = new Map();
  const processedLines = lines.map((line) => {
    const computed = calculateLineGST({
      qty: line.qty,
      rate: line.rate,
      discount: line.discount,
      gstRate: line.gstRate ?? 18,
      isIntraState,
      hsnCode: line.hsnCode || "8482"
    });

    totalTaxable += computed.taxableAmt;
    totalCGST += computed.cgstAmt;
    totalSGST += computed.sgstAmt;
    totalIGST += computed.igstAmt;

    // HSN aggregation
    const key = `${computed.hsnCode}_${computed.gstRate}`;
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsnCode: computed.hsnCode,
        gstRate: computed.gstRate,
        taxableAmt: 0,
        cgstAmt: 0,
        sgstAmt: 0,
        igstAmt: 0,
        totalGst: 0
      });
    }
    const agg = hsnMap.get(key);
    agg.taxableAmt = Math.round((agg.taxableAmt + computed.taxableAmt) * 100) / 100;
    agg.cgstAmt = Math.round((agg.cgstAmt + computed.cgstAmt) * 100) / 100;
    agg.sgstAmt = Math.round((agg.sgstAmt + computed.sgstAmt) * 100) / 100;
    agg.igstAmt = Math.round((agg.igstAmt + computed.igstAmt) * 100) / 100;
    agg.totalGst = Math.round((agg.totalGst + computed.totalGst) * 100) / 100;

    return computed;
  });

  totalTaxable = Math.round(totalTaxable * 100) / 100;
  totalCGST = Math.round(totalCGST * 100) / 100;
  totalSGST = Math.round(totalSGST * 100) / 100;
  totalIGST = Math.round(totalIGST * 100) / 100;
  const totalGst = Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100;

  const rawGrandTotal = totalTaxable + totalGst + pf + other;
  let finalGrandTotal = rawGrandTotal;
  let roundOffAmt = 0;

  if (roundOff) {
    finalGrandTotal = Math.round(rawGrandTotal);
    roundOffAmt = Math.round((finalGrandTotal - rawGrandTotal) * 100) / 100;
  } else {
    finalGrandTotal = Math.round(rawGrandTotal * 100) / 100;
  }

  return {
    lines: processedLines,
    hsnSummary: Array.from(hsnMap.values()),
    isIntraState,
    totalTaxable,
    totalCGST,
    totalSGST,
    totalIGST,
    totalGst,
    packForward: pf,
    otherCharges: other,
    roundOffAmt,
    grandTotal: finalGrandTotal
  };
}

/**
 * GSTR-1 Outward Supplies (Sales) Summary Generator
 */
async function generateGSTR1Summary(pool, { factoryId, yearLabel, fromDate, toDate }) {
  let dateFilter = "";
  const params = [factoryId, yearLabel];
  let paramIdx = 3;

  if (fromDate) {
    dateFilter += ` AND i.invdate >= $${paramIdx++}`;
    params.push(fromDate);
  }
  if (toDate) {
    dateFilter += ` AND i.invdate <= $${paramIdx++}`;
    params.push(toDate);
  }

  const query = `
    SELECT 
      i.dcinvid, i.invno, i.invdate, i.custid,
      c.cust_name, c.gstin AS customer_gstin, c.state_code AS customer_state,
      COALESCE(i.taxable_amt, 0) AS taxable_amt,
      COALESCE(i.cgst_amt, 0) AS cgst_amt,
      COALESCE(i.sgst_amt, 0) AS sgst_amt,
      COALESCE(i.igst_amt, 0) AS igst_amt,
      COALESCE(i.total_gst, 0) AS total_gst,
      COALESCE(i.round_off, 0) AS round_off,
      COALESCE(i.totval, 0) AS total_inv_val
    FROM dcinv i
    LEFT JOIN customer c ON c.factory_id = i.factory_id AND c.cust_id = i.custid
    WHERE i.factory_id = $1 AND i.year_label = $2
      AND i.invno IS NOT NULL AND TRIM(i.invno) <> '' ${dateFilter}
    ORDER BY i.invdate, i.dcinvid
  `;

  const res = await pool.query(query, params);
  const rows = res.rows;

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let grandTotal = 0;

  for (const r of rows) {
    totalTaxable += Number(r.taxable_amt) || 0;
    totalCGST += Number(r.cgst_amt) || 0;
    totalSGST += Number(r.sgst_amt) || 0;
    totalIGST += Number(r.igst_amt) || 0;
    grandTotal += Number(r.total_inv_val) || 0;
  }

  return {
    reportType: "GSTR-1 Outward Supplies Summary",
    yearLabel,
    invoiceCount: rows.length,
    invoices: rows,
    totals: {
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      totalGST: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    }
  };
}

/**
 * GSTR-3B Input Tax Credit (ITC) Summary Generator
 */
async function generateGSTR3BSummary(pool, { factoryId, yearLabel, fromDate, toDate }) {
  let dateFilter = "";
  const params = [factoryId, yearLabel];
  let paramIdx = 3;

  if (fromDate) {
    dateFilter += ` AND p.invdate >= $${paramIdx++}`;
    params.push(fromDate);
  }
  if (toDate) {
    dateFilter += ` AND p.invdate <= $${paramIdx++}`;
    params.push(toDate);
  }

  const query = `
    SELECT 
      p.purchid, p.invno, p.invdate, p.vendorcode,
      v.supp_name AS vendor_name, v.gstin AS vendor_gstin, v.state_code AS vendor_state,
      COALESCE(p.taxable_amt, 0) AS taxable_amt,
      COALESCE(p.cgst_amt, 0) AS cgst_amt,
      COALESCE(p.sgst_amt, 0) AS sgst_amt,
      COALESCE(p.igst_amt, 0) AS igst_amt,
      COALESCE(p.total_gst, 0) AS total_gst,
      COALESCE(p.totval, 0) AS total_purch_val
    FROM purchase p
    LEFT JOIN supplier v ON v.factory_id = p.factory_id AND (v.supp_id = p.vendorcode OR v.cust_code = p.vendorcode::text)
    WHERE p.factory_id = $1 AND p.year_label = $2
      AND p.invno IS NOT NULL AND TRIM(p.invno) <> '' ${dateFilter}
    ORDER BY p.invdate, p.purchid
  `;

  const res = await pool.query(query, params);
  const rows = res.rows;

  let itcTaxable = 0;
  let itcCGST = 0;
  let itcSGST = 0;
  let itcIGST = 0;
  let totalPurch = 0;

  for (const r of rows) {
    itcTaxable += Number(r.taxable_amt) || 0;
    itcCGST += Number(r.cgst_amt) || 0;
    itcSGST += Number(r.sgst_amt) || 0;
    itcIGST += Number(r.igst_amt) || 0;
    totalPurch += Number(r.total_purch_val) || 0;
  }

  return {
    reportType: "GSTR-3B Input Tax Credit (ITC) Summary",
    yearLabel,
    purchaseCount: rows.length,
    purchases: rows,
    itcEligible: {
      itcTaxable: Math.round(itcTaxable * 100) / 100,
      itcCGST: Math.round(itcCGST * 100) / 100,
      itcSGST: Math.round(itcSGST * 100) / 100,
      itcIGST: Math.round(itcIGST * 100) / 100,
      totalITC: Math.round((itcCGST + itcSGST + itcIGST) * 100) / 100,
      totalPurchases: Math.round(totalPurch * 100) / 100
    }
  };
}

/**
 * Format date to DD/MM/YYYY for GST Portal (NIC Schema)
 */
function formatGstDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return "";
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Map SMART ERP UOM to official GST 3-character Unit Code
 */
function mapToGstUom(uom) {
  if (!uom) return "NOS";
  const u = String(uom).trim().toUpperCase();
  if (u.includes("KG")) return "KGS";
  if (u.includes("NO") || u.includes("NUM")) return "NOS";
  if (u.includes("PC")) return "PCS";
  if (u.includes("SET")) return "SET";
  if (u.includes("MTR") || u.includes("METER")) return "MTR";
  if (u.includes("BOX")) return "BOX";
  if (u.includes("LTR") || u.includes("LIT")) return "LTR";
  if (u.includes("TON") || u.includes("MT")) return "TON";
  if (u.includes("BAG")) return "BAG";
  if (u.includes("ROLL") || u.includes("ROL")) return "ROL";
  if (u.includes("DRM") || u.includes("DRUM")) return "DRM";
  if (u.includes("CAN")) return "CAN";
  if (u.includes("CTN") || u.includes("CARTON")) return "CTN";
  if (u.includes("PAC") || u.includes("PACK")) return "PAC";
  if (u.includes("DOZ")) return "DOZ";
  if (u.includes("PIPE")) return "NOS";

  const officialUqcs = [
    "BAG","BAL","BDL","BKL","BOU","BOX","BTL","BUN","CAN","CBM","CCM","CMS","CTN",
    "DOZ","DRM","GGK","GGR","GMS","GRS","GYD","KGS","KLR","KME","MLS","MLT","MTR",
    "MTS","NOS","PAC","PCS","PRS","QTL","ROL","SET","SQF","SQM","SQY","TBS","TGM",
    "THD","TON","TUB","UGS","UNT","YDS","OTH"
  ];
  if (officialUqcs.includes(u)) return u;
  return "NOS";
}

function extractPincode(addr, defaultPin = 560001) {
  if (!addr) return defaultPin;
  const match = String(addr).match(/\b[1-9][0-9]{5}\b/);
  return match ? Number(match[0]) : defaultPin;
}

function extractCity(addr, defaultCity = "Bengaluru") {
  if (!addr) return defaultCity;
  const parts = String(addr).split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    const last = parts[parts.length - 1].replace(/[0-9]/g, "").trim();
    if (last.length > 2) return last;
  }
  return defaultCity;
}

function sanitizeHsn(hsn, fallback = 8481) {
  if (!hsn) return fallback;
  const digits = String(hsn).replace(/[^0-9]/g, "");
  return digits.length >= 2 ? Number(digits.slice(0, 8)) : fallback;
}

/**
 * Generate Government-Compliant E-Way Bill JSON (NIC Schema v1.0.0521)
 */
function generateEWayBillJson({
  supplyType = "O", // Outward
  subSupplyType = "1", // 1 = Supply, 4 = Job Work, 8 = Others
  docType = "INV", // "INV" | "CHL"
  docNo,
  docDate,
  supplier = {},
  buyer = {},
  items = [],
  transport = {},
  totals = {}
}) {
  const userGstin = supplier.gstin || "URP";
  const sState = Number(supplier.stateCode || "29");
  const bState = Number(buyer.stateCode || buyer.posState || "29");
  const isIntra = sState === bState;

  const bill = {
    userGstin,
    supplyType,
    subSupplyType: String(subSupplyType || "1"),
    subSupplyDesc: subSupplyType === "8" ? "Delivery Challan" : (subSupplyType === "4" ? "Job Work" : ""),
    docType: docType || "INV",
    docNo: String(docNo || "").trim(),
    docDate: formatGstDate(docDate),
    transType: 1, // Regular
    fromGstin: supplier.gstin || "URP",
    fromTrdName: supplier.tradeName || supplier.legalName || "Supplier",
    fromAddr1: (supplier.address || "Address 1").slice(0, 100),
    fromAddr2: "",
    fromPlace: supplier.city || "Bengaluru",
    fromPincode: Number(supplier.pincode || 560058),
    actFromStateCode: sState,
    fromStateCode: sState,
    toGstin: buyer.gstin || "URP",
    toTrdName: buyer.name || "Customer",
    toAddr1: (buyer.address || "Address 1").slice(0, 100),
    toAddr2: "",
    toPlace: buyer.city || "Customer City",
    toPincode: Number(buyer.pincode || 560001),
    actToStateCode: bState,
    toStateCode: bState,
    transactionType: 1,
    otherValue: Number((totals.otherCharges || 0).toFixed(2)),
    totalValue: Number((totals.taxableAmt || 0).toFixed(2)),
    cgstValue: Number((totals.cgstAmt || 0).toFixed(2)),
    sgstValue: Number((totals.sgstAmt || 0).toFixed(2)),
    igstValue: Number((totals.igstAmt || 0).toFixed(2)),
    cessValue: 0.00,
    totInvValue: Number((totals.totalVal || 0).toFixed(2)),
    transDistance: String(Math.max(1, Number(transport.distance || 50))),
    transporterName: transport.transporterName || "",
    transporterId: transport.transporterId || "",
    transDocNo: transport.transDocNo || "",
    transDocDate: transport.transDocDate ? formatGstDate(transport.transDocDate) : "",
    transMode: String(transport.transMode || "1"),
    vehicleNo: (transport.vehicleNo || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    vehicleType: transport.vehicleType || "R",
    itemList: items.map((it, idx) => ({
      itemNo: idx + 1,
      productName: it.name || "Product",
      productDesc: it.desc || it.name || "Product",
      hsnCode: sanitizeHsn(it.hsnCode, subSupplyType === "4" ? 9988 : 8481),
      quantity: Number(it.qty || 0),
      qtyUnit: mapToGstUom(it.uom),
      taxableAmount: Number((it.taxableAmt || 0).toFixed(2)),
      cgstRate: isIntra ? Number(((it.gstRate || 18) / 2).toFixed(2)) : 0,
      sgstRate: isIntra ? Number(((it.gstRate || 18) / 2).toFixed(2)) : 0,
      igstRate: !isIntra ? Number((it.gstRate || 18).toFixed(2)) : 0,
      cessRate: 0,
      cessNonAdvol: 0
    }))
  };

  return {
    version: "1.0.0521",
    billLists: [bill]
  };
}

/**
 * Generate Government-Compliant E-Invoice JSON (IRP Schema v1.03)
 */
function generateEInvoiceJson({
  docType = "INV",
  docNo,
  docDate,
  supplier = {},
  buyer = {},
  items = [],
  transport = {},
  totals = {}
}) {
  const sState = String(supplier.stateCode || "29").padStart(2, "0").slice(0, 2);
  const bState = String(buyer.stateCode || buyer.posState || "29").padStart(2, "0").slice(0, 2);
  const isIntra = sState === bState;

  const einv = {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: (buyer.gstin && buyer.gstin !== "URP") ? "B2B" : "B2C",
      RegRev: "N",
      EcmGstin: null,
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: docType || "INV",
      No: String(docNo || "").trim(),
      Dt: formatGstDate(docDate)
    },
    SellerDtls: {
      Gstin: supplier.gstin || "URP",
      LglNm: supplier.legalName || "Seller",
      TrdNm: supplier.tradeName || supplier.legalName || "Seller",
      Addr1: (supplier.address || "Address 1").slice(0, 100),
      Addr2: "",
      Loc: supplier.city || "Bengaluru",
      Pin: Number(supplier.pincode || 560058),
      Stcd: sState
    },
    BuyerDtls: {
      Gstin: buyer.gstin || "URP",
      LglNm: buyer.name || "Buyer",
      TrdNm: buyer.name || "Buyer",
      Pos: bState,
      Addr1: (buyer.address || "Address 1").slice(0, 100),
      Addr2: "",
      Loc: buyer.city || "Customer City",
      Pin: Number(buyer.pincode || 560001),
      Stcd: bState
    },
    ItemList: items.map((it, idx) => {
      const taxable = Number((it.taxableAmt || 0).toFixed(2));
      const rate = Number(it.gstRate || 18);
      const cgstAmt = isIntra ? Number((taxable * (rate / 2) / 100).toFixed(2)) : 0;
      const sgstAmt = isIntra ? Number((taxable * (rate / 2) / 100).toFixed(2)) : 0;
      const igstAmt = !isIntra ? Number((taxable * rate / 100).toFixed(2)) : 0;
      const totItemVal = Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2));

      return {
        SlNo: String(idx + 1),
        PrdDesc: it.name || "Item",
        IsServc: (it.isService || it.hsnCode === "9988" || it.hsnCode === 9988) ? "Y" : "N",
        HsnCd: String(sanitizeHsn(it.hsnCode, it.isService ? 9988 : 8481)),
        Qty: Number(it.qty || 0),
        Unit: mapToGstUom(it.uom),
        UnitPrice: Number(it.rate || 0),
        TotAmt: Number((it.qty * it.rate).toFixed(2)),
        Discount: Number(it.discountAmt || 0),
        AssAmt: taxable,
        GstRt: rate,
        CgstAmt: cgstAmt,
        SgstAmt: sgstAmt,
        IgstAmt: igstAmt,
        CesAmt: 0,
        TotItemVal: totItemVal
      };
    }),
    ValDtls: {
      AssVal: Number((totals.taxableAmt || 0).toFixed(2)),
      CgstVal: Number((totals.cgstAmt || 0).toFixed(2)),
      SgstVal: Number((totals.sgstAmt || 0).toFixed(2)),
      IgstVal: Number((totals.igstAmt || 0).toFixed(2)),
      CesVal: 0,
      RndOffAmt: Number((totals.roundOff || 0).toFixed(2)),
      TotInvVal: Number((totals.totalVal || 0).toFixed(2))
    },
    EwbDtls: {
      TransId: transport.transporterId || "",
      TransName: transport.transporterName || "",
      Distance: Math.max(1, Number(transport.distance || 50)),
      TransDocNo: transport.transDocNo || "",
      TransDocDt: transport.transDocDate ? formatGstDate(transport.transDocDate) : "",
      VehNo: (transport.vehicleNo || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
      VehType: transport.vehicleType || "R",
      TransMode: String(transport.transMode || "1")
    }
  };

  return [einv];
}

/**
 * Normalizes an invoice number for fuzzy matching (removes non-alphanumeric, leading zeros, lowercases).
 */
function normalizeInvNo(inv) {
  if (!inv) return "";
  return String(inv).trim().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^0+/, "");
}

/**
 * Reconciles Inward Purchase Bills (Books) against GSTR-2B Statement (Portal).
 *
 * @param {object} pool - PostgreSQL pool connection
 * @param {object} options
 * @param {number} options.factoryId
 * @param {string} options.yearLabel
 * @param {string} [options.fromDate]
 * @param {string} [options.toDate]
 * @param {object|Array} [options.gstr2bData] - Uploaded GSTR-2B JSON data
 */
async function reconcileGSTR2B(pool, { factoryId, yearLabel, fromDate, toDate, gstr2bData }) {
  let dateFilter = "";
  const params = [factoryId, yearLabel];
  let paramIdx = 3;

  if (fromDate) {
    dateFilter += ` AND p.invdate >= $${paramIdx++}`;
    params.push(fromDate);
  }
  if (toDate) {
    dateFilter += ` AND p.invdate <= $${paramIdx++}`;
    params.push(toDate);
  }

  // 1. Fetch Inward Purchase Bills in Books
  const query = `
    SELECT 
      p.purchid, p.invno, p.invdate, p.vendorcode,
      COALESCE(v.vendor_name, s.supp_name, 'Unknown Vendor') AS vendor_name,
      COALESCE(v.gstin, s.gstin, '') AS vendor_gstin,
      COALESCE(v.state_code, s.state_code, '29') AS vendor_state,
      COALESCE(p.taxable_amt, 0) AS taxable_amt,
      COALESCE(p.cgst_amt, 0) AS cgst_amt,
      COALESCE(p.sgst_amt, 0) AS sgst_amt,
      COALESCE(p.igst_amt, 0) AS igst_amt,
      COALESCE(p.total_gst, 0) AS total_gst,
      COALESCE(p.totval, 0) AS total_purch_val
    FROM purchase p
    LEFT JOIN vendor v ON v.factory_id = p.factory_id AND v.vendor_code = p.vendorcode
    LEFT JOIN supplier s ON s.factory_id = p.factory_id AND s.supp_id = p.vendorcode
    WHERE p.factory_id = $1 AND p.year_label = $2
      AND p.invno IS NOT NULL AND TRIM(p.invno) <> '' ${dateFilter}
    ORDER BY p.invdate, p.purchid
  `;

  const booksRes = await pool.query(query, params);
  const booksRows = booksRes.rows;

  // 2. Parse GSTR-2B Portal Records
  const portalInvoices = [];

  let b2bSections = [];
  if (gstr2bData) {
    if (Array.isArray(gstr2bData)) {
      b2bSections = gstr2bData;
    } else if (gstr2bData.data && Array.isArray(gstr2bData.data.b2b)) {
      b2bSections = gstr2bData.data.b2b;
    } else if (Array.isArray(gstr2bData.b2b)) {
      b2bSections = gstr2bData.b2b;
    }
  }

  for (const supp of b2bSections) {
    const ctin = String(supp.ctin || supp.gstin || "").trim().toUpperCase();
    const cpty = String(supp.cpty || supp.vendor_name || supp.trade_name || "").trim();
    const invList = Array.isArray(supp.inv) ? supp.inv : (Array.isArray(supp.invoices) ? supp.invoices : []);

    for (const inv of invList) {
      let txval = 0;
      let camt = 0;
      let samt = 0;
      let iamt = 0;

      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          const d = item.itm_det || item;
          txval += Number(d.txval || 0);
          camt += Number(d.camt || 0);
          samt += Number(d.samt || 0);
          iamt += Number(d.iamt || 0);
        }
      } else {
        txval = Number(inv.taxable || inv.txval || inv.taxable_amt || 0);
        camt = Number(inv.cgst || inv.camt || inv.cgst_amt || 0);
        samt = Number(inv.sgst || inv.samt || inv.sgst_amt || 0);
        iamt = Number(inv.igst || inv.iamt || inv.igst_amt || 0);
      }

      portalInvoices.push({
        portalGstin: ctin,
        portalVendor: cpty,
        portalInvNo: String(inv.inum || inv.invno || "").trim(),
        portalInvDate: inv.dt || inv.invdate || "",
        portalTaxable: Math.round(txval * 100) / 100,
        portalCgst: Math.round(camt * 100) / 100,
        portalSgst: Math.round(samt * 100) / 100,
        portalIgst: Math.round(iamt * 100) / 100,
        portalTotalGst: Math.round((camt + samt + iamt) * 100) / 100,
        portalTotalVal: Math.round(Number(inv.val || (txval + camt + samt + iamt)) * 100) / 100,
        itcAvailable: (inv.itcavl || "Y").toUpperCase() === "Y",
        diffPercent: Number(inv.diffprcnt || 0),
        matched: false
      });
    }
  }

  // 3. Matching Algorithm
  const reconciledItems = [];

  // Match each Books invoice against Portal records
  for (const b of booksRows) {
    const bInvNoNorm = normalizeInvNo(b.invno);
    const bGstinNorm = String(b.vendor_gstin || "").trim().toUpperCase();
    const bTaxable = Number(b.taxable_amt) || 0;
    const bCgst = Number(b.cgst_amt) || 0;
    const bSgst = Number(b.sgst_amt) || 0;
    const bIgst = Number(b.igst_amt) || 0;
    const bTotalGst = bCgst + bSgst + bIgst;
    const bTotalVal = Number(b.total_purch_val) || 0;

    let matchedPortal = null;
    for (const p of portalInvoices) {
      if (p.matched) continue;
      const pInvNoNorm = normalizeInvNo(p.portalInvNo);
      const pGstinNorm = p.portalGstin;

      const invMatch = (pInvNoNorm === bInvNoNorm) || (p.portalInvNo.toLowerCase() === b.invno.toLowerCase());
      const gstinMatch = !pGstinNorm || !bGstinNorm || (pGstinNorm === bGstinNorm);

      if (invMatch && gstinMatch) {
        matchedPortal = p;
        p.matched = true;
        break;
      }
    }

    if (matchedPortal) {
      const diffTaxable = Math.round((bTaxable - matchedPortal.portalTaxable) * 100) / 100;
      const diffGst = Math.round((bTotalGst - matchedPortal.portalTotalGst) * 100) / 100;
      const isTaxMatched = Math.abs(diffTaxable) <= 1.00 && Math.abs(diffGst) <= 1.00;

      if (isTaxMatched) {
        reconciledItems.push({
          status: "MATCHED",
          statusLabel: "Fully Matched (Eligible ITC)",
          badgeClass: "badge-success",
          actionRequired: "None (Safe to claim in GSTR-3B)",
          vendorName: b.vendor_name || matchedPortal.portalVendor,
          vendorGstin: b.vendor_gstin || matchedPortal.portalGstin,
          invNo: b.invno,
          invDate: b.invdate,
          booksTaxable: bTaxable,
          booksGst: bTotalGst,
          booksTotalVal: bTotalVal,
          portalTaxable: matchedPortal.portalTaxable,
          portalGst: matchedPortal.portalTotalGst,
          portalTotalVal: matchedPortal.portalTotalVal,
          diffTaxable,
          diffGst,
          itcStatus: matchedPortal.itcAvailable ? "Eligible" : "Ineligible (Portal Flagged)"
        });
      } else {
        reconciledItems.push({
          status: "MISMATCH",
          statusLabel: "Value / Tax Mismatch",
          badgeClass: "badge-warning",
          actionRequired: `Verify difference (Tax diff: Rs. ${diffGst.toFixed(2)})`,
          vendorName: b.vendor_name || matchedPortal.portalVendor,
          vendorGstin: b.vendor_gstin || matchedPortal.portalGstin,
          invNo: b.invno,
          invDate: b.invdate,
          booksTaxable: bTaxable,
          booksGst: bTotalGst,
          booksTotalVal: bTotalVal,
          portalTaxable: matchedPortal.portalTaxable,
          portalGst: matchedPortal.portalTotalGst,
          portalTotalVal: matchedPortal.portalTotalVal,
          diffTaxable,
          diffGst,
          itcStatus: "Review Variance"
        });
      }
    } else {
      reconciledItems.push({
        status: "NOT_IN_2B",
        statusLabel: "Missing in GSTR-2B",
        badgeClass: "badge-danger",
        actionRequired: "Supplier follow-up: request vendor to file GSTR-1",
        vendorName: b.vendor_name,
        vendorGstin: b.vendor_gstin,
        invNo: b.invno,
        invDate: b.invdate,
        booksTaxable: bTaxable,
        booksGst: bTotalGst,
        booksTotalVal: bTotalVal,
        portalTaxable: 0,
        portalGst: 0,
        portalTotalVal: 0,
        diffTaxable: bTaxable,
        diffGst: bTotalGst,
        itcStatus: "ITC Ineligible under Rule 36(4)"
      });
    }
  }

  // Any unmatched portal records are NOT_IN_BOOKS
  for (const p of portalInvoices) {
    if (!p.matched) {
      reconciledItems.push({
        status: "NOT_IN_BOOKS",
        statusLabel: "Unclaimed in Books",
        badgeClass: "badge-info",
        actionRequired: "Verify with stores if material / bill was received",
        vendorName: p.portalVendor || "Portal Supplier",
        vendorGstin: p.portalGstin,
        invNo: p.portalInvNo,
        invDate: p.portalInvDate,
        booksTaxable: 0,
        booksGst: 0,
        booksTotalVal: 0,
        portalTaxable: p.portalTaxable,
        portalGst: p.portalTotalGst,
        portalTotalVal: p.portalTotalVal,
        diffTaxable: -p.portalTaxable,
        diffGst: -p.portalTotalGst,
        itcStatus: "Unclaimed ITC"
      });
    }
  }

  // 4. Summaries
  let totalBooksItc = 0;
  let totalPortalItc = 0;
  let matchedCount = 0;
  let matchedItc = 0;
  let mismatchCount = 0;
  let mismatchVariance = 0;
  let notIn2bCount = 0;
  let notIn2bItc = 0;
  let notInBooksCount = 0;
  let notInBooksItc = 0;

  for (const item of reconciledItems) {
    totalBooksItc += item.booksGst || 0;
    totalPortalItc += item.portalGst || 0;

    if (item.status === "MATCHED") {
      matchedCount++;
      matchedItc += item.booksGst;
    } else if (item.status === "MISMATCH") {
      mismatchCount++;
      mismatchVariance += Math.abs(item.diffGst);
    } else if (item.status === "NOT_IN_2B") {
      notIn2bCount++;
      notIn2bItc += item.booksGst;
    } else if (item.status === "NOT_IN_BOOKS") {
      notInBooksCount++;
      notInBooksItc += item.portalGst;
    }
  }

  return {
    reconciledAt: new Date().toISOString(),
    yearLabel,
    totalCount: reconciledItems.length,
    summary: {
      totalBooksItc: Math.round(totalBooksItc * 100) / 100,
      totalPortalItc: Math.round(totalPortalItc * 100) / 100,
      matchedCount,
      matchedItc: Math.round(matchedItc * 100) / 100,
      mismatchCount,
      mismatchVariance: Math.round(mismatchVariance * 100) / 100,
      notIn2bCount,
      notIn2bItc: Math.round(notIn2bItc * 100) / 100,
      notInBooksCount,
      notInBooksItc: Math.round(notInBooksItc * 100) / 100
    },
    items: reconciledItems
  };
}

/**
 * Generates sample/simulation GSTR-2B data for testing reconciliation.
 */
async function generateSampleGSTR2B(pool, { factoryId, yearLabel }) {
  const query = `
    SELECT 
      p.purchid, p.invno, p.invdate, p.vendorcode,
      COALESCE(v.vendor_name, s.supp_name, 'Standard Vendor') AS vendor_name,
      COALESCE(v.gstin, s.gstin, '29AABCB8888M1Z2') AS vendor_gstin,
      COALESCE(p.taxable_amt, 0) AS taxable_amt,
      COALESCE(p.cgst_amt, 0) AS cgst_amt,
      COALESCE(p.sgst_amt, 0) AS sgst_amt,
      COALESCE(p.igst_amt, 0) AS igst_amt,
      COALESCE(p.total_gst, 0) AS total_gst,
      COALESCE(p.totval, 0) AS total_purch_val
    FROM purchase p
    LEFT JOIN vendor v ON v.factory_id = p.factory_id AND v.vendor_code = p.vendorcode
    LEFT JOIN supplier s ON s.factory_id = p.factory_id AND s.supp_id = p.vendorcode
    WHERE p.factory_id = $1 AND p.year_label = $2
      AND p.invno IS NOT NULL AND TRIM(p.invno) <> ''
    ORDER BY p.invdate DESC, p.purchid DESC
    LIMIT 3
  `;
  const res = await pool.query(query, [factoryId, yearLabel]);
  const rows = res.rows;

  const b2b = [];

  if (rows.length > 0) {
    const r1 = rows[0];
    b2b.push({
      ctin: r1.vendor_gstin || "29AABCZ1234D1Z5",
      cpty: r1.vendor_name,
      inv: [
        {
          inum: r1.invno,
          typ: "R",
          dt: r1.invdate ? new Date(r1.invdate).toISOString().slice(0, 10) : "2026-11-05",
          val: Number(r1.total_purch_val) || 45135,
          pos: "29",
          rev: "N",
          itcavl: "Y",
          diffprcnt: 0,
          items: [
            {
              num: 1,
              itm_det: {
                txval: Number(r1.taxable_amt) || 38250,
                rt: 18.0,
                camt: Number(r1.cgst_amt) || 3442.5,
                samt: Number(r1.sgst_amt) || 3442.5,
                iamt: Number(r1.igst_amt) || 0,
                csamt: 0
              }
            }
          ]
        }
      ]
    });
  }

  if (rows.length > 1) {
    const r2 = rows[1];
    const tx = Number(r2.taxable_amt) || 20000;
    const cgst = (Number(r2.cgst_amt) || 1800) + 15.0;
    const sgst = (Number(r2.sgst_amt) || 1800) + 15.0;
    b2b.push({
      ctin: r2.vendor_gstin || "29AAACB4444N1Z1",
      cpty: r2.vendor_name,
      inv: [
        {
          inum: r2.invno,
          typ: "R",
          dt: r2.invdate ? new Date(r2.invdate).toISOString().slice(0, 10) : "2026-11-04",
          val: tx + cgst + sgst,
          pos: "29",
          rev: "N",
          itcavl: "Y",
          diffprcnt: 0,
          items: [
            {
              num: 1,
              itm_det: {
                txval: tx,
                rt: 18.0,
                camt: cgst,
                samt: sgst,
                iamt: 0,
                csamt: 0
              }
            }
          ]
        }
      ]
    });
  }

  // Extra portal invoice not in books (Unclaimed ITC)
  b2b.push({
    ctin: "29AABCP9999M1Z9",
    cpty: "KIRLOSKAR METALS & TUBES LTD",
    inv: [
      {
        inum: "KMT-2026-904",
        typ: "R",
        dt: "2026-11-02",
        val: 29500.00,
        pos: "29",
        rev: "N",
        itcavl: "Y",
        diffprcnt: 0,
        items: [
          {
            num: 1,
            itm_det: {
              txval: 25000.00,
              rt: 18.0,
              camt: 2250.00,
              samt: 2250.00,
              iamt: 0.00,
              csamt: 0.00
            }
          }
        ]
      }
    ]
  });

  return {
    gstin: "29AABCB1234F1Z5",
    fp: "112026",
    data: {
      b2b
    }
  };
}

module.exports = {
  STATE_CODES,
  GST_RATES,
  validateGSTIN,
  isSameState,
  calculateLineGST,
  calculateInvoiceGST,
  generateGSTR1Summary,
  generateGSTR3BSummary,
  reconcileGSTR2B,
  generateSampleGSTR2B,
  formatGstDate,
  mapToGstUom,
  extractPincode,
  extractCity,
  sanitizeHsn,
  generateEWayBillJson,
  generateEInvoiceJson
};
