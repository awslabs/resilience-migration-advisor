// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for checkAwsHealthRSS
 * Validates: RSS parsing, error handling, timeout, malformed XML
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

describe('checkAwsHealthRSS — Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. RSS parsing correctly counts <item> entries
  it('counts <item> entries correctly from valid RSS', async () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss><channel>
        <item><title>Event 1</title></item>
        <item><title>Event 2</title></item>
        <item><title>Event 3</title></item>
      </channel></rss>`;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(rss)
    });
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(true);
    expect(result.itemCount).toBe(3);
    expect(result.source).toBe('aws-status-rss');
  });

  // 2. Empty RSS returns count 0
  it('returns itemCount 0 for RSS with no <item> entries', async () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss><channel></channel></rss>`;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(rss)
    });
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(true);
    expect(result.itemCount).toBe(0);
  });

  // 3. Malformed XML does not crash
  it('handles malformed XML without crashing', async () => {
    const malformed = `<rss><channel><item><title>broken`;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(malformed)
    });
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(true);
    expect(typeof result.itemCount).toBe('number');
  });

  // 4. Network failure returns success:false
  it('returns success:false on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(false);
    expect(result.error).toBe('RSS fetch failed');
  });

  // 5. Timeout returns success:false
  it('returns success:false on timeout (abort)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
      });
    });
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(false);
    expect(result.error).toBe('RSS fetch failed');
  });

  // 6. HTTP error status returns success:false
  it('returns success:false on HTTP error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('')
    });
    const result = await window.checkAwsHealthRSS();
    expect(result.success).toBe(false);
    expect(result.error).toBe('RSS fetch failed');
  });

  // 7. renderRssStatus updates DOM on success
  it('renderRssStatus shows reachable message on success', () => {
    window.renderRssStatus({ success: true, itemCount: 5, source: 'aws-status-rss' });
    const el = document.getElementById('health-rss-status');
    expect(el.innerHTML).toContain('AWS Status Feed reachable');
    expect(el.innerHTML).toContain('5 total RSS entries');
  });

  // 8. renderRssStatus updates DOM on failure
  it('renderRssStatus shows unavailable message on failure', () => {
    window.renderRssStatus({ success: false, error: 'RSS fetch failed' });
    const el = document.getElementById('health-rss-status');
    expect(el.innerHTML).toContain('AWS Status Feed unavailable');
  });

  // 9. renderRssStatus shows checking state when called with null
  it('renderRssStatus shows checking message when called with null', () => {
    window.renderRssStatus(null);
    const el = document.getElementById('health-rss-status');
    expect(el.innerHTML).toContain('Checking AWS Status Feed');
  });
});
