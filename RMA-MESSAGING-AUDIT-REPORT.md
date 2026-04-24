# RMA Messaging and Safety Hardening Report

**Date:** 2026-04-24

---

## Summary

The Resilience Migration Advisor (RMA) was reviewed for messaging alignment with AWS resilience best practices, legal-safe positioning, decision-making framing, safety disclaimers, partner role clarity, compliance language, and discovery script documentation. All identified items were addressed with targeted text changes. No functional logic was modified.

---

## Changes Applied

### Terminology
- Replaced region health terminology ("healthy region", "unhealthy endpoints") with service-level framing ("closest available region", "endpoints that fail health checks")
- Replaced "Region disruption" with "Service impairment" in support case templates
- Confirmed "Immediate DR" was already renamed to "Accelerated Recovery" in a prior update

### Decision Framework
- Added a decision checkpoint before runbook steps prompting users to validate workload impact, observability scope, and issue scope before initiating recovery actions
- Applied consistently across the UI runbook tab and the markdown export

### Safety Disclaimers
- Added a safety disclaimer to the runbook tab: "Validate service availability and permissions before executing recovery steps. Runbooks should be tested prior to production use."
- Added safety lines to the exported shell script header
- Verified existing disclaimers in partner workflows and summary tabs are adequate

### Partner Role Clarity
- Updated partner-assisted descriptions to position partners and ISV tools as optional acceleration, not a required path
- Tool-generated guidance remains the primary output; partner engagement is presented as an optional complement

### Compliance Language
- Renamed "Compliance-Eligible Target Regions" to "Target Regions for Compliance Review"
- Existing compliance validation steps already defer to customer legal and compliance teams — no further changes needed

### Discovery Script Documentation
- Added explicit safety documentation: read-only API calls, local credential use, no external data transmission, scoped single-account design
- Added multi-account guidance: "For multi-account environments, run per account or adapt using AWS Organizations and role assumption"

### Speed Claims
- No over-promising speed language ("hours to minutes", "instant recovery", "recover in minutes") was found in the codebase
- "Fastest possible recovery" was already updated to "Fastest viable recovery" in the Accelerated Recovery rename

---

## Validation

- No syntax errors detected
- Static artifact rebuilt successfully
- Built artifact verified: no occurrences of flagged terminology
- Decision checkpoint and safety disclaimer confirmed present in UI and markdown export
- All existing functional logic (S3 gating, mode isolation, export consistency) preserved
- No test regressions

---

## Status

RMA messaging and guidance are aligned with AWS resilience best practices and legal-safe positioning, with no impact to functional behavior. Recovery actions are preceded by decision validation checkpoints and safety disclaimers. Partners are positioned as optional acceleration. Compliance language defers to customer validation. Discovery script documentation includes safety clarifications and multi-account guidance.
