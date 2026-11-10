---
name: Product positioning
description: Intended commercial audience and delivery model for the ERP.
---

The user wants to sell this app to other manufacturers as SaaS.

**Why:** The user explicitly stated this commercial goal, rather than positioning the app solely as an internal Tamba tool.

**How to apply:** Consider an independent product identity and multiple manufacturer customers when discussing branding and future product requirements. This goal alone does not authorize architecture changes.

The user chose first-time onboarding for the new manufacturer's administrator,
not a repeated wizard for every employee.

**Why:** The user explicitly selected “New manufacturer administrator.”

**How to apply:** Keep company configuration an administrator workflow. Employee
welcome guidance, public signup and customer provisioning are separate scope.

The user selected separate deployments for customer workspaces.

**Why:** The user accepted that model as the recommended fit for the existing
ERP and initial SaaS customers, instead of a shared application with database routing.

**How to apply:** Preserve a separate ERP deployment and database per manufacturer.
Do not substitute a shared-database company list or an unverified factory filter
for isolation. Changing this hosting model requires an explicit decision.

The user selected Hostinger for hosting the SaaS owner panel.

**Why:** The user chose “Use Hostinger” rather than publishing the owner panel
on Replit.

**How to apply:** Prepare the owner deployment for Hostinger. Do not assume a
particular Hostinger plan or database service has been provisioned.
