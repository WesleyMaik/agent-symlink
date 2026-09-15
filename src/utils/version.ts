import { readFileSync } from 'node:fs';

/**
 * Retrieves the package version dynamically from package.json.
 */
export function getPackageVersion(): string {
  const metadata: unknown = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    'version' in metadata &&
    typeof metadata.version === 'string' &&
    metadata.version.trim()
  ) {
    return metadata.version;
  }
  throw new Error('Package metadata must contain a valid version.');
}
