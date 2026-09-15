import type { AgentPreset } from '../types/index.js';

/**
 * Registry of known AI coding agents, their instruction targets, skills, rules, and native support status.
 */
export const AGENT_REGISTRY: readonly AgentPreset[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    instructions: {
      target: 'CLAUDE.md',
      nativeAgentsMd: false
    },
    skills: {
      target: '.claude/skills',
      nativeSkillsDir: false
    },
    rules: {
      target: '.claude/rules'
    }
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    instructions: {
      target: 'GEMINI.md',
      nativeAgentsMd: false
    }
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    instructions: {
      target: '.github/copilot-instructions.md',
      nativeAgentsMd: false
    },
    skills: {
      target: '.github/skills',
      nativeSkillsDir: false
    },
    rules: {
      target: '.github/instructions'
    }
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q Developer',
    instructions: {
      target: '.amazonq/rules/AGENTS.md',
      nativeAgentsMd: false
    },
    rules: {
      target: '.amazonq/rules'
    }
  },
  {
    id: 'continue',
    name: 'Continue',
    instructions: {
      target: '.continue/rules/AGENTS.md',
      nativeAgentsMd: false
    },
    rules: {
      target: '.continue/rules'
    }
  },
  {
    id: 'cursor',
    name: 'Cursor',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    },
    skills: {
      target: '.cursor/skills',
      nativeSkillsDir: true
    },
    rules: {
      target: '.cursor/rules'
    }
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    },
    skills: {
      target: '.windsurf/skills',
      nativeSkillsDir: false
    },
    rules: {
      target: '.windsurf/rules'
    }
  },
  {
    id: 'cline',
    name: 'Cline',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    },
    rules: {
      target: '.clinerules'
    }
  },
  {
    id: 'zed',
    name: 'Zed Agent',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    }
  },
  {
    id: 'junie',
    name: 'JetBrains Junie',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    },
    skills: {
      target: '.junie/skills',
      nativeSkillsDir: false
    },
    rules: {
      target: '.junie/rules'
    }
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    instructions: {
      target: 'AGENTS.md',
      nativeAgentsMd: true
    }
  }
];

export function getAgent(id: string): AgentPreset | undefined {
  const normalized = id.toLowerCase().trim();
  return AGENT_REGISTRY.find(
    (agent) => agent.id.toLowerCase() === normalized || agent.name.toLowerCase() === normalized
  );
}

export function getAllAgents(): readonly AgentPreset[] {
  return AGENT_REGISTRY;
}

export function getAgentsRequiringInstructionLink(): readonly AgentPreset[] {
  return AGENT_REGISTRY.filter(
    (agent) => agent.instructions && !agent.instructions.nativeAgentsMd
  );
}

export function getInstructionTargetOptions(): readonly { label: string; value: string; hint?: string }[] {
  return getAgentsRequiringInstructionLink()
    .filter((agent) => agent.instructions !== undefined)
    .map((agent) => ({
      label: `${agent.name.padEnd(20)} ${agent.instructions!.target}`,
      value: agent.instructions!.target,
      hint: agent.name
    }));
}

export function getSkillsTargetOptions(): readonly { label: string; value: string; hint?: string }[] {
  return AGENT_REGISTRY.filter((agent) => agent.skills !== undefined).map((agent) => ({
    label: `${agent.name.padEnd(20)} ${agent.skills!.target}`,
    value: agent.skills!.target,
    hint: agent.name
  }));
}

export function getRulesTargetOptions(): readonly { label: string; value: string; hint?: string }[] {
  return AGENT_REGISTRY.filter((agent) => agent.rules !== undefined).map((agent) => ({
    label: `${agent.name.padEnd(20)} ${agent.rules!.target}`,
    value: agent.rules!.target,
    hint: agent.name
  }));
}
