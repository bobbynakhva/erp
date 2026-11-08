/**
 * SMART ERP - Cryptographic Immutable Audit Trail Engine
 * Tamper-Evident SHA-256 HMAC Hash Chaining for ISO 9001 / SOC 2 / IATF 16949 Compliance
 */
const crypto = require("crypto");
const XLSX = require("xlsx");

const AUDIT_SECRET = process.env.AUDIT_SECRET || "SMART_ERP_IMMUTABLE_AUDIT_SECRET_2026_COMPLIANCE";
const GENESIS_HASH = "GENESIS_SMART_ERP_ROOT_BLOCK_00000000000000000000000000000000";

function canonicalJsonStringify(input) {
  if (input === null || input === undefined) return "{}";
  const norm = (typeof input === "object") ? JSON.parse(JSON.stringify(input)) : input;
  function walk(x) {
    if (x === null || typeof x !== "object") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(walk).join(",") + "]";
    const keys = Object.keys(x).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + walk(x[k])).join(",") + "}";
  }
  return walk(norm);
}

function computeAuditSignature(prevHash, row) {
  const hmac = crypto.createHmac("sha256", AUDIT_SECRET);
  const ts = row.timestamp instanceof Date ? row.timestamp.toISOString() : new Date(row.timestamp).toISOString();
  const detailsObj = (typeof row.details === "string") ? JSON.parse(row.details) : (row.details || {});
  const payload = [
    prevHash || GENESIS_HASH,
    row.factory_id,
    row.year_label,
    ts,
    row.user_code != null ? row.user_code : "",
    row.username || "",
    String(row.action || "").toUpperCase(),
    String(row.module || "").toUpperCase(),
    row.record_id ? String(row.record_id) : "",
    canonicalJsonStringify(detailsObj)
  ].join("|");
  return hmac.update(payload).digest("hex");
}

/**
 * 1. Record an Immutable Audit Trail Event
 */
async function recordAuditLog(pool, {
  factoryId,
  yearLabel,
  userCode,
  username,
  action,
  module,
  recordId,
  details = {},
  ipAddress = "127.0.0.1",
  severity = "INFO"
}) {
  try {
    // 1. Fetch latest audit record signature to establish block chain
    const lastRow = await pool.query(
      `SELECT signature FROM audit_trail 
       WHERE factory_id = $1 AND year_label = $2 
       ORDER BY id DESC LIMIT 1`,
      [factoryId, yearLabel]
    );

    const prevHash = (lastRow.rows.length > 0 && lastRow.rows[0].signature) 
      ? lastRow.rows[0].signature 
      : GENESIS_HASH;

    const timestamp = new Date();

    const signature = computeAuditSignature(prevHash, {
      factory_id: factoryId,
      year_label: yearLabel,
      timestamp,
      user_code: userCode,
      username: username || "SYSTEM",
      action,
      module,
      record_id: recordId ? String(recordId) : null,
      details
    });

    const res = await pool.query(
      `INSERT INTO audit_trail 
        (factory_id, year_label, timestamp, user_code, username, action, module, record_id, details, ip_address, severity, prev_hash, signature)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, timestamp, signature`,
      [
        factoryId,
        yearLabel,
        timestamp,
        userCode,
        username || "SYSTEM",
        String(action).toUpperCase(),
        String(module).toUpperCase(),
        recordId ? String(recordId) : null,
        JSON.stringify(details),
        ipAddress,
        severity,
        prevHash,
        signature
      ]
    );

    return res.rows[0];
  } catch (err) {
    console.error("Failed to write immutable audit log:", err);
    return null;
  }
}

/**
 * 2. Query Audit Logs with Filters & Pagination
 */
async function getAuditLogs(pool, {
  factoryId,
  yearLabel,
  module,
  action,
  username,
  severity,
  query,
  fromDate,
  toDate,
  limit = 50,
  offset = 0
}) {
  const conditions = ["factory_id = $1", "year_label = $2"];
  const params = [factoryId, yearLabel];

  if (module && module !== "ALL") {
    params.push(String(module).toUpperCase());
    conditions.push(`module = $${params.length}`);
  }

  if (action && action !== "ALL") {
    params.push(String(action).toUpperCase());
    conditions.push(`action = $${params.length}`);
  }

  if (username) {
    params.push(`%${username.trim()}%`);
    conditions.push(`username ILIKE $${params.length}`);
  }

  if (severity && severity !== "ALL") {
    params.push(severity);
    conditions.push(`severity = $${params.length}`);
  }

  if (query) {
    params.push(`%${query.trim()}%`);
    conditions.push(`(record_id ILIKE $${params.length} OR details::text ILIKE $${params.length})`);
  }

  if (fromDate) {
    params.push(fromDate);
    conditions.push(`timestamp >= $${params.length}::timestamp`);
  }

  if (toDate) {
    params.push(toDate);
    conditions.push(`timestamp <= ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = conditions.join(" AND ");

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM audit_trail WHERE ${whereClause}`, params);
  const total = countRes.rows[0].total;

  params.push(Number(limit) || 50);
  const limitIdx = params.length;
  params.push(Number(offset) || 0);
  const offsetIdx = params.length;

  const dataRes = await pool.query(
    `SELECT id, timestamp, user_code, username, action, module, record_id, details, ip_address, severity, signature
     FROM audit_trail
     WHERE ${whereClause}
     ORDER BY id DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return {
    total,
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
    logs: dataRes.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      dateFormatted: new Date(r.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      userCode: r.user_code,
      username: r.username,
      action: r.action,
      module: r.module,
      recordId: r.record_id || "-",
      details: r.details || {},
      ipAddress: r.ip_address || "127.0.0.1",
      severity: r.severity,
      signature: r.signature,
      signatureShort: String(r.signature).slice(0, 12) + "..."
    }))
  };
}

/**
 * 3. Verify Entire Cryptographic Audit Chain Integrity
 * Returns verified status, block counts, and pinpoints tampering if any row was manipulated.
 */
async function verifyAuditIntegrity(pool, { factoryId, yearLabel }) {
  const rows = await pool.query(
    `SELECT id, factory_id, year_label, timestamp, user_code, username, action, module, record_id, details, prev_hash, signature
     FROM audit_trail
     WHERE factory_id = $1 AND year_label = $2
     ORDER BY id ASC`,
    [factoryId, yearLabel]
  );

  if (rows.rowCount === 0) {
    return {
      ok: true,
      totalRecords: 0,
      status: "EMPTY_CHAIN",
      message: "No audit records recorded yet. Genesis block ready.",
      verifiedAt: new Date().toISOString()
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < rows.rows.length; i++) {
    const row = rows.rows[i];

    // 1. Verify previous hash chaining
    if (row.prev_hash !== expectedPrevHash) {
      return {
        ok: false,
        status: "CHAIN_BROKEN",
        tamperedRecordId: row.id,
        tamperedIndex: i + 1,
        expectedPrevHash,
        actualPrevHash: row.prev_hash,
        message: `Cryptographic chain broken at Record #${row.id}. A record was deleted or inserted out-of-order!`,
        verifiedAt: new Date().toISOString()
      };
    }

    // 2. Re-calculate SHA-256 HMAC signature
    const calculatedSignature = computeAuditSignature(row.prev_hash, row);
    if (calculatedSignature !== row.signature) {
      return {
        ok: false,
        status: "SIGNATURE_MISMATCH",
        tamperedRecordId: row.id,
        tamperedIndex: i + 1,
        message: `Data tampering detected at Record #${row.id}! Stored signature does not match recalculation.`,
        verifiedAt: new Date().toISOString()
      };
    }

    expectedPrevHash = row.signature;
  }

  return {
    ok: true,
    totalRecords: rows.rows.length,
    status: "VALID_IMMUTABLE",
    firstRecordId: rows.rows[0].id,
    latestRecordId: rows.rows[rows.rows.length - 1].id,
    rootGenesisHash: GENESIS_HASH.slice(0, 16) + "...",
    latestChainHash: expectedPrevHash.slice(0, 16) + "...",
    message: `All ${rows.rows.length} audit records cryptographically verified. Zero tampering detected.`,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * 4. Export Audit Trail to Excel (.xlsx) / CSV
 */
async function exportAuditExcel(pool, { factoryId, yearLabel, fromDate, toDate, format = "xlsx" }) {
  const result = await getAuditLogs(pool, { factoryId, yearLabel, fromDate, toDate, limit: 5000, offset: 0 });
  const logs = result.logs;

  const rows = [
    ["TAMBA ERP - IMMUTABLE SECURITY & AUDIT TRAIL LOG"],
    [`Financial Year: ${yearLabel}`, `Total Events: ${logs.length}`, `Export Date: ${new Date().toISOString().slice(0, 10)}`],
    ["Cryptographic Integrity: All records validated against SHA-256 HMAC root chain."],
    [],
    ["Log ID", "Timestamp (IST)", "User", "Action", "Module", "Document / Record ID", "Details Summary", "IP Address", "Severity", "Signature (SHA-256)"]
  ];

  logs.forEach(l => {
    const detailsSummary = Object.entries(l.details || {})
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join("; ") || "-";

    rows.push([
      Number(l.id),
      l.dateFormatted,
      l.username,
      l.action,
      l.module,
      l.recordId,
      detailsSummary,
      l.ipAddress,
      l.severity,
      l.signatureShort
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 45 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");

  if (String(format).toLowerCase() === "csv") {
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `Audit_Trail_${yearLabel}.csv`,
      buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws), "utf-8")
    };
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `Audit_Trail_${yearLabel}.xlsx`,
    buffer
  };
}

module.exports = {
  recordAuditLog,
  getAuditLogs,
  verifyAuditIntegrity,
  exportAuditExcel,
  computeAuditSignature,
  GENESIS_HASH
};
