import fs from 'node:fs/promises';
import path from 'node:path';
import type { InspectResult, LinkType } from '../types/index.js';
import { normalizeLinkPath } from './platform.js';

/**
 * Inspects a filesystem path to determine if it is a symlink, its target, and validity.
 */
export async function inspectPath(
  target: string,
  options: { readonly cwd?: string } = {}
): Promise<InspectResult> {
  const workingDir = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const targetAbsolute = path.resolve(workingDir, target);

  try {
    const lstats = await fs.lstat(targetAbsolute);

    if (!lstats.isSymbolicLink()) {
      return {
        path: targetAbsolute,
        exists: true,
        isSymlink: false,
        status: lstats.isDirectory() ? 'regular_dir' : 'regular_file',
        message: `Path exists as a regular ${lstats.isDirectory() ? 'directory' : 'file'}.`
      };
    }

    const rawLinkValue = await fs.readlink(targetAbsolute);
    const linkValue = normalizeLinkPath(rawLinkValue);
    const resolvedSource = path.resolve(path.dirname(targetAbsolute), rawLinkValue);

    let sourceExists = false;
    let linkType: LinkType = 'file';

    try {
      const sourceStats = await fs.stat(resolvedSource);
      sourceExists = true;
      linkType = sourceStats.isDirectory() ? 'dir' : 'file';
    } catch {
      sourceExists = false;
    }

    return {
      path: targetAbsolute,
      exists: true,
      isSymlink: true,
      linkType,
      linkValue,
      resolvedSource,
      sourceExists,
      status: sourceExists ? 'valid' : 'broken',
      message: sourceExists
        ? `Valid symlink pointing to "${linkValue}".`
        : `Broken symlink pointing to non-existent "${linkValue}".`
    };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return {
        path: targetAbsolute,
        exists: false,
        isSymlink: false,
        status: 'not_found',
        message: `Path "${target}" does not exist.`
      };
    }
    throw error;
  }
}
