import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Retrieves the package version dynamically from package.json.
 */
export function getPackageVersion(): string {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    // When running from dist/utils/ or dist/
    const possiblePaths = [
      path.resolve(currentDir, '../../package.json'),
      path.resolve(currentDir, '../package.json'),
      path.resolve(currentDir, './package.json')
    ];

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'version' in parsed &&
          typeof (parsed as { version: unknown }).version === 'string'
        ) {
          return (parsed as { version: string }).version;
        }
      }
    }
  } catch {
    // Fallback if unable to read package.json
  }
  return '0.1.0';
}
