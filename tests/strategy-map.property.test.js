// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property test for StrategyMap
 * Feature: migration-flow-engine, Property 14: Strategy Map SVG Generation
 * **Validates: Requirements 8.1**
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

describe('StrategyMap — Property 14: Strategy Map SVG Generation', () => {
  it('for all 4 patterns, returns non-empty SVG with 2 rects and at least 1 line (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('active-active', 'warm-standby', 'pilot-light', 'backup-restore'),
        (pattern) => {
          const svg = window.generateStrategyMap(pattern);

          // Non-empty string
          expect(svg.length).toBeGreaterThan(0);

          // Contains <svg> element
          expect(svg).toContain('<svg');
          expect(svg).toContain('</svg>');

          // Has role="img" and aria-label
          expect(svg).toContain('role="img"');
          expect(svg).toContain('aria-label=');

          // Parse the SVG to check structure
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          expect(svgEl).not.toBeNull();

          // Has region box rect elements (Route53 bar + 2 region boxes with internal components)
          const rects = svgEl.querySelectorAll('rect');
          expect(rects.length).toBeGreaterThanOrEqual(2);

          // At least 1 line element (arrow)
          const lines = svgEl.querySelectorAll('line');
          expect(lines.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
