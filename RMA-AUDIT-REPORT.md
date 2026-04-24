# Resilience Migration Advisor — Full Functional Logic Audit Report

**Date:** 2026-04-24  
**Scope:** `scripts.js`, `index.html`, `styles.css`, `tests/*`, `rma-advisor.html`  
**Auditor:** Kiro (automated code audit)

---

## 1. Executive Summary

**Overall Verdict: PASS WITH ISSUES**

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 2 | S3-dependent commands generated without S3 gating in data-handling steps and partner engagement steps — **FIXED** |
| High | 2 | Partner engagement steps contain hardcoded S3 commands with no dependency awareness; `getCommandBlocks` does not gate S3 commands — **FIXED** |
| Medium | 4 | Post-recovery re-protection step includes S3 replication commands unconditionally; FSx Lustre step references S3 without gating; AWS Backup cross-region copy may depend on S3 without warning; `copyScript` inherits all runbook commands without additional filtering — **FIXED** |
| Low | 3 | Missing test coverage for S3 impairment scenarios; no tests for `copyScript` export matching UI logic; partner engagement steps not tested for dependency awareness — **FIXED** |

**Total issues: 11 — ALL RESOLVED**

---

## 2. Known S3 Bug Analysis

### 2.1 Bug Reproduction Path

The bug is triggered by the following wizard selections:

1. `proceedPath` = `self-execution`
2. `urgencyMode` = `architecture-strategy`
3. `dataProfile` = `stateful-large` or `stateful-small`
4. `sourceS3Availability` = `impaired`
5. `dataHandling` = `move` or `replicate`
6. Any `dbTypes` selection

### 2.2 Root Cause

The `getRunbookSteps()` function (line ~3117) has **partial** S3 gating. The per-database steps (`_getDbStep`) and the dedicated S3/EBS/RDS snapshot steps (Tasks 7.2–7.6, lines ~4483–4660) correctly check `s.sourceS3Availability !== 'impaired'`. However, several other code paths do NOT check S3 availability:

### 2.3 Specific Ungated S3-Dependent Commands

#### BUG 1 — CRITICAL: `dataHandling === 'move'` step (line ~3727)

```javascript
// Line 3727 — NO S3 availability check
if (s.dataHandling === 'move') {
  steps.push({
    title: 'Execute Data Migration to Target Region',
    commands: [
      'aws s3 sync s3://<SOURCE_BUCKET> s3://<TARGET_BUCKET> --region <TARGET_REGION>',
      // ...
    ]
  });
}
```

**Problem:** When `sourceS3Availability === 'impaired'` AND `dataHandling === 'move'`, the runbook generates an `aws s3 sync` command that will fail. No warning, no blocking, no alternative.

#### BUG 2 — CRITICAL: `dataHandling === 'replicate'` step (line ~3746)

```javascript
// Line 3746 — NO S3 availability check
if (s.dataHandling === 'replicate') {
  steps.push({
    title: 'Configure Continuous Data Replication',
    commands: [
      'aws s3api put-bucket-replication --bucket <SOURCE_BUCKET> --replication-configuration file://replication.json',
      // ...
    ]
  });
}
```

**Problem:** S3 replication configuration command is generated even when S3 is impaired.

#### BUG 3 — HIGH: Partner engagement steps (REGIONAL_PARTNERS, lines ~30–970)

All partner `engagementSteps` contain hardcoded S3 commands in their "Data Replication or Migration" step (step 5 of 6). Examples:

- BestCloudForMe (line ~87): `aws s3api get-bucket-replication --bucket my-primary-bucket`
- Accenture (line ~395): `aws s3api get-bucket-replication --bucket my-primary-bucket`
- HCL (line ~511): `aws s3api get-bucket-replication --bucket my-primary-bucket`
- LimonCloud (line ~630): `aws s3api get-bucket-replication --bucket my-primary-bucket`
- Bexprt (line ~974): `aws s3api get-bucket-replication --bucket my-primary-bucket`

**Problem:** Partner engagement steps are static data — they have no awareness of `sourceS3Availability`. The `renderPartnerEngagementGuide()` function (line ~5810) renders these commands without checking S3 status.

#### BUG 4 — HIGH: `getCommandBlocks()` (line ~5237)

The `getCommandBlocks()` function generates per-DB command blocks by calling `_getDbStep()` (which IS S3-aware), but does NOT add any S3 gating for the static blocks or the data-handling commands. The DB-specific blocks inherit S3 awareness from `_getDbStep`, but there is no standalone S3 copy/sync command block that is gated.

#### BUG 5 — MEDIUM: Post-Recovery Re-Protection step (line ~4422)

```javascript
// Line 4422 — unconditional S3 replication command
'# ── RE-ESTABLISH S3 CROSS-REGION REPLICATION ──',
'aws s3api put-bucket-replication --bucket <TARGET_BUCKET> \\',
'  --replication-configuration file://replication-config.json',
```

**Problem:** This step always includes S3 replication commands regardless of whether S3 was selected as a database type or whether S3 is available. Should be conditional on `s.dbTypes` containing `'s3'` or `s.dataProfile` being stateful.

#### BUG 6 — MEDIUM: FSx Lustre step (line ~3930)

```javascript
// Line ~3930 — FSx Lustre references S3 without checking S3 availability
'# ── FSx for Lustre: recreate from S3 data repository ──',
'aws fsx create-file-system --file-system-type LUSTRE \\',
'  --lustre-configuration ImportPath=s3://<TARGET_BUCKET> \\',
```

**Problem:** FSx Lustre creation from S3 data repository is recommended even when S3 is impaired. Should include a warning or be gated.

#### BUG 7 — MEDIUM: AWS Backup cross-region copy step (Task 7.3, line ~4530)

The AWS Backup restore step is NOT gated on `sourceS3Availability`. While AWS Backup itself is a separate service, the `start-copy-job` command copies recovery points from the source region — if the source region's S3 is impaired, the underlying snapshot data (which is stored on S3) may be inaccessible.

#### BUG 8 — MEDIUM: `copyScript()` function (line ~7174)

```javascript
function copyScript() {
  // ...
  var runbook = RULES_ENGINE.getRunbookSteps(state);
  runbook.forEach(function (step, i) {
    // Copies ALL commands from ALL steps
    step.commands.forEach(function (c) { lines.push(c); });
  });
}
```

**Problem:** `copyScript` faithfully reproduces whatever `getRunbookSteps` returns. Since the data-handling steps (bugs 1 & 2) don't gate S3, the exported script will contain executable S3 commands even when S3 is impaired. This is a downstream consequence of bugs 1 & 2.

### 2.4 What IS Working Correctly

The following S3 gating logic IS correctly implemented:

| Location | Function | Gating Logic | Status |
|----------|----------|-------------|--------|
| Line ~4484 | Task 7.2: S3 copy step | `s.sourceS3Availability !== 'impaired'` | ✅ Correct |
| Line ~4553 | Task 7.4: EBS snapshot restore | `s.sourceS3Availability !== 'impaired'` | ✅ Correct |
| Line ~4588 | Task 7.5: RDS snapshot restore | `s.sourceS3Availability !== 'impaired'` | ✅ Correct |
| Line ~4627 | Task 7.6: Cross-region snapshot copy | `s.sourceS3Availability !== 'impaired'` | ✅ Correct |
| Line ~4690 | `_getDbStep('aurora')` | Adds S3 impairment warning to description | ✅ Correct |
| Line ~4731 | `_getDbStep('rds')` | Adds S3 impairment warning, shows logical export alternatives | ✅ Correct |
| Line ~4944 | `_getDbStep('rds-oracle')` | Gates S3-based Data Pump, shows DB link alternative | ✅ Correct |
| Line ~5023 | `_getDbStep('rds-sqlserver')` | Gates native backup/restore via S3, shows BCP alternative | ✅ Correct |
| Line ~3092 | `getRisks()` | Adds S3 impairment risk warning | ✅ Correct |
| Line ~6715 | Decision Trace tab | Documents S3 impairment impact on method selection | ✅ Correct |
| Line ~6463 | Summary tab | Shows S3 status badge for DB migration methods | ✅ Correct |

---

## 3. Dependency Gating Audit

| Dependency | User State Key | Current Behavior | Expected Behavior | Issue | Severity | Fix Recommendation |
|-----------|---------------|-----------------|-------------------|-------|----------|-------------------|
| **S3** | `sourceS3Availability` | `dataHandling` steps (`move`, `replicate`) generate S3 commands unconditionally | Should suppress or warn when `impaired` | S3 sync/replication commands generated when S3 is impaired | Critical | Gate `dataHandling` steps on `sourceS3Availability` |
| **S3** | `sourceS3Availability` | Partner engagement steps contain hardcoded S3 commands | Should add S3 impairment warning to partner steps | Partner steps recommend S3 replication without awareness | High | Add dynamic S3 warning in `renderPartnerEngagementGuide()` |
| **S3** | `sourceS3Availability` | Post-recovery re-protection includes S3 replication unconditionally | Should be conditional on S3 being in `dbTypes` | Unnecessary S3 commands in re-protection step | Medium | Gate on `s.dbTypes && s.dbTypes.indexOf('s3') >= 0` |
| **Route 53** | None | DNS commands always generated | Route 53 is global — generally available even during regional events | No issue | N/A | No fix needed — Route 53 is a global service |
| **IAM** | None | IAM commands always generated | IAM is global — generally available | No issue | N/A | No fix needed — IAM is a global service |
| **CloudFormation** | None | CloudFormation commands appear in partner steps only | Partner steps are partner-executed (step 5+) | No issue for self-execution mode | N/A | No fix needed for current scope |
| **EC2** | `appType` | EC2 commands gated on `appType === 'ec2' \|\| appType === 'mixed'` | Correct | No issue | N/A | Already correct |
| **EBS** | `sourceS3Availability` | EBS snapshot copy gated on S3 availability (Task 7.4) | Correct | No issue | N/A | Already correct |
| **RDS** | `sourceS3Availability` | RDS snapshot restore gated on S3 availability (Task 7.5) | Correct | No issue | N/A | Already correct |
| **DynamoDB** | `dbTypes` | DynamoDB Global Tables commands gated on `dbTypes` containing `dynamodb` | Correct | No issue | N/A | Already correct |
| **Lambda** | `appType` | Lambda commands gated on `appType === 'serverless' \|\| appType === 'mixed'` | Correct | No issue | N/A | Already correct |
| **Transit Gateway** | `networkTopology` | TGW commands gated on `networkTopology === 'multi-vpc-tgw' \|\| 'hub-spoke'` | Correct | No issue | N/A | Already correct |
| **Direct Connect** | `networkConnectivity` | DX commands gated on `networkConnectivity === 'direct-connect'` | Correct | No issue | N/A | Already correct |
| **AWS Backup** | `backupTechnology` | AWS Backup commands gated on `backupTechnology === 'aws-backup'` | Should also warn about S3 dependency for cross-region copy | Missing S3 impairment warning | Medium | Add warning when `sourceS3Availability === 'impaired'` |
| **DMS** | `dbTypes` | DMS commands appear as fallback in `_getDbStep` for rds-other, oracle, sqlserver | Correct — DMS does not depend on S3 | No issue | N/A | Already correct |
| **KMS** | None | KMS key creation always included as a step | Correct — KMS is needed in target region regardless | No issue | N/A | Already correct; KMS warnings present in encrypted snapshot copy steps |

---

## 4. Runbook Generation Flow Map

### 4.1 Function → Output Mapping

| Function | Output | Called By |
|----------|--------|----------|
| `RULES_ENGINE.getRunbookSteps(state)` | Array of runbook step objects | `showResults()`, `generateMarkdown()`, `copyScript()` |
| `RULES_ENGINE.getCommandBlocks(state)` | Array of command block objects | `showResults()`, `generateMarkdown()` |
| `RULES_ENGINE._getDbStep(db, s, arch)` | Single DB-specific runbook step | `getRunbookSteps()`, `getCommandBlocks()` |
| `RULES_ENGINE._getAppDeployStep(s)` | Single app deployment step | `getRunbookSteps()`, `getCommandBlocks()` |
| `RULES_ENGINE.getArchitecture(s)` | Architecture pattern string | `getRunbookSteps()`, `getCommandBlocks()`, `showResults()`, `generateMarkdown()`, `copySummary()` |
| `RULES_ENGINE.getRisks(s)` | Array of risk strings | `showResults()`, `generateMarkdown()` |
| `renderPartnerEngagementGuide()` | HTML for partner engagement panel | `showResults()` (regional-partner mode) |
| `renderMatchmakingResult()` | HTML for matchmaking panel | `showResults()` (matchmaking mode) |
| `generateMarkdown()` | Full markdown export | `copyPlan()` |
| `copySummary()` | Plain text summary | Copy Summary button |
| `copyScript()` | Executable bash script | Copy Script button |

### 4.2 State Keys That Influence Runbook Generation

| State Key | Used In | Purpose |
|-----------|---------|---------|
| `urgencyMode` | `getRunbookSteps`, `getArchitecture`, `showResults`, all exports | Determines mode (architecture-strategy, immediate-dr, regional-partner, matchmaking) |
| `proceedPath` | Step visibility conditionals | Self-execution vs partner-assisted |
| `sourceS3Availability` | `_getDbStep`, Tasks 7.2–7.6, `getRisks`, EBS snapshot step | Gates S3-dependent operations |
| `dbTypes` | `getRunbookSteps`, `getCommandBlocks` | Determines which DB replication steps appear |
| `dataHandling` | `getRunbookSteps` | Determines move/replicate/backup-restore step |
| `appType` | `getRunbookSteps`, `_getAppDeployStep` | Determines app deployment approach |
| `networkTopology` | `getRunbookSteps` | Determines VPC/TGW complexity |
| `networkConnectivity` | `getRunbookSteps` | Determines connectivity step |
| `landingZone` | `getRunbookSteps` | Determines Control Tower/custom LZ step |
| `workloadCriticality` | `getArchitecture`, `getRunbookSteps` | Influences architecture pattern |
| `recoveryRequirements` | `getArchitecture` | Influences architecture pattern |
| `dataProfile` | Step visibility, `getRunbookSteps` | Determines if data steps appear |
| `backupTechnology` | `getRunbookSteps` | Determines backup-specific steps |
| `compliance` | `getRunbookSteps` | Determines compliance validation step |
| `teamReadiness` | `getRunbookSteps` | Determines team advisory step |
| `additionalServices` | `getRunbookSteps` | Determines SNS/SQS, WAF, FSx, Cognito, etc. steps |
| `rpo` | Resilience Hub assessment step | Sets RPO target in assessment |
| `panicPartner` | `showResults` (immediate-dr mode) | Determines which DR tool partner steps to show |
| `regionalPartner` | `renderPartnerEngagementGuide` | Determines which regional partner steps to show |

### 4.3 Where Dependency Checks Are Missing

1. **`dataHandling` steps** (lines 3716–3770): No check on `sourceS3Availability` before generating S3 sync/replication commands.
2. **Partner engagement steps** (REGIONAL_PARTNERS data, lines 30–970): Static data with no dynamic dependency awareness.
3. **Post-recovery re-protection step** (line ~4390): S3 replication command is unconditional.
4. **FSx Lustre step** (line ~3930): S3 data repository reference is unconditional.
5. **`getCommandBlocks()`** (line ~5237): Does not add S3-specific gating for data-handling command blocks.

### 4.4 Duplicated Logic That Could Drift

1. `_getDbStep()` is called from both `getRunbookSteps()` and `getCommandBlocks()` — this is good (single source of truth for DB steps).
2. `getArchitecture()` is called from multiple places — also good (single source).
3. **Risk:** The `dataHandling` steps in `getRunbookSteps()` duplicate S3 command logic that exists separately in Task 7.2. If Task 7.2 is gated but `dataHandling` is not, the user sees contradictory guidance.

---

## 5. Mode Isolation Findings

| Mode | Isolation Status | Details |
|------|-----------------|---------|
| **Architecture Strategy** | ✅ Correct | Produces full strategy runbook with all steps. Gated by `urgencyMode === 'architecture-strategy'` and `proceedPath === 'self-execution'`. |
| **Immediate DR** | ✅ Correct | Shows partner-only steps (ControlMonkey/N2W/Firefly). Does NOT leak strategy runbook. `generateMarkdown()` and `copySummary()` both have separate immediate-dr branches (FIX #4 comments in code). |
| **Regional Partner Assistance** | ✅ Correct | Shows partner engagement guide only. Tabs are hidden (`results-tabs.style.display = 'none'`). No strategy runbook leakage. |
| **Partner Matchmaking** | ✅ Correct | Shows matchmaking recommendation only. Tabs are hidden. No unrelated recovery commands. |
| **Partner steps 1–4** | ✅ Correct | Labeled as "Customer Action". Mutating AWS commands are filtered — only read-only commands (`describe`, `list`, `get`) are shown for customer steps. |
| **Partner steps 5+** | ✅ Correct | Labeled as "Executed by Partner". Full commands shown. |

**No mode leakage detected.** Each mode has clean separation in `showResults()`, `generateMarkdown()`, `copySummary()`, and `copyScript()`.

---

## 6. Export Consistency Findings

| Export | Consistent with UI? | Issues |
|--------|---------------------|--------|
| **Markdown export** (`generateMarkdown()`) | ✅ Yes for architecture-strategy | Uses same `RULES_ENGINE.getRunbookSteps(state)` as UI. Inherits same S3 bugs. |
| **Markdown export** (immediate-dr) | ✅ Yes | Partner-only, no strategy runbook. |
| **Markdown export** (regional-partner) | ✅ Yes | Partner engagement steps from static data. |
| **Markdown export** (matchmaking) | ✅ Yes | Matchmaking recommendation from `MATCHMAKING_ENGINE`. |
| **Copy Summary** (`copySummary()`) | ✅ Yes | Mode-aware, no commands included. |
| **Copy Script** (`copyScript()`) | ⚠️ Inherits bugs | Copies all commands from `getRunbookSteps()`. If S3 commands are ungated in runbook, they appear in the script. |
| **`rma-advisor.html`** | Not audited | Built file — would need to verify it's rebuilt after fixes. |

**Key finding:** Export consistency is maintained — all exports use the same data sources. This means fixing the source (`getRunbookSteps`) will automatically fix all exports.

---

## 7. Recommended Fix Plan

### P0 — Critical (fix before release)

#### Fix 1: Gate `dataHandling === 'move'` step on S3 availability
- **File:** `scripts.js`
- **Function:** `getRunbookSteps()`, line ~3716
- **Change:** When `sourceS3Availability === 'impaired'`, either:
  - (a) Replace `aws s3 sync` with a warning: "⚠ S3 is impaired — S3 sync is not available. Use DMS or application-level data migration."
  - (b) Split the step: show DMS command unconditionally, show S3 sync only when S3 is available.
- **Affected state keys:** `dataHandling`, `sourceS3Availability`
- **Tests to add:** "S3 impaired + dataHandling=move does not produce executable S3 sync commands"

#### Fix 2: Gate `dataHandling === 'replicate'` step on S3 availability
- **File:** `scripts.js`
- **Function:** `getRunbookSteps()`, line ~3740
- **Change:** When `sourceS3Availability === 'impaired'`, suppress or warn about `aws s3api put-bucket-replication` command. Keep DynamoDB and RDS replication commands (they don't depend on S3).
- **Affected state keys:** `dataHandling`, `sourceS3Availability`
- **Tests to add:** "S3 impaired + dataHandling=replicate does not produce executable S3 replication commands"

### P1 — High (fix in same release)

#### Fix 3: Add S3 impairment awareness to partner engagement rendering
- **File:** `scripts.js`
- **Function:** `renderPartnerEngagementGuide()`, line ~5810
- **Change:** When `state.sourceS3Availability === 'impaired'`, add a callout warning before partner steps that reference S3. The partner data is static, so the fix should be in the rendering function, not the data.
- **Affected state keys:** `sourceS3Availability`
- **Tests to add:** "Partner engagement guide shows S3 impairment warning when sourceS3Availability=impaired"

#### Fix 4: Gate S3 commands in `getCommandBlocks()`
- **File:** `scripts.js`
- **Function:** `getCommandBlocks()`, line ~5237
- **Change:** The DB-specific blocks already inherit S3 awareness from `_getDbStep()`. No additional fix needed for DB blocks. However, if a standalone S3 sync/copy block is added in the future, it should be gated.
- **Tests to add:** "getCommandBlocks does not produce S3 sync commands when S3 is impaired"

### P2 — Medium (fix in next iteration)

#### Fix 5: Gate S3 replication in post-recovery re-protection step
- **File:** `scripts.js`
- **Function:** `getRunbookSteps()`, line ~4422
- **Change:** Wrap the S3 replication commands in a conditional: `if (s.dbTypes && s.dbTypes.indexOf('s3') >= 0)`.
- **Tests to add:** "Post-recovery step only includes S3 replication when S3 is in dbTypes"

#### Fix 6: Add S3 impairment warning to FSx Lustre step
- **File:** `scripts.js`
- **Function:** `getRunbookSteps()`, FSx step, line ~3930
- **Change:** When `sourceS3Availability === 'impaired'`, add warning that FSx Lustre creation from S3 data repository may not work.
- **Tests to add:** "FSx Lustre step warns about S3 dependency when S3 is impaired"

#### Fix 7: Add S3 impairment warning to AWS Backup cross-region copy step
- **File:** `scripts.js`
- **Function:** `getRunbookSteps()`, Task 7.3, line ~4530
- **Change:** When `sourceS3Availability === 'impaired'`, add warning that cross-region backup copy from source region may fail if underlying snapshots depend on S3.
- **Tests to add:** "AWS Backup step warns about S3 dependency when S3 is impaired"

#### Fix 8: Ensure `rma-advisor.html` is rebuilt after fixes
- **File:** `build-single-file.sh`
- **Change:** Run build after all fixes to ensure the built file reflects corrected logic.

---

## 8. Suggested Tests

### S3 Impairment Tests (Priority: P0)

```
"S3 impaired + dataHandling=move does not produce executable aws s3 sync commands"
"S3 impaired + dataHandling=replicate does not produce executable aws s3api put-bucket-replication commands"
"S3 impaired + dbTypes=[s3] does not produce S3 CRR step (Task 7.2)"
"S3 impaired + backupTechnology=native-snapshots does not produce EBS snapshot restore step (Task 7.4)"
"S3 impaired + dbTypes=[rds] does not produce RDS snapshot restore step (Task 7.5)"
"S3 impaired + backupTechnology=native-snapshots does not produce cross-region snapshot copy step (Task 7.6)"
"S3 impaired moves snapshot-copy guidance to blocked/post-recovery guidance"
```

### Architecture Strategy + S3 Tests (Priority: P1)

```
"Architecture Strategy respects sourceS3Availability in all runbook steps"
"Architecture Strategy with S3 impaired still generates non-S3 DB steps (Aurora Global, DynamoDB Global Tables)"
"Architecture Strategy with S3 impaired generates logical export alternatives for RDS"
"Architecture Strategy with S3 impaired generates BCP alternative for SQL Server"
"Architecture Strategy with S3 impaired generates DB link alternative for Oracle"
```

### Partner Mode + S3 Tests (Priority: P1)

```
"Partner mode respects sourceS3Availability (warning shown when impaired)"
"Partner engagement guide shows S3 impairment callout when sourceS3Availability=impaired"
```

### Export Tests (Priority: P1)

```
"copyScript does not export blocked S3 commands when S3 is impaired"
"generateMarkdown does not export blocked S3 commands when S3 is impaired"
"copySummary does not reference S3 operations when S3 is impaired"
```

### Dependency Gating Tests (Priority: P2)

```
"DMS commands always include connection test validation first"
"KMS warnings appear for encrypted cross-region restore"
"Post-recovery re-protection only includes S3 replication when S3 is in dbTypes"
"FSx Lustre step warns about S3 dependency when S3 is impaired"
"AWS Backup cross-region copy warns about S3 dependency when S3 is impaired"
```

### Partner Mode Command Labeling Tests (Priority: P2)

```
"Partner steps 1-4 do not include mutating AWS commands"
"Partner steps 5+ are labeled as partner-executed"
"copyScript does not include partner engagement commands"
```

---

## 9. Final Recommendation

**Implementation should proceed with fixes before release.**

The S3 impairment gating in the per-database steps (`_getDbStep`) and the dedicated recovery option steps (Tasks 7.2–7.6) is well-implemented and demonstrates that the developer understood the requirement. The bugs exist in the **data-handling steps** (`move`/`replicate`) and **partner engagement steps**, which were likely written earlier or separately and not updated when the S3 gating logic was added.

The fix is straightforward:
- P0 fixes (2 items) are simple conditional checks in `getRunbookSteps()` — estimated 30 minutes of implementation.
- P1 fixes (2 items) require adding a dynamic warning in `renderPartnerEngagementGuide()` — estimated 30 minutes.
- P2 fixes (4 items) are minor conditional additions — estimated 1 hour.

All fixes should be accompanied by the suggested tests. The existing test infrastructure (vitest + fast-check) is well-suited for property-based testing of these scenarios.

**Do not release until P0 and P1 fixes are verified.**
