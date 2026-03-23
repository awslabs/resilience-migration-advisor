// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for BranchLogic
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.4**
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  window.StateManager.clear();
});

describe('BranchLogic — Unit Tests', () => {
  // E1: STEPS array contains architecture-strategy steps plus unconditional steps
  it('E1: STEPS array contains architecture-strategy steps plus unconditional steps', () => {
    const steps = window.STEPS;
    // Should have at least the unconditional steps + architecture-strategy steps
    expect(steps.length).toBeGreaterThanOrEqual(10);
    // Decision layer and mode selector should be present (unconditional)
    expect(steps.find(s => s.id === 'decision-layer')).toBeDefined();
    expect(steps.find(s => s.id === 'urgency-mode')).toBeDefined();
    // Architecture-strategy steps should be present
    expect(steps.find(s => s.stateKey === 'workloadCriticality')).toBeDefined();
    expect(steps.find(s => s.stateKey === 'recoveryRequirements')).toBeDefined();
    expect(steps.find(s => s.stateKey === 'dataProfile')).toBeDefined();
    expect(steps.find(s => s.stateKey === 'networkTopology')).toBeDefined();
    expect(steps.find(s => s.stateKey === 'compliance')).toBeDefined();
    expect(steps.find(s => s.stateKey === 'teamReadiness')).toBeDefined();
  });

  // E2: Tier 0 + RTO < 1h → Active/Active
  it('E2: Tier 0 + RTO < 1h → Active/Active', () => {
    const result = window.BranchLogic.getRecommendedArchitecture({
      workloadCriticality: 'tier-0',
      recoveryRequirements: 'rto-lt-1h',
    });
    expect(result).toBe('active-active');
  });

  // E3: Tier 1 + RTO 1-4h → Warm Standby
  it('E3: Tier 1 + RTO 1-4h → Warm Standby', () => {
    const result = window.BranchLogic.getRecommendedArchitecture({
      workloadCriticality: 'tier-1',
      recoveryRequirements: 'rto-1-4h',
    });
    expect(result).toBe('warm-standby');
  });

  // E4: No Direct Connect → DC section hidden
  it('E4: No Direct Connect → DC section hidden', () => {
    const sections = window.BranchLogic.getRelevantSections({
      networkConnectivity: 'vpn-only',
      dataProfile: 'stateless',
    });
    expect(sections).not.toContain('direct-connect');
  });

  // E10: Undefined decision combination falls back gracefully
  it('E10: Undefined decision combination falls back gracefully (getVisibleSteps returns steps)', () => {
    const visibleSteps = window.BranchLogic.getVisibleSteps({});
    // With empty state, at least the unconditional steps + architecture-strategy defaults should show
    expect(visibleSteps.length).toBeGreaterThanOrEqual(2);
  });
});
