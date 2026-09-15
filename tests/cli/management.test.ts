import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('dist/cli.js');

describe('CLI management commands: inspect, unlink, doctor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-mgmt-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should inspect valid symlink', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Instructions', 'utf8');
    await fs.symlink('AGENTS.md', target, 'file');

    const { stdout } = await execFileAsync('node', [cliPath, 'inspect', target]);
    expect(stdout).toContain('symbolic link');
    expect(stdout).toContain('Points to:');
    expect(stdout).toContain('AGENTS.md');
    expect(stdout).toContain('valid');
  });

  it('should inspect broken symlink', async () => {
    const target = path.join(tempDir, 'BROKEN.md');
    await fs.symlink('NON_EXISTENT.md', target, 'file');

    try {
      await execFileAsync('node', [cliPath, 'inspect', target]);
      expect.fail('Should exit with 1 on broken link');
    } catch (error: unknown) {
      const execError = error as { code: number; stdout: string };
      expect(execError.stdout).toContain('broken');
    }
  });

  it('should output inspect in json', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Agent Instructions', 'utf8');
    await fs.symlink('AGENTS.md', target, 'file');

    const { stdout } = await execFileAsync('node', [cliPath, 'inspect', target, '--json']);
    const parsed = JSON.parse(stdout) as { isSymlink: boolean; status: string; linkValue: string };
    expect(parsed.isSymlink).toBe(true);
    expect(parsed.status).toBe('valid');
    expect(parsed.linkValue).toBe('AGENTS.md');
  });

  it('should safely unlink symlink preserving source', async () => {
    const source = path.join(tempDir, 'AGENTS.md');
    const target = path.join(tempDir, 'CLAUDE.md');
    await fs.writeFile(source, '# Master Rules', 'utf8');
    await fs.symlink('AGENTS.md', target, 'file');

    const { stdout } = await execFileAsync('node', [cliPath, 'unlink', target]);
    expect(stdout).toContain('Successfully unlinked');

    const targetExists = await fs.access(target).then(() => true).catch(() => false);
    expect(targetExists).toBe(false);

    const sourceContent = await fs.readFile(source, 'utf8');
    expect(sourceContent).toBe('# Master Rules');
  });

  it('should refuse to unlink regular file', async () => {
    const regular = path.join(tempDir, 'REGULAR.md');
    await fs.writeFile(regular, 'not a link', 'utf8');

    try {
      await execFileAsync('node', [cliPath, 'unlink', regular]);
      expect.fail('Should fail to unlink regular file');
    } catch (error: unknown) {
      const execError = error as { code: number; stderr: string };
      expect(execError.code).toBe(1);
      expect(execError.stderr).toContain('not a symbolic link');
    }
  });

  it('should run doctor and report environment checks', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, 'doctor']);
    expect(stdout).toContain('Symlink System & Environment Doctor');
    expect(stdout).toContain('Node.js Runtime');
    expect(stdout).toContain('Symbolic Link Creation');
  });

  it('should output doctor results formatted as json', async () => {
    const { stdout } = await execFileAsync('node', [cliPath, 'doctor', '--json']);
    const parsed = JSON.parse(stdout) as { checks: unknown[]; allPassed: boolean };
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.checks.length).toBeGreaterThan(0);
    expect(typeof parsed.allPassed).toBe('boolean');
  });
});
