import { describe, it, expect } from 'vitest';
import {
  getAgent,
  getAllAgents,
  getAgentsRequiringInstructionLink,
  getInstructionTargetOptions,
  getSkillsTargetOptions,
  getRulesTargetOptions
} from '../../src/registry/agents.js';

describe('agent registry', () => {
  it('should include all required agents', () => {
    const agents = getAllAgents();
    const ids = agents.map((a) => a.id);
    expect(ids).toContain('claude');
    expect(ids).toContain('gemini');
    expect(ids).toContain('copilot');
    expect(ids).toContain('amazon-q');
    expect(ids).toContain('continue');
    expect(ids).toContain('cursor');
    expect(ids).toContain('windsurf');
    expect(ids).toContain('cline');
    expect(ids).toContain('zed');
    expect(ids).toContain('junie');
    expect(ids).toContain('codex');
  });

  it('should correctly identify agents natively supporting AGENTS.md', () => {
    const cursor = getAgent('cursor');
    expect(cursor?.instructions?.nativeAgentsMd).toBe(true);

    const windsurf = getAgent('windsurf');
    expect(windsurf?.instructions?.nativeAgentsMd).toBe(true);

    const claude = getAgent('claude');
    expect(claude?.instructions?.nativeAgentsMd).toBe(false);

    const gemini = getAgent('gemini');
    expect(gemini?.instructions?.nativeAgentsMd).toBe(false);
  });

  it('should filter agents requiring instruction links', () => {
    const required = getAgentsRequiringInstructionLink();
    const requiredIds = required.map((a) => a.id);
    expect(requiredIds).toContain('claude');
    expect(requiredIds).toContain('gemini');
    expect(requiredIds).toContain('copilot');
    expect(requiredIds).toContain('amazon-q');
    expect(requiredIds).toContain('continue');
    expect(requiredIds).not.toContain('cursor');
    expect(requiredIds).not.toContain('codex');
  });

  it('should provide prompt options for instructions, skills, and rules', () => {
    const instOpts = getInstructionTargetOptions();
    expect(instOpts.length).toBeGreaterThanOrEqual(5);

    const skillsOpts = getSkillsTargetOptions();
    expect(skillsOpts.length).toBeGreaterThanOrEqual(2);

    const rulesOpts = getRulesTargetOptions();
    expect(rulesOpts.length).toBeGreaterThanOrEqual(4);
  });
});
