# Tamba search and domain launch

## What the application prepares

The intended public origin is **https://tambaerp.com**. It is the product owner's
chosen address, not proof that a domain has been registered or connected.

- `/`: manufacturing ERP overview and visible ERP FAQs.
- `/erp-for-brass-manufacturing`: brass-component workflows and Jamnagar context.
- `/sitemap.xml`: only the two canonical public pages.
- `/robots.txt`: production crawl instructions; previews and customer domains
  disallow all crawling.
- `/llms.txt`: a plain-text product summary with links to official public pages.
  This is a convenience for tools, not a guarantee of AI discovery or citation.
- JSON-LD describes the website, product organization, software, visible FAQs and
  industry-page breadcrumbs without invented prices, reviews or performance claims.
- Social sharing metadata uses the existing workshop image.

All substantive content is delivered in HTML, not dependent on JavaScript.
The production public host allows indexing; other hosts, customer deployments,
owner/invitation pages and API responses receive `X-Robots-Tag: noindex, nofollow`.
The `www` public-page variant redirects permanently to the non-www HTTPS origin.
Keep both hostnames pointed to the same website with valid TLS.

`robots.txt` and noindex are crawler instructions, not access controls.
Existing owner/customer authentication remains responsible for security.

## Connect the actual domain on Hostinger

1. Check whether `tambaerp.com` is available and register it, or establish control
   if it is already owned. Do not publish on a domain you do not control.
2. Deploy the updated platform application to Hostinger. Preserve the existing
   Node.js app configuration and PostgreSQL connection. The app root is
   `smart-erp`, entry file `server.js`, with `ERP_MODE=platform`.
3. In Hostinger **Websites**, find the Node.js app, open its options menu and
   select **Connect domain**, or use **Connect domain** in its Website Dashboard.
4. Enter `tambaerp.com` and follow the DNS instructions Hostinger provides for
   that specific application. Use the records shown in the account, not a
   guessed IP address. Preserve existing mail records when changing DNS.
5. Configure both apex and `www`, verify SSL and HTTPS redirection, and wait
   for DNS propagation. Confirm the application's Host header is the public
   domain so production crawl rules activate.
6. Set `PLATFORM_PUBLIC_URL=https://tambaerp.com` in the Hostinger platform app
   environment after the domain is reachable. This is a public origin, not a
   database connection URL. Existing customer control URLs may need an operator
   update if they currently refer to a different owner-service origin.
7. Confirm that the root and industry page return 200, `www` redirects to the
   apex, public robots allows crawling, and the sitemap returns XML.
   Confirm owner login still works and its responses remain non-indexable.

Official instructions:
https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/

Changing source code cannot purchase a domain, alter registrar DNS, issue
Hostinger TLS certificates or change the Replit editor's preview URL.

## After the domain is live

Verify the owned domain in Google Search Console and Bing Webmaster Tools using
their account-specific verification instructions, then submit
`https://tambaerp.com/sitemap.xml`. Do not add fabricated verification tokens.
Inspect both public URLs and validate their structured data using the relevant
search-engine tools. FAQ markup does not guarantee a Google FAQ rich result.

Monitor queries such as manufacturing ERP, ERP for brass parts manufacturing,
brass component ERP and ERP software in Jamnagar. Track impressions, clicks,
indexed URLs and enquiries over time; neither SEO nor AI citations can be
guaranteed. Publish further process guides or case studies only when based on
verified capabilities and authorized factory experience.

## Read-only checks

```sh
node --test tests/public-entry.test.cjs tests/public-seo.test.cjs
node tests/marketing-smoke.cjs
node tests/preview-routes.cjs
```

Production-host behavior is covered by isolated HTTP tests without requiring
ownership of the desired domain or modifying existing customer records.
