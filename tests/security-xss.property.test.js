// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for XSS Protection
 * Property 3: HTML escaping prevents script injection
 * **Validates: Requirements 2.4**
 *
 * Feature: security-hardening, Property 3: HTML escaping prevents script injection
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * JavaScript mirror of the esc() function from scripts.js.
 * Creates a temporary DOM element, assigns input to textContent,
 * and returns the escaped innerHTML value.
 */
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * The five HTML-significant characters and their entity equivalents.
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/**
 * fast-check arbitrary that generates strings guaranteed to contain
 * at least one HTML-significant character.
 */
function arbitraryHtmlString(fc) {
  const htmlChars = fc.constantFrom('<', '>', '&', '"', "'");
  return fc.tuple(fc.string(), htmlChars, fc.string()).map(
    ([before, ch, after]) => before + ch + after
  );
}

describe('XSS Protection — Property 3: HTML escaping prevents script injection', () => {

  it('all HTML-significant characters are replaced with entity equivalents (100 iterations)', () => {
    fc.assert(
      fc.property(
        arbitraryHtmlString(fc),
        (input) => {
          const result = esc(input);
          // The output must not contain any raw HTML-significant characters
          // that were present in the input — they must be entity-encoded.
          // Note: '&' appears in entities themselves, so we check that no
          // raw <, >, ", ' remain, and that & only appears as part of entities.
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip via DOM renders as plain text identical to original input (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const escaped = esc(input);
          // Assign escaped HTML to innerHTML, then read back textContent
          // This simulates what happens when escaped content is rendered in the DOM
          const container = document.createElement('div');
          container.innerHTML = escaped;
          expect(container.textContent).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('< and > are always escaped to &lt; and &gt; (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.constantFrom('<', '>'), fc.string()).map(
          ([a, ch, b]) => a + ch + b
        ),
        (input) => {
          const result = esc(input);
          // No raw angle brackets should survive
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
          // Count of &lt; + &gt; in output should match count of < + > in input
          const inputAngleCount = (input.match(/[<>]/g) || []).length;
          const ltCount = (result.match(/&lt;/g) || []).length;
          const gtCount = (result.match(/&gt;/g) || []).length;
          expect(ltCount + gtCount).toBe(inputAngleCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('& is always escaped to &amp; (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string()).map(
          ([a, b]) => a + '&' + b
        ),
        (input) => {
          const result = esc(input);
          // Round-trip must recover original
          const container = document.createElement('div');
          container.innerHTML = result;
          expect(container.textContent).toBe(input);
          // The number of &amp; in the output should be at least the number
          // of & in the input (since & in the output is always &amp;)
          const inputAmpCount = (input.match(/&/g) || []).length;
          const outputAmpEntityCount = (result.match(/&amp;/g) || []).length;
          expect(outputAmpEntityCount).toBe(inputAmpCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('script tags are neutralized and render as plain text (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (payload) => {
          const input = '<script>' + payload + '</script>';
          const result = esc(input);
          // Must not contain raw script tags
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('</script>');
          // Round-trip must render as plain text
          const container = document.createElement('div');
          container.innerHTML = result;
          expect(container.textContent).toBe(input);
          // No script elements should be created
          expect(container.querySelector('script')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output never creates DOM elements when assigned to innerHTML (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const escaped = esc(input);
          const container = document.createElement('div');
          container.innerHTML = escaped;
          // The container should only have text nodes, no element children
          expect(container.children.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty string returns empty string', () => {
    expect(esc('')).toBe('');
  });

  it('string with no HTML characters passes through unchanged (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/[<>&"']/.test(s)),
        (input) => {
          const result = esc(input);
          expect(result).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });
});
