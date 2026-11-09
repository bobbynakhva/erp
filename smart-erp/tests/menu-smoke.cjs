/* Exercise the real sidebar renderer in an isolated anonymous browser.
 * Only reveal its local DOM for layout checks; do not authenticate, bypass
 * server authorization, submit forms, or change business records.
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
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // No test action may mutate server data.
    await page.setRequestInterception(true);
    page.on("request", request => {
      const api = new URL(request.url()).pathname.startsWith("/api/");
      if (api && !["GET", "HEAD"].includes(request.method())) {
        return request.abort();
      }
      return request.continue();
    });
    await page.goto(base, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector("#year")?.options.length > 0);
    await page.evaluate(() => {
      document.querySelector("#login-window").hidden = true;
      document.querySelector("#main-window").hidden = false;
      const dashboard = document.querySelector("#dashboard-cockpit");
      dashboard.hidden = true;
      dashboard.style.display = "none";
      document.querySelector("#users").hidden = false;
    });

    async function assertFlyout() {
      await page.waitForFunction(() => {
        const el = document.querySelector("#popup");
        const r = el.getBoundingClientRect();
        return !el.hidden && r.width > 0 && r.left >= 7 && r.top >= 7 &&
          r.right <= document.documentElement.clientWidth - 7 &&
          r.bottom <= innerHeight - 7;
      });
      const result = await page.$eval("#popup", el => {
        const button = el.querySelector("button");
        const r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const style = getComputedStyle(button);
        return {
          width: el.getBoundingClientRect().width,
          visible: hit === button || button.contains(hit),
          alignment: style.justifyContent,
          display: style.display,
        };
      });
      assert.ok(result.width <= 245, "Flyout must not grow across the workspace");
      assert.equal(result.visible, true, "Menu labels must not sit behind an open form");
      assert.equal(result.alignment, "flex-start");
      assert.equal(result.display, "flex");
    }

    async function clickEntry(label) {
      for (const button of await page.$$("#popup button")) {
        const text = await button.evaluate(el => el.textContent.trim().replace(/\s+>/, ""));
        if (text === label) return button.click();
      }
      throw new Error(`Menu entry not found: ${label}`);
    }

    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => window.applyTheme(theme), theme);
      for (const [width, height] of [[1366, 680], [1024, 600], [768, 540]]) {
        await page.setViewport({ width, height });
        for (const panelId of ["users", "gst-reports", "audit-window", "traceability-window", "status"]) {
          await page.evaluate(panelId => {
            for (const id of ["users", "gst-reports", "audit-window", "traceability-window", "status"]) {
              document.getElementById(id).hidden = id !== panelId;
            }
            document.getElementById(panelId).style.display = "block";
          }, panelId);
        for (const category of await page.$$eval(".sidebar [data-menu]",
          buttons => buttons.map(button => button.dataset.menu))) {
          await page.click(`[data-menu="${category}"]`);
          await assertFlyout();
        }
        await page.click('[data-menu="master"]');
        await clickEntry("Admin");
        await assertFlyout();
        await page.screenshot({
          path: path.join(output, `menu-${theme}-${width}.jpg`),
        });
        // Clicking outside retains the existing dismissal behavior.
        await page.click(".app-brand");
        assert.equal(await page.$eval("#popup", el => el.hidden), true);
        }
      }
    }
    await page.evaluate(() => {
      for (const id of ["gst-reports", "audit-window", "traceability-window", "status"]) {
        document.getElementById(id).hidden = true;
      }
    });
    // Exercise the original leaf dispatcher, not a replacement menu.
    await page.$eval("#users", el => el.hidden = true);
    await page.click('[data-menu="master"]');
    await clickEntry("Admin");
    await clickEntry("Users");
    assert.equal(await page.$eval("#users", el => el.hidden), false);
    assert.equal(await page.$eval("#popup", el => el.hidden), true);
    await page.click('[data-menu="master"]');
    await page.click("#chevron");
    assert.equal(await page.$eval(".sidebar", el => el.hidden), true);
    assert.equal(await page.$eval("#popup", el => el.hidden), true);
    assert.deepEqual(errors, []);
    console.log("PASS: all sidebar categories and nested Admin flyouts stay readable, " +
      "above Users, GST, Audit, Traceability and User Status in light/dark " +
      "at 1366, 1024 and 768 widths; " +
      "User navigation, outside-click dismissal and sidebar collapse preserved.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
