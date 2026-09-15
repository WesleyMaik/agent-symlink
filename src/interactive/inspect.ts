import * as p from '@clack/prompts';
import pc from 'picocolors';
import { inspectPath } from '../core/inspector.js';

/**
 * Interactive flow for inspecting a symlink path.
 */
export async function runInspectFlow(): Promise<void> {
  const targetInput = await p.text({
    message: 'Path to inspect:',
    placeholder: 'CLAUDE.md',
    validate: (val) => (!val.trim() ? 'Path cannot be empty.' : undefined)
  });

  if (p.isCancel(targetInput)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const result = await inspectPath(targetInput.trim());

  if (!result.exists) {
    p.log.warn(`Path "${targetInput}" does not exist.`);
    return;
  }

  if (!result.isSymlink) {
    p.log.info(`Path "${targetInput}" is a regular ${result.status === 'regular_dir' ? 'directory' : 'file'}, not a symlink.`);
    return;
  }

  const lines = [
    `${pc.bold('Path:')} ${result.path}`,
    `${pc.bold('Type:')} symbolic link (${result.linkType})`,
    `${pc.bold('Points to:')} ${result.linkValue}`,
    `${pc.bold('Resolved source:')} ${result.resolvedSource}`,
    `${pc.bold('Status:')} ${result.status === 'valid' ? pc.green('valid') : pc.red('broken')}`
  ];

  p.note(lines.join('\n'), 'Symlink Inspection');
}
