/* Real menu/openers with browser-only read fixtures. No auth bypass is added
 * to the app, no credentials are used, and all server mutations are blocked.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");
const base = process.env.UI_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN && `https://${process.env.REPLIT_DEV_DOMAIN}`);
if (!base) throw new Error("Set UI_TEST_URL or REPLIT_DEV_DOMAIN.");
const output = path.resolve(__dirname, "../../generated-artifacts/ui-checks");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ||
      execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) {
        return request.abort();
      }
      const fixtures = {
        "/api/users": {
          right: 15, records: [{ userCode: 2, username: "WINDOW_TEST", password: "" }],
          names: ["WINDOW_TEST"],
        },
        "/api/iwo": {
          lists: { stores: [], customers: [], costs: [], whom: [], items: [], stock: [] },
          records: [], nextNo: "1",
        },
      };
      if (fixtures[pathname]) return request.respond({
        status: 200, contentType: "application/json",
        body: JSON.stringify(fixtures[pathname]),
      });
      return request.continue();
    });
    await page.goto(base, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.querySelector("#login-window").hidden = true;
      document.querySelector("#main-window").hidden = false;
      const dashboard = document.querySelector("#dashboard-cockpit");
      dashboard.hidden = true;
      dashboard.style.display = "none";
    });
    async function clickEntry(prefix) {
      for (const button of await page.$$("#popup button")) {
        if (await button.evaluate((el, text) => el.textContent.trim().startsWith(text), prefix)) {
          return button.click();
        }
      }
      throw new Error(`Missing menu entry: ${prefix}`);
    }
    async function openIwo() {
      await page.click('[data-menu="production"]');
      await clickEntry("Internal Work Order");
    }
    async function assertFront(frontId, backId) {
      await page.waitForFunction((frontId, backId) => {
        const front = document.getElementById(frontId);
        const back = document.getElementById(backId);
        return !front.hidden && !back.hidden &&
          Number(getComputedStyle(front).zIndex) > Number(getComputedStyle(back).zIndex);
      }, {}, frontId, backId);
      assert.equal(await page.evaluate((frontId, backId) => {
        const front = document.getElementById(frontId);
        const a = front.getBoundingClientRect();
        const b = document.getElementById(backId).getBoundingClientRect();
        const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
        const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
        return front.contains(document.elementFromPoint(x, y));
      }, frontId, backId), true, `${frontId} must actually paint above ${backId}`);
    }

    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => window.applyTheme(theme), theme);
      for (const [width, height] of [[1366, 760], [1024, 680]]) {
        await page.setViewport({ width, height });
        await page.click('[data-menu="master"]');
        await clickEntry("Admin");
        await clickEntry("Users");
        await page.waitForFunction(() =>
          document.querySelector("#user-name").value === "WINDOW_TEST");
        await page.$eval("#user-name", el => el.value = "unsaved-user-input");
        await openIwo();
        await assertFront("iwo", "users");
        assert.equal(await page.$eval("#user-name", el => el.value), "unsaved-user-input");
        await page.screenshot({
          path: path.join(output, `window-iwo-front-${theme}-${width}.jpg`),
        });

        // Maximized forms cover the older form. Focus still activates it without
        // rerunning its opener or replacing its unsaved values.
        await page.focus("#user-name");
        await assertFront("users", "iwo");
        await openIwo(); // Already-open window selected again from navigation.
        await assertFront("iwo", "users");
        await page.focus("#user-name");
        await assertFront("users", "iwo");
        assert.equal(await page.$eval("#user-name", el => el.value), "unsaved-user-input");
        await openIwo();
        await page.click("#iwo-close");
        await page.waitForFunction(() => document.querySelector("#iwo").hidden);
        assert.equal(await page.$eval("#users", el => el.hidden), false);

        // Body-mounted transaction windows also activate on visibility changes.
        await page.$eval("#invoice-mfg", el => { el.hidden = false; el.style.display = "block"; });
        await assertFront("invoice-mfg", "users");
        await page.$eval("#invoice-mfg", el => el.hidden = true);
        // Confirmation overlays stay above every normal window.
        await page.$eval("#info", el => el.hidden = false);
        assert.equal(await page.$eval("#info", el =>
          el.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2))), true);
        await page.$eval("#info", el => el.hidden = true);
        await page.click('[data-menu="master"]');
        assert.equal(await page.$eval("#popup button", el => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }), true, "Navigation remains above business windows");
        await page.click(".app-brand");
      }
    }
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector(".sidebar").hidden);
    await page.click("#chevron");
    await page.waitForFunction(() => !document.querySelector(".sidebar").hidden);
    await openIwo();
    await page.waitForFunction(() => document.querySelector(".sidebar").hidden);
    await assertFront("iwo", "users");
    assert.ok(await page.$eval("#iwo", el => el.getBoundingClientRect().width) > 350,
      "Phone form uses the full width, not the space left beside a permanent sidebar");
    await page.focus("#user-name");
    await assertFront("users", "iwo");
    assert.equal(await page.$eval("#user-name", el => el.value), "unsaved-user-input");
    assert.deepEqual(errors, []);
    console.log("PASS: Users -> Internal Work Order brings the new window forward; " +
      "focus activation, reselecting open windows, close/reveal, preserved inputs, " +
      "body-mounted forms, navigation and confirmation layers in light/dark at two widths; " +
      "phone drawer navigation and retained input after resize.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
