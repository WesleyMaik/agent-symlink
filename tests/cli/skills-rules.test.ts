import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('dist/cli.js');

describe('CLI skills and rules commands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-skills-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('should link skills to claude', async () => {
    const skillsDir = path.join(tempDir, '.agents', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'test.md'), 'test', 'utf8');

    const { stdout } = await execFileAsync('node', [
      cliPath,
      'skills',
      'claude',
      '--cwd',
      tempDir
    ]);
    expect(stdout).toContain('.claude/skills');

    const claudeSkillFile = path.join(tempDir, '.claude', 'skills', 'test.md');
    const content = await fs.readFile(claudeSkillFile, 'utf8');
    expect(content).toBe('test');
  });

  it('should skip skills for cursor when native', async () => {
    const { stdout } = await execFileAsync('node', [
      cliPath,
      'skills',
      'cursor',
      '--cwd',
      tempDir
    ]);
    expect(stdout).toContain('natively supports .agents/skills');
  });

  it('should link rules to claude and cursor', async () => {
    const rulesDir = path.join(tempDir, '.agent-config', 'rules');
    await fs.mkdir(rulesDir, { recursive: true });
    await fs.writeFile(path.join(rulesDir, 'rule.md'), 'rule content', 'utf8');

    const { stdout: claudeOut } = await execFileAsync('node', [
      cliPath,
      'rules',
      'claude',
      '--cwd',
      tempDir
    ]);
    expect(claudeOut).toContain('.claude/rules');

    const { stdout: cursorOut } = await execFileAsync('node', [
      cliPath,
      'rules',
      'cursor',
      '--cwd',
      tempDir
    ]);
    expect(cursorOut).toContain('.cursor/rules');

    const cursorRule = path.join(tempDir, '.cursor', 'rules', 'rule.md');
    const content = await fs.readFile(cursorRule, 'utf8');
    expect(content).toBe('rule content');
  });

  it('should support direct directory symlink between custom directories', async () => {
    const sourceDir = path.join(tempDir, 'my-skills');
    const targetDir = path.join(tempDir, 'agent-skills');
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'skill.txt'), 'custom skill', 'utf8');

    const { stdout } = await execFileAsync('node', [
      cliPath,
      sourceDir,
      targetDir
    ]);
    expect(stdout).toContain('Created symlink');

    const targetFile = path.join(targetDir, 'skill.txt');
    const content = await fs.readFile(targetFile, 'utf8');
    expect(content).toBe('custom skill');
  });
});
