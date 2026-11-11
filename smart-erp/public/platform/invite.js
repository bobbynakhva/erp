(() => {
  "use strict";

  const app = document.getElementById("invite-app");
  const tokenParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = tokenParams.get("token");
  // Remove the bearer token from the visible URL before any network request.
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  let busy = false;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const brand = () => {
    const row = el("div", "invite-top");
    const mark = el("span", "brand-mark");
    mark.append(el("i"), el("i"), el("i"));
    const word = el("div", "brand-name");
    word.append(document.createTextNode("Tamba"), el("small", "", "MANUFACTURING ERP"));
    row.append(mark, word);
    return row;
  };
  const field = (labelText, name, type) => {
    const wrap = el("div", "field");
    const id = `invite-${name}`;
    const label = el("label", "", labelText);
    label.htmlFor = id;
    const input = document.createElement("input");
    input.id = id;
    input.name = name;
    input.type = type || "password";
    input.required = true;
    if (name === "password" || name === "confirmPassword") input.minLength = 12;
    input.autocomplete = name === "password" ? "new-password" : "new-password";
    wrap.append(label, input);
    return wrap;
  };
  const api = async (path, body) => {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch (_) { data = {}; }
    if (!response.ok) {
      const message = data.error || "The invitation could not be verified.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  };
  const setPage = (card) => {
    app.replaceChildren(brand(), card);
  };
  const errorCopy = (error) => {
    const message = String(error?.message || "");
    if (/expir/i.test(message)) return "This invitation has expired. Ask the manufacturer owner to create a new invitation link.";
    if (/revok/i.test(message)) return "This invitation was revoked. Ask the manufacturer owner for a new link.";
    if (/used|accept/i.test(message) && error.status === 409) return "This invitation has already been used. Sign in to the factory ERP instead.";
    if (error.status === 404 || /invalid|unknown|not found/i.test(message)) return "This invitation is invalid or no longer available. Ask the manufacturer owner for a new link.";
    if (/disabled|pending/i.test(message)) return "Invitation acceptance is temporarily unavailable. Contact the manufacturer owner; do not keep retrying.";
    return message || "We could not verify this invitation. Check your connection and try again.";
  };
  const statusCard = (title, message, kind) => {
    const card = el("section", "invite-card");
    const heading = el("div", "invite-heading");
    heading.append(el("div", "eyebrow", kind === "error" ? "INVITATION UNAVAILABLE" : "MANUFACTURER ERP"));
    heading.append(el("h1", "", title), el("p", "", message));
    card.append(heading);
    return card;
  };
  const showVerificationError = (error) => {
    const card = statusCard("Invitation could not be verified", errorCopy(error), "error");
    const link = el("a", "signin-link", "Go to factory sign in");
    link.href = "/";
    card.append(link);
    setPage(card);
  };
  async function verifyInvite() {
    if (!token) {
      showVerificationError(new Error("This invitation link does not include a valid token."));
      return;
    }
    const card = el("section", "invite-card");
    const heading = el("div", "invite-heading");
    heading.append(el("div", "eyebrow", "VERIFYING INVITATION"));
    heading.append(el("h1", "", "Checking your access"), el("p", "", "Confirming this invitation with the manufacturer’s ERP."));
    card.append(heading);
    const skeleton = el("div", "skeleton-line");
    skeleton.style.width = "62%";
    card.append(skeleton, el("div", "skeleton-line"));
    setPage(card);
    try {
      const identity = await api("/api/deployment/invitation", { token });
      renderAcceptance(identity);
    } catch (error) {
      showVerificationError(error);
    }
  }
  function renderAcceptance(identity) {
    const card = el("section", "invite-card");
    const heading = el("div", "invite-heading");
    heading.append(el("div", "eyebrow", "ADMINISTRATOR INVITATION"));
    heading.append(el("h1", "", "Set up your sign-in"));
    heading.append(el("p", "", "Create the administrator password for this manufacturer’s ERP. Your password is sent only to that customer ERP—not to the Tamba owner control plane."));
    card.append(heading);
    const identityBox = el("div", "invite-identity");
    [
      ["Manufacturer", identity.companyName || "—"],
      ["Administrator email", identity.email || "—"],
      ["Financial year", identity.yearLabel || "—"]
    ].forEach(([label, value]) => {
      const fact = el("div");
      fact.append(el("div", "fact-label", label), el("div", "fact-value", value));
      identityBox.append(fact);
    });
    card.append(identityBox);
    const form = el("form", "invite-form");
    form.append(field("Password · at least 12 characters", "password", "password"));
    form.append(field("Confirm password", "confirmPassword", "password"));
    const message = el("div", "invite-message");
    message.setAttribute("role", "alert");
    const submit = el("button", "btn btn-primary", "Accept invitation");
    submit.type = "submit";
    submit.append(el("span", "", "→"));
    form.append(message, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      const password = form.elements.password.value;
      const confirmation = form.elements.confirmPassword.value;
      if (password.length < 12) {
        message.textContent = "Use a password with at least 12 characters.";
        form.elements.password.focus();
        return;
      }
      if (password !== confirmation) {
        message.textContent = "The passwords do not match.";
        form.elements.confirmPassword.focus();
        return;
      }
      busy = true;
      message.textContent = "";
      submit.disabled = true;
      try {
        // Credentials go only to this customer deployment's same-origin endpoint.
        const result = await api("/api/deployment/accept-invite", { token, password });
        const success = statusCard("You’re ready to sign in", result.message || "Your administrator account has been created. Sign in to the factory ERP to continue.", "success");
        const signIn = el("a", "signin-link", "Go to factory ERP sign in");
        let loginUrl = "/";
        try {
          const candidate = new URL(result.loginUrl || "/", location.origin);
          if (candidate.origin === location.origin) loginUrl = `${candidate.pathname}${candidate.search}${candidate.hash}`;
        } catch (_) { loginUrl = "/"; }
        signIn.href = loginUrl;
        success.append(signIn, el("p", "fine-print", "Your invitation does not sign you in automatically. Use the administrator email above and the password you just created."));
        setPage(success);
      } catch (error) {
        message.textContent = errorCopy(error);
        submit.disabled = false;
      } finally {
        busy = false;
      }
    });
    card.append(form, el("p", "fine-print", "This page is served by the manufacturer’s ERP deployment. Passwords are never sent to Tamba’s owner control plane."));
    setPage(card);
    form.elements.password.focus({ preventScroll: true });
  }

  verifyInvite();
})();
