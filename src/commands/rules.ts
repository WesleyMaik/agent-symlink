import pc from 'picocolors';
import { AGENT_REGISTRY, getAgent } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import type { AgentLinkResult, LinkOptions, LinkResult } from '../types/index.js';
import { SymlinkError } from '../utils/errors.js';

export interface CliRulesOptions extends LinkOptions {
  readonly source?: string;
  readonly json?: boolean;
}

/**
 * Handles the rules command to link canonical rules directory to target tools.
 */
export async function handleRulesCommand(
  targetOrAgent: string,
  options: CliRulesOptions
): Promise<number> {
  const canonicalSource = options.source ?? '.agent-config/rules';
  const targetLower = targetOrAgent.toLowerCase().trim();

  if (targetLower === 'all') {
    return handleAllRules(canonicalSource, options);
  }

  const agent = getAgent(targetLower);
  let resolvedTarget = targetOrAgent;

  if (agent) {
    if (!agent.rules) {
      const errorMsg = `No rules directory configured for ${agent.name}.`;
      if (options.json) {
        console.error(JSON.stringify({ success: false, error: errorMsg }, null, 2));
      } else {
        console.error(pc.red(`Error: ${errorMsg}`));
      }
      return 1;
    }

    resolvedTarget = agent.rules.target;
  }

  try {
    const result = await createLink(canonicalSource, resolvedTarget, options);

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return 0;
    }

    printRulesResult(result, canonicalSource, resolvedTarget);
    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      console.error(JSON.stringify({ success: false, error: message }, null, 2));
    } else if (error instanceof SymlinkError) {
      console.error(pc.red(`Error: ${error.message}`));
    } else {
      console.error(pc.red(`Unexpected error: ${message}`));
    }
    return 1;
  }
}

async function handleAllRules(canonicalSource: string, options: CliRulesOptions): Promise<number> {
  const agentsWithRules = AGENT_REGISTRY.filter((a) => a.rules !== undefined);

  let hasErrors = false;
  const results: AgentLinkResult[] = [];

  if (!options.json) {
    console.log(pc.bold(`Linking canonical rules (${canonicalSource}) to agents...\n`));
  }

  for (const agent of agentsWithRules) {
    const target = agent.rules!.target;
    try {
      const result = await createLink(canonicalSource, target, options);
      results.push({ agentId: agent.id, agentName: agent.name, ...result });
      if (!options.json) {
        if (result.status === 'already_linked') {
          console.log(
            `${pc.blue('ℹ')} ${pc.bold(agent.name.padEnd(20))} ${target} already points to ${result.linkValue}`
          );
        } else if (result.status === 'created') {
          console.log(
            `${pc.green('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue}`
          );
        } else if (result.status === 'replaced') {
          console.log(
            `${pc.yellow('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue} (replaced)`
          );
        } else if (result.status === 'would_create' || result.status === 'would_replace') {
          console.log(
            `${pc.magenta('[dry-run]')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue}`
          );
        }
      }
    } catch (error: unknown) {
      hasErrors = true;
      const message = error instanceof Error ? error.message : String(error);
      results.push({ agentId: agent.id, agentName: agent.name, target, error: message });
      if (!options.json) {
        console.error(`${pc.red('✗')} ${pc.bold(agent.name.padEnd(20))} Error: ${message}`);
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ success: !hasErrors, total: results.length, results }, null, 2));
  }

  return hasErrors ? 1 : 0;
}

function printRulesResult(result: LinkResult, source: string, target: string): void {
  if (result.status === 'already_linked') {
    console.log(
      `${pc.blue('ℹ')} Rules directory ${pc.bold(target)} already points to ${pc.cyan(result.linkValue)}`
    );
  } else if (result.status === 'created') {
    console.log(
      `${pc.green('✓')} Linked rules: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`
    );
  } else if (result.status === 'replaced') {
    console.log(
      `${pc.yellow('✓')} Replaced rules link: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`
    );
  } else if (result.status === 'would_create' || result.status === 'would_replace') {
    console.log(
      `${pc.magenta('[dry-run]')} Would link rules: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`
    );
  }
}
