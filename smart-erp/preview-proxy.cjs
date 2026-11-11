const http = require("node:http");

// Fixed, loopback-only upstream. Forward the original request/response without
// changing routes, cookies, request bodies, authentication or business logic.
function createPreviewProxy(targetPort) {
  return http.createServer((request, response) => {
    const upstream = http.request({
      hostname: "127.0.0.1",
      port: targetPort,
      method: request.method,
      path: request.url,
      headers: request.headers,
    }, upstreamResponse => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.on("error", () => response.destroy());
      upstreamResponse.pipe(response);
    });
    upstream.on("error", () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(502, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end("The application is temporarily unavailable.");
    });
    request.on("aborted", () => upstream.destroy());
    response.on("close", () => {
      if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
  });
}

module.exports = { createPreviewProxy };
