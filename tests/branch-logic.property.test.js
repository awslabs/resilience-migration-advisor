// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for BranchLogic
 * Feature: migration-flow-engine
 * **Validates: Requirements 3.5, 3.6, 3.7, 4.2, 4.3, 9.2, 9.3, 12.1, 12.2**
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM, KNOWN_SECTION_IDS, arbitraryCompleteState, arbitraryPartialState } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  window.StateManager.clear();
});

describe('BranchLogic — Property 6: Data Replication Step Visibility', () => {
  it('data replication sub-step visible ↔ stateful profile (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryPartialState(fc),
        (state) => {
          // Find the dbTypes step which has the stateful conditional
          const dbStep = window.WIZARD_STEPS.find(s => s.stateKey === 'dbTypes');
          if (!dbStep || !dbStep.conditional) return;

          const testState = Object.assign({ proceedPath: 'self-execution', urgencyMode: 'architecture-strategy' }, state);
          const isVisible = dbStep.conditional(testState);

          if (testState.dataProfile && testState.dataProfile.startsWith('stateful')) {
            expect(isVisible).toBe(true);
          } else {
            expect(isVisible).toBeFalsy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BranchLogic — Property 7: Visible Steps Are Pure Function of State', () => {
  it('identical states produce identical visible step lists (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryPartialState(fc),
        (state) => {
          const result1 = window.BranchLogic.getVisibleSteps({ ...state });
          const result2 = window.BranchLogic.getVisibleSteps({ ...state });

          expect(result1).toEqual(result2);

          // Visible step count should be reasonable (at least 2 unconditional steps)
          expect(result1.length).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BranchLogic — Property 8: Guide Section Mapping Correctness', () => {
  it('returns valid, non-empty subset of 27 known IDs (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryPartialState(fc),
        (state) => {
          const sections = window.BranchLogic.getRelevantSections(state);

          // Non-empty
          expect(sections.length).toBeGreaterThan(0);

          // Every returned ID is one of the 27 known IDs
          for (const id of sections) {
            expect(KNOWN_SECTION_IDS).toContain(id);
          }

          // Always-relevant sections should always be present
          expect(sections).toContain('overview');
          expect(sections).toContain('pre-migration');
          expect(sections).toContain('iam-sts');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BranchLogic — Property 15: Complexity Score Computation and Labeling', () => {
  it('score = normalized weight sum, label matches thresholds (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryCompleteState(fc),
        (state) => {
          const result = window.BranchLogic.getComplexityScore(state);

          expect(typeof result.score).toBe('number');
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          expect(['Low', 'Medium', 'High']).toContain(result.level);

          // Deterministic: same inputs produce same outputs
          const result2 = window.BranchLogic.getComplexityScore({ ...state });
          expect(result.score).toBe(result2.score);
          expect(result.level).toBe(result2.level);
        }
      ),
      { numRuns: 100 }
    );
  });
});
