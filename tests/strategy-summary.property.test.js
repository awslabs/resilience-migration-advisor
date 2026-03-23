// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property test for Strategy Summary
 * Adapted to current RMA API
 * Property 13: Strategy Summary Completeness
 * **Validates: Requirements 7.1, 7.2**
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM, arbitraryCompleteState } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  setupDOM();
  window.StateManager.clear();
});

describe('StrategySummary — Property 13: Strategy Summary Completeness', () => {
  it('RULES_ENGINE produces all required fields for any complete state (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryCompleteState(fc),
        (state) => {
          state.urgencyMode = 'architecture-strategy';
          const arch = window.RULES_ENGINE.getArchitecture(state);
          const complexity = window.RULES_ENGINE.getComplexity(state);
          const timeline = window.RULES_ENGINE.getTimeline(state);
          const risk = window.RULES_ENGINE.getRiskLevel(state);

          // Architecture must be one of the 4 valid patterns
          expect(['active-active', 'warm-standby', 'pilot-light', 'backup-restore']).toContain(arch);

          // Complexity must have score and level
          expect(typeof complexity.score).toBe('number');
          expect(complexity.score).toBeGreaterThanOrEqual(0);
          expect(complexity.score).toBeLessThanOrEqual(100);
          expect(['Low', 'Medium', 'High']).toContain(complexity.level);

          // Timeline must have label and weeks
          expect(timeline.label).toBeTruthy();
          expect(timeline.weeks).toBeTruthy();

          // Risk must have level
          expect(['Low', 'Moderate', 'High']).toContain(risk.level);
        }
      ),
      { numRuns: 100 }
    );
  });
});
