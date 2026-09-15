import * as p from '@clack/prompts';
import pc from 'picocolors';
import { showMainMenu } from './main-menu.js';
import { getPackageVersion } from '../utils/version.js';

/**
 * Runs the interactive terminal interface.
 */
export async function runInteractive(): Promise<void> {
  const version = getPackageVersion();
  p.intro(pc.bgCyan(pc.black(` symlink v${version} `)));

  let keepGoing = true;
  while (keepGoing) {
    keepGoing = await showMainMenu();
  }

  p.outro('Thank you for using symlink.');
}
