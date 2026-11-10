/* Source-HTML layout fixtures, with only the presentation helper executed.
 * No business scripts, authentication calls, credentials or server writes.
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
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900 });
    const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace("<head>", `<head><base href="${base}/">`);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.querySelector("#login-window").hidden = true;
      document.querySelector("#main-window").hidden = false;
      document.querySelector("#dashboard-cockpit").style.display = "none";
    });
    await page.addScriptTag({ path: path.join(root, "public/workspace-layout.js") });
    await page.evaluate(() => {
      // Representative editable Enquiry row; the app builds this table at run time.
      document.querySelector("#enq-grid").innerHTML = `<table><thead><tr>
        <th>SL.N</th><th>ITEM CODE / PART</th><th>ITEM/COMPONENT NAME</th>
        <th>UOM</th><th>MOQ</th><th>RATE</th><th>AMOUNT</th>
        </tr></thead><tbody><tr><td>1</td><td><input value="B1"></td>
        <td><input value="BRASS BALL VALVE"></td><td><input value="KG"></td>
        <td><input value="1000"></td><td><input value="100"></td>
        <td><input value="100000"></td></tr></tbody></table>`;
      document.querySelector("#enq-vendor").add(new Option("Sample vendor", "1"));
    });
    await page.waitForFunction(() =>
      document.querySelector("#enq-grid table").classList.contains("erp-data-table"));
    const ids = await page.$$eval(".erp-workspace-window", elements => elements.map(el => el.id));
    assert.ok(ids.length >= 75, `Expected all business windows, found ${ids.length}`);
    const failures = [];
    let checks = 0;
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;
      }, theme);
      for (const [width, height, collapsed] of [
        [1440, 900, false], [1024, 700, false], [1024, 500, false], [768, 1024, false],
        [390, 844, false], [390, 844, true],
      ]) {
        await page.setViewport({ width, height });
        await page.$eval(".sidebar", (el, collapsed) => el.hidden = collapsed, collapsed);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const result = await page.evaluate(ids => {
          const failures = [];
          const stage = document.querySelector(".stage").getBoundingClientRect();
          for (const id of ids) {
            const panel = document.getElementById(id);
            panel.hidden = false;
            panel.style.display = "block";
            panel.scrollTop = 0;
            const r = panel.getBoundingClientRect();
            if (!["auto", "scroll"].includes(getComputedStyle(panel).overflowY)) {
              failures.push({ id, kind: "user scrolling disabled",
                overflowY: getComputedStyle(panel).overflowY });
            }
            if (Math.abs(r.left - stage.left - 8) > 1 ||
                Math.abs(r.top - stage.top - 8) > 1 ||
                Math.abs(r.width - stage.width + 16) > 1 ||
                Math.abs(r.height - stage.height + 16) > 1) {
              failures.push({ id, kind: "workspace bounds",
                rect: [r.left, r.top, r.width, r.height],
                stage: [stage.left, stage.top, stage.width, stage.height] });
            }
            for (const el of panel.querySelectorAll("input, select, textarea, button")) {
              const c = el.getBoundingClientRect();
              if (!c.width || !c.height || el.closest(".erp-table-scroll, .modal, .ask, [role='dialog']")) continue;
              if (c.left < r.left - 2 || c.right > r.right + 2) {
                failures.push({ id, kind: "clipped control", control: el.id || el.className,
                  left: c.left, right: c.right, bounds: [r.left, r.right] });
                if (failures.filter(f => f.id === id).length >= 4) break;
              }
            }
            panel.scrollTop = panel.scrollHeight;
            for (const close of panel.querySelectorAll('button[id$="-close"]')) {
              const c = close.getBoundingClientRect();
              if (!c.width || !c.height || close.closest(".modal, .ask, [role='dialog']")) continue;
              if (c.bottom > r.bottom + 2 || c.top < r.top - 2) {
                failures.push({ id, kind: "unreachable close button", button: close.id,
                  top: c.top, bottom: c.bottom, bounds: [r.top, r.bottom] });
              }
            }
            panel.hidden = true;
          }
          return failures;
        }, ids);
        failures.push(...result.map(failure => ({ theme, width, collapsed, ...failure })));
        checks += ids.length;
        if ((width === 1440 && !collapsed) || (width === 390 && collapsed)) {
          for (const id of ["company", "enq", "users", "invoice-mfg"]) {
            await page.$eval(`#${id}`, el => { el.hidden = false; el.scrollTop = 0; });
            await page.screenshot({ path: path.join(output, `workspace-${id}-${theme}-${width}.jpg`) });
            await page.$eval(`#${id}`, el => el.hidden = true);
          }
        }
      }
    }
    // A scrollTop assignment also succeeds with overflow:hidden. Exercise a
    // real wheel gesture so regressions cannot pass on scripted scrolling alone.
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.$eval("#company", el => { el.hidden = false; el.scrollTop = 0; });
      const point = await page.$eval("#company h1", el => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.bottom + 12 };
      });
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel({ deltaY: 600 });
      await page.waitForFunction(() => document.querySelector("#company").scrollTop > 0);
      await page.$eval("#company", el => el.hidden = true);
    }
    await page.$eval("#enq", el => { el.hidden = false; el.scrollTop = 0; });
    assert.ok(await page.$eval("#enq-grid", el => el.scrollWidth > el.clientWidth),
      "Wide Enquiry columns stay horizontally scrollable on a phone");
    await page.$eval("#enq-grid", el => el.scrollLeft = el.scrollWidth);
    await page.$eval("#enq-grid tbody td:last-child input", el =>
      el.scrollIntoView({ block: "center", inline: "nearest" }));
    assert.equal(await page.$eval("#enq-grid tbody td:last-child input", el => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
    }), true, "The final Enquiry column is reachable, not clipped");
    fs.writeFileSync(path.join(output, "workspace-layout-failures.json"), JSON.stringify(failures, null, 2));
    console.log(`${checks} bounds/content checks across ${ids.length} business windows, ` +
      "light/dark, desktop/tablet/phone and collapsed sidebar.");
    if (failures.length) console.log(JSON.stringify(failures.slice(0, 25), null, 2));
    assert.equal(failures.length, 0, `${failures.length} layout failures; see workspace-layout-failures.json`);
    assert.deepEqual(errors, []);
    console.log("PASS: all main windows fill their workspace; controls fit, close actions remain " +
      "reachable and tables keep horizontal scrolling instead of dropping columns.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
