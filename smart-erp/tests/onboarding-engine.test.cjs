/* Real PostgreSQL integration in a disposable schema. No existing business
 * tables, users, credentials or records are read or changed. */
const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const { pool } = require("../db");
const { initOnboarding, createOnboarding, canManage, normalizeDraft } = require("../onboarding-engine");

test("manufacturer onboarding validation and permission boundary", () => {
  assert.equal(canManage({ role_key: "PLANT_MANAGER" }, { mnuMisc: 12 }), true);
  assert.equal(canManage({ role_key: "PLANT_MANAGER" }, { mnuMisc: -1 }), true);
  for (const rights of [null, {}, { mnuMisc: 0 }, { mnuMisc: 1 }, { mnuMisc: 3 }]) {
    assert.equal(canManage({ role_key: "PLANT_MANAGER" }, rights), false);
  }
  assert.equal(canManage({ role_key: "ACCOUNTS_BILLING" }, { mnuMisc: 12 }), false);
  assert.throws(() => normalizeDraft({}), /highlighted/);
});

test("setup persistence, atomic completion, isolation and compatibility", async t => {
  const db = await pool.connect();
  const schema = "onboarding_test_" + crypto.randomBytes(8).toString("hex");
  let session = { factory_id: 1, year_label: "2026-27", user_code: 1, role_key: "PLANT_MANAGER" };
  let rights = { mnuMisc: 12 };
  let failComplete = false;
  let failTriggered = false;
  const scopedPool = {
    query: (...args) => db.query(...args),
    connect: async () => ({
      query: (sql, values) => {
        if (failComplete && sql.includes("UPDATE manufacturer_onboarding SET")) {
          failTriggered = true;
          throw Object.assign(new Error("Injected final-write failure"), { code: "TEST_FAILURE" });
        }
        return db.query(sql, values);
      },
      release() {}
    })
  };
  const handler = createOnboarding({
    pool: scopedPool, openSession: async () => session, loadRights: async () => rights,
    readBody: async req => req.body,
    sendJson: (_, status, body) => ({ status, body })
  });
  const call = (body, headers = {}) => handler({ method: body ? "POST" : "GET", body, headers }, {});
  let state;
  const goodDraft = {
    companyName: "Integration Factory", address: "Test industrial estate",
    phone: "+91 0000000000", email: "test@example.invalid",
    gstRegistered: false, gstin: "", pan: "", stateCode: "29",
    prefixQuote: "QT", prefixPo: "PO", prefixWo: "WO", prefixEnq: "ENQ",
    bookType: 2, bookTypeInv: 2
  };
  try {
    await db.query(`CREATE SCHEMA ${schema}`);
    // No public fallback: accidental unqualified reads fail instead of touching live data.
    await db.query(`SET search_path TO ${schema}, pg_catalog`);
    await db.query(`
      CREATE TABLE factories (id integer PRIMARY KEY, name text, gstin text, state_code text, state_name text);
      CREATE TABLE misc (
        factory_id integer REFERENCES factories(id), year_label text, print_head text,
        print_short_addr text, my_pan_no text, prefix_quote text, prefix_po text,
        prefix_wo text, prefix_enq text, book_type smallint, book_type_inv smallint,
        roff_sales boolean DEFAULT false, PRIMARY KEY(factory_id,year_label));
      CREATE TABLE sessions (factory_id integer, year_label text, book_type smallint, book_type_inv smallint);
      INSERT INTO factories VALUES (1,'Before setup','','29','Karnataka'),(2,'Other factory','','27','Maharashtra');
      INSERT INTO sessions VALUES (1,'2026-27',NULL,NULL);
      INSERT INTO misc VALUES (2,'2026-27','Existing heading','Existing address','', 'OLD','PP','WW','EE',3,1,true);
    `);
    await initOnboarding(scopedPool);
    await t.test("existing installation is not automatically enrolled", async () => {
      state = await call();
      assert.equal(state.body.required, false);
      assert.equal(state.body.canManage, true);
      assert.equal((await db.query("SELECT count(*)::int n FROM manufacturer_onboarding")).rows[0].n, 0);
    });
    await t.test("anonymous and non-administrators cannot read or mutate setup", async () => {
      const admin = session;
      session = null;
      assert.equal((await call()).status, 401);
      session = { ...admin, role_key: "ACCOUNTS_BILLING" };
      assert.deepEqual((await call()).body, { canManage: false, required: false, completed: false });
      assert.equal((await call({ action: "start" })).status, 403);
      session = admin;
      rights = {};
      assert.equal((await call({ action: "start" })).status, 403);
      rights = { mnuMisc: 12 };
    });
    await t.test("cross-origin changes and unknown actions are rejected", async () => {
      assert.equal((await call({ action: "start" }, { origin: "https://external.invalid", host: "erp.invalid" })).status, 403);
      assert.equal((await call({ action: "invent" })).status, 400);
    });
    await t.test("start and draft saves do not change business settings", async () => {
      state = await call({ action: "start" });
      assert.equal(state.body.required, true);
      assert.equal(state.body.version, 1);
      const saved = await call({ action: "save", version: 1, step: 1, draft: goodDraft });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.step, 1);
      assert.equal(saved.body.version, 2);
      assert.equal(saved.body.draft.companyName, "Integration Factory");
      assert.equal((await db.query("SELECT name FROM factories WHERE id=1")).rows[0].name, "Before setup");
      assert.equal((await db.query("SELECT * FROM misc WHERE factory_id=1")).rowCount, 0);
      state = await call();
      assert.equal(state.body.step, 1);
      assert.equal(state.body.draft.address, goodDraft.address);
    });
    await t.test("stale versions, invalid steps, GST mismatch and missing confirmation fail safely", async () => {
      assert.equal((await call({ action: "save", version: 1, step: 2, draft: goodDraft })).status, 409);
      assert.equal((await call({ action: "save", version: 2, step: 7, draft: goodDraft })).status, 400);
      assert.equal((await call({ action: "complete", version: 2, step: 3, draft: goodDraft })).status, 400);
      const mismatch = await call({
        action: "complete", version: 2, step: 3, confirmed: true,
        draft: { ...goodDraft, gstRegistered: true, gstin: "27ABCDE1234F1Z5", stateCode: "29" }
      });
      assert.equal(mismatch.status, 400);
      assert.ok(mismatch.body.fields.gstin);
      assert.equal((await call()).body.version, 2);
    });
    await t.test("failure after settings writes rolls back the complete operation", async () => {
      failComplete = true;
      assert.equal((await call({ action: "complete", version: 2, step: 3, confirmed: true, draft: goodDraft })).status, 500);
      failComplete = false;
      assert.ok(failTriggered);
      assert.equal((await db.query("SELECT name FROM factories WHERE id=1")).rows[0].name, "Before setup");
      assert.equal((await db.query("SELECT * FROM misc WHERE factory_id=1")).rowCount, 0);
      assert.equal((await call()).body.version, 2);
    });
    await t.test("completion applies scoped settings, survives restart and cannot replay", async () => {
      const result = await call({ action: "complete", version: 2, step: 3, confirmed: true, draft: goodDraft });
      assert.equal(result.status, 200);
      assert.equal(result.body.completed, true);
      const company = (await db.query("SELECT * FROM factories WHERE id=1")).rows[0];
      assert.equal(company.name, goodDraft.companyName);
      assert.equal(company.gstin, "");
      const config = (await db.query("SELECT * FROM misc WHERE factory_id=1")).rows[0];
      assert.equal(config.book_type, 2);
      assert.equal(config.prefix_quote, "QT");
      assert.ok(config.print_head.includes(goodDraft.email));
      assert.equal((await db.query("SELECT book_type_inv FROM sessions WHERE factory_id=1")).rows[0].book_type_inv, 2);
      await initOnboarding(scopedPool);
      assert.equal((await call()).body.completed, true);
      assert.equal((await call({ action: "start" })).status, 409);
      assert.equal((await db.query("SELECT name FROM factories WHERE id=2")).rows[0].name, "Other factory");
    });
    await t.test("existing configuration and unrelated fields are preserved", async () => {
      session = { ...session, factory_id: 2 };
      assert.equal((await call()).body.required, false);
      await call({ action: "start" });
      const result = await call({ action: "complete", version: 1, step: 3, confirmed: true, draft: goodDraft });
      assert.equal(result.status, 200);
      const config = (await db.query("SELECT * FROM misc WHERE factory_id=2")).rows[0];
      assert.equal(config.prefix_quote, "OLD");
      assert.equal(config.book_type, 3);
      assert.equal(config.book_type_inv, 1);
      assert.equal(config.roff_sales, true);
      assert.equal(config.print_short_addr, goodDraft.address);
    });
    await t.test("newly provisioned manufacturer is auto-enrolled only once", async () => {
      await db.query("INSERT INTO factories VALUES (3,'New account',NULL,NULL,NULL)");
      await initOnboarding(scopedPool, { newFactoryId: 3, yearLabel: "2026-27" });
      session = { ...session, factory_id: 3 };
      state = await call();
      assert.equal(state.body.required, true);
      assert.equal(state.body.draft.companyName, "");
      assert.equal(state.body.draft.gstRegistered, false);
      await initOnboarding(scopedPool, { newFactoryId: 3, yearLabel: "2026-27" });
      assert.equal((await call()).body.version, 1);
      session = { ...session, year_label: "2025-26" };
      assert.equal((await call()).status, 409);
    });
  } finally {
    await db.query("ROLLBACK");
    await db.query("RESET search_path");
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    db.release();
    await pool.end();
  }
});
