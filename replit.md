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
and starts the existing npm script:

```sh
PORT=5000 CHROME_PATH="$(command -v chromium)" npm --prefix smart-erp start
```

The server binds to `0.0.0.0` for the Replit preview. Database connection and
page rendering are verified; login and PDF export still need end-to-end checks.
