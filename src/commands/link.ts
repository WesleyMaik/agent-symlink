import pc from 'picocolors';
import { createLink } from '../core/linker.js';
import type { LinkOptions, LinkResult } from '../types/index.js';
import { SymlinkError } from '../utils/errors.js';

export interface CliLinkOptions extends LinkOptions {
  readonly json?: boolean;
}

/**
 * Handles the direct link command execution from the CLI.
 */
export async function handleLinkCommand(
  source: string,
  target: string,
  options: CliLinkOptions
): Promise<number> {
  try {
    if (options.verbose && !options.json) {
      console.log(pc.dim(`Resolving source: "${source}"`));
      console.log(pc.dim(`Resolving target: "${target}"`));
      if (options.cwd) {
        console.log(pc.dim(`Working directory: "${options.cwd}"`));
      }
    }

    const result = await createLink(source, target, options);

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
      return 0;
    }

    printLinkResult(result, options.verbose ?? false);
    return 0;
  } catch (error: unknown) {
    if (options.json) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ success: false, error: message }, null, 2));
      return 1;
    }

    if (error instanceof SymlinkError) {
      console.error(pc.red(`Error: ${error.message}`));
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`Unexpected error: ${message}`));
    }

    if (options.verbose && error instanceof Error && error.stack) {
      console.error(pc.dim(error.stack));
    }

    return 1;
  }
}

function printLinkResult(result: LinkResult, verbose: boolean): void {
  switch (result.status) {
    case 'created':
      console.log(`${pc.green('✓')} Created symlink: ${pc.bold(result.target)} -> ${pc.cyan(result.linkValue)}`);
      break;
    case 'already_linked':
      console.log(`${pc.blue('ℹ')} Already linked: ${pc.bold(result.target)} already points to ${pc.cyan(result.linkValue)}`);
      break;
    case 'replaced':
      console.log(`${pc.yellow('✓')} Replaced: ${pc.bold(result.target)} -> ${pc.cyan(result.linkValue)}`);
      break;
    case 'would_create':
      console.log(`${pc.magenta('[dry-run]')} Would create: ${pc.bold(result.target)} -> ${pc.cyan(result.linkValue)}`);
      break;
    case 'would_replace':
      console.log(`${pc.magenta('[dry-run]')} Would replace: ${pc.bold(result.target)} -> ${pc.cyan(result.linkValue)}`);
      break;
    default:
      console.log(result.message ?? `Processed: ${result.target}`);
      break;
  }

  if (verbose) {
    console.log(pc.dim(`  Type: ${result.type}`));
    console.log(pc.dim(`  Source Absolute: ${result.source}`));
    console.log(pc.dim(`  Target Absolute: ${result.target}`));
  }
}
