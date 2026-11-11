// Read-only checks against both public development preview addresses.
const assert = require("node:assert/strict");
const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain) throw new Error("REPLIT_DEV_DOMAIN is required for preview checks.");

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${url}: expected HTTP 200`);
  return response;
}

(async () => {
  const pages = [];
  for (const suffix of ["", ":5000"]) {
    const base = `https://${domain}${suffix}`;
    const html = await (await get(`${base}/`)).text();
    assert.ok(html.includes('id="hero-title"'), `${base}: not the public landing page`);
    assert.ok(!html.includes('id="login-form"'), `${base}: exposed legacy factory sign-in at platform root`);
    pages.push(html);
    const script = await get(`${base}/marketing/site.js`);
    assert.match(script.headers.get("content-type"), /javascript/i);
    const css = await get(`${base}/marketing/styles.css`);
    assert.match(css.headers.get("content-type"), /text\/css/i);
    const owner = await (await get(`${base}/owner`)).text();
    assert.match(owner, /Tamba Platform/);
    const session = await get(`${base}/api/platform/session`);
    assert.match(session.headers.get("content-type"), /application\/json/i);
    const protectedData = await fetch(`${base}/api/platform/companies`);
    assert.equal(protectedData.status, 401);
    console.log(`PASS: ${base}/ serves the landing page, assets and separate protected owner panel.`);
  }
  assert.equal(pages[0], pages[1], "Both preview addresses must serve the same app.");
  console.log("PASS: root and :5000 preview HTML are identical.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
