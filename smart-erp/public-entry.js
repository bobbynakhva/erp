// Share the public document boundary between the application and isolated tests.
function resolvePublicPage(pathname, mode) {
  if (!["platform", "customer"].includes(mode)) throw new TypeError("Unknown deployment mode");
  const route = pathname.replace(/\/+$/, "") || "/";
  if (mode === "customer" && (
    route === "/owner" ||
    route === "/platform/owner.html" ||
    route === "/platform/owner.js" ||
    route === "/marketing" ||
    route.startsWith("/marketing/")
  )) return { status: 404 };

  if (route === "/") {
    return { file: mode === "platform" ? "/marketing/index.html" : "/index.html" };
  }
  if (mode === "platform" && route === "/index.html") return { location: "/" };
  if (route === "/owner") return { file: "/platform/owner.html" };
  if (route === "/accept-invite") return { file: "/platform/invite.html" };
  return { file: pathname };
}

module.exports = { resolvePublicPage };
