// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for StrategyMap
 * **Validates: Requirements 8.2, 8.3, 8.4**
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

describe('StrategyMap — Unit Tests', () => {
  // E7: Active/Active SVG has bidirectional arrows (2 line elements)
  it('E7: Active/Active SVG has bidirectional arrows (2 line elements)', () => {
    const svg = window.generateStrategyMap('active-active');
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const lines = doc.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  // E8: Warm Standby SVG has dashed border (stroke-dasharray)
  it('E8: Warm Standby SVG has dashed border on target', () => {
    const svg = window.generateStrategyMap('warm-standby');
    expect(svg).toContain('stroke-dasharray');

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const rects = doc.querySelectorAll('rect');
    // The recovery region outer rect (index 8: after Route53 bar + primary region's 7 rects)
    const targetRect = rects[8];
    expect(targetRect.getAttribute('stroke-dasharray')).toBe('8,4');
  });

  // E9: Pilot Light/Backup-Restore SVG has reduced opacity target
  it('E9: Pilot Light SVG has reduced opacity target (0.5)', () => {
    const svg = window.generateStrategyMap('pilot-light');
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const rects = doc.querySelectorAll('rect');
    const targetRect = rects[8];
    expect(targetRect.getAttribute('opacity')).toBe('0.5');
  });

  it('E9: Backup-Restore SVG has reduced opacity target (0.3)', () => {
    const svg = window.generateStrategyMap('backup-restore');
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const rects = doc.querySelectorAll('rect');
    const targetRect = rects[8];
    expect(targetRect.getAttribute('opacity')).toBe('0.3');
  });
});
