---
name: Preview port normalization
description: Why the ERP preview must be checked through both public addresses after startup.
---

In this workspace, workflow startup rewrote a cross-port alias mapping even
after configuration validation succeeded. Do not assume a validated mapping
survived startup unchanged.

**Why:** The preview alternated between the root development address and explicit
`:5000`. Moving a single mapping fixed one address but broke the other, despite
the application itself remaining healthy. A cross-port non-root alias also
normalized to its own port during startup.

**How to apply:** Preserve both preview addresses. After changes to startup or
ports, inspect the persisted mapping and check the app, assets and JSON API
through both public URLs. A successful localhost screenshot alone cannot prove
the user's preview route works. Do not change business APIs to compensate for
HTML error responses produced by a broken preview route.
