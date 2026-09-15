import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('dist/cli.js');

describe('CLI direct command execution', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-cli-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should print version with --version flag', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  });

  it('should print help with --help flag', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, '--help']);
    expect(stdout).toContain('Usage: symlink');
    expect(stdout).toContain('--dry-run');
    expect(stdout).toContain('--force');
  });

  it('should create link in filesystem', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Instructions', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, source, target]);
    expect(stdout).toContain('Created symlink');

    const content = await fs.readFile(target, 'utf8');
    expect(content).toBe('# Agent Instructions');
  });

  it('should output JSON when --json flag is provided', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'GEMINI.md');
    await fs.writeFile(source, '# Agent Instructions', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, source, target, '--json']);
    const parsed = JSON.parse(stdout) as { success: boolean; status: string; linkValue: string };
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe('created');
    expect(parsed.linkValue).toBe('AGENTS.md');
  });

  it('should perform dry-run without writing to disk', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Instructions', 'utf8');

    const { stdout } = await execFileAsync('node', [cliPath, source, target, '--dry-run']);
    expect(stdout).toContain('[dry-run]');

    const exists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it('should fail when only one argument is provided', async () => {
    try {
      await execFileAsync('node', [cliPath, 'AGENTS.md']);
      expect.fail('Should have exited with error');
    } catch (error: unknown) {
      const execError = error as { code: number; stderr: string };
      expect(execError.code).toBe(1);
      expect(execError.stderr).toContain('Both source and target arguments are required');
    }
  });

  it('should fail when source does not exist without --allow-dangling', async () => {
    const source = path.join(tempDir, 'NON_EXISTENT.md');
    const target = path.join(tempDir, 'CLAUDE.md');

    try {
      await execFileAsync('node', [cliPath, source, target]);
      expect.fail('Should have failed on non-existent source');
    } catch (error: unknown) {
      const execError = error as { code: number; stderr: string };
      expect(execError.code).toBe(1);
      expect(execError.stderr).toContain('does not exist');
    }
  });
});
