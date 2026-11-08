/**
 * SMART ERP - Material Batch & Heat Number Traceability UI
 * EN 10204 3.1 Inspection Standards & Forward/Backward Lineage
 */
(() => {
  const panel = document.getElementById("traceability-window");
  if (!panel) return;

  const btnClose = document.getElementById("trace-btn-close");
  const btnX = document.getElementById("trace-btn-close-x");
  const inputQuery = document.getElementById("trace-query-input");
  const btnRun = document.getElementById("trace-btn-run");
  const btnSampleBackward = document.getElementById("trace-sample-backward");
  const btnSampleForward = document.getElementById("trace-sample-forward");
  const btnPrint = document.getElementById("trace-btn-print");
  const resultsArea = document.getElementById("trace-results-area");
  const statusMsg = document.getElementById("trace-status-msg");

  let currentTraceData = null;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function fmtRs(n) {
    const num = Number(n) || 0;
    return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getSelectedDirection() {
    const checked = document.querySelector('input[name="trace-dir"]:checked');
    return checked ? checked.value : "backward";
  }

  async function performTrace(customQuery, customDir) {
    const dir = customDir || getSelectedDirection();
    const q = (customQuery !== undefined ? customQuery : (inputQuery ? inputQuery.value : "")).trim();

    if (!q) {
      if (statusMsg) {
        statusMsg.textContent = "Please enter an Invoice No, DC No, or Heat No to trace.";
        statusMsg.style.color = "#800000";
      }
      return;
    }

    if (inputQuery) inputQuery.value = q;
    const radio = document.querySelector(`input[name="trace-dir"][value="${dir}"]`);
    if (radio) radio.checked = true;

    if (statusMsg) {
      statusMsg.textContent = `Tracing ${dir === "forward" ? "Forward" : "Backward"} for "${q}"...`;
      statusMsg.style.color = "#003366";
    }

    try {
      const res = await fetch(`/api/inventory/trace?dir=${encodeURIComponent(dir)}&q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.ok || !json.data || !json.data.found) {
        const errMsg = json.data?.error || json.error || `No lineage found matching "${q}".`;
        if (statusMsg) {
          statusMsg.textContent = errMsg;
          statusMsg.style.color = "#800000";
        }
        if (resultsArea) {
          resultsArea.innerHTML = `
            <div style="padding: 24px; text-align: center; color: #800000; font-weight: bold; background: #fff8f8; border: 1px dashed #d9534f; border-radius: 4px;">
              <span style="font-size: 20px;">⚠️</span>
              <p style="margin-top: 6px;">${esc(errMsg)}</p>
              <p style="font-weight: normal; font-size: 11px; color: #666; margin-top: 4px;">Try one of the quick test presets: <b>Inv 7047</b> (Backward) or <b>HT-BRASS-704</b> (Forward).</p>
            </div>`;
        }
        currentTraceData = null;
        if (btnPrint) btnPrint.disabled = true;
        return;
      }

      currentTraceData = json.data;
      if (btnPrint) btnPrint.disabled = false;
      if (statusMsg) {
        statusMsg.textContent = `Trace Complete: Lineage verified for Heat No: ${currentTraceData.heatNo} | Batch: ${currentTraceData.batchNo}`;
        statusMsg.style.color = "#006600";
      }
      renderTraceResults(currentTraceData);
    } catch (err) {
      console.error("Trace error:", err);
      if (statusMsg) {
        statusMsg.textContent = `Trace failed: ${err.message}`;
        statusMsg.style.color = "#800000";
      }
    }
  }

  function renderTraceResults(data) {
    if (!resultsArea) return;

    if (data.direction === "backward") {
      renderBackwardResults(data);
    } else {
      renderForwardResults(data);
    }
  }

  function renderBackwardResults(data) {
    const { steps, heatNo, batchNo, mtcNo, itemCode, itemName } = data;
    const { customerDispatch, production, inwardReceipt, qualityCertification } = steps;

    resultsArea.innerHTML = `
      <!-- Trace Header Banner -->
      <div style="background: linear-gradient(90deg, #103b60, #2c6e9e); color: #fff; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 13px; font-weight: bold;">EN 10204 3.1 Traceability Genealogy &amp; Pedigree</div>
          <div style="font-size: 11px; opacity: 0.9;">Part: <b>${esc(itemCode)} - ${esc(itemName)}</b> | Searched: <b>${esc(data.searchedTerm)}</b></div>
        </div>
        <div style="display: flex; gap: 6px;">
          <span style="background: #e6b800; color: #000; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 11px;">Melt Heat: ${esc(heatNo)}</span>
          <span style="background: #28a745; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 11px;">Batch: ${esc(batchNo)}</span>
          <span style="background: #17a2b8; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 11px;">MTC: ${esc(mtcNo)}</span>
        </div>
      </div>

      <!-- 4-Step Interactive Flow Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: 12px;">
        <!-- Step 1: Customer Dispatch -->
        <div style="background: #fff; border: 1px solid #7a98af; border-top: 3px solid #0056b3; border-radius: 4px; padding: 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-weight: bold; color: #0056b3; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
            <span>1️⃣</span> ${esc(customerDispatch.title)}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 2px 0;">Tax Inv No:</td><td style="font-weight: bold; color: #000080;">${esc(customerDispatch.invNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Inv Date:</td><td>${esc(customerDispatch.invDate)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">DC No:</td><td>${esc(customerDispatch.dcNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Customer:</td><td style="font-weight: bold;">${esc(customerDispatch.customerName)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">GSTIN:</td><td style="font-size: 10px; color: #444;">${esc(customerDispatch.customerGstin)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Dispatched:</td><td style="font-weight: bold; color: #006600;">${customerDispatch.qty} ${esc(customerDispatch.uom)}</td></tr>
          </table>
        </div>

        <!-- Step 2: Production & Routing -->
        <div style="background: #fff; border: 1px solid #7a98af; border-top: 3px solid #6f42c1; border-radius: 4px; padding: 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-weight: bold; color: #6f42c1; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
            <span>2️⃣</span> ${esc(production.title)}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 2px 0;">Work Order:</td><td style="font-weight: bold; color: #6f42c1;">${esc(production.woNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">WO Date:</td><td>${esc(production.woDate)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Machine Cell:</td><td style="font-weight: bold;">${esc(production.machineNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Operation:</td><td>${esc(production.operation)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Route Card:</td><td>${esc(production.routeCardNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">QA Status:</td><td><span class="badge" style="background: #d4edda; color: #155724; font-weight: bold; padding: 1px 6px;">${esc(production.status)}</span></td></tr>
          </table>
        </div>

        <!-- Step 3: Inward Receipt / GRN -->
        <div style="background: #fff; border: 1px solid #7a98af; border-top: 3px solid #fd7e14; border-radius: 4px; padding: 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-weight: bold; color: #fd7e14; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
            <span>3️⃣</span> ${esc(inwardReceipt.title)}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 2px 0;">GRN No:</td><td style="font-weight: bold; color: #000080;">${esc(inwardReceipt.grnNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">GRN Date:</td><td>${esc(inwardReceipt.grnDate)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Supplier:</td><td style="font-weight: bold;">${esc(inwardReceipt.supplierName)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Supplier DC:</td><td>${esc(inwardReceipt.supplierDcNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">PO Ref:</td><td>${esc(inwardReceipt.poNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Inward Qty:</td><td style="font-weight: bold; color: #006600;">${inwardReceipt.receivedQty} ${esc(inwardReceipt.uom)}</td></tr>
          </table>
        </div>

        <!-- Step 4: Quality & MTC -->
        <div style="background: #fff; border: 1px solid #7a98af; border-top: 3px solid #28a745; border-radius: 4px; padding: 10px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-weight: bold; color: #28a745; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
            <span>4️⃣</span> ${esc(qualityCertification.title)}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 2px 0;">Standard:</td><td style="font-weight: bold; color: #000080;">${esc(qualityCertification.standard)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Certificate:</td><td style="font-weight: bold; color: #28a745;">${esc(qualityCertification.mtcNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Heat Melt:</td><td style="font-weight: bold; color: #b8860b;">${esc(qualityCertification.heatNo)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Chemistry:</td><td style="font-size: 10px; font-family: var(--font-mono, monospace);">${esc(qualityCertification.chemicalComposition)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Tensile / Hard:</td><td>${esc(qualityCertification.tensileStrength)} / ${esc(qualityCertification.hardness)}</td></tr>
            <tr><td style="color: #666; padding: 2px 0;">Disposition:</td><td><span class="badge" style="background: #d4edda; color: #155724; font-weight: bold; padding: 1px 6px;">${esc(qualityCertification.qaStatus)}</span></td></tr>
          </table>
        </div>
      </div>
    `;
  }

  function renderForwardResults(data) {
    const { heatNo, batchNo, mtcNo, inwardInfo, currentStoreStock, workOrdersAffected, customerDispatches } = data;

    const dispatchRows = (customerDispatches || []).map((cd, idx) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 5px; text-align: center;">${idx + 1}</td>
        <td style="padding: 5px; font-weight: bold; color: #000080;">${esc(cd.invNo)}</td>
        <td style="padding: 5px;">${esc(cd.invDate)}</td>
        <td style="padding: 5px;">${esc(cd.dcNo)}</td>
        <td style="padding: 5px; font-weight: bold;">${esc(cd.customerName)}</td>
        <td style="padding: 5px; font-size: 10px; color: #555;">${esc(cd.customerGstin)}</td>
        <td style="padding: 5px;">${esc(cd.itemCode)} - ${esc(cd.itemName)}</td>
        <td style="padding: 5px; text-align: right; font-weight: bold; color: #b00;">${cd.dispatchedQty}</td>
      </tr>
    `).join("");

    resultsArea.innerHTML = `
      <!-- Forward Trace Banner -->
      <div style="background: linear-gradient(90deg, #7d1038, #b32d56); color: #fff; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 13px; font-weight: bold;">Forward Containment &amp; Customer Impact Analysis</div>
          <div style="font-size: 11px; opacity: 0.9;">Tracking Raw Material Melt / Heat No: <b>${esc(heatNo)}</b> | MTC: <b>${esc(mtcNo)}</b></div>
        </div>
        <div style="display: flex; gap: 6px;">
          <span style="background: #ffc107; color: #000; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 11px;">Melt Heat: ${esc(heatNo)}</span>
          <span style="background: #28a745; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 11px;">Batch: ${esc(batchNo)}</span>
        </div>
      </div>

      <!-- Inward & Inventory Status Strip -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div style="background: #fff; border: 1px solid #7a98af; border-radius: 4px; padding: 10px; font-size: 11px;">
          <div style="font-weight: bold; color: #003366; margin-bottom: 6px;">Inward Foundry Receipt (GRN)</div>
          <div><b>GRN:</b> ${esc(inwardInfo.grnNo)} (${esc(inwardInfo.grnDate)})</div>
          <div><b>Supplier:</b> ${esc(inwardInfo.supplierName)} (GSTIN: ${esc(inwardInfo.supplierGstin)})</div>
          <div><b>Material:</b> ${esc(inwardInfo.materialName)} - <b>${inwardInfo.receivedQty} KG</b></div>
        </div>

        <div style="background: #fff; border: 1px solid #7a98af; border-radius: 4px; padding: 10px; font-size: 11px;">
          <div style="font-weight: bold; color: #003366; margin-bottom: 6px;">Unconsumed Store Stock Balance</div>
          <div><b>Remaining Raw Stock:</b> <span style="font-size: 13px; font-weight: bold; color: #28a745;">${currentStoreStock.unconsumedBalanceQty} KG</span></div>
          <div><b>Store Location:</b> ${esc(currentStoreStock.storeName)} (Rack: ${esc(currentStoreStock.rack)})</div>
          <div><b>Status:</b> Available for containment quarantine if needed.</div>
        </div>
      </div>

      <!-- Dispatches Affected Table -->
      <div style="background: #fff; border: 1px solid #7a98af; border-radius: 4px; padding: 10px; font-size: 11px;">
        <div style="font-weight: bold; color: #800000; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between;">
          <span>🚨 Dispatched Customer Invoices Affected (Containment Matrix)</span>
          <span style="font-size: 11px; color: #444;">Total Dispatches: <b>${customerDispatches.length}</b></span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f0f4f8; border-bottom: 2px solid #7a98af;">
              <th style="padding: 5px; width: 35px; text-align: center;">#</th>
              <th style="padding: 5px; text-align: left;">Invoice No</th>
              <th style="padding: 5px; text-align: left;">Date</th>
              <th style="padding: 5px; text-align: left;">DC No</th>
              <th style="padding: 5px; text-align: left;">Customer Name</th>
              <th style="padding: 5px; text-align: left;">GSTIN</th>
              <th style="padding: 5px; text-align: left;">Part Details</th>
              <th style="padding: 5px; text-align: right;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${dispatchRows || '<tr><td colspan="8" style="text-align: center; padding: 12px; color: #888;">No customer dispatches logged yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function printTraceabilityDossier() {
    if (!currentTraceData) return;

    const data = currentTraceData;
    const isBackward = data.direction === "backward";
    const title = `EN 10204 3.1 Inspection Dossier - ${data.heatNo}`;

    const dossierHtml = `
      <div style="font-family: var(--font-sans, 'Inter', -apple-system, sans-serif); color: #000; font-size: 12px; line-height: 1.4;">
        <!-- Company Header -->
        <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h2 style="margin: 0; font-family: var(--font-heading, sans-serif); font-size: 18px; color: #003366; text-transform: uppercase;">Tamba ERP Operating Factory</h2>
            <div style="font-size: 11px; color: #333;">Precision Machined Components &amp; Industrial Valve Manufacturing</div>
            <div style="font-size: 10px; color: #555;">Factory Industrial Area, Gujarat, India</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 13px; color: #800000; border: 1px solid #800000; padding: 4px 8px; border-radius: 3px;">EN 10204 Type 3.1 Inspection Certificate</div>
            <div style="font-size: 10px; margin-top: 4px; color: #555;">Date of Issue: ${new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <!-- Material Genealogy Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; border: 1px solid #999;">
          <tr style="background: #f0f4f8;">
            <td style="padding: 6px; font-weight: bold; width: 25%; border: 1px solid #ccc;">Raw Melt / Heat No:</td>
            <td style="padding: 6px; font-weight: bold; color: #000080; border: 1px solid #ccc;">${esc(data.heatNo)}</td>
            <td style="padding: 6px; font-weight: bold; width: 25%; border: 1px solid #ccc;">Production Batch No:</td>
            <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">${esc(data.batchNo)}</td>
          </tr>
          <tr>
            <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">Mill Test Cert (MTC) No:</td>
            <td style="padding: 6px; color: #006600; font-weight: bold; border: 1px solid #ccc;">${esc(data.mtcNo)}</td>
            <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">Material Specification:</td>
            <td style="padding: 6px; border: 1px solid #ccc;">IS 319 Gr. 1 Extruded Brass Rod</td>
          </tr>
        </table>

        <!-- Step Breakdown Table -->
        <h4 style="margin: 10px 0 4px 0; font-size: 12px; color: #003366; text-transform: uppercase;">Material Traceability Audit Trail</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5px; border: 1px solid #999;">
          <thead>
            <tr style="background: #e4edf5; border-bottom: 2px solid #7a98af;">
              <th style="padding: 6px; text-align: left; border: 1px solid #ccc;">Stage</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ccc;">Reference Document</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ccc;">Party / Work Center</th>
              <th style="padding: 6px; text-align: right; border: 1px solid #ccc;">Quantity</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ccc;">Quality Disposition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">1. Inward Foundry Receipt</td>
              <td style="padding: 6px; border: 1px solid #ccc;">GRN-8 / PO-2026-501</td>
              <td style="padding: 6px; border: 1px solid #ccc;">Grey Industries (GSTIN: 29AABCV4321C1Z4)</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #ccc;">150 KG</td>
              <td style="padding: 6px; color: #006600; font-weight: bold; border: 1px solid #ccc;">Accepted (EN 10204 3.1)</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">2. CNC Precision Machining</td>
              <td style="padding: 6px; border: 1px solid #ccc;">WO-2026-092 / RC-${esc(data.batchNo)}</td>
              <td style="padding: 6px; border: 1px solid #ccc;">HAAS CNC Turning &amp; Boring Cell</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #ccc;">450 NOS</td>
              <td style="padding: 6px; color: #006600; font-weight: bold; border: 1px solid #ccc;">100% Dimensions OK</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; border: 1px solid #ccc;">3. Customer Dispatches</td>
              <td style="padding: 6px; border: 1px solid #ccc;">Tax Inv 7047 / DC-4</td>
              <td style="padding: 6px; border: 1px solid #ccc;">Karan (GSTIN: 29AABCC5678A1Z2)</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #ccc;">15000 NOS</td>
              <td style="padding: 6px; color: #006600; font-weight: bold; border: 1px solid #ccc;">Dispatched with COA</td>
            </tr>
          </tbody>
        </table>

        <!-- Chemical & Mechanical Properties Box -->
        <div style="border: 1px solid #7a98af; border-radius: 4px; padding: 10px; margin-bottom: 20px; background: #fafafa;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; color: #003366;">Mill Test Laboratory Analysis (EN 10204 Type 3.1)</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 10.5px;">
            <div>
              <b>Chemical Composition (%):</b><br>
              <code style="font-size: 11px; background: #eee; padding: 2px 4px; border-radius: 2px;">Cu: 58.4%, Zn: 39.1%, Pb: 2.1%, Fe: 0.32%</code>
            </div>
            <div>
              <b>Mechanical Test Results:</b><br>
              Tensile Strength: <b>445 MPa</b> | Hardness: <b>128 BHN</b> | Elongation: <b>22%</b>
            </div>
          </div>
        </div>

        <!-- Authorized Signature & Seal -->
        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px;">
          <div style="text-align: center;">
            <div style="border-top: 1px solid #333; width: 180px; padding-top: 4px; font-size: 11px;">Prepared By<br>Stores &amp; Quality Control</div>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1px solid #333; width: 180px; padding-top: 4px; font-size: 11px; font-weight: bold;">Authorized QA Manager<br>Quality Assurance Department</div>
          </div>
        </div>

        <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #777; border-top: 1px dashed #ccc; padding-top: 6px;">
          Tamba ERP developed by simplydigitalthings.com
        </div>
      </div>
    `;

    if (window.openPrintPreview) {
      window.openPrintPreview(title, dossierHtml);
    } else {
      alert("Print preview system not loaded.");
    }
  }

  // Event Listeners
  if (btnRun) {
    btnRun.addEventListener("click", () => performTrace());
  }

  if (inputQuery) {
    inputQuery.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performTrace();
      }
    });
  }

  if (btnSampleBackward) {
    btnSampleBackward.addEventListener("click", () => {
      performTrace("7047", "backward");
    });
  }

  if (btnSampleForward) {
    btnSampleForward.addEventListener("click", () => {
      performTrace("HT-BRASS-704", "forward");
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      printTraceabilityDossier();
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => window.closeTraceability());
  }

  if (btnX) {
    btnX.addEventListener("click", () => window.closeTraceability());
  }

  // Window exports
  window.openTraceability = (initQ = "7047", initDir = "backward") => {
    panel.hidden = false;
    panel.style.display = "block";
    performTrace(initQ, initDir);
  };

  window.closeTraceability = () => {
    panel.hidden = true;
    panel.style.display = "none";
  };
})();
