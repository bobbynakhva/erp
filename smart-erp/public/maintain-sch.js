// Maintenance Schedule (frmMaintain)
(function () {
  const state = {
    types: [],
    selectedMainId: 1,
    machines: [],
    schedule: []
  };

  const helpMessages = {
    1: "Scheduled Day must be between 1 and 7 (1-Sunday 7-Saturday)",
    2: "Scheduled Day must be between 1 and 13",
    3: "Scheduled Day must be between 1 and 28",
    4: "Scheduled Month must be between 1 and 3 (1-January 3-March)",
    5: "Scheduled Month must be between 1 and 6 (1-January 6-June)",
    6: "Scheduled Month must be between 1 and 12 (1-January 12-December)"
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

  async function loadSchedule(mainId) {
    state.selectedMainId = Number(mainId || state.selectedMainId || 1);
    try {
      const res = await fetch(`/api/maintenance/schedule?mainId=${state.selectedMainId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load maintenance schedule.");
        return;
      }

      state.types = data.types || [];
      state.machines = data.machines || [];
      state.schedule = data.schedule || [];

      renderTypes();
      renderGrid();
    } catch (err) {
      console.error("loadSchedule error:", err);
    }
  }

  function renderTypes() {
    const listDiv = el("maint-type-list");
    if (!listDiv) return;

    let html = "";
    state.types.forEach((t) => {
      const isSel = state.selectedMainId === t.mainid;
      const bg = isSel ? "#003399" : "#fff";
      const color = isSel ? "#fff" : "#000";
      html += `<div class="maint-type-item" data-id="${t.mainid}" style="padding: 5px 8px; font-size: 11px; cursor: pointer; background: ${bg}; color: ${color}; border-bottom: 1px solid #f0f0f0;">
        ${escapeHtml(t.mainname)}
      </div>`;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll(".maint-type-item").forEach((item) => {
      item.addEventListener("click", () => {
        loadSchedule(Number(item.dataset.id));
      });
    });

    // Update help label
    const helpLabel = el("maint-lbl-help");
    if (helpLabel) {
      helpLabel.textContent = helpMessages[state.selectedMainId] || "Scheduled Day";
    }

    // Update table header for Day vs Month
    const thDay = el("maint-th-day");
    if (thDay) {
      thDay.textContent = state.selectedMainId >= 4 ? "Scheduled Month" : "Scheduled Day";
    }
  }

  function renderGrid() {
    const tbody = el("maint-tbody-sch");
    if (!tbody) return;

    if (state.schedule.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 12px; color: #777;">No machines available</td></tr>';
      return;
    }

    let html = "";
    state.schedule.forEach((s, idx) => {
      html += `<tr style="border-bottom: 1px solid #ddd; background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 4px 6px; font-weight: bold; color: #333;">${escapeHtml(s.mach_name)}</td>
        <td style="padding: 4px;">
          <input type="text" class="maint-input-descr" data-idx="${idx}" value="${escapeHtml(s.descr || '')}" style="width: 100%; box-sizing: border-box; padding: 2px 4px; font-size: 11px; border: 1px solid #ccc;" placeholder="Maintenance task description" />
        </td>
        <td style="padding: 4px; text-align: center;">
          <input type="number" class="maint-input-day" data-idx="${idx}" value="${s.schday || 1}" style="width: 65px; text-align: center; box-sizing: border-box; padding: 2px 4px; font-size: 11px; border: 1px solid #ccc;" />
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".maint-input-descr").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.schedule[idx]) state.schedule[idx].descr = e.target.value;
      });
    });

    tbody.querySelectorAll(".maint-input-day").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.schedule[idx]) state.schedule[idx].schday = Number(e.target.value || 1);
      });
    });
  }

  async function handleSave() {
    if (!state.selectedMainId) {
      alert("Select a Maintenance Type ...");
      return;
    }

    try {
      const res = await fetch("/api/maintenance/schedule/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainId: state.selectedMainId,
          rows: state.schedule
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save schedule.");
        return;
      }

      alert(data.message || "Data stored successfully .");
      loadSchedule(state.selectedMainId);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving: " + err.message);
    }
  }

  function openMaintainSch() {
    const sec = el("maintain-sch");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";
    loadSchedule(1);
  }

  function closeMaintainSch() {
    const sec = el("maintain-sch");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("maint-btn-close-top")?.addEventListener("click", closeMaintainSch);
    el("maint-btn-exit")?.addEventListener("click", closeMaintainSch);
    el("maint-btn-save")?.addEventListener("click", handleSave);

    window.openMaintainSch = openMaintainSch;
    window.closeMaintainSch = closeMaintainSch;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
