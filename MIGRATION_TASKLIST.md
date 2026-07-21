# Mayra Cloud Migration — Tasklist

Tracking the migration from the plan. Each phase is small and independently demonstrable.

## Phase 0: Env-driven refactor (no behavior change) ✅

Un-hardcode all localhost assumptions. All existing tests pass. No new features.

### Contracts
- [x] 0.1 Add `screenshot_url` optional field to `message.schema.json` (ActionLogMessage + ApprovalRequestMessage)
- [x] 0.2 Add `screenshot_url` to Python `mayra_contracts/models.py`
- [x] 0.3 Regenerate `packages/contracts/src/generated.ts` (+ fix `MESSAGE_DEF_STUBS` in codegen.mjs)
- [x] 0.4 Verify contracts: `test:contracts` (29/29) + `test:contracts:py` (29/29) pass

### Orchestrator (Python)
- [x] 0.5 `settings.py` — add new fields (mode, auth_mode, shared_password, cors_origins, allowed_hosts, chromium_launch_mode, chromium_flags, screenshot_base_url, screenshot_dir) all defaulting to existing behavior
- [x] 0.6 `api/app.py` — make CORS conditional on `settings.cors_origins` (default = existing hardcoded)
- [x] 0.7 `api/app.py` — make host middleware conditional on `settings.allowed_hosts` (default = existing 127.0.0.1/localhost check)
- [x] 0.8 `__main__.py` — make uvicorn host configurable via `MAYRA_HOST` env (default `127.0.0.1`)
- [x] 0.9 `api/deps.py` — add `request.state.user_id` support to `get_effective_owner_id` (no behavior change yet)
- [x] 0.10 Verify orchestrator: `pytest -m "not integration"` — all pass (1 pre-existing env failure: test_sessions_connect_and_snapshot requires real Chrome on port 9222)

### Web (Next.js)
- [x] 0.11 `orchestrator-client.ts` — change constructor from `(port, token)` to `(baseUrl, token)`, update `base()` method, add `screenshot_url` to response types
- [x] 0.12 `useChatStream.ts` — accept `baseUrl` instead of `port`
- [x] 0.13 `orchestrator-mutations.ts` — change `postApprove(port, ...)` to `postApprove(baseUrl, ...)`
- [x] 0.14 `orchestrator-context.tsx` — construct `OrchestratorClient` with `http://127.0.0.1:${port}` as baseUrl, expose `baseUrl` in context
- [x] 0.15 `ChatWindow.tsx` + `MessageList.tsx` + `MessageApprovalRequest.tsx` — update all call sites to pass `baseUrl`
- [x] 0.16 `orchestrator-client.test.ts` — update 3 constructor calls
- [x] 0.17 `ChromeChoiceCard.test.tsx` + `MessageApprovalRequest.test.tsx` — update constructor + prop calls
- [x] 0.18 Verify web: `vitest run` — 17/17 pass, `tsc --noEmit` — clean

### Phase 0 sign-off
- [x] 0.19 All tests pass (contracts 29+29, web 17/17, orchestrator all non-integration), typecheck clean, Python app construction verified
- [ ] 0.20 Manual smoke test: desktop dev mode works end-to-end (requires Tauri shell — user to verify)

---

## Phase 1: Orchestrator runs in Modal (no UI changes) ✅

Cloud orchestrator with in-container Chromium. Verifiable with curl.

- [x] 1.1 `browser/cloud_launcher.py` — Chromium process management (launch, kill, kill_all)
- [x] 1.2 `browser/cloud_adapter.py` — wraps AgentBrowserAdapter with cloud launcher (composition + __getattr__)
- [x] 1.3 `api/app.py` — in cloud mode, construct CloudBrowserAdapter + CloudLauncher + SessionStore
- [x] 1.4 `api/routes/screenshots.py` — `GET /v1/screenshots/{path}` HTTP endpoint with path traversal guard
- [x] 1.5 `api/routes/auth.py` — `POST /v1/auth/login` (password gate + rate limiting)
- [x] 1.6 `api/session_store.py` — in-memory session token store (SessionInfo, validate, revoke)
- [x] 1.7 `api/deps.py` — `require_bearer` mode-aware (password mode checks SessionStore, sets request.state.user_id)
- [x] 1.8 `api/routes/chat_stream.py` — inline auth mode-aware + SSE keepalive (15s comment lines)
- [x] 1.9 `api/routes/wire.py` — mount auth + screenshots routers (screenshots only when screenshot_base_url set)
- [x] 1.10 `api/routes/shutdown.py` — disable in cloud mode (403)
- [x] 1.11 `agent_loop.py` + `sessions.py` — populate `screenshot_url` when `screenshot_base_url` is set (5 route responses + 3 SSE emit functions)
- [x] 1.12 `modal_app.py` — Modal entrypoint (`@modal.asgi_app()`, image, volume, secrets, concurrency)
- [x] 1.13 `Dockerfile` — Python 3.12 + Chromium + agent-browser (alternative to fluent API)
- [x] 1.14 Cloud-mode construction verified (12/12 new tests pass: auth, screenshots, shutdown, URL helper)
- [x] 1.15 Deployed to Modal — image builds, orchestrator runs, all endpoints verified with curl
- [x] 1.16 End-to-end test passed: login → cloud Chromium session → task creation → SSE streaming (real tokens from OpenRouter) → screenshot capture + HTTP serving (686 bytes valid WebP)
- [x] 1.17 Fixed deployment bugs: Modal v1.5.2 API (`add_local_dir` not `copy_local_dir`), agent-binary npm symlink conflict, SSE owner_id resolution (auth must run before owner_id), screenshot path resolution (Modal volume symlinks + stale env var cache)

---

## Phase 2: Web-deployed mode with password auth ✅

Standalone web deployment, cloud-only, password-gated.

- [x] 2.1 `lib/mode.ts` — `isWebMode()`, `isDesktopMode()`, `getCloudOrchestratorUrl()`
- [x] 2.2 `lib/screenshot.ts` — `resolveScreenshotSrc(path, url)` helper (URL-first, falls back to Tauri asset protocol)
- [x] 2.3 `providers/cloud-auth-context.tsx` — `CloudAuthProvider` + `useCloudAuth()` (login/logout/token/userId, localStorage persistence)
- [x] 2.4 `app/login/page.tsx` — password gate page
- [x] 2.5 `app/layout.tsx` — mount `CloudAuthProvider`, wrap with `WebAuthGate`
- [x] 2.6 `components/common/WebAuthGate.tsx` (new) — client-side route guard for web mode
- [x] 2.7 All 5 screenshot components use `resolveScreenshotSrc`: `ChatObservationThumbnail`, `MessageApprovalRequest`, `LivePreviewPanel`, `AnnotatedScreenshotCapture`
- [x] 2.8 Local-only components gated behind `!isWebMode()`: `OnboardingFlow`, `SessionsPage`, settings page (BrowserDetectionCard + AnnotatedScreenshotCapture), `ProviderSettings` (web-mode message)
- [x] 2.9 `orchestrator-context.tsx` — web mode constructs cloud client from env + `useCloudAuth()` token; desktop mode unchanged (local sidecar)
- [x] 2.10 `useSidecarReady.ts` — short-circuits in web mode (returns null immediately)
- [x] 2.11 `chat-stream-reducer.ts` — passes through `screenshot_url` from action/approval/step_meta events
- [x] 2.12 Web-mode build verified: `NEXT_PUBLIC_MAYRA_MODE=web NEXT_PUBLIC_CLOUD_ORCHESTRATOR_URL=... next build` — 9 static pages incl `/login`, typecheck clean, 17/17 tests pass
- [ ] 2.13 Deploy static export to a host (Vercel/Netlify) + verify end-to-end against live Modal orchestrator (user action)

---

## Phase 3: Desktop Local/Cloud per-task toggle ✅

Desktop users can choose Local or Cloud per task, concurrently.

- [x] 3.1 `tauri.conf.json` — added `https://*.modal.run` to CSP `connect-src` + `img-src`
- [x] 3.2 `orchestrator-context.tsx` — added `cloudClient`, `cloudBaseUrl`, `cloudToken`, `cloudAvailable` to context (desktop: separate from local `client`; web: same as `client`)
- [x] 3.3 `components/chat/LocalCloudToggle.tsx` (new) — segmented control with Local/Cloud icons
- [x] 3.4 `components/chat/CloudLoginDialog.tsx` (new) — password login dialog for desktop cloud mode
- [x] 3.5 `components/chat/Composer.tsx` — mounts `LocalCloudToggle` when `showTargetToggle` is true
- [x] 3.6 `components/chat/ChatWindow.tsx` — tracks `target` state, computes `activeClient`/`activeBaseUrl`/`activeToken`, dispatches tasks to selected target; cloud tasks auto-create a managed Chromium session via `connectSession()`
- [x] 3.7 `lib/orchestrator-client.ts` — `connectSession()` now accepts optional `cdpPort` (null = cloud managed Chromium)
- [x] 3.8 Desktop build verified: 9 pages, typecheck clean, 17/17 tests pass
- [x] 3.9 Web build verified: 9 pages, typecheck clean
- [ ] 3.10 Manual smoke test: local + cloud tasks run concurrently in Tauri shell (requires Modal deployment + desktop build — user action)

---

## Phase 4: State survives container restarts

- [ ] 4.1 Modal Volume for screenshots
- [ ] 4.2 `settings.py` — `screenshot_dir` defaults to Volume mount in cloud mode
- [ ] 4.3 `session_store.py` — checkpoint sessions to Volume
- [ ] 4.4 Screenshot cleanup job
- [ ] 4.5 Verify: restart container, screenshots + sessions survive

---

## Phase 5: Hardening

- [ ] 5.1 Modal concurrency config (`max_inputs=4`, `min_containers=1`, `buffer_containers=1`, `scaledown_window=1200`, `memory=4096`, `cpu=2`)
- [ ] 5.2 Login rate limiting
- [ ] 5.3 Chrome process limits + zombie reaping
- [ ] 5.4 `ui_logs.py` — partition by `owner_id`
- [ ] 5.5 Structured logging with `user_id` + `correlation_id`
- [ ] 5.6 Load test: 4-8 concurrent users
