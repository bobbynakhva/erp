import { useState, type FormEvent } from "react";
import "./Premium.css";

export function Premium() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Sign-in is not connected in this preview.");
  }

  return (
    <main className="erp-premium-shell">
      <section className="premium-layout" aria-label="Tamba ERP login">
        <aside className="premium-editorial" aria-label="Tamba ERP">
          <div className="editorial-photo" role="img" aria-label="Precision machining workshop" />
          <div className="editorial-wash" />
          <div className="editorial-topline">
            <div className="tamba-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="editorial-wordmark">Tamba<span>ERP</span></span>
            <span className="editorial-index">01 / 01</span>
          </div>
          <div className="editorial-copy">
            <span className="editorial-kicker"><i /> BUILT FOR THE FLOOR</span>
            <h1>Precision<br />in every<br /><em>process.</em></h1>
            <p>A clearer view of the work that moves manufacturing forward.</p>
          </div>
          <div className="editorial-caption">
            <span>SHOP FLOOR / 06:42</span>
            <span className="caption-rule" />
            <span>OPERATIONS IN FOCUS</span>
          </div>
        </aside>

        <section className="premium-credentials">
          <div className="credential-topline">
            <span className="secure-label"><span className="secure-dot" /> WORKSPACE ACCESS</span>
            <button
              id="license"
              type="button"
              className="license-link"
              onClick={() => setMessage("License details are not available in this preview.")}
            >
              License <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="credential-content">
            <div className="form-heading">
              <span className="form-eyebrow">TAMBA ERP / SIGN IN</span>
              <h2>Welcome back.</h2>
              <p>Enter your details to continue to your workspace.</p>
            </div>

            <form
              id="login-form"
              className="login-form"
              autoComplete="off"
              onSubmit={handleSubmit}
            >
              <label className="year-label" htmlFor="year">ACCOUNTING YEAR</label>
              <div className="year-control">
                <select id="year" name="year" aria-label="Accounting year" defaultValue="2026-27">
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                </select>
                <span className="select-chevron" aria-hidden="true">⌄</span>
              </div>

              <label className="field">
                <span>User Name</span>
                <input id="username" name="username" list="user-list" autoComplete="username" />
                <datalist id="user-list" />
              </label>
              <label className="field">
                <span>Password</span>
                <input id="password" name="password" type="password" autoComplete="current-password" />
              </label>

              <button id="login-button" type="submit">
                <span>Login</span>
                <span className="login-arrow" aria-hidden="true">→</span>
              </button>
            </form>
            <p id="login-message" className="login-message" role="status" aria-live="polite">{message}</p>
          </div>

          <footer className="login-footer">
            <span>Tamba ERP developed by</span>
            <a href="https://www.simplydigitalthings.com" target="_blank" rel="noreferrer">
              simplydigitalthings.com
            </a>
            <span className="footer-mark" aria-hidden="true">T</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
