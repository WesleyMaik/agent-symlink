#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { getPackageVersion } from './utils/version.js';
import { handleLinkCommand, type CliLinkOptions } from './commands/link.js';
import { handlePresetCommand, type CliPresetOptions } from './commands/preset.js';
import { handleSkillsCommand, type CliSkillsOptions } from './commands/skills.js';
import { handleRulesCommand, type CliRulesOptions } from './commands/rules.js';
import { runInteractive } from './interactive/runner.js';

const program = new Command();
const version = getPackageVersion();

program
  .name('symlink')
  .description('Create and manage symbolic links for AI agent instructions, skills, and rules.')
  .version(version, '-v, --version', 'Show CLI version')
  .helpOption('-h, --help', 'Show help information')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information');

program
  .command('link [source] [target]', { isDefault: true })
  .description('Create a symbolic link from source to target (default command)')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information')
  .action(async (source?: string, target?: string, cmdOptions?: CliLinkOptions) => {
    const globalOptions = program.opts<CliLinkOptions>();
    const opts: CliLinkOptions = { ...globalOptions, ...(cmdOptions ?? {}) };

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

program
  .command('preset <agent>')
  .description('Apply an agent preset (or "all" to link all compatible agents)')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information')
  .action(async (agent: string, cmdOptions?: CliPresetOptions) => {
    const globalOptions = program.opts<CliPresetOptions>();
    const opts: CliPresetOptions = { ...globalOptions, ...(cmdOptions ?? {}) };
    const exitCode = await handlePresetCommand(agent, opts);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });

program
  .command('skills <target>')
  .description('Link canonical skills directory to target agent or directory')
  .option('-s, --source <path>', 'Canonical skills source directory (default: .agents/skills)')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information')
  .action(async (target: string, cmdOptions?: CliSkillsOptions) => {
    const globalOptions = program.opts<CliSkillsOptions>();
    const opts: CliSkillsOptions = { ...globalOptions, ...(cmdOptions ?? {}) };
    const exitCode = await handleSkillsCommand(target, opts);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });

program
  .command('rules <target>')
  .description('Link canonical rules directory to target agent or directory')
  .option('-s, --source <path>', 'Canonical rules source directory (default: .agent-config/rules)')
  .option('-f, --force', 'Replace an existing target if it already exists')
  .option('-d, --dry-run', 'Show what would be created without modifying the filesystem')
  .option('-a, --absolute', 'Create an absolute symlink instead of the default relative link')
  .option('--allow-dangling', 'Allow a source path that does not currently exist')
  .option('--cwd <path>', 'Resolve relative paths from another working directory')
  .option('--json', 'Return machine-readable JSON output')
  .option('--verbose', 'Display path resolution and diagnostic information')
  .action(async (target: string, cmdOptions?: CliRulesOptions) => {
    const globalOptions = program.opts<CliRulesOptions>();
    const opts: CliRulesOptions = { ...globalOptions, ...(cmdOptions ?? {}) };
    const exitCode = await handleRulesCommand(target, opts);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`Fatal error: ${message}`));
  process.exitCode = 1;
});
