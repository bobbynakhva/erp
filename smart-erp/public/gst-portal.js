(() => {
  let currentDoc = null; // { docType, docNo, docDate, custName, custGstin, posState, taxableAmt, totVal, vehicleNo, transporter }

  const dom = {
    modal: document.getElementById("gst-portal-modal"),
    btnX: document.getElementById("gpm-btn-close-x"),
    btnCancel: document.getElementById("gpm-btn-cancel"),
    btnDlEway: document.getElementById("gpm-btn-dl-eway"),
    btnDlEinv: document.getElementById("gpm-btn-dl-einv"),
    statusMsg: document.getElementById("gpm-status-msg"),

    docType: document.getElementById("gpm-doc-type"),
    docNo: document.getElementById("gpm-doc-no"),
    docDate: document.getElementById("gpm-doc-date"),
    custName: document.getElementById("gpm-cust-name"),
    custGstin: document.getElementById("gpm-cust-gstin"),
    pos: document.getElementById("gpm-pos"),
    taxableAmt: document.getElementById("gpm-taxable-amt"),
    totVal: document.getElementById("gpm-tot-val"),

    transDistance: document.getElementById("gpm-trans-distance"),
    transMode: document.getElementById("gpm-trans-mode"),
    vehicleNo: document.getElementById("gpm-vehicle-no"),
    transName: document.getElementById("gpm-trans-name"),
    transId: document.getElementById("gpm-trans-id"),
    transDocNo: document.getElementById("gpm-trans-doc-no"),
    transDocDate: document.getElementById("gpm-trans-doc-date")
  };

  function fmt2(val) {
    return Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showStatus(text, isError) {
    if (!dom.statusMsg) return;
    dom.statusMsg.style.display = "block";
    dom.statusMsg.style.background = isError ? "#fde8e8" : "#e6f4ea";
    dom.statusMsg.style.color = isError ? "#c5221f" : "#137333";
    dom.statusMsg.style.border = isError ? "1px solid #f5c2c7" : "1px solid #b7e1cd";
    dom.statusMsg.textContent = text;
  }

  function hideStatus() {
    if (dom.statusMsg) dom.statusMsg.style.display = "none";
  }

  function openGstPortalModal(doc) {
    currentDoc = doc;
    hideStatus();

    const typeLabel = doc.docType === "mfg"
      ? "Manufacturing Invoice"
      : (doc.docType === "labour" ? "Labour Invoice (Job Work)" : "Delivery Challan");

    dom.docType.textContent = typeLabel;
    dom.docNo.textContent = doc.docNo || "";
    dom.docDate.textContent = doc.docDate || "";
    dom.custName.textContent = doc.custName || "Customer";
    dom.custGstin.textContent = doc.custGstin || "URP (Unregistered)";
    dom.pos.textContent = doc.posState ? `State Code ${doc.posState}` : "Intra-State";
    dom.taxableAmt.textContent = `₹ ${fmt2(doc.taxableAmt)}`;
    dom.totVal.textContent = `₹ ${fmt2(doc.totVal)}`;

    dom.transDistance.value = doc.distance || "50";
    dom.transMode.value = doc.transMode || "1";
    dom.vehicleNo.value = (doc.vehicleNo || "").toUpperCase();
    dom.transName.value = doc.transporter || "";
    dom.transId.value = doc.transporterId || "";
    dom.transDocNo.value = doc.lrNo || "";
    dom.transDocDate.value = doc.lrDate || "";

    // If DC, E-Invoice is not applicable (E-Invoice is strictly for Tax Invoices)
    if (doc.docType === "dc") {
      dom.btnDlEinv.style.display = "none";
    } else {
      dom.btnDlEinv.style.display = "inline-block";
    }

    dom.modal.hidden = false;
    dom.modal.style.display = "flex";
  }

  function closeGstPortalModal() {
    dom.modal.hidden = true;
    dom.modal.style.display = "none";
    currentDoc = null;
  }

  async function downloadJson(format) {
    if (!currentDoc || !currentDoc.docNo) return;
    hideStatus();

    const dist = Number(dom.transDistance.value || 0);
    if (!(dist > 0)) {
      showStatus("Please enter a valid transport distance in KM (Mandatory for E-Way Bill).", true);
      return;
    }

    const payload = {
      docType: currentDoc.docType,
      docNo: currentDoc.docNo,
      format,
      transDistance: dist,
      transMode: dom.transMode.value,
      vehicleNo: dom.vehicleNo.value.trim().toUpperCase(),
      transporterName: dom.transName.value.trim(),
      transporterId: dom.transId.value.trim().toUpperCase(),
      transDocNo: dom.transDocNo.value.trim(),
      transDocDate: dom.transDocDate.value
    };

    try {
      const res = await fetch("/api/gst/generate-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) {
        showStatus(data.error || "Failed to generate JSON", true);
        return;
      }

      // Trigger client-side file download
      const jsonStr = JSON.stringify(data.json, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `export_${format}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const label = format === "eway" ? "E-Way Bill JSON" : "E-Invoice JSON";
      showStatus(`✓ ${label} downloaded successfully (${data.filename}). Ready for direct upload to GST Portal!`, false);
    } catch (err) {
      showStatus("Error generating export: " + err.message, true);
    }
  }

  // Bindings
  dom.btnX.addEventListener("click", closeGstPortalModal);
  dom.btnCancel.addEventListener("click", closeGstPortalModal);
  dom.btnDlEway.addEventListener("click", () => downloadJson("eway"));
  dom.btnDlEinv.addEventListener("click", () => downloadJson("einvoice"));

  window.openGstPortalModal = openGstPortalModal;
  window.closeGstPortalModal = closeGstPortalModal;
})();
