import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as prompts from '@clack/prompts';
import { runInteractive } from '../../src/interactive/runner.js';

vi.mock('@clack/prompts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...original,
    text: vi.fn(),
    select: vi.fn(),
    multiselect: vi.fn(),
    confirm: vi.fn(),
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
    spinner: () => ({ start: vi.fn(), stop: vi.fn() })
  };
});

describe('interactive filesystem options', () => {
  let cwd: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-interactive-'));
    await fs.writeFile(path.join(cwd, 'AGENTS.md'), 'instructions');
    await fs.mkdir(path.join(cwd, '.agents/skills'), { recursive: true });
    await fs.mkdir(path.join(cwd, '.agent-config/rules'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(cwd, { recursive: true, force: true });
  });

  it.each([
    { action: 'instructions', source: 'AGENTS.md', target: 'CLAUDE.md' },
    { action: 'skills', source: '.agents/skills', target: '.claude/skills' },
    { action: 'rules', source: '.agent-config/rules', target: '.claude/rules' },
    { action: 'preset', source: 'AGENTS.md', target: 'CLAUDE.md' },
    { action: 'presets_multi', source: 'AGENTS.md', target: 'CLAUDE.md' }
  ])('honors dry-run in the $action flow', async ({ action, source, target }) => {
    vi.mocked(prompts.select).mockResolvedValueOnce(action);
    if (action === 'preset') vi.mocked(prompts.select).mockResolvedValueOnce('claude');
    vi.mocked(prompts.select).mockResolvedValueOnce('exit');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(
      action === 'presets_multi' ? ['claude'] : [target]
    );
    vi.mocked(prompts.text).mockResolvedValueOnce(source);

    await runInteractive({ cwd, dryRun: true });

    await expect(fs.lstat(path.join(cwd, target))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(prompts.log.info).toHaveBeenCalledWith(expect.stringContaining('Dry run:'));
  });

  it('honors cwd and absolute links throughout the menu', async () => {
    const workspace = path.join(cwd, 'workspace');
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(workspace, 'AGENTS.md'), 'workspace instructions');
    vi.mocked(prompts.select).mockResolvedValueOnce('instructions').mockResolvedValueOnce('exit');
    vi.mocked(prompts.text).mockResolvedValueOnce('AGENTS.md');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['CLAUDE.md']);

    await runInteractive({ cwd: workspace, absolute: true });

    expect(await fs.readFile(path.join(workspace, 'CLAUDE.md'), 'utf8')).toBe(
      'workspace instructions'
    );
    expect(path.isAbsolute(await fs.readlink(path.join(workspace, 'CLAUDE.md')))).toBe(true);
    await expect(fs.lstat(path.join(cwd, 'CLAUDE.md'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('preserves links during an interactive unlink preview', async () => {
    await fs.symlink('AGENTS.md', path.join(cwd, 'CLAUDE.md'), 'file');
    vi.mocked(prompts.select).mockResolvedValueOnce('unlink').mockResolvedValueOnce('exit');
    vi.mocked(prompts.text).mockResolvedValueOnce('CLAUDE.md');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true);

    await runInteractive({ cwd, dryRun: true });

    expect((await fs.lstat(path.join(cwd, 'CLAUDE.md'))).isSymbolicLink()).toBe(true);
  });
});
