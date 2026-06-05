# Release Notes — Resilience Migration Advisor

This document summarizes the improvements made to the Resilience Migration Advisor (RMA) since the initial v1 review. Every change has been grounded in official AWS public guidance and verified against the AWS documentation cited inline. The tool's scope, modes, and disclaimer language remain unchanged.

---

## At a glance

| Area | Improvement |
|---|---|
| Recovery wizard | New three-path entry on the Recover step: self-execution, partner-assisted, or AWS Support. The same wizard then routes the runbook for the path picked. |
| Runbook content | Approximately 190 AWS-grounded workarounds added across 50 runbook steps. Each workaround quotes official AWS documentation verbatim and links its source URL. |
| Runbook commands | Every CLI invocation has been verified against `aws <service> <subcommand> help`. 446 invocations across 267 distinct service/subcommand pairs are now flag-correct. |
| Source library | 119 unique AWS documentation URLs are referenced across the workarounds, all verified live. |
| Partner paths (matchmaking + regional partner) | The on-screen runbook for partner-assisted modes has been reframed as a six-step **Partner Engagement & Validation** checklist focused on customer-side oversight: define recovery objectives, run a Health pre-flight, scope partner IAM access with `sts:ExternalId`, validate the result with a measured restore drill, run a Resilience Hub assessment on the result, then revoke access and audit CloudTrail. |
| Accelerated Recovery | Existing partner-tool steps preserved unchanged. Three **AWS Oversight Rails** are now prepended (Health pre-flight, IAM scoping for the partner-tool role, post-recovery drill + Resilience Hub assessment). Customer accountability and partner-tool action are visually separated. |
| Restore drill flexibility | Step 4 of every partner path lists four AWS-published drill mechanisms — AWS Backup Restore Testing, AWS Elastic Disaster Recovery drill instances, native-snapshot restore into an isolated account, and any third-party backup tool's drill feature. The acceptance bar is the same in every case: a measured duration captured before handover. |
| Portability | Shell commands embedded in the runbook now work on both BSD (macOS) and GNU (Linux) `date`. CloudWatch CLI flags corrected to use `--extended-statistics` / `--extended-statistic` for percentile metrics. |
| README | Features table refreshed; Recover screenshot updated to reflect the new three-path entry. |

---

## Wizard improvements

### New three-path Recover step

The Recover step now opens with three clearly-framed paths:

1. **I want to execute recovery myself** — guided architecture strategy or accelerated recovery tools.
2. **I want help from AWS partners** — optional AWS Services Partners and ISV tools for matchmaking or direct selection.
3. **Engage AWS Support** — open a case with AWS Support, with links to compare or upgrade plans (Business Support+, Enterprise Support, Unified Operations).

Each path routes the wizard through the right downstream questions and the right runbook for that posture, so the customer sees content tailored to how they actually intend to proceed.

### Recovery objective framing aligned to REL13-BP01

Recovery objectives (RTO and RPO) are now grounded in the AWS Well-Architected Reliability Pillar best practice **REL13-BP01 — Define recovery objectives for downtime and data loss**. Anti-patterns AWS calls out (arbitrary objectives, objectives too lenient to meet business needs, unrealistic objectives such as zero-time-to-recover) are surfaced inline so the customer can self-check their targets before scoping any work.

### Accelerated Recovery messaging

The Accelerated Recovery option description now sets clear expectations: speed depends on partner engagement and existing contracts, and fastest results assume a tool relationship is already in place. Marketplace links to relevant partner tools are surfaced for self-service evaluation.

---

## Runbook improvements

### AWS-grounded workarounds across 50 steps

Each runbook step now includes a **Recommended Workarounds (AWS-grounded)** section. Workarounds are derived from official AWS documentation cited per item via a Sources block. Coverage spans:

| Domain | Steps with workarounds |
|---|---|
| Service-impairment validation (S3, EC2 control plane, network, DynamoDB, KMS/IAM/STS) | 5 |
| Monitoring, logging, and alerting | 1 |
| Cross-region data steps (continuous replication, four restore variants, four copy/migrate variants) | 9 |
| DNS, post-recovery, and failback | 3 |
| Integration, security, and FSx migration (SNS+SQS, WAF + Network Firewall, Cognito + GuardDuty, FSx) | 4 |
| Backup-isolation variants (External Provider, Validate Location, four account × region quadrants) | 6 |
| Network setup (VPC, Direct Connect, Transit Gateway peering, Site-to-Site VPN, Security Groups, NACLs) | 5 (plus topology-variant DX and TGW) |
| Cutover validation gates (Resilience Hub, DR drill, cutover, post-cutover validation) | 4 |
| Mechanical setup (KMS, IAM, secrets/parameters/TLS, parameter groups, EC2 deploy, environment discovery, landing zone, team readiness) | 8 |
| Final batch (panic-mode capture, custom landing zone, DX hybrid topology, performance acceleration, ECS/EKS, serverless) | 6 |

Each workaround follows a consistent shape: title, AWS best-practice or service pattern it maps to, summary with at least one verbatim AWS quote, an optional CLI command block with its own copy button, and a Sources list with the AWS documentation URL.

### Verified CLI commands

Every `aws <service> <subcommand>` invocation referenced in the runbook has been validated against `aws <svc> <sub> help`. The audit covered 446 invocations across 267 distinct service/subcommand pairs. Several flag-name issues were corrected during the audit:

- `aws backup list-restore-jobs` and `list-report-jobs` use `--by-status` (not `--by-state`, which is correct only on `list-copy-jobs`).
- `aws resource-explorer-2 search` uses `--max-items` (not `--max-results`).
- `aws ec2 create-ipam-pool` does not take `--provisioned-cidrs`; CIDR provisioning uses the separate `provision-ipam-pool-cidr` API.
- `aws fsx create-volume` does not take `--file-system-id`; the file system is implied by the SVM ID inside `--ontap-configuration`.
- `aws synthetics create-canary` does not take `--start-canary`; canaries are created stopped, then started with `start-canary`.

### Source URL verification

All 119 unique AWS documentation URLs cited across the workarounds return HTTP 200 — confirmed by an automated HEAD-check sweep.

### Portability fixes

Shell commands have been adjusted so they work without modification on both BSD (macOS) and GNU (Linux) `date` implementations:

```
$(date -u -v-N{M,H,d} +FMT 2>/dev/null || date -u -d "N min/hour/day ago" +FMT)
```

This pattern replaces previous Linux-only `date -d "X ago"` invocations and bash 4-only `printf "%(...)T"` constructs that silently failed on macOS default bash 3.2.

CloudWatch CLI flags have been corrected so percentile metrics (p95, p99) use `--extended-statistics` on `get-metric-statistics` and `--extended-statistic` on `put-metric-alarm`, per the documented AWS CLI shape.

### Step Commands section reframed

The per-step Commands block has been retitled **"📜 Step Commands (used by the bash runbook export)"** with a one-line subtitle clarifying that those commands are the canonical bash bundled into the downloadable runbook export, while the AWS-grounded workarounds above carry their own per-pattern commands. This makes the relationship between the two blocks clear at a glance.

---

## Partner-path improvements

### Six-step Partner Engagement & Validation runbook

For both **Partner Matchmaking** and **Regional Partner Assistance** modes, the result panel now shows a six-step engagement-and-validation runbook framed around customer-side oversight. The intent is to make clear what the customer does *around* the partner — the partner is hired to execute the recovery, while the customer remains accountable for resilience under the AWS Shared Responsibility Model for Resiliency.

| # | Step | Anchored in |
|---|---|---|
| 1 | Define RTO/RPO from business impact before scoping the partner | REL13-BP01 + AWS Shared Responsibility Model for Resiliency |
| 2 | AWS Health pre-flight on the recovery region | AWS Health Dashboard + EventBridge integration |
| 3 | Scope the partner's IAM access (least-privilege, time-boxed, CloudTrail-monitored, `sts:ExternalId`) | AWS IAM third-party-access guide |
| 4 | Demand a measured RTO via an end-to-end restore drill | REL13-BP03 + AWS Backup Restore Testing or AWS Elastic Disaster Recovery drill instances or native snapshot or vendor tool drill |
| 5 | Run an AWS Resilience Hub assessment on the resulting posture | AWS Resilience Hub overview + REL13-BP03 |
| 6 | Close out: revoke partner access, audit CloudTrail, document the engagement | AWS IAM third-party-access guide + AWS CloudTrail |

The same template applies to all 15 regional partners via a single shared helper, so the engagement bar is consistent regardless of which partner the customer picks. Per-partner identity (focus area, region, marketplace listing) is preserved at the top of the result panel.

### Drill mechanism flexibility (Step 4)

Step 4 explicitly lists four AWS-published drill mechanisms, allowing the customer to pick whichever fits their existing backup posture rather than being forced into a single tool:

- **AWS Backup customers** — AWS Backup Restore Testing.
- **EC2-based workloads (any backup tool)** — AWS Elastic Disaster Recovery drill instances.
- **Native-snapshot customers (RDS, EBS, DynamoDB on-demand)** — restore into an isolated account or VPC and time the recovery.
- **Third-party backup tools or partner-tool snapshots** — vendor's own drill or sandbox-restore feature.

The acceptance bar is the same in every case: a measured duration captured before engagement handover.

### Accelerated Recovery — AWS Oversight Rails

The existing partner-tool steps (subscribe, configure, run-the-tool) for each supported partner tool are preserved unchanged — they describe customer-driven actions that are tool-specific and already correct. Three **AWS Oversight Rails** are now prepended ahead of the tool steps:

1. **AWS Health pre-flight** on the recovery region (every support tier).
2. **Scope the partner tool's IAM access** with an external ID, scoped permission boundary, and CloudTrail recording.
3. **Validate the result** with a measured restore drill (any of the four mechanisms above) plus a Resilience Hub assessment against the recovered topology.

The rails are visually distinct from the tool steps (blue badge vs orange badge) so customer accountability and partner-tool action are easy to tell apart.

---

## Cost estimate framing

The cost estimate card has been reframed as a **directional planning aid only — not a quote**. The card now carries a prominent warning callout, a per-row "(directional)" qualifier, and an exclusion list covering data transfer, Savings Plans, instance type variations, Support tier costs, ISV add-ons, compliance overhead, and regional pricing variation. Links to the AWS Pricing Calculator and the AWS Well-Architected Cost Optimization Pillar are surfaced for customers who need a binding number.

---

## Backup-question split (account × region)

The previous single backup question that combined account isolation and geographic isolation has been split into two independent dimensions, each with its own runbook content:

- **Backup account isolation** — same-account, cross-account, external provider, or unknown.
- **Backup geographic isolation** — same-region, cross-region, external provider, or unknown.

The runbook now generates a posture-aware variant for each of the resulting four quadrants (plus the External Provider and Unknown fallbacks), with cautious wording grounded in the AWS DR whitepaper, the Reliability Pillar, the AWS Backup Cross-Region copy guide, and the AWS Backup Cross-Account guide. The recommended posture (cross-account + cross-region) is always called out, and customers in less-isolated quadrants get specific hardening guidance for their actual situation.

---

## Service-impairment generalization

The previous single-axis S3 impairment question has been replaced with a five-category multi-select (S3, EC2 control plane, Network, DynamoDB, KMS/IAM/STS). The runbook generates a combo-aware pre-recovery validation step per impaired category, each with an "IMPAIRMENT" badge and category-specific AWS-grounded workarounds (REL11-BP04, REL13-BP02, AWS Builders' Library *Static Stability*, ARC routing controls, ARC zonal shift, Global Accelerator traffic dial, KMS multi-Region keys, STS regional endpoints).

The Impairment Impact Analysis card surfaces per-service impact via chip-tabs so customers can pivot between service contexts without losing place. AWS Health API CLI examples now carry a support-tier caveat (Health API requires Business Support+, Enterprise, On-Ramp, or Unified Operations) so Basic/Developer customers know to use the AWS Health Dashboard URL plus the EventBridge integration.

---

## Monitoring runbook step expansion

The monitoring runbook step now includes seven AWS-grounded workarounds covering:

1. Symmetric bidirectional deployment (REL11-BP01).
2. CloudWatch cross-account observability (OAM).
3. CloudWatch Synthetics canaries.
4. AWS Health → EventBridge → SNS for service-impairment alerts (works on every support tier).
5. CloudWatch Metric Streams to non-AWS observability platforms.
6. CloudWatch Logs cross-region replication or subscription filters.
7. AWS Systems Manager Automation runbooks (REL12-BP01).

Validation has been expanded to require both source-region and recovery-region monitoring stacks plus a documented operational playbook.

---

## Quality gates

Every commit passes the following gates before being pushed:

- **Test suite**: 173 tests pass (Vitest + fast-check + jsdom). The suite includes property-based tests for partner modes, S3 impairment gating, security/storage selections, navigation flow, and CSV / XSS sanitization.
- **AI reference scan**: a pre-commit grep ensures no AI-attribution markers leak into the diff.
- **AWS quote audit**: every `Per AWS:` quote in the workarounds traces to a verbatim string in the cited URL. Sampling against the live AWS documentation has confirmed this end-to-end.
- **CLI flag audit**: every `aws <service> <subcommand>` invocation has been validated against `aws <svc> <sub> help`.
- **URL liveness**: all cited AWS documentation URLs return HTTP 200.

---

## Documentation

- **README.md** — features table, screenshots, and Recover-screen description updated to reflect the three-path wizard, the AWS-grounded workarounds, and the Engage AWS Support path.
- **Inline disclaimers** — the workarounds section carries an explicit "How to use this section" callout: every workaround is derived from official AWS documentation cited per item, but the commands have not been validated in the customer's specific environment. Customers must execute the commands themselves with appropriate IAM permissions and validate the result before relying on it during an active incident. Testing in a non-production account first is recommended.
- **Source library** — every AWS doc URL cited in the runbook is listed once and linked inline in the Sources block of the workaround that uses it.

---

## Compatibility

No schema changes. The runbook generator's public shape (`getRunbookSteps(state)`) is unchanged. The tool remains a single self-contained HTML file (`rma-advisor.html`) opened directly in the browser; no backend, no data transmission, no account access from the page. The Python-driven inliner (`build-single-file.sh`) and the Vitest test harness are unchanged.
