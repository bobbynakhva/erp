# SaaS owner panel — separate customer deployments

## What is implemented

- `/`: public Tamba marketing homepage on the platform deployment. Each
  customer deployment retains its original ERP sign-in at `/`; the public
  marketing documents and owner-portal aliases return 404 on customer domains.

- `/owner`: independent platform owner setup/login and a companies panel.
- Create manufacturers, assign a manual plan/trial label, configure their
  deployment connections, generate/revoke invitation links, and suspend or
  reactivate access.
- Each customer runs a separate copy of this code with its own PostgreSQL
  database. Customer business records and passwords stay on that deployment.
- A customer-side agent establishes its database-instance identity and reports
  onboarding status to the owner service. No arbitrary customer URLs are fetched
  by the owner service.
- Invitations are **copy-and-share links**, not emails. The owner sees the link
  once and must share it privately with the intended administrator.
- Audit events are stored atomically with owner mutations. This does not claim
  an externally immutable/compliance-certified audit system.

This does **not** create Hostinger servers, buy domains, configure DNS, create
PostgreSQL databases, automate billing, migrate live customer data, or grant
automatic support access to a customer's ERP. Infrastructure provisioning is an
explicit operator task. Do not activate paying customers before resolving the
existing ERP's previously identified security and invoice correctness issues.

## Owner deployment

Use `npm start` in `smart-erp` on the owner server. Existing local ERP login is
preserved; its administrator is **not** a platform owner.

Configure privately on that server:

- `ERP_MODE=platform` (the default).
- `PLATFORM_OWNER_BOOTSTRAP_KEY`: a random secret of at least 32 characters.
- `PLATFORM_PUBLIC_URL`: the stable, publicly reachable HTTPS origin of this
  owner deployment, e.g. `https://control.example.com`. No path/query/fragment.
- The existing PostgreSQL connection configuration for the owner's database.

Open `/owner`, enter the bootstrap key and choose your owner email/password.
Passwords must be 12–128 characters. Bootstrap is disabled after the first
owner exists; the key can then be removed from server secrets. There are no
default owner credentials and no public owner registration.

Owner sessions use a separate host-only, Secure/HttpOnly/SameSite=Strict cookie,
hashed tokens, eight-hour absolute expiry and 30-minute inactivity expiry.
Failed login/bootstrap attempts are rate-limited in PostgreSQL. Deploy behind
HTTPS. Owner password recovery and MFA are not implemented in this release;
keep recovery/admin procedures controlled by the server operator.

## Handing a new manufacturer its ERP

1. Create its company record in `/owner`; choose its first administrator email
   and financial-year start. A record alone is **not** a ready workspace.
2. Provision a separate Node.js deployment and a **new, empty PostgreSQL
   database**. Install Chromium as required for the existing PDF exports.
3. In the company details, configure the customer's public HTTPS origin.
4. Copy the one-time connection configuration into the customer's private server
   environment: `ERP_MODE=customer`, `ERP_CONTROL_URL`, `ERP_COMPANY_ID`,
   `ERP_PUBLIC_URL`, and `ERP_DEPLOYMENT_KEY`. Set its PostgreSQL connection
   independently. Never commit keys or database credentials to GitHub.
5. Start the customer deployment with those settings already configured on its
   **first** start. It invalidates generated bootstrap credentials before
   listening and binds the new database to this company. It refuses to take
   over existing ERP data or run an owner service on a bound customer database.
6. Reload the company record. Once its heartbeat is received, it is Connected.
7. Generate an administrator invitation and share the link privately. It expires
   after 48 hours; generating another link revokes previous pending links.
8. The administrator opens `/accept-invite` on **their own ERP**, chooses a
   password, then signs in using the invited email. Its financial year, full
   administrator rights and manufacturer-onboarding draft are provisioned.
   Normal legacy license agreement screens may still appear at first sign-in.
9. Company setup opens after sign-in. The owner panel receives completion status
   on a subsequent heartbeat.

Do not put the owner service and customer on the same origin/database. Customer
mode requires a fresh database or its existing company binding and exactly one
manufacturer. A database cannot be rebound to another company. Key rotation is
supported; moving an activated deployment URL is blocked pending an explicit
data-migration procedure.

## Access enforcement and availability tradeoff

The customer sends a heartbeat every 30 seconds. Suspending a company blocks
its authenticated ERP APIs after the next successful heartbeat; existing
browser content cannot be remotely erased. If the control plane cannot be
reached, an existing authorization lease lasts at most five minutes, then
customer API access fails closed. Restarting requires a new lease.

**Consequently, control-plane downtime can block all customers after five
minutes.** Monitor and back up the owner service as well as customer databases.
Choose and implement a different signed/offline licensing model explicitly if
longer customer independence is needed; do not silently extend failed leases.

The administrator password is scrypt-hashed only on the customer deployment
and is never sent to the control plane. Invite tokens and deployment keys are
stored hashed on the control plane; token-bearing URL fragments are removed
before client API calls. An initial invitation cannot reset an active admin.

## Verification

- `node --test tests/platform-integration.test.cjs`: owner separation, bootstrap,
  company records, instance binding, cross-company invite rejection, expiry/
  revocation, hashed administrator creation, rights, onboarding, suspension,
  reactivation, session expiry and audit data.
- `node tests/platform-ui-smoke.cjs`: real browser owner-to-customer handover,
  including phone layouts and invite URL hygiene.
- Both use disposable PostgreSQL schemas and test-only HTTP servers; neither
  bypasses live application authentication or creates real owner accounts.
