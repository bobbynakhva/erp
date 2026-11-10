# Manufacturer administrator setup

This is setup for an already-provisioned manufacturer account, not public SaaS
registration, tenant isolation, billing or a password-provisioning system.

## Launch behavior

- After login, an administrator with the `PLANT_MANAGER` role and company edit
  rights (`mnuMisc >= 7`) can use **Company setup** in the top bar.
- Existing installations are not automatically enrolled or forced into setup.
  Clicking Company setup explicitly starts a saved draft.
- A completely new database created by the application's existing bootstrap is
  enrolled for its provisioned current financial year. Its administrator sees
  setup on first sign-in. A fresh bootstrap's default account is not suitable
  for public launch: provision secure administrator credentials before handover.
- For separately provisioned accounts, insert a manufacturer_onboarding record
  with its factory ID, provisioned year label and administrator user code through
  a trusted provisioning process. Never expose an unauthenticated enrollment API.
- Completed setup does not show again. Future edits use Company Details.

## Persistence and compatibility

Drafts, current step and version are stored in PostgreSQL. Save and leave also
accepts incomplete drafts. Continue validates the current step. Final completion
validates all fields, requires confirmation and applies the company identity,
GST location, print heading/address and initial numbering in one transaction.
Phone and email are retained in the completed setup profile and print heading.

The setup year is the provisioned session year, displayed read-only. Changing or
creating financial years is not part of this feature. Setup state is scoped to
the manufacturer and its enrollment year, not to a browser or employee.

For existing company configuration, all prefixes and book-grouping preferences
are read-only and preserved on the server. Other existing flags and legacy tax
fields are not overwritten. Missing or inadequate rights are denied. Draft
versions prevent two administrators from silently replacing each other's work.
GST checks are structural/state consistency checks, not government verification.

## Verification

`node --test tests/onboarding-engine.test.cjs` runs real PostgreSQL integration
checks in a disposable schema without access to the public schema. It tests
authorization, draft resume, version conflicts, confirmation, validation,
atomic rollback, completion persistence and existing-customer compatibility.

`node tests/onboarding-ui-smoke.cjs` drives Chromium through the actual wizard
and handlers against another disposable schema, including incomplete draft
resume, review, phone scrolling, version conflict and completion. This is an
isolated integration fixture, not a bypass in the live application's sign-in.
