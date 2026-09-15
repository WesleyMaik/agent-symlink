import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getRulesTargetOptions } from '../registry/agents.js';
import { createLink } from '../core/linker.js';
import { TargetExistsError } from '../utils/errors.js';
import type { LinkOptions } from '../types/index.js';

/**
 * Interactive flow for linking rules and configuration directories.
 */
export async function runRulesFlow(options: LinkOptions = {}): Promise<void> {
  const sourceInput = await p.text({
    message: 'Canonical rules / configuration directory:',
    placeholder: '.agent-config/rules',
    defaultValue: '.agent-config/rules',
    validate: (value) => {
      if (!value.trim()) return 'Please enter a valid directory path.';
      return undefined;
    }
  });

  if (p.isCancel(sourceInput)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const defaultOptions = getRulesTargetOptions();
  const targetChoices = [
    ...defaultOptions,
    { label: 'Custom directory...', value: '__custom__', hint: 'Specify manually' }
  ];

  const selectedTargets = await p.multiselect({
    message: 'Select target rules directories to link:',
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
        message: 'Enter custom target directory path:',
        placeholder: '.custom/rules',
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
  s.start('Creating rules directory symlinks...');

  for (const target of targets) {
    try {
      const result = await createLink(sourceInput.trim(), target, options);
      if (result.status === 'would_create' || result.status === 'would_replace') {
        p.log.info(result.message ?? 'Dry run: Link preview completed.');
      } else if (result.status === 'already_linked') {
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
        const result = await createLink(sourceInput.trim(), target, { ...options, force: true });
        if (options.dryRun) {
          p.log.info(result.message ?? 'Dry run: Replacement preview completed.');
        } else {
          p.log.success(`${pc.yellow('✓')} Replaced: ${target} -> ${result.linkValue}`);
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        p.log.error(`Failed to link ${target}: ${message}`);
      }
    }
  }

  s.stop('Rules directory symlinks processed.');
}
