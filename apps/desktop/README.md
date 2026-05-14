# Mayra desktop (Tauri v2)

## Phase 1 — Hello desktop

Windows PowerShell (recommended Phase 1)

```powershell
cd apps/desktop
npm install
npm run dev
```

This starts Next.js (`apps/web`) on port **3000** via `beforeDevCommand`, then opens the Mayra window.  
`MAYRA_SKIP_SIDECAR=1` is baked into `npm run dev` so the UI reaches onboarding **without** the packaged `mayra-orchestrator` binary.

From repo root:

```powershell
npm run dev:desktop
```

When you have a working sidecar binary under `src-tauri/binaries/`, use:

```powershell
npm run dev:with-sidecar
```

(or `npm run dev:desktop:sidecar` from root).

## Production-ish bundle

```powershell
npm run build
```

Runs `npm --prefix ../../apps/web run build`, embeds `../../apps/web/out`, and produces an installer target (`pnpm tauri build` parity).

## Rust tests

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
```

Requires Rust stable (`rust-toolchain.toml` at repo root).
