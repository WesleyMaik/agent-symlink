import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAllAgents, getAgent } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import { TargetExistsError } from '../utils/errors.js';

/**
 * Interactive flow for applying a single agent preset.
 */
export async function runSinglePresetFlow(): Promise<void> {
  const agents = getAllAgents();
  const options = agents.map((agent) => ({
    label: agent.name,
    value: agent.id,
    hint: agent.instructions?.nativeAgentsMd
      ? 'Native AGENTS.md support'
      : agent.instructions?.target
  }));

  const selectedId = await p.select({
    message: 'Select agent preset to apply:',
    options
  });

  if (p.isCancel(selectedId)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const agent = getAgent(selectedId as string);
  if (!agent) return;

  await applyAgentPresetInteractive(agent);
}

/**
 * Interactive flow for applying multiple agent presets.
 */
export async function runMultiplePresetsFlow(): Promise<void> {
  const agents = getAllAgents();
  const options = agents.map((agent) => ({
    label: agent.name,
    value: agent.id,
    hint: agent.instructions?.nativeAgentsMd
      ? 'Native AGENTS.md support'
      : agent.instructions?.target
  }));

  const selectedIds = await p.multiselect({
    message: 'Select agent presets to apply:',
    options,
    required: true
  });

  if (p.isCancel(selectedIds)) {
    p.cancel('Operation cancelled.');
    return;
  }

  for (const id of selectedIds as string[]) {
    const agent = getAgent(id);
    if (agent) {
      await applyAgentPresetInteractive(agent);
    }
  }
}

async function applyAgentPresetInteractive(agent: ReturnType<typeof getAgent>): Promise<void> {
  if (!agent) return;

  if (agent.instructions?.nativeAgentsMd) {
    p.log.info(
      `${pc.cyan(agent.name)} natively supports ${pc.bold('AGENTS.md')}. No instruction symlink needed.`
    );
    return;
  }

  if (!agent.instructions) {
    p.log.info(`No instruction configuration defined for ${pc.cyan(agent.name)}.`);
    return;
  }

  const target = agent.instructions.target;
  const source = 'AGENTS.md';

  try {
    const result = await createLink(source, target);
    if (result.status === 'already_linked') {
      p.log.info(`${pc.blue('ℹ')} ${target} already points to ${result.linkValue}`);
    } else {
      p.log.success(`${pc.green('✓')} Linked ${agent.name}: ${target} -> ${result.linkValue}`);
    }
  } catch (error: unknown) {
    if (error instanceof TargetExistsError) {
      const overwrite = await p.confirm({
        message: `Target "${target}" for ${agent.name} already exists. Overwrite?`,
        initialValue: false
      });
      if (p.isCancel(overwrite) || !overwrite) {
        p.log.warn(`Skipped ${target}`);
        return;
      }
      const result = await createLink(source, target, { force: true });
      p.log.success(`${pc.yellow('✓')} Replaced: ${target} -> ${result.linkValue}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(`Failed to apply preset for ${agent.name}: ${message}`);
    }
  }
}
