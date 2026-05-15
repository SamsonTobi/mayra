# Mayra desktop (Tauri v2)

**Requires:** [Rust stable](https://rustup.rs/) installed via rustup (see `rust-toolchain.toml` at repo root). Node 20+.  
`npm run dev` / `build` prepend `%USERPROFILE%\.cargo\bin` (or `$HOME/.cargo/bin`) so `cargo` is found even if your shell `PATH` was not updated yet; for manual `cargo` commands, add that folder to `PATH` or open a new terminal after installing Rust.

## Phase 1 — Hello desktop

Windows PowerShell (recommended Phase 1)

```powershell
cd apps/desktop
npm install
npm run dev
```

This starts Next.js (`apps/web`) on port **3000** via `beforeDevCommand`, then opens the Mayra window.  
`MAYRA_SKIP_SIDECAR=1` is baked into `npm run dev` so the UI reaches onboarding **without** the packaged `mayra-orchestrator` binary.

**Looks like a website?** In dev, Tauri loads that same Next UI from `http://localhost:3000` inside **WebView2**, so the content matches a browser but you should see an **OS window** titled **Mayra** (no browser tab strip / address bar). If you only get a normal Chrome or Edge tab, you probably ran **`npm run dev` under `apps/web`** or opened localhost manually — use **`apps/desktop`** (or `npm run dev:desktop` from root). A yellow dev banner appears in plain-browser sessions as a hint.

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

### `Cargo.lock` (commit once)

From `apps/desktop`:

```powershell
cargo generate-lockfile --manifest-path src-tauri/Cargo.toml
```

Commit `src-tauri/Cargo.lock` so CI and teammates get reproducible Rust deps.

## Troubleshooting

### `listen EADDRINUSE :::3000`

Something else is already bound to port **3000** (often a leftover `next dev`). Free it, then rerun `npm run dev`:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### Rust `can't find crate for std` / `x86_64-pc-windows-msvc target may not be installed`

Usually **broken or incomplete `rust-std`** after an interrupted install. Repair (PowerShell, rustup on `PATH`):

```powershell
rustup component add rust-std-x86_64-pc-windows-msvc --toolchain stable-x86_64-pc-windows-msvc
```

If that does not fix it, reinstall the MSVC toolchain:

```powershell
rustup toolchain reinstall stable-x86_64-pc-windows-msvc
```

You still need **Visual Studio Build Tools** with the **Desktop development with C++** workload so `link.exe` is available when compiling native code.
