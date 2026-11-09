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

The user also asked, “make every window utilize the full space, and make them
responsive.”

**Why:** Enquiry occupied a narrow floating window despite unused workspace,
and its contents were clipped at smaller sizes.

**How to apply:** Main business windows should fill the available workspace.
Reflow form groups on narrow screens while retaining field sequence and all
table columns; use internal horizontal scrolling for wide tables rather than
cropping them. Keep confirmation dialogs compact. Do not restore fixed-width
floating business forms as a preservation constraint.

Report pages are business windows, not blocking modal dialogs. Navigation must
remain above GST, Audit, Traceability and User Status just as it does above
ordinary entry forms.

**Why:** The user reported Utilities opening underneath the GST report after
full-workspace sizing. Retaining separate always-on-top report layers broke
the shared navigation policy.

**How to apply:** Keep report pages in the business-window activation policy;
reserve higher modal priority for actual blocking dialogs. Check menus over
report pages as well as over ordinary forms.
