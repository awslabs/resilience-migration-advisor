// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for Download Confirmation Dialog
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 *
 * Feature: security-hardening
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

beforeEach(() => {
  setupDOM();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Download Confirmation Dialog — Requirements 8.1–8.8', () => {

  it('8.1 displays a confirm dialog before download begins', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    expect(confirmSpy).toHaveBeenCalledOnce();
  });

  it('8.2 dialog warns that script enumerates AWS resources in read-only mode', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    const msg = confirmSpy.mock.calls[0][0];
    expect(msg).toContain('enumerates AWS resources');
    expect(msg).toContain('read-only');
  });

  it('8.3 dialog warns that script creates CSV files with infrastructure data', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    const msg = confirmSpy.mock.calls[0][0];
    expect(msg).toContain('CSV files');
    expect(msg).toContain('infrastructure inventory data');
  });

  it('8.4 dialog recommends reviewing script source code before execution', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    const msg = confirmSpy.mock.calls[0][0];
    expect(msg).toContain('Review the script source code');
  });

  it('8.5 dialog recommends using read-only IAM credentials', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    const msg = confirmSpy.mock.calls[0][0];
    expect(msg).toContain('read-only IAM credentials');
  });

  it('8.6 dialog recommends deleting CSV files after use', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.downloadDiscoveryScript();
    const msg = confirmSpy.mock.calls[0][0];
    expect(msg).toContain('Delete CSV files after use');
  });

  it('8.7 confirm proceeds with download (blob URL created and clicked)', () => {
    // jsdom doesn't provide URL.createObjectURL — stub it
    if (!URL.createObjectURL) URL.createObjectURL = () => '';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    window.downloadDiscoveryScript();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('8.8 cancel aborts download — no blob created', () => {
    // jsdom doesn't provide URL.createObjectURL — stub it
    if (!URL.createObjectURL) URL.createObjectURL = () => '';
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

    window.downloadDiscoveryScript();

    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });
});
