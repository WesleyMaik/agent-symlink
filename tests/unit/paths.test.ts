import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolvePaths } from '../../src/core/paths.js';
import { CircularLinkError, InvalidPathError } from '../../src/utils/errors.js';

describe('paths resolution', () => {
  it('should calculate relative link value in same directory', () => {
    const cwd = path.resolve('/repo');
    const result = resolvePaths('AGENTS.md', 'CLAUDE.md', { cwd });
    expect(result.linkValue).toBe('AGENTS.md');
  });

  it('should calculate relative link value for target in subdirectory', () => {
    const cwd = path.resolve('/repo');
    const result = resolvePaths('AGENTS.md', '.github/copilot-instructions.md', { cwd });
    expect(result.linkValue).toBe('../AGENTS.md');
  });

  it('should calculate relative link value for target in nested subdirectory', () => {
    const cwd = path.resolve('/repo');
    const result = resolvePaths('AGENTS.md', '.amazonq/rules/AGENTS.md', { cwd });
    expect(result.linkValue).toBe('../../AGENTS.md');
  });

  it('should handle absolute link option', () => {
    const cwd = path.resolve('/repo');
    const result = resolvePaths('AGENTS.md', 'CLAUDE.md', { cwd, absolute: true });
    expect(result.linkValue).toBe(path.resolve(cwd, 'AGENTS.md'));
  });

  it('should reject empty source or target', () => {
    expect(() => resolvePaths('', 'CLAUDE.md')).toThrow(InvalidPathError);
    expect(() => resolvePaths('AGENTS.md', '  ')).toThrow(InvalidPathError);
  });

  it('should reject circular or identical source and target', () => {
    expect(() => resolvePaths('AGENTS.md', 'AGENTS.md')).toThrow(CircularLinkError);
    expect(() => resolvePaths('./AGENTS.md', 'AGENTS.md')).toThrow(CircularLinkError);
  });
});
