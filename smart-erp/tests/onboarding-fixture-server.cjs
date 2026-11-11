/* Isolated UI test harness, never mounted by server.js.
 * Same onboarding handlers and assets; all writes go to a disposable schema.
 * The simulated administrator exists only inside this harness, not the ERP. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pool } = require("../db");
const { initOnboarding, createOnboarding } = require("../onboarding-engine");
const root = path.join(__dirname, "../public");

async function createFixture() {
  const db = await pool.connect();
  const schema = "onboarding_ui_" + crypto.randomBytes(8).toString("hex");
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema}, pg_catalog`);
  await db.query(`
    CREATE TABLE factories (id integer PRIMARY KEY, name text, gstin text, state_code text, state_name text);
    CREATE TABLE misc (factory_id integer REFERENCES factories(id), year_label text,
      print_head text, print_short_addr text, my_pan_no text, prefix_quote text,
      prefix_po text, prefix_wo text, prefix_enq text, book_type smallint,
      book_type_inv smallint, PRIMARY KEY(factory_id,year_label));
    CREATE TABLE sessions (factory_id integer, year_label text, book_type smallint, book_type_inv smallint);
    INSERT INTO factories VALUES (1,'New manufacturer','','','');
    INSERT INTO sessions VALUES (1,'2026-27',NULL,NULL);
  `);
  const session = { factory_id: 1, year_label: "2026-27", user_code: 1, role_key: "PLANT_MANAGER" };
  const database = {
    query: (...args) => db.query(...args),
    connect: async () => ({ query: (...args) => db.query(...args), release() {} })
  };
  await initOnboarding(database, { newFactoryId: 1, yearLabel: "2026-27" });
  const sendJson = (res, code, data) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  const handle = createOnboarding({
    pool: database, openSession: async () => session,
    loadRights: async () => ({ mnuMisc: 12 }), sendJson,
    readBody: async req => {
      let body = "";
      for await (const chunk of req) body += chunk;
      return JSON.parse(body || "{}");
    }
  });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://fixture.invalid");
      if (url.pathname === "/api/onboarding") return await handle(req, res);
      if (url.pathname === "/") {
        const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/modern-theme.css">
          <link rel="stylesheet" href="/onboarding.css"><title>Isolated onboarding test</title></head>
          <body><div id="main-window"><header class="main-bar"><span>Tamba ERP</span>
          <div><button id="btn-toggle-dashboard">Dashboard</button></div></header>
          <main><h1>Isolated test workspace</h1><p>No live customer records are used.</p></main></div>
          <script src="/onboarding.js"></script><script>manufacturerOnboarding.check()</script></body></html>`;
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(html);
      }
      const allowed = new Set(["/styles.css", "/modern-theme.css", "/onboarding.css", "/onboarding.js"]);
      if (!allowed.has(url.pathname)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": url.pathname.endsWith(".js") ? "text/javascript" : "text/css" });
      res.end(fs.readFileSync(path.join(root, url.pathname)));
    } catch (err) {
      console.error("Fixture failure:", err.code || err.name);
      sendJson(res, 500, { error: "Isolated fixture failed." });
    }
  });
  async function close() {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await db.query("ROLLBACK");
    await db.query("RESET search_path");
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    db.release();
    await pool.end();
  }
  return { server, close };
}

if (require.main === module) {
  createFixture().then(({ server, close }) => {
    server.listen(3002, "0.0.0.0", () => console.log("Isolated onboarding UI fixture ready on port 3002"));
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => close().then(() => process.exit(0)));
    }
  }).catch(error => { console.error("Fixture startup failed:", error.code || error.name); process.exit(1); });
}
module.exports = { createFixture };
