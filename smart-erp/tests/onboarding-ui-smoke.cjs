const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");
const { createFixture } = require("./onboarding-fixture-server.cjs");

(async () => {
  const fixture = await createFixture();
  await new Promise(resolve => fixture.server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${fixture.server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const output = path.resolve(__dirname, "../../generated-artifacts/ui-checks");
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(base, { waitUntil: "networkidle0" });
    const wizard = "#manufacturer-onboarding-dialog";
    const next = '[data-action-button="continue"]';
    const step = n => page.waitForFunction(n =>
      document.querySelector(".ob-eyebrow")?.textContent.includes(`Step ${n} / 4`), {}, n);
    const fill = async (name, value) => {
      await page.$eval(`[name="${name}"]`, (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
    };
    await page.waitForSelector(`${wizard}[open]`);
    await page.click(next);
    await page.waitForSelector('[name="companyName"][aria-invalid="true"]');
    await fill("companyName", "Pilot Test Manufacturing");
    await page.click('[data-action-button="save"]');
    await page.waitForFunction(() => !document.querySelector("#manufacturer-onboarding-dialog"));
    await page.click("#manufacturer-setup-trigger");
    await page.waitForSelector(`${wizard}[open]`);
    assert.equal(await page.$eval('[name="companyName"]', el => el.value), "Pilot Test Manufacturing");
    assert.equal(await page.$eval('[name="address"]', el => el.value), "");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(`${wizard}[open]`);
    assert.equal(await page.$eval('[name="companyName"]', el => el.value), "Pilot Test Manufacturing");
    await fill("address", "42 Test Industrial Estate");
    await fill("phone", "+91 9000000000");
    await fill("email", "pilot@example.invalid");
    await page.keyboard.press("Tab");
    assert.equal(await page.$eval(wizard, el => el.contains(document.activeElement)), true);
    await page.screenshot({ path: path.join(output, "onboarding-company-desktop.jpg") });
    await page.click(next);
    await step(2);
    await page.select('[name="stateCode"]', "29");
    await page.click(next);
    await step(3);
    for (const [name, value] of Object.entries({ prefixQuote: "QT", prefixPo: "PO", prefixWo: "WO", prefixEnq: "ENQ" })) {
      await fill(name, value);
    }
    await page.click('[name="bookType"][value="2"]');
    await page.click('[name="bookTypeInv"][value="2"]');
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => document.documentElement.dataset.theme = "dark");
    await page.$eval(".ob-content-scroll", el => el.scrollTop = 0);
    await page.mouse.move(200, 340);
    await page.mouse.wheel({ deltaY: 1000 });
    await page.waitForFunction(() => document.querySelector(".ob-content-scroll").scrollTop > 0);
    assert.equal(await page.$eval(".ob-actions", el => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1;
    }), true, "Phone actions are reachable without horizontal clipping");
    await page.screenshot({ path: path.join(output, "onboarding-preferences-mobile-dark.jpg") });
    await page.click(next);
    await step(4);
    assert.equal(await page.$eval('[data-action-button="complete"]', el => el.disabled), true);
    await page.click('[data-action-button="back"]');
    await step(3);
    assert.equal(await page.$eval('[name="prefixQuote"]', el => el.value), "QT");
    assert.equal(await page.$eval('[name="bookType"]:checked', el => el.value), "2");
    // Simulate another administrator saving a newer draft, without mutating
    // the real app or mocking the onboarding handler's response.
    await page.evaluate(async () => {
      const state = await fetch("/api/onboarding").then(r => r.json());
      await fetch("/api/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", version: state.version, draft: state.draft, step: 2 })
      });
    });
    await page.click(next);
    await page.waitForSelector(".ob-reload-button");
    assert.match(await page.$eval(".ob-error-summary", el => el.textContent), /another window/i);
    await page.click(".ob-reload-button");
    await page.waitForFunction(() => !document.querySelector(".ob-reload-button"));
    await page.waitForSelector(`${next}:not([disabled])`);
    await page.click(next);
    await step(4);
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluate(() => document.documentElement.dataset.theme = "light");
    await page.screenshot({ path: path.join(output, "onboarding-review-desktop.jpg") });
    assert.match(await page.$eval(".ob-review-list", el => el.textContent), /Karnataka/);
    await page.$eval(".ob-confirm input", el => {
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.click('[data-action-button="complete"]');
    await page.waitForFunction(() => !document.querySelector("#manufacturer-onboarding-dialog"));
    assert.equal(await page.$("#manufacturer-setup-trigger"), null);
    assert.match(await page.title(), /Pilot Test Manufacturing/);
    assert.match(await page.$eval(".ob-toast", el => el.textContent), /Company setup complete/);
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.$(wizard), null);
    assert.equal(await page.$("#manufacturer-setup-trigger"), null);
    assert.equal(await page.evaluate(() => fetch("/api/onboarding").then(r => r.json()).then(s => s.completed)), true);
    assert.deepEqual(errors, []);
    console.log("PASS: real isolated API + UI journey: validation, incomplete draft exit, resume, refresh,");
    console.log("unregistered GST/state, preferences, phone wheel scrolling/dark theme, review/back,");
    console.log("version conflict/reload, confirmed completion and no repeat after refresh.");
  } finally {
    await browser.close();
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
