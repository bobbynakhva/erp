# Running SMART ERP on Replit

The imported application remains in `smart-erp/`. It uses Node.js 22,
plain browser JavaScript, and PostgreSQL. Chromium is installed for PDF exports.

## Database

The user chose their existing PostgreSQL service, not Replit's database.
Add its connection string securely as `EXTERNAL_DATABASE_URL` in Replit Secrets.
Include the provider's required SSL options in the connection string.
Do not put credentials in source files or chat.

**Important:** The existing startup routine creates and alters tables and seeds
default records. Use a development database or a backed-up copy. Do not start
against a live production database without reviewing and approving those writes.
No database migration or data transfer to Replit is intended.

## Run

Use the **Start application** workflow. It requires `EXTERNAL_DATABASE_URL`,
sets port 5000, locates Chromium, and starts the existing npm script:

```sh
test -n "$EXTERNAL_DATABASE_URL" || { echo "Add EXTERNAL_DATABASE_URL in Replit Secrets before starting."; exit 1; }
PORT=5000 CHROME_PATH="$(command -v chromium)" npm --prefix smart-erp start
```

The server binds to `0.0.0.0` for the Replit preview. The workflow is not started
until external database credentials are supplied and startup writes are approved.
Connection, login, and PDF verification are pending those credentials.
