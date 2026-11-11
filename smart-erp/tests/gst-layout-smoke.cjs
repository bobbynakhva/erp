/* Exercise the actual GST renderer with browser-intercepted data only.
 * Reconciliation POSTs never reach the server; all other mutations are blocked.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");
const base = process.env.UI_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
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
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true,
        value: { writeText: async text => { window.copiedFixtureNotice = text; } } });
    });
    await page.setRequestInterception(true);
    page.on("request", request => {
      const pathname = new URL(request.url()).pathname;
      let fixture;
      if (pathname.startsWith("/api/gst/reports/")) fixture = {
        ok: true, invoices: [], rows: [], totals: {}, summary: {},
      };
      if (pathname === "/api/gst/reconcile-2b") fixture = {
        ok: true, totalCount: 1,
        summary: { totalTaxable: 8000, matchedCount: 0, mismatchCount: 0,
          notIn2bCount: 1, notInBooksCount: 0, notIn2bItc: 1440 },
        items: [{ status: "NOT_IN_2B", vendorName: "Example Components Ltd",
          vendorGstin: "TEST-GSTIN", invNo: "INV-TEST-001", invDate: "2026-11-01",
          booksGst: 1440, portalGst: 0, diffGst: 1440, booksTotalVal: 9440,
          actionRequired: "Supplier follow-up: request vendor to file GSTR-1" }],
      };
      if (fixture) return request.respond({ status: 200, contentType: "application/json",
        body: JSON.stringify(fixture) });
      if (pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) {
        return request.abort();
      }
      return request.continue();
    });
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(base, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.querySelector("#login-window").hidden = true;
      document.querySelector("#main-window").hidden = false;
      document.querySelector("#dashboard-cockpit").style.display = "none";
      window.openGstReports();
    });
    await page.waitForFunction(() =>
      document.querySelector("#gst-report-status").textContent.includes("GSTR-1 Ready"));
    await page.click("#gst-tab-gstr2b");
    await page.waitForSelector(".gst-btn-copy-notice");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => window.applyTheme(theme), theme);
      for (const [width, height] of [[1366, 900], [1024, 768], [768, 700], [390, 844]]) {
        await page.setViewport({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.$eval("#gst-reports", el => el.scrollTop = 0);
        if (width < 640) {
          await page.waitForFunction(() => document.querySelector(".sidebar").hidden);
          await page.click("#chevron");
        }
        const utilities = (await page.$$(".sidebar button[data-menu]"));
        for (const button of utilities) {
          if (await button.evaluate(el => el.textContent.trim() === "Utilities")) {
            await button.click();
            break;
          }
        }
        assert.equal(await page.$eval("#popup button", button => {
          const r = button.getBoundingClientRect();
          return button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }), true, "Utilities flyout must paint above the populated GST report");
        await page.click(".app-brand");
        if (width < 640) await page.click("#chevron");
        await page.$eval(".gst-btn-copy-notice", button =>
          button.scrollIntoView({ block: "center", inline: "end" }));
        const result = await page.$eval(".gst-btn-copy-notice", button => {
          const r = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          const range = document.createRange();
          range.selectNodeContents(button);
          return { width: r.width, height: r.height, whiteSpace: style.whiteSpace,
            textLines: range.getClientRects().length,
            reachable: button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
            fits: button.scrollWidth <= button.clientWidth + 1 };
        });
        assert.ok(result.width >= 104 && result.height < 48, JSON.stringify(result));
        assert.equal(result.whiteSpace, "nowrap");
        assert.equal(result.textLines, 1);
        assert.equal(result.reachable, true);
        assert.equal(result.fits, true);
        await page.screenshot({ path: path.join(output, `gst-reconciliation-${theme}-${width}.jpg`) });
      }
    }
    await page.click(".gst-btn-copy-notice");
    await page.waitForFunction(() => window.copiedFixtureNotice?.includes("INV-TEST-001"));
    assert.match(await page.evaluate(() => window.copiedFixtureNotice), /Example Components Ltd/);
    assert.deepEqual(errors, []);
    console.log("PASS: populated GSTR-2B report keeps Utilities above the form and Copy Notice " +
      "on one reachable line at desktop/tablet/phone widths in light/dark; copy action preserved.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
