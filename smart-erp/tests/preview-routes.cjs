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
    assert.ok(html.includes('id="login-window"'), `${base}: not the ERP page`);
    assert.ok(html.includes("/menu-layout.js"), `${base}: missing menu layout script`);
    pages.push(html);
    const script = await get(`${base}/menu-layout.js`);
    assert.match(script.headers.get("content-type"), /javascript/i);
    const css = await get(`${base}/modern-theme.css`);
    assert.match(css.headers.get("content-type"), /text\/css/i);
    const years = await get(`${base}/api/login/years`);
    assert.match(years.headers.get("content-type"), /application\/json/i);
    assert.ok(await years.json(), `${base}: missing year data`);
    console.log(`PASS: ${base}/ serves the ERP, menu script, theme and JSON API.`);
  }
  assert.equal(pages[0], pages[1], "Both preview addresses must serve the same app.");
  console.log("PASS: root and :5000 preview HTML are identical.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
