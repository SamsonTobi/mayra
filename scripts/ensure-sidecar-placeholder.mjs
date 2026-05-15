/**
 * Tauri `bundle.externalBin` requires the file to exist at build time. Developers copy a
 * harmless stub unless `MAYRA_ORCHESTRATOR_BINARY` / PyInstaller output was installed via
 * `scripts/rename-sidecar.mjs`.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function ensureSidecarPlaceholder(repoRoot) {
  if (process.env.MAYRA_SKIP_SIDECAR === '1') {
    return;
  }
  const triple =
    process.env.TAURI_ENV_TARGET_TRIPLE ||
    process.env.TARGET ||
    (process.platform === 'win32' ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu');
  const ext = process.platform === 'win32' ? '.exe' : '';
  const destDir = path.join(
    repoRoot,
    'apps',
    'desktop',
    'src-tauri',
    'binaries',
  );
  const dest = path.join(destDir, `mayra-orchestrator-${triple}${ext}`);
  if (existsSync(dest)) {
    return;
  }
  mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    const stub = path.join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32',
      'where.exe',
    );
    copyFileSync(stub, dest);
  } else {
    copyFileSync('/usr/bin/true', dest);
  }
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  ensureSidecarPlaceholder(repoRoot);
}
