(() => {
  let currentLogs = [];
  let isVerified = false;

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function getActionBadge(action) {
    const act = String(action || "").toUpperCase();
    if (act.includes("LOGIN")) return '<span class="badge" style="background:#e8f4f8;color:#0056b3;border:1px solid #b8daff;padding:1px 5px;font-size:10px;">LOGIN</span>';
    if (act.includes("ROLE")) return '<span class="badge" style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:1px 5px;font-size:10px;">ROLE ASSIGN</span>';
    if (act.includes("CREATE")) return '<span class="badge" style="background:#d4edda;color:#155724;border:1px solid #c3e6cb;padding:1px 5px;font-size:10px;">CREATE</span>';
    if (act.includes("UPDATE")) return '<span class="badge" style="background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;padding:1px 5px;font-size:10px;">UPDATE</span>';
    if (act.includes("DELETE")) return '<span class="badge" style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;padding:1px 5px;font-size:10px;">DELETE</span>';
    if (act.includes("PDF")) return '<span class="badge" style="background:#fde8e8;color:#9b1c1c;border:1px solid #f8b4b4;padding:1px 5px;font-size:10px;">PDF</span>';
    if (act.includes("EXCEL")) return '<span class="badge" style="background:#def7ec;color:#03543f;border:1px solid #84e1bc;padding:1px 5px;font-size:10px;">EXCEL</span>';
    return `<span class="badge" style="background:#eee;color:#333;padding:1px 5px;font-size:10px;">${escapeHtml(act)}</span>`;
  }

  function getSeverityBadge(sev) {
    const s = String(sev || "INFO").toUpperCase();
    if (s === "CRITICAL") return '<span style="color:#c00;font-weight:bold;">CRITICAL</span>';
    if (s === "WARNING") return '<span style="color:#d97706;font-weight:bold;">WARN</span>';
    return '<span style="color:#008000;font-weight:bold;">INFO</span>';
  }

  async function openAuditTrail() {
    const win = document.getElementById("audit-window");
    if (!win) return;
    win.removeAttribute("hidden");
    win.style.display = "flex";

    await loadAuditLogs();
    await verifyChain();
  }

  function closeAuditTrail() {
    const win = document.getElementById("audit-window");
    if (!win) return;
    win.setAttribute("hidden", "hidden");
    win.style.display = "none";
  }

  async function loadAuditLogs() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #888; padding: 16px;">Loading audit logs...</td></tr>';

    const module = document.getElementById("audit-filter-module")?.value || "ALL";
    const action = document.getElementById("audit-filter-action")?.value || "ALL";
    const username = document.getElementById("audit-filter-user")?.value || "";
    const q = document.getElementById("audit-filter-q")?.value || "";

    const params = new URLSearchParams();
    if (module !== "ALL") params.append("module", module);
    if (action !== "ALL") params.append("action", action);
    if (username.trim()) params.append("username", username.trim());
    if (q.trim()) params.append("query", q.trim());
    params.append("limit", "100");

    try {
      const res = await fetch(`/api/audit/logs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load audit logs");

      const { logs, total } = json.data;
      currentLogs = logs || [];

      const infoEl = document.getElementById("audit-pagination-info");
      if (infoEl) infoEl.textContent = `Showing ${currentLogs.length} of ${total} events`;

      if (currentLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #666; padding: 16px;">No audit events matching criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = currentLogs.map(l => {
        const detailsStr = Object.entries(l.details || {})
          .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}`)
          .join(" | ") || "-";

        return `
          <tr>
            <td style="font-weight: bold; color: #003366;">#${l.id}</td>
            <td style="white-space: nowrap;">${escapeHtml(l.dateFormatted)}</td>
            <td style="font-weight: bold; color: #000080;">${escapeHtml(l.username)}</td>
            <td>${getActionBadge(l.action)}</td>
            <td><span style="font-weight: 500; font-size: 10px; color: #444;">${escapeHtml(l.module)}</span></td>
            <td style="font-weight: bold; color: #660066;">${escapeHtml(l.recordId)}</td>
            <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(detailsStr.replace(/<[^>]+>/g, ''))}">${detailsStr}</td>
            <td style="font-size: 10px; color: #555;">${escapeHtml(l.ipAddress)}</td>
            <td style="text-align: center; font-size: 10px;">${getSeverityBadge(l.severity)}</td>
            <td style="font-family: monospace; font-size: 9px; color: #107c41; font-weight: bold;" title="SHA-256 HMAC Seal: ${escapeHtml(l.signatureShort)}">🔒 ${escapeHtml(l.signatureShort)}</td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      console.error("loadAuditLogs error:", err);
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #c00; padding: 16px;">Error loading logs: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function verifyChain() {
    const badgeEl = document.getElementById("audit-chain-badge");
    const statusText = document.getElementById("audit-chain-status-text");
    const blockCountEl = document.getElementById("audit-block-count-badge");

    if (statusText) statusText.textContent = "Verifying cryptographic chain...";

    try {
      const res = await fetch("/api/audit/verify");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.ok) {
        isVerified = true;
        if (badgeEl) {
          badgeEl.style.background = "#d4edda";
          badgeEl.style.color = "#155724";
          badgeEl.style.borderColor = "#c3e6cb";
        }
        if (statusText) statusText.textContent = "✓ Cryptographically Verified & Immutable";
        if (blockCountEl) blockCountEl.textContent = `${json.totalRecords} Block(s) Sealed (Zero Tampering)`;
      } else {
        isVerified = false;
        if (badgeEl) {
          badgeEl.style.background = "#f8d7da";
          badgeEl.style.color = "#721c24";
          badgeEl.style.borderColor = "#f5c6cb";
        }
        if (statusText) statusText.textContent = `⚠️ Tamper Alert: ${json.message}`;
        if (blockCountEl) blockCountEl.textContent = `Broken at Block #${json.tamperedRecordId}`;
      }
    } catch (err) {
      console.error("verifyChain error:", err);
      if (statusText) statusText.textContent = "Verification service unavailable";
    }
  }

  function init() {
    // Open/Close
    const dashBtn = document.getElementById("dash-btn-audit-trail");
    if (dashBtn) dashBtn.addEventListener("click", openAuditTrail);

    const closeX = document.getElementById("audit-btn-close-x");
    if (closeX) closeX.addEventListener("click", closeAuditTrail);

    const closeBtn = document.getElementById("audit-btn-close");
    if (closeBtn) closeBtn.addEventListener("click", closeAuditTrail);

    // Re-verify
    const verifyBtn = document.getElementById("audit-btn-verify");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        await verifyChain();
        await loadAuditLogs();
      });
    }

    // Filter & Reset
    const filterBtn = document.getElementById("audit-btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", () => loadAuditLogs());

    const resetBtn = document.getElementById("audit-btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const mod = document.getElementById("audit-filter-module");
        if (mod) mod.value = "ALL";
        const act = document.getElementById("audit-filter-action");
        if (act) act.value = "ALL";
        const user = document.getElementById("audit-filter-user");
        if (user) user.value = "";
        const q = document.getElementById("audit-filter-q");
        if (q) q.value = "";
        loadAuditLogs();
      });
    }

    // Exports
    const expXlsxBtn = document.getElementById("audit-btn-export-xlsx");
    if (expXlsxBtn) {
      expXlsxBtn.addEventListener("click", () => {
        window.location.href = "/api/audit/export?format=xlsx";
      });
    }

    const expCsvBtn = document.getElementById("audit-btn-export-csv");
    if (expCsvBtn) {
      expCsvBtn.addEventListener("click", () => {
        window.location.href = "/api/audit/export?format=csv";
      });
    }
  }

  window.openAuditTrail = openAuditTrail;
  window.closeAuditTrail = closeAuditTrail;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
