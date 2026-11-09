/* Signed-out browser checks plus isolated, script-free source layout fixtures.
 * No authentication bypass or test route is added to the application.
 * The login POST is intercepted in this test browser only, so no credentials
 * are sent and no login/audit records are written by the test.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const base = process.env.UI_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN && `https://${process.env.REPLIT_DEV_DOMAIN}`);
if (!base) throw new Error("Set UI_TEST_URL or REPLIT_DEV_DOMAIN.");
const output = path.resolve(root, "../generated-artifacts/ui-checks");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ||
      execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    let attemptedLogin;
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (new URL(request.url()).pathname === "/api/login" &&
          request.method() === "POST") {
        attemptedLogin = JSON.parse(request.postData());
        return request.respond({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "UI test: rejected sign-in" }),
        });
      }
      return request.continue();
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#year")?.options.length > 0);
    assert.equal(await page.$eval("#main-window", el => getComputedStyle(el).display), "none");
    assert.equal(await page.$eval("#login-window", el => getComputedStyle(el).display), "flex");
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.$eval("#username", el => el.getBoundingClientRect().height), 52);
    assert.equal(await page.$eval("#login-button",
      el => getComputedStyle(el).justifyContent), "space-between");
    assert.equal(await page.$eval(".tamba-app-footer",
      el => getComputedStyle(el).display), "none");

    // Existing License dialog must still cover the viewport, not the photo card.
    await page.click("#license");
    await page.waitForFunction(() => !document.querySelector("#license-modal").hidden);
    const modal = await page.$eval("#license-modal", el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    });
    assert.deepEqual(modal, { x: 0, y: 0, w: 1440, h: 1000 });
    await page.click("#cmdExit");
    await page.waitForFunction(() => document.querySelector("#license-modal").hidden);

    await page.focus("#username");
    await page.keyboard.type("UIAUDIT");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "password");
    await page.keyboard.type("test-only");
    await page.click("#login-button");
    await page.waitForFunction(() =>
      document.querySelector("#login-message").textContent.includes("UI test"));
    assert.deepEqual(Object.keys(attemptedLogin).sort(),
      ["confirmPreviousYear", "password", "username", "yearLabel"]);
    assert.equal(await page.evaluate(() => document.activeElement.id), "password");
    assert.equal(await page.$eval("#main-window", el => el.hidden), true);
    await page.evaluate(() => window.applyTheme("dark"));
    assert.equal(await page.$eval("#username", el => getComputedStyle(el).backgroundColor),
      "rgb(255, 255, 255)");
    await page.evaluate(() => window.applyTheme("light"));

    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth), true);
    for (const id of ["year", "username", "password", "login-button"]) {
      const bounds = await page.$eval(`#${id}`, el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height };
      });
      assert.ok(bounds.left >= 0 && bounds.right <= 390 && bounds.height >= 44, id);
    }
    assert.deepEqual(errors, []);
    console.log("PASS: live year data, login layout, mobile controls, License dialog, " +
      "keyboard flow, rejected-login contract, error focus and theme isolation.");

    // These fixtures exercise real HTML/CSS, but do not claim signed-in live
    // workflow verification. No scripts or API/authentication calls run here.
    await page.close();
    const fixture = await browser.newPage();
    await fixture.setViewport({ width: 1440, height: 1000 });
    const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace("<head>", `<head><base href="${base}/">`);
    await fixture.setContent(html, { waitUntil: "networkidle0" });
    await fixture.evaluate(() => {
      document.querySelector("#login-window").hidden = true;
      document.querySelector("#main-window").hidden = false;
    });
    assert.equal(await fixture.$eval(".premium-login-shell",
      el => getComputedStyle(el).display), "none");
    await fixture.$eval(".sidebar", el => el.hidden = true);
    assert.equal(await fixture.$eval(".sidebar", el => getComputedStyle(el).display), "none");
    await fixture.$eval(".sidebar", el => el.hidden = false);
    for (const theme of ["light", "dark"]) {
      await fixture.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await fixture.screenshot({ path: path.join(output, `dashboard-${theme}.jpg`) });
      for (const [id, grid] of [
        ["company", ".company-grid"],
        ["customer", ".customer-grid"],
        ["invoice-mfg", ".invmfg-panels"],
      ]) {
        await fixture.$eval(`#${id}`, el => el.hidden = false);
        const layout = await fixture.$eval(`#${id} ${grid}`, el => ({
          display: getComputedStyle(el).display,
          columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
        }));
        assert.equal(layout.display, "grid", `${id}: grid layout`);
        assert.equal(layout.columns, 2, `${id}: existing two-column layout`);
        if (id === "company") {
          assert.ok(await fixture.$eval("#company",
            el => el.clientWidth > 720), "Company window accommodates its original columns");
          assert.equal(await fixture.$eval("#company", el => {
            const rect = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(rect.left + 20, rect.top + 20));
          }), true, "Company must appear above the dashboard");
        }
        if (id === "invoice-mfg" && theme === "dark") {
          assert.notEqual(await fixture.$eval("#invoice-mfg .invmfg-field label",
            el => getComputedStyle(el).color), "rgb(0, 0, 0)", "Dark labels must be readable");
          assert.notEqual(await fixture.$eval("#invoice-mfg .invmfg-grid-wrap",
            el => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)",
          "Dark grid container must not remain white");
          assert.notEqual(await fixture.$eval("#invmfg-supply-nature",
            el => getComputedStyle(el).color), "rgb(0, 102, 204)",
          "Supply-nature metadata must use a readable dark-mode color");
        }
        await fixture.screenshot({ path: path.join(output, `${id}-${theme}.jpg`) });
        await fixture.$eval(`#${id}`, el => el.hidden = true);
      }
    }
    console.log("PASS: script-free source fixtures preserve Company, Customer and " +
      "Manufacturing Invoice grids in light/dark; login wrapper follows original hidden state.");
    console.log(`Layout screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
