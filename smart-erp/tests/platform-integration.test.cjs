const assert = require("node:assert/strict");
const test = require("node:test");
const { createOwnerFixture, createCustomerFixture, pool } = require("./platform-fixture.cjs");
const { CustomerDeployment } = require("../platform/customer-deployment");
const { verifyPassword } = require("../platform/security");
const { initPlatform } = require("../platform/schema");

test("owner control and separate deployment handover", async t => {
  const owner = await createOwnerFixture();
  const customers = [];
  let cookie = "";
  const request = async (url, body, auth = cookie) => {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  const api = (path, body, auth) => request(owner.url + "/api/platform" + path, body, auth);
  let company, other, connection, invitation, customer;
  try {
    await t.test("ERP cookies do not grant owner access; bootstrap needs its own secret", async () => {
      assert.equal((await api("/companies", undefined, "smart_session=some-existing-user")).status, 401);
      assert.equal((await api("/session")).body.setupRequired, true);
      assert.equal((await api("/bootstrap", { email: "owner@example.invalid", password: "A-test-only-password-123!", bootstrapKey: "wrong" })).status, 403);
      const result = await api("/bootstrap", { email: "owner@example.invalid", password: "A-test-only-password-123!", bootstrapKey: owner.bootstrapKey });
      assert.equal(result.status, 200);
      cookie = result.cookie;
      assert.ok(cookie.startsWith("platform_owner_session="));
      assert.equal((await api("/session")).body.authenticated, true);
      assert.equal((await api("/bootstrap", { email: "other@example.invalid", password: "A-test-only-password-123!", bootstrapKey: owner.bootstrapKey })).status, 409);
      const stored = (await owner.database.query("SELECT password_hash FROM platform_owners")).rows[0].password_hash;
      assert.ok(stored.startsWith("scrypt$"));
      assert.ok(!stored.includes("A-test-only-password"));
    });
    await t.test("company creation is real but does not invent ready infrastructure", async () => {
      const result = await api("/companies", { name: "Pilot A", slug: "pilot-a", adminEmail: "admin-a@example.invalid", yearStart: 2027, plan: "Pilot" });
      assert.equal(result.status, 201);
      company = result.body.company;
      assert.equal(company.status, "provisioning");
      assert.equal(company.deploymentUrl, null);
      assert.equal((await api(`/companies/${company.id}/invitations`, {})).status, 409);
      assert.equal((await api("/companies", { name: "Duplicate", slug: "pilot-a", adminEmail: "a@example.invalid", yearStart: 2027, plan: "Pilot" })).status, 409);
      other = (await api("/companies", { name: "Pilot B", slug: "pilot-b", adminEmail: "admin-b@example.invalid", yearStart: 2026, plan: "Pilot" })).body.company;
      assert.equal((await api("/companies")).body.companies.length, 2);
    });
    await t.test("connection issues a one-time key; same owner deployment is rejected", async () => {
      assert.equal((await api(`/companies/${company.id}/connection`, { deploymentUrl: owner.url })).status, 400);
      connection = (await api(`/companies/${company.id}/connection`, { deploymentUrl: "http://127.0.0.1:45678" })).body;
      assert.ok(connection.deploymentKey);
      assert.equal(connection.configuration.ERP_COMPANY_ID, company.id);
      const detail = await api(`/companies/${company.id}`);
      assert.ok(!JSON.stringify(detail.body).includes(connection.deploymentKey));
    });
    await t.test("customer binds its own clean database and is blocked before an administrator exists", async () => {
      customer = await createCustomerFixture({
        controlUrl: owner.url, companyId: company.id, deploymentKey: connection.deploymentKey,
        configuredUrl: "http://127.0.0.1:45678"
      });
      customers.push(customer);
      await customer.start();
      assert.equal((await request(customer.url + "/api/erp-probe")).status, 503);
      assert.equal((await api(`/companies/${company.id}`)).body.company.status, "connected");
      assert.ok((await customer.database.query("SELECT password_stored FROM users")).rows[0].password_stored.startsWith("scrypt$"));
      const rebound = new CustomerDeployment({
        pool: customer.database, controlUrl: owner.url, companyId: other.id,
        deploymentKey: connection.deploymentKey, deploymentUrl: "http://127.0.0.1:45678", allowHttp: true
      });
      await assert.rejects(rebound.init(), /different manufacturer/);
      await assert.rejects(initPlatform(customer.database), /bound customer database/);
    });
    await t.test("invitations expire/revoke and secrets are never returned by list/detail", async () => {
      const first = await api(`/companies/${company.id}/invitations`, {});
      assert.equal(first.status, 200);
      const oldToken = new URLSearchParams(new URL(first.body.invitationUrl).hash.slice(1)).get("token");
      await owner.database.query("UPDATE platform_invitations SET expires_at=now()-interval '1 second' WHERE company_id=$1", [company.id]);
      assert.equal((await request(customer.url + "/api/deployment/invitation", { token: oldToken })).status, 410);
      invitation = (await api(`/companies/${company.id}/invitations`, {})).body;
      assert.equal((await request(customer.url + "/api/deployment/invitation", { token: oldToken })).status, 410);
      assert.ok(!JSON.stringify((await api(`/companies/${company.id}`)).body).includes(oldToken));
      const token = new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1)).get("token");
      const preview = await request(customer.url + "/api/deployment/invitation", { token });
      assert.equal(preview.body.email, "admin-a@example.invalid");
      assert.equal(preview.body.yearLabel, "2027-28");
    });
    await t.test("wrong company deployment cannot claim another company's invite", async () => {
      const secondConnection = (await api(`/companies/${other.id}/connection`, { deploymentUrl: "http://127.0.0.1:45679" })).body;
      const second = await createCustomerFixture({
        controlUrl: owner.url, companyId: other.id, deploymentKey: secondConnection.deploymentKey,
        configuredUrl: "http://127.0.0.1:45679"
      });
      customers.push(second);
      await second.start();
      const token = new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1)).get("token");
      assert.equal((await request(second.url + "/api/deployment/invitation", { token })).status, 410);
      assert.equal((await second.database.query("SELECT * FROM customer_deployment_binding")).rows[0].invitation_id, null);
    });
    await t.test("acceptance creates hashed admin, rights, year and onboarding only in its own database", async () => {
      const token = new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1)).get("token");
      assert.equal((await request(customer.url + "/api/deployment/accept-invite", { token, password: "short" })).status, 400);
      const result = await request(customer.url + "/api/deployment/accept-invite", { token, password: "Customer-only-password-123!" });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.ok, true);
      assert.equal((await request(customer.url + "/api/erp-probe")).status, 200);
      const user = (await customer.database.query("SELECT * FROM users WHERE year_label='2027-28'")).rows[0];
      assert.equal(user.username, "admin-a@example.invalid");
      assert.equal(await verifyPassword("Customer-only-password-123!", user.password_stored), true);
      const onboarding = (await customer.database.query("SELECT * FROM manufacturer_onboarding")).rows[0];
      assert.equal(onboarding.year_label, "2027-28");
      assert.equal(onboarding.completed_at, null);
      assert.equal(onboarding.draft.companyName, "Pilot A");
      assert.equal((await customer.database.query("SELECT level FROM user_right_values WHERE ctrl_key='mnuMisc' AND year_label='2027-28'")).rows[0].level, -1);
      const details = (await api(`/companies/${company.id}`)).body;
      assert.equal(details.company.status, "active");
      assert.ok(details.invitations[0].acceptedAt);
      assert.ok(!JSON.stringify(details).includes(user.password_stored));
      assert.equal((await request(customer.url + "/api/deployment/accept-invite", { token, password: "A-different-password-123!" })).status, 410);
      assert.equal((await api(`/companies/${company.id}/invitations`, {})).status, 409);
    });
    await t.test("suspension is enforced, reactivation works, stale leases fail closed", async () => {
      assert.equal((await api(`/companies/${company.id}/access`, { accessStatus: "suspended" })).status, 200);
      await customer.runtime.pulse();
      assert.equal((await request(customer.url + "/api/erp-probe")).status, 403);
      await api(`/companies/${company.id}/access`, { accessStatus: "active" });
      await customer.runtime.pulse();
      assert.equal((await request(customer.url + "/api/erp-probe")).status, 200);
      customer.runtime.expiresAt = Date.now() - 1;
      assert.equal((await request(customer.url + "/api/erp-probe")).status, 503);
      await customer.runtime.pulse();
      await customer.database.query("UPDATE manufacturer_onboarding SET completed_at=now()");
      await customer.runtime.pulse();
      assert.equal((await api(`/companies/${company.id}`)).body.company.onboardingCompleted, true);
    });
    await t.test("owner logout revokes access and expired sessions cannot reopen data", async () => {
      assert.equal((await api("/logout", {})).status, 200);
      assert.equal((await api("/companies")).status, 401);
      assert.equal((await api("/login", { email: "owner@example.invalid", password: "wrong" })).status, 401);
      const result = await api("/login", { email: "owner@example.invalid", password: "A-test-only-password-123!" });
      cookie = result.cookie;
      assert.equal((await api("/companies")).status, 200);
      await owner.database.query("UPDATE platform_sessions SET expires_at=now()-interval '1 second'");
      assert.equal((await api("/companies")).status, 401);
    });
  } finally {
    for (const fixture of customers) await fixture.close();
    await owner.close();
    await pool.end();
  }
});
