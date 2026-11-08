(() => {
  const panel = document.querySelector("#corres");
  const list = document.querySelector("#corres-list");
  const info = document.querySelector("#info");
  const infoTitle = document.querySelector("#info-title");
  const infoText = document.querySelector("#info-text");
  const ask = document.querySelector("#ask");
  const askTitle = document.querySelector("#ask-title");
  const askText = document.querySelector("#ask-text");
  let current = null;
  let rows = [];
  let picked = null;
  let file = null;

  function showInfo(message) {
    return new Promise((resolve) => {
      infoTitle.textContent = document.title || "Tamba ERP";
      infoText.textContent = message;
      info.hidden = false;
      const ok = document.querySelector("#info-ok");
      function done() {
        ok.removeEventListener("click", done);
        info.hidden = true;
        resolve();
      }
      ok.addEventListener("click", done);
      ok.focus();
    });
  }

  function askYes(message) {
    return new Promise((resolve) => {
      askTitle.textContent = document.title || "Tamba ERP";
      askText.textContent = message;
      ask.hidden = false;
      const yes = document.querySelector("#ask-yes");
      const no = document.querySelector("#ask-no");
      function finish(value) {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        ask.hidden = true;
        resolve(value);
      }
      function onYes() { finish(true); }
      function onNo() { finish(false); }
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      yes.focus();
    });
  }

  function paint() {
    list.innerHTML = rows.map((row) => `<button type="button" data-id="${row.id}" class="${picked && picked.id === row.id ? "on" : ""}">${row.name}</button>`).join("");
  }

  async function load() {
    const response = await fetch(`/api/corres?cat=${encodeURIComponent(current.cat)}&key=${encodeURIComponent(current.key)}`);
    const data = await response.json();
    rows = data.rows || [];
    if (picked) picked = rows.find((row) => row.id === picked.id) || null;
    document.querySelector("#corres-for").textContent = data.caption || "";
    paint();
    if (current.onChange) current.onChange();
  }

  window.corresCaption = async function corresCaption(cat, key) {
    const response = await fetch(`/api/corres?cat=${encodeURIComponent(cat)}&key=${encodeURIComponent(key)}`);
    if (!response.ok) return "Correspondences";
    const data = await response.json();
    return data.caption || "Correspondences";
  };

  window.openCorres = function openCorres(options) {
    current = options;
    picked = null;
    file = null;
    document.querySelector("#corres-name").value = "";
    document.querySelector("#corres-subject").value = "";
    panel.hidden = false;
    load();
  };

  window.closeCorres = function closeCorres() {
    panel.hidden = true;
  };

  document.querySelector("#corres-choose").addEventListener("click", () => document.querySelector("#corres-file").click());
  document.querySelector("#corres-file").addEventListener("change", () => {
    file = document.querySelector("#corres-file").files[0] || null;
    document.querySelector("#corres-name").value = file ? file.name : "";
    picked = null;
    paint();
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    picked = rows.find((row) => row.id === Number(button.dataset.id)) || null;
    file = null;
    document.querySelector("#corres-name").value = picked ? picked.name : "";
    document.querySelector("#corres-subject").value = picked ? picked.subject : "";
    paint();
  });
  document.querySelector("#corres-save").addEventListener("click", async () => {
    if (!file) return showInfo("Choose a file first.");
    if (!(await askYes("Are You Sure To Save this Record ?"))) return;
    const data = await file.arrayBuffer();
    const bytes = new Uint8Array(data);
    let raw = "";
    const step = 0x8000;
    for (let index = 0; index < bytes.length; index += step) raw += String.fromCharCode(...bytes.subarray(index, index + step));
    const response = await fetch("/api/corres/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cat: current.cat,
        key: current.key,
        name: file.name,
        subject: document.querySelector("#corres-subject").value,
        data: btoa(raw)
      })
    });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    file = null;
    document.querySelector("#corres-file").value = "";
    await load();
    await showInfo("Record Saved");
  });
  document.querySelector("#corres-open").addEventListener("click", () => {
    if (!picked) return;
    window.open(`/api/corres/file?id=${picked.id}`, "_blank");
  });
  document.querySelector("#corres-delete").addEventListener("click", async () => {
    if (!picked) return;
    if (!(await askYes("Are You Sure To Delete ?"))) return;
    const response = await fetch("/api/corres/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: picked.id })
    });
    const result = await response.json();
    if (result.error) return showInfo(result.error);
    picked = null;
    document.querySelector("#corres-name").value = "";
    document.querySelector("#corres-subject").value = "";
    await load();
    await showInfo("Record Deleted Successfully");
  });
  document.querySelector("#corres-close").addEventListener("click", () => window.closeCorres());
})();
