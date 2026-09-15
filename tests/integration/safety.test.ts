import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLink } from '../../src/core/linker.js';
import { CircularLinkError, SourceNotFoundError } from '../../src/utils/errors.js';
import { normalizeLinkPath } from '../../src/core/platform.js';

describe('link safety and portability', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-safety-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(cwd, { recursive: true, force: true });
  });

  it('stores a relative directory link and supports repeated execution', async () => {
    await fs.mkdir(path.join(cwd, 'source'));
    await fs.writeFile(path.join(cwd, 'source', 'skill.md'), 'skill');
    await createLink('source', 'nested/skills', { cwd });
    const storedLink = await fs.readlink(path.join(cwd, 'nested/skills'));
    expect(path.isAbsolute(storedLink)).toBe(false);
    expect(normalizeLinkPath(storedLink)).toBe('../source');
    expect(await createLink('source', 'nested/skills', { cwd })).toMatchObject({
      status: 'already_linked'
    });
    expect(await fs.readFile(path.join(cwd, 'nested/skills/skill.md'), 'utf8')).toBe('skill');
  });

  it('follows a directory source symlink to determine the link type', async () => {
    await fs.mkdir(path.join(cwd, 'source'));
    await fs.writeFile(path.join(cwd, 'source/skill.md'), 'skill');
    await fs.symlink('source', path.join(cwd, 'alias'), 'dir');
    const result = await createLink('alias', 'skills', { cwd });
    expect(result.type).toBe('dir');
    expect(await fs.readFile(path.join(cwd, 'skills/skill.md'), 'utf8')).toBe('skill');
  });

  it('rejects a dangling source symlink unless explicitly allowed', async () => {
    await fs.symlink('missing', path.join(cwd, 'alias'), 'file');
    await expect(createLink('alias', 'target', { cwd })).rejects.toThrow(SourceNotFoundError);
    await expect(
      createLink('alias', 'target', { cwd, allowDangling: true })
    ).resolves.toMatchObject({ status: 'created' });
  });

  it('preserves a source inside a directory selected for replacement', async () => {
    await fs.mkdir(path.join(cwd, 'rules'));
    await fs.writeFile(path.join(cwd, 'rules/AGENTS.md'), 'source');
    await expect(createLink('rules/AGENTS.md', 'rules', { cwd, force: true })).rejects.toThrow(
      CircularLinkError
    );
    expect(await fs.readFile(path.join(cwd, 'rules/AGENTS.md'), 'utf8')).toBe('source');
  });

  it('rejects a directory link inside its own source', async () => {
    await fs.mkdir(path.join(cwd, 'rules'));
    await expect(createLink('rules', 'rules/nested/link', { cwd })).rejects.toThrow(
      CircularLinkError
    );
    expect(await fs.readdir(path.join(cwd, 'rules'))).toEqual([]);
  });

  it.each([false, true])(
    'preserves a missing source when its child is selected as target (dryRun: %s)',
    async (dryRun) => {
      await expect(
        createLink('source', 'source/nested', { cwd, allowDangling: true, dryRun })
      ).rejects.toThrow(CircularLinkError);
      expect(await fs.readdir(cwd)).toEqual([]);
    }
  );

  it('preserves a source reached through an aliased parent directory', async () => {
    await fs.mkdir(path.join(cwd, 'rules'));
    await fs.writeFile(path.join(cwd, 'rules/AGENTS.md'), 'source');
    await fs.symlink('rules', path.join(cwd, 'alias'), 'dir');
    await expect(
      createLink('rules/AGENTS.md', 'alias/AGENTS.md', { cwd, force: true })
    ).rejects.toThrow(CircularLinkError);
    expect(await fs.readFile(path.join(cwd, 'rules/AGENTS.md'), 'utf8')).toBe('source');
  });

  it('rejects a cycle through a dangling source link', async () => {
    await fs.symlink('target', path.join(cwd, 'source'), 'file');
    await expect(createLink('source', 'target', { cwd, allowDangling: true })).rejects.toThrow(
      CircularLinkError
    );
  });

  it('resolves relative links from the physical destination directory', async () => {
    await fs.mkdir(path.join(cwd, 'deep/physical'), { recursive: true });
    await fs.symlink('deep/physical', path.join(cwd, 'alias'), 'dir');
    await fs.writeFile(path.join(cwd, 'AGENTS.md'), 'source');
    await createLink('AGENTS.md', 'alias/CLAUDE.md', { cwd });
    expect(await fs.readFile(path.join(cwd, 'alias/CLAUDE.md'), 'utf8')).toBe('source');
  });

  it.each(['file', 'directory', 'symlink'] as const)(
    'preserves an existing %s when symlink creation fails',
    async (kind) => {
      await fs.writeFile(path.join(cwd, 'source'), 'new');
      if (kind === 'directory') {
        await fs.mkdir(path.join(cwd, 'target'));
        await fs.writeFile(path.join(cwd, 'target/content'), 'original');
      } else if (kind === 'symlink') {
        await fs.writeFile(path.join(cwd, 'original'), 'original');
        await fs.symlink('original', path.join(cwd, 'target'), 'file');
      } else {
        await fs.writeFile(path.join(cwd, 'target'), 'original');
      }
      vi.spyOn(fs, 'symlink').mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { code: 'EPERM' })
      );
      await expect(createLink('source', 'target', { cwd, force: true })).rejects.toThrow();
      const contentPath = kind === 'directory' ? 'target/content' : 'target';
      expect(await fs.readFile(path.join(cwd, contentPath), 'utf8')).toBe('original');
      if (kind === 'symlink') expect(await fs.readlink(path.join(cwd, 'target'))).toBe('original');
      expect((await fs.readdir(cwd)).filter((entry) => entry.startsWith('.symlink-'))).toEqual([]);
    }
  );

  it('restores the original destination when installing the staged link fails', async () => {
    await fs.writeFile(path.join(cwd, 'source'), 'new');
    await fs.writeFile(path.join(cwd, 'target'), 'original');
    const rename = fs.rename.bind(fs);
    let calls = 0;
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      calls += 1;
      if (calls === 2) throw Object.assign(new Error('Destination busy'), { code: 'EBUSY' });
      await rename(from, to);
    });
    await expect(createLink('source', 'target', { cwd, force: true })).rejects.toThrow(
      'Destination busy'
    );
    expect(await fs.readFile(path.join(cwd, 'target'), 'utf8')).toBe('original');
    expect((await fs.readdir(cwd)).filter((entry) => entry.startsWith('.symlink-'))).toEqual([]);
  });
});
