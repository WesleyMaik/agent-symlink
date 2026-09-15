#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { getPackageVersion } from './utils/version.js';
import { handleLinkCommand, type CliLinkOptions } from './commands/link.js';
import { runInteractive } from './interactive/runner.js';

const program = new Command();
const version = getPackageVersion();

program
  .name('symlink')
  .description('Create and manage symbolic links for AI agent instructions, skills, and rules.')
  .version(version, '-v, --version', 'Show CLI version')
  .helpOption('-h, --help', 'Show help information')
  .argument('[source]', 'Source file or directory to link from')
  .argument('[target]', 'Target path where the symlink will be created')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information')
  .action(async (source?: string, target?: string, options?: CliLinkOptions) => {
    const opts: CliLinkOptions = options ?? {};

    if (!source && !target) {
      if (process.stdin.isTTY && !opts.json) {
        await runInteractive();
        return;
      }
      program.help();
      return;
    }

    if (!source || !target) {
      if (opts.json) {
        console.error(
          JSON.stringify(
            { success: false, error: 'Both source and target arguments are required.' },
            null,
            2
          )
        );
      } else {
        console.error(pc.red('Error: Both source and target arguments are required.'));
        console.error(pc.dim('Usage: symlink <source> <target> [options]'));
      }
      process.exitCode = 1;
      return;
    }

    const exitCode = await handleLinkCommand(source, target, opts);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`Fatal error: ${message}`));
  process.exitCode = 1;
});
