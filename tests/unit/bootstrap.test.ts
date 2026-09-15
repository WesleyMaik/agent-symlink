import { describe, it, expect } from 'vitest';
import { VERSION } from '../../src/index.js';
import { readFileSync } from 'node:fs';
import { getPackageVersion } from '../../src/utils/version.js';

describe('Bootstrap', () => {
  it('should use the package version throughout the public API and CLI', () => {
    const metadata = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    ) as { version: string };
    expect(VERSION).toBe(metadata.version);
    expect(getPackageVersion()).toBe(metadata.version);
  });
});
