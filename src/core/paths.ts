import path from 'node:path';
import fs from 'node:fs/promises';
import { normalizeLinkPath } from './platform.js';
import { InvalidPathError, CircularLinkError } from '../utils/errors.js';

export interface ResolvedPaths {
  readonly sourceAbsolute: string;
  readonly targetAbsolute: string;
  readonly linkValue: string;
}

/**
 * Resolves source and target paths to absolute paths and calculates the symlink value.
 */
export function resolvePaths(
  source: string,
  target: string,
  options: { readonly cwd?: string; readonly absolute?: boolean } = {}
): ResolvedPaths {
  if (!source || !source.trim()) {
    throw new InvalidPathError('Source path cannot be empty.');
  }
  if (!target || !target.trim()) {
    throw new InvalidPathError('Target path cannot be empty.');
  }

  const workingDir = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const sourceAbsolute = path.resolve(workingDir, source);
  const targetAbsolute = path.resolve(workingDir, target);

  if (path.relative(sourceAbsolute, targetAbsolute) === '') {
    throw new CircularLinkError(source, target);
  }

  let linkValue: string;
  if (options.absolute) {
    linkValue = sourceAbsolute;
  } else {
    const targetDir = path.dirname(targetAbsolute);
    const rel = path.relative(targetDir, sourceAbsolute);
    linkValue = normalizeLinkPath(rel);
  }

  return {
    sourceAbsolute,
    targetAbsolute,
    linkValue
  };
}

/**
 * Resolves existing symlink components while retaining missing path components.
 * Dependencies include intermediate links so replacement can preserve the entire source chain.
 */
export async function resolvePhysicalPath(
  filePath: string,
  dependencies: Set<string> = new Set(),
  symlinks: Set<string> = new Set()
): Promise<string> {
  const parent = path.dirname(filePath);
  if (parent === filePath) return fs.realpath(filePath);

  const physicalParent = await resolvePhysicalPath(parent, dependencies, symlinks);
  const physicalPath = path.join(physicalParent, path.basename(filePath));
  dependencies.add(physicalPath);

  try {
    const stats = await fs.lstat(physicalPath);
    if (!stats.isSymbolicLink()) return fs.realpath(physicalPath);

    if (symlinks.has(physicalPath) || symlinks.size >= 40) {
      throw new CircularLinkError(filePath, physicalPath);
    }
    const nextLinks = new Set(symlinks).add(physicalPath);
    const linkValue = await fs.readlink(physicalPath);
    return resolvePhysicalPath(path.resolve(physicalParent, linkValue), dependencies, nextLinks);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return physicalPath;
    }
    throw error;
  }
}

/**
 * Checks path containment using the host platform's path comparison semantics.
 */
export function isPathWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}
