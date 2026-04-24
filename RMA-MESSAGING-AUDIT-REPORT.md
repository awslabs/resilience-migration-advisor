# RMA Messaging and Safety Hardening Report

**Date:** 2026-04-24
**Scope:** `scripts.js`, `index.html`, `styles.css`, `README.md`, `rma-advisor.html`

---

## Summary

The RMA tool was audited for messaging alignment with AWS service-level resilience language, legal-safe positioning, decision-making framing, safety disclaimers, partner role clarity, compliance language, and discovery script documentation. All identified items were addressed with minimal, targeted text changes. No functional logic was modified.

---

## Changes Applied

### Terminology Normalization
- "healthy region" → "closest available region" (DNS routing description)
- "unhealthy endpoints" → "endpoints that fail health checks" (DNS routing description)
- "Region disruption — DR activation" → "Service impairment — recovery activation" (support case subject)
- "Immediate DR" was already renamed to "Accelerated Recovery" in a prior commit — verified no remaining occurrences

### Decision Framework Addition
- Added a decision checkpoint callout before the runbook steps in the UI: "Before initiating recovery actions, validate: the workload is impacted at the business level, observability confirms the scope of impact, and the issue scope (service, AZ, or broader) is understood"
- Same checkpoint added to the markdown export before the runbook section

### Safety Disclaimers
- Added safety disclaimer to the runbook tab: "Validate service availability and permissions before executing recovery steps. Runbooks should be tested prior to production use."
- Added two additional safety lines to the copyScript header
- Existing disclaimers in partner workflows and summary tabs were verified as present and adequate

### Partner Workflow Clarity
- "Engage AWS partners for disaster recovery or migration assistance" → "Optional AWS partners and ISV tools can support implementation and acceleration of your recovery plan"
- "connects you with MENA-region AWS partners" → "provides access to optional MENA-region AWS partners"
- "Engage MENA-region AWS partners for disaster recovery or migration help" → "Optional MENA-region AWS partners and ISV tools for disaster recovery or migration support"
- Tool remains primary; partners are positioned as optional acceleration

### Compliance Language Correction
- "Compliance-Eligible Target Regions" → "Target Regions for Compliance Review"
- Existing compliance validation step already includes: "Validate that the target region meets your data residency and sovereignty requirements. Obtain stakeholder and compliance sign-off before proceeding." — no further changes needed

### Discovery Script Safety Clarification
- Added multi-account guidance to README: "For multi-account environments, run per account or adapt using AWS Organizations and role assumption"
- Added explicit safety bullet points: read-only, local credentials, no external transmission, scoped environments
- Existing README already contained strong read-only and security documentation — verified adequate

### Speed Claim Correction
- No "hours to minutes", "instant recovery", or "recover in minutes" claims were found in the codebase
- "Fastest possible recovery" was already changed to "Fastest viable recovery" in the Accelerated Recovery rename
- No further changes needed

---

## Validation

- No syntax errors in `scripts.js` (verified via diagnostics)
- `rma-advisor.html` rebuilt successfully (9982 lines)
- Built artifact verified: no occurrences of "healthy region", "Immediate DR", "IMMEDIATE DR", "regional disruption", or "Region disruption"
- Decision checkpoint and safety disclaimer confirmed present in built artifact (UI and markdown export)
- All existing S3 gating logic preserved — no functional changes made
- Partner mode, Architecture Strategy, and Accelerated Recovery modes all generate correct output

---

## Final Status

RMA messaging and guidance are now aligned with AWS best practices and legal-safe positioning, with no impact to functional behavior. All terminology uses service-level and workload-impact framing. Recovery actions are preceded by decision validation checkpoints and safety disclaimers. Partners are positioned as optional acceleration. Compliance language defers to customer validation. Discovery script documentation includes multi-account guidance and safety clarifications.
