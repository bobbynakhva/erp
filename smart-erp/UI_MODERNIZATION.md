# ERP interface modernization

## Preservation baseline

The pre-change catalog is `tests/ui-structure-baseline.json`. Run
`python3 tests/check_ui_structure.py` from this directory to compare the current
interface with that baseline.

It records every existing identified section in document order, every form
control and its original scope/order/type, and every table's heading sequence.
It also fingerprints the original layout stylesheet, all public JavaScript
modules and the server so presentation work cannot silently change behavior.

Representative established layouts:

- Login: accounting year, then User Name and Password in label/control rows,
  then Login. License remains before the form in keyboard order.
- Company: existing company/registration/contact sections and their grids.
- Customer: existing master/details fields and list columns.
- Manufacturing invoice: existing header, line-item grid, totals and actions.
- Dashboard: existing financial summaries, metal rates, launchpad and operations
  tables, in their original sequence. Data still comes from the original APIs.
- Module dialogs/windows: original hidden/open states, controls, dimensions and
  form-grid definitions remain in the original layout stylesheet.

## Approved visual system

Use the approved Premium Tamba Login concept as the visual reference:
photographic brand region, paper/steel surfaces, deep teal emphasis, DM Sans
for operational text, DM Mono for short metadata and tabular values, and
Newsreader for selected editorial headings. Operational forms stay compact;
editorial typography must not reduce table readability.

Login presentation is isolated in `public/premium-login.css`. The application's
shared design tokens and module treatments belong in `public/modern-theme.css`;
the original `public/styles.css` retains the established form geometry.

No backend, API, permissions, calculations or business workflow changes are
part of this modernization.

The previous theme's universal centered-window and max-content sizing overrides
were removed: they conflicted with original inset-based layouts and clipped the
Company form. Stage-mounted forms now use their original stylesheet bounds.
Body-mounted transaction windows reserve space for the application shell while
retaining their original internal grids and line-item areas. The header and
navigation rail have their own presentation sizing; the existing sidebar
collapse action is respected through its `hidden` state.

Sidebar flyouts have a bounded width and their own navigation layer above open
forms. `public/menu-layout.js` only constrains the existing renderer's popup to
the viewport; menu entries, permission checks and destinations remain in the
unchanged application script. Run `node smart-erp/tests/menu-smoke.cjs` from
the workspace root to check all sidebar categories, nested Admin navigation,
outside-click dismissal and sidebar collapse in light/dark at multiple widths.
These are anonymous, browser-local layout checks, not authenticated role tests.

## Verification

- `python3 tests/check_ui_structure.py`: full static preservation check.
- `node tests/ui-smoke.cjs`: live signed-out controls, year loading, License
  dialog, keyboard progression, error focus, mobile fit and login/theme states.
  Login rejection is intercepted only in the test browser; no test credentials
  are sent to the server.
- The same browser script renders script-free source fixtures for dashboard,
  Company, Customer and Manufacturing Invoice in light/dark. This verifies CSS
  and original grids without changing live authentication. It is not a claim
  that authenticated CRUD, role permissions, posting or PDF exports were
  exercised against a signed-in session.
