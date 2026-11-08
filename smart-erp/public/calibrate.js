// Calibration (frmCalibrate)
(function () {
  const state = {
    instruments: [],
    selectedId: 0,
    selectedRecord: null,
    reports: [],
    dueOnly: false
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

  async function loadInstruments(due = false) {
    state.dueOnly = due;
    let url = "/api/calibrate";
    if (due) url += "?due=true";

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load calibration instruments.");
        return;
      }
      state.instruments = data.instruments || [];
      renderInstruments();
      if (state.instruments.length > 0 && !state.selectedId) {
        selectInstrument(state.instruments[0].id);
      }
    } catch (err) {
      console.error("loadInstruments error:", err);
    }
  }

  async function selectInstrument(id) {
    state.selectedId = id;
    renderInstruments();

    try {
      const res = await fetch(`/api/calibrate?id=${id}`);
      const data = await res.json();
      if (!res.ok) return;

      state.selectedRecord = data.selected;
      state.reports = data.reports || [];

      if (state.selectedRecord) {
        const r = state.selectedRecord;
        if (el("cal-id")) el("cal-id").value = r.id;
        if (el("cal-itemid")) el("cal-itemid").value = r.itemid || "";
        if (el("cal-insgaugeid")) el("cal-insgaugeid").value = r.insgaugeid || "";
        if (el("cal-range")) el("cal-range").value = r.range || "";
        if (el("cal-lc")) el("cal-lc").value = r.lc || "";
        if (el("cal-freq")) el("cal-freq").value = r.freq || 12;
        if (el("cal-next")) el("cal-next").value = r.nextcalibrate ? String(r.nextcalibrate).slice(0, 10) : "";
        if (el("cal-other")) el("cal-other").value = r.otherdet || "";
      }

      renderReports();
    } catch (err) {
      console.error("selectInstrument error:", err);
    }
  }

  function renderInstruments() {
    const tbody = el("cal-tbody-inst");
    if (!tbody) return;

    if (state.instruments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 12px; color: #777;">No instruments registered</td></tr>';
      return;
    }

    let html = "";
    state.instruments.forEach((r) => {
      const isSel = state.selectedId === r.id;
      const bg = isSel ? "#eef3f8" : "#fff";
      html += `<tr class="cal-inst-row" data-id="${r.id}" style="border-bottom: 1px solid #ddd; background: ${bg}; cursor: pointer;">
        <td style="padding: 4px; text-align: center; font-weight: bold;">${r.id}</td>
        <td style="padding: 4px; font-weight: bold;">${escapeHtml(r.itemid)}</td>
        <td style="padding: 4px;">${escapeHtml(r.insgaugeid)}</td>
        <td style="padding: 4px;">${escapeHtml(r.range || "")}</td>
        <td style="padding: 4px;">${escapeHtml(r.lc || "")}</td>
        <td style="padding: 4px; text-align: center;">${r.freq || 12}m</td>
        <td style="padding: 4px; text-align: center; color: #b00; font-weight: bold;">${r.nextcalibrate_disp || r.nextcalibrate || "-"}</td>
      </tr>`;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".cal-inst-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = Number(row.dataset.id);
        selectInstrument(id);
      });
    });
  }

  function renderReports() {
    const tbody = el("cal-tbody-rep");
    if (!tbody) return;

    if (state.reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 8px; color: #777;">No calibration certificates recorded</td></tr>';
      return;
    }

    let html = "";
    state.reports.forEach((rep) => {
      html += `<tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 3px 6px; text-align: center;">${rep.calibrepid}</td>
        <td style="padding: 3px 6px; text-align: center;">${rep.docalibrate_disp || rep.docalibrate}</td>
        <td style="padding: 3px 6px; font-weight: bold;">${escapeHtml(rep.calibrateno || "")}</td>
        <td style="padding: 3px 6px; text-align: center;">${escapeHtml(rep.calibratestat || "")}</td>
        <td style="padding: 3px 6px;">${escapeHtml(rep.authorised || "")}</td>
        <td style="padding: 3px 6px;">${escapeHtml(rep.calibratedet || "")}</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  function resetForm() {
    state.selectedId = 0;
    state.selectedRecord = null;
    state.reports = [];
    if (el("cal-id")) el("cal-id").value = "0";
    if (el("cal-itemid")) el("cal-itemid").value = "";
    if (el("cal-insgaugeid")) el("cal-insgaugeid").value = "";
    if (el("cal-range")) el("cal-range").value = "";
    if (el("cal-lc")) el("cal-lc").value = "";
    if (el("cal-freq")) el("cal-freq").value = "12";
    if (el("cal-next")) el("cal-next").value = "";
    if (el("cal-other")) el("cal-other").value = "";
    renderReports();
    renderInstruments();
  }

  async function handleSave() {
    const itemId = String(el("cal-itemid")?.value || "").trim();
    const insGaugeId = String(el("cal-insgaugeid")?.value || "").trim();
    if (!itemId || !insGaugeId) {
      alert("Gauge / Instrument name and Unique ID are required.");
      return;
    }

    const confirmMsg = state.selectedId > 0 ? "Are You Sure To Modify ?" : "Are You Sure To Save ?";
    if (!confirm(confirmMsg)) return;

    const payload = {
      id: state.selectedId,
      itemid: itemId,
      insgaugeid: insGaugeId,
      freq: Number(el("cal-freq")?.value || 12),
      range: el("cal-range")?.value || "",
      lc: el("cal-lc")?.value || "",
      nextcalibrate: el("cal-next")?.value || null,
      otherdet: el("cal-other")?.value || ""
    };

    try {
      const res = await fetch("/api/calibrate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save record.");
        return;
      }
      alert(data.message || "Records Updated .");
      await loadInstruments();
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving: " + err.message);
    }
  }

  async function handleDelete() {
    if (!state.selectedId) {
      alert("Please select an instrument to delete.");
      return;
    }

    if (!confirm("Are You Sure To Delete ?")) return;

    try {
      const res = await fetch("/api/calibrate/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.selectedId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete record.");
        return;
      }
      alert(data.message || "Records Deleted");
      resetForm();
      await loadInstruments();
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Error deleting: " + err.message);
    }
  }

  async function handleSaveReport() {
    if (!state.selectedId) {
      alert("Select an instrument first.");
      return;
    }

    const payload = {
      id: state.selectedId,
      docalibrate: el("cal-rep-date")?.value || getTodayDate(),
      calibrateno: el("cal-rep-no")?.value || "",
      calibratestat: el("cal-rep-stat")?.value || "Accepted",
      authorised: el("cal-rep-auth")?.value || "",
      calibratedet: el("cal-rep-det")?.value || ""
    };

    try {
      const res = await fetch("/api/calibrate/report/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save report.");
        return;
      }
      alert(data.message || "Records Updated .");
      el("cal-rep-form").style.display = "none";
      await selectInstrument(state.selectedId);
      await loadInstruments();
    } catch (err) {
      console.error("handleSaveReport error:", err);
      alert("Error saving report: " + err.message);
    }
  }

  function openCalibrate() {
    const sec = el("calibrate");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    resetForm();
    loadInstruments();
  }

  function closeCalibrate() {
    const sec = el("calibrate");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("cal-btn-close-top")?.addEventListener("click", closeCalibrate);
    el("cal-btn-exit")?.addEventListener("click", closeCalibrate);
    el("cal-btn-new")?.addEventListener("click", resetForm);
    el("cal-btn-save")?.addEventListener("click", handleSave);
    el("cal-btn-delete")?.addEventListener("click", handleDelete);
    el("cal-btn-due")?.addEventListener("click", () => loadInstruments(true));
    el("cal-btn-view-all")?.addEventListener("click", () => loadInstruments(false));

    el("cal-btn-add-rep")?.addEventListener("click", () => {
      const f = el("cal-rep-form");
      if (f) {
        f.style.display = f.style.display === "none" ? "grid" : "none";
        if (el("cal-rep-date")) el("cal-rep-date").value = getTodayDate();
      }
    });

    el("cal-btn-save-rep")?.addEventListener("click", handleSaveReport);

    window.openCalibrate = openCalibrate;
    window.closeCalibrate = closeCalibrate;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
