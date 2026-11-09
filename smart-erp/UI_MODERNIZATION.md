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

Business-window stacking uses the bring-to-front option rather than closing
other forms or adding a close prompt. Newly shown windows activate automatically;
clicking/focusing an open window activates it, and selecting an already-open
window through its matching opener activates it again. This only updates
presentation layers, leaving original save, close, permission and API logic in
place. Navigation and confirmation overlays stay above normal windows.

Run `node smart-erp/tests/window-manager-smoke.cjs` to reproduce Users → Production
→ Internal Work Order using browser-only read fixtures. It verifies visible
stacking, retained input, click/focus activation, reopening, closing/revealing,
body-mounted forms and overlay priority in light/dark at two viewport sizes.
All server mutations are blocked by the test; it does not verify a real user's
signed-in session.

### Full-workspace responsive business forms

Main business forms now use the available stage bounds, including forms mounted
outside the stage in the legacy document. The header and desktop sidebar remain
accessible. Narrow form groups stack without reordering fields; data tables keep
every column and scroll horizontally. Action groups wrap, and long forms scroll
vertically rather than clipping fields or Close buttons. On phones, the sidebar
is a toggleable drawer and closes after selecting a menu leaf.

`workspace-layout.js` / `workspace-layout.css` are presentation-only additions.
They do not save, clear, close, authenticate or authorize business forms.
The existing bring-to-front manager is retained. Compact confirmation dialogs
and print styles are not maximized.

`node smart-erp/tests/workspace-responsive-smoke.cjs` checks all 80 business
windows in source-HTML fixtures across desktop, short screens, tablet and phone,
light/dark and sidebar states. It checks workspace bounds, horizontal control
fit, reachable Close actions and access to the final wide-table column.
`window-manager-smoke.cjs` additionally uses the actual menu/openers with
browser-only read fixtures to verify phone drawer navigation and retained
unsaved input after resizing. Neither test changes live records or claims
authenticated role/CRUD verification.

Report pages (GST, Audit, Traceability and User Status) participate in the same
bounded business-window stack; they no longer retain an always-on-top layer
above navigation. Blocking confirmation dialogs remain above the workspace.

Populated GST reconciliation rows reserve room for follow-up text and the Copy
Notice action. The button stays on one line, and the wide table scrolls instead
of compressing the label into a vertical column.

`node smart-erp/tests/gst-layout-smoke.cjs` exercises the actual GST renderer with
intercepted report/reconciliation responses, validates menu hit-testing and
single-line reachable Copy Notice buttons across light/dark desktop, tablet and
phone widths, and checks copying with an isolated clipboard stub. No test POST
or clipboard content reaches live services. `menu-smoke.cjs` also checks all
sidebar categories over each report page, not only Users.

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
