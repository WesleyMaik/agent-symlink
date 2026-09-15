import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  LinkOptions,
  LinkResult,
  LinkType,
  UnlinkOptions,
  UnlinkResult
} from '../types/index.js';
import { isPathWithin, resolvePaths, resolvePhysicalPath } from './paths.js';
import { determineLinkType, normalizeLinkPath } from './platform.js';
import {
  PlatformPrivilegeError,
  SourceNotFoundError,
  SymlinkError,
  TargetExistsError
} from '../utils/errors.js';
import { CircularLinkError } from '../utils/errors.js';

interface StatsResult {
  readonly exists: boolean;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
}

async function getPathStats(filePath: string, followSymlinks = false): Promise<StatsResult> {
  try {
    const lstats = await (followSymlinks ? fs.stat(filePath) : fs.lstat(filePath));
    return {
      exists: true,
      isDirectory: lstats.isDirectory(),
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
  const { sourceAbsolute, targetAbsolute } = resolvePaths(source, target, {
    cwd: options.cwd,
    absolute: options.absolute
  });

  const physicalTargetParent = await resolvePhysicalPath(path.dirname(targetAbsolute));
  const physicalTarget = path.join(physicalTargetParent, path.basename(targetAbsolute));
  const sourceDependencies = new Set<string>();
  const physicalSource = await resolvePhysicalPath(sourceAbsolute, sourceDependencies);
  const sourceStats = await getPathStats(sourceAbsolute, true);

  if (!sourceStats.exists && !options.allowDangling) {
    throw new SourceNotFoundError(source);
  }

  const isDirectory = sourceStats.exists ? sourceStats.isDirectory : false;
  const linkType: LinkType = determineLinkType(isDirectory);

  const targetStats = await getPathStats(targetAbsolute);

  if (
    [...sourceDependencies].some((dependency) => isPathWithin(physicalTarget, dependency)) ||
    isPathWithin(physicalSource, physicalTarget) ||
    (targetStats.exists &&
      !targetStats.isSymbolicLink &&
      isPathWithin(await fs.realpath(targetAbsolute), physicalSource))
  ) {
    throw new CircularLinkError(source, target);
  }

  const physicalSourceParent = await resolvePhysicalPath(path.dirname(sourceAbsolute));
  const sourceEntry = path.join(physicalSourceParent, path.basename(sourceAbsolute));
  const linkValue = options.absolute
    ? sourceAbsolute
    : normalizeLinkPath(path.relative(physicalTargetParent, sourceEntry));

  if (targetStats.exists) {
    if (targetStats.isSymbolicLink) {
      const existingTarget = await fs.readlink(targetAbsolute);

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

      await replaceWithSymlink(linkValue, targetAbsolute, linkType, false);

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
      throw new TargetExistsError(target, targetStats.isDirectory ? 'directory' : 'file');
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

    await replaceWithSymlink(linkValue, targetAbsolute, linkType, targetStats.isDirectory);

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

/**
 * Stages the new link beside its destination so relative targets stay valid.
 * The original is retained until installation succeeds and restored on failure.
 */
async function replaceWithSymlink(
  linkValue: string,
  targetAbsolute: string,
  linkType: LinkType,
  replacesDirectory: boolean
): Promise<void> {
  const prefix = path.join(path.dirname(targetAbsolute), `.symlink-${randomUUID()}`);
  const staged = `${prefix}-new`;
  const backup = `${prefix}-backup`;

  await createSymlinkNode(linkValue, staged, linkType);
  try {
    await fs.rename(targetAbsolute, backup);
    try {
      await fs.rename(staged, targetAbsolute);
    } catch (error: unknown) {
      try {
        await fs.rename(backup, targetAbsolute);
      } catch (restoreError: unknown) {
        throw new AggregateError(
          [error, restoreError],
          `Replacement failed. Recover the original target from "${backup}".`
        );
      }
      throw error;
    }
  } finally {
    await fs.unlink(staged).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')
        return;
      throw error;
    });
  }

  if (replacesDirectory) {
    await fs.rm(backup, { recursive: true });
  } else {
    await fs.unlink(backup);
  }
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
