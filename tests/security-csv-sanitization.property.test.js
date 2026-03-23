// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for CSV Sanitization
 * Property 1: CSV sanitization preserves data via quoting
 * **Validates: Requirements 1.1, 1.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * JavaScript mirror of the bash sanitize_csv() function from rma-environment-discovery.sh.
 *
 * Logic:
 *   1. If the value starts with =, +, -, or @, prefix with a single quote (')
 *   2. Escape embedded double quotes by doubling them (RFC 4180)
 *   3. Wrap the result in double quotes
 */
function sanitize_csv(val) {
  // Prefix dangerous leading characters with single quote
  if (val.length > 0 && '=+-@'.includes(val[0])) {
    val = "'" + val;
  }
  // Escape embedded double quotes by doubling them
  val = val.replace(/"/g, '""');
  // Wrap in double quotes
  return '"' + val + '"';
}

/**
 * Helper: extract the inner content from a sanitized value (strip outer double quotes).
 */
function innerContent(sanitized) {
  // Must start and end with double quote
  if (sanitized[0] !== '"' || sanitized[sanitized.length - 1] !== '"') return null;
  return sanitized.slice(1, -1);
}

/**
 * Helper: unescape RFC 4180 doubled quotes back to single quotes.
 */
function unescapeQuotes(s) {
  return s.replace(/""/g, '"');
}

const DANGEROUS_PREFIXES = ['=', '+', '-', '@'];

describe('CSV Sanitization — Property 1: CSV sanitization preserves data via quoting', () => {

  it('output is always wrapped in double quotes (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const result = sanitize_csv(input);
          expect(result[0]).toBe('"');
          expect(result[result.length - 1]).toBe('"');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('preserves all original characters including commas (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const result = sanitize_csv(input);
          const inner = innerContent(result);
          expect(inner).not.toBeNull();
          // Unescape doubled quotes to recover original content
          let recovered = unescapeQuotes(inner);
          // If a dangerous prefix was added, strip the leading single quote
          if (input.length > 0 && DANGEROUS_PREFIXES.includes(input[0])) {
            expect(recovered[0]).toBe("'");
            recovered = recovered.slice(1);
          }
          expect(recovered).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('escapes embedded double quotes by doubling them (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.includes('"')),
        (input) => {
          const result = sanitize_csv(input);
          const inner = innerContent(result);
          expect(inner).not.toBeNull();
          // The inner content should not contain a lone double quote —
          // every double quote from the original must appear as ""
          // Verify by checking that unescaping recovers the right count
          const originalQuoteCount = (input.match(/"/g) || []).length;
          // After prefix handling, count quotes in inner
          let content = inner;
          if (input.length > 0 && DANGEROUS_PREFIXES.includes(input[0])) {
            content = content.slice(1); // strip the leading single quote prefix
          }
          const doubledCount = (content.match(/""/g) || []).length;
          expect(doubledCount).toBe(originalQuoteCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('neutralizes dangerous prefixes with a single quote (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('=', '+', '-', '@'),
        fc.string(),
        (prefix, rest) => {
          const input = prefix + rest;
          const result = sanitize_csv(input);
          const inner = innerContent(result);
          expect(inner).not.toBeNull();
          // Inner content must start with a single quote followed by the original prefix
          expect(inner[0]).toBe("'");
          // After unescaping, the character after the single quote is the original prefix
          const unescaped = unescapeQuotes(inner);
          expect(unescaped[1]).toBe(prefix);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not add single quote prefix for safe strings (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length === 0 || !DANGEROUS_PREFIXES.includes(s[0])),
        (input) => {
          const result = sanitize_csv(input);
          const inner = innerContent(result);
          expect(inner).not.toBeNull();
          const recovered = unescapeQuotes(inner);
          // No prefix added — recovered should exactly match input
          expect(recovered).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles empty string gracefully', () => {
    const result = sanitize_csv('');
    expect(result).toBe('""');
  });

  it('handles strings with commas inside quoted output (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.includes(',')),
        (input) => {
          const result = sanitize_csv(input);
          const inner = innerContent(result);
          expect(inner).not.toBeNull();
          // Commas must be preserved inside the quoted field
          let recovered = unescapeQuotes(inner);
          if (input.length > 0 && DANGEROUS_PREFIXES.includes(input[0])) {
            recovered = recovered.slice(1);
          }
          const originalCommaCount = (input.match(/,/g) || []).length;
          const recoveredCommaCount = (recovered.match(/,/g) || []).length;
          expect(recoveredCommaCount).toBe(originalCommaCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property tests for CSV Write Functions
 * Property 2: CSV write functions produce properly quoted output
 * **Validates: Requirements 1.3, 1.4**
 *
 * Feature: security-hardening, Property 2: CSV write functions produce properly quoted output
 */

/**
 * JavaScript mirror of the bash add_inventory() function.
 * Takes 7 fields, sanitizes each, and joins with commas + trailing newline.
 */
function add_inventory(rtype, rid, rname, region, service, account, details) {
  return [rtype, rid, rname, region, service, account, details]
    .map(sanitize_csv)
    .join(',') + '\n';
}

/**
 * JavaScript mirror of the bash add_dependency() function.
 * Takes 4 fields, sanitizes each, and joins with commas + trailing newline.
 */
function add_dependency(src, dep_type, target, region) {
  return [src, dep_type, target, region]
    .map(sanitize_csv)
    .join(',') + '\n';
}

/**
 * Parse a CSV line (produced by add_inventory/add_dependency) into individual
 * quoted fields. Fields are always double-quoted, so we split on `","` boundaries
 * while respecting the outer quotes and escaped (doubled) quotes inside fields.
 *
 * Returns an array of raw field strings including their surrounding double quotes.
 */
function parseQuotedCSVLine(line) {
  const trimmed = line.replace(/\n$/, '');
  const fields = [];
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] !== '"') {
      // Unexpected — but handle gracefully
      const next = trimmed.indexOf(',', i);
      if (next === -1) {
        fields.push(trimmed.slice(i));
        break;
      }
      fields.push(trimmed.slice(i, next));
      i = next + 1;
      continue;
    }
    // Start of a quoted field
    let j = i + 1;
    while (j < trimmed.length) {
      if (trimmed[j] === '"') {
        if (j + 1 < trimmed.length && trimmed[j + 1] === '"') {
          // Escaped double quote — skip both
          j += 2;
          continue;
        }
        // End of quoted field
        break;
      }
      j++;
    }
    fields.push(trimmed.slice(i, j + 1));
    i = j + 1;
    if (i < trimmed.length && trimmed[i] === ',') {
      i++; // skip field separator
    }
  }
  return fields;
}

describe('CSV Write Functions — Property 2: CSV write functions produce properly quoted output', () => {

  it('add_inventory produces exactly 7 properly double-quoted fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), fc.string(), fc.string(),
        fc.string(), fc.string(), fc.string(),
        (f1, f2, f3, f4, f5, f6, f7) => {
          const line = add_inventory(f1, f2, f3, f4, f5, f6, f7);
          // Line ends with newline
          expect(line[line.length - 1]).toBe('\n');
          const fields = parseQuotedCSVLine(line);
          // Exactly 7 fields
          expect(fields.length).toBe(7);
          // Each field is wrapped in double quotes
          for (const field of fields) {
            expect(field[0]).toBe('"');
            expect(field[field.length - 1]).toBe('"');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_dependency produces exactly 4 properly double-quoted fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), fc.string(), fc.string(),
        (f1, f2, f3, f4) => {
          const line = add_dependency(f1, f2, f3, f4);
          expect(line[line.length - 1]).toBe('\n');
          const fields = parseQuotedCSVLine(line);
          expect(fields.length).toBe(4);
          for (const field of fields) {
            expect(field[0]).toBe('"');
            expect(field[field.length - 1]).toBe('"');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_inventory preserves commas within fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.includes(',')),
        fc.string(), fc.string(), fc.string(),
        fc.string(), fc.string(), fc.string(),
        (commaField, f2, f3, f4, f5, f6, f7) => {
          const line = add_inventory(commaField, f2, f3, f4, f5, f6, f7);
          const fields = parseQuotedCSVLine(line);
          expect(fields.length).toBe(7);
          // The first field's inner content should preserve the commas
          const inner = innerContent(fields[0]);
          let recovered = unescapeQuotes(inner);
          if (commaField.length > 0 && DANGEROUS_PREFIXES.includes(commaField[0])) {
            recovered = recovered.slice(1);
          }
          const originalCommas = (commaField.match(/,/g) || []).length;
          const recoveredCommas = (recovered.match(/,/g) || []).length;
          expect(recoveredCommas).toBe(originalCommas);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_dependency preserves commas within fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.includes(',')),
        fc.string(), fc.string(), fc.string(),
        (commaField, f2, f3, f4) => {
          const line = add_dependency(commaField, f2, f3, f4);
          const fields = parseQuotedCSVLine(line);
          expect(fields.length).toBe(4);
          const inner = innerContent(fields[0]);
          let recovered = unescapeQuotes(inner);
          if (commaField.length > 0 && DANGEROUS_PREFIXES.includes(commaField[0])) {
            recovered = recovered.slice(1);
          }
          const originalCommas = (commaField.match(/,/g) || []).length;
          const recoveredCommas = (recovered.match(/,/g) || []).length;
          expect(recoveredCommas).toBe(originalCommas);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_inventory neutralizes dangerous prefixes in all field positions (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('=', '+', '-', '@'),
        fc.string(),
        fc.nat({ max: 6 }),
        (prefix, rest, position) => {
          const dangerousValue = prefix + rest;
          const fields = ['safe1', 'safe2', 'safe3', 'safe4', 'safe5', 'safe6', 'safe7'];
          fields[position] = dangerousValue;
          const line = add_inventory(...fields);
          const parsed = parseQuotedCSVLine(line);
          expect(parsed.length).toBe(7);
          // The field at `position` should have its dangerous prefix neutralized
          const inner = innerContent(parsed[position]);
          expect(inner).not.toBeNull();
          expect(inner[0]).toBe("'");
          const unescaped = unescapeQuotes(inner);
          expect(unescaped[1]).toBe(prefix);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_dependency neutralizes dangerous prefixes in all field positions (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('=', '+', '-', '@'),
        fc.string(),
        fc.nat({ max: 3 }),
        (prefix, rest, position) => {
          const dangerousValue = prefix + rest;
          const fields = ['safe1', 'safe2', 'safe3', 'safe4'];
          fields[position] = dangerousValue;
          const line = add_dependency(...fields);
          const parsed = parseQuotedCSVLine(line);
          expect(parsed.length).toBe(4);
          const inner = innerContent(parsed[position]);
          expect(inner).not.toBeNull();
          expect(inner[0]).toBe("'");
          const unescaped = unescapeQuotes(inner);
          expect(unescaped[1]).toBe(prefix);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_inventory round-trips all field values correctly (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), fc.string(), fc.string(),
        fc.string(), fc.string(), fc.string(),
        (f1, f2, f3, f4, f5, f6, f7) => {
          const inputs = [f1, f2, f3, f4, f5, f6, f7];
          const line = add_inventory(...inputs);
          const parsed = parseQuotedCSVLine(line);
          expect(parsed.length).toBe(7);
          for (let idx = 0; idx < 7; idx++) {
            const inner = innerContent(parsed[idx]);
            expect(inner).not.toBeNull();
            let recovered = unescapeQuotes(inner);
            if (inputs[idx].length > 0 && DANGEROUS_PREFIXES.includes(inputs[idx][0])) {
              expect(recovered[0]).toBe("'");
              recovered = recovered.slice(1);
            }
            expect(recovered).toBe(inputs[idx]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add_dependency round-trips all field values correctly (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), fc.string(), fc.string(),
        (f1, f2, f3, f4) => {
          const inputs = [f1, f2, f3, f4];
          const line = add_dependency(...inputs);
          const parsed = parseQuotedCSVLine(line);
          expect(parsed.length).toBe(4);
          for (let idx = 0; idx < 4; idx++) {
            const inner = innerContent(parsed[idx]);
            expect(inner).not.toBeNull();
            let recovered = unescapeQuotes(inner);
            if (inputs[idx].length > 0 && DANGEROUS_PREFIXES.includes(inputs[idx][0])) {
              expect(recovered[0]).toBe("'");
              recovered = recovered.slice(1);
            }
            expect(recovered).toBe(inputs[idx]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
