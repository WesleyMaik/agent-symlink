import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getInstructionTargetOptions } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import { TargetExistsError } from '../utils/errors.js';

/**
 * Interactive flow for linking instruction files.
 */
export async function runInstructionsFlow(): Promise<void> {
  const sourceInput = await p.text({
    message: 'Canonical instruction file:',
    placeholder: 'AGENTS.md',
    defaultValue: 'AGENTS.md',
    validate: (value) => {
      if (!value.trim()) return 'Please enter a valid file path.';
      return undefined;
    }
  });

  if (p.isCancel(sourceInput)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const defaultOptions = getInstructionTargetOptions();
  const targetChoices = [
    ...defaultOptions,
    { label: 'Custom path...', value: '__custom__', hint: 'Specify manually' }
  ];

  const selectedTargets = await p.multiselect({
    message: 'Select targets to link:',
    options: targetChoices,
    required: true
  });

  if (p.isCancel(selectedTargets)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const targets: string[] = [];
  for (const choice of selectedTargets as string[]) {
    if (choice === '__custom__') {
      const customPath = await p.text({
        message: 'Enter custom target path:',
        placeholder: '.custom/instructions.md',
        validate: (val) => (!val.trim() ? 'Path cannot be empty.' : undefined)
      });
      if (p.isCancel(customPath)) {
        p.cancel('Operation cancelled.');
        return;
      }
      targets.push(customPath.trim());
    } else {
      targets.push(choice);
    }
  }

  const s = p.spinner();
  s.start('Creating symlinks...');

  for (const target of targets) {
    try {
      const result = await createLink(sourceInput.trim(), target);
      if (result.status === 'already_linked') {
        p.log.info(`${pc.blue('ℹ')} ${target} already points to ${result.linkValue}`);
      } else {
        p.log.success(`${pc.green('✓')} ${target} -> ${result.linkValue}`);
      }
    } catch (error: unknown) {
      if (error instanceof TargetExistsError) {
        s.stop();
        const overwrite = await p.confirm({
          message: `Target "${target}" already exists. Overwrite it?`,
          initialValue: false
        });
        if (p.isCancel(overwrite) || !overwrite) {
          p.log.warn(`Skipped ${target}`);
          s.start('Continuing...');
          continue;
        }
        s.start(`Overwriting ${target}...`);
        const result = await createLink(sourceInput.trim(), target, { force: true });
        p.log.success(`${pc.yellow('✓')} Replaced: ${target} -> ${result.linkValue}`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        p.log.error(`Failed to link ${target}: ${message}`);
      }
    }
  }

  s.stop('Instruction symlinks processed.');
}
