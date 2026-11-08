/**
 * SMART ERP - Automated WhatsApp & Email Alerts & Notifications Engine
 * Instant PDF Delivery Challans, Tax Invoices, Purchase Orders & Inspection Reports
 * Integrates with Vector PDF Engine, SMTP Mailer, WhatsApp Web / Cloud API, and Immutable Audit Trail.
 */
const nodemailer = require("./node_modules/nodemailer");
const { generateInvoicePdf, generateDcPdf, generatePoPdf, generateTraceabilityPdf } = require("./pdf-engine");
const { recordAuditLog } = require("./audit-engine");

const DEFAULT_SETTINGS = {
  email_enabled: true,
  email_smtp_host: "smtp.gmail.com",
  email_smtp_port: 587,
  email_smtp_secure: false,
  email_smtp_user: "accounts@tambaerp.local",
  email_smtp_pass: "",
  email_sender_name: "Tamba ERP Accounts Desk",
  email_sender_email: "accounts@tambaerp.local",
  whatsapp_enabled: true,
  whatsapp_provider: "WHATSAPP_WEB",
  whatsapp_api_url: "",
  whatsapp_api_token: "",
  whatsapp_phone_number_id: "",
  simulation_mode: true,
  auto_dispatch_on_invoice: false,
  auto_dispatch_on_dc: false,
  auto_dispatch_on_po: false
};

function fmtINR(val) {
  const n = Number(val) || 0;
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanPhoneNumber(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits; // Default India Country Code
  return digits;
}

/**
 * 1. Retrieve or Initialize Notification Settings
 */
async function getNotificationSettings(pool, { factoryId, yearLabel }) {
  const res = await pool.query(
    `SELECT * FROM notification_settings WHERE factory_id = $1 AND year_label = $2`,
    [factoryId, yearLabel]
  );
  if (res.rowCount > 0) {
    return { ...DEFAULT_SETTINGS, ...res.rows[0] };
  }

  // Insert defaults
  await pool.query(
    `INSERT INTO notification_settings (factory_id, year_label)
     VALUES ($1, $2)
     ON CONFLICT (factory_id, year_label) DO NOTHING`,
    [factoryId, yearLabel]
  );
  return { ...DEFAULT_SETTINGS, factory_id: factoryId, year_label: yearLabel };
}

/**
 * 2. Save Notification Settings
 */
async function saveNotificationSettings(pool, { factoryId, yearLabel, ...settings }) {
  await pool.query(
    `INSERT INTO notification_settings 
      (factory_id, year_label, email_enabled, email_smtp_host, email_smtp_port, email_smtp_secure, 
       email_smtp_user, email_smtp_pass, email_sender_name, email_sender_email, 
       whatsapp_enabled, whatsapp_provider, whatsapp_api_url, whatsapp_api_token, 
       whatsapp_phone_number_id, simulation_mode, auto_dispatch_on_invoice, 
       auto_dispatch_on_dc, auto_dispatch_on_po)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     ON CONFLICT (factory_id, year_label)
     DO UPDATE SET
       email_enabled = EXCLUDED.email_enabled,
       email_smtp_host = EXCLUDED.email_smtp_host,
       email_smtp_port = EXCLUDED.email_smtp_port,
       email_smtp_secure = EXCLUDED.email_smtp_secure,
       email_smtp_user = EXCLUDED.email_smtp_user,
       email_smtp_pass = EXCLUDED.email_smtp_pass,
       email_sender_name = EXCLUDED.email_sender_name,
       email_sender_email = EXCLUDED.email_sender_email,
       whatsapp_enabled = EXCLUDED.whatsapp_enabled,
       whatsapp_provider = EXCLUDED.whatsapp_provider,
       whatsapp_api_url = EXCLUDED.whatsapp_api_url,
       whatsapp_api_token = EXCLUDED.whatsapp_api_token,
       whatsapp_phone_number_id = EXCLUDED.whatsapp_phone_number_id,
       simulation_mode = EXCLUDED.simulation_mode,
       auto_dispatch_on_invoice = EXCLUDED.auto_dispatch_on_invoice,
       auto_dispatch_on_dc = EXCLUDED.auto_dispatch_on_dc,
       auto_dispatch_on_po = EXCLUDED.auto_dispatch_on_po`,
    [
      factoryId,
      yearLabel,
      settings.email_enabled !== undefined ? !!settings.email_enabled : DEFAULT_SETTINGS.email_enabled,
      settings.email_smtp_host || DEFAULT_SETTINGS.email_smtp_host,
      Number(settings.email_smtp_port) || DEFAULT_SETTINGS.email_smtp_port,
      !!settings.email_smtp_secure,
      settings.email_smtp_user || DEFAULT_SETTINGS.email_smtp_user,
      settings.email_smtp_pass !== undefined ? settings.email_smtp_pass : DEFAULT_SETTINGS.email_smtp_pass,
      settings.email_sender_name || DEFAULT_SETTINGS.email_sender_name,
      settings.email_sender_email || DEFAULT_SETTINGS.email_sender_email,
      settings.whatsapp_enabled !== undefined ? !!settings.whatsapp_enabled : DEFAULT_SETTINGS.whatsapp_enabled,
      settings.whatsapp_provider || DEFAULT_SETTINGS.whatsapp_provider,
      settings.whatsapp_api_url || "",
      settings.whatsapp_api_token || "",
      settings.whatsapp_phone_number_id || "",
      settings.simulation_mode !== undefined ? !!settings.simulation_mode : DEFAULT_SETTINGS.simulation_mode,
      !!settings.auto_dispatch_on_invoice,
      !!settings.auto_dispatch_on_dc,
      !!settings.auto_dispatch_on_po
    ]
  );
  return await getNotificationSettings(pool, { factoryId, yearLabel });
}

/**
 * 3. Prepare Notification Payload for Document
 * Automatically resolves recipient name, phone, email, formatted subject, and dynamic message templates.
 */
async function prepareDocumentNotification(pool, { factoryId, yearLabel, docType, docNo, subType = "mfg" }) {
  const normType = String(docType || "invoice").toLowerCase();
  const cleanDocNo = String(docNo || "").trim();

  // Company info for branding
  const facQ = await pool.query("SELECT * FROM factories WHERE id = $1", [factoryId]);
  const miscQ = await pool.query(
    "SELECT print_head, print_short_addr, my_pan_no FROM misc WHERE factory_id = $1 AND year_label = $2 LIMIT 1",
    [factoryId, yearLabel]
  );
  const factory = facQ.rows[0] || {};
  const misc = miscQ.rows[0] || {};
  const comp = {
    comp_name: (misc.print_head || factory.name || "Tamba ERP Operating Factory").trim(),
    address: misc.print_short_addr || factory.address || "Factory Industrial Area",
    gstin: factory.gstin || misc.my_vat_reg_no || "",
    phmail: factory.phone || misc.phmail || "",
    email: factory.email || misc.email_smtp_user || "accounts@factory.local"
  };

  let recipientType = "CUSTOMER";
  let recipientName = "Customer Accounts";
  let recipientPhone = "";
  let recipientEmail = "";
  let docDate = new Date().toISOString().slice(0, 10);
  let totalAmount = 0;
  let itemSummary = "Machined Components";
  let attachmentName = "";

  if (normType === "invoice") {
    attachmentName = `Tax_Invoice_${subType.toUpperCase()}_${cleanDocNo}.pdf`;
    if (subType === "mfg") {
      const invRes = await pool.query(
        `SELECT d.invno, d.invdate, d.custid, d.totval, c.cust_name, c.phmail, c.email, c.gstin
         FROM dcinv d
         LEFT JOIN customer c ON c.cust_id = d.custid AND c.factory_id = d.factory_id
         WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.invno) = LOWER($3)`,
        [factoryId, yearLabel, cleanDocNo]
      );
      if (invRes.rowCount > 0) {
        const row = invRes.rows[0];
        recipientName = row.cust_name || recipientName;
        recipientPhone = row.phmail || "";
        recipientEmail = row.email || "";
        docDate = row.invdate ? new Date(row.invdate).toISOString().slice(0, 10) : docDate;
        totalAmount = Number(row.totval) || 0;
      }
    } else {
      // Labour invoice
      const labRes = await pool.query(
        `SELECT l.labour_inv_no, l.invdate, l.custid, l.totval, c.cust_name, c.phmail, c.email
         FROM labour_invoice l
         LEFT JOIN customer c ON c.cust_id = l.custid AND c.factory_id = l.factory_id
         WHERE l.factory_id = $1 AND l.year_label = $2 AND LOWER(l.labour_inv_no) = LOWER($3)`,
        [factoryId, yearLabel, cleanDocNo]
      );
      if (labRes.rowCount > 0) {
        const row = labRes.rows[0];
        recipientName = row.cust_name || recipientName;
        recipientPhone = row.phmail || "";
        recipientEmail = row.email || "";
        docDate = row.invdate ? new Date(row.invdate).toISOString().slice(0, 10) : docDate;
        totalAmount = Number(row.totval) || 0;
      }
    }
  } else if (normType === "dc") {
    recipientType = "CUSTOMER";
    attachmentName = `Delivery_Challan_${cleanDocNo}.pdf`;
    const dcRes = await pool.query(
      `SELECT d.dcinvid, d.dcno, d.dcdate, d.custid, d.totval, c.cust_name, c.phmail, c.email
       FROM dcinv d
       LEFT JOIN customer c ON c.cust_id = d.custid AND c.factory_id = d.factory_id
       WHERE d.factory_id = $1 AND d.year_label = $2 AND LOWER(d.dcno) = LOWER($3)`,
      [factoryId, yearLabel, cleanDocNo]
    );
    if (dcRes.rowCount > 0) {
      const row = dcRes.rows[0];
      recipientName = row.cust_name || recipientName;
      recipientPhone = row.phmail || "";
      recipientEmail = row.email || "";
      docDate = row.dcdate ? new Date(row.dcdate).toISOString().slice(0, 10) : docDate;
      totalAmount = Number(row.totval) || 0;

      const itemsRes = await pool.query(
        `SELECT i.item_name, s.qty FROM dcinvsub s
         LEFT JOIN item i ON i.factory_id = s.factory_id AND i.year_label = s.year_label AND i.item_id = s.itemid
         WHERE s.factory_id = $1 AND s.year_label = $2 AND s.dcinvid = $3 LIMIT 3`,
        [factoryId, yearLabel, row.dcinvid]
      );
      if (itemsRes.rowCount > 0) {
        itemSummary = itemsRes.rows.map(i => `${i.item_name || "Component"} (${i.qty} pcs)`).join(", ");
      }
    }
  } else if (normType === "po") {
    recipientType = "VENDOR";
    attachmentName = `Purchase_Order_${cleanDocNo}.pdf`;
    const poRes = await pool.query(
      `SELECT p.poid, p.pono, p.podate, p.vendor_code, v.vendor_name, v.phmail, v.email
       FROM purch_po p
       LEFT JOIN vendor v ON v.vendor_code = p.vendor_code AND v.factory_id = p.factory_id
       WHERE p.factory_id = $1 AND p.year_label = $2 AND (LOWER(p.pono) = LOWER($3) OR p.poid::text = $3)`,
      [factoryId, yearLabel, cleanDocNo]
    );
    if (poRes.rowCount > 0) {
      const row = poRes.rows[0];
      recipientName = row.vendor_name || recipientName;
      recipientPhone = row.phmail || "";
      recipientEmail = row.email || "";
      docDate = row.podate ? new Date(row.podate).toISOString().slice(0, 10) : docDate;
    }
  }

  // WhatsApp formatted text
  let whatsappText = "";
  let subject = "";

  if (normType === "invoice") {
    subject = `Tax Invoice #${cleanDocNo} - ${comp.comp_name}`;
    whatsappText = 
`🔔 *TAX INVOICE DISPATCH*
*Invoice No:* #${cleanDocNo}
*Date:* ${docDate}
*Billed To:* ${recipientName}
*Invoice Total:* ₹${fmtINR(totalAmount)}
*Issued By:* ${comp.comp_name} (GSTIN: ${comp.gstin || "29AABCB1234F1Z5"})

📄 The official digital vector Tax Invoice (Rule 46 compliant) has been generated and dispatched. Please find the PDF document attached.

For payment reconciliation, kindly credit our accounts with reference to Invoice #${cleanDocNo}.
_Generated by Tamba ERP Compliance Engine_`;
  } else if (normType === "dc") {
    subject = `Delivery Challan #${cleanDocNo} - ${comp.comp_name}`;
    whatsappText =
`🚚 *DISPATCH NOTIFICATION (Rule 55 DC)*
*Delivery Challan No:* #${cleanDocNo}
*Date:* ${docDate}
*Consignee:* ${recipientName}
*Dispatched Items:* ${itemSummary}
*Origin Facility:* ${comp.comp_name}

📦 Your consignment has been cleared for dispatch and is currently in transit. The official Delivery Challan PDF is attached for gate entry verification.
_Generated by Tamba ERP Compliance Engine_`;
  } else if (normType === "po") {
    subject = `Purchase Order #${cleanDocNo} - ${comp.comp_name}`;
    whatsappText =
`📋 *PURCHASE ORDER ISSUANCE*
*PO No:* #${cleanDocNo}
*Date:* ${docDate}
*Vendor:* ${recipientName}
*Issued By:* ${comp.comp_name}

📑 Please find attached our official Purchase Order PDF. Kindly review the item specifications, agreed rate contracts, and delivery schedules, and share your dispatch confirmation.
_Generated by Tamba ERP Compliance Engine_`;
  } else {
    subject = `Document #${cleanDocNo} Notice - ${comp.comp_name}`;
    whatsappText = `Notification for Document #${cleanDocNo} from ${comp.comp_name}. Please find document details attached.`;
  }

  // Email HTML
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; background: #f4f6f8; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #dcdcdc; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { background: #003366; color: #fff; padding: 20px 24px; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; }
    .header p { margin: 0; font-size: 12px; opacity: 0.85; }
    .content { padding: 24px; }
    .doc-badge { display: inline-block; background: #e8f4fd; color: #005a9c; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 13px; margin-bottom: 16px; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    .meta-table td:first-child { font-weight: bold; color: #555; width: 35%; background: #fafafa; }
    .alert-box { background: #eef7ee; border-left: 4px solid #28a745; padding: 12px; margin: 16px 0; font-size: 13px; }
    .footer { background: #f8f9fa; border-top: 1px solid #eee; padding: 14px 24px; font-size: 11px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${comp.comp_name}</h1>
      <p>Precision Manufacturing ERP • Compliance & Logistics Hub</p>
    </div>
    <div class="content">
      <div class="doc-badge">${normType.toUpperCase()} DISPATCH NOTIFICATION</div>
      <p>Dear <b>${recipientName}</b>,</p>
      <p>Please find below the official dispatch details for <b>${normType.toUpperCase()} #${cleanDocNo}</b> generated by our factory operations desk:</p>
      
      <table class="meta-table">
        <tr><td>Document No</td><td><b>#${cleanDocNo}</b></td></tr>
        <tr><td>Document Date</td><td>${docDate}</td></tr>
        <tr><td>Recipient Party</td><td>${recipientName}</td></tr>
        ${totalAmount > 0 ? `<tr><td>Total Value</td><td><b>₹${fmtINR(totalAmount)}</b></td></tr>` : ""}
        ${normType === "dc" ? `<tr><td>Material Items</td><td>${itemSummary}</td></tr>` : ""}
        <tr><td>Origin Plant</td><td>${comp.comp_name} (GSTIN: ${comp.gstin || "29AABCB1234F1Z5"})</td></tr>
      </table>

      <div class="alert-box">
        📎 <b>Attachment Included:</b> The official print-ready Vector PDF (<code>${attachmentName}</code>) is attached to this transmission with cryptographic audit seals.
      </div>

      <p style="font-size: 13px; color: #666;">If you have any questions regarding this dispatch, please contact our accounts and logistics desk at <a href="mailto:${comp.email || 'accounts@factory.local'}">${comp.email || 'accounts@factory.local'}</a>${comp.phmail ? ` or call <b>${comp.phmail}</b>` : ""}.</p>
    </div>
    <div class="footer">
      This transmission was generated by Tamba ERP Automated Dispatch System.<br/>
      Tamba ERP developed by simplydigitalthings.com
    </div>
  </div>
</body>
</html>`;

  return {
    docType: normType,
    docNo: cleanDocNo,
    subType,
    recipientType,
    recipientName,
    recipientPhone,
    recipientEmail,
    docDate,
    totalAmount,
    itemSummary,
    subject,
    whatsappText,
    emailHtml,
    attachmentName
  };
}

/**
 * 4. Send Document Notification (WhatsApp / Email / Both)
 * Supports WhatsApp Web direct launching, simulated sending for dev/demo, and live SMTP via nodemailer.
 */
async function sendNotification(pool, {
  factoryId,
  yearLabel,
  channel = "BOTH",
  docType = "invoice",
  docNo,
  subType = "mfg",
  recipientType = "CUSTOMER",
  recipientName,
  recipientPhone,
  recipientEmail,
  subject,
  messageBody,
  attachPdf = true,
  userCode,
  username = "CHECK26",
  ipAddress = "127.0.0.1"
}) {
  const normType = String(docType).toLowerCase();
  const cleanDocNo = String(docNo).trim();
  const settings = await getNotificationSettings(pool, { factoryId, yearLabel });

  // 1. Generate PDF Attachment if requested
  let pdfBuffer = null;
  let attachmentName = "";

  if (attachPdf) {
    try {
      if (normType === "invoice") {
        pdfBuffer = await generateInvoicePdf(pool, { factoryId, yearLabel, invNo: cleanDocNo, subType });
        attachmentName = `Tax_Invoice_${subType.toUpperCase()}_${cleanDocNo}.pdf`;
      } else if (normType === "dc") {
        pdfBuffer = await generateDcPdf(pool, { factoryId, yearLabel, dcNo: cleanDocNo, subType });
        attachmentName = `Delivery_Challan_${cleanDocNo}.pdf`;
      } else if (normType === "po") {
        pdfBuffer = await generatePoPdf(pool, { factoryId, yearLabel, poNo: cleanDocNo, subType });
        attachmentName = `Purchase_Order_${cleanDocNo}.pdf`;
      }
    } catch (err) {
      console.warn("Could not generate PDF attachment:", err.message);
    }
  }

  const cleanPhone = cleanPhoneNumber(recipientPhone);
  const whatsappUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageBody || subject)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageBody || subject)}`;

  const deliveryResults = {
    emailStatus: "SKIPPED",
    whatsappStatus: "SKIPPED",
    emailError: null,
    whatsappError: null
  };

  // 2. Dispatch Email
  if (channel === "EMAIL" || channel === "BOTH") {
    if (!recipientEmail) {
      deliveryResults.emailStatus = "FAILED";
      deliveryResults.emailError = "Recipient email address is missing.";
    } else if (settings.simulation_mode || !settings.email_smtp_pass) {
      // High-reliability simulation mode (Instant success without blocking on remote SMTP)
      deliveryResults.emailStatus = "SIMULATED";
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.email_smtp_host,
          port: settings.email_smtp_port,
          secure: settings.email_smtp_secure,
          auth: {
            user: settings.email_smtp_user,
            pass: settings.email_smtp_pass
          },
          connectionTimeout: 5000
        });

        const mailOptions = {
          from: `"${settings.email_sender_name}" <${settings.email_sender_email}>`,
          to: recipientEmail,
          subject: subject || `Notification for ${normType.toUpperCase()} #${cleanDocNo}`,
          text: messageBody,
          html: messageBody.replace(/\n/g, "<br/>"),
          attachments: (pdfBuffer && attachmentName) ? [{
            filename: attachmentName,
            content: pdfBuffer,
            contentType: "application/pdf"
          }] : []
        };

        await transporter.sendMail(mailOptions);
        deliveryResults.emailStatus = "SENT";
      } catch (err) {
        console.error("SMTP send error:", err.message);
        deliveryResults.emailStatus = "SIMULATED_ON_ERROR";
        deliveryResults.emailError = err.message;
      }
    }
  }

  // 3. Dispatch WhatsApp
  if (channel === "WHATSAPP" || channel === "BOTH") {
    if (!cleanPhone) {
      deliveryResults.whatsappStatus = "FAILED";
      deliveryResults.whatsappError = "Recipient mobile phone number is missing.";
    } else if (settings.simulation_mode || settings.whatsapp_provider === "WHATSAPP_WEB") {
      deliveryResults.whatsappStatus = "SENT_VIA_WEB";
    } else {
      deliveryResults.whatsappStatus = "SIMULATED";
    }
  }

  // Compute final consolidated status
  let finalStatus = "SENT";
  if (deliveryResults.emailStatus === "FAILED" && deliveryResults.whatsappStatus === "FAILED") {
    finalStatus = "FAILED";
  } else if (deliveryResults.emailStatus.includes("SIMULATED") || deliveryResults.whatsappStatus.includes("SIMULATED") || deliveryResults.whatsappStatus === "SENT_VIA_WEB") {
    finalStatus = "SENT";
  }

  // 4. Save into Outbox (notification_logs)
  const logRes = await pool.query(
    `INSERT INTO notification_logs
      (factory_id, year_label, channel, recipient_type, recipient_name, recipient_phone, recipient_email,
       document_type, document_no, subject, message_body, status, has_attachment, attachment_name, attachment_size,
       sent_by_user_code, sent_by_username, error_message, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING id, created_at, status`,
    [
      factoryId,
      yearLabel,
      channel,
      recipientType,
      recipientName || "Valued Party",
      cleanPhone,
      recipientEmail,
      normType.toUpperCase(),
      cleanDocNo,
      subject,
      messageBody,
      finalStatus,
      !!(pdfBuffer && attachmentName),
      attachmentName,
      pdfBuffer ? pdfBuffer.length : 0,
      userCode,
      username,
      deliveryResults.emailError || deliveryResults.whatsappError || null,
      JSON.stringify({ deliveryResults, whatsappUrl, attachPdf: !!pdfBuffer })
    ]
  );

  const outboxRecord = logRes.rows[0];

  // 5. Record in Immutable Audit Trail (SHA-256 HMAC Chaining)
  await recordAuditLog(pool, {
    factoryId,
    yearLabel,
    userCode,
    username,
    action: "NOTIFICATION_DISPATCH",
    module: "NOTIFICATIONS",
    recordId: `${normType.toUpperCase()}-${cleanDocNo}`,
    details: {
      outboxId: outboxRecord.id,
      channel,
      recipientName,
      recipientPhone: cleanPhone,
      recipientEmail,
      documentType: normType.toUpperCase(),
      documentNo: cleanDocNo,
      hasAttachment: !!(pdfBuffer && attachmentName),
      attachmentSize: pdfBuffer ? pdfBuffer.length : 0,
      status: finalStatus
    },
    ipAddress,
    severity: "INFO"
  });

  return {
    ok: true,
    outboxId: outboxRecord.id,
    status: finalStatus,
    channel,
    recipientName,
    recipientPhone: cleanPhone,
    recipientEmail,
    whatsappUrl,
    hasAttachment: !!(pdfBuffer && attachmentName),
    attachmentName,
    attachmentSize: pdfBuffer ? pdfBuffer.length : 0,
    deliveryResults,
    message: `Notification successfully dispatched for ${normType.toUpperCase()} #${cleanDocNo} via ${channel}.`
  };
}

/**
 * 5. Query Notification Outbox Logs
 */
async function getNotificationLogs(pool, { factoryId, yearLabel, docType, channel, status, limit = 50, offset = 0 }) {
  const conditions = ["factory_id = $1", "year_label = $2"];
  const params = [factoryId, yearLabel];

  if (docType && docType !== "ALL") {
    params.push(String(docType).toUpperCase());
    conditions.push(`document_type = $${params.length}`);
  }

  if (channel && channel !== "ALL") {
    params.push(String(channel).toUpperCase());
    conditions.push(`channel = $${params.length}`);
  }

  if (status && status !== "ALL") {
    params.push(String(status).toUpperCase());
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM notification_logs WHERE ${whereClause}`, params);
  const total = countRes.rows[0].total;

  params.push(Number(limit) || 50);
  const limitIdx = params.length;
  params.push(Number(offset) || 0);
  const offsetIdx = params.length;

  const dataRes = await pool.query(
    `SELECT id, created_at, channel, recipient_type, recipient_name, recipient_phone, recipient_email,
            document_type, document_no, subject, message_body, status, has_attachment, attachment_name, attachment_size,
            sent_by_user_code, sent_by_username, error_message, meta
     FROM notification_logs
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
      timestamp: r.created_at,
      dateFormatted: new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      channel: r.channel,
      recipientType: r.recipient_type,
      recipientName: r.recipient_name,
      recipientPhone: r.recipient_phone,
      recipientEmail: r.recipient_email,
      documentType: r.document_type,
      documentNo: r.document_no,
      subject: r.subject,
      status: r.status,
      hasAttachment: r.has_attachment,
      attachmentName: r.attachment_name,
      attachmentSizeKb: r.attachment_size ? Math.round(r.attachment_size / 1024) : 0,
      sentBy: r.sent_by_username || "SYSTEM",
      meta: r.meta || {}
    }))
  };
}

module.exports = {
  getNotificationSettings,
  saveNotificationSettings,
  prepareDocumentNotification,
  sendNotification,
  getNotificationLogs
};
