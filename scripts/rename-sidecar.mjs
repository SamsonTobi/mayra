/**
 * Copy a built orchestrator binary into `apps/desktop/src-tauri/binaries/` with the
 * `mayra-orchestrator-<target-triple>` name Tauri expects for `bundle.externalBin`.
 *
 * Usage: node scripts/rename-sidecar.mjs <path-to-source-binary>
 * Env:   MAYRA_ORCHESTRATOR_BINARY — fallback source path if argv omitted
 *        TAURI_ENV_TARGET_TRIPLE or TARGET — defaults to x86_64-pc-windows-msvc
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const destDir = join(repoRoot, "apps", "desktop", "src-tauri", "binaries");

const triple =
  process.env.TAURI_ENV_TARGET_TRIPLE ||
  process.env.TARGET ||
  "x86_64-pc-windows-msvc";

const src =
  process.argv[2] || process.env.MAYRA_ORCHESTRATOR_BINARY || "";

if (!src || !existsSync(src)) {
  console.warn(
    "[rename-sidecar] skip: pass argv binary path or set MAYRA_ORCHESTRATOR_BINARY (PyInstaller / uv output)."
  );
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

const ext = src.endsWith(".exe") ? ".exe" : "";
const destName = `mayra-orchestrator-${triple}${ext}`;
const dest = join(destDir, destName);

copyFileSync(src, dest);
try {
  chmodSync(dest, 0o755);
} catch {
  /* non-POSIX */
}

console.log(
  `[rename-sidecar] ${basename(src)} -> apps/desktop/src-tauri/binaries/${destName}`
);
