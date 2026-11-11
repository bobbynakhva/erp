// Share the public document boundary between the application and isolated tests.
function resolvePublicPage(pathname, mode) {
  if (!["platform", "customer"].includes(mode)) throw new TypeError("Unknown deployment mode");
  const route = pathname.replace(/\/+$/, "") || "/";
  if (mode === "customer" && (
    route === "/owner" ||
    route === "/platform/owner.html" ||
    route === "/platform/owner.js" ||
    route === "/marketing" ||
    route === "/erp-for-brass-manufacturing" ||
    route.startsWith("/marketing/")
  )) return { status: 404 };

  if (route === "/") {
    return { file: mode === "platform" ? "/marketing/index.html" : "/index.html" };
  }
  if (mode === "platform" && route === "/index.html") return { location: "/" };
  if (mode === "platform" && ["/marketing", "/marketing/index.html"].includes(route)) return { location: "/" };
  if (mode === "platform" && route === "/marketing/brass-manufacturing.html") return { location: "/erp-for-brass-manufacturing" };
  if (mode === "platform" && route === "/erp-for-brass-manufacturing") {
    if (pathname.endsWith("/")) return { location: route };
    return { file: "/marketing/brass-manufacturing.html" };
  }
  if (route === "/owner") return { file: "/platform/owner.html" };
  if (route === "/accept-invite") return { file: "/platform/invite.html" };
  return { file: pathname };
}

module.exports = { resolvePublicPage };
