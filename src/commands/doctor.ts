import pc from 'picocolors';
import { runDoctor } from '../core/doctor.js';

export interface CliDoctorOptions {
  readonly cwd?: string;
  readonly json?: boolean;
}

/**
 * Handles the doctor command execution from CLI.
 */
export async function handleDoctorCommand(options: CliDoctorOptions): Promise<number> {
  const report = await runDoctor(options.cwd);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.allPassed ? 0 : 1;
  }

  console.log(pc.bold('\nSymlink System & Environment Doctor\n'));

  for (const check of report.checks) {
    let icon: string;
    let titleFormatted: string;

    if (check.status === 'pass') {
      icon = pc.green('✓');
      titleFormatted = pc.bold(check.title);
    } else if (check.status === 'warn') {
      icon = pc.yellow('⚠');
      titleFormatted = pc.yellow(pc.bold(check.title));
    } else {
      icon = pc.red('✗');
      titleFormatted = pc.red(pc.bold(check.title));
    }

    console.log(`${icon} ${titleFormatted}`);
    console.log(pc.dim(`  ${check.details}\n`));
  }

  if (report.allPassed) {
    console.log(pc.green('All critical checks passed! Your environment is ready.'));
    return 0;
  }

  console.log(pc.red('One or more critical checks failed. Please address the errors above.'));
  return 1;
}
