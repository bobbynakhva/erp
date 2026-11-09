import "./_group.css";

export function Current() {
  return (
    <main className="erp-current-shell">
      <section id="login-window" className="login-window" aria-label="Tamba ERP login">
        <header className="banner">
          <div className="banner-title">
            <span className="word-smart">Tamba ERP</span>
          </div>
        </header>

        <button id="license" type="button" className="license">
          License
        </button>

        <form
          id="login-form"
          className="login-form"
          autoComplete="off"
          onSubmit={(event) => event.preventDefault()}
        >
          <select id="year" name="year" aria-label="Accounting year" defaultValue="2026-27">
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
            <option value="2026-27">2026-27</option>
          </select>
          <label className="field">
            <span>User Name</span>
            <input id="username" name="username" list="user-list" />
            <datalist id="user-list" />
          </label>
          <label className="field">
            <span>Password</span>
            <input id="password" name="password" />
          </label>
          <button id="login-button" type="submit">
            Login
          </button>
        </form>

        <p id="login-message" className="login-message" role="status" />
        <div className="login-footer">
          <span>
            Tamba ERP developed by{" "}
            <a href="https://www.simplydigitalthings.com" target="_blank" rel="noreferrer">
              simplydigitalthings.com
            </a>
          </span>
        </div>
      </section>
    </main>
  );
}
