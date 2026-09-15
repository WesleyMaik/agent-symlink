import fs from 'node:fs/promises';
import path from 'node:path';
import type { LinkOptions, LinkResult, LinkType, UnlinkOptions, UnlinkResult } from '../types/index.js';
import { resolvePaths } from './paths.js';
import { determineLinkType, normalizeLinkPath } from './platform.js';
import {
  PlatformPrivilegeError,
  SourceNotFoundError,
  SymlinkError,
  TargetExistsError
} from '../utils/errors.js';

interface StatsResult {
  readonly exists: boolean;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
}

async function getPathStats(filePath: string): Promise<StatsResult> {
  try {
    const lstats = await fs.lstat(filePath);
    return {
      exists: true,
      isDirectory: lstats.isDirectory(),
      // In Node.js on Windows, directory junctions report isSymbolicLink() === false in some versions or true in others,
      // but lstats.isSymbolicLink() or isDirectory() with junction can be verified.
      isSymbolicLink: lstats.isSymbolicLink()
    };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return { exists: false, isDirectory: false, isSymbolicLink: false };
    }
    throw error;
  }
}

/**
 * Creates a symbolic link from source to target with safety checks and idempotency.
 */
export async function createLink(
  source: string,
  target: string,
  options: LinkOptions = {}
): Promise<LinkResult> {
  const { sourceAbsolute, targetAbsolute, linkValue } = resolvePaths(source, target, {
    cwd: options.cwd,
    absolute: options.absolute
  });

  const sourceStats = await getPathStats(sourceAbsolute);

  if (!sourceStats.exists && !options.allowDangling) {
    throw new SourceNotFoundError(source);
  }

  const isDirectory = sourceStats.exists ? sourceStats.isDirectory : false;
  const linkType: LinkType = determineLinkType(isDirectory);

  const targetStats = await getPathStats(targetAbsolute);

  if (targetStats.exists) {
    if (targetStats.isSymbolicLink) {
      let existingTarget = '';
      try {
        existingTarget = await fs.readlink(targetAbsolute);
      } catch {
        // Could not read link, proceed to replacement if forced
      }

      const normalizedExisting = normalizeLinkPath(existingTarget);
      const normalizedDesired = normalizeLinkPath(linkValue);

      if (normalizedExisting === normalizedDesired) {
        return {
          status: 'already_linked',
          source: sourceAbsolute,
          target: targetAbsolute,
          linkValue,
          type: linkType,
          message: `Target "${target}" already points to "${linkValue}".`
        };
      }

      if (!options.force) {
        throw new TargetExistsError(target, 'symlink');
      }

      if (options.dryRun) {
        return {
          status: 'would_replace',
          source: sourceAbsolute,
          target: targetAbsolute,
          linkValue,
          type: linkType,
          message: `Dry run: Would replace existing symlink at "${target}".`
        };
      }

      await fs.unlink(targetAbsolute);
      await createSymlinkNode(linkValue, targetAbsolute, linkType);

      return {
        status: 'replaced',
        source: sourceAbsolute,
        target: targetAbsolute,
        linkValue,
        type: linkType,
        message: `Replaced existing symlink at "${target}" to point to "${linkValue}".`
      };
    }

    if (!options.force) {
      throw new TargetExistsError(
        target,
        targetStats.isDirectory ? 'directory' : 'file'
      );
    }

    if (options.dryRun) {
      return {
        status: 'would_replace',
        source: sourceAbsolute,
        target: targetAbsolute,
        linkValue,
        type: linkType,
        message: `Dry run: Would replace existing ${targetStats.isDirectory ? 'directory' : 'file'} at "${target}".`
      };
    }

    if (targetStats.isDirectory) {
      await fs.rm(targetAbsolute, { recursive: true, force: true });
    } else {
      await fs.unlink(targetAbsolute);
    }

    await createSymlinkNode(linkValue, targetAbsolute, linkType);

    return {
      status: 'replaced',
      source: sourceAbsolute,
      target: targetAbsolute,
      linkValue,
      type: linkType,
      message: `Replaced existing ${targetStats.isDirectory ? 'directory' : 'file'} at "${target}" with symlink to "${linkValue}".`
    };
  }

  if (options.dryRun) {
    return {
      status: 'would_create',
      source: sourceAbsolute,
      target: targetAbsolute,
      linkValue,
      type: linkType,
      message: `Dry run: Would create symlink "${target}" -> "${linkValue}".`
    };
  }

  const parentDir = path.dirname(targetAbsolute);
  await fs.mkdir(parentDir, { recursive: true });

  await createSymlinkNode(linkValue, targetAbsolute, linkType);

  return {
    status: 'created',
    source: sourceAbsolute,
    target: targetAbsolute,
    linkValue,
    type: linkType,
    message: `Created symlink "${target}" -> "${linkValue}".`
  };
}

async function createSymlinkNode(
  linkValue: string,
  targetAbsolute: string,
  linkType: LinkType
): Promise<void> {
  try {
    await fs.symlink(linkValue, targetAbsolute, linkType);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      ((error as { code: string }).code === 'EPERM' ||
        (error as { code: string }).code === 'EACCES')
    ) {
      throw new PlatformPrivilegeError(
        'Operation not permitted. On Windows, ensure Developer Mode is enabled or run with appropriate privileges.'
      );
    }
    throw error;
  }
}

/**
 * Safely removes a symbolic link without modifying the target source file or directory.
 */
export async function removeLink(
  target: string,
  options: UnlinkOptions = {}
): Promise<UnlinkResult> {
  const workingDir = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const targetAbsolute = path.resolve(workingDir, target);

  const stats = await getPathStats(targetAbsolute);

  if (!stats.exists) {
    return {
      target: targetAbsolute,
      removed: false,
      wasLink: false,
      message: `Target "${target}" does not exist.`
    };
  }

  if (!stats.isSymbolicLink) {
    throw new SymlinkError(
      `Refusing to unlink "${target}" because it is a regular ${stats.isDirectory ? 'directory' : 'file'}, not a symbolic link.`
    );
  }

  if (options.dryRun) {
    return {
      target: targetAbsolute,
      removed: false,
      wasLink: true,
      message: `Dry run: Would remove symlink at "${target}".`
    };
  }

  // On Windows, junctions can be unlinked with unlink or rmdir
  try {
    await fs.unlink(targetAbsolute);
  } catch {
    await fs.rmdir(targetAbsolute);
  }

  return {
    target: targetAbsolute,
    removed: true,
    wasLink: true,
    message: `Removed symlink "${target}".`
  };
}
