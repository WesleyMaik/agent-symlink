import pc from 'picocolors';
import { inspectPath } from '../core/inspector.js';

export interface CliInspectOptions {
  readonly cwd?: string;
  readonly json?: boolean;
}

/**
 * Handles the inspect command execution from CLI.
 */
export async function handleInspectCommand(
  target: string,
  options: CliInspectOptions
): Promise<number> {
  const result = await inspectPath(target, { cwd: options.cwd });
  const success = result.exists && result.status !== 'broken';

  if (options.json) {
    console.log(JSON.stringify({ success, ...result }, null, 2));
    return success ? 0 : 1;
  }

  if (!result.exists) {
    console.error(pc.red(`Target "${target}" does not exist.`));
    return 1;
  }

  console.log(pc.bold(`\n${target}`));
  if (!result.isSymlink) {
    console.log(`Type: ${result.status === 'regular_dir' ? 'regular directory' : 'regular file'}`);
    console.log(`Status: ${pc.yellow('not a symlink')}`);
    return 0;
  }

  console.log(`Type: symbolic link (${result.linkType})`);
  console.log(`Points to: ${pc.cyan(result.linkValue ?? '')}`);
  console.log(`Resolved source: ${result.resolvedSource ?? ''}`);
  console.log(
    `Status: ${result.status === 'valid' ? pc.green('valid') : pc.red('broken (target does not exist)')}`
  );

  return result.status === 'valid' ? 0 : 1;
}
