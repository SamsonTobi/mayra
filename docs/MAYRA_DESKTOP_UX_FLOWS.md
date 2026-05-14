# Mayra Desktop — UX Flows & Implementation Map

This document enumerates user-visible flows in the **Tauri + Next.js (static export)** desktop shell and ties each flow to **FastAPI orchestrator** behavior, **SSE** events, **Supabase** usage, and **Tauri** commands. It is derived from `MAYRA_PRD.md`, `MAYRA_TECHNICAL_SPEC.md` (including §A v1 simplifications), and `rules-decisions.md`. When the PRD and spec disagree, the **spec §A overrides** win unless the PRD is explicitly about product intent (then both are noted).

---

## 1. References & scope

| Source | Role |
|--------|------|
| PRD §5–§8 | Headed browsing, onboarding, chat, steering, HITL, 2FA, abort |
| Technical spec §2–§3, §5, §7, §C | Tauri surface, UI routes, agent loop, browser adapter, local screenshots |
| Technical spec §A | v1 cuts: no WS for chat, no `/v1/sessions`, steering/resume via `/message` and synthetic approve id, local-only screenshot files |
| Safety contracts (rules) | Action schema, approval enforcement in orchestrator |

**Out of scope for this doc:** benchmark harness, CI, migrations detail — only where they touch a user-visible flow.

---

## 2. Runtime map (who does what)

| Concern | Layer | Implementation |
|---------|--------|----------------|
| Window, single instance, OS notifications, keyring, sidecar process | **Tauri** (`apps/desktop`) | Commands: `start_sidecar`, `stop_sidecar`, `save_provider_key`, `provider_key_status`, `get_device_id`, `open_data_dir`, `notify`, guarded `os_open_external` |
| Layout, chat, onboarding, settings, logs browsing | **Next.js static UI** (`apps/web`) | Routed pages; `OrchestratorClient` + `EventSource` to loopback orchestrator |
| Reasoning, validation, risk, approvals, persistence, `agent-browser` | **Orchestrator** (`apps/orchestrator`) | FastAPI on `127.0.0.1`; bearer token from Tauri |
| Task/step metadata, RLS-scoped reads | **Supabase** | UI: publishable key + anon JWT. Writes to audit tables: orchestrator with secret key |
| Step screenshots | **Local disk** (`MAYRA_DATA_DIR/screenshots/...`) | Orchestrator writes WebP; UI shows via `convertFileSrc` + asset protocol scope |

---

## 3. Navigation & information architecture

| Route | Primary purpose | Spec section |
|-------|-----------------|--------------|
| `/` | Onboarding gate: provider + Chrome mode before chat | §3.2 (note PRD “every launch” vs spec’s “redirect when ready” — **product**: show Chrome/mode every launch §3.7; **routing**: first-time or missing provider stays on onboarding) |
| `/chat` | Composer, message stream, live preview, abort | §3.2 |
| `/settings` | Providers, headed/headless, auto-submit, step budget, retention, open folders, factory reset | §3.2 |
| `/logs` | Past tasks (Supabase, infinite scroll) | §3.2 |
| `/logs/[task_id]` | Task drill-down (client-side params; static export constraint) | §3.2 |

---

## 4. Global primitives (shared across flows)

### 4.1 Sidecar handshake

1. UI calls Tauri `start_sidecar`.
2. Rust picks port, generates bearer token, passes env (`MAYRA_PROVIDER_KEYS_BASE64`, `MAYRA_DATA_DIR`, Supabase vars), spawns orchestrator binary.
3. Poll `GET /healthz` until ready; emit `orchestrator-ready { port, token }`.
4. UI builds `OrchestratorClient` with `http://127.0.0.1:{port}` and `Authorization: Bearer {token}`.

Failure UX: `orchestrator-failed` after backoff — surface banner + retry.

### 4.2 Authenticated calls to orchestrator

All mutating/ privileged HTTP uses the bearer header. **SSE exception:** `EventSource` cannot set headers → `GET /v1/chat/stream?task_id=…&token=…` with orchestrator accepting token from query **or** header (constant-time compare). CSP `connect-src` must allow loopback.

### 4.3 SSE event kinds (server → UI)

| SSE `event` | UX purpose | Typical handler |
|-------------|------------|-----------------|
| `token` | Streaming assistant text | Append to in-progress assistant bubble |
| `action` | Action log card + optional `screenshot_path` for live preview | Push `MessageActionLog`; refresh `LivePreviewPanel` via `convertFileSrc` |
| `status` | System line (“Paused for 2FA”, takeover, errors) | `MessageSystemStatus` |
| `approval` | Block interaction until user decides | Modal / `MessageApprovalRequest` |
| `done` | Task finished | Close stream, final status badge, re-enable composer |
| `error` / connection error | Show failure, correlation id if present | Toast + support copy |

v1: **no** WebSocket for chat/preview; preview updates **once per step** from `action` payload (§A.2, §3.6).

### 4.4 Local screenshots

Paths live under `%LOCALAPPDATA%\com.mayra.app\Mayra\screenshots\` (Windows). DB row may still record `object_path` for ordering/replay; **images are not in Supabase Storage** in v1 (§C). UI must not assume signed URLs — use file URL via Tauri asset protocol.

### 4.5 Supabase anonymous session

UI signs in anonymously (Turnstile deferred §A.12). `user_id` on tasks/steps comes from JWT `sub`. Device id from Tauri keyring correlates device without putting secrets in the web bundle.

---

## 5. Flow catalog

### F1 — App cold start & single instance

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Existing window focused **or** splash/loading | `tauri-plugin-single-instance`: second process exits after focusing first |
| 2 | Brief “Starting engine…” | `start_sidecar` lifecycle §2.4 |
| 3 | Main shell ready | `orchestrator-ready` received; optional parallel Supabase `signInAnonymously` if not already signed in |

---

### F2 — Device identity (first run)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Nothing explicit (no modal required in spec) | `ensure_device_id` in keyring §2.5 |
| 2 | — | `get_device_id` command if UI needs to display or bind telemetry |

---

### F3 — Onboarding: provider setup

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Provider choice + API key fields | `ProviderSetupCard` §3.3 |
| 2 | “Validate” result (latency / error) | `POST /v1/settings/validate` with `{ provider, model }` §4.5 |
| 3 | Key persisted | Tauri `save_provider_key` → keyring; **sidecar restart** so `MAYRA_PROVIDER_KEYS_BASE64` reloads §A.4, §2.3 |

Mask only: `provider_key_status` for “configured / last4”.

---

### F4 — Onboarding: Chrome connection (every launch, PRD §5)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Default: **Managed Chrome** (agent-managed window) | Task creation passes headed/headless from settings |
| 2 | Option: **Connect existing Chrome** | `RemoteDebuggingWizard`: registry hint for Chrome path, copy launch command with `--remote-debugging-port`, warning banner §3.7 |
| 3 | “Try auto-connect” | Orchestrator reaches CDP endpoint (health / ping) — exact endpoint is adapter concern |
| 4 | Last choice remembered as default | Local preference (settings atom / Supabase settings row — follow whichever the implementation chooses for non-secret prefs) |

**agent-browser:** v1 expects binary on `PATH` after global install; onboarding copy should explain `npm i -g agent-browser@<pinned>` + `agent-browser install` (§A.17).

---

### F5 — Enter main chat & start a task

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Chat layout + empty state or prior messages | `/chat` |
| 2 | User types goal + optional seed URL / allowed domains (UX detail as designed) | Composer |
| 3 | “Running…” / typing indicator | After `POST /v1/tasks` returns `task_id` |
| 4 | Opens SSE | `OrchestratorClient.streamChat(task_id, …)` §3.4 |

**Task create body (conceptual):** goal, `allowed_domains`, optional `seed_url`, budgets/temperature/provider from settings — align with orchestrator router (spec table §4.5 still lists `session_id` in one row; **§A.5** removes explicit `POST /v1/sessions` — first task lazily creates session row server-side).

---

### F6 — Streaming assistant reply & step progress

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Tokens appear in assistant message | `event: token` |
| 2 | Step status line | `event: status` |
| 3 | Action card (type, target ref summary, risk color) | `event: action` after validation + execution |
| 4 | Thumbnail / screenshot in card or side panel | `screenshot_path` local file → `convertFileSrc` §C.3 |

**Redaction:** Orchestrator runs `redact_for_display`; UI runs `redact()` again before render §3.5.

---

### F7 — Live preview panel

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Large still of latest page state | `LivePreviewPanel` bound to last `action` event’s `screenshot_path` §3.6 |
| 2 | Updates every agent step (~2–4 s typical) | Not real-time video stream in v1 |

---

### F8 — Mid-run steering (“actually, go to…”)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | User sends message while task running | Same composer as idle |
| 2 | Message appears; model incorporates next step | `POST /v1/tasks/{id}/message` `{ text }` §A.6 (replaces removed `/steer` and `/resume` for steering copy) |

Orchestrator queues text into the running loop’s next prompt construction.

---

### F9 — Hard abort

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Prominent **Abort** | `AbortButton` §B.4 |
| 2 | Task stops; browser command interrupted soon | `POST /v1/tasks/{id}/abort` → `CancelledError` in loop §5.3 |
| 3 | SSE `done` with `status: aborted` | UI resets running state |

---

### F10 — High-risk human approval (HITL)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Modal / card: annotated screenshot + action summary + **Approve** / **Reject** | `event: approval` → `MessageApprovalRequest` §5.6 |
| 2 | Timer (UX: 5 min) | Matches `wait_for(..., timeout=300)` server-side; on timeout → treat as reject §5.6 |
| 3a | Approve | `POST /v1/actions/approve` `{ approval_id, decision:"approve" }` → sets `approval_event` |
| 3b | Reject | same with `decision:"reject"` → loop consumes step, emits status, continues §5.3 |

**Trust boundary:** Orchestrator **must** block execution until approve; UI-only gating is insufficient (safety rule).

---

### F11 — Post–manual-takeover resume (PRD §7)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | “Paused — you interacted with Chrome” (status) | `paused_for = manual_takeover` when user input detected §7.7 |
| 2a | Auto-resume after idle | If new observation hash **matches** previous → 30s idle timer, resume |
| 2b | Page changed | Prompt user to confirm resume |
| 3 | User confirms | **§A.6:** `POST /v1/actions/approve` with synthetic `approval_id: "resume:{task_id}"` (not a separate `/resume` route) |

*Note:* §7.7 still mentions `/resume` in one paragraph; treat **§A.6** as authoritative for v1 API shape.

---

### F12 — 2FA / OTP

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Chat system status: ask user to complete OTP on phone / device | Model emits `wait` + orchestrator classifies OTP pattern (safety rule) |
| 2 | OS toast | Tauri `notify(title, body)` §2.3 |
| 3 | Loop paused until state cleared | No model-invented OTP; user completes in browser |

---

### F13 — Provider / browser / validation failures

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | System status or terminal `done: failed` | `emit_error` / `MayraError` paths §5.3 |
| 2 | “Open logs” from settings | Crash copy §9.5 — implement as `open_data_dir` **or** dedicated `open_log_dir` if added |

v1: **no** automatic provider fallback (§A.10); optional field in settings marked v1.5+.

---

### F14 — Schema repair & budget exhaustion

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | One silent repair attempt | `SchemaRepairableError` → second model call with repair instruction §5.4 |
| 2 | If still invalid | Task ends | `BudgetExhaustedError(reason='repair_budget')` |
| 3 | Step budget hit | `done: budget_exhausted` §5.3; PRD: offer user whether to continue (product copy; continuation may be “new task” in v1) |

---

### F15 — Settings: non-provider preferences

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Headed vs headless, auto-submit basic forms, step budget, retention display | `SafetySettings`, `RetentionSettings` §3.3 |
| 2 | Persist | `GET/POST /v1/settings` (non-sensitive view) where implemented; secrets **never** in this payload |

---

### F16 — Settings: open data / logs folder

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Opens Explorer/Finder to Mayra data root | `open_data_dir` §2.3 (contains `screenshots/` and `logs/`) |

---

### F17 — Logs & task history (cross-session)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Paginated list of tasks | `/logs` — Supabase client in browser, RLS §8.2 |
| 2 | Drill-down | `/logs/[task_id]` client routing §3.2 |
| 3 | Screenshots in history | If `object_path` is local absolute path, same machine can resolve; **other machines** see metadata only (§C.8) |

---

### F18 — Retention warning (PRD §13)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Desktop notification ~24h before deletion window | Orchestrator `retention_loop` + notification hook §C.6 |
| 2 | Data removed after 30d | Local screenshot dirs + `DELETE` old tasks for user §C.6 |

---

### F19 — Graceful app quit

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Window close | `RunEvent::ExitRequested` §2.4 |
| 2 | Sidecar shutdown | `POST /v1/shutdown` with bearer, wait, kill child |
| 3 | Browser cleaned | Adapter `close_all` in lifespan `finally` |

---

### F20 — Factory reset (destructive)

| Step | User sees | Implementation |
|------|-----------|----------------|
| 1 | Confirm dialog in Settings | UI-only prelude |
| 2 | Clear keyring device id / provider keys / local prefs | Sequence of Tauri commands + optional Supabase sign-out (define precisely at implementation time) |

Spec mentions factory reset on `/settings` §3.2; wire to least-surprise behavior (clear secrets + local state, not silent cloud delete unless explicitly designed).

---

## 6. Message types in the chat transcript (PRD §6)

| Message kind | UX shape | Source |
|--------------|----------|--------|
| User | Right-aligned bubble | Composer → persisted in history |
| Assistant | Left-aligned, streamed | SSE `token` + finalize |
| System status | Muted inline system row | SSE `status` |
| Action log | Card: action, risk badge, reason, optional thumb | SSE `action` |
| Approval | Modal / prominent card | SSE `approval` |

---

## 7. Compliance checklist (UX ↔ safety architecture)

- [ ] **Approve** for high-risk always hits orchestrator `POST /v1/actions/approve` before next `agent-browser` command.
- [ ] **Reject** sends decision to same endpoint; loop never executes pending action.
- [ ] **Raw CSS/XPath** never shown as editable — refs come from snapshot/`@eN` only.
- [ ] **Secrets** never stored in `localStorage`; provider keys only via Tauri keyring.
- [ ] **SSE token** in query string is treated as sensitive (do not log URLs).

---

## 8. Known doc tensions (for implementers)

| Topic | Tension | Resolution for v1 |
|-------|---------|-------------------|
| Onboarding routing | §3.2 “else `/chat`” vs PRD “choice every launch” | UX: show compact Chrome/mode selector on each launch; can still land on `/chat` shell |
| Endpoint table §4.5 | Still lists `/v1/sessions`, `/steer` | Follow **§A.5 / §A.6** |
| Manual takeover | §7.7 mentions `/resume` | Use **`approve` + `resume:{task_id}`** §A.6 |
| Approval UI timer copy | “matches signed URL TTL” §3.5 | Signed URLs removed §C — timer is **policy timeout**, not URL TTL |
| `open_log_dir` vs `open_data_dir` | §9.5 vs §2.3 | Expose at least `open_data_dir`; add `open_log_dir` if logs live outside that tree |

---

## 9. Suggested reading order for designers

1. PRD §5–§8 (intent).
2. This file (flows).
3. Technical spec §3.4–§3.7 (exact client wiring).
4. `packages/contracts` event shapes once generated (ground truth for JSON fields).

---

## Sources

- `docs/MAYRA_PRD.md`
- `docs/MAYRA_TECHNICAL_SPEC.md` (§A, §B, §C, §2–§5, §7–§9)
- `docs/rules-decisions.md`
- `.cursor/rules/mayra-agent-safety-contracts.mdc`
- `.cursor/rules/mayra-monorepo-architecture.mdc`
