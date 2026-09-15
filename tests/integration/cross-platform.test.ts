import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLink, removeLink } from '../../src/core/linker.js';
import { inspectPath } from '../../src/core/inspector.js';
import { normalizeLinkPath } from '../../src/core/platform.js';

describe('cross-platform hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-platform-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should handle paths with spaces', async () => {
    const spaceDir = path.join(tempDir, 'folder with spaces');
    await fs.mkdir(spaceDir, { recursive: true });

    const source = path.join(spaceDir, 'my agents file.md');
    const target = path.join(spaceDir, 'my target link.md');
    await fs.writeFile(source, '# Content with spaces', 'utf8');

    const result = await createLink(source, target);
    expect(result.status).toBe('created');
    expect(result.linkValue).toBe('my agents file.md');

    const readBack = await fs.readFile(target, 'utf8');
    expect(readBack).toBe('# Content with spaces');

    const inspection = await inspectPath(target);
    expect(inspection.status).toBe('valid');
    expect(inspection.linkValue).toBe('my agents file.md');
  });

  it('should handle unicode characters in paths', async () => {
    const unicodeDir = path.join(tempDir, 'projet-ação-🤖');
    await fs.mkdir(unicodeDir, { recursive: true });

    const source = path.join(unicodeDir, 'instruções.md');
    const target = path.join(unicodeDir, 'CLAUDE-ação.md');
    await fs.writeFile(source, '# Unicode text', 'utf8');

    const result = await createLink(source, target);
    expect(result.status).toBe('created');

    const readBack = await fs.readFile(target, 'utf8');
    expect(readBack).toBe('# Unicode text');
  });

  it('should guarantee POSIX forward slashes in relative link values on Windows', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'sub', 'nested', 'deep', 'CLAUDE.md');
    await fs.writeFile(source, '# Rules', 'utf8');

    const result = await createLink(source, target);
    expect(result.status).toBe('created');
    expect(result.linkValue).toBe('../../../AGENTS.md');
    expect(result.linkValue).not.toContain('\\');

    const readBack = await fs.readFile(target, 'utf8');
    expect(readBack).toBe('# Rules');
  });

  it('should safely unlink directory symlink without deleting target directory contents', async () => {
    const sourceDir = path.join(tempDir, 'original-skills');
    const targetDir = path.join(tempDir, 'linked-skills');
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'sample-skill.md'), 'sample', 'utf8');

    await createLink(sourceDir, targetDir);

    const unlinkResult = await removeLink(targetDir);
    expect(unlinkResult.removed).toBe(true);

    const sourceStillExists = await fs.access(sourceDir).then(() => true).catch(() => false);
    expect(sourceStillExists).toBe(true);

    const fileInSourceStillExists = await fs
      .access(path.join(sourceDir, 'sample-skill.md'))
      .then(() => true)
      .catch(() => false);
    expect(fileInSourceStillExists).toBe(true);
  });

  it('should normalize various Windows path structures', () => {
    expect(normalizeLinkPath('.\\test\\path')).toBe('./test/path');
    expect(normalizeLinkPath('..\\..\\agents\\skills')).toBe('../../agents/skills');
    expect(normalizeLinkPath('already/posix/path')).toBe('already/posix/path');
  });
});
