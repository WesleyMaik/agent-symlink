import pc from 'picocolors';
import { AGENT_REGISTRY, getAgent } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import type { LinkOptions, LinkResult } from '../types/index.js';
import { SymlinkError } from '../utils/errors.js';

export interface CliSkillsOptions extends LinkOptions {
  readonly source?: string;
  readonly json?: boolean;
}

/**
 * Handles the skills command to link canonical skills directory to target tools.
 */
export async function handleSkillsCommand(
  targetOrAgent: string,
  options: CliSkillsOptions
): Promise<number> {
  const canonicalSource = options.source ?? '.agents/skills';
  const targetLower = targetOrAgent.toLowerCase().trim();

  if (targetLower === 'all') {
    return handleAllSkills(canonicalSource, options);
  }

  const agent = getAgent(targetLower);
  let resolvedTarget = targetOrAgent;

  if (agent) {
    if (agent.skills?.nativeSkillsDir) {
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              agent: agent.id,
              skipped: true,
              reason: `${agent.name} natively supports .agents/skills.`
            },
            null,
            2
          )
        );
      } else {
        console.log(`${pc.cyan('ℹ')} ${agent.name} natively supports .agents/skills. No symlink needed.`);
      }
      return 0;
    }

    if (!agent.skills) {
      const errorMsg = `No skills directory configured for ${agent.name}.`;
      if (options.json) {
        console.error(JSON.stringify({ success: false, error: errorMsg }, null, 2));
      } else {
        console.error(pc.red(`Error: ${errorMsg}`));
      }
      return 1;
    }

    resolvedTarget = agent.skills.target;
  }

  try {
    const result = await createLink(canonicalSource, resolvedTarget, options);

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return 0;
    }

    printSkillResult(result, canonicalSource, resolvedTarget);
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

async function handleAllSkills(canonicalSource: string, options: CliSkillsOptions): Promise<number> {
  const agentsWithSkills = AGENT_REGISTRY.filter(
    (a) => a.skills && !a.skills.nativeSkillsDir
  );

  let hasErrors = false;
  const results: LinkResult[] = [];

  if (!options.json) {
    console.log(pc.bold(`Linking canonical skills (${canonicalSource}) to agents...\n`));
  }

  for (const agent of agentsWithSkills) {
    const target = agent.skills!.target;
    try {
      const result = await createLink(canonicalSource, target, options);
      results.push(result);
      if (!options.json) {
        if (result.status === 'already_linked') {
          console.log(`${pc.blue('ℹ')} ${pc.bold(agent.name.padEnd(20))} ${target} already points to ${result.linkValue}`);
        } else if (result.status === 'created') {
          console.log(`${pc.green('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue}`);
        } else if (result.status === 'replaced') {
          console.log(`${pc.yellow('✓')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue} (replaced)`);
        } else if (result.status === 'would_create' || result.status === 'would_replace') {
          console.log(`${pc.magenta('[dry-run]')} ${pc.bold(agent.name.padEnd(20))} ${target} -> ${result.linkValue}`);
        }
      }
    } catch (error: unknown) {
      hasErrors = true;
      const message = error instanceof Error ? error.message : String(error);
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

function printSkillResult(result: LinkResult, source: string, target: string): void {
  if (result.status === 'already_linked') {
    console.log(`${pc.blue('ℹ')} Skills directory ${pc.bold(target)} already points to ${pc.cyan(result.linkValue)}`);
  } else if (result.status === 'created') {
    console.log(`${pc.green('✓')} Linked skills: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`);
  } else if (result.status === 'replaced') {
    console.log(`${pc.yellow('✓')} Replaced skills link: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`);
  } else if (result.status === 'would_create' || result.status === 'would_replace') {
    console.log(`${pc.magenta('[dry-run]')} Would link skills: ${pc.bold(target)} -> ${pc.cyan(result.linkValue)} ${pc.dim(`(from ${source})`)}`);
  }
}
