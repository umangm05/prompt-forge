/**
 * Verifies one mock simultaneous round through the compiled engine logic
 * by spawning a tiny Vite-SSR-free check via dynamic import of source through tsx if present,
 * else a self-contained structural assertion.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const runner = join(root, 'scripts/verify-engine-run.ts');

if (!existsSync(runner)) {
  console.error('Missing verify-engine-run.ts');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['--yes', 'tsx', runner],
  { cwd: root, encoding: 'utf8', stdio: 'inherit' },
);

process.exit(result.status ?? 1);
