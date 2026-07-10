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

describe('parseHealthRSS — resolution-aware filtering', () => {
  // RFC-822 pubDate string N days before now
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toUTCString();
  // Build a minimal RSS document from item specs
  const rss = (items) => `<?xml version="1.0" encoding="UTF-8"?><rss><channel>` +
    items.map((it) => `<item>` +
      `<title>${it.title}</title>` +
      (it.desc !== undefined ? `<description>${it.desc}</description>` : '') +
      (it.pubDate !== undefined ? `<pubDate>${it.pubDate}</pubDate>` : '') +
      (it.guid !== undefined ? `<guid>${it.guid}</guid>` : '') +
      (it.link !== undefined ? `<link>${it.link}</link>` : '') +
      `</item>`).join('') +
    `</channel></rss>`;
  const GUID = (frag, ts) => `https://status.aws.amazon.com/#${frag}_${ts}`;

  // The core regression: a prolonged, still-active incident whose last update is well past the
  // old 90-day window must NOT be erased by age.
  it('keeps an old-but-unresolved incident (no 90-day erase)', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(200), guid: GUID('multipleservices-me-central-1', 1) }
    ]));
    expect(incidents.length).toBe(1);
    expect(incidents[0].severity).toBe('disruption');
    expect(incidents[0].region.code).toBe('me-central-1');
  });

  // An incident is hidden once its NEWEST update says "operating normally".
  it('hides an incident whose latest update reports operating normally', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(5), guid: GUID('multipleservices-me-central-1', 1000) },
      { title: 'Service is operating normally: Increased Error Rates', pubDate: daysAgo(1), guid: GUID('multipleservices-me-central-1', 2000) }
    ]));
    expect(incidents.length).toBe(0);
  });

  // Resolution is decided by the newest update by pubDate, independent of document order.
  it('uses newest update to decide resolution regardless of feed order', () => {
    // Resolved item appears FIRST in the document but is the newest by date → still hidden.
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service is operating normally: Increased Error Rates', pubDate: daysAgo(1), guid: GUID('multipleservices-me-central-1', 2000) },
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(5), guid: GUID('multipleservices-me-central-1', 1000) }
    ]));
    expect(incidents.length).toBe(0);
  });

  // Many per-update items for one incident collapse to a single card using the newest update.
  it('collapses multiple updates of one incident (by GUID) into the newest', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: early update', pubDate: daysAgo(9), guid: GUID('multipleservices-me-central-1', 1000) },
      { title: 'Service disruption: latest update', pubDate: daysAgo(2), guid: GUID('multipleservices-me-central-1', 3000) },
      { title: 'Service disruption: middle update', pubDate: daysAgo(5), guid: GUID('multipleservices-me-central-1', 2000) }
    ]));
    expect(incidents.length).toBe(1);
    expect(incidents[0].title).toBe('Service disruption: latest update');
  });

  // Two different regions sharing an identical title must remain two cards — the old
  // title-based dedup was region-blind and would have merged these.
  it('keeps two regions with identical titles as separate incidents', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(70), guid: GUID('multipleservices-me-central-1', 1) },
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(70), guid: GUID('multipleservices-me-south-1', 1) }
    ]));
    expect(incidents.length).toBe(2);
    const codes = incidents.map((i) => i.region.code).sort();
    expect(codes).toEqual(['me-central-1', 'me-south-1']);
  });

  // The absolute staleness backstop still drops implausibly old entries.
  it('drops an incident older than the 365-day backstop', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', pubDate: daysAgo(400), guid: GUID('multipleservices-me-central-1', 1) }
    ]));
    expect(incidents.length).toBe(0);
  });

  // An undated but unresolved item is still shown (no pubDate to age it out).
  it('shows an unresolved item that has no pubDate', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', guid: GUID('multipleservices-me-central-1', 1) }
    ]));
    expect(incidents.length).toBe(1);
    expect(incidents[0].updatedAt).toBeNull();
  });

  // HTML in the description is stripped from the rendered summary.
  it('strips HTML tags from the incident summary', () => {
    const incidents = window.parseHealthRSS(rss([
      { title: 'Service disruption: Increased Error Rates', desc: '<p>region <b>damaged</b></p>', pubDate: daysAgo(3), guid: GUID('multipleservices-me-central-1', 1) }
    ]));
    expect(incidents.length).toBe(1);
    expect(incidents[0].summary).toBe('region damaged');
  });
});
