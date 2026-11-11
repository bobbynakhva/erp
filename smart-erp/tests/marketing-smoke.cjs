/* Read-only marketing checks; never logs into or changes live customer data. */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer-core");
const base = process.env.UI_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = path.resolve(__dirname, "../../generated-artifacts/ui-checks");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(base, { waitUntil: "networkidle0" });
    assert.equal(await page.$$eval("h1", els => els.length), 1);
    assert.equal(await page.$("form"), null, "No fake signup/contact form");
    assert.equal(await page.$("#login-form"), null);
    assert.ok(await page.$eval(".hero-photo", el => getComputedStyle(el).backgroundImage.includes("foundry-workshop.jpg")));
    const brokenAnchors = await page.$$eval('a[href^="#"]', links =>
      links.map(a => a.getAttribute("href")).filter(href => !document.getElementById(href.slice(1))));
    assert.deepEqual(brokenAnchors, []);
    const destinations = await page.$$eval('a[href^="http"]', els => els.map(el => ({
      href: el.href, target: el.target, rel: el.rel
    })));
    assert.ok(destinations.length > 0);
    assert.ok(destinations.every(link => link.href === "https://www.simplydigitalthings.com/" &&
      link.target === "_blank" && link.rel.includes("noopener")));
    await page.screenshot({ path: path.join(output, "tamba-landing-desktop.jpg") });

    await page.setViewport({ width: 390, height: 844 });
    await page.goto(base, { waitUntil: "networkidle0" });
    const toggle = ".nav-toggle";
    await page.click(toggle);
    assert.equal(await page.$eval(toggle, el => el.getAttribute("aria-expanded")), "true");
    await page.click('#site-navigation a[href="#capabilities"]');
    assert.equal(await page.$eval(toggle, el => el.getAttribute("aria-expanded")), "false");
    assert.equal(await page.evaluate(() => location.hash), "#capabilities");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.click(toggle);
    await page.keyboard.press("Escape");
    assert.equal(await page.$eval(toggle, el => el.getAttribute("aria-expanded")), "false");
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("nav-toggle")), true);
    await page.screenshot({ path: path.join(output, "tamba-landing-mobile.jpg") });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px fits`);
    }
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(base, { waitUntil: "networkidle0" });
    assert.equal(await page.$eval(".reveal", el => getComputedStyle(el).opacity), "1");
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(base, { waitUntil: "networkidle0" });
    assert.equal(await page.$eval(".reveal", el => getComputedStyle(el).opacity), "1");
    assert.notEqual(await page.$eval("#site-navigation", el => getComputedStyle(el).display), "none");
    assert.deepEqual(errors, []);
    console.log("PASS: public landing, local imagery, genuine links, mobile menu/anchors/Escape,");
    console.log("320–1440px layout, reduced motion and no-JavaScript content/navigation.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
