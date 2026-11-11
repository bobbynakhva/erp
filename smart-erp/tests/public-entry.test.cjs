const test = require("node:test");
const assert = require("node:assert/strict");
const { resolvePublicPage } = require("../public-entry");

test("only the platform homepage becomes the public landing page", () => {
  assert.deepEqual(resolvePublicPage("/", "platform"), { file: "/marketing/index.html" });
  assert.deepEqual(resolvePublicPage("/", "customer"), { file: "/index.html" });
  assert.deepEqual(resolvePublicPage("/index.html", "platform"), { location: "/" });
  assert.deepEqual(resolvePublicPage("/index.html", "customer"), { file: "/index.html" });
});
test("customer domains cannot serve the owner portal or public marketing files", () => {
  for (const pathname of ["/owner", "/owner/", "/platform/owner.html", "/platform/owner.js",
    "/marketing", "/marketing/", "/marketing/index.html", "/marketing/styles.css", "/marketing/site.js"]) {
    assert.deepEqual(resolvePublicPage(pathname, "customer"), { status: 404 }, pathname);
  }
  assert.deepEqual(resolvePublicPage("/owner", "platform"), { file: "/platform/owner.html" });
  assert.deepEqual(resolvePublicPage("/owner/", "platform"), { file: "/platform/owner.html" });
});
test("invitation pages and shared invitation styling retain their original paths", () => {
  for (const mode of ["platform", "customer"]) {
    assert.deepEqual(resolvePublicPage("/accept-invite", mode), { file: "/platform/invite.html" });
    assert.deepEqual(resolvePublicPage("/platform/owner.css", mode), { file: "/platform/owner.css" });
  }
});
