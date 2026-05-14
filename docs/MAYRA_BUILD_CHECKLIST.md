# Mayra — Build Checklist (single-source todo)

Derived from `MAYRA_PRD.md`, `MAYRA_TECHNICAL_SPEC.md` (incl. §A v1 cuts, §B TDD, §C local screenshots), and `MAYRA_DESKTOP_UX_FLOWS.md`. Order = §B.7 stages T0→T11. Pick the next unchecked item, do red→green→refactor (§B.9), check it off, move on.

Legend: `[x]` done · `[~]` partial / stubbed · `[ ]` todo · `(spec §X)` cross-ref · `(F#)` UX flow.

> Rule: every implementation item is **preceded** by a failing test commit. If the test isn't possible (e.g. CSS-only) write a smoke test or skip the row.

> **Checklist hygiene:** When you finish rows below, update this file in the same change-set (flip boxes, use `[~]` when intentionally stubbed). Prefer **small commits** (see `.cursor/rules/mayra-small-commits.mdc`).

---

## Parallel lanes (multi-agent execution)

Several stages can be developed concurrently because they touch disjoint directories. Each lane runs on its own branch (`lane/<id>-<slug>`), rebases onto `main`, opens a PR per stage, and merges fast-forward when green.

| Lane | Owner scope (files this lane is allowed to touch) | Stages | Branch | Status |
|------|---------------------------------------------------|--------|--------|--------|
| **A — Orchestrator core** | `apps/orchestrator/mayra_orchestrator/{agent_loop.py,logging_setup.py,api/approval_registry.py,api/routes/**}`; tests under `apps/orchestrator/tests/{unit,contract}/` | T3 (logging), T4 follow-ups, **T5 agent loop** | `lane/a-loop` | unstarted |
| **B — Browser adapter** | `apps/orchestrator/mayra_orchestrator/browser/**`; `apps/orchestrator/tests/{unit,integration}/test_browser_*.py` | **T7** | `lane/b-browser` | unstarted |
| **C — Provider clients** | `apps/orchestrator/mayra_orchestrator/providers/{base.py,grok.py,cloudflare.py,factory.py,_retry.py}`; tests `apps/orchestrator/tests/unit/test_*_provider.py` | **T6** (everything except gemini list_models which is done) | `lane/c-providers` | unstarted |
| **D — Persistence + Supabase** | `apps/orchestrator/mayra_orchestrator/persistence/**`; `supabase/**`; tests `apps/orchestrator/tests/unit/test_repo_*.py`, `tests/integration/test_supabase_*.py` | **T10** | `lane/d-supabase` | unstarted |
| **E — Tauri desktop** | `apps/desktop/**` (does not exist yet); `scripts/rename-sidecar.mjs` | **T8** | `lane/e-desktop` | unstarted |
| **F — Next.js UI** | `apps/web/**` (except files already in `src/lib/{orchestrator-client,sse}.*`); `packages/ui/**` if/when created | **T9** | `lane/f-web` | unstarted |
| **G — Repo / CI / quality** | `.pre-commit-config.yaml`, `.github/workflows/**`, root `package.json` script additions, `turbo.json` task additions, `scripts/release-pipeline.mjs` | T0 leftovers, **T11 CI + packaging** | `lane/g-ci` | unstarted |
| **H — Bench harness** | `bench/**`, `tests/fixtures/sites/**`, `apps/web/__bench-only__/**` if needed | **T11 bench** | `lane/h-bench` | unstarted |

### Shared files (require coordination)

These files are touched by multiple lanes; a lane MUST limit its diff to a small, additive seam, post the diff in PR description, and rebase before merge:

| File | Touched by | Required pattern |
|------|------------|------------------|
| `apps/orchestrator/mayra_orchestrator/api/app.py` | A, B, C, D | Each lane defines `def wire(app: FastAPI) -> None` in its own module and `create_app()` calls them in fixed order. No lane edits route logic of another lane. |
| `apps/orchestrator/mayra_orchestrator/settings.py` | A, B, C, D, G | Append-only fields, default values; never reorder/rename existing fields. |
| `apps/orchestrator/pyproject.toml` | A, B, C, D, H | Append to `dependencies`; never remove. Bump `[project.optional-dependencies].dev` only if your tests need it. |
| `packages/contracts/**` | A, F (consumers) | Schema changes are their own PR; consumers wait for it to merge then `npm run contracts:codegen`. |
| `docs/MAYRA_BUILD_CHECKLIST.md` | every lane | Each PR flips only the rows that lane finished. Resolve merge conflicts by accepting the union of `[x]` marks. |
| `uv.lock`, `pnpm-lock.yaml`, `package-lock.json` | every lane | Always commit; on conflict, regenerate then commit. Never hand-edit. |

### Coordination rules

1. **One lane per chat / agent.** Don’t mix lanes in a single working tree.
2. **Branch off latest `main`.** `git fetch && git switch -c lane/<id>-<slug> origin/main`.
3. **Tests first.** Every PR includes the failing test commit before the implementation commit (per `.cursor/rules/mayra-small-commits.mdc`).
4. **Stay inside your scope.** If you need a file outside your scope, open a tiny PR from another lane (or ask the operator) instead of editing it yourself.
5. **No `git push --force` to `main`.** Lane branches: rebase + force-push to your own branch is fine.
6. **CI lane (G) goes last per stage.** It’s the only lane that may aggregate cross-lane wiring (e.g. `verify` script picking up new package scripts).
7. **Lockfile churn**: if `uv sync` or `npm install` adds/removes a package, regenerate the lockfile in the same commit as the dep change.
8. **Conflict on `app.py`**: never both register the same route prefix. Reserve prefixes: A = `/v1/tasks`, `/v1/chat`, `/v1/actions`, `/v1/sessions`; B = (none — adapter only); C = `/v1/settings`, `/v1/providers`; D = `/v1/logs`.

### Dependency graph

- **A** can start now. Independent of others except contracts (already done).
- **B** can start now. A’s agent loop will call into B at the end (interface: `BrowserAdapter` Protocol). Until then B exposes `FakeBrowser`-compatible Protocol.
- **C** can start now. Independent.
- **D** can start now (table DDL + repos). Wiring into agent loop blocks on A; tests can use direct repo calls.
- **E** can start now. Sidecar lifecycle integration test blocks on a packaged orchestrator binary (G), but Rust-only tests run today.
- **F** can start now. UI mocks the orchestrator over fetch/EventSource; no runtime dependency on A.
- **G** depends on at least one other lane having scripts/tests to wire. CI matrix can scaffold immediately.
- **H** independent; eval expectations rely on at least one fixture site.

---

## Stage T0 — Repo scaffolding   `[lane: G]`

- [x] Root `package.json` with workspace test scripts (npm-based, pnpm optional)
- [x] `pnpm-workspace.yaml`
- [x] `apps/orchestrator/pyproject.toml` (uv-buildable, hatchling)
- [x] `packages/contracts/{package.json,tsconfig.json,vitest.config.ts}`
- [x] `apps/web/{package.json,tsconfig.json,vitest.config.ts}`
- [x] **Root `pyproject.toml`** as uv workspace root (`[tool.uv.workspace] members = [...]`) (spec §0.3)
- [x] **`uv.lock`** committed at repo root after `uv sync` (single workspace lock; drop nested `apps/orchestrator/uv.lock`)
- [x] **`turbo.json`** for JS/TS pipelines (build/lint/typecheck/test) (spec §0.3)
- [x] **`rust-toolchain.toml`** pinning stable + rustfmt/clippy (spec §0.1)
- [x] **`.gitignore`** per spec §0.3 (`.venv/`, `target/`, `binaries/*`, `.agent-browser/`, `*.state.json`, `.env`, `.next/`, `out/`, `dist/`)
- [x] **`.editorconfig`** (LF, 2-space JS, 4-space Python, trim trailing ws)
- [ ] **`.pre-commit-config.yaml`** with ruff, pyright, eslint, cargo fmt, cargo clippy, contracts-check (spec §0.3)
- [~] **Root `verify` script** — `npm run verify` runs `contracts:check` + full `npm test` (contracts vitest + contracts pytest + orchestrator + web). Extend with turbo lint/typecheck + `ruff`/`cargo` gates when those scripts land.

---

## Stage T1 — `@mayra/contracts` (single source of truth)   `[lane: shared — frozen unless schema change requested]`

### Schemas
- [x] `schemas/action.schema.json` (Draft 2020-12, additionalProperties:false; conditional rules for click/type/navigate)
- [x] `schemas/message.schema.json` — discriminated union over `kind` (user|assistant|system_status|action_log|approval_request) (spec §1.2); cross-refs use relative `./action.schema.json`
- [x] `schemas/events.schema.json` — SSE payload union (token|action|status|approval|done|error); refs `./message.schema.json#/$defs/…`
- [x] `schemas/approval.schema.json`
- [x] `schemas/settings.schema.json`

### Fixtures
- [x] `action.valid.click.json`
- [x] `action.invalid.css_selector.json`
- [x] `action.invalid.extra_field.json`
- [x] `action.invalid.missing_risk.json`
- [x] Extra valid action fixtures: `type` / `scroll` / `wait` / `navigate` (one each)
- [x] Extra invalid action fixtures: value > 2048, navigate non-URI, `action:"eval"`
- [x] One valid + one invalid fixture **per other schema** (message/events/approval/settings)

### Codegen
- [~] `packages/contracts/scripts/codegen.mjs` → emits **`src/generated.ts`** (bundle + `json-schema-to-typescript`; inline stubs for `$defs` names); **Python** models are **`mayra_contracts/models.py`** (hand-maintained next to schemas, same fixtures — optional future datamodel-codegen)
- [x] Commit generated TS + Python package sources (`generated.ts`, `mayra_contracts/`)
- [x] `packages/contracts/python/pyproject.toml` (uv member, name `mayra-contracts`)
- [x] `scripts/contracts-check.mjs` — re-runs codegen, fails on diff for `packages/contracts/src/generated.ts`
- [x] Wire `npm run contracts:check` into `verify` (via root `package.json`)

### Tests
- [x] vitest fixture validation for `action.schema.json` (superseded by full-schema loop)
- [x] vitest fixture loop for **all** schemas (`test/schema.test.ts`)
- [x] pytest mirror — `mayra_contracts.models` accept/reject same fixtures (`packages/contracts/python/tests/test_fixture_parity.py`)

### Cross-cutting (replace hand-written models)
- [x] Replace `mayra_orchestrator/actions/schema.py` with re-export from `mayra_contracts`
- [x] Add `mayra-contracts` as a workspace dep in `apps/orchestrator/pyproject.toml`

---

## Stage T2 — Pure Python modules (TDD)   `[lane: A — follow-ups only, core complete]`

All 12 first-failing tests green: 35 pytest unit tests + 28 contracts vitest tests (+ contracts pytest fixture parity).

- [x] `redaction.py` — `redact()`, `redact_for_display()`
- [x] `actions/schema.py` — `Action` (Pydantic v2, frozen, strict, extra='forbid')
- [x] `actions/mapper.py` — `to_agent_browser_command()` for 5 v1 actions
- [x] `risk.py` — `reclassify_risk()` (max-of-model-and-policy)
- [x] `step_budget.py`
- [x] `prompts/templates.py` — `build_prompt()` with `<content-boundaries>`
- [x] `parser.py` — `parse_chat_and_action()`
- [x] `snapshot.py` — `Node`, `Snapshot.from_json/find/prune`
- [x] `perf.py` — `PerfTimer` (sync + async)
- [x] `errors.py` — `MayraError` hierarchy with stable `code` attrs

### Follow-ups for these modules (non-blocking refinements)
- [ ] Risk: stale-snapshot detection should check timestamp drift, not just a bool flag
- [ ] Risk: domain check should treat `value=null navigate` as invalid (raise) instead of empty-host
- [ ] Snapshot pruner: cap to 1500 nodes; log warning on truncation (spec §A.16)
- [ ] Prompt builder: image bytes downsize to ≤ 1280 px long edge (spec §11.2) — Pillow dep + new test
- [ ] History compaction helper: keep last 8 messages, drop oldest if total > 12k chars (spec §A.11)

---

## Stage T3 — App skeleton (settings, logging, errors, auth)   `[lane: A]`

- [x] `mayra_orchestrator/settings.py` — pydantic-settings (`MAYRA_*` env vars)
- [x] `api/correlation.py` — request-scoped `correlation_id`
- [x] `api/deps.py` — `require_bearer` (header **or** `?token=` query, constant-time)
- [x] `api/exceptions.py` — `ActionValidationError → 422`, `MayraError → 500`, JSON shape `{ code, message, correlation_id }`
- [x] `api/app.py` — `create_app()` with host-guard middleware (`127.0.0.1` / `localhost` only)
- [x] `/healthz` (no auth)
- [x] `__main__.py` (`uv run python -m mayra_orchestrator`)

### Outstanding
- [ ] `logging_setup.py` — **structlog** with JSON renderer in prod, console in dev; bind `correlation_id` from middleware (spec §9.1, observability rule)
- [ ] structlog `redact_processor` wired (uses existing `redact()`)
- [ ] Replace ad-hoc `print`/exception logging with `structlog.get_logger().info("step.completed", ...)` using stable event names from Appendix B
- [ ] Test: `structlog.testing.capture_logs` asserts `step.completed` payload shape (spec §B.9 #5)
- [ ] CORS middleware for `tauri://localhost` + `http://localhost:3000` (allow_credentials, no `*`)
- [ ] Replace `MAYRA_LOG_DIR` default with `MAYRA_DATA_DIR/logs` derived path

---

## Stage T4 — Memory tasks + first contract surface   `[lane: A]`

- [x] `api/memory_tasks.py` — `MemoryTaskRegistry` (create / abort / approve / message queue)
- [x] `api/schemas.py` — strict bodies for `tasks`/`message`/`approve`/`validate`/`logs`
- [x] Contract tests (11): `/healthz`, 401, 400 host, create, abort, message, approve, validate, ui-logs redact, SSE, 422 envelope
- [x] `tests/contract/conftest.py` — ASGITransport client + `FakeModelClient`/`FakeBrowser` stubs (B.8 shape)

### Outstanding
- [ ] Replace approval-id-equals-task-id stub with a real `ApprovalRegistry` keyed by uuid (so multiple in-flight approvals work)
- [ ] `POST /v1/tasks/{id}/message` validates `task_id` belongs to current user (RLS-aware once Supabase lands)
- [ ] Lifespan teardown: cancel all tasks, close clients (spec §4.3)
- [ ] Per-router files (`routes/health.py`, `routes/tasks.py`, …) instead of one fat `app.py` — refactor when next route lands

---

## Stage T5 — Agent loop (the core)   `[lane: A]`

Five paths must each have a failing contract test **before** the loop body is written (§B.7):

- [ ] `agent_loop.run_task(state, app)` skeleton with cancellation checkpoints (spec §5.3)
- [ ] `TaskState` dataclass (history deque, `paused_for`, `pending_approval`, `abort_event`, `approval_event`, `correlation_id`) (spec §5.1)
- [ ] `step_budget` integration (consume_step / consume_repair / consume_retry)
- [ ] Per-step pipeline:
  - [ ] `asyncio.TaskGroup` parallel snapshot + screenshot + history
  - [ ] `build_prompt()` → `model_client.complete_streaming()` with `on_token` SSE pump
  - [ ] `parse_chat_and_action()` → on `SchemaRepairableError` spend 1 repair attempt
  - [ ] `validate_against_snapshot(action, snapshot)` (ref exists, fresh)
  - [ ] `reclassify_risk()`
  - [ ] Approval gate via `asyncio.Event` with `wait_for(timeout=300)` (F10)
  - [ ] `browser.execute(action)` + `BrowserResult`
  - [ ] `save_screenshot()` (local file, per §C)
  - [ ] `step.completed` structlog log (per-step JSON shape, observability rule)
  - [ ] `is_terminal()` → `done event status=success`
- [ ] Wire `/v1/chat/stream` to a real per-task `asyncio.Queue` fed by the loop, replacing the current canned 4-event stub
- [ ] Wire `/v1/tasks` to spawn the loop into `TaskRegistry: dict[task_id, asyncio.Task]`
- [ ] Wire `/v1/tasks/{id}/abort` to `task.cancel()` + await `CancelledError`
- [ ] `/v1/tasks/{id}/message` queues into `state.history` for next prompt (F8)

### Five contract tests (red first)
- [ ] **Success** path — fake model returns valid action → executed → `done success`
- [ ] **Approval** path — model returns delete-button click → approval event → `approve` releases loop
- [ ] **Abort** path — long-running task → POST abort → `done aborted` within 1 s
- [ ] **Budget exhausted** path — set `max_steps=1` → after one step → `done budget_exhausted`
- [ ] **Repair-then-fail** path — first response malformed, second still malformed → `done failed` with `repair_budget`

---

## Stage T6 — Provider HTTP adapters   `[lane: C]`

- [x] `providers/gemini.py` — `gemini_list_models(client, api_key)` health probe
- [x] 4 respx tests (200, 401, 429, 503)

### Outstanding
- [ ] `providers/base.py` — `ModelClient` Protocol (`complete_streaming`, `health_check`, `aclose`) (spec §6.1)
- [ ] `providers/gemini.py` — full `GeminiClient` (vision, streaming, `inline_data` for WebP) (spec §6.2)
- [ ] `providers/grok.py` — OpenAI-compat schema, data-URL image, streaming
- [ ] `providers/cloudflare.py` — `@cf/meta/llama-3.2-11b-vision-instruct`, byte image
- [ ] `providers/factory.py` — `build_provider_clients(settings)`; one `httpx.AsyncClient` each in `lifespan`
- [ ] `tenacity` retry policy: exp jitter, retry on 429/5xx, non-retryable on 401/403
- [ ] `aiolimiter.AsyncLimiter(throttle_rpm, 60)` per provider + `asyncio.Semaphore(2)` per provider (spec §6.3)
- [ ] `respx` tests per provider: happy path, retry-after-429, non-retryable 401, streaming chunks → `on_token`
- [ ] Wire `POST /v1/settings/validate` to actually call `gemini_list_models` (or grok/cloudflare equivalents) when API key present
- [ ] Provider key handling: read `MAYRA_PROVIDER_KEYS_BASE64` once at startup → `dict[str, SecretStr]`, then `os.environ.pop(...)` (spec §6.4)

---

## Stage T7 — `agent-browser` adapter   `[lane: B]`

- [ ] `browser/adapter.py` — `AgentBrowserAdapter` (`doctor`, `open`, `snapshot`, `screenshot_annotated`, `execute`, `close_all`)
- [ ] `browser/policies/mayra-default.json` — deny `eval/download/upload/clipboard/cookies/storage/network.route/addinitscript`
- [ ] `agent-browser doctor --json` at startup; gate task execution
- [ ] Per-task `--session $task_id`, `--allowed-domains`, `--content-boundaries`, `--max-output 20000`, `--action-policy`, `--confirm-actions eval,download,upload`
- [ ] Headed by default (no `--headless`); CDP attach mode (`--cdp <port>`) when user picked existing Chrome (F4)
- [ ] WebP screenshot recompress (Pillow, quality 75, ≤1280 px long edge) (spec §11.2)
- [ ] `save_screenshot(state, screenshot, kind)` writes to `MAYRA_DATA_DIR/screenshots/<task_id>/<step>-<kind>.webp` (spec §C.4)
- [ ] Manual takeover detection: compare `observation_hash`; matching → 30 s auto-resume, differing → wait for `approve resume:<task_id>` (spec §A.6, F11)
- [ ] OTP detection: pattern matches password/otp/verification on textbox → emit `wait` action + Tauri notification (F12)
- [ ] `BrowserError` on non-zero exit; **no** auto-retry of whole task (spec §7.3)
- [ ] On orchestrator shutdown: `agent-browser close --all` in lifespan finally
- [ ] Integration test (skipped today): see `tests/integration/test_agent_browser_skips.py` and unskip per case

---

## Stage T8 — Tauri shell (`apps/desktop`)   `[lane: E]`

> Whole `apps/desktop/` directory does not exist yet — all rows below are todos.

### Project setup
- [x] `apps/desktop/package.json` (only `scripts.tauri = "tauri"` + dev deps)
- [ ] `apps/desktop/src-tauri/Cargo.toml`, `Cargo.lock`
- [ ] `tauri.conf.json` per spec §2.1 (NSIS, embedBootstrapper, currentUser, updater inactive)
- [ ] CSP: `default-src 'self'`, `connect-src 'self' http://127.0.0.1:* https://*.supabase.co`, `img-src 'self' data: asset: https://*.supabase.co`
- [ ] `app.security.assetProtocol.scope = ["$APPLOCALDATA/Mayra/screenshots/**"]` (spec §C.3)

### Capabilities (split per surface, spec §2.2)
- [ ] `capabilities/main-window.json`
- [ ] `capabilities/sidecar.json` — `shell:allow-execute` with arg validators (`^--port=\d{4,5}$`, `^--token=…$`, `^--data-dir=…$`)
- [ ] `capabilities/secure-store.json` (keyring only, no Stronghold)
- [ ] `capabilities/notifications.json`
- [ ] `capabilities/updater.json` (declared but inactive)

### Rust commands (spec §2.3, narrow surface)
- [ ] `start_sidecar` → returns `{ port, token }`
- [ ] `stop_sidecar`
- [ ] `save_provider_key(provider, key)` → keyring + sidecar restart
- [ ] `provider_key_status(provider)` → `{ configured, last4 }`
- [ ] `get_device_id`
- [ ] `open_data_dir`
- [ ] `notify(title, body)`
- [ ] `os_open_external(url)` — allowlist `https://*.supabase.co`

### Sidecar lifecycle (`sidecar.rs`, spec §2.4)
- [ ] Free-port allocator + 48-byte random token
- [ ] Spawn orchestrator with env (provider keys b64, data dir, Supabase vars)
- [ ] Health-poll `/healthz` 200 ms × 50 → emit `orchestrator-ready { port, token }`
- [ ] Backoff restart on crash (1, 2, 4, 8 s) → `orchestrator-failed`
- [ ] On `RunEvent::ExitRequested` → `POST /v1/shutdown` → wait 2 s → `child.kill()`

### Other plugins
- [ ] `tauri-plugin-single-instance` (focus existing window) (F1)
- [ ] `tauri-plugin-keyring` for device id + provider keys (no `tauri-plugin-store`!)
- [ ] `tauri-plugin-log` file rotation in app data dir
- [ ] `tauri-plugin-notification` for OTP / retention warnings

### Rust tests (`cargo test`)
- [ ] `picks_an_unused_loopback_port_and_releases_it`
- [ ] `generates_token_of_length_48_url_safe`
- [ ] `roundtrip_device_id_via_keyring` (mock backend)
- [ ] `disallows_unregistered_sidecar_argument` (parse capability JSON, assert validators)

---

## Stage T9 — Next.js UI (`apps/web`)   `[lane: F]`

### Done
- [x] `lib/orchestrator-client.ts` (`createTask`, `abort`, `postTaskMessage`)
- [x] `lib/sse.ts` (`parseSseText`)
- [x] Vitest tests for both (5 tests green)

### Project setup
- [ ] `apps/web/next.config.ts` per spec §3.1 (`output:'export'`, `images.unoptimized:true`, `trailingSlash:true`)
- [ ] `apps/web/tsconfig.json` extends `@mayra/config/tsconfig.base.json`
- [ ] Tailwind or vanilla CSS (pick one — minimal, no design system)
- [ ] Install React 19 + Next 15 deps (currently web/package.json only has vitest+ts)
- [ ] `app/layout.tsx`, `app/page.tsx` (root)

### Routes (F1–F20)
- [ ] `/` — onboarding gate (provider not set → onboarding, else redirect `/chat`)
- [ ] `/chat`
- [ ] `/settings`
- [ ] `/logs` (Supabase paginated)
- [ ] `/logs/[task_id]` — client-rendered (static export quirk: no `dynamicParams`)

### Hooks & state
- [ ] `useTauri()` — null until mounted
- [ ] `useSidecarReady()` — listens for `orchestrator-ready`
- [ ] `useChatStream(taskId)` — opens EventSource, dispatches token/action/status/approval/done
- [ ] Single `OrchestratorContext` (skip Jotai per §A.18 unless cross-tab needed)

### Components
- [ ] `chat/ChatWindow`, `MessageList`, `MessageUser`, `MessageAssistant`, `MessageSystemStatus`, `MessageActionLog`, `MessageApprovalRequest`, `Composer`, `TypingIndicator`, `AbortButton`
- [ ] `onboarding/ProviderSetupCard`, `ChromeChoiceCard`, `RemoteDebuggingWizard` (Windows registry hint, copy-launch-cmd, warning) (F4)
- [ ] `settings/ProviderSettings`, `SafetySettings`, `RetentionSettings`
- [ ] `live/LivePreviewPanel` — renders latest `screenshot_path` via `convertFileSrc` (F7)
- [ ] `common/AnnotatedScreenshot`, `Modal`, `Banner`, `ConfirmDialog`

### Vitest + RTL tests (§B.4)
- [ ] `useChatStream` appends token deltas to last assistant message
- [ ] `MessageActionLog` renders `[REDACTED:password_field]` for password targets
- [ ] `ChromeChoiceCard` selection calls `createTask` with correct payload
- [ ] `AbortButton` calls abort endpoint and disables until `done`
- [ ] `MessageApprovalRequest` calls `/v1/actions/approve` on click

### Supabase browser client
- [ ] `lib/supabase-browser.ts` — `@supabase/supabase-js` with publishable key + anon JWT
- [ ] First-run anonymous sign-in + `device_id` linkage to `user_metadata` (F2, spec §8 supabase rule)

---

## Stage T10 — Supabase   `[lane: D]`

- [ ] `supabase/config.toml`
- [ ] `supabase/migrations/0001_init.sql` — sessions, tasks, steps, actions, screenshots, evaluations (spec §8.1)
- [ ] `supabase/migrations/0002_rls.sql` — `enable + force RLS`, permissive own-rows, restrictive deny update/delete on audit, anon-no-delete on tasks
- [ ] **Drop** `0003_storage.sql` (screenshots local per §C)
- [ ] **Drop** `0004_retention.sql` (replaced by orchestrator coroutine §C.6)
- [ ] `seed.sql` (optional dev fixture)
- [ ] `supabase/client.py` — service-role client (orchestrator)
- [ ] `supabase/repositories.py` — `insert_session/task/step/action/screenshot/evaluation` (all redact + explicit `user_id`)
- [ ] `retention.py` — `retention_loop()` deletes local screenshot dirs + old tasks every 6 h (spec §C.6)
- [ ] First-task lazy session creation (no explicit `/v1/sessions` endpoint per §A.5, F5)
- [ ] Tests: pytest fixture spinning local Supabase via `supabase` CLI, asserts RLS denies cross-user reads
- [ ] Repository test: insert step → grep that no provider key / password value lands in any column

---

## Stage T11 — Benchmarks, packaging, release   `[bench → lane H, packaging+CI → lane G]`

### Bench
- [ ] `bench/runner.py` (spec §13.2) — runs YAML specs, writes to `evaluations`
- [ ] `bench/tasks/<name>.yaml` — first benchmark spec (per PRD §3, 5–10 curated)
- [ ] `bench/baselines/<name>.spec.ts` — Playwright deterministic baseline
- [ ] `success_criteria` evaluator: `agent-browser get url` / `get text` / file-existence (no LLM judging)
- [ ] At least 3 fixture sites in `tests/fixtures/sites/`

### Packaging
- [ ] `scripts/rename-sidecar.mjs` — copies PyInstaller binary to `src-tauri/binaries/mayra-orchestrator-<triple>.exe`
- [ ] `scripts/release-pipeline.mjs` — full chain (contracts codegen → next build → pyinstaller → tauri build)
- [ ] PyInstaller spec: `--onedir --strip --paths apps/orchestrator --paths packages/contracts/python`
- [ ] `pnpm tauri build` produces NSIS `-setup.exe`
- [ ] Document `npm i -g agent-browser@<pinned>` + `agent-browser install` in onboarding (spec §A.17)
- [ ] Updater wiring deferred (§A.8) — keep `pubkey` placeholder

### CI (`.github/workflows/`)
- [ ] `verify.yml` — matrix: ubuntu (lint+typecheck+test), windows (full + integration), macos smoke
- [ ] Cache pnpm store, uv cache, cargo registry, Tauri bundler
- [ ] `release.yml` — tag → builds + uploads NSIS artifact

---

## Cross-cutting / non-functional

### Security audit (spec §10)
- [ ] Verify host header guard rejects external `Host`
- [ ] Verify token compared with `hmac.compare_digest`
- [ ] Verify provider keys never appear in any log file (grep test post-run)
- [ ] Verify `agent-browser` invocation never forwards model output as args
- [ ] Verify Supabase secret key absent from web bundle (build inspect)
- [ ] Verify `MAYRA_PROVIDER_KEYS_BASE64` env var wiped after read

### Performance budgets (spec §11)
- [ ] Snapshot+screenshot parallel ≤ 600 ms p95
- [ ] Per-step total ≤ 3.5 s p95 (post §C local screenshots)
- [ ] SSE first byte ≤ 800 ms after step start
- [ ] Sidecar boot ≤ 1.5 s

### Observability (spec §9)
- [ ] structlog `JSONRenderer` in prod, `ConsoleRenderer` in dev
- [ ] Per-step `step.completed` log with full schema (correlation_id, observation_hash, intended/executed action, latency_ms.{model,browser,total}, retries, step_budget_remaining)
- [ ] Stable event names: see Appendix B of the spec
- [ ] `redact_processor` runs on every record
- [ ] No `print()` anywhere in `mayra_orchestrator/`

### TDD discipline
- [x] §B.1 — 12 first-failing pure tests green (35 unit + 4 contracts)
- [x] §B.2 — 11 contract tests green (httpx ASGITransport)
- [~] §B.3 — 4 integration files exist, all `pytest.skip` until stage T7 lands
- [~] §B.4 — 3 web tests green (orchestrator-client × 3, sse × 2); 5 RTL tests still pending
- [ ] §B.5 — 4 Rust tests
- [ ] §B.6 — coverage gates wired (Python ≥ 85 % branch, TS ≥ 80 %, Rust ≥ 70 %)

---

## "Done already" snapshot (as of last session)

| Suite | Count | Status |
|--------|--------|--------|
| Python unit (`tests/unit`) | 35 | ✅ green |
| Python provider (gemini respx) | 4 | ✅ green |
| Python contract (`tests/contract`) | 11 | ✅ green |
| Python integration (skipped) | 4 | ⏸ awaiting T7 |
| TS contracts vitest (action schema) | 4 | ✅ green |
| TS web vitest (`apps/web`) | 5 | ✅ green |
| **Total green** | **59** | |

Modules implemented:

```
apps/orchestrator/mayra_orchestrator/
├─ __init__.py, __main__.py
├─ settings.py, errors.py, perf.py, step_budget.py, parser.py
├─ redaction.py, snapshot.py, risk.py
├─ actions/{__init__.py, schema.py, mapper.py}
├─ prompts/{__init__.py, templates.py}
├─ providers/{__init__.py, gemini.py}            # only list_models probe
└─ api/{__init__.py, app.py, correlation.py, deps.py,
        exceptions.py, memory_tasks.py, schemas.py}

packages/contracts/{schemas/action.schema.json, fixtures/*.json,
                    test/schema.test.ts, package.json, tsconfig.json,
                    vitest.config.ts}

apps/web/src/lib/{orchestrator-client.ts, orchestrator-client.test.ts,
                  sse.ts, sse.test.ts}
```

Not started: `apps/desktop/`, `supabase/`, `bench/`, `scripts/`, `agent-browser` adapter, full agent loop, real provider streaming, structlog wiring, Next.js pages, anything CI.

---

## How to use this list

1. Pick a **lane** from the *Parallel lanes* table that nobody else is on.
2. `git fetch && git switch -c lane/<id>-<slug> origin/main`.
3. Open this file. Find the topmost `[ ]` row inside any stage tagged with your lane.
4. Write the failing test first (`tests/unit/test_<unit>.py` or `tests/contract/...`).
5. Run `npm run test` — confirm the new test fails for the right reason.
6. Implement minimum code to pass; stay inside your lane’s file scope (see the *Owner scope* column).
7. Re-run; confirm green.
8. Flip `[ ]` → `[x]` in this file, commit in the small-commit style:
   - `test(<lane>): <unit> — red`
   - `feat(<lane>): <unit> — green`
   - `refactor(<lane>): <unit>` (optional)
   - `docs: tick <unit> in build checklist`
9. Open a PR for your branch when the stage (or a coherent slice) is complete.

If your lane is blocked by a shared file (see *Shared files* table), pause and either (a) open a small targeted PR from a different lane to unblock, or (b) escalate to the operator.

---

## Sources

- `docs/MAYRA_PRD.md`
- `docs/MAYRA_TECHNICAL_SPEC.md` (§A v1 cuts, §B TDD, §C local screenshots, §0–§15)
- `docs/MAYRA_DESKTOP_UX_FLOWS.md` (F1–F20)
- `.cursor/rules/*.mdc`
