// Breakdown Maintenance (frmBrkDnMaint)
(function () {
  const state = {
    records: [],
    machines: [],
    currentId: 0
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function loadBreakdowns() {
    const from = el("brk-filter-from")?.value;
    const to = el("brk-filter-to")?.value;
    let url = "/api/breakdown";
    if (from && to) url += `?from=${from}&to=${to}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load breakdowns.");
        return;
      }

      state.records = data.records || [];
      state.machines = data.machines || [];

      renderMachines();
      renderTable();
    } catch (err) {
      console.error("loadBreakdowns error:", err);
    }
  }

  function renderMachines() {
    const sel = el("brk-mach");
    if (!sel) return;

    let opts = '<option value="">-- Select Machine --</option>';
    state.machines.forEach(m => {
      opts += `<option value="${m.mach_id}">${escapeHtml(m.mach_name)}</option>`;
    });
    sel.innerHTML = opts;
  }

  function renderTable() {
    const tbody = el("brk-tbody");
    if (!tbody) return;

    if (state.records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #777;">No breakdown records found</td></tr>';
      return;
    }

    let html = "";
    state.records.forEach((r) => {
      const isSel = state.currentId === r.id;
      const bg = isSel ? "#eef3f8" : "#fff";
      html += `<tr class="brk-row" data-id="${r.id}" style="border-bottom: 1px solid #ddd; background: ${bg}; cursor: pointer;">
        <td style="padding: 4px; text-align: center; font-weight: bold;">${r.id}</td>
        <td style="padding: 4px; text-align: center;">${r.brkdate_disp || r.brkdate}</td>
        <td style="padding: 4px;">${escapeHtml(r.mach_name)}</td>
        <td style="padding: 4px;">${escapeHtml(r.brkfrom || "")}</td>
        <td style="padding: 4px;">${escapeHtml(r.brkdet || "")}</td>
        <td style="padding: 4px;">${escapeHtml(r.brkto || "")}</td>
        <td style="padding: 4px;">${escapeHtml(r.detcorrect || "")}</td>
        <td style="padding: 4px; text-align: right;">${Number(r.amt || 0).toFixed(2)}</td>
        <td style="padding: 4px; text-align: center;">${escapeHtml(r.timespent || "")}</td>
      </tr>`;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".brk-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = Number(row.dataset.id);
        selectRecord(id);
      });
    });
  }

  function selectRecord(id) {
    state.currentId = id;
    const r = state.records.find(x => x.id === id);
    if (!r) return;

    if (el("brk-id")) el("brk-id").value = r.id;
    if (el("brk-mach")) el("brk-mach").value = r.machid;
    if (el("brk-date")) el("brk-date").value = r.brkdate;
    if (el("brk-from")) el("brk-from").value = r.brkfrom || "";
    if (el("brk-det")) el("brk-det").value = r.brkdet || "";
    if (el("brk-to")) el("brk-to").value = r.brkto || "";
    if (el("brk-correct")) el("brk-correct").value = r.detcorrect || "";
    if (el("brk-amt")) el("brk-amt").value = Number(r.amt || 0).toFixed(2);
    if (el("brk-timespent")) el("brk-timespent").value = r.timespent || "";

    renderTable();
  }

  function resetForm() {
    state.currentId = 0;
    if (el("brk-id")) el("brk-id").value = "0";
    if (el("brk-mach")) el("brk-mach").value = "";
    if (el("brk-date")) el("brk-date").value = getTodayDate();
    if (el("brk-from")) el("brk-from").value = "";
    if (el("brk-det")) el("brk-det").value = "";
    if (el("brk-to")) el("brk-to").value = "";
    if (el("brk-correct")) el("brk-correct").value = "";
    if (el("brk-amt")) el("brk-amt").value = "0.00";
    if (el("brk-timespent")) el("brk-timespent").value = "";
    renderTable();
  }

  async function handleSave() {
    const machId = Number(el("brk-mach")?.value || 0);
    if (!machId) {
      alert("Please select a machine.");
      return;
    }

    const confirmMsg = state.currentId > 0 ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!confirm(confirmMsg)) return;

    const payload = {
      id: state.currentId,
      machid: machId,
      brkdate: el("brk-date")?.value || getTodayDate(),
      brkfrom: el("brk-from")?.value || "",
      brkdet: el("brk-det")?.value || "",
      brkto: el("brk-to")?.value || "",
      detcorrect: el("brk-correct")?.value || "",
      amt: Number(el("brk-amt")?.value || 0),
      timespent: el("brk-timespent")?.value || ""
    };

    try {
      const res = await fetch("/api/breakdown/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save breakdown record.");
        return;
      }
      alert(data.message || "Records Updated .");
      await loadBreakdowns();
      resetForm();
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.currentId) {
      alert("Please select a breakdown record to delete.");
      return;
    }

    if (!confirm("Are You Sure To Delete ?")) return;

    try {
      const res = await fetch("/api/breakdown/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.currentId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }
      alert(data.message || "Records Deleted");
      await loadBreakdowns();
      resetForm();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting: " + err.message);
    }
  }

  function openBreakdown() {
    const sec = el("breakdown");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    resetForm();
    loadBreakdowns();
  }

  function closeBreakdown() {
    const sec = el("breakdown");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("brk-btn-close-top")?.addEventListener("click", closeBreakdown);
    el("brk-btn-exit")?.addEventListener("click", closeBreakdown);
    el("brk-btn-new")?.addEventListener("click", resetForm);
    el("brk-btn-save")?.addEventListener("click", handleSave);
    el("brk-btn-delete")?.addEventListener("click", handleDelete);
    el("brk-btn-view")?.addEventListener("click", loadBreakdowns);

    window.openBreakdown = openBreakdown;
    window.closeBreakdown = closeBreakdown;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
