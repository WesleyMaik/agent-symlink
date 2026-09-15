import pc from 'picocolors';
import { getAgent, getAgentsRequiringInstructionLink, getAllAgents } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import type { AgentPreset, LinkOptions, LinkResult } from '../types/index.js';
import { SymlinkError } from '../utils/errors.js';

export interface CliPresetOptions extends LinkOptions {
  readonly json?: boolean;
}

export interface PresetResult {
  readonly agentId: string;
  readonly agentName: string;
  readonly skipped?: boolean;
  readonly reason?: string;
  readonly linkResult?: LinkResult;
  readonly error?: string;
}

/**
 * Handles the preset CLI command for a specific agent or "all".
 */
export async function handlePresetCommand(
  agentNameOrAll: string,
  options: CliPresetOptions
): Promise<number> {
  const targetName = agentNameOrAll.toLowerCase().trim();

  if (targetName === 'all') {
    return handleAllPresets(options);
  }

  const agent = getAgent(targetName);
  if (!agent) {
    const validAgents = getAllAgents()
      .map((a) => a.id)
      .join(', ');
    const errorMsg = `Unknown agent preset: "${agentNameOrAll}". Available presets: ${validAgents}, all`;

    if (options.json) {
      console.error(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(pc.red(`Error: ${errorMsg}`));
    }
    return 1;
  }

  return handleSinglePreset(agent, options);
}

async function handleSinglePreset(agent: AgentPreset, options: CliPresetOptions): Promise<number> {
  if (agent.instructions?.nativeAgentsMd) {
    const reason = `${agent.name} natively supports root AGENTS.md. No symlink needed.`;
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            preset: agent.id,
            skipped: true,
            reason
          },
          null,
          2
        )
      );
    } else {
      console.log(`${pc.cyan('ℹ')} ${agent.name} natively supports AGENTS.md. No symlink required.`);
    }
    return 0;
  }

  if (!agent.instructions) {
    const reason = `No instruction target configured for ${agent.name}.`;
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            preset: agent.id,
            skipped: true,
            reason
          },
          null,
          2
        )
      );
    } else {
      console.log(pc.yellow(`No instruction target configured for ${agent.name}.`));
    }
    return 0;
  }

  const source = 'AGENTS.md';
  const target = agent.instructions.target;

  try {
    const linkResult = await createLink(source, target, options);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            preset: agent.id,
            agentName: agent.name,
            ...linkResult
          },
          null,
          2
        )
      );
      return 0;
    }

    if (linkResult.status === 'already_linked') {
      console.log(`${pc.blue('ℹ')} ${agent.name}: ${pc.bold(target)} already points to ${pc.cyan(linkResult.linkValue)}`);
    } else if (linkResult.status === 'created') {
      console.log(`${pc.green('✓')} Applied preset for ${pc.bold(agent.name)}: ${target} -> ${pc.cyan(linkResult.linkValue)}`);
    } else if (linkResult.status === 'replaced') {
      console.log(`${pc.yellow('✓')} Replaced for ${pc.bold(agent.name)}: ${target} -> ${pc.cyan(linkResult.linkValue)}`);
    } else if (linkResult.status === 'would_create' || linkResult.status === 'would_replace') {
      console.log(`${pc.magenta('[dry-run]')} Would link for ${pc.bold(agent.name)}: ${target} -> ${pc.cyan(linkResult.linkValue)}`);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      console.error(
        JSON.stringify(
          {
            success: false,
            preset: agent.id,
            error: message
          },
          null,
          2
        )
      );
    } else if (error instanceof SymlinkError) {
      console.error(pc.red(`Error applying preset for ${agent.name}: ${error.message}`));
    } else {
      console.error(pc.red(`Unexpected error for ${agent.name}: ${message}`));
    }
    return 1;
  }
}

async function handleAllPresets(options: CliPresetOptions): Promise<number> {
  const agentsToLink = getAgentsRequiringInstructionLink();
  const results: PresetResult[] = [];
  let hasErrors = false;

  if (!options.json) {
    console.log(pc.bold('Applying compatible agent presets for AGENTS.md...\n'));
  }

  for (const agent of agentsToLink) {
    if (!agent.instructions) continue;

    const source = 'AGENTS.md';
    const target = agent.instructions.target;

    try {
      const linkResult = await createLink(source, target, options);
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        linkResult
      });

      if (!options.json) {
        if (linkResult.status === 'already_linked') {
          console.log(`${pc.blue('ℹ')} ${pc.bold(agent.name.padEnd(20))} ${target} already points to ${linkResult.linkValue}`);
        } else if (linkResult.status === 'created') {
          console.log(`${pc.green('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${linkResult.linkValue}`);
        } else if (linkResult.status === 'replaced') {
          console.log(`${pc.yellow('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${linkResult.linkValue} (replaced)`);
        } else if (linkResult.status === 'would_create' || linkResult.status === 'would_replace') {
          console.log(`${pc.magenta('[dry-run]')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${linkResult.linkValue}`);
        }
      }
    } catch (error: unknown) {
      hasErrors = true;
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        error: message
      });
      if (!options.json) {
        console.error(`${pc.red('✗')} ${pc.bold(agent.name.padEnd(20))} Error: ${message}`);
      }
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: !hasErrors,
          total: results.length,
          results
        },
        null,
        2
      )
    );
  }

  return hasErrors ? 1 : 0;
}
