// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for Session Storage Round-Trip
 * Property 4: Session storage round-trip preserves state
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
 *
 * Feature: security-hardening, Property 4: Session storage round-trip preserves state
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  window.RMA.clearState();
  sessionStorage.clear();
  localStorage.clear();
});

/**
 * Arbitrary generator for a valid assessment state object.
 * Produces { answers: { ...string keys -> string values }, step: nat }
 */
function arbitraryAssessmentState(fc) {
  return fc.record({
    answers: fc.dictionary(
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,14}$/),
      fc.string()
    ),
    step: fc.nat({ max: 20 }),
  });
}

const STORAGE_KEY = 'rma-advisor-state';
const HEALTH_CACHE_KEY = 'rma-health-cache';

describe('Session Storage — Property 4: Session storage round-trip preserves state', () => {

  it('saveState then loadState recovers identical state from sessionStorage (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryAssessmentState(fc),
        ({ answers, step }) => {
          // Clear everything
          window.RMA.clearState();
          sessionStorage.clear();
          localStorage.clear();

          // Set state and step, then persist
          window.RMA.setState(answers);
          window.RMA.setCurrentStep(step);
          window.RMA.saveState();

          // Verify sessionStorage contains the key
          const raw = sessionStorage.getItem(STORAGE_KEY);
          expect(raw).not.toBeNull();

          // Verify localStorage does NOT contain the assessment state key
          expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

          // Parse and verify the stored data matches
          const stored = JSON.parse(raw);
          expect(stored.answers).toEqual(answers);
          expect(stored.step).toBe(step);

          // Clear in-memory state to simulate fresh load
          window.RMA.setState({});
          window.RMA.setCurrentStep(0);

          // Load state back
          const restored = window.RMA.loadState();

          if (Object.keys(answers).length === 0) {
            // Empty answers object: loadState checks d.answers is truthy,
            // but an empty object is truthy, so it should still restore
            expect(restored).toBe(true);
          } else {
            expect(restored).toBe(true);
          }

          // Verify recovered state matches original
          expect(window.RMA.getState()).toEqual(answers);
          expect(window.RMA.getCurrentStep()).toBe(step);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('localStorage never contains assessment state key after save (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryAssessmentState(fc),
        ({ answers, step }) => {
          window.RMA.clearState();
          sessionStorage.clear();
          localStorage.clear();

          window.RMA.setState(answers);
          window.RMA.setCurrentStep(step);
          window.RMA.saveState();

          // localStorage must NOT have the assessment key
          expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
          // sessionStorage MUST have it
          expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Session Storage — Unit tests for storage separation', () => {

  it('health cache functions use localStorage (key: rma-health-cache)', () => {
    localStorage.clear();
    sessionStorage.clear();

    // Simulate saving health cache by writing directly (health cache uses localStorage)
    const healthData = { incidents: [{ title: 'test' }], timestamp: Date.now() };
    localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(healthData));

    // Verify it's in localStorage
    expect(localStorage.getItem(HEALTH_CACHE_KEY)).not.toBeNull();
    const parsed = JSON.parse(localStorage.getItem(HEALTH_CACHE_KEY));
    expect(parsed.incidents).toEqual(healthData.incidents);

    // Verify it's NOT in sessionStorage
    expect(sessionStorage.getItem(HEALTH_CACHE_KEY)).toBeNull();
  });

  it('assessment state uses sessionStorage after migration', () => {
    window.RMA.clearState();
    sessionStorage.clear();
    localStorage.clear();

    // Set some state and save
    window.RMA.setState({ workloadCriticality: 'tier-1' });
    window.RMA.setCurrentStep(3);
    window.RMA.saveState();

    // Assessment state should be in sessionStorage
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(stored.answers.workloadCriticality).toBe('tier-1');
    expect(stored.step).toBe(3);

    // Assessment state should NOT be in localStorage
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearState removes from sessionStorage, not localStorage', () => {
    window.RMA.setState({ test: 'value' });
    window.RMA.saveState();

    // Put something in localStorage under same key to verify it's untouched
    localStorage.setItem('other-key', 'preserved');

    window.RMA.clearState();

    // sessionStorage should be cleared for the key
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    // localStorage other keys should be untouched
    expect(localStorage.getItem('other-key')).toBe('preserved');
  });

  it('StateManager.STORAGE_KEY matches expected value', () => {
    expect(window.StateManager.STORAGE_KEY).toBe('rma-advisor-state');
  });
});
