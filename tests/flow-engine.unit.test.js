// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for Flow Engine (adapted to current RMA API)
 * **Validates: Requirements 5.4, 6.2, 6.5**
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  setupDOM();
  window.StateManager.clear();
  localStorage.clear();
});

describe('FlowEngine — Unit Tests', () => {
  // E5: Restart clears localStorage and resets to Step 1
  it('E5: Restart clears localStorage and resets to Step 1', () => {
    // Set up state
    window.RMA.setState({ workloadCriticality: 'tier-0', urgencyMode: 'architecture-strategy' });
    window.RMA.setCurrentStep(3);
    window.RMA.saveState();

    // Verify state exists
    expect(window.RMA.getState().workloadCriticality).toBe('tier-0');

    // Restart
    window.RMA.restart();

    // State should be empty
    expect(Object.keys(window.RMA.getState()).length).toBe(0);

    // Step index should be 0
    expect(window.RMA.getCurrentStep()).toBe(0);
  });

  // E6: Step 0 is the decision layer
  it('E6: Step 0 is the decision layer', () => {
    expect(window.WIZARD_STEPS[0].id).toBe('decision-layer');
    expect(window.WIZARD_STEPS[0].stateKey).toBe('proceedPath');
  });

  // Test state restoration on page load
  it('state restoration on page load: restores to saved step', () => {
    // Simulate saved state via RMA
    window.RMA.setState({ workloadCriticality: 'tier-1', recoveryRequirements: 'rto-1-4h' });
    window.RMA.setCurrentStep(2);
    window.RMA.saveState();

    // Clear in-memory state
    window.RMA.setState({});
    window.RMA.setCurrentStep(0);

    // Restore
    const restored = window.RMA.loadState();
    expect(restored).toBe(true);

    // Should have restored state
    expect(window.RMA.getState().workloadCriticality).toBe('tier-1');
    expect(window.RMA.getState().recoveryRequirements).toBe('rto-1-4h');
    expect(window.RMA.getCurrentStep()).toBe(2);
  });
});
