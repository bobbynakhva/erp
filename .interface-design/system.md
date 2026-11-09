# Premium Tamba

Approved reference: the Premium Tamba login concept. Its photographic/editorial
brand region and separate credential region are the visual reference for the
live ERP, not a separate product or authentication system.

## Intent

Precise, premium manufacturing software suited to long operational sessions.
Use the source form structure and existing data as the constraint, not legacy
desktop-window decoration.

## Visual roles

- **Palette:** cool paper and brushed-steel neutrals, deep teal emphasis.
  Amber, red and green communicate existing warning/error/success states.
- **Surfaces/depth:** solid layered surfaces, fine borders, restrained shadows.
  Avoid frosted glass, heavy gradients, decorative shadows and pill-shaped
  operational actions.
- **Typography:** DM Sans for operational text; DM Mono for concise metadata
  and tabular figures; Newsreader only for selected editorial headings.
- **Spacing:** generous brand and shell presentation; compact, consistent
  operational forms and tables. Keep original field columns and sequence.
- **Interaction:** visible keyboard focus, readable disabled/read-only states,
  retained keyboard workflows and reduced-motion support.
- **Responsive behavior:** the login stacks at narrow widths. Business forms
  retain their established grids and use scrolling rather than reordering
  fields or hiding table columns.

## Sources of truth

- `smart-erp/public/modern-theme.css`: shared operational tokens and styling.
- `smart-erp/public/premium-login.css`: approved login presentation.
- `smart-erp/public/styles.css`: original business form geometry.
- `smart-erp/UI_MODERNIZATION.md`: preservation and verification notes.

Preserve backend/API contracts, authentication, permissions, calculations,
validation, data, existing fields, table columns and business workflows.
