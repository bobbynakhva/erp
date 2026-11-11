# Running SMART ERP on Replit

The imported application remains in `smart-erp/`. It uses Node.js 22,
plain browser JavaScript, and PostgreSQL. Chromium is installed for PDF exports.

## Database

The Replit app uses Replit's managed PostgreSQL database through the injected
`DATABASE_URL`. The original PostgreSQL service runs locally on the user's
computer and is not reachable from Replit. A full dump was restored into the
separate Replit development database; the local database was not changed.

**Important:** The existing startup routine creates and alters tables and seeds
default records. Do not start against a live production database without
reviewing and approving those writes. A pre-restore backup is kept under the
ignored `generated-artifacts/` directory.

## Run

Use the **Start application** workflow. It sets port 5000, locates Chromium,
and starts the existing server with a development-only preview alias:

```sh
cd smart-erp && PORT=5000 CHROME_PATH="$(command -v chromium)" node --require ./preview-alias.cjs server.js
```

The application listens on internal port 5000, exposed as public `:5000`.
The development-only alias listens on internal port 3001 and forwards to that
same application; it is exposed as public port 80 for the root preview URL.
There is only one ERP process and database connection setup, not a second app.
The normal `npm start` production command remains unchanged.

Both the root address and the explicit `:5000` address must remain available.
Check their saved mappings after restarting the workflow, not only beforehand.

Verification from the workspace root:

```sh
node --test smart-erp/tests/preview-proxy.test.cjs
node smart-erp/tests/preview-routes.cjs
```

Database connection and page rendering are verified; authenticated account
actions and PDF export still need end-to-end checks.
