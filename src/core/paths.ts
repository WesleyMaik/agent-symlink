import path from 'node:path';
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

  if (sourceAbsolute.toLowerCase() === targetAbsolute.toLowerCase()) {
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
