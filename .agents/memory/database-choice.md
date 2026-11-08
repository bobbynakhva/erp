---
name: Database choice
description: User's database selection for the imported ERP project.
---

Use Replit's managed PostgreSQL database for the Replit app. The user's original
PostgreSQL database runs locally and is not reachable from Replit.

**Why:** After learning the existing database was local, the user chose Replit PostgreSQL.

**How to apply:** Restore the supplied database dump to the Replit development database; leave the user's local database untouched.
