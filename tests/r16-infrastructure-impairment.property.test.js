// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * R16 — Infrastructure-impairment generalization beyond S3.
 * Tests:
 *   - The wizard step is now a multi-select with a 'none' sentinel.
 *   - The _isImpaired and _isUnknown helpers behave correctly.
 *   - Each new impairment category produces a risk warning AND a
 *     pre-recovery validation step in the runbook.
 *   - State migration from the legacy sourceS3Availability key to
 *     impairedServices + s3StatusUnknown works for all three legacy values.
 *   - The existing S3 gating still fires when migrated state is in place
 *     (covers the refactor of 28 call sites that previously read sourceS3Availability).
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM, STATE_VALUES } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  setupDOM();
  window.StateManager.clear();
  sessionStorage.clear();
  localStorage.clear();
});

describe('R16 — Wizard step structure', () => {
  it('replaces source-s3-availability with the impaired-services multi-select step', () => {
    const ids = window.WIZARD_STEPS.map((s) => s.id);
    expect(ids).not.toContain('source-s3-availability');
    expect(ids).toContain('impaired-services');
    const step = window.WIZARD_STEPS.find((x) => x.id === 'impaired-services');
    expect(step.stateKey).toBe('impairedServices');
    expect(step.multiSelect).toBe(true);
    const values = step.options.map((o) => o.value);
    // Sentinel + 5 categories
    expect(values).toEqual(['none', 's3', 'ec2-cp', 'network', 'dynamodb', 'kms-iam-sts']);
  });
});

describe('R16 — _isImpaired and _isUnknown helpers', () => {
  it('_isImpaired returns true only when the service is in the array', () => {
    const fn = window.RULES_ENGINE._isImpaired;
    expect(fn({ impairedServices: ['s3'] }, 's3')).toBe(true);
    expect(fn({ impairedServices: ['ec2-cp', 'network'] }, 'network')).toBe(true);
    expect(fn({ impairedServices: ['s3'] }, 'ec2-cp')).toBe(false);
    expect(fn({}, 's3')).toBe(false);
    expect(fn(null, 's3')).toBe(false);
  });

  it('_isUnknown returns true only for s3 with the s3StatusUnknown flag', () => {
    const fn = window.RULES_ENGINE._isUnknown;
    expect(fn({ s3StatusUnknown: true }, 's3')).toBe(true);
    expect(fn({ s3StatusUnknown: false }, 's3')).toBe(false);
    expect(fn({ s3StatusUnknown: true }, 'ec2-cp')).toBe(false);
    expect(fn({}, 's3')).toBe(false);
  });
});

describe('R16 — getRisks() per-category warnings', () => {
  function risksFor(impairedServices, extra) {
    return window.RULES_ENGINE.getRisks(Object.assign({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      impairedServices: impairedServices,
    }, extra || {}));
  }

  it('flags EC2 control plane impairment with static-stability guidance', () => {
    expect(risksFor(['ec2-cp']).some((r) => /EC2 control plane impaired/i.test(r) && /static[- ]stability/i.test(r))).toBe(true);
  });

  it('flags network impairment with egress-validation guidance', () => {
    expect(risksFor(['network']).some((r) => /Network impairment/i.test(r) && /egress/i.test(r))).toBe(true);
  });

  it('flags DynamoDB impairment with ReplicationLatency guidance', () => {
    expect(risksFor(['dynamodb']).some((r) => /DynamoDB impairment/i.test(r) && /ReplicationLatency/i.test(r))).toBe(true);
  });

  it('flags KMS/IAM/STS impairment with regional-endpoint and multi-Region-key guidance', () => {
    expect(risksFor(['kms-iam-sts']).some((r) => /Encryption \/ identity control plane impaired/i.test(r) && /regional STS/i.test(r) && /multi[- ]Region KMS/i.test(r))).toBe(true);
  });

  it('preserves the existing S3-impaired warning (now prefixed with CRITICAL: per R16 severity tiering)', () => {
    expect(risksFor(['s3']).some((r) => /CRITICAL:\s*S3 impaired/i.test(r))).toBe(true);
  });

  it('preserves the existing S3-unknown warning via s3StatusUnknown', () => {
    expect(risksFor([], { s3StatusUnknown: true }).some((r) => /S3 status unknown/i.test(r))).toBe(true);
  });

  it('does not fire any impairment warning when no services are marked impaired', () => {
    const r = risksFor([]);
    expect(r.some((x) => /S3 IMPAIRED|EC2 control plane impaired|Network impairment|DynamoDB impairment|Encryption \/ identity/i.test(x))).toBe(false);
  });
});

describe('R16 — getRunbookSteps() per-category step injection', () => {
  function findStep(state, titleRegex) {
    const steps = window.RULES_ENGINE.getRunbookSteps(Object.assign({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
    }, state));
    return steps.find((s) => titleRegex.test(s.title));
  }

  it('injects an EC2 control plane validation step with cited static-stability source', () => {
    const s = findStep({ impairedServices: ['ec2-cp'] }, /EC2 Control Plane/i);
    expect(s).toBeDefined();
    const refUrls = s.refs.map((r) => r.url);
    expect(refUrls).toContain('https://aws.amazon.com/builders-library/static-stability-using-availability-zones/');
    expect(s.commands.some((c) => /aws ec2 describe-instances/.test(c))).toBe(true);
  });

  it('injects a network validation step with egress-path commands', () => {
    const s = findStep({ impairedServices: ['network'] }, /Network Impairment/i);
    expect(s).toBeDefined();
    expect(s.commands.some((c) => /describe-vpcs/.test(c))).toBe(true);
    expect(s.commands.some((c) => /describe-transit-gateways/.test(c))).toBe(true);
    expect(s.commands.some((c) => /directconnect describe-connections/.test(c))).toBe(true);
  });

  it('injects a DynamoDB validation step with CloudWatch ReplicationLatency command', () => {
    const s = findStep({ impairedServices: ['dynamodb'] }, /DynamoDB Impairment/i);
    expect(s).toBeDefined();
    expect(s.commands.some((c) => /ReplicationLatency/.test(c))).toBe(true);
    expect(s.refs.some((r) => /V2globaltables_HowItWorks/.test(r.url))).toBe(true);
  });

  it('injects a KMS/IAM/STS validation step with regional-STS endpoint and multi-Region-keys ref', () => {
    const s = findStep({ impairedServices: ['kms-iam-sts'] }, /KMS \/ IAM \/ STS Impairment/i);
    expect(s).toBeDefined();
    expect(s.commands.some((c) => /endpoint-url https:\/\/sts\./.test(c))).toBe(true);
    const refUrls = s.refs.map((r) => r.url);
    expect(refUrls).toContain('https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html');
    expect(refUrls).toContain('https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html');
  });

  it('injects multiple steps when multiple services are impaired', () => {
    const steps = window.RULES_ENGINE.getRunbookSteps({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      impairedServices: ['ec2-cp', 'network', 'dynamodb', 'kms-iam-sts'],
    });
    const matched = steps.filter((s) => /EC2 Control Plane|Network Impairment|DynamoDB Impairment|KMS \/ IAM \/ STS/i.test(s.title));
    expect(matched.length).toBe(4);
  });

  it('injects an S3 impairment step when only S3 is impaired (parity with the other 4 categories)', () => {
    const s = findStep({ impairedServices: ['s3'] }, /S3 Impairment/i);
    expect(s).toBeDefined();
    expect(s.category).toBe('impairment');
    // Read-only validation commands; no executable mutating S3 operations.
    expect(s.commands.some((c) => /aws s3api list-buckets/.test(c))).toBe(true);
    expect(s.commands.some((c) => /aws s3api head-bucket/.test(c))).toBe(true);
  });

  it('marks every impairment step with category="impairment"', () => {
    const allCategories = ['s3', 'ec2-cp', 'network', 'dynamodb', 'kms-iam-sts'];
    const steps = window.RULES_ENGINE.getRunbookSteps({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      impairedServices: allCategories,
    });
    const impairmentSteps = steps.filter((s) => s.category === 'impairment');
    expect(impairmentSteps.length).toBe(5);
  });

  it('all 5 impairment risks are prefixed with CRITICAL: so the renderer can flag them red', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      impairedServices: ['s3', 'ec2-cp', 'network', 'dynamodb', 'kms-iam-sts'],
    });
    const critical = risks.filter((r) => r.indexOf('CRITICAL:') === 0);
    expect(critical.length).toBe(5);
  });

  it('does not inject any impairment step when impairedServices is empty', () => {
    const steps = window.RULES_ENGINE.getRunbookSteps({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      impairedServices: [],
    });
    const matched = steps.filter((s) => /EC2 Control Plane|Network Impairment|DynamoDB Impairment|KMS \/ IAM \/ STS Impairment/i.test(s.title));
    expect(matched.length).toBe(0);
  });

  it('property: any subset of impaired services produces a runbook (no exceptions)', () => {
    fc.assert(
      fc.property(
        fc.subarray(STATE_VALUES.impairedServiceOptions),
        (subset) => {
          const steps = window.RULES_ENGINE.getRunbookSteps({
            proceedPath: 'self-execution',
            urgencyMode: 'architecture-strategy',
            impairedServices: subset,
          });
          expect(Array.isArray(steps)).toBe(true);
          expect(steps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('R16 — Legacy state migration', () => {
  function loadWithLegacy(legacy) {
    sessionStorage.setItem(
      'rma-advisor-state',
      JSON.stringify({ answers: legacy, step: 0 })
    );
    window.RMA.setState({});
    window.RMA.setCurrentStep(0);
    return window.RMA.loadState();
  }

  it('migrates legacy sourceS3Availability="impaired" → impairedServices: ["s3"]', () => {
    expect(loadWithLegacy({ sourceS3Availability: 'impaired' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.impairedServices).toEqual(['s3']);
    expect(s.s3StatusUnknown).toBeFalsy();
    expect(s.sourceS3Availability).toBeUndefined();
  });

  it('migrates legacy sourceS3Availability="unknown" → s3StatusUnknown=true', () => {
    expect(loadWithLegacy({ sourceS3Availability: 'unknown' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.impairedServices).toEqual([]);
    expect(s.s3StatusUnknown).toBe(true);
    expect(s.sourceS3Availability).toBeUndefined();
  });

  it('migrates legacy sourceS3Availability="available" → impairedServices: [] (no s3StatusUnknown)', () => {
    expect(loadWithLegacy({ sourceS3Availability: 'available' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.impairedServices).toEqual([]);
    expect(s.s3StatusUnknown).toBeFalsy();
    expect(s.sourceS3Availability).toBeUndefined();
  });

  it('does not overwrite already-migrated state', () => {
    expect(
      loadWithLegacy({
        sourceS3Availability: 'impaired', // legacy
        impairedServices: ['ec2-cp'],     // already migrated
      })
    ).toBe(true);
    const s = window.RMA.getState();
    expect(s.impairedServices).toEqual(['ec2-cp']); // preserved
  });
});

describe('R16 — Existing S3 gating still fires through helper layer', () => {
  // These mirror the original S3-impairment property tests but use the new state shape.
  // If any of the 28 sourceS3Availability call sites failed to migrate, these would fail.
  it('S3 marked impaired suppresses S3 sync command in dataHandling=move', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('tier-0', 'tier-1', 'tier-2'),
        (criticality) => {
          const state = {
            proceedPath: 'self-execution',
            urgencyMode: 'architecture-strategy',
            workloadCriticality: criticality,
            recoveryRequirements: 'rto-1-4h',
            dataProfile: 'stateful-large',
            networkConnectivity: 'transit-gateway',
            networkSecurity: 'security-groups',
            dataHandling: 'move',
            impairedServices: ['s3'],
            dbTypes: ['rds'],
          };
          const steps = window.RULES_ENGINE.getRunbookSteps(state);
          // The runbook must not contain an executable `aws s3 sync` line.
          steps.forEach((step) => {
            (step.commands || []).forEach((cmd) => {
              if (typeof cmd === 'string' && /^aws s3 sync\s/.test(cmd)) {
                throw new Error('Found executable aws s3 sync command despite S3 impairment: ' + cmd);
              }
            });
          });
        }
      ),
      { numRuns: 30 }
    );
  });
});
