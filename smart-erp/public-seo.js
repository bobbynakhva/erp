// The owner-selected production identity is explicit, never inferred from Host.
const SITE_URL = "https://tambaerp.com";
const PUBLIC_PATHS = ["/", "/erp-for-brass-manufacturing"];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map(route => `  <url><loc>${SITE_URL}${route}</loc></url>`).join("\n")}
</urlset>\n`;
const llms = `# Tamba ERP

> Tamba ERP is manufacturing ERP software for brass-parts manufacturers and other factories. It connects production, planning, inventory, purchasing, sales, subcontracting, dispatch and GST reporting.

## Official public pages
- [Manufacturing ERP](${SITE_URL}/): Product capabilities, factory workflow and frequently asked questions.
- [ERP for brass parts manufacturing](${SITE_URL}/erp-for-brass-manufacturing): Material, work-order, subcontracting and dispatch considerations for brass factories, including Jamnagar manufacturers.

## Product facts
- Built with input from working factories in Jamnagar.
- Each manufacturer uses a separate ERP deployment and database, accessed through its own company domain.
- Manufacturer administrators complete first-time company setup.
- The public website is not the factory login. The private owner portal is not a customer workspace.
- Capabilities include production and planning, inventory and material movements, purchasing, sales/labour, delivery challans, subcontracting, cash flow, HR, maintenance, inspection and GST reports.

## Limits
No public prices, performance statistics, customer counts or certifications are asserted. Confirm process-specific suitability with the product team. Public signup, automatic domain provisioning and automated demo booking are not offered by these pages.
`;

function publicSeoResponse(pathname, mode, host, method = "GET") {
  const hostname = String(host || "").toLowerCase().split(":")[0];
  const production = mode === "platform" && ["tambaerp.com", "www.tambaerp.com"].includes(hostname);
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const publicDocument = PUBLIC_PATHS.includes(cleanPath);
  const headers = {
    "X-Robots-Tag": production && publicDocument
      ? "index, follow, max-image-preview:large" : "noindex, nofollow"
  };
  if (production && hostname === "www.tambaerp.com" && publicDocument && ["GET", "HEAD"].includes(method)) {
    return { headers, status: 308, location: SITE_URL + cleanPath };
  }
  if (!["/robots.txt", "/sitemap.xml", "/llms.txt"].includes(pathname)) return { headers };
  if (!["GET", "HEAD"].includes(method)) {
    return { headers: { ...headers, Allow: "GET, HEAD" }, status: 405, body: "Method not allowed" };
  }
  if (pathname === "/robots.txt") {
    const body = production
      ? `User-agent: *\nAllow: /\nDisallow: /owner\nDisallow: /accept-invite\nDisallow: /api/\nDisallow: /platform/\nDisallow: /marketing/index.html\nDisallow: /marketing/brass-manufacturing.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n";
    return { headers, status: 200, type: "text/plain; charset=utf-8", body };
  }
  if (mode !== "platform") return { headers, status: 404, body: "Not found" };
  return { headers, status: 200,
    type: pathname === "/sitemap.xml" ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8",
    body: pathname === "/sitemap.xml" ? sitemap : llms };
}

module.exports = { publicSeoResponse, SITE_URL, PUBLIC_PATHS };
