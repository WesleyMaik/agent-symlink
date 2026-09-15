import { getPackageVersion } from './utils/version.js';

export const VERSION = getPackageVersion();

export * from './types/index.js';
export * from './utils/errors.js';
export * from './core/platform.js';
export * from './core/paths.js';
export * from './core/linker.js';
