import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('dist/cli.js');

describe('CLI preset command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-preset-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should apply claude preset', async () => {
    const agentsMd = path.join(tempDir, 'AGENTS.md');
    await fs.writeFile(agentsMd, '# Rules', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, 'preset', 'claude', '--cwd', tempDir]);
    expect(stdout).toContain('CLAUDE.md');

    const claudeMd = path.join(tempDir, 'CLAUDE.md');
    const content = await fs.readFile(claudeMd, 'utf8');
    expect(content).toBe('# Rules');
  });

  it('should skip redundant link for native cursor support', async () => {
    const agentsMd = path.join(tempDir, 'AGENTS.md');
    await fs.writeFile(agentsMd, '# Rules', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, 'preset', 'cursor', '--cwd', tempDir]);
    expect(stdout).toContain('natively supports AGENTS.md');

    const cursorTarget = path.join(tempDir, '.cursor', 'AGENTS.md');
    const exists = await fs.access(cursorTarget).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it('should apply all compatible presets with preset all', async () => {
    const agentsMd = path.join(tempDir, 'AGENTS.md');
    await fs.writeFile(agentsMd, '# Shared Rules', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, 'preset', 'all', '--cwd', tempDir]);
    expect(stdout).toContain('CLAUDE.md');
    expect(stdout).toContain('GEMINI.md');
    expect(stdout).toContain('.github/copilot-instructions.md');

    const claudeContent = await fs.readFile(path.join(tempDir, 'CLAUDE.md'), 'utf8');
    expect(claudeContent).toBe('# Shared Rules');

    const geminiContent = await fs.readFile(path.join(tempDir, 'GEMINI.md'), 'utf8');
    expect(geminiContent).toBe('# Shared Rules');

    const copilotContent = await fs.readFile(
      path.join(tempDir, '.github', 'copilot-instructions.md'),
      'utf8'
    );
    expect(copilotContent).toBe('# Shared Rules');
  });

  it('should reject unknown preset name', async () => {
    try {
      await execFileAsync('node', [cliPath, 'preset', 'unknown-tool']);
      expect.fail('Should fail on unknown preset');
    } catch (error: unknown) {
      const execError = error as { code: number; stderr: string };
      expect(execError.code).toBe(1);
      expect(execError.stderr).toContain('Unknown agent preset');
    }
  });

  it('should output JSON when --json flag is passed to preset', async () => {
    const agentsMd = path.join(tempDir, 'AGENTS.md');
    await fs.writeFile(agentsMd, '# Rules', 'utf8');

    const { stdout } = await execFileAsync('node', [
      cliPath,
      'preset',
      'claude',
      '--cwd',
      tempDir,
      '--json'
    ]);

    const parsed = JSON.parse(stdout) as { success: boolean; preset: string };
    expect(parsed.success).toBe(true);
    expect(parsed.preset).toBe('claude');
  });
});
