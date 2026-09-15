import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { LinkType } from '../types/index.js';

export const isWindows = process.platform === 'win32';
export const isMacOS = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

/**
 * Normalizes relative path separators to forward slashes for cross-platform Git compatibility.
 */
export function normalizeLinkPath(linkPath: string): string {
  return linkPath.replaceAll('\\', '/');
}

/**
 * Tests whether the current system has permissions to create symbolic links without elevation.
 */
export async function canCreateSymlink(testDirectory?: string): Promise<boolean> {
  const dir = testDirectory ?? os.tmpdir();
  const testSrc = path.join(dir, `.symlink_test_src_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const testDest = `${testSrc}_link`;

  try {
    await fs.writeFile(testSrc, 'test', 'utf8');
    await fs.symlink(testSrc, testDest, 'file');
    await fs.unlink(testDest);
    await fs.unlink(testSrc);
    return true;
  } catch {
    try {
      await fs.unlink(testDest).catch(() => undefined);
      await fs.unlink(testSrc).catch(() => undefined);
    } catch {
      // Ignored cleanup error
    }
    return false;
  }
}

/**
 * Determines the appropriate LinkType for symlink creation based on target directory status and platform.
 */
export function determineLinkType(isDirectory: boolean): LinkType {
  if (!isDirectory) {
    return 'file';
  }
  return isWindows ? 'junction' : 'dir';
}
