import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { canCreateSymlink } from './platform.js';
import { inspectPath } from './inspector.js';
import { getAgentsRequiringInstructionLink } from '../registry/agents.js';
import type { DoctorCheckItem, DoctorReport } from '../types/index.js';

/**
 * Runs a comprehensive health check on the environment and repository symlink configuration.
 */
export async function runDoctor(cwd?: string): Promise<DoctorReport> {
  const workingDir = cwd ? path.resolve(cwd) : process.cwd();
  const checks: DoctorCheckItem[] = [];

  // 1. Node.js Version Check
  const nodeVersion = process.version;
  const major = Number.parseInt(nodeVersion.replace(/^v/, '').split('.')[0] ?? '0', 10);
  if (major >= 22) {
    checks.push({
      title: 'Node.js Runtime',
      status: 'pass',
      details: `${nodeVersion} (compatible with >= 22 LTS requirements)`
    });
  } else {
    checks.push({
      title: 'Node.js Runtime',
      status: 'fail',
      details: `${nodeVersion} is outdated. Node.js >= 22 is required.`
    });
  }

  // 2. Operating System
  const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;
  checks.push({
    title: 'Operating System',
    status: 'pass',
    details: `${os.platform()} - ${osInfo}`
  });

  // 3. Symlink Creation Capability
  const symlinkAllowed = await canCreateSymlink(workingDir);
  if (symlinkAllowed) {
    checks.push({
      title: 'Symbolic Link Creation',
      status: 'pass',
      details: 'Supported and enabled for current user privileges.'
    });
  } else {
    checks.push({
      title: 'Symbolic Link Creation',
      status: 'fail',
      details:
        process.platform === 'win32'
          ? 'Failed. On Windows, please enable Developer Mode or grant SeCreateSymbolicLinkPrivilege.'
          : 'Failed. Insufficient filesystem permissions to create symlinks.'
    });
  }

  // 4. Git Repository Detection
  const isGitRepo = await checkGitRepository(workingDir);
  if (isGitRepo) {
    checks.push({
      title: 'Git Repository',
      status: 'pass',
      details: `Active Git repository found at ${workingDir}.`
    });
  } else {
    checks.push({
      title: 'Git Repository',
      status: 'warn',
      details: 'No .git directory detected in current workspace.'
    });
  }

  // 5. Canonical AGENTS.md Check
  const agentsMdPath = path.join(workingDir, 'AGENTS.md');
  const agentsMdInspection = await inspectPath(agentsMdPath);
  if (agentsMdInspection.exists) {
    checks.push({
      title: 'Canonical AGENTS.md',
      status: 'pass',
      details: 'Found canonical AGENTS.md at repository root.'
    });
  } else {
    checks.push({
      title: 'Canonical AGENTS.md',
      status: 'warn',
      details: 'Missing AGENTS.md at repository root. Consider creating one as the canonical source.'
    });
  }

  // 6. Agent Instructions and Symlink Health
  const compatibleAgents = getAgentsRequiringInstructionLink();
  for (const agent of compatibleAgents) {
    if (!agent.instructions) continue;
    const targetPath = path.join(workingDir, agent.instructions.target);
    const inspected = await inspectPath(targetPath);

    if (inspected.exists) {
      if (inspected.isSymlink) {
        if (inspected.status === 'valid') {
          checks.push({
            title: `Agent Target: ${agent.name}`,
            status: 'pass',
            details: `Valid symlink: ${agent.instructions.target} -> ${inspected.linkValue}`
          });
        } else {
          checks.push({
            title: `Agent Target: ${agent.name}`,
            status: 'fail',
            details: `Broken symlink: ${agent.instructions.target} points to non-existent "${inspected.linkValue}"`
          });
        }
      } else {
        checks.push({
          title: `Agent Target: ${agent.name}`,
          status: 'warn',
          details: `Target "${agent.instructions.target}" exists as a regular file. Consider replacing it with a symlink to AGENTS.md.`
        });
      }
    }
  }

  const allPassed = checks.every((c) => c.status !== 'fail');

  return {
    checks,
    allPassed
  };
}

async function checkGitRepository(dir: string): Promise<boolean> {
  let current = dir;
  while (true) {
    try {
      const gitDir = path.join(current, '.git');
      const stats = await fs.stat(gitDir);
      if (stats.isDirectory() || stats.isFile()) {
        return true;
      }
    } catch {
      // Continue search upwards
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return false;
}
