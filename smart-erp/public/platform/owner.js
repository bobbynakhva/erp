(() => {
  "use strict";

  const root = document.getElementById("app");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const toast = document.getElementById("status-message");
  let session = null;
  let companies = [];
  let companyDetail = null;
  let busy = false;
  let toastTimer;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const button = (label, className, action, type = "button") => {
    const node = el("button", `btn ${className || ""}`, label);
    node.type = type;
    if (action) node.addEventListener("click", action);
    return node;
  };
  const formField = (labelText, name, opts = {}) => {
    const wrap = el("div", `field${opts.full ? " full" : ""}`);
    const id = `field-${name}`;
    const label = el("label", "", labelText);
    label.htmlFor = id;
    let input;
    if (opts.options) {
      input = document.createElement("select");
      opts.options.forEach(([value, text]) => {
        const option = el("option", "", text);
        option.value = value;
        input.append(option);
      });
    } else {
      input = document.createElement("input");
      input.type = opts.type || "text";
      if (opts.minLength) input.minLength = opts.minLength;
      if (opts.maxLength) input.maxLength = opts.maxLength;
      if (opts.required !== false) input.required = true;
      if (opts.placeholder) input.placeholder = opts.placeholder;
      if (opts.readOnly) input.readOnly = true;
      if (opts.autocomplete) input.autocomplete = opts.autocomplete;
    }
    input.id = id;
    input.name = name;
    if (opts.value !== undefined) input.value = opts.value;
    wrap.append(label, input);
    if (opts.help) wrap.append(el("span", "field-help", opts.help));
    return wrap;
  };
  const showToast = (message, isError = false) => {
    toast.textContent = message;
    toast.className = `global-status${isError ? " notice-error" : ""}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5200);
  };
  const dateText = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const dateOnly = (value) => {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  };
  const statusTag = (status) => el("span", `status status-${String(status || "offline").toLowerCase()}`, status || "unknown");
  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      method: options.method || "GET",
      credentials: "include",
      headers: options.body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    let data = {};
    try { data = await response.json(); } catch (_) { data = {}; }
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.fields = data.fields || {};
      error.status = response.status;
      throw error;
    }
    return data;
  };
  const modalOpen = (title, eyebrow, content, focusSelector) => {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-eyebrow").textContent = eyebrow;
    modalContent.replaceChildren(content);
    modal.showModal();
    requestAnimationFrame(() => (modal.querySelector(focusSelector || "input,select,button") || modal).focus());
  };
  const formShell = (submitText, onSubmit, description) => {
    const form = document.createElement("form");
    const error = el("div", "form-error");
    error.setAttribute("role", "alert");
    const help = description ? el("div", "notice", description) : null;
    const actions = el("div", "form-actions");
    actions.append(button("Cancel", "", () => modal.close()));
    const submit = button(submitText, "btn-primary", null, "submit");
    actions.append(submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      error.textContent = "";
      submit.disabled = true;
      busy = true;
      try {
        await onSubmit(new FormData(form), form);
      } catch (err) {
        error.textContent = errorMessage(err);
        submit.disabled = false;
      } finally {
        busy = false;
      }
    });
    form.append(...(help ? [help] : []));
    return { form, error, actions, submit };
  };
  const errorMessage = (err) => {
    if (err && err.message) return err.message;
    return "That request could not be completed. Check the connection and try again.";
  };

  function renderAuth() {
    root.replaceChildren();
    const shell = el("main", "auth-shell");
    const editorial = el("section", "auth-editorial");
    const wordmark = el("div", "auth-wordmark");
    const mark = el("span", "brand-mark");
    mark.append(el("i"), el("i"), el("i"));
    wordmark.append(mark, el("span", "", "TAMBA"), el("small", "", "PLATFORM"));
    const story = el("div", "auth-story");
    story.append(el("div", "eyebrow", "OWNER CONTROL · PRIVATE"));
    const storyTitle = el("h2");
    storyTitle.append(document.createTextNode("A clear view of "), el("em", "", "every factory."));
    story.append(storyTitle, el("p", "", "One place to oversee your independent manufacturer deployments. Every connection is explicit; every operational change leaves an audit trail."));
    editorial.append(wordmark, story, el("div", "auth-caption", "TAMBA MANUFACTURING SYSTEMS  /  PLATFORM"));
    const card = el("section", "auth-card");
    const inner = el("div", "auth-card-inner");
    const isBootstrap = Boolean(session && session.setupRequired);
    const eyebrow = isBootstrap ? "FIRST OWNER SETUP" : "OWNER ACCESS";
    const title = isBootstrap ? "Set up your owner account" : "Welcome back";
    inner.append(el("div", "eyebrow", eyebrow));
    const heading = el("div", "auth-copy");
    heading.append(el("h1", "", title));
    heading.append(el("p", "", isBootstrap
      ? "Create the independent Tamba Platform owner account. This is separate from every factory administrator account."
      : "Sign in to manage your manufacturer portfolio."));
    inner.append(heading);
    if (session && session.setupRequired && !session.bootstrapConfigured) {
      const setupNotice = el("div", "notice warning");
      setupNotice.append(el("strong", "", "Server setup required. "));
      setupNotice.append(document.createTextNode("Ask the server operator to configure PLATFORM_OWNER_BOOTSTRAP_KEY with a secret of at least 32 characters, then reload this page. The ERP default administrator cannot access this control panel."));
      inner.append(setupNotice);
    } else {
      const form = el("form", "auth-form");
      form.append(formField("Owner email", "email", { type: "email", autocomplete: "username" }));
      form.append(formField("Password", "password", { type: "password", minLength: isBootstrap ? 12 : undefined, autocomplete: isBootstrap ? "new-password" : "current-password" }));
      if (isBootstrap) form.append(formField("Server bootstrap key", "bootstrapKey", { type: "password", autocomplete: "off", help: "Provided by the operator who configured the server secret. Never use a default ERP credential." }));
      const error = el("div", "form-error");
      error.setAttribute("role", "alert");
      const submit = button(isBootstrap ? "Create owner account" : "Sign in to platform", "btn-primary", null, "submit");
      submit.append(el("span", "", "→"));
      form.append(error, submit);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (busy) return;
        const values = new FormData(form);
        if (isBootstrap && String(values.get("password") || "").length < 12) {
          error.textContent = "Use a password with at least 12 characters.";
          return;
        }
        if (isBootstrap && String(values.get("bootstrapKey") || "").length < 32) {
          error.textContent = "The server bootstrap key must be at least 32 characters. Ask the operator to confirm the server secret.";
          return;
        }
        error.textContent = "";
        submit.disabled = true;
        busy = true;
        try {
          const payload = {
            email: String(values.get("email") || "").trim(),
            password: String(values.get("password") || "")
          };
          if (isBootstrap) payload.bootstrapKey = String(values.get("bootstrapKey") || "");
          await api(isBootstrap ? "/api/platform/bootstrap" : "/api/platform/login", { method: "POST", body: payload });
          await checkSession();
        } catch (err) {
          error.textContent = errorMessage(err);
          submit.disabled = false;
        } finally { busy = false; }
      });
      inner.append(form);
    }
    const foot = el("div", "auth-footnote");
    foot.append(el("strong", "", "Independent owner authentication."));
    foot.append(document.createTextNode(" This is not the factory ERP login. Factory data and administrator passwords are not sent to the platform control plane."));
    inner.append(foot);
    card.append(inner);
    shell.append(editorial, card);
    root.append(shell);
    const firstInput = root.querySelector("input");
    if (firstInput) firstInput.focus({ preventScroll: true });
  }

  function renderFrame() {
    root.replaceChildren();
    const layout = el("div", "owner-layout");
    const sidebar = el("aside", "sidebar");
    sidebar.id = "owner-sidebar";
    const brand = el("div", "brand-lockup");
    const mark = el("span", "brand-mark");
    mark.append(el("i"), el("i"), el("i"));
    const brandName = el("div", "brand-name");
    brandName.append(document.createTextNode("Tamba"), el("small", "", "Platform owner"));
    brand.append(mark, brandName);
    sidebar.append(brand, el("div", "sidebar-label eyebrow", "Portfolio"));
    const nav = el("nav");
    const portfolio = el("a", "nav-link current", "Manufacturers");
    portfolio.href = "#";
    portfolio.addEventListener("click", (event) => { event.preventDefault(); navigate(""); });
    nav.append(portfolio);
    sidebar.append(nav);
    const bottom = el("div", "sidebar-bottom");
    bottom.append(el("div", "eyebrow", "Signed in as"));
    bottom.append(el("span", "session-email", session?.owner?.email || "Owner"));
    bottom.append(button("Sign out", "btn-quiet", logout));
    sidebar.append(bottom);

    const main = el("main", "main");
    const topbar = el("header", "topbar");
    const context = el("div", "topbar-context");
    const toggle = button("Menu", "btn-small mobile-nav-toggle", () => sidebar.classList.toggle("open"));
    context.append(toggle, el("span", "", "Platform"), el("span", "", "/"), el("strong", "", "Manufacturer portfolio"));
    const right = el("div", "topbar-right");
    right.append(el("span", "live-indicator", "Owner session active"));
    right.append(button("Reload", "btn-small", () => loadCompanies(true)));
    topbar.append(context, right);
    const content = el("section", "content");
    content.id = "page-content";
    main.append(topbar, content);
    layout.append(sidebar, main);
    root.append(layout);
  }

  function navigate(hash) {
    const next = hash ? `#${hash}` : "#";
    if (location.hash === next) route();
    else location.hash = next;
    document.getElementById("owner-sidebar")?.classList.remove("open");
  }
  function route() {
    if (!session?.authenticated) return;
    renderFrame();
    const raw = location.hash.replace(/^#\/?/, "");
    if (raw === "new") renderNewCompanyPage();
    else if (raw.startsWith("company/")) renderCompanyPage(decodeURIComponent(raw.slice("company/".length)));
    else renderPortfolio();
  }

  function renderPortfolio() {
    const content = document.getElementById("page-content");
    const heading = el("div", "page-heading");
    const copy = el("div");
    copy.append(el("div", "eyebrow", "OWNER OVERVIEW"));
    copy.append(el("h1", "", "Your portfolio"));
    copy.append(el("p", "", "A live view of independently hosted manufacturers. Connection state comes from each deployment’s pairing and heartbeat—not an assumed provisioning process."));
    const actions = el("div", "heading-actions");
    actions.append(button("Reload data", "", () => loadCompanies(true)));
    actions.append(button("Add manufacturer", "btn-primary", () => navigate("new")));
    heading.append(copy, actions);
    const overview = el("div", "overview-strip");
    const overviewText = el("div", "overview-copy");
    overviewText.append(el("strong", "", "Operations stay explicit. "));
    overviewText.append(document.createTextNode("Deployments and databases are created manually. Plan labels are operational notes; no billing is automated."));
    const meta = el("div", "overview-meta");
    meta.append(el("span", "", `${companies.length} ${companies.length === 1 ? "manufacturer" : "manufacturers"}`));
    meta.append(el("span", "", `Updated ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date())}`));
    overview.append(overviewText, meta);
    content.append(heading, overview);
    if (loadState === "loading") {
      const loading = el("div", "loading-state");
      loading.append(el("div", "eyebrow", "SYNCING PORTFOLIO"));
      const line = el("div", "skeleton-line");
      line.style.width = "36%";
      loading.append(line, el("div", "skeleton-line"), el("div", "skeleton-line"));
      content.append(loading);
      return;
    }
    if (loadState === "error") {
      const error = el("div", "error-state");
      error.append(el("div", "empty-mark", "!"), el("h2", "", "Portfolio unavailable"), el("p", "", loadError || "We could not load manufacturer records. No status is being inferred."));
      error.append(button("Try again", "btn-primary", () => loadCompanies(true)));
      content.append(error);
      return;
    }
    if (!companies.length) {
      const empty = el("div", "empty-state");
      empty.append(el("div", "empty-mark", "T"), el("div", "eyebrow", "NO MANUFACTURERS YET"), el("h2", "", "Start with a real deployment"), el("p", "", "Add a manufacturer record, then create its separate customer ERP deployment and database manually. Connection setup follows once it is reachable over HTTPS."));
      empty.append(button("Add first manufacturer", "btn-primary", () => navigate("new")));
      content.append(empty);
      return;
    }
    const wrap = el("div", "company-table-wrap");
    const table = el("table", "company-table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    ["Manufacturer", "ERP endpoint", "Plan label", "Status", "Administrator", "Heartbeat", ""].forEach((label) => hr.append(el("th", "", label)));
    thead.append(hr);
    const tbody = document.createElement("tbody");
    companies.forEach((company) => {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      const link = el("a", "company-link", company.name || "Unnamed manufacturer");
      link.href = `#company/${encodeURIComponent(company.id)}`;
      link.addEventListener("click", (event) => { event.preventDefault(); navigate(`company/${encodeURIComponent(company.id)}`); });
      name.append(link, el("div", "company-sub", `/${company.slug || ""} · ${company.yearLabel || company.yearStart || ""}`));
      const endpoint = document.createElement("td");
      endpoint.append(el("span", "mono", company.deploymentUrl || "Not connected"));
      const plan = document.createElement("td");
      plan.append(el("span", "mono", company.plan || "—"));
      const state = document.createElement("td");
      state.append(statusTag(company.status));
      const admin = document.createElement("td");
      admin.append(company.administratorReady ? el("span", "ready-yes", "Ready") : el("span", "ready-no", "Not ready"));
      const heartbeat = document.createElement("td");
      heartbeat.append(el("span", "mono", company.lastSeenAt ? dateText(company.lastSeenAt) : "No heartbeat"));
      const open = document.createElement("td");
      open.append(button("Inspect", "btn-small", () => navigate(`company/${encodeURIComponent(company.id)}`)));
      tr.append(name, endpoint, plan, state, admin, heartbeat, open);
      tbody.append(tr);
    });
    table.append(thead, tbody);
    wrap.append(table);
    content.append(wrap);
  }
  let loadState = "loading";
  let loadError = "";
  async function loadCompanies(showLoading) {
    if (!session?.authenticated) return;
    if (showLoading) {
      loadState = "loading";
      route();
    }
    try {
      const result = await api("/api/platform/companies");
      companies = Array.isArray(result.companies) ? result.companies : [];
      if (result.owner) session.owner = result.owner;
      session.publicUrlConfigured = result.publicUrlConfigured;
      loadState = "ready";
      loadError = "";
    } catch (err) {
      loadState = "error";
      loadError = errorMessage(err);
      if (err.status === 401) { session = { authenticated: false }; renderAuth(); return; }
    }
    route();
  }

  function renderNewCompanyPage() {
    const content = document.getElementById("page-content");
    const back = el("a", "detail-back", "← Back to portfolio");
    back.href = "#";
    back.addEventListener("click", (event) => { event.preventDefault(); navigate(""); });
    const heading = el("div", "page-heading");
    const copy = el("div");
    copy.append(el("div", "eyebrow", "MANUFACTURER RECORD"));
    copy.append(el("h1", "", "Add a manufacturer"));
    copy.append(el("p", "", "This creates a control-plane record only. It does not provision hosting, a database, or an ERP instance."));
    heading.append(copy);
    const panel = el("section", "panel");
    const panelHead = el("div", "panel-head");
    panelHead.append(el("h2", "", "Company details"));
    panel.append(panelHead);
    const body = el("div", "panel-body");
    const form = document.createElement("form");
    form.className = "form-grid";
    form.append(
      formField("Manufacturer name", "name", { placeholder: "e.g. Marula Precision Works", maxLength: 120 }),
      formField("URL slug", "slug", { placeholder: "marula-precision", maxLength: 80, help: "Unique short identifier used when pairing the deployment." }),
      formField("Administrator email", "adminEmail", { type: "email", autocomplete: "email" }),
      formField("Financial year starts", "yearStart", { type: "number", help: "Calendar year in which the current financial year begins." }),
      formField("Plan label", "plan", { options: [["pilot", "Pilot"], ["standard", "Standard"], ["enterprise", "Enterprise"], ["custom", "Custom"]] }),
      formField("Trial ends on (optional)", "trialEndsOn", { type: "date", required: false })
    );
    const error = el("div", "form-error full");
    error.setAttribute("role", "alert");
    const actions = el("div", "form-actions full");
    actions.append(button("Cancel", "", () => navigate("")));
    const submit = button("Create manufacturer record", "btn-primary", null, "submit");
    actions.append(submit);
    form.append(error, actions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      const data = new FormData(form);
      const yearStart = Number(data.get("yearStart"));
      if (!Number.isInteger(yearStart) || yearStart < 1900 || yearStart > 2200) {
        error.textContent = "Enter a valid financial year start.";
        return;
      }
      busy = true;
      error.textContent = "";
      submit.disabled = true;
      const bodyData = {
        name: String(data.get("name") || "").trim(),
        slug: String(data.get("slug") || "").trim(),
        adminEmail: String(data.get("adminEmail") || "").trim(),
        yearStart,
        plan: String(data.get("plan") || "")
      };
      const trialEndsOn = String(data.get("trialEndsOn") || "");
      if (trialEndsOn) bodyData.trialEndsOn = trialEndsOn;
      try {
        const result = await api("/api/platform/companies", { method: "POST", body: bodyData });
        showToast("Manufacturer record created.");
        await loadCompanies(false);
        navigate(`company/${encodeURIComponent(result.company.id)}`);
      } catch (err) {
        error.textContent = errorMessage(err);
        submit.disabled = false;
      } finally { busy = false; }
    });
    body.append(form);
    panel.append(body);
    content.append(back, heading, panel);
  }

  async function renderCompanyPage(id) {
    const content = document.getElementById("page-content");
    content.append(el("div", "loading-state", ""));
    const loading = content.firstChild;
    loading.append(el("div", "eyebrow", "LOADING COMPANY RECORD"));
    const lines = el("div");
    for (let i = 0; i < 3; i++) { const line = el("div", "skeleton-line"); line.style.width = `${42 + i * 14}%`; lines.append(line); }
    loading.append(lines);
    try {
      const result = await api(`/api/platform/companies/${encodeURIComponent(id)}`);
      companyDetail = result;
      if (location.hash.replace(/^#\/?/, "") !== `company/${id}`) return;
      drawCompanyDetail(content, result.company, result.invitations || [], result.events || []);
    } catch (err) {
      if (location.hash.replace(/^#\/?/, "") !== `company/${id}`) return;
      const error = el("div", "error-state");
      error.append(el("div", "empty-mark", "!"), el("h2", "", "Company details unavailable"), el("p", "", errorMessage(err)));
      error.append(button("Reload details", "btn-primary", () => route()));
      content.replaceChildren(error);
      if (err.status === 401) { session = { authenticated: false }; renderAuth(); }
    }
  }

  function drawCompanyDetail(content, company, invitations, events) {
    content.replaceChildren();
    const back = el("a", "detail-back", "← Back to portfolio");
    back.href = "#";
    back.addEventListener("click", (event) => { event.preventDefault(); navigate(""); });
    const heading = el("div", "detail-heading");
    const copy = el("div");
    copy.append(el("div", "eyebrow", "MANUFACTURER / CONTROL RECORD"));
    copy.append(el("h1", "", company.name || "Manufacturer"));
    copy.append(el("div", "subline", `/${company.slug || ""} · ${company.yearLabel || company.yearStart || ""}`));
    const actions = el("div", "detail-actions");
    actions.append(button("Reload", "", () => route()));
    actions.append(button("Configure connection", "btn-primary", () => openConnection(company)));
    if (company.accessStatus === "suspended") actions.append(button("Reactivate access", "", () => changeAccess(company, "active")));
    else actions.append(button("Suspend access", "btn-danger", () => changeAccess(company, "suspended")));
    heading.append(copy, actions);
    const grid = el("div", "detail-grid");
    const left = el("div");
    const right = el("div");
    const factsPanel = el("section", "panel");
    panelHead(factsPanel, "Company record", statusTag(company.status));
    const facts = el("div", "panel-body facts");
    [
      ["Administrator", company.adminEmail || "—"],
      ["Plan label", company.plan || "—"],
      ["Access", company.accessStatus || "active"],
      ["Deployment URL", company.deploymentUrl || "Not configured"],
      ["Last heartbeat", company.lastSeenAt ? dateText(company.lastSeenAt) : "No heartbeat yet"],
      ["Trial ends", dateOnly(company.trialEndsOn)],
      ["Created", dateText(company.createdAt)],
      ["Financial year", company.yearLabel || company.yearStart || "—"]
    ].forEach(([label, value]) => {
      const fact = el("div");
      fact.append(el("div", "fact-label", label));
      if (label === "Deployment URL" && company.deploymentUrl) {
        const link = el("a", "fact-value url-value", company.deploymentUrl);
        link.href = company.deploymentUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        fact.append(link);
      } else fact.append(el("div", "fact-value", value));
      facts.append(fact);
    });
    factsPanel.append(facts);
    left.append(factsPanel);

    const readinessPanel = el("section", "panel");
    panelHead(readinessPanel, "Operational readiness");
    const readiness = el("div", "panel-body readiness");
    readiness.append(readinessRow("Deployment pairing", company.status === "connected" || company.status === "active" ? "Connected" : "Not connected", company.status === "connected" || company.status === "active"));
    readiness.append(readinessRow("Administrator account", company.administratorReady ? "Ready" : "Pending", company.administratorReady));
    readiness.append(readinessRow("Onboarding", company.onboardingCompleted ? "Complete" : "In progress", company.onboardingCompleted));
    readiness.append(readinessRow("Access control", company.accessStatus === "suspended" ? "Suspended" : "Active", company.accessStatus !== "suspended"));
    readinessPanel.append(readiness);
    left.append(readinessPanel);

    const invitePanel = el("section", "panel");
    const inviteHead = el("div", "panel-head");
    inviteHead.append(el("h2", "", "Administrator invitations"));
    const canInvite = company.status === "connected" && company.administratorReady === false && company.accessStatus !== "suspended";
    inviteHead.append(button("Create invitation link", "btn-small btn-primary", () => createInvitation(company), "button"));
    inviteHead.lastChild.disabled = !canInvite;
    invitePanel.append(inviteHead);
    const inviteBody = el("div", "panel-body");
    const inviteInfo = el("div", "notice");
    inviteInfo.textContent = "Creates a copy-and-share link only. No email is sent. Available only for a connected deployment with a live heartbeat, pending administrator setup, and active access.";
    inviteBody.append(inviteInfo);
    if (invitations.length) {
      invitations.forEach((invitation) => {
        const row = el("div", "invite-row");
        const details = el("div");
        details.append(el("div", "invite-email", invitation.email || "Administrator"));
        const state = invitation.revokedAt ? "Revoked" : invitation.acceptedAt ? "Accepted" : new Date(invitation.expiresAt) < new Date() ? "Expired" : "Open";
        details.append(el("div", "invite-meta", `${state} · expires ${dateText(invitation.expiresAt)}`));
        row.append(details);
        if (!invitation.acceptedAt && !invitation.revokedAt && new Date(invitation.expiresAt) >= new Date()) {
          row.append(button("Revoke", "btn-small", () => revokeInvitation(company, invitation)));
        }
        inviteBody.append(row);
      });
    } else inviteBody.append(el("div", "field-help", "No invitation links have been created."));
    invitePanel.append(inviteBody);
    right.append(invitePanel);

    const auditPanel = el("section", "panel");
    panelHead(auditPanel, "Recent audit events");
    const auditBody = el("div", "panel-body");
    if (!events.length) auditBody.append(el("div", "field-help", "No recorded events yet."));
    else {
      const timeline = el("div", "timeline");
      events.forEach((event) => {
        const item = el("div", "timeline-item");
        item.append(el("div", "timeline-action", event.action || "Platform event"));
        item.append(el("div", "timeline-meta", `${dateText(event.createdAt)} · ${event.actor || "System"}`));
        timeline.append(item);
      });
      auditBody.append(timeline);
    }
    auditPanel.append(auditBody);
    right.append(auditPanel);
    grid.append(left, right);
    content.append(back, heading, grid);
  }
  function panelHead(panel, title, trailing) {
    const head = el("div", "panel-head");
    head.append(el("h2", "", title));
    if (trailing) head.append(trailing);
    panel.append(head);
  }
  function readinessRow(label, value, ready) {
    const row = el("div", "readiness-row");
    row.append(el("span", "", label), el("strong", ready ? "ready-yes" : "ready-no", value));
    return row;
  }

  function openConnection(company) {
    const wrapper = document.createElement("div");
    const intro = el("div", "notice warning");
    intro.textContent = "Create the customer ERP deployment and its database manually first. This page does not provision a host or contact arbitrary remote URLs. The deployment URL must be HTTPS and contain no credentials, query string, or fragment.";
    const form = document.createElement("form");
    form.append(formField("Customer ERP deployment URL", "deploymentUrl", {
      type: "url", value: company.deploymentUrl || "", placeholder: "https://erp.manufacturer.example", help: "Use the HTTPS origin or base URL supplied by your deployment operator."
    }));
    const error = el("div", "form-error");
    error.setAttribute("role", "alert");
    const shellActions = el("div", "form-actions");
    shellActions.append(button("Cancel", "", () => modal.close()));
    const submit = button("Save connection settings", "btn-primary", null, "submit");
    if (session?.publicUrlConfigured === false) {
      intro.textContent = "Connection setup is unavailable until the platform server has a canonical public URL. Ask the operator to set PLATFORM_PUBLIC_URL on the server, then reload. Do not enter a guessed control URL. The customer ERP deployment and database must still be created manually.";
      submit.disabled = true;
    }
    shellActions.append(submit);
    form.append(error, shellActions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = String(new FormData(form).get("deploymentUrl") || "").trim();
      let parsed;
      try { parsed = new URL(raw); } catch (_) { error.textContent = "Enter a valid HTTPS deployment URL."; return; }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
        error.textContent = "Use HTTPS without a username, password, query string, or fragment.";
        return;
      }
      error.textContent = "";
      submit.disabled = true;
      try {
        const result = await api(`/api/platform/companies/${encodeURIComponent(company.id)}/connection`, { method: "POST", body: { deploymentUrl: raw } });
        modal.close();
        showConnectionKey(result);
        await reloadDetail(company.id, false);
      } catch (err) {
        error.textContent = errorMessage(err);
        submit.disabled = false;
      }
    });
    wrapper.append(intro, form);
    modalOpen("Configure deployment", "MANUAL DEPLOYMENT · PAIRING", wrapper);
  }
  function showConnectionKey(result) {
    const config = result.configuration || {};
    const instructions = el("div");
    const notice = el("div", "notice warning");
    notice.textContent = "This deployment key is shown only now. Copy it directly into the customer server’s private environment settings; do not put it in GitHub, a committed .env file, or browser storage.";
    const key = el("div", "one-time-key");
    key.append(el("div", "eyebrow", "ONE-TIME DEPLOYMENT KEY"));
    const code = el("code", "", result.deploymentKey || config.ERP_DEPLOYMENT_KEY || "");
    key.append(code);
    const copy = button("Copy key", "btn-small", async () => {
      try { await navigator.clipboard.writeText(code.textContent); showToast("Deployment key copied. Store it only in server secrets."); }
      catch (_) { showToast("Select the key and copy it manually.", true); }
    });
    key.append(copy);
    instructions.append(notice, key, el("p", "field-help", "Set these values in the customer ERP server environment and restart that deployment. Keep keys in server secret settings—not in source control."));
    const values = [
      ["ERP_MODE", config.ERP_MODE || "customer"],
      ["ERP_CONTROL_URL", config.ERP_CONTROL_URL || "Set from server-provided control URL"],
      ["ERP_COMPANY_ID", config.ERP_COMPANY_ID || (result.company && result.company.id) || ""],
      ["ERP_PUBLIC_URL", config.ERP_PUBLIC_URL || (result.company && result.company.deploymentUrl) || ""],
      ["ERP_DEPLOYMENT_KEY", result.deploymentKey || config.ERP_DEPLOYMENT_KEY || ""]
    ];
    const block = el("pre", "code-block");
    block.textContent = values.map(([name, value]) => `${name}=${value}`).join("\n");
    instructions.append(block);
    const setup = el("div", "notice");
    setup.textContent = "Pairing and heartbeat update the company status after the customer deployment is configured. This control panel does not launch hosting or database setup.";
    instructions.append(setup, button("Done", "btn-primary", () => modal.close()));
    modalOpen("Key created", "COPY ONCE · SERVER CONFIGURATION", instructions);
    const urlConfigured = session?.publicUrlConfigured !== false;
    if (!urlConfigured || !config.ERP_CONTROL_URL) {
      const warning = el("div", "notice warning");
      warning.textContent = "The server canonical control URL is not configured. Ask the operator to set PLATFORM_PUBLIC_URL on the platform server, then request a fresh connection key. Do not guess this value.";
      instructions.prepend(warning);
    }
  }

  async function createInvitation(company) {
    const confirmed = window.confirm(`Create a one-time invitation link for ${company.adminEmail || "the administrator"}? It will not be emailed. You will need to copy and share the link yourself.`);
    if (!confirmed) return;
    try {
      const result = await api(`/api/platform/companies/${encodeURIComponent(company.id)}/invitations`, { method: "POST", body: {} });
      const page = el("div");
      const note = el("div", "notice success");
      note.textContent = "Invitation link created. Copy and share it with the administrator; no email was sent.";
      const label = el("div", "field-label");
      label.textContent = "Copy-and-share invitation URL";
      const linkInput = document.createElement("input");
      linkInput.type = "url";
      linkInput.readOnly = true;
      linkInput.value = result.invitationUrl || "";
      linkInput.setAttribute("aria-label", "Invitation URL");
      linkInput.style.cssText = "width:100%;min-height:42px;padding:0 10px;border:1px solid #cfdad3;background:#edf2ee;color:#192625;font:11px 'DM Mono',monospace";
      const expires = el("p", "field-help", `Expires ${dateText(result.expiresAt)}. Only share this with the intended administrator.`);
      const actions = el("div", "form-actions");
      actions.append(button("Copy link", "btn-primary", async () => {
        try { await navigator.clipboard.writeText(linkInput.value); showToast("Invitation link copied. Share it directly with the administrator."); }
        catch (_) { linkInput.focus(); linkInput.select(); showToast("Copy the selected invitation link manually.", true); }
      }), button("Done", "", () => { modal.close(); reloadDetail(company.id, false); }));
      page.append(note, label, linkInput, expires, actions);
      modalOpen("Invitation link", "COPY AND SHARE · NO EMAIL", page, "input");
      linkInput.focus();
      linkInput.select();
    } catch (err) { showToast(errorMessage(err), true); }
  }
  async function revokeInvitation(company, invitation) {
    if (!window.confirm(`Revoke the invitation link for ${invitation.email || "this administrator"}? It can no longer be used.`)) return;
    try {
      await api(`/api/platform/companies/${encodeURIComponent(company.id)}/invitations/${encodeURIComponent(invitation.id)}/revoke`, { method: "POST", body: {} });
      showToast("Invitation revoked.");
      await reloadDetail(company.id, false);
    } catch (err) { showToast(errorMessage(err), true); }
  }
  async function changeAccess(company, accessStatus) {
    const suspending = accessStatus === "suspended";
    const prompt = suspending
      ? `Suspend access for ${company.name}? The change reaches a connected deployment on its next heartbeat (about 30 seconds). The access lease expires fail-closed after 5 minutes.`
      : `Reactivate access for ${company.name}? The connected deployment applies the change on its next heartbeat.`;
    if (!window.confirm(prompt)) return;
    try {
      await api(`/api/platform/companies/${encodeURIComponent(company.id)}/access`, { method: "POST", body: { accessStatus } });
      showToast(suspending ? "Access marked suspended. A connected deployment applies it on its next heartbeat." : "Access reactivated.");
      await reloadDetail(company.id, false);
    } catch (err) { showToast(errorMessage(err), true); }
  }
  async function reloadDetail(id, showLoading) {
    if (showLoading) route();
    try {
      const result = await api(`/api/platform/companies/${encodeURIComponent(id)}`);
      companyDetail = result;
      const current = location.hash.replace(/^#\/?/, "");
      if (current === `company/${id}`) drawCompanyDetail(document.getElementById("page-content"), result.company, result.invitations || [], result.events || []);
      companies = companies.map((company) => company.id === result.company.id ? result.company : company);
    } catch (err) { showToast(errorMessage(err), true); }
  }

  async function logout() {
    try { await api("/api/platform/logout", { method: "POST", body: {} }); }
    catch (err) { showToast(errorMessage(err), true); }
    session = { authenticated: false };
    renderAuth();
  }
  async function checkSession() {
    try {
      session = await api("/api/platform/session");
    } catch (err) {
      session = { authenticated: false, sessionError: errorMessage(err) };
    }
    if (!session.authenticated) {
      renderAuth();
      if (session.sessionError) {
        const notice = el("div", "notice error", session.sessionError);
        root.querySelector(".auth-card-inner")?.prepend(notice);
      }
      return;
    }
    loadState = "loading";
    renderFrame();
    await loadCompanies(true);
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    if (!modal.open) modalContent.replaceChildren();
  });
  modal.querySelector("[data-close-modal]").addEventListener("click", () => modal.close());
  window.addEventListener("hashchange", () => {
    if (session?.authenticated) route();
  });
  checkSession();
})();
