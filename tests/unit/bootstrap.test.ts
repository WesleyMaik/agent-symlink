import { describe, it, expect } from 'vitest';
import { VERSION } from '../../src/index.js';

describe('Bootstrap', () => {
  it('should export the initial version', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
