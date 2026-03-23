// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property test for StateManager round-trip persistence
 * Feature: migration-flow-engine, Property 9: State Persistence Round Trip
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  window.StateManager.clear();
  localStorage.clear();
});

describe('StateManager — Property 9: State Persistence Round Trip', () => {
  it('persisting via set() and restoring via restore() yields identical state (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,19}$/),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
        (stateObj) => {
          // Clear before each iteration
          window.StateManager.clear();
          localStorage.clear();

          // Set all key-value pairs
          for (const [key, value] of Object.entries(stateObj)) {
            window.StateManager.set(key, value);
          }

          // Create a fresh StateManager-like restore by clearing in-memory state
          const savedJson = localStorage.getItem(window.StateManager.STORAGE_KEY);

          // Reset in-memory state
          window.StateManager._state = {};

          // Restore from localStorage
          const restored = window.StateManager.restore();

          if (Object.keys(stateObj).length === 0) {
            // Empty state: nothing was persisted, restore returns false
            return true;
          }

          // Restore should succeed
          expect(restored).toBe(true);

          // Every key-value pair should match
          for (const [key, value] of Object.entries(stateObj)) {
            expect(window.StateManager.get(key)).toEqual(value);
          }

          // Full state should match
          expect(window.StateManager.getAll()).toEqual(stateObj);
        }
      ),
      { numRuns: 100 }
    );
  });
});
