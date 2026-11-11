---
name: Browser test focus
description: Foreground-tab requirements for reliable multi-tab Chromium UI checks.
---

Explicitly bring the target browser tab to the foreground before resuming
layout checks and screenshots after opening a second tab.

**Why:** In this environment, owner-to-invitation browser checks completed
acceptance successfully but hung when returning to a background owner tab.
Foregrounding it resolved the failure without application changes.

**How to apply:** When a multi-tab test stalls after a completed action, inspect
which tab is active before changing application logic or repeating the journey.
