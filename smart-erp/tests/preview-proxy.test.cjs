const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createPreviewProxy } = require("../preview-proxy.cjs");

const listen = server => new Promise(resolve =>
  server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const close = server => new Promise(resolve => {
  server.closeAllConnections();
  server.close(() => resolve());
});

test("preview alias preserves requests, cookies and responses; fails explicitly", async t => {
  const backend = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    res.writeHead(201, {
      "Content-Type": "application/json",
      "Set-Cookie": "preview_test=fixture; HttpOnly; Path=/",
    });
    res.end(JSON.stringify({
      method: req.method,
      url: req.url,
      cookie: req.headers.cookie,
      body: Buffer.concat(chunks).toString(),
    }));
  });
  const backendPort = await listen(backend);
  const proxy = createPreviewProxy(backendPort);
  const proxyPort = await listen(proxy);
  t.after(async () => { await close(proxy); await close(backend); });
  const url = `http://127.0.0.1:${proxyPort}`;
  const response = await fetch(`${url}/api/example?year=2026`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "preview_test=fixture" },
    body: '{"example":true}',
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("set-cookie"),
    "preview_test=fixture; HttpOnly; Path=/");
  assert.deepEqual(await response.json(), {
    method: "POST",
    url: "/api/example?year=2026",
    cookie: "preview_test=fixture",
    body: '{"example":true}',
  });
  await close(backend);
  const unavailable = await fetch(url);
  assert.equal(unavailable.status, 502);
  assert.match(await unavailable.text(), /temporarily unavailable/);
});
