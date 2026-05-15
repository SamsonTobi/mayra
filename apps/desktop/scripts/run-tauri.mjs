/**
 * Ensures rustup's cargo is on PATH before invoking the local @tauri-apps/cli.
 * Windows shells often lack %USERPROFILE%\.cargo\bin until the user re-opens the terminal
 * or completes "add to PATH" from rustup.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ensureSidecarPlaceholder } from '../../../scripts/ensure-sidecar-placeholder.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');

ensureSidecarPlaceholder(repoRoot);

const cargoHome =
  process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
const cargoBin = path.join(cargoHome ?? '', '.cargo', 'bin');

const env = {
  ...process.env,
  PATH: `${cargoBin}${path.delimiter}${process.env.PATH ?? ''}`,
  MAYRA_REPO_ROOT: repoRoot,
};

if (env.MAYRA_SKIP_SIDECAR === '1') {
  env.MAYRA_ORCHESTRATOR_DEV ??= '1';
}

function mergeConfig(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
        ? mergeConfig(out[key], value)
        : value;
  }
  return out;
}

if (env.MAYRA_SKIP_SIDECAR === '1') {
  const existingConfig = env.TAURI_CONFIG ? JSON.parse(env.TAURI_CONFIG) : {};
  env.TAURI_CONFIG = JSON.stringify(
    mergeConfig(existingConfig, {
      bundle: {
        externalBin: [],
      },
    })
  );
}

const tauriBin = path.join(
  desktopRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
);

const argv = process.argv.slice(2);
const r = spawnSync(tauriBin, argv, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

process.exit(r.status === null ? 1 : r.status);
