import * as p from '@clack/prompts';
import pc from 'picocolors';
import { removeLink } from '../core/linker.js';
import { inspectPath } from '../core/inspector.js';
import type { UnlinkOptions } from '../types/index.js';

/**
 * Interactive flow for removing a symbolic link.
 */
export async function runUnlinkFlow(options: UnlinkOptions = {}): Promise<void> {
  const targetInput = await p.text({
    message: 'Symlink path to remove:',
    placeholder: 'CLAUDE.md',
    validate: (val) => (!val.trim() ? 'Path cannot be empty.' : undefined)
  });

  if (p.isCancel(targetInput)) {
    p.cancel('Operation cancelled.');
    return;
  }

  const inspected = await inspectPath(targetInput.trim(), options);

  if (!inspected.exists) {
    p.log.warn(`Path "${targetInput}" does not exist.`);
    return;
  }

  if (!inspected.isSymlink) {
    p.log.error(
      `Refusing to remove "${targetInput}" because it is a regular ${inspected.status === 'regular_dir' ? 'directory' : 'file'}, not a symbolic link.`
    );
    return;
  }

  const confirmed = await p.confirm({
    message: `Remove symbolic link "${targetInput}" (points to ${inspected.linkValue})?`,
    initialValue: false
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Unlink cancelled.');
    return;
  }

  try {
    const result = await removeLink(targetInput.trim(), options);
    if (result.removed) {
      p.log.success(
        `${pc.green('✓')} Successfully removed symlink "${targetInput}". Linked source was untouched.`
      );
    } else {
      p.log.info(`Nothing removed: ${result.message}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(`Failed to remove link: ${message}`);
  }
}
