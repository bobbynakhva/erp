---
name: Business-window behavior
description: User expectation when opening another ERP module while a form is already open.
---

The user said new windows should open in front, or a dialog should ask whether
to keep the previous window open or close it. A new module must not open behind
an older form and appear unresponsive.

**Why:** The user opened Users and then Production → Internal Work Order; the
older Users form covered the newly opened work order.

**How to apply:** Use bring-to-front activation while preserving existing form
state. Clicking or focusing an existing window should reactivate it. Do not
silently close/reset a different form merely to fix stacking. Any future change
to a close-on-navigation policy needs an explicit decision and protection for
unsaved input.
