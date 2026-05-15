/**
 * Runs the orchestrator from source (Phase 3 dev) when the PyInstaller sidecar is absent.
 * Tauri sets MAYRA_PORT, MAYRA_TOKEN, MAYRA_DATA_DIR, MAyRA_REPO_ROOT.
 */
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const orchestratorDir = path.join(repoRoot, 'apps', 'orchestrator');

/** Tauri-spawned Node often inherits a minimal PATH; npm global CLIs (e.g. agent-browser.cmd) live here. */
function prependNpmGlobalBinToPath() {
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf8', cwd: repoRoot, shell: true }).trim();
    if (!prefix) return;
    const globalBin =
      process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    const sep = path.delimiter;
    process.env.PATH = `${globalBin}${sep}${process.env.PATH ?? ''}`;
  } catch {
    /* ignore: npm not installed or npm prefix unavailable */
  }
}

prependNpmGlobalBinToPath();

const port = process.env.MAYRA_PORT ?? '8765';
const token = process.env.MAYRA_TOKEN ?? '';
const dataDir = process.env.MAYRA_DATA_DIR ?? '';

const uv = process.platform === 'win32' ? 'uv.exe' : 'uv';

const child = spawn(
  uv,
  [
    'run',
    '--directory',
    orchestratorDir,
    'python',
    '-m',
    'mayra_orchestrator',
    `--port=${port}`,
    `--token=${token}`,
    `--data-dir=${dataDir}`,
  ],
  { stdio: 'inherit', cwd: repoRoot, env: process.env },
);

child.on('exit', (code) => process.exit(code ?? 0));
