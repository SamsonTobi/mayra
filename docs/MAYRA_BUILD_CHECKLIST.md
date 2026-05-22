# Mayra — Build Checklist (vertical-slice phases)

Derived from `MAYRA_PRD.md`, `MAYRA_TECHNICAL_SPEC.md` (§A v1 cuts, §B TDD, §C local screenshots), and `MAYRA_DESKTOP_UX_FLOWS.md`.

Legend: `[x]` done · `[~]` partial / stubbed · `[ ]` todo · `(spec §X)` cross-ref · `(F#)` UX flow.

---

## New approach — vertical slices

We are **no longer** building horizontally (finish all of orchestrator → all of browser → all of UI). Each **Phase** below ships a runnable desktop binary with one more user-visible capability. Every phase must end with the app actually launching and the **acceptance demo** working on the operator's machine before the next phase starts.

Within a phase, you can still split work across files (lanes), but the phase doesn't close until its acceptance demo is reproduced.

> Rule: every implementation item is **preceded** by a failing test commit. Prefer **small commits** (see `.cursor/rules/mayra-small-commits.mdc`).
> Hygiene: when you finish rows, flip `[ ]` → `[x]` / `[~]` in the **same** change-set.

---

## Phase 0 — Baseline (already on `main`)

What works today without any new code:

- `npm --prefix packages/contracts run test` — 28 schema fixtures pass.
- `uv run --package mayra-contracts pytest` — 28 Pydantic parity tests pass.
- `uv run --extra dev --directory apps/orchestrator pytest -m "not integration"` — 57 orchestrator tests pass (unit + contract + agent-loop contract + ownership).
- `npm --prefix apps/desktop run test` — 3 desktop manifest tests pass.
- Orchestrator FastAPI: `/healthz`, tasks CRUD/abort/approve, validate, ui-logs, SSE chat-stream (stubbed loop wired to a real per-task queue), ApprovalRegistry, owner gating, agent_loop module.
- Desktop Tauri: IPC shell, sidecar env builder from keyring, sidecar supervise with backoff, bundle icons, `scripts/rename-sidecar.mjs`.
- Web (Next 15 App Router): `/`, `/chat`, `/settings`, `/logs[/[task_id]]`; orchestrator-context, chat-stream-reducer, redact, Tauri+Supabase clients; 13 vitest/RTL tests.

What's missing for a **first-run desktop dev loop** was: committed web/desktop lockfiles after `npm install`, `tauri.conf.json` pointing `frontendDist` at `apps/web/out`, `beforeDevCommand` starting Next on :3000, and a dev path that skips the packaged orchestrator (`MAYRA_SKIP_SIDECAR=1`). Phase 1 addresses that; **`Cargo.lock` for `src-tauri` is generated with** `cargo generate-lockfile --manifest-path apps/desktop/src-tauri/Cargo.toml` **and committed.** Native Tauri builds still need MSVC (Visual Studio Build Tools, Desktop development with C++ / `link.exe` on PATH).

---

## Phase 1 — "Hello desktop" (boot a window)

**Goal:** `npm run dev:desktop` from repo root (or `npm run dev` under `apps/desktop`) → Next starts on :3000, window opens, onboarding renders — **no packaged sidecar binary**.

**Acceptance demo:** operator runs `npm run dev:desktop`, the Mayra window appears with the welcome/onboarding content (not stuck on "Starting engine…").

- [x] **Web install** — `npm --prefix apps/web install` (lockfile committed when it changes; this agent run left `apps/web/package-lock.json` unchanged).
- [~] **Root install** — optional `pnpm install` at repo root for workspace linking; **npm `file:` deps in `apps/web/package.json` work without pnpm** for Phase 1.
- [x] **Web boots standalone** — `npm --prefix apps/web run dev` serves `http://localhost:3000` (verify locally).
- [x] **Tauri config wiring** — `apps/desktop/src-tauri/tauri.conf.json`:
  - [x] `build.beforeDevCommand` → `npm --prefix ../../apps/web run dev -- --port 3000`
  - [x] `build.devUrl` → `http://localhost:3000`
  - [x] `build.beforeBuildCommand` → `npm --prefix ../../apps/web run build`
  - [x] `build.frontendDist` → `../../apps/web/out`
  - [x] CSP extended with `http://localhost:*` + `ws://localhost:*` for Next dev / HMR.
- [x] **Cargo lock** — **`cargo generate-lockfile --manifest-path apps/desktop/src-tauri/Cargo.toml`**; `apps/desktop/src-tauri/Cargo.lock` committed.
- [x] **Disable sidecar boot for P1** — `MAYRA_SKIP_SIDECAR=1` via **`cross-env`** on default `npm run dev` in `apps/desktop`; emits synthetic **`orchestrator-ready`** `{ port: 0, token: "" }` from Rust `.setup` so UI unlocks.
- [x] **Web listens correctly** — `useSidecarReady` uses `@tauri-apps/api/event` `listen("orchestrator-ready")` in Tauri; keeps `CustomEvent` fallback for tests.
- [x] **Manual smoke** — `apps/desktop/README.md` documents Phase 1 commands.
- [x] **Root script** — `package.json` → `"dev:desktop"` / `"dev:desktop:sidecar"`.
- [x] **Operator demo tick** — after you see the window once on your machine, flip this box and note git SHA + date in the commit message.

---

## Phase 2 — Detect active Chrome debugging sessions

**Goal:** Settings page has a "Detect browsers" button that lists every Chrome currently exposing `--remote-debugging-port` on `127.0.0.1` and the tabs each one has open.

**Acceptance demo:** operator launches Chrome with `--remote-debugging-port=9222`, opens 2 tabs, clicks Detect in Mayra → both tabs listed with title + URL.

- [x] **Tauri command** `probe_chrome_ports(ports: Vec<u16>) -> Vec<ChromeSession>`:
  - [x] Hits `http://127.0.0.1:<port>/json/version` and `/json` with 200 ms timeout each.
  - [x] Returns `{ port, browser, user_agent, tabs: [{title, url, ws_url, target_id}] }`.
  - [x] Rust unit test with mock HTTP (mockito or similar).
- [x] **Capability** `capabilities/chrome-probe.json` — allowlist outbound to `http://127.0.0.1:9222..9230/**`.
- [x] **Web hook** `useChromeProbe()` — calls the command, debounces, surfaces errors.
- [x] **Component** `settings/BrowserDetectionCard.tsx` + RTL test (mock the Tauri invoke).
- [x] **Settings page** wires the card; empty-state message; "How to enable debugging" link → `RemoteDebuggingWizard`.
- [x] **No orchestrator dependency** in this phase — probing is pure Tauri/HTTP.

---

## Phase 3 — Snapshot a chosen session

**Goal:** User picks one of the detected tabs → orchestrator (sidecar) connects via `agent-browser --cdp <port>`, takes a snapshot + screenshot, the UI shows node count + a 1280-px live preview.

**Acceptance demo:** pick tab → within 2 s the LivePreviewPanel shows the page screenshot and "247 nodes" beside it.

- [x] **Sidecar packaging (dev)** — `scripts/dev-orchestrator.mjs` runs `uv run --directory apps/orchestrator python -m mayra_orchestrator` with `--port` / `--token` / `--data-dir`; Tauri spawns it via `MAYRA_ORCHESTRATOR_DEV=1` when the packaged sidecar is missing. `scripts/ensure-sidecar-placeholder.mjs` (from `run-tauri.mjs`) drops a local `where.exe` copy so `externalBin` resolves at compile time (gitignored; replace with `rename-sidecar.mjs` + real PyInstaller output for release).
- [x] **Sidecar lifecycle in `start_sidecar`** — spawn bundled or dev subprocess → poll `/healthz` → emit `orchestrator-ready { port, token }`; dev child supervised same as bundled.
- [x] **Orchestrator** `POST /v1/sessions/connect { port }` → `agent-browser --cdp <port> --session <id> --json connect <port>`; returns `{ session_id }`.
- [x] **Orchestrator** `POST /v1/sessions/{id}/snapshot` → `agent-browser snapshot --max-output 20000` + screenshot PNG → stores `last_snapshot` in memory; returns `{ node_count, screenshot_path }`.
- [x] **Browser adapter v1** in `mayra_orchestrator/browser/adapter.py` (`open`, `snapshot`, `screenshot_png_bytes`, `screenshot_annotated`, `execute` stub, `close_all`, `run_doctor`).
- [x] **Screenshot save** — `MAYRA_DATA_DIR/screenshots/<session_id>/<step>-snapshot.webp`; recompress with Pillow (≤1280 px, q75) in `browser/preview_image.py`.
- [x] **Tauri command** `asset_url(path)` validates path under `Mayra/screenshots` (caller still uses `convertFileSrc` in WebView).
- [x] **Web** route `/sessions` — CDP detect, connect, list sessions, Snapshot, `LivePreviewPanel` + `OrchestratorClient` session/health APIs; nav link in `SiteNav`.
- [x] **agent-browser doctor** — orchestrator lifespan runs `doctor --json`; `/healthz` includes `agent_browser_ok` / `agent_browser_detail`; UI banner on `/sessions` when unhealthy.
- [x] **Integration test** `tests/integration/test_agent_browser_skips.py::test_open_and_snapshot` — runs when `agent-browser` on PATH and `MAYRA_INTEGRATION_CDP_PORT` set (live Chrome).

---

## Phase 4 — Chat skeleton (one-way streaming)

**Goal:** User types in the composer → message hits orchestrator → SSE streams back tokens that render in the chat window. No real model yet; orchestrator can echo a canned response token-by-token. Approval modals render from a fixture event.

**Acceptance demo:** type "hello", see tokens stream in for ~1 s, then a `done success` event closes the message; click an "approval" dev button → modal renders → approve closes it.

- [x] **Web wiring** — `useChatStream(taskId)` already exists; verify it consumes `token`, `action`, `status`, `approval`, `done`.
- [x] **Orchestrator** echo-mode behind `MAYRA_DEV_ECHO=1`: stub stream emits 1 token per 50 ms; on `task.message` arrival, emits a `system_status` + `done success`.
- [x] **Approval dev hook** — `POST /v1/tasks/{id}/inject_approval` (dev only, env-gated) emits a synthetic `approval_request`; approve flow exercised end-to-end through `MessageApprovalRequest` → `/v1/actions/approve`.
- [x] **Abort wire** — `AbortButton` calls `/v1/tasks/{id}/abort`, UI handles `done aborted`.
- [x] **Composer** sends message via `/v1/tasks/{id}/message`, history reducer appends.
- [x] **RTL tests** assert token stream appends to the last assistant message; abort disables button until `done`.

---

## Phase 5 — First real task on Gemini

**Goal:** A working agent loop. User pastes a Gemini key into Settings, picks a session, types "click the sign-in link" → the orchestrator snapshots, prompts Gemini, parses the action, executes it via agent-browser, returns `done success`. No risk gates yet (everything low risk by default). Budget = 5 steps.

**Acceptance demo:** on a local fixture HTML page (`tests/fixtures/sites/login.html`) the agent clicks `#sign-in` and reports success within 10 s.

- [x] **Provider key flow** — Settings UI calls `save_provider_key("gemini", key)` → keyring → sidecar restart with `MAYRA_PROVIDER_KEYS_BASE64`.
- [x] **`providers/base.py`** — `ModelClient` Protocol; **`providers/gemini.py`** — full `complete_streaming(prompt, on_token)` with vision + `inline_data` for WebP.
- [x] **Provider factory** `providers/factory.py` — one `httpx.AsyncClient` per provider in lifespan.
- [x] **Agent loop integration** — `run_agent_loop` consumes `ModelClient`, calls `parse_chat_and_action`, executes via `BrowserAdapter`, emits SSE events into the task queue.
- [x] **Browser adapter `execute(Action)`** — maps to `click` / `fill` / `wait` / `navigate` (per spec §A.10).
- [x] **Five contract paths** (spec §B.7 — all five required for green) — re-run the existing contract tests after wiring real providers:
  - [x] Success
  - [x] Approval gate (use stub-only here, real gating in P6)
  - [x] Abort
  - [x] Budget exhausted
  - [x] Repair-then-fail
- [x] **Fixture site** `tests/fixtures/sites/login.html` (static, no JS frameworks).
- [x] **Throttle** `aiolimiter.AsyncLimiter(10, 60)` per provider.

---

## Phase 6 — Safety pass (HITL)

**Goal:** Risk reclassification + approval gating + redaction are wired and visible end-to-end. Manual takeover detection works.

**Acceptance demo:** on a fixture site with a "Delete account" button, "delete my account" → high-risk approval modal appears with annotated screenshot → reject ends loop with `done aborted`.

- [x] **`reclassify_risk()` wired** into `run_agent_loop` (already exists as module — integrate, with tests in `test_agent_loop.py`).
- [x] **Approval modal** shows annotated screenshot (refs labelled); reject → `done aborted`; approve → loop continues.
- [x] **Redaction** in action logs — password / OTP / secret-pattern fields show `[REDACTED:<reason>]`.
- [x] **OTP detection** — pattern match on textbox role+name `code|otp|verification` → emit `wait` + Tauri notification (F12).
- [x] **Manual takeover** — observation_hash diff before each step; mismatch → 30 s auto-resume or `approve resume:<task_id>` (F11, spec §A.6).
- [x] **`agent-browser` policy file** `policies/mayra-default.json` denies `eval/download/upload/clipboard/cookies/storage/network.route/addinitscript`.
- [x] **Tests**:
  - [x] Risk: stale-snapshot detection by timestamp drift.
  - [x] Risk: domain check for `navigate` (treat `value=null` as invalid).
  - [x] RTL: `MessageActionLog` renders `[REDACTED:password_field]`.
  - [x] RTL: `MessageApprovalRequest` calls `/v1/actions/approve` on click.

---

## Phase 7 — Logs & persistence

**Goal:** Every task writes structured rows to Supabase; `/logs` lists tasks; `/logs/[task_id]` shows the action timeline + screenshots; retention coroutine deletes screenshots > 7 d.

**Acceptance demo:** complete one task → refresh `/logs` → see it; click → see steps, actions, screenshots; wait 7 d (or fast-forward via env) → screenshots gone.

- [ ] **Migrations** `supabase/migrations/{0001_init.sql, 0002_rls.sql}` (sessions, tasks, steps, actions, screenshots, evaluations) — spec §8.1.
- [ ] **No** storage migration (per §C, screenshots stay local); **no** server-side retention SQL job.
- [ ] **Service-role client** `supabase/client.py` + `repositories.py` (insert_session/task/step/action/screenshot/evaluation, all redact + explicit `user_id`).
- [ ] **First-task lazy session** — no `/v1/sessions` endpoint (spec §A.5).
- [ ] **`/logs` page** — Supabase paginated list (browser client w/ publishable key + anon JWT).
- [ ] **`/logs/[task_id]`** — client-rendered timeline + screenshot thumbnails via `convertFileSrc`.
- [ ] **structlog wiring** — `logging_setup.py` (JSON in prod, console in dev, `redact_processor`, `correlation_id` from middleware), replace `print()`s; `step.completed` log per spec §9.1 / Appendix B.
- [ ] **Retention loop** `retention.py` — every 6 h, delete `MAYRA_DATA_DIR/screenshots/*` older than 7 d (configurable).
- [ ] **Tests**:
  - [ ] Repo insert step → no provider key / password / OTP lands in any column (grep).
  - [ ] RLS denies cross-user reads (local Supabase via CLI).

---

## Phase 8 — Packaging + extra providers + bench

**Goal:** A signed-ish NSIS installer that another machine can run; second provider (Groq or Cloudflare) wired; bench runner executing 5 fixture tasks.

**Acceptance demo:** install `mayra-setup.exe` on a clean Windows VM → run one benchmark → installer reports success.

- [ ] **PyInstaller spec** `apps/orchestrator/build.spec` (`--onedir --strip --paths apps/orchestrator --paths packages/contracts/python`).
- [ ] **`scripts/rename-sidecar.mjs`** copies to `src-tauri/binaries/mayra-orchestrator-<triple>.exe` (already exists; verify).
- [ ] **`scripts/release-pipeline.mjs`** — contracts codegen → next build → pyinstaller → tauri build.
- [ ] **`pnpm tauri build`** produces NSIS `-setup.exe`.
- [ ] **Second provider** — pick **one** of:
  - [ ] `providers/openai_compat.py` Groq path (OpenAI-compat, data-URL image, streaming) + respx tests.
  - [ ] `providers/cloudflare.py` (`@cf/meta/llama-3.2-11b-vision-instruct`, byte image) + 4 respx tests.
- [ ] **Bench**:
  - [ ] `bench/runner.py` (spec §13.2) writing to `evaluations`.
  - [ ] 3 `bench/tasks/<name>.yaml` benchmarks + 3 `tests/fixtures/sites/*.html`.
  - [ ] `success_criteria` evaluator using `agent-browser get url`/`get text` — **no LLM judging**.
- [ ] **CI** `.github/workflows/verify.yml` — ubuntu (lint+typecheck+test), windows (full + integration); cache pnpm, uv, cargo.
- [ ] **Updater wiring deferred** (spec §A.8) — leave `pubkey` placeholder.

---

## Phase 9 (stretch) — Observability, perf, security audit

Not blocking a release. Run when bored, between phases, or before public launch.

### Security audit (spec §10)

- [ ] Host-header guard rejects external `Host`.
- [ ] Token compared with `hmac.compare_digest`.
- [ ] Provider keys never appear in any log file (grep test post-run).
- [ ] `agent-browser` invocation never forwards model output as args.
- [ ] Supabase secret key absent from web bundle (build inspect).
- [ ] `MAYRA_PROVIDER_KEYS_BASE64` env var wiped after read.

### Performance budgets (spec §11)

- [ ] Snapshot+screenshot parallel ≤ 600 ms p95.
- [ ] Per-step total ≤ 3.5 s p95.
- [ ] SSE first byte ≤ 800 ms after step start.
- [ ] Sidecar boot ≤ 1.5 s.

### Observability completeness (spec §9)

- [ ] Stable event names per Appendix B.
- [ ] No `print()` anywhere in `mayra_orchestrator/`.
- [ ] Coverage gates: Python ≥ 85 % branch, TS ≥ 80 %, Rust ≥ 70 %.

---

## "Done already" snapshot

| Suite                                      | Count   | Status                                                |
| ------------------------------------------ | ------- | ----------------------------------------------------- |
| Python unit (`tests/unit`)                 | 55      | ✅                                                    |
| Python provider (gemini respx)             | 4       | ✅                                                    |
| Python contract (`tests/contract`)         | 13      | ✅                                                    |
| Python integration (optional)              | 5       | ⏸ need `agent-browser` + `MAYRA_INTEGRATION_CDP_PORT` |
| TS contracts vitest (`packages/contracts`) | 28      | ✅                                                    |
| Contracts pytest (`mayra-contracts`)       | 28      | ✅                                                    |
| TS web vitest (`apps/web`)                 | 15      | ✅ (after `npm --prefix apps/web install`)            |
| Desktop manifest (`apps/desktop`)          | 3       | ✅                                                    |
| **Total green**                            | **151** |                                                       |

Modules in tree:

```
apps/orchestrator/mayra_orchestrator/
├─ settings.py, errors.py, perf.py, step_budget.py, parser.py
├─ browser/{adapter.py, preview_image.py}
├─ actions/{schema.py, mapper.py}
├─ prompts/templates.py
├─ providers/gemini.py                # list_models probe only
├─ agent_loop/ (run_agent_loop, contracts coverage)
└─ api/{app.py, correlation.py, deps.py, exceptions.py,
        memory_tasks.py, approval_registry.py, routes/**, schemas.py}

apps/desktop/{package.json, src-tauri/{Cargo.toml, src/lib.rs}}   # IPC, sidecar env+supervise, icons
apps/web/{next.config.ts, src/app/**, src/components/**,
          src/hooks/**, src/lib/**, src/providers/**, src/styles/globals.css}
packages/config/{package.json, tsconfig.base.json}
packages/contracts/{schemas/**, fixtures/**, src/generated.ts, python/mayra_contracts/**}
scripts/{rename-sidecar.mjs, contracts-check.mjs, dev-orchestrator.mjs, ensure-sidecar-placeholder.mjs}
```

Still missing: full agent loop wiring to a real provider, Supabase repos & migrations, structlog wiring, CI workflows, PyInstaller spec, bench harness.

---

## How to work this list

1. Read **MAYRA_TECHNICAL_SPEC.md** sections referenced by the current phase before writing code.
2. Find the topmost `[ ]` row in the **lowest unfinished phase** — phases are strictly ordered.
3. Within a phase, multiple agents can split rows by file scope (e.g. one on `tauri.conf.json`, another on `next.config.ts`), but no one starts the next phase until the current phase's **acceptance demo** is reproduced.
4. Test-first per `.cursor/rules/mayra-small-commits.mdc`:
   - `test(p<N>): <what> — red`
   - `feat(p<N>): <what> — green`
   - `refactor(p<N>): <what>` (optional)
   - `docs: tick <what> in build checklist`
5. After each phase, run the acceptance demo manually on the operator's machine; record the date + git SHA in a one-line note appended to that phase.

When two agents need to touch the same file, prefer the **`wire(app)` seam** pattern in the orchestrator and the **`<Section>Card` component** pattern in the web app to keep diffs additive.

---

## Appendix — original T-stage → Phase mapping (for spec cross-reference)

| T-stage                                  | Folded into                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| T0 Repo scaffolding                      | done; remaining `.pre-commit-config.yaml` → Phase 8 (CI)                                           |
| T1 Contracts                             | done                                                                                               |
| T2 Pure Python modules                   | done; follow-ups absorbed into Phase 6                                                             |
| T3 App skeleton                          | done; **structlog wiring → Phase 7**                                                               |
| T4 Memory tasks + first contract surface | done                                                                                               |
| T5 Agent loop                            | module exists; **wired in Phase 5** (success/abort/budget/repair) and Phase 6 (approval/risk)      |
| T6 Provider clients                      | gemini list_models done; **gemini streaming → Phase 5**, second provider → Phase 8                 |
| T7 agent-browser adapter                 | **Phase 3** (open/snapshot/screenshot), **Phase 5** (execute), **Phase 6** (policies/OTP/takeover) |
| T8 Tauri shell                           | done; **chrome-probe → Phase 2**, **sidecar dev wiring → Phase 3**, **packaging → Phase 8**        |
| T9 Next.js UI                            | App Router done; **chat wiring → Phase 4**, **logs → Phase 7**                                     |
| T10 Supabase                             | **Phase 7**                                                                                        |
| T11 Bench + packaging + CI               | **Phase 8**                                                                                        |

---

## Sources

- `docs/MAYRA_PRD.md`
- `docs/MAYRA_TECHNICAL_SPEC.md` (§A v1 cuts, §B TDD, §C local screenshots, §0–§15)
- `docs/MAYRA_DESKTOP_UX_FLOWS.md` (F1–F20)
- `.cursor/rules/*.mdc`
