/**
 * SMART ERP - Notification Center & Automated Dispatch Controller
 * WhatsApp Web & SMTP Email Dispatch for Invoices, Delivery Challans & Purchase Orders
 */
(() => {
  let currentDoc = {
    docType: "invoice",
    docNo: "7047",
    subType: "mfg"
  };

  let currentPayload = null;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showStatus(text, isError = false) {
    const el = document.getElementById("notify-status-msg");
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#c00" : "#006600";
    if (text) {
      setTimeout(() => {
        if (el.textContent === text) el.textContent = "";
      }, 6000);
    }
  }

  function switchTab(activeTab) {
    const tabSend = document.getElementById("notify-tab-btn-send");
    const tabOutbox = document.getElementById("notify-tab-btn-outbox");
    const tabSettings = document.getElementById("notify-tab-btn-settings");

    const viewSend = document.getElementById("notify-view-send");
    const viewOutbox = document.getElementById("notify-view-outbox");
    const viewSettings = document.getElementById("notify-view-settings");

    if (tabSend) tabSend.style.background = activeTab === "send" ? "#075e54" : "#d4d0c8";
    if (tabSend) tabSend.style.color = activeTab === "send" ? "#fff" : "#333";

    if (tabOutbox) tabOutbox.style.background = activeTab === "outbox" ? "#075e54" : "#d4d0c8";
    if (tabOutbox) tabOutbox.style.color = activeTab === "outbox" ? "#fff" : "#333";

    if (tabSettings) tabSettings.style.background = activeTab === "settings" ? "#075e54" : "#d4d0c8";
    if (tabSettings) tabSettings.style.color = activeTab === "settings" ? "#fff" : "#333";

    if (viewSend) viewSend.hidden = activeTab !== "send";
    if (viewOutbox) viewOutbox.hidden = activeTab !== "outbox";
    if (viewSettings) viewSettings.hidden = activeTab !== "settings";

    if (activeTab === "outbox") loadOutboxLogs();
    if (activeTab === "settings") loadSettings();
  }

  async function openNotificationModal(options = {}) {
    currentDoc = {
      docType: options.docType || currentDoc.docType || "invoice",
      docNo: options.docNo || currentDoc.docNo || "7047",
      subType: options.subType || currentDoc.subType || "mfg"
    };

    const modal = document.getElementById("notification-modal");
    if (!modal) return;
    modal.hidden = false;
    modal.style.display = "flex";

    switchTab("send");
    await prepareNotification();
    await updateOutboxBadge();
  }

  function closeNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
    }
  }

  async function prepareNotification() {
    const docBadge = document.getElementById("notify-doc-type-badge");
    const docNoEl = document.getElementById("notify-doc-no");
    const partyNameEl = document.getElementById("notify-party-name");
    const amountEl = document.getElementById("notify-doc-amount");
    const phoneInput = document.getElementById("notify-input-phone");
    const emailInput = document.getElementById("notify-input-email");
    const subjectInput = document.getElementById("notify-input-subject");
    const messageInput = document.getElementById("notify-input-message");
    const attachNameEl = document.getElementById("notify-attachment-name");

    showStatus("Loading document details...");

    try {
      const url = `/api/notifications/prepare?docType=${encodeURIComponent(currentDoc.docType)}&docNo=${encodeURIComponent(currentDoc.docNo)}&subType=${encodeURIComponent(currentDoc.subType)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load document info");

      const p = json.payload;
      currentPayload = p;

      if (docBadge) docBadge.textContent = p.docType.toUpperCase();
      if (docNoEl) docNoEl.textContent = `#${p.docNo}`;
      if (partyNameEl) partyNameEl.textContent = p.recipientName;
      if (amountEl) {
        amountEl.textContent = p.totalAmount > 0 
          ? `₹${Number(p.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          : "";
      }

      if (phoneInput) phoneInput.value = p.recipientPhone || "";
      if (emailInput) emailInput.value = p.recipientEmail || "";
      if (subjectInput) subjectInput.value = p.subject || "";
      if (messageInput) messageInput.value = p.whatsappText || "";
      if (attachNameEl) attachNameEl.textContent = p.attachmentName || `${p.docType}_${p.docNo}.pdf`;

      showStatus("Document loaded & dispatch template ready.");
    } catch (err) {
      console.error("prepareNotification error:", err);
      showStatus("Could not auto-fill document details: " + err.message, true);
    }
  }

  function openWhatsAppWeb() {
    const phoneInput = document.getElementById("notify-input-phone");
    const messageInput = document.getElementById("notify-input-message");

    const phone = (phoneInput ? phoneInput.value : "").replace(/\D/g, "");
    const text = messageInput ? messageInput.value : "";

    let cleanPhone = phone;
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
    showStatus("WhatsApp Web launched in new window.");
  }

  function previewPdf() {
    const norm = currentDoc.docType.toLowerCase();
    const no = currentDoc.docNo;
    const sub = currentDoc.subType;
    let url = `/api/export/pdf?type=${norm}&no=${encodeURIComponent(no)}&subType=${encodeURIComponent(sub)}`;
    window.open(url, "_blank");
  }

  async function sendServerDispatch() {
    const channelRadios = document.querySelectorAll('input[name="notify_channel"]');
    let channel = "BOTH";
    channelRadios.forEach(r => { if (r.checked) channel = r.value; });

    const phoneInput = document.getElementById("notify-input-phone");
    const emailInput = document.getElementById("notify-input-email");
    const subjectInput = document.getElementById("notify-input-subject");
    const messageInput = document.getElementById("notify-input-message");
    const attachCheck = document.getElementById("notify-check-attach-pdf");

    const sendBtn = document.getElementById("notify-btn-send-server");
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "⏳ Dispatching...";
    }
    showStatus("Generating Vector PDF and dispatching notification...");

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          docType: currentDoc.docType,
          docNo: currentDoc.docNo,
          subType: currentDoc.subType,
          recipientType: currentPayload?.recipientType || "CUSTOMER",
          recipientName: currentPayload?.recipientName || "Valued Party",
          recipientPhone: phoneInput ? phoneInput.value : "",
          recipientEmail: emailInput ? emailInput.value : "",
          subject: subjectInput ? subjectInput.value : "",
          messageBody: messageInput ? messageInput.value : "",
          attachPdf: attachCheck ? attachCheck.checked : true
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);

      showStatus(`✓ ${json.message}`);
      await updateOutboxBadge();
    } catch (err) {
      console.error("sendServerDispatch error:", err);
      showStatus("Dispatch failed: " + err.message, true);
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = "<span>🚀 Send Automated Dispatch</span>";
      }
    }
  }

  async function updateOutboxBadge() {
    try {
      const res = await fetch("/api/notifications/logs?limit=1");
      if (res.ok) {
        const json = await res.json();
        const total = json.data?.total || 0;
        const badge = document.getElementById("notify-outbox-badge");
        if (badge) badge.textContent = String(total);
      }
    } catch {}
  }

  async function loadOutboxLogs() {
    const tbody = document.getElementById("notify-outbox-tbody");
    const countEl = document.getElementById("notify-outbox-count");
    const filterDoc = document.getElementById("notify-outbox-filter-doc")?.value || "ALL";

    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888; padding: 16px;">Loading outbox history...</td></tr>';

    try {
      const res = await fetch(`/api/notifications/logs?docType=${encodeURIComponent(filterDoc)}&limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const { logs, total } = json.data;
      if (countEl) countEl.textContent = `Total: ${total} transmissions`;

      if (!logs || logs.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; padding: 16px;">No notification history found.</td></tr>';
        return;
      }

      if (tbody) {
        tbody.innerHTML = logs.map(l => {
          const statusBg = l.status === "SENT" ? "#d4edda" : (l.status === "SIMULATED" || l.status === "SENT_VIA_WEB" ? "#d1ecf1" : "#f8d7da");
          const statusColor = l.status === "SENT" ? "#155724" : (l.status === "SIMULATED" || l.status === "SENT_VIA_WEB" ? "#0c5460" : "#721c24");
          const channelBg = l.channel === "WHATSAPP" ? "#25d366" : (l.channel === "EMAIL" ? "#005a9c" : "#075e54");

          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 5px; font-weight: bold; color: #555;">#${l.id}</td>
              <td style="padding: 5px; white-space: nowrap;">${escapeHtml(l.dateFormatted)}</td>
              <td style="padding: 5px;"><span style="background: ${channelBg}; color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: bold; font-size: 9px;">${escapeHtml(l.channel)}</span></td>
              <td style="padding: 5px; font-weight: bold; color: #003366;">${escapeHtml(l.documentType)} #${escapeHtml(l.documentNo)}</td>
              <td style="padding: 5px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(l.recipientName)}</td>
              <td style="padding: 5px; font-size: 9px; color: #666;">${escapeHtml(l.recipientPhone || l.recipientEmail || "-")}</td>
              <td style="padding: 5px; text-align: center;">
                ${l.hasAttachment ? `<span title="${escapeHtml(l.attachmentName)}" style="color: #800000; font-weight: bold; cursor: pointer;">📎 ${l.attachmentSizeKb} KB</span>` : `<span style="color: #ccc;">-</span>`}
              </td>
              <td style="padding: 5px; text-align: center;">
                <span style="background: ${statusBg}; color: ${statusColor}; padding: 1px 6px; border-radius: 3px; font-weight: bold; font-size: 9px;">${escapeHtml(l.status)}</span>
              </td>
            </tr>
          `;
        }).join("");
      }
    } catch (err) {
      console.error("loadOutboxLogs error:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #c00; padding: 16px;">Failed to load logs: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/notifications/settings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const s = json.settings;

      const host = document.getElementById("notify-set-smtp-host");
      const port = document.getElementById("notify-set-smtp-port");
      const user = document.getElementById("notify-set-smtp-user");
      const pass = document.getElementById("notify-set-smtp-pass");
      const sName = document.getElementById("notify-set-sender-name");
      const sEmail = document.getElementById("notify-set-sender-email");
      const prov = document.getElementById("notify-set-wa-provider");
      const sim = document.getElementById("notify-set-simulation-mode");

      if (host) host.value = s.email_smtp_host || "";
      if (port) port.value = s.email_smtp_port || 587;
      if (user) user.value = s.email_smtp_user || "";
      if (pass) pass.value = s.email_smtp_pass || "";
      if (sName) sName.value = s.email_sender_name || "";
      if (sEmail) sEmail.value = s.email_sender_email || "";
      if (prov) prov.value = s.whatsapp_provider || "WHATSAPP_WEB";
      if (sim) sim.checked = !!s.simulation_mode;
    } catch (err) {
      console.error("loadSettings error:", err);
    }
  }

  async function saveSettings() {
    const host = document.getElementById("notify-set-smtp-host")?.value;
    const port = document.getElementById("notify-set-smtp-port")?.value;
    const user = document.getElementById("notify-set-smtp-user")?.value;
    const pass = document.getElementById("notify-set-smtp-pass")?.value;
    const sName = document.getElementById("notify-set-sender-name")?.value;
    const sEmail = document.getElementById("notify-set-sender-email")?.value;
    const prov = document.getElementById("notify-set-wa-provider")?.value;
    const sim = document.getElementById("notify-set-simulation-mode")?.checked;

    const statusEl = document.getElementById("notify-set-status");
    if (statusEl) statusEl.textContent = "Saving...";

    try {
      const res = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_smtp_host: host,
          email_smtp_port: Number(port) || 587,
          email_smtp_user: user,
          email_smtp_pass: pass,
          email_sender_name: sName,
          email_sender_email: sEmail,
          whatsapp_provider: prov,
          simulation_mode: sim
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);

      if (statusEl) statusEl.textContent = "✓ Settings saved successfully!";
      setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 4000);
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = "Error saving settings: " + err.message;
        statusEl.style.color = "#c00";
      }
    }
  }

  function init() {
    // Modal Close
    document.getElementById("notify-modal-close-x")?.addEventListener("click", closeNotificationModal);
    document.getElementById("notify-btn-close")?.addEventListener("click", closeNotificationModal);

    // Tab buttons
    document.getElementById("notify-tab-btn-send")?.addEventListener("click", () => switchTab("send"));
    document.getElementById("notify-tab-btn-outbox")?.addEventListener("click", () => switchTab("outbox"));
    document.getElementById("notify-tab-btn-settings")?.addEventListener("click", () => switchTab("settings"));

    // Action buttons
    document.getElementById("notify-btn-open-wa-web")?.addEventListener("click", openWhatsAppWeb);
    document.getElementById("notify-btn-send-server")?.addEventListener("click", sendServerDispatch);
    document.getElementById("notify-btn-preview-pdf")?.addEventListener("click", previewPdf);

    // Outbox filter & refresh
    document.getElementById("notify-outbox-btn-refresh")?.addEventListener("click", loadOutboxLogs);
    document.getElementById("notify-outbox-filter-doc")?.addEventListener("change", loadOutboxLogs);

    // Save Settings
    document.getElementById("notify-set-btn-save")?.addEventListener("click", saveSettings);

    // Wire Document Buttons:
    // 1. Tax Invoice MFG
    const invMfgNotifyBtn = document.getElementById("invmfg-btn-notify");
    if (invMfgNotifyBtn) {
      invMfgNotifyBtn.addEventListener("click", () => {
        const invNoBox = document.getElementById("invmfg-invno") || document.getElementById("invmfg-dcno");
        const docNo = (invNoBox && invNoBox.value.trim()) ? invNoBox.value.trim() : "7047";
        openNotificationModal({ docType: "invoice", docNo, subType: "mfg" });
      });
    }

    // 2. Tax Invoice Labour
    const invLabNotifyBtn = document.getElementById("invlab-btn-notify");
    if (invLabNotifyBtn) {
      invLabNotifyBtn.addEventListener("click", () => {
        const invNoBox = document.getElementById("invlab-invno") || document.getElementById("invlab-dcno");
        const docNo = (invNoBox && invNoBox.value.trim()) ? invNoBox.value.trim() : "7048";
        openNotificationModal({ docType: "invoice", docNo, subType: "labour" });
      });
    }

    // 3. Delivery Challan
    const dcNotifyBtn = document.getElementById("dc-btn-notify");
    if (dcNotifyBtn) {
      dcNotifyBtn.addEventListener("click", () => {
        const dcNoBox = document.getElementById("dc-dcno");
        const docNo = (dcNoBox && dcNoBox.value.trim()) ? dcNoBox.value.trim() : "DC-TEST-2653";
        openNotificationModal({ docType: "dc", docNo, subType: "mfg" });
      });
    }

    // 4. Purchase Order
    const poNotifyBtn = document.getElementById("po-notify");
    if (poNotifyBtn) {
      poNotifyBtn.addEventListener("click", () => {
        const poNoBox = document.getElementById("po-no");
        const docNo = (poNoBox && poNoBox.value.trim()) ? poNoBox.value.trim() : "PO-TEST-2598";
        openNotificationModal({ docType: "po", docNo, subType: "mfg" });
      });
    }

    // 5. Export Center shortcut
    const expNotifyBtn = document.getElementById("exp-btn-open-notify");
    if (expNotifyBtn) {
      expNotifyBtn.addEventListener("click", () => {
        openNotificationModal({ docType: "invoice", docNo: "7047", subType: "mfg" });
      });
    }

    // 6. Dashboard Launchpad shortcut
    const dashNotifyBtn = document.getElementById("dash-btn-notify-hub");
    if (dashNotifyBtn) {
      dashNotifyBtn.addEventListener("click", () => {
        openNotificationModal({ docType: "invoice", docNo: "7047", subType: "mfg" });
      });
    }
  }

  window.openNotificationModal = openNotificationModal;
  window.closeNotificationModal = closeNotificationModal;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
