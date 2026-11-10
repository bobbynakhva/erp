(function () {
  "use strict";

  const API = "/api/onboarding";
  const FIELDS = [
    "companyName", "address", "phone", "email", "gstRegistered", "gstin", "pan",
    "stateCode", "prefixQuote", "prefixPo", "prefixWo", "prefixEnq", "bookType", "bookTypeInv"
  ];
  const STEPS = ["Company", "Tax identity", "Preferences", "Review"];
  const DEFAULT_DRAFT = {
    companyName: "", address: "", phone: "", email: "", gstRegistered: false,
    gstin: "", pan: "", stateCode: "", prefixQuote: "", prefixPo: "", prefixWo: "",
    prefixEnq: "", bookType: "", bookTypeInv: ""
  };
  let status = null;
  let dialog = null;
  let toast = null;
  let trigger = null;
  let isPending = false;
  let fieldsErrors = {};
  let generalError = "";
  let conflict = false;
  let confirmed = false;

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function button(label, className, action) {
    const el = node("button", className, label);
    el.type = "button";
    el.addEventListener("click", action);
    return el;
  }

  function normalizeDraft(incoming) {
    const result = Object.assign({}, DEFAULT_DRAFT);
    if (incoming && typeof incoming === "object") {
      FIELDS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(incoming, key)) {
          result[key] = incoming[key] === null ? "" : incoming[key];
        }
      });
    }
    result.gstRegistered = result.gstRegistered === true || result.gstRegistered === "true";
    return result;
  }

  function readForm() {
    if (!dialog) return;
    FIELDS.forEach((name) => {
      const field = dialog.querySelector('[name="' + name + '"]');
      if (!field) return;
      if (field.type === "radio") {
        const selected = dialog.querySelector('[name="' + name + '"]:checked');
        if (selected) status.draft[name] = name === "gstRegistered" ? selected.value === "true" : selected.value;
      } else {
        status.draft[name] = field.value;
      }
    });
  }

  async function request(method, body) {
    const options = { method, credentials: "include", headers: { Accept: "application/json" } };
    if (body) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    const response = await fetch(API, options);
    let data = {};
    try { data = await response.json(); } catch (error) { data = {}; }
    if (!response.ok) {
      const failure = new Error(typeof data.error === "string" ? data.error : "The setup request could not be completed.");
      failure.status = response.status;
      failure.fields = data.fields && typeof data.fields === "object" ? data.fields : {};
      throw failure;
    }
    return data;
  }

  function showToast(title, message, actionLabel, action) {
    if (toast) toast.remove();
    toast = node("section", "ob-toast");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.append(node("strong", "", title));
    toast.append(node("p", "", message));
    if (actionLabel && action) toast.append(button(actionLabel, "", action));
    document.body.append(toast);
    if (!actionLabel) {
      window.setTimeout(() => {
        if (toast && toast.isConnected) toast.remove();
        toast = null;
      }, 6500);
    }
  }

  function clearToast() {
    if (toast) toast.remove();
    toast = null;
  }

  function findTopbar() {
    return document.querySelector(".topbar") || document.querySelector("#main-window .main-bar");
  }

  function removeTrigger() {
    const existing = document.querySelector("#manufacturer-setup-trigger");
    if (existing) existing.remove();
    trigger = null;
  }

  function ensureTrigger() {
    if (!status || status.canManage !== true || status.completed === true) {
      removeTrigger();
      return;
    }
    if (document.querySelector("#manufacturer-setup-trigger")) return;
    const bar = findTopbar();
    if (!bar) return;
    trigger = button("Company setup", "ob-top-button", openFromTrigger);
    trigger.id = "manufacturer-setup-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    const actionCluster = bar.querySelector(":scope > div:last-child");
    if (actionCluster) actionCluster.insertBefore(trigger, actionCluster.firstChild);
    else bar.append(trigger);
  }

  function applyStatus(data) {
    status = Object.assign({}, data);
    status.step = Number.isInteger(Number(data.step)) ? Math.max(0, Math.min(3, Number(data.step))) : 0;
    status.draft = normalizeDraft(data.draft);
    status.version = Number.isInteger(Number(data.version)) ? Number(data.version) : 0;
    status.states = data.states && typeof data.states === "object" ? data.states : {};
    ensureTrigger();
  }

  function titleForCompany(name) {
    const factory = String(name || "").trim();
    document.title = factory ? factory + " · Tamba ERP" : "Tamba ERP";
  }

  function currentFocusables() {
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((el) => el.offsetParent !== null);
  }

  function focusFirst() {
    if (!dialog) return;
    const target = dialog.querySelector("[data-autofocus]") || currentFocusables()[0];
    if (target) target.focus();
  }

  function closeWizard() {
    if (!dialog) return;
    const activeDialog = dialog;
    dialog = null;
    activeDialog.remove();
    document.body.classList.remove("ob-dialog-open");
    if (trigger && trigger.isConnected) trigger.focus();
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "manufacturer-onboarding-dialog";
    dialog.className = "tamba-onboarding";
    dialog.setAttribute("aria-labelledby", "ob-heading");
    dialog.setAttribute("aria-describedby", "ob-description");
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusables = currentFocusables();
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.body.append(dialog);
    return dialog;
  }

  function addField(parent, labelText, name, options) {
    const config = options || {};
    const wrapper = node("label", "ob-field" + (config.wide ? " is-wide" : ""));
    const label = node("span", "ob-label");
    label.append(node("span", "", labelText));
    if (config.required) label.append(node("span", "ob-required", "Required"));
    wrapper.append(label);
    let input;
    if (config.type === "textarea") {
      input = node("textarea", "ob-textarea");
      input.rows = config.rows || 3;
    } else if (config.type === "select") {
      input = node("select", "ob-select");
      const placeholder = node("option", "", config.placeholder || "Choose a state");
      placeholder.value = "";
      input.append(placeholder);
      const states = status.states || {};
      Object.keys(states).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach((code) => {
        const option = node("option", "", String(states[code]));
        option.value = code;
        input.append(option);
      });
    } else {
      input = node("input", "ob-input");
      input.type = config.type || "text";
      if (config.maxLength) input.maxLength = config.maxLength;
      if (config.autocomplete) input.autocomplete = config.autocomplete;
      if (config.inputmode) input.inputMode = config.inputmode;
    }
    input.name = name;
    input.id = "ob-field-" + name;
    input.value = String(status.draft[name] === undefined ? "" : status.draft[name]);
    if (config.required) input.required = true;
    if (config.readonly) input.readOnly = true;
    if (config.disabled) input.disabled = true;
    if (config.placeholder) input.placeholder = config.placeholder;
    if (config.autofocus) input.setAttribute("data-autofocus", "true");
    const error = node("span", "ob-error", fieldsErrors[name] || "");
    error.id = "ob-error-" + name;
    input.setAttribute("aria-describedby", error.id + (config.help ? " ob-help-" + name : ""));
    if (fieldsErrors[name]) input.setAttribute("aria-invalid", "true");
    input.addEventListener("input", () => {
      status.draft[name] = input.value;
      if (fieldsErrors[name]) {
        delete fieldsErrors[name];
        error.textContent = "";
        input.removeAttribute("aria-invalid");
      }
    });
    input.addEventListener("change", () => { status.draft[name] = input.value; });
    wrapper.append(input);
    if (config.help) {
      const help = node("span", "ob-help", config.help);
      help.id = "ob-help-" + name;
      wrapper.append(help);
    }
    wrapper.append(error);
    parent.append(wrapper);
    return input;
  }

  function addRadioChoice(parent, name, value, title, description, checked, disabled) {
    const label = node("label", "ob-choice");
    const input = node("input");
    input.type = "radio";
    input.name = name;
    input.value = String(value);
    input.id = "ob-choice-" + name + "-" + String(value);
    input.checked = checked;
    input.disabled = !!disabled;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      status.draft[name] = name === "gstRegistered" ? value === true || value === "true" : String(value);
      if (name === "gstRegistered") renderDialog();
    });
    const copy = node("span");
    copy.append(node("span", "ob-choice-title", title));
    if (description) copy.append(node("span", "ob-choice-copy", description));
    label.append(input, copy);
    parent.append(label);
    return input;
  }

  function addErrorSummary(parent) {
    const summary = node("div", "ob-error-summary");
    summary.setAttribute("role", "alert");
    summary.setAttribute("aria-live", "assertive");
    if (generalError) {
      summary.append(node("strong", "", conflict ? "Setup needs attention." : "We could not save these details."));
      summary.append(node("span", "", generalError));
      if (conflict) {
        summary.append(button("Reload saved draft", "ob-reload-button", reloadDraft));
        const guidance = node("p", "", "Your current entries are still here. Reload only when you are ready to replace them with the saved version.");
        guidance.style.marginTop = "8px";
        summary.append(guidance);
      }
    }
    parent.append(summary);
  }

  function setStepCopy(step) {
    const copy = [
      ["Factory profile", "Start with the details your team and customers will recognize. Nothing changes in your business records until you confirm the finished setup."],
      ["Tax identity", "Choose whether the factory is GST registered. We use your state selection to check the GSTIN state prefix; there is no external GST verification."],
      ["Documents and numbering", "Choose how your legacy books group dispatches and invoices. You can review everything before setup is finalized."],
      ["A final review", "Check the profile and operating preferences below. Confirming is the only step that applies this setup."]
    ][step];
    return copy;
  }

  function renderCompany(parent) {
    addField(parent, "Company name", "companyName", { required: true, wide: true, placeholder: "Registered or trading name", autofocus: true, autocomplete: "organization" });
    addField(parent, "Factory address", "address", { type: "textarea", required: true, wide: true, rows: 3, placeholder: "Street, area, city and postal code", autocomplete: "street-address" });
    const grid = node("div", "ob-form-grid");
    addField(grid, "Phone", "phone", { type: "tel", placeholder: "Factory contact number", autocomplete: "tel" });
    addField(grid, "Email", "email", { type: "email", placeholder: "name@company.in", autocomplete: "email" });
    parent.append(grid);
    const year = node("div", "ob-info-note");
    year.append(node("strong", "", "Provisioned financial year"));
    year.append(node("p", "", (status.yearLabel || "Your accounting year is provisioned for this workspace.") + " Changing financial years is not part of first-time setup."));
    parent.append(year);
  }

  function renderTax(parent) {
    const registered = node("fieldset", "ob-form");
    registered.style.border = "0";
    registered.style.margin = "0";
    registered.style.padding = "0";
    const legend = node("legend", "ob-label", "GST registration");
    legend.style.marginBottom = "8px";
    registered.append(legend);
    const choices = node("div", "ob-choice-list");
    addRadioChoice(choices, "gstRegistered", false, "Not registered", "Continue without GST details.", status.draft.gstRegistered !== true);
    addRadioChoice(choices, "gstRegistered", true, "GST registered", "Enter the GSTIN, PAN and state linked to this registration.", status.draft.gstRegistered === true);
    registered.append(choices);
    parent.append(registered);
    if (status.draft.gstRegistered) {
      const grid = node("div", "ob-form-grid");
      addField(grid, "GSTIN", "gstin", {
        required: true, maxLength: 15, placeholder: "15-character GSTIN",
        help: "The first two digits must match the selected state code. No external verification is performed."
      });
      addField(grid, "PAN", "pan", { required: true, maxLength: 10, placeholder: "PAN linked to this GSTIN" });
      addField(grid, "State", "stateCode", { type: "select", required: true, help: "Select the state for this GST registration." });
      parent.append(grid);
      if (status.draft.stateCode && status.draft.gstin && String(status.draft.gstin).slice(0, 2) !== String(status.draft.stateCode)) {
        const mismatch = node("p", "ob-error-summary", "The GSTIN's first two digits do not match the selected state code.");
        mismatch.setAttribute("role", "alert");
        parent.append(mismatch);
      }
    } else {
      parent.append(node("p", "ob-help", "You can continue without GST details. No tax registration is created or checked here."));
      addField(parent, "State or union territory", "stateCode", {
        type: "select", required: true,
        help: "Your company's location is used for tax treatment, even without GST registration."
      });
      addField(parent, "PAN", "pan", { maxLength: 10, placeholder: "Optional company PAN" });
    }
  }

  function renderPreferences(parent) {
    const existing = status.existingConfiguration === true;
    addField(parent, "Quotation number prefix", "prefixQuote", { placeholder: "For example, QT", readonly: existing });
    addField(parent, "Purchase order prefix", "prefixPo", { placeholder: "For example, PO", readonly: existing });
    addField(parent, "Work order prefix", "prefixWo", { placeholder: "For example, WO", readonly: existing });
    addField(parent, "Enquiry number prefix", "prefixEnq", { placeholder: "For example, ENQ", readonly: existing });
    const dispatchSection = node("section", "ob-form");
    const dispatchTitle = node("div");
    dispatchTitle.append(node("span", "ob-label", "Dispatch book grouping"));
    dispatchTitle.append(node("p", "ob-help", "These choices follow Tamba's existing legacy book terminology."));
    dispatchSection.append(dispatchTitle);
    const dispatchChoices = node("div", "ob-choice-list");
    const dispatchOptions = [
      ["1", "Separate sales, labour and subcontract books", "Each activity receives its own dispatch book."],
      ["2", "Sales and labour combined; subcontract separate", "Manufacturing sales and labour share one book; subcontract remains separate."],
      ["3", "All activities combined", "Sales, labour and subcontract share one dispatch book."]
    ];
    dispatchOptions.forEach((item) => addRadioChoice(dispatchChoices, "bookType", item[0], item[1], item[2], String(status.draft.bookType) === item[0], existing));
    dispatchSection.append(dispatchChoices);
    if (fieldsErrors.bookType) dispatchSection.append(node("span", "ob-error", fieldsErrors.bookType));
    parent.append(dispatchSection);
    const invoiceSection = node("section", "ob-form");
    const invoiceTitle = node("div");
    invoiceTitle.append(node("span", "ob-label", "Invoice book grouping"));
    invoiceTitle.append(node("p", "ob-help", "Sales and labour invoices can share a running sequence or remain separate."));
    invoiceSection.append(invoiceTitle);
    const invoiceChoices = node("div", "ob-choice-list");
    addRadioChoice(invoiceChoices, "bookTypeInv", "1", "Combined sales and labour invoices", "One shared invoice sequence.", String(status.draft.bookTypeInv) === "1", existing);
    addRadioChoice(invoiceChoices, "bookTypeInv", "2", "Separate sales and labour invoices", "A separate sequence for each invoice type.", String(status.draft.bookTypeInv) === "2", existing);
    invoiceSection.append(invoiceChoices);
    if (fieldsErrors.bookTypeInv) invoiceSection.append(node("span", "ob-error", fieldsErrors.bookTypeInv));
    parent.append(invoiceSection);
    if (existing) {
      const note = node("div", "ob-locked-note");
      note.append(node("strong", "", "Existing numbering configuration is preserved"));
      note.append(node("p", "", "All document prefixes and dispatch and invoice grouping preferences are read-only because this workspace already has configuration. Tamba will preserve the current values. Use Company Details in the existing app to manage numbering."));
      parent.append(note);
    }
    const year = node("div", "ob-info-note");
    year.append(node("strong", "", "Financial year"));
    year.append(node("p", "", (status.yearLabel || "Provisioned for this workspace") + " is already provisioned. Changing years is not part of setup."));
    parent.append(year);
  }

  function reviewRows() {
    const stateName = status.states && status.draft.stateCode ? status.states[status.draft.stateCode] : "";
    const bookLabels = {
      "1": "Separate sales, labour and subcontract books",
      "2": "Sales and labour combined; subcontract separate",
      "3": "Sales, labour and subcontract combined"
    };
    const invoiceLabels = { "1": "Combined sales and labour invoices", "2": "Separate sales and labour invoices" };
    return [
      ["Company", status.draft.companyName],
      ["Address", status.draft.address],
      ["Phone", status.draft.phone],
      ["Email", status.draft.email],
      ["GST status", status.draft.gstRegistered ? "Registered" : "Not registered"],
      ["GSTIN", status.draft.gstRegistered ? status.draft.gstin : ""],
      ["PAN", status.draft.pan],
      ["State", stateName ? stateName + " (" + status.draft.stateCode + ")" : status.draft.stateCode],
      ["Quotation prefix", status.draft.prefixQuote],
      ["Purchase order prefix", status.draft.prefixPo],
      ["Work order prefix", status.draft.prefixWo],
      ["Enquiry prefix", status.draft.prefixEnq],
      ["Dispatch books", bookLabels[String(status.draft.bookType)] || (status.existingConfiguration ? "Existing settings preserved" : "")],
      ["Invoice books", invoiceLabels[String(status.draft.bookTypeInv)] || (status.existingConfiguration ? "Existing settings preserved" : "")],
      ["Financial year", status.yearLabel || "Provisioned"]
    ];
  }

  function renderReview(parent) {
    const list = node("dl", "ob-review-list");
    reviewRows().forEach(([label, value]) => {
      const row = node("div", "ob-review-row");
      row.append(node("dt", "", label));
      row.append(node("dd", "", value || "Not provided"));
      list.append(row);
    });
    parent.append(list);
    const confirm = node("label", "ob-confirm");
    const checkbox = node("input");
    checkbox.type = "checkbox";
    checkbox.checked = confirmed;
    checkbox.addEventListener("change", () => { confirmed = checkbox.checked; updateActionButtons(); });
    confirm.append(checkbox, node("span", "", "I have reviewed these details and confirm that Tamba may apply this initial company setup."));
    parent.append(confirm);
  }

  function updateActionButtons() {
    if (!dialog) return;
    dialog.querySelectorAll("[data-action-button]").forEach((el) => {
      el.disabled = isPending || (el.dataset.actionButton === "complete" && !confirmed);
    });
  }

  function renderDialog() {
    if (!dialog || !status) return;
    const priorFocus = dialog.contains(document.activeElement) ? document.activeElement.id : "";
    dialog.replaceChildren();
    const shell = node("div", "ob-shell");
    const header = node("header", "ob-top");
    const brand = node("div", "ob-brand");
    brand.append(node("span", "ob-brand-mark", "T"));
    const brandCopy = node("span", "ob-brand-copy");
    brandCopy.append(node("span", "ob-brand-name", "Tamba ERP"));
    brandCopy.append(node("span", "ob-brand-caption", "Factory setup"));
    brand.append(brandCopy);
    header.append(brand);
    const meta = node("div", "ob-top-meta");
    meta.append(node("strong", "", "First-time setup"));
    meta.append(node("span", "", status.yearLabel || "Provisioned workspace"));
    header.append(meta);
    shell.append(header);

    const main = node("div", "ob-main");
    const rail = node("aside", "ob-rail");
    rail.setAttribute("aria-label", "Setup progress");
    rail.append(node("p", "ob-rail-kicker", "Company setup"));
    const list = node("ol", "ob-steps");
    STEPS.forEach((label, index) => {
      const li = node("li", "ob-step" + (index === status.step ? " is-current" : "") + (index < status.step ? " is-done" : ""));
      if (index === status.step) li.setAttribute("aria-current", "step");
      li.append(node("span", "ob-step-number", index < status.step ? "OK" : String(index + 1)));
      li.append(node("span", "ob-step-label", label));
      list.append(li);
    });
    rail.append(list);
    const note = node("p", "ob-rail-note");
    note.append(node("strong", "", "You stay in control"));
    note.append(node("span", "", "Your entries are saved as a setup draft. Existing business records are not changed until you confirm."));
    rail.append(note);
    main.append(rail);

    const content = node("section", "ob-content");
    const scroll = node("div", "ob-content-scroll");
    const inner = node("div", "ob-content-inner");
    const [eyebrow, description] = setStepCopy(status.step);
    inner.append(node("p", "ob-eyebrow", "Step " + (status.step + 1) + " / 4 · " + STEPS[status.step]));
    const heading = node("h1", "ob-heading", eyebrow);
    heading.id = "ob-heading";
    inner.append(heading);
    const desc = node("p", "ob-description", description);
    desc.id = "ob-description";
    inner.append(desc);
    addErrorSummary(inner);
    const form = node("div", "ob-form");
    if (status.step === 0) renderCompany(form);
    else if (status.step === 1) renderTax(form);
    else if (status.step === 2) renderPreferences(form);
    else renderReview(form);
    inner.append(form);
    scroll.append(inner);
    content.append(scroll);

    const actions = node("footer", "ob-actions");
    const left = node("div", "ob-actions-left");
    const saveExit = button(isPending ? "Saving…" : "Save and leave", "", saveAndExit);
    saveExit.dataset.actionButton = "save";
    left.append(saveExit);
    left.append(node("span", "ob-save-label", "Draft only"));
    actions.append(left);
    const right = node("div", "ob-actions-right");
    if (status.step > 0) {
      const back = button("Back", "", goBack);
      back.dataset.actionButton = "back";
      right.append(back);
    }
    const primaryLabel = status.step === 3 ? "Confirm and finish" : "Continue";
    const primary = button(isPending ? "Saving…" : primaryLabel, "ob-primary-button", status.step === 3 ? completeSetup : continueStep);
    primary.dataset.actionButton = status.step === 3 ? "complete" : "continue";
    right.append(primary);
    actions.append(right);
    content.append(actions);
    main.append(content);
    shell.append(main);
    dialog.append(shell);
    updateActionButtons();
    if (priorFocus) {
      const replacement = dialog.querySelector("#" + CSS.escape(priorFocus));
      if (replacement) replacement.focus();
    }
  }

  function openWizard(data) {
    applyStatus(data);
    if (status.completed || !status.canManage) return;
    fieldsErrors = {};
    generalError = "";
    conflict = false;
    confirmed = false;
    const active = ensureDialog();
    renderDialog();
    if (!active.open) active.showModal();
    document.body.classList.add("ob-dialog-open");
    window.requestAnimationFrame(focusFirst);
  }

  function validateStep(step) {
    readForm();
    fieldsErrors = {};
    if (step === 0) {
      if (!String(status.draft.companyName || "").trim()) fieldsErrors.companyName = "Enter the company name.";
      if (!String(status.draft.address || "").trim()) fieldsErrors.address = "Enter the factory address.";
    }
    if (step === 1 && status.draft.gstRegistered) {
      if (!String(status.draft.gstin || "").trim()) fieldsErrors.gstin = "Enter the GSTIN.";
      if (!String(status.draft.pan || "").trim()) fieldsErrors.pan = "Enter the PAN.";
      if (!String(status.draft.stateCode || "").trim()) fieldsErrors.stateCode = "Choose the GST registration state.";
      if (status.draft.gstin && status.draft.stateCode && String(status.draft.gstin).slice(0, 2) !== String(status.draft.stateCode)) {
        fieldsErrors.gstin = "The first two GSTIN digits must match the selected state code.";
        fieldsErrors.stateCode = "Choose the state matching the first two GSTIN digits.";
      }
    }
    if (step === 1 && !status.draft.stateCode) fieldsErrors.stateCode = "Choose your company's state or union territory.";
    if (step === 2 && status.existingConfiguration !== true) {
      if (!status.draft.bookType) fieldsErrors.bookType = "Choose a dispatch book grouping.";
      if (!status.draft.bookTypeInv) fieldsErrors.bookTypeInv = "Choose an invoice book grouping.";
    }
    return Object.keys(fieldsErrors).length === 0;
  }

  function setPending(value) {
    isPending = value;
    updateActionButtons();
    if (dialog) {
      dialog.querySelectorAll("[data-action-button]").forEach((el) => { el.disabled = value || (el.dataset.actionButton === "complete" && !confirmed); });
      dialog.querySelectorAll("input, select, textarea").forEach((el) => {
        if (value && !el.disabled) {
          el.dataset.obPendingDisabled = "true";
          el.disabled = true;
        } else if (!value && el.dataset.obPendingDisabled) {
          el.disabled = false;
          delete el.dataset.obPendingDisabled;
        }
      });
    }
  }

  function payload(action, step) {
    return { action, step, version: status.version, draft: Object.assign({}, status.draft) };
  }

  async function saveStep(nextStep, exitAfter) {
    readForm();
    if (!exitAfter && !validateStep(status.step)) {
      generalError = "Please review the highlighted fields before continuing.";
      renderDialog();
      const firstInvalid = dialog.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    generalError = "";
    fieldsErrors = {};
    setPending(true);
    try {
      const result = await request("POST", payload("save", nextStep));
      applyStatus(result);
      generalError = "";
      fieldsErrors = {};
      if (exitAfter) {
        closeWizard();
        showToast("Setup draft saved", "Your progress is saved. Choose Company setup to resume when you are ready.");
      } else {
        renderDialog();
        const scroll = dialog.querySelector(".ob-content-scroll");
        if (scroll) scroll.scrollTop = 0;
        focusFirst();
      }
    } catch (error) {
      applyMutationError(error);
    } finally {
      setPending(false);
      if (dialog) renderDialog();
    }
  }

  function applyMutationError(error) {
    if (error.status === 409) {
      conflict = true;
      generalError = error.message || "Another session updated setup. Reload the saved draft to resume.";
    } else {
      conflict = false;
      generalError = error.message || "The request failed. Your entries are still available.";
    }
    fieldsErrors = error.fields || {};
    if (!conflict && Object.keys(fieldsErrors).length) {
      const keys = Object.keys(fieldsErrors);
      if (keys.some(key => ["companyName", "address", "phone", "email"].includes(key))) status.step = 0;
      else if (keys.some(key => ["gstRegistered", "gstin", "pan", "stateCode"].includes(key))) status.step = 1;
      else status.step = 2;
      confirmed = false;
    }
    if (dialog) renderDialog();
  }

  async function continueStep() {
    if (!status || isPending) return;
    await saveStep(Math.min(3, status.step + 1), false);
  }

  async function goBack() {
    if (!status || isPending) return;
    readForm();
    status.step = Math.max(0, status.step - 1);
    generalError = "";
    fieldsErrors = {};
    renderDialog();
    const scroll = dialog.querySelector(".ob-content-scroll");
    if (scroll) scroll.scrollTop = 0;
    focusFirst();
  }

  async function saveAndExit() {
    if (!status || isPending) return;
    await saveStep(status.step, true);
  }

  async function completeSetup() {
    if (!status || isPending || !confirmed) return;
    readForm();
    if (!validateStep(0) || !validateStep(1) || (!status.existingConfiguration && !validateStep(2))) {
      generalError = "Please complete the required details before confirming setup.";
      status.step = Object.keys(fieldsErrors).some((key) => ["gstin", "pan", "stateCode"].includes(key)) ? 1 :
        Object.keys(fieldsErrors).some((key) => ["bookType", "bookTypeInv"].includes(key)) ? 2 : 0;
      renderDialog();
      const invalid = dialog.querySelector('[aria-invalid="true"]');
      if (invalid) invalid.focus();
      return;
    }
    const companyName = status.draft.companyName;
    setPending(true);
    try {
      const body = payload("complete", 3);
      body.confirmed = true;
      const result = await request("POST", body);
      applyStatus(Object.assign({}, result, { completed: true }));
      closeWizard();
      removeTrigger();
      const fallbackFocus = document.querySelector("#btn-toggle-dashboard") || document.querySelector("#main-window .chevron");
      if (fallbackFocus) fallbackFocus.focus();
      titleForCompany(companyName);
      showToast("Company setup complete", "Your factory profile is ready. Next, add users, then set up items and opening balances from the existing app menus.");
    } catch (error) {
      applyMutationError(error);
    } finally {
      setPending(false);
      if (dialog) renderDialog();
    }
  }

  async function reloadDraft() {
    if (isPending) return;
    setPending(true);
    try {
      const result = await request("GET");
      applyStatus(result);
      if (result.completed) {
        closeWizard();
        removeTrigger();
        titleForCompany(result.draft && result.draft.companyName);
        return;
      }
      generalError = "";
      fieldsErrors = {};
      conflict = false;
      confirmed = false;
      renderDialog();
      focusFirst();
    } catch (error) {
      generalError = error.message || "Could not reload the saved draft.";
      conflict = true;
      renderDialog();
    } finally {
      setPending(false);
    }
  }

  async function openFromTrigger() {
    if (isPending) return;
    trigger = document.querySelector("#manufacturer-setup-trigger");
    clearToast();
    if (status && status.required) {
      const opener = trigger;
      try {
        const latest = await request("GET");
        if (latest.completed) {
          applyStatus(latest);
          removeTrigger();
          return;
        }
        if (latest.required) {
          openWizard(latest);
        } else {
          applyStatus(latest);
          const started = await request("POST", payload("start", 0));
          openWizard(started);
        }
        trigger = opener;
      } catch (error) {
        if (error.status === 409) {
          showToast("Setup changed", error.message || "The saved setup changed. Reload it before continuing.", "Reload setup", reloadAndOpen);
        } else {
          showToast("Setup could not be opened", error.message || "Check your connection and try again.", "Retry", openFromTrigger);
        }
      }
      return;
    }
    const opener = trigger;
    setHeaderBusy(true);
    try {
      const started = await request("POST", payload("start", 0));
      openWizard(started);
      trigger = opener;
    } catch (error) {
      if (error.status === 409) {
        showToast("Setup changed", error.message || "The saved setup changed. Reload it before continuing.", "Reload setup", reloadAndOpen);
      } else {
        showToast("Setup could not be started", error.message || "Check your connection and try again.", "Retry", openFromTrigger);
      }
    } finally {
      setHeaderBusy(false);
    }
  }

  function setHeaderBusy(value) {
    const el = document.querySelector("#manufacturer-setup-trigger");
    if (!el) return;
    el.disabled = value;
    el.textContent = value ? "Starting setup…" : "Company setup";
  }

  async function reloadAndOpen() {
    clearToast();
    try {
      const latest = await request("GET");
      applyStatus(latest);
      if (latest.completed) {
        removeTrigger();
        titleForCompany(latest.draft && latest.draft.companyName);
      } else if (latest.canManage) {
        if (latest.required) openWizard(latest);
        else showToast("Setup is ready to begin", "No setup draft is active. Start when you are ready to enroll this factory.", "Start setup", openFromTrigger);
      }
    } catch (error) {
      showToast("Setup could not be reloaded", error.message || "Check your connection and try again.", "Retry", reloadAndOpen);
    }
  }

  async function check() {
    showToast("Checking setup status", "The ERP remains available while first-time setup is checked.");
    try {
      const result = await request("GET");
      clearToast();
      applyStatus(result);
      if (result.completed) {
        removeTrigger();
        return result;
      }
      if (result.required && result.canManage) {
        trigger = document.querySelector("#manufacturer-setup-trigger");
        openWizard(result);
      }
      return result;
    } catch (error) {
      showToast("Setup status unavailable", error.message || "The ERP is still available. Retry setup status when your connection is ready.", "Retry", check);
      return null;
    }
  }

  window.manufacturerOnboarding = { check };
})();
