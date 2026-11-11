const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { publicSeoResponse, SITE_URL, PUBLIC_PATHS } = require("../public-seo");
const { resolvePublicPage } = require("../public-entry");

test("only the explicit production domain may index public marketing documents", () => {
  for (const host of ["tambaerp.com", "TAMBAERP.COM:443"]) {
    for (const route of PUBLIC_PATHS) assert.match(publicSeoResponse(route, "platform", host).headers["X-Robots-Tag"], /^index,/);
  }
  for (const host of ["localhost", "preview.replit.dev", "tambaerp.com.evil.test", undefined]) {
    assert.match(publicSeoResponse("/", "platform", host).headers["X-Robots-Tag"], /noindex/);
    assert.match(publicSeoResponse("/robots.txt", "platform", host).body, /Disallow: \//);
  }
  for (const route of ["/owner", "/accept-invite", "/api/platform/companies", "/platform/invite.html", "/not-found"]) {
    assert.match(publicSeoResponse(route, "platform", "tambaerp.com").headers["X-Robots-Tag"], /noindex/);
  }
});
test("customer domains never expose or index public marketing discovery", () => {
  assert.match(publicSeoResponse("/", "customer", "tambaerp.com").headers["X-Robots-Tag"], /noindex/);
  assert.equal(publicSeoResponse("/robots.txt", "customer", "factory.example").body, "User-agent: *\nDisallow: /\n");
  for (const route of ["/sitemap.xml", "/llms.txt"]) assert.equal(publicSeoResponse(route, "customer", "factory.example").status, 404);
  assert.equal(resolvePublicPage("/erp-for-brass-manufacturing", "customer").status, 404);
});
test("crawler files have exact public URLs and do not block rendering assets", () => {
  const robots = publicSeoResponse("/robots.txt", "platform", "tambaerp.com");
  assert.match(robots.type, /text\/plain/);
  assert.match(robots.body, /Sitemap: https:\/\/tambaerp.com\/sitemap.xml/);
  assert.ok(!robots.body.includes("Disallow: /marketing/\n"));
  const sitemap = publicSeoResponse("/sitemap.xml", "platform", "tambaerp.com");
  assert.match(sitemap.type, /application\/xml/);
  assert.match(sitemap.body, /^<\?xml/);
  assert.deepEqual([...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), PUBLIC_PATHS.map(route => SITE_URL + route));
  assert.ok(!sitemap.body.includes("replit"));
  assert.match(publicSeoResponse("/llms.txt", "platform", "tambaerp.com").body, /# Tamba ERP/);
  assert.equal(publicSeoResponse("/sitemap.xml", "platform", "tambaerp.com", "POST").status, 405);
});
test("www public pages redirect, without changing private sessions or preview navigation", () => {
  assert.deepEqual(publicSeoResponse("/", "platform", "www.tambaerp.com").location, SITE_URL + "/");
  assert.equal(publicSeoResponse("/owner", "platform", "www.tambaerp.com").location, undefined);
  assert.equal(publicSeoResponse("/", "platform", "preview.replit.dev").location, undefined);
  assert.deepEqual(resolvePublicPage("/marketing/index.html", "platform"), { location: "/" });
  assert.deepEqual(resolvePublicPage("/marketing/brass-manufacturing.html", "platform"), { location: "/erp-for-brass-manufacturing" });
});
test("all public HTML has unique canonical metadata and valid server-readable structured data", () => {
  for (const [file, route] of [["index.html", "/"], ["brass-manufacturing.html", "/erp-for-brass-manufacturing"]]) {
    const html = fs.readFileSync(path.join(__dirname, "../public/marketing", file), "utf8");
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<h1[^>]*>[\s\S]*?ERP/);
    assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${route}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${SITE_URL}${route}">`));
    assert.match(html, /name="twitter:card"/);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const schema = JSON.parse(scripts[0][1]);
    assert.equal(schema["@context"], "https://schema.org");
    assert.ok(!scripts[0][1].includes("aggregateRating"));
    const faq = schema["@graph"].find(entity => entity["@type"] === "FAQPage");
    if (faq) {
      assert.equal(faq.mainEntity.length, 5);
      for (const question of faq.mainEntity) {
        assert.ok(html.includes(`<summary>${question.name}</summary>`));
        assert.ok(html.includes(`<p>${question.acceptedAnswer.text}</p>`));
      }
    }
  }
});
test("HTTP discovery works with production and customer headers without touching a database", async () => {
  const server = http.createServer((req, res) => {
    const seo = publicSeoResponse(new URL(req.url, "http://fixture").pathname, "platform", req.headers.host, req.method);
    res.writeHead(seo.status || 200, { ...seo.headers, "Content-Type": seo.type || "text/html", ...(seo.location ? {Location: seo.location} : {}) });
    res.end(req.method === "HEAD" ? undefined : seo.body || "Public document");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const sitemap = await fetch(base + "/sitemap.xml", { headers: { Host: "tambaerp.com" } });
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /<urlset/);
    const owner = await fetch(base + "/owner", { headers: { Host: "tambaerp.com" } });
    assert.match(owner.headers.get("x-robots-tag"), /noindex/);
    const head = await fetch(base + "/robots.txt", { method: "HEAD" });
    assert.equal(await head.text(), "");
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
});
