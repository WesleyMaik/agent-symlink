import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLink, removeLink } from '../../src/core/linker.js';
import { SourceNotFoundError, TargetExistsError, SymlinkError } from '../../src/utils/errors.js';

describe('linker integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should create a file symlink', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Rules', 'utf8');

    const result = await createLink(source, target);
    expect(result.status).toBe('created');
    expect(result.linkValue).toBe('AGENTS.md');

    const content = await fs.readFile(target, 'utf8');
    expect(content).toBe('# Agent Rules');

    const lstat = await fs.lstat(target);
    expect(lstat.isSymbolicLink()).toBe(true);
  });

  it('should create a nested symlink with relative path', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, '.github', 'copilot-instructions.md');
    await fs.writeFile(source, '# Agent Rules', 'utf8');

    const result = await createLink(source, target);
    expect(result.status).toBe('created');
    expect(result.linkValue).toBe('../AGENTS.md');

    const content = await fs.readFile(target, 'utf8');
    expect(content).toBe('# Agent Rules');
  });

  it('should be idempotent when link already exists and points to expected source', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Rules', 'utf8');

    const first = await createLink(source, target);
    expect(first.status).toBe('created');

    const second = await createLink(source, target);
    expect(second.status).toBe('already_linked');
  });

  it('should reject non-existent source unless allowDangling is set', async () => {
    const source = path.join(tempDir, 'MISSING.md');
    const target = path.join(tempDir, 'CLAUDE.md');

    await expect(createLink(source, target)).rejects.toThrow(SourceNotFoundError);

    const result = await createLink(source, target, { allowDangling: true });
    expect(result.status).toBe('created');
  });

  it('should support dry-run mode without modifying filesystem', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Rules', 'utf8');

    const result = await createLink(source, target, { dryRun: true });
    expect(result.status).toBe('would_create');

    const exists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it('should reject overwriting existing file without force', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Source', 'utf8');
    await fs.writeFile(target, '# Target Existing', 'utf8');

    await expect(createLink(source, target)).rejects.toThrow(TargetExistsError);

    const result = await createLink(source, target, { force: true });
    expect(result.status).toBe('replaced');

    const content = await fs.readFile(target, 'utf8');
    expect(content).toBe('# Source');
  });

  it('should create directory symlink and navigate contents', async () => {
    const sourceDir = path.join(tempDir, '.agents', 'skills');
    const targetDir = path.join(tempDir, '.claude', 'skills');
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'test-skill.md'), 'skill content', 'utf8');

    const result = await createLink(sourceDir, targetDir);
    expect(result.status).toBe('created');

    const readBack = await fs.readFile(path.join(targetDir, 'test-skill.md'), 'utf8');
    expect(readBack).toBe('skill content');
  });

  it('should remove symlink without modifying source', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Rules', 'utf8');
    await createLink(source, target);

    const unlinkResult = await removeLink(target);
    expect(unlinkResult.removed).toBe(true);
    expect(unlinkResult.wasLink).toBe(true);

    const sourceStillExists = await fs
      .access(source)
      .then(() => true)
      .catch(() => false);
    expect(sourceStillExists).toBe(true);

    const targetStillExists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    expect(targetStillExists).toBe(false);
  });

  it('should reject unlinking regular files', async () => {
    const regularFile = path.join(tempDir, 'REGULAR.md');
    await fs.writeFile(regularFile, 'not a link', 'utf8');

    await expect(removeLink(regularFile)).rejects.toThrow(SymlinkError);
  });
});
