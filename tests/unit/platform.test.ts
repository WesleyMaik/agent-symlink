import { describe, it, expect } from 'vitest';
import { determineLinkType, normalizeLinkPath, canCreateSymlink } from '../../src/core/platform.js';

describe('platform utilities', () => {
  it('should normalize backslashes to forward slashes', () => {
    expect(normalizeLinkPath('..\\..\\AGENTS.md')).toBe('../../AGENTS.md');
    expect(normalizeLinkPath('dir\\sub\\file.txt')).toBe('dir/sub/file.txt');
  });

  it('should determine link type correctly', () => {
    expect(determineLinkType(false)).toBe('file');
    expect(determineLinkType(true)).toBe('dir');
  });

  it('should check symlink capability on current environment', async () => {
    const capable = await canCreateSymlink();
    expect(typeof capable).toBe('boolean');
  });
});
