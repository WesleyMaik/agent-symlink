import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AGENT_REGISTRY } from '../../src/registry/agents.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('dist/cli.js');

describe('CLI output contracts', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-contracts-'));
  });

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true });
  });

  async function run(...args: string[]) {
    try {
      const result = await execFileAsync(process.execPath, [cliPath, ...args, '--cwd', cwd]);
      return { ...result, code: 0 };
    } catch (error: unknown) {
      return error as { stdout: string; stderr: string; code: number };
    }
  }

  it.each([{ options: [] }, { options: ['--json'] }])(
    'reports broken links as failure with options $options',
    async ({ options }) => {
      await fs.symlink('missing', path.join(cwd, 'broken'), 'file');
      const result = await run('inspect', 'broken', ...options);
      expect(result.code).toBe(1);
      if (options.includes('--json')) {
        expect(JSON.parse(result.stdout)).toMatchObject({ success: false, status: 'broken' });
      }
    }
  );

  it.each([[], ['--json'], ['--dry-run'], ['--dry-run', '--json']].map((options) => ({ options })))(
    'reports missing unlink targets consistently with options $options',
    async ({ options }) => {
      const result = await run('unlink', 'missing', ...options);
      expect(result.code).toBe(1);
      if (options.includes('--json')) {
        expect(JSON.parse(result.stdout)).toMatchObject({ success: false, removed: false });
      } else {
        expect(result.stdout).toContain('does not exist');
      }
    }
  );

  it('reports a successful unlink preview while preserving the link', async () => {
    await fs.symlink('missing', path.join(cwd, 'target'), 'file');
    const result = await run('unlink', 'target', '--dry-run', '--json');
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      success: true,
      removed: false,
      wasLink: true
    });
    expect((await fs.lstat(path.join(cwd, 'target'))).isSymbolicLink()).toBe(true);
  });

  it.each(['skills', 'rules'] as const)(
    'includes every failed agent in %s all JSON results',
    async (command) => {
      const result = await run(command, 'all', '--json');
      expect(result.code).toBe(1);
      const expectedAgents = AGENT_REGISTRY.filter((agent) =>
        command === 'rules'
          ? agent.rules !== undefined
          : agent.skills !== undefined && !agent.skills.nativeSkillsDir
      );
      const output = JSON.parse(result.stdout) as {
        success: boolean;
        total: number;
        results: { agentId: string; error: string }[];
      };
      expect(output.success).toBe(false);
      expect(output.total).toBe(expectedAgents.length);
      expect(output.results.map((result) => result.agentId)).toEqual(
        expectedAgents.map((agent) => agent.id)
      );
      expect(output.results.every((result) => result.error.includes('does not exist'))).toBe(true);
    }
  );

  it.each(['cursor', 'all'])(
    'honors custom skills sources for native agents with target %s',
    async (target) => {
      await fs.mkdir(path.join(cwd, 'custom-skills'));
      await fs.writeFile(path.join(cwd, 'custom-skills/skill.md'), 'custom');
      const result = await run('skills', target, '--source', 'custom-skills', '--json');
      expect(result.code).toBe(0);
      expect(await fs.readFile(path.join(cwd, '.cursor/skills/skill.md'), 'utf8')).toBe('custom');
    }
  );
});
