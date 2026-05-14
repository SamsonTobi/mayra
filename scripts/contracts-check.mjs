/**
 * Re-run TS codegen and fail if `packages/contracts/src/generated.ts` drifts.
 * Python models (`mayra_contracts.models`) are hand-maintained next to the same schemas.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

execSync('node packages/contracts/scripts/codegen.mjs', {
  cwd: repoRoot,
  stdio: 'inherit',
});

execSync('git diff --exit-code -- packages/contracts/src/generated.ts', {
  cwd: repoRoot,
  stdio: 'inherit',
});
