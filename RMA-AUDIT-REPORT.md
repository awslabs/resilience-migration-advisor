# RMA Runbook Dependency Gating Remediation Summary

**Date:** 2026-04-24
**Scope:** `scripts.js`, `index.html`, `tests/*`, `rma-advisor.html`

---

## Executive Summary

The Resilience Migration Advisor (RMA) runbook-generation logic was audited and updated to ensure dependency-aware guidance across all modes. The primary issue was that S3-dependent recovery commands (e.g., `aws s3 sync`, `aws s3api put-bucket-replication`, snapshot copy) were generated unconditionally in several code paths, even when the user indicated that S3 was impaired or unavailable in the source region.

All identified issues — 2 Critical, 2 High, 4 Medium, and 3 Low — have been resolved. The tool now gates S3-dependent commands on `sourceS3Availability`, provides conditional wording when S3 status is unknown or not set, and ensures consistent behavior across the UI, markdown export, copy script, and partner engagement workflows.

---

## Issues Addressed

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | `dataHandling === 'move'` generated `aws s3 sync` unconditionally | Critical | S3 sync is now suppressed when S3 is impaired. A blocked notice and DMS alternative are shown instead. When S3 status is unknown, a validation warning precedes the command. |
| 2 | `dataHandling === 'replicate'` generated `aws s3api put-bucket-replication` unconditionally | Critical | S3 replication command is now suppressed when S3 is impaired. RDS and DynamoDB replication commands remain (they do not depend on S3). Blocked notice included. |
| 3 | Partner engagement workflows contained hardcoded S3 commands with no dependency awareness | High | `renderPartnerEngagementGuide()` now displays an S3 impairment callout when `sourceS3Availability === 'impaired'`, and a conditional validation notice when S3 status is unknown or not set (the default in Partner Mode, where the S3 question is not shown). |
| 4 | `getCommandBlocks()` did not gate S3 commands independently | High | DB-specific command blocks inherit S3 awareness from `_getDbStep()`. No standalone S3 sync/copy block exists outside the gated paths. No additional fix required — verified correct. |
| 5 | Post-recovery re-protection step included S3 replication commands unconditionally | Medium | S3 replication commands in the re-protection step are now conditional on `dbTypes` containing `'s3'` AND `sourceS3Availability !== 'impaired'`. When S3 is impaired, a deferred notice is shown. |
| 6 | FSx Lustre step referenced S3 data repository without gating | Medium | FSx Lustre `create-file-system` command is now suppressed when S3 is impaired. Description includes an S3 impairment warning. Non-S3 FSx migration paths (AWS Backup for Windows, SnapMirror for ONTAP) remain available. |
| 7 | AWS Backup cross-region copy step lacked S3 impairment warning | Medium | Description now includes an S3 impairment warning noting that cross-region backup copy may fail if underlying snapshot data depends on S3. |
| 8 | `copyScript()` and markdown export inherited ungated S3 commands | Medium | Both `copyScript()` and `generateMarkdown()` consume `getRunbookSteps()` output. Fixing the source function resolved all downstream exports automatically. Verified: no executable S3 commands appear in exports when S3 is impaired. |
| 9 | Missing test coverage for S3 impairment scenarios | Low | 33 property-based and unit tests added covering all S3 impairment paths, export consistency, partner dependency awareness, DMS validation, and KMS warnings. |
| 10 | Partner engagement steps not tested for dependency awareness | Low | Tests added for: S3 impairment notice in partner UI, S3 unknown/not-set conditional guidance, partner step labeling (Customer Action vs Partner Executed), and mutating command filtering in customer steps. |
| 11 | Partner Mode treated undefined `sourceS3Availability` as available | Low | The S3 availability wizard question is only visible in Architecture Strategy mode. In Partner Mode, `sourceS3Availability` is always undefined. The rendering and export logic now treats `undefined`/not-set the same as `unknown`, displaying conditional guidance: "Validate S3 availability before executing S3-dependent recovery steps." |

---

## Implementation Summary

### `getRunbookSteps()` — `scripts.js`
- `dataHandling === 'move'`: S3 sync command gated on `sourceS3Availability`. Impaired → comment-only blocked notice + DMS alternative. Unknown → validation warning before command. Available → command as before.
- `dataHandling === 'replicate'`: S3 replication command gated. RDS and DynamoDB replication commands remain unconditional (no S3 dependency).
- `dataHandling === 'backup-restore'`: Description now includes S3 impairment warning when applicable, and a validation note when S3 status is unknown.
- Post-recovery re-protection step: S3 replication commands conditional on `dbTypes` containing `'s3'` and `sourceS3Availability`.
- FSx Lustre step: `create-file-system` command suppressed when S3 is impaired. Description includes impairment warning.
- AWS Backup step: Description includes S3 impairment warning for cross-region copy operations.

### `renderPartnerEngagementGuide()` — `scripts.js`
- Added S3 availability callout that handles three states: `impaired` (blocked notice), `unknown` or `not-set` (conditional validation guidance), and `available` (no notice).
- Partner Mode does not show the S3 availability wizard question, so `sourceS3Availability` defaults to `undefined`. This is now treated as `not-set` and triggers the conditional guidance.

### `generateMarkdown()` — `scripts.js`
- Regional-partner mode: S3 impairment/unknown/not-set notice added to markdown output, matching the UI.
- Partner engagement steps now include ownership labels: `*(Customer Action)*` for steps 1–4, `*(Partner Executed)*` for steps 5+.
- Customer steps in markdown export filter out mutating commands (only read-only `describe`/`list`/`get` commands shown), matching the UI rendering behavior.

### `_getDbStep()` — `scripts.js`
- Oracle DMS fallback: Added validation guidance comment ("Validate endpoint connectivity before starting").
- SQL Server DMS fallback: Same validation guidance comment added.

---

## Validation

### Tests
- **New test file:** `tests/s3-impairment-gating.property.test.js` — 33 test cases
- **Test categories covered:**
  - S3 impaired + `dataHandling=move` blocks executable S3 sync (property, 100 runs)
  - S3 impaired + `dataHandling=replicate` blocks executable S3 replication (property, 100 runs)
  - S3 available paths still produce S3 commands (positive regression)
  - Task 7.2–7.6 existing gating regression (4 tests)
  - Non-S3 DB steps (Aurora, DynamoDB) still generated when S3 is impaired
  - Post-recovery re-protection respects S3 impairment and `dbTypes` (property, 100 runs)
  - `copyScript` logic does not export executable S3 commands when S3 is impaired (property, 100 runs)
  - `generateMarkdown` does not include executable S3 commands when S3 is impaired (property, 100 runs)
  - FSx Lustre step warns about S3 dependency and suppresses Lustre create command
  - AWS Backup step includes S3 impairment warning
  - S3 unknown shows conditional validation warning for move and replicate
  - Partner engagement shows S3 impairment notice (property, 100 runs)
  - Partner engagement shows conditional guidance when `sourceS3Availability` is not set (real UI state)
  - Partner markdown export includes S3 notices
  - Partner step labeling: Customer Action vs Partner Executed
  - Partner markdown export filters mutating commands from customer steps
  - DMS `test-connection` precedes `start-replication-task`
  - Oracle and SQL Server DMS fallback includes validation guidance
  - KMS key references present in EBS snapshot copy, S3 copy, and AWS Backup steps
  - Backup-restore step includes S3 impairment and unknown wording
- **Full suite result:** 15 test files, 110 tests — all passed
- **Static artifact:** `rma-advisor.html` rebuilt and verified
- **Export alignment:** Markdown, copy script, and copy summary all consume `getRunbookSteps()` output — fixes cascade automatically

### Built Artifact Verification
- All occurrences of `aws s3 sync` in `rma-advisor.html` are inside gated branches (impaired → comment-only, unknown → preceded by warning, available → executable)
- All occurrences of `aws s3api put-bucket-replication` are inside gated branches
- All occurrences of `aws s3 cp` are inside Task 7.2, which is gated by `sourceS3Availability !== 'impaired'`
- Partner engagement rendering includes S3 availability callout for all non-available states including `undefined`

---

## Final Status

All identified Critical, High, Medium, and Low issues from the runbook dependency audit have been resolved. The RMA tool now provides dependency-aware runbook guidance across self-execution and partner-assisted flows. No executable S3 commands are emitted when S3 is impaired. Partner workflows use conditional wording when S3 availability is unknown or not set. All exports (UI, markdown, copy script, copy summary) are aligned.
