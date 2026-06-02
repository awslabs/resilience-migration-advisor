// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * R21 — Backup-isolation split (account × region) and combo-aware runbook step.
 * Tests the split of the former backupLocation step into two independent
 * dimensions, the 4-quadrant risk matrix, the combo-aware runbook step,
 * and the state migration from old saved sessions.
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

describe('R21 — Wizard step structure', () => {
  it('replaces backup-location with backup-account and backup-region steps', () => {
    const ids = window.WIZARD_STEPS.map((s) => s.id);
    expect(ids).not.toContain('backup-location');
    expect(ids).toContain('backup-account');
    expect(ids).toContain('backup-region');
  });

  it('backup-account exposes only the new option set', () => {
    const step = window.WIZARD_STEPS.find((s) => s.id === 'backup-account');
    expect(step.stateKey).toBe('backupAccount');
    const values = step.options.map((o) => o.value);
    expect(values).toEqual(['same-account', 'cross-account', 'external', 'unknown']);
    expect(step.optional).toBe(true);
  });

  it('backup-region exposes only the new option set', () => {
    const step = window.WIZARD_STEPS.find((s) => s.id === 'backup-region');
    expect(step.stateKey).toBe('backupRegion');
    const values = step.options.map((o) => o.value);
    expect(values).toEqual(['same-region', 'cross-region', 'external', 'unknown']);
    expect(step.optional).toBe(true);
  });
});

describe('R21 — getRisks() 4-quadrant matrix', () => {
  it('flags same-account + same-region as critical, citing AWS DR whitepaper', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'same-account',
      backupRegion: 'same-region',
    });
    const matched = risks.find((r) => /no isolation against region loss/i.test(r));
    expect(matched).toBeDefined();
    expect(matched).toMatch(/AWS Disaster Recovery whitepaper/i);
  });

  it('flags same-account + cross-region as moderate (region OK, account exposed)', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'same-account',
      backupRegion: 'cross-region',
    });
    expect(risks.find((r) => /cross-region but in the same account/i.test(r))).toBeDefined();
  });

  it('flags cross-account + same-region as moderate (account OK, region exposed)', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'cross-account',
      backupRegion: 'same-region',
    });
    expect(risks.find((r) => /separate account but in the same region/i.test(r))).toBeDefined();
  });

  it('does NOT flag cross-account + cross-region (AWS-recommended posture)', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'cross-account',
      backupRegion: 'cross-region',
    });
    // None of the backup-isolation warnings should fire
    expect(risks.find((r) => /no isolation/i.test(r))).toBeUndefined();
    expect(risks.find((r) => /same-region/i.test(r) && /backups/i.test(r) && /same account/i.test(r))).toBeUndefined();
  });

  it('flags unknown on either axis as a validation prompt', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'unknown',
      backupRegion: 'cross-region',
    });
    expect(risks.find((r) => /partially unknown/i.test(r))).toBeDefined();
  });

  it('flags external on either axis with provider-coordination guidance', () => {
    const risks = window.RULES_ENGINE.getRisks({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'external',
      backupRegion: 'external',
    });
    expect(risks.find((r) => /External backup provider/i.test(r))).toBeDefined();
  });
});

describe('R21 — getRunbookSteps() combo-aware step injection', () => {
  function findBackupStep(state) {
    const steps = window.RULES_ENGINE.getRunbookSteps(state);
    return steps.find((s) => /Backup Isolation/i.test(s.title));
  }

  it('injects worst-quadrant step for same-account + same-region', () => {
    const state = {
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'same-account',
      backupRegion: 'same-region',
    };
    const s = findBackupStep(state);
    expect(s).toBeDefined();
    expect(s.title).toMatch(/High Risk/i);
    expect(s.complexity).toBe('High');
    // Cites the canonical AWS DR whitepaper
    const refUrls = s.refs.map((r) => r.url);
    expect(refUrls).toContain('https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html');
    // Includes hardening remediation commands (cross-region copy)
    expect(s.commands.some((c) => /start-copy-job/.test(c))).toBe(true);
  });

  it('injects AWS-recommended-posture step for cross-account + cross-region', () => {
    const s = findBackupStep({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'cross-account',
      backupRegion: 'cross-region',
    });
    expect(s).toBeDefined();
    expect(s.title).toMatch(/AWS-recommended posture/i);
    expect(s.commands.some((c) => /start-copy-job/.test(c))).toBe(true);
    // Includes the canonical AWS Backup cross-account doc
    const refUrls = s.refs.map((r) => r.url);
    expect(refUrls).toContain('https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html');
  });

  it('injects discovery step when account or region is unknown', () => {
    const s = findBackupStep({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'unknown',
      backupRegion: 'cross-region',
    });
    expect(s).toBeDefined();
    expect(s.title).toMatch(/Validate Backup Location/i);
    expect(s.commands.some((c) => /list-backup-vaults/.test(c))).toBe(true);
    expect(s.rollback).toMatch(/read-only/i);
  });

  it('injects external-provider step that suppresses AWS-native CLI commands', () => {
    const s = findBackupStep({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
      backupAccount: 'external',
      backupRegion: 'external',
    });
    expect(s).toBeDefined();
    expect(s.title).toMatch(/External Provider/i);
    // No executable AWS Backup commands should appear; only comments/instructions.
    const executable = s.commands.filter((c) => /^aws\s/.test(c));
    expect(executable).toEqual([]);
  });

  it('does not inject a backup-isolation step when neither key is set', () => {
    const s = findBackupStep({
      proceedPath: 'self-execution',
      urgencyMode: 'architecture-strategy',
    });
    expect(s).toBeUndefined();
  });

  it('property: any combination of valid backupAccount × backupRegion produces a runbook (no exceptions)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STATE_VALUES.backupAccount, undefined),
        fc.constantFrom(...STATE_VALUES.backupRegion, undefined),
        (ba, br) => {
          const state = {
            proceedPath: 'self-execution',
            urgencyMode: 'architecture-strategy',
          };
          if (ba !== undefined) state.backupAccount = ba;
          if (br !== undefined) state.backupRegion = br;
          // Must not throw
          const steps = window.RULES_ENGINE.getRunbookSteps(state);
          expect(Array.isArray(steps)).toBe(true);
          expect(steps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('R21 — State migration from legacy backupLocation', () => {
  function loadWithLegacyState(legacy) {
    sessionStorage.setItem(
      'rma-advisor-state',
      JSON.stringify({ answers: legacy, step: 0 })
    );
    window.RMA.setState({});
    window.RMA.setCurrentStep(0);
    return window.RMA.loadState();
  }

  it('migrates legacy backupLocation="same-region" to backupRegion only', () => {
    expect(loadWithLegacyState({ backupLocation: 'same-region' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.backupRegion).toBe('same-region');
    expect(s.backupAccount).toBeUndefined();
    expect(s.backupLocation).toBeUndefined();
  });

  it('migrates legacy backupLocation="cross-region" to backupRegion only', () => {
    expect(loadWithLegacyState({ backupLocation: 'cross-region' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.backupRegion).toBe('cross-region');
    expect(s.backupAccount).toBeUndefined();
  });

  it('migrates legacy backupLocation="cross-account" to backupAccount only', () => {
    expect(loadWithLegacyState({ backupLocation: 'cross-account' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.backupAccount).toBe('cross-account');
    expect(s.backupRegion).toBeUndefined();
  });

  it('migrates legacy backupLocation="external" to both axes', () => {
    expect(loadWithLegacyState({ backupLocation: 'external' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.backupAccount).toBe('external');
    expect(s.backupRegion).toBe('external');
  });

  it('migrates legacy backupLocation="unknown" to both axes', () => {
    expect(loadWithLegacyState({ backupLocation: 'unknown' })).toBe(true);
    const s = window.RMA.getState();
    expect(s.backupAccount).toBe('unknown');
    expect(s.backupRegion).toBe('unknown');
  });

  it('does not overwrite already-migrated state', () => {
    expect(
      loadWithLegacyState({
        backupLocation: 'same-region',
        backupAccount: 'cross-account', // already migrated
        backupRegion: 'cross-region',   // already migrated
      })
    ).toBe(true);
    const s = window.RMA.getState();
    // Should keep the new values, not overwrite from legacy
    expect(s.backupAccount).toBe('cross-account');
    expect(s.backupRegion).toBe('cross-region');
  });
});
