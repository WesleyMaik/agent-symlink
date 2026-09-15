import pc from 'picocolors';
import { removeLink } from '../core/linker.js';
import type { UnlinkOptions } from '../types/index.js';
import { SymlinkError } from '../utils/errors.js';

export interface CliUnlinkOptions extends UnlinkOptions {
  readonly json?: boolean;
}

/**
 * Handles the unlink command execution from CLI.
 */
export async function handleUnlinkCommand(
  target: string,
  options: CliUnlinkOptions
): Promise<number> {
  try {
    const result = await removeLink(target, options);
    const success = result.removed || (options.dryRun === true && result.wasLink);

    if (options.json) {
      console.log(JSON.stringify({ success, ...result }, null, 2));
      return success ? 0 : 1;
    }

    if (result.removed) {
      console.log(
        `${pc.green('✓')} Successfully unlinked ${pc.bold(target)}. Linked source remains untouched.`
      );
    } else if (options.dryRun && result.wasLink) {
      console.log(`${pc.magenta('[dry-run]')} Would remove symlink at ${pc.bold(target)}.`);
    } else {
      console.log(pc.yellow(result.message ?? `Nothing unlinked at ${target}.`));
    }

    return success ? 0 : 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.json) {
      console.error(JSON.stringify({ success: false, error: message }, null, 2));
      return 1;
    }

    if (error instanceof SymlinkError) {
      console.error(pc.red(`Error: ${error.message}`));
    } else {
      console.error(pc.red(`Unexpected error: ${message}`));
    }

    return 1;
  }
}
