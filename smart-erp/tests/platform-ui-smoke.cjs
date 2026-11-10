const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");
const { createOwnerFixture, createCustomerFixture, pool } = require("./platform-fixture.cjs");
const { randomToken } = require("../platform/security");

(async () => {
  const owner = await createOwnerFixture();
  let customer;
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"], headless: true
  });
  const output = path.resolve(__dirname, "../../generated-artifacts/ui-checks");
  fs.mkdirSync(output, { recursive: true });
  let stage = "owner bootstrap";
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    await page.setViewport({ width: 1366, height: 900 });
    const fill = async (name, value) => {
      await page.$eval(`[name="${name}"]`, (el, value) => {
        el.value = value; el.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
    };
    const click = async label => {
      const button = await page.waitForFunction(label =>
        [...document.querySelectorAll("button")].find(el => el.textContent.trim().startsWith(label)), {}, label);
      await button.asElement().click();
      await button.dispose();
    };
    await page.goto(owner.url + "/owner", { waitUntil: "networkidle0" });
    await page.waitForSelector('[name="bootstrapKey"]');
    await fill("email", "owner-ui@example.invalid");
    await fill("password", "Owner-ui-test-password-123!");
    await fill("bootstrapKey", owner.bootstrapKey);
    await page.click('form button[type="submit"]');
    await page.waitForSelector("#page-content");
    stage = "company creation";
    await page.screenshot({ path: path.join(output, "owner-empty-desktop.jpg") });
    await click("Add manufacturer");
    await page.waitForSelector('[name="adminEmail"]');
    await fill("name", "Pilot Works");
    await fill("slug", "pilot-works");
    await fill("adminEmail", "admin-ui@example.invalid");
    await fill("yearStart", "2026");
    await page.select('[name="plan"]', "pilot");
    const createResponse = page.waitForResponse(r => r.url().endsWith("/api/platform/companies") && r.request().method() === "POST");
    await page.click('form button[type="submit"]');
    const company = (await (await createResponse).json()).company;
    await page.waitForFunction(() => location.hash.includes("company/"));
    await page.waitForFunction(() => document.querySelector(".detail-heading h1")?.textContent === "Pilot Works");
    assert.match(await page.$eval("#page-content", el => el.textContent), /Provisioning|Not connected|Not configured/);
    customer = await createCustomerFixture({
      controlUrl: owner.url, companyId: company.id, deploymentKey: randomToken(),
      configuredUrl: "https://pilot-works.example.invalid"
    });
    stage = "deployment connection";
    await click("Configure connection");
    await page.waitForSelector('dialog[open] [name="deploymentUrl"]');
    await fill("deploymentUrl", customer.runtime.deploymentUrl);
    const connectionResponse = page.waitForResponse(r => r.url().endsWith("/connection") && r.request().method() === "POST");
    await page.click('dialog[open] form button[type="submit"]');
    const connection = await (await connectionResponse).json();
    assert.ok(connection.deploymentKey);
    // Simulate operator configuring the customer's environment with the key
    // shown once in the UI. No production key or infrastructure is used.
    customer.runtime.deploymentKey = connection.deploymentKey;
    await customer.start();
    await page.evaluate(() => document.querySelector("dialog").close());
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(".detail-heading");
    await page.screenshot({ path: path.join(output, "owner-company-desktop.jpg") });
    stage = "invitation creation";
    await click("Create invitation");
    await page.waitForSelector('dialog[open] input[readonly]');
    const link = await page.$eval('dialog[open] input[readonly]', el => el.value);
    assert.ok(link.startsWith(customer.runtime.deploymentUrl + "/accept-invite#token="));
    await page.evaluate(() => document.querySelector("dialog").close());
    const invitePage = await browser.newPage();
    invitePage.setDefaultTimeout(12000);
    invitePage.on("pageerror", error => errors.push(error.message));
    const inviteRequests = [];
    invitePage.on("request", req => inviteRequests.push(req.url()));
    await invitePage.setViewport({ width: 390, height: 844 });
    stage = "customer invitation acceptance";
    await invitePage.goto(link.replace(customer.runtime.deploymentUrl, customer.url), { waitUntil: "networkidle0" });
    await invitePage.waitForSelector('[name="password"]');
    assert.equal(await invitePage.evaluate(() => location.hash), "");
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
    // CDP's navigation event retains the browser fragment; HTTP never sends it.
    assert.ok(inviteRequests.every(url => !url.split("#")[0].includes(token)), "Bearer token never appears in HTTP request URLs");
    assert.match(await invitePage.$eval("#invite-app", el => el.textContent), /Pilot Works/);
    await invitePage.screenshot({ path: path.join(output, "owner-invitation-mobile.jpg") });
    await invitePage.$eval("form", el => {
      el.elements.password.value = "Customer-ui-test-password-123!";
      el.elements.confirmPassword.value = "Different-password-123!";
      el.requestSubmit();
    });
    await invitePage.waitForFunction(() => document.querySelector(".invite-message")?.textContent.includes("do not match"));
    stage = "customer password submission";
    await invitePage.$eval("form", el => {
      el.elements.confirmPassword.value = "Customer-ui-test-password-123!";
      el.requestSubmit();
    });
    await invitePage.waitForSelector(".signin-link");
    stage = "owner accepted status";
    assert.equal(await invitePage.$eval(".signin-link", el => new URL(el.href).origin), customer.url);
    await page.bringToFront();
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(".detail-heading");
    assert.match(await page.$eval("#page-content", el => el.textContent), /Accepted|Active/);
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, "owner-company-mobile.jpg") });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "Owner details fit phone width");
    stage = "access suspension";
    await click("Suspend access");
    await page.waitForFunction(() => document.querySelector("#page-content")?.textContent.includes("Suspended"));
    await customer.runtime.pulse();
    assert.throws(() => customer.runtime.assertAccess(), /suspended/);
    await click("Reactivate access");
    await page.waitForFunction(() => !document.querySelector("#page-content")?.textContent.includes("Suspended"));
    await customer.runtime.pulse();
    customer.runtime.assertAccess();
    await page.setViewport({ width: 1366, height: 900 });
    await page.screenshot({ path: path.join(output, "owner-active-desktop.jpg") });
    assert.deepEqual(errors, []);
    console.log("PASS: owner bootstrap, real company creation/connection, invitation handover,");
    console.log("customer password confirmation/acceptance, URL token hygiene, phone layout,");
    console.log("suspension and reactivation through real isolated PostgreSQL-backed deployments.");
  } catch (error) {
    error.message = `At ${stage}: ${error.message}`;
    console.error(error.message);
    throw error;
  } finally {
    await browser.close();
    if (customer) await customer.close();
    await owner.close();
    await pool.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
