// Maintenance Process (frmMaintainPro)
(function () {
  const state = {
    date: getTodayDate(),
    matrix: []
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

  async function loadProcess(targetDate) {
    state.date = targetDate || state.date || getTodayDate();
    if (el("mpro-date")) el("mpro-date").value = state.date;

    try {
      const res = await fetch(`/api/maintenance/process?date=${state.date}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load maintenance process.");
        return;
      }
      state.matrix = data.matrix || [];
      renderMatrix();
    } catch (err) {
      console.error("loadProcess error:", err);
    }
  }

  function renderMatrix() {
    const tbody = el("mpro-tbody");
    if (!tbody) return;

    if (state.matrix.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 12px; color: #777;">No machines available</td></tr>';
      return;
    }

    let html = "";
    state.matrix.forEach((m, idx) => {
      html += `<tr style="border-bottom: 1px solid #ddd; background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 4px 6px; font-weight: bold; color: #333; border-right: 1px solid #ddd;">${escapeHtml(m.mach_name)}</td>
        ${[1, 2, 3, 4, 5, 6].map(num => {
          const descr = m[`m${num}_descr`] || "(No Task)";
          const checked = m[`m${num}_status`] ? "checked" : "";
          return `<td style="padding: 4px; text-align: center; border-right: 1px solid #ddd;" title="${escapeHtml(descr)}">
            <input type="checkbox" class="mpro-chk" data-idx="${idx}" data-num="${num}" ${checked} />
          </td>`;
        }).join("")}
      </tr>`;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".mpro-chk").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        const num = Number(e.target.dataset.num);
        if (state.matrix[idx]) {
          state.matrix[idx][`m${num}_status`] = e.target.checked;
        }
      });
    });
  }

  async function handleSave() {
    try {
      const res = await fetch("/api/maintenance/process/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: state.date,
          matrix: state.matrix
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save maintenance process.");
        return;
      }
      alert(data.message || "Data stored successfully .");
      loadProcess(state.date);
    } catch (err) {
      console.error("handleSave error:", err);
      alert("Error saving: " + err.message);
    }
  }

  function openMaintainPro() {
    const sec = el("maintain-pro");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";
    loadProcess();
  }

  function closeMaintainPro() {
    const sec = el("maintain-pro");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("mpro-btn-close-top")?.addEventListener("click", closeMaintainPro);
    el("mpro-btn-exit")?.addEventListener("click", closeMaintainPro);
    el("mpro-btn-save")?.addEventListener("click", handleSave);

    el("mpro-date")?.addEventListener("change", (e) => {
      loadProcess(e.target.value);
    });

    window.openMaintainPro = openMaintainPro;
    window.closeMaintainPro = closeMaintainPro;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
