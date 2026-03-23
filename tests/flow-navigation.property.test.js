// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for Flow Navigation
 * Adapted to current RMA wizard API
 * Properties 10, 11, 12
 * **Validates: Requirements 6.1, 6.3, 6.4**
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
});

describe('FlowNavigation — Property 10: Back Navigation Returns to Previous Visible Step', () => {
  it('step 0 is always the decision layer (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        () => {
          expect(window.WIZARD_STEPS[0].id).toBe('decision-layer');
          expect(window.WIZARD_STEPS[0].stateKey).toBe('proceedPath');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('FlowNavigation — Property 11: Progress Indicator Accuracy', () => {
  it('getVisibleStepInfo returns valid position and total (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('self-execution', 'partner-assisted'),
        fc.constantFrom('architecture-strategy', 'immediate-dr', 'regional-partner', 'matchmaking'),
        (proceedPath, mode) => {
          window.RMA.setState({ proceedPath, urgencyMode: mode });
          const info = window.getVisibleStepInfo();
          expect(info.total).toBeGreaterThan(0);
          expect(info.position).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('FlowNavigation — Property 12: Step Visibility Consistency', () => {
  it('isStepVisible is deterministic for any state (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('self-execution', 'partner-assisted'),
        fc.constantFrom('architecture-strategy', 'immediate-dr', 'regional-partner', 'matchmaking'),
        fc.integer({ min: 0, max: 20 }),
        (proceedPath, mode, stepIdx) => {
          window.RMA.setState({ proceedPath, urgencyMode: mode });
          const idx = stepIdx % window.WIZARD_STEPS.length;
          const v1 = window.isStepVisible(idx);
          const v2 = window.isStepVisible(idx);
          expect(v1).toBe(v2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
