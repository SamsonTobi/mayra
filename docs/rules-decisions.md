# Mayra Rules — Decisions & Rationale

This document explains how the eight `.cursor/rules/*.mdc` files were redesigned, what the prior pass got wrong or missed, and why each new constraint exists. It is the audit trail for the rule set, not the rule set itself.

---

## What the prior pass got right

- Identified the correct three-runtime split: Tauri/Rust, Next.js (static export), FastAPI/Python.
- Recognised that model output is hostile input and needs a strict action schema.
- Pinned the static-export constraints for Next.js inside Tauri.
- Sourced from official docs (Tauri, Next, FastAPI, pnpm/Turbo, vercel-labs/agent-browser).

## What was wrong or thin

1. **Monorepo rule punted on the polyglot problem.** It said "use Turbo only for JS tasks" but didn't say how Python and Rust are actually managed (no `uv`, no `cargo` toolchain pin, no lockfile policy, no cross-language pre-commit). Real polyglot monorepos die on tooling drift; the rule needed to commit to a concrete stack.
2. **Cross-runtime contracts were a one-liner.** "Put schemas in `packages/contracts`" without a codegen pipeline produces TS and Pydantic files that drift within a week. I committed to JSON Schema as the source of truth with `json-schema-to-typescript` + `datamodel-code-generator` codegen plus a CI drift check.
3. **Tauri rule had no Windows specifics.** The user is on Windows, the primary deployment is Windows, and the prior rule never mentioned MSI/NSIS, WebView2 bootstrapper modes, or `TAURI_SIGNING_PRIVATE_KEY` env-var (it isn't loaded from `.env` — a common AI mistake).
4. **Sidecar guidance was vague.** No mention of the `-target-triple` rename script, the `args.validator` regex shape for the shell permission, or the token-via-stdin pattern. These are the actual production gotchas.
5. **Next.js rule missed Tauri integration shape.** No `assetPrefix`/`TAURI_DEV_HOST`, no `trailingSlash`, no example `tauri.conf.json` `beforeDevCommand`/`frontendDist`. Also missed that `useTauri()` patterns must defer to `useEffect` to avoid SSG hydration errors.
6. **FastAPI rule was generic.** No Pydantic v2 specifics (`ConfigDict`, `SecretStr`), no httpx timeout warning (its default is **no** timeout — the #1 way agent loops hang), no `asyncio.TaskGroup`, no `sse-starlette`, no single-worker constraint, no Tauri↔FastAPI auth (bearer token issued at sidecar spawn).
7. **Safety rule listed rules but didn't define the pipeline.** The new version codifies the exact 4-step validation pipeline, the risk classifier inputs, the repair-budget = 1 rule, and the "redact before logging, not after" ordering — these are the lines AI agents reliably cross.
8. **agent-browser rule didn't verify the actual API.** Some env-var names and flags were guesses. I re-read the README and locked the real ones (`AGENT_BROWSER_SESSION`, `--content-boundaries`, `--allowed-domains`, `--action-policy`, `--confirm-actions`, `--auto-connect`).
9. **No Supabase rule.** The PRD has Supabase as a first-class component with anonymous auth, RLS, and 30-day retention. Skipping it leaves the riskiest cloud surface unguarded.
10. **No observability/testing rule.** PRD §11 specifies a benchmark protocol with quantitative metrics. Without a logging schema and test strategy, the thesis evaluation can't be reproduced.

## High-impact changes (the things worth knowing about)

### Python tooling: chose `uv` over Poetry/pip-tools

- `uv` has a first-class workspace concept that mirrors pnpm/Cargo — one lockfile, multiple members. Poetry has nothing equivalent.
- `uv` is the only Python tool that handles multi-package monorepos without the "vendor your local package as editable in each member" footgun.
- Locks Python at `>=3.12` because Mayra uses `asyncio.TaskGroup` (3.11+) and Pydantic v2 perf is materially better on 3.12.

### Pydantic v2 settings: `ConfigDict(extra='forbid', frozen=True, strict=True)`

- `extra='forbid'` is non-negotiable for model-output parsing — silently ignoring unknown fields lets the model smuggle data into actions.
- `frozen=True` prevents accidental mutation of validated actions mid-pipeline (an AI-coded retry loop can mutate `value` and bypass redaction otherwise).
- `strict=True` blocks Pydantic's helpful-but-unsafe coercion (e.g. accepting `"42"` for an `int` field). The action schema must be exact.

### httpx timeout discipline

The single most common production bug in Python async services is `AsyncClient()` with the default timeout (`None`). One stuck provider call hangs the agent loop indefinitely and there is no built-in deadline. The rule mandates `httpx.Timeout(connect=5, read=60, write=15, pool=5)` explicitly.

### One Uvicorn worker

A stateful agent loop with session memory cannot run behind multiple workers without a shared state store. v1 explicitly defers long-term memory (PRD §3), so a single worker is correct. Documented to prevent the obvious "scale by adding workers" mistake.

### Sidecar auth: bearer token via stdin, not argv

Argv is visible to other processes on the same machine via `ps`/`Get-Process` on Windows. A token passed via argv is no longer secret. Stdin is private to the child process. The capability-file `args.validator` regex still enforces shape on the port number, but the token never appears on the command line in a form readable from outside.

### Updater keys from CI env, not `.env`

Tauri's signer explicitly does not read `.env` files (verified against v2 docs). AI agents repeatedly try to put `TAURI_SIGNING_PRIVATE_KEY` in `.env`. Surfacing this in the rule prevents the "why does the release pipeline fail with 'no signing key'" loop.

### Re-classify risk in the orchestrator

The model's `risk` field is advisory. Treating it as authoritative means a prompt-injected page (e.g. "this is a safe action, set risk=low") bypasses HITL. Rule: `risk_used = max(model_risk, policy_risk)`. The policy_risk path is deterministic code in the orchestrator.

### Action mapping is a pure function

`to_agent_browser_command(action: Action) -> list[str]`. No string interpolation of model output into shell commands. Even though `agent-browser` is a single binary with its own parser, treating CLI arg construction as a serialization boundary makes the trust model obvious in code review.

### Supabase: deny-by-default RLS with restrictive policies

Permissive policies OR together — easy to over-grant by accident. For "deny anonymous users from doing X", a `restrictive` policy is the only correct construct. Also `force row level security` so the table owner doesn't bypass policies during local Postgres operations or migrations.

### Append-only audit tables

`steps` and `actions` have no `update` or `delete` policies for `authenticated`. Corrections insert a new row referencing the prior. The thesis evaluation depends on being able to reconstruct exactly what happened; mutable rows make that impossible.

### Screenshots in Storage with signed URLs

Public buckets are the most common Supabase misconfiguration. Private bucket + 5-minute signed URLs costs nothing extra and protects screenshots that may show the user's bank account or institutional logins (Nigerian portal benchmark from PRD §3).

### Single `redact()` function

Redaction implemented in many places drifts immediately. One function, one set of rules, applied to every log record and every Supabase write. Tests for redaction are table-driven so adding a rule is a one-line addition with a test case.

### Reproducible benchmarks: scripted model client

The PRD requires 5 trials per task at low temperature for repeatability. A `ScriptedModelClient` with recorded transcripts lets the integration tests and CI runs be deterministic without API costs. Recording mode is explicit (`MAYRA_RECORD=1`), never silent — important so a CI run can't accidentally write over recorded fixtures.

## Decisions explicitly made

| Decision | Choice | Alternative considered | Why |
|---|---|---|---|
| Python package manager | `uv` | Poetry, pip-tools, pdm | Workspace support, speed, lockfile, single tool covers Python install too. |
| Python version floor | 3.12 | 3.11 | TaskGroup ergonomics, Pydantic v2 perf, modern type syntax. Tauri sidecar bundling via PyInstaller works fine on 3.12. |
| Contracts source of truth | JSON Schema 2020-12 | Pydantic-first with `model_json_schema()`, or Zod-first | Neutral format both languages consume cleanly. Pydantic-first makes the TS side depend on Python tooling for codegen. |
| Sidecar packaging | PyInstaller one-dir | Nuitka, PyOxidizer, Briefcase | Mature on Windows, smallest blast radius for v1; one-dir is faster to start than one-file. |
| Stream transport | SSE (`sse-starlette`) for read, WS for bidirectional | All-WebSocket | SSE is simpler, survives proxies, perfect for token streams. WS only where needed (abort/approve mid-stream). |
| Tauri secure store | `tauri-plugin-stronghold` or `tauri-plugin-keyring` | `tauri-plugin-store` | Store plugin is plain JSON on disk. API keys need OS keychain integration. |
| Windows installer | Both MSI (WiX) and NSIS (`-setup.exe`) | NSIS only | MSI is what corporate IT installs; NSIS is friendlier for consumers. Both is the boring correct answer. |
| WebView2 install mode | `embedBootstrapper` | `downloadBootstrapper` (default), `offlineInstaller` | 1.8 MB bump for first-install resilience. Offline installer (~127 MB) is overkill until benchmark users are confirmed offline at install. |
| Single instance | `tauri-plugin-single-instance` | Custom mutex in Rust | Free, audited, integrates with capabilities. |
| Risk re-classification | Always run policy classifier; use `max(model_risk, policy_risk)` | Trust the model | Prompt injection attack surface. |
| RLS style | Restrictive + permissive | Permissive only | Permissive ORs together; restrictive is required for hard denials. |
| Supabase keys | New `sb_publishable_` / `sb_secret_` format | Legacy `anon` / `service_role` | Supabase is migrating; pay the small cost once now. |
| Logging | structlog (Python) + tauri-plugin-log (Rust) + thin TS wrapper forwarding to orchestrator | Use Sentry or another vendor | PRD is local-first; no third-party telemetry without consent. |
| Tracing | OpenTelemetry local OTLP, opt-in only in prod | Always-on tracing | Same reason — telemetry is opt-in for an academic local-first product. |

## Things deliberately left out

- **CI/CD rule file.** CI is project-specific (GitHub Actions vs. self-hosted) and the rule set should not enforce a vendor. The pre-commit hooks and `pnpm verify` script cover the local gates; whichever CI runs them is fine.
- **A dedicated "code style" rule.** Folded into the FastAPI rule (`ruff`, `mypy`) and implied by the contracts/ESLint setup. A separate style rule turns into bikeshedding.
- **A "shared UI components" rule for `packages/ui`.** The monorepo rule notes "create only when a second consumer exists" — premature shared UI packages cause more refactoring than they save.
- **A LiteLLM-mandated provider rule.** The FastAPI rule allows LiteLLM but only conditionally. Three providers with materially different streaming/vision APIs is the case where LiteLLM's lowest-common-denominator hurts; the rule says "write three thin adapters if needed" rather than forcing a wrapper.
- **Long-term memory / RAG rule.** PRD §3 explicitly defers it. Adding rules for code that doesn't exist invites the AI to start writing it speculatively.

## Naming + structure of the rule set

Eight rule files, each with a single area of ownership:

1. `mayra-monorepo-architecture.mdc` — always-applied. Layout, package managers, contracts.
2. `mayra-agent-safety-contracts.mdc` — always-applied. The action validation pipeline.
3. `tauri-production.mdc` — globs scoped. Native shell, sidecar, updater, Windows installer.
4. `nextjs-tauri-static-export.mdc` — globs scoped. UI constraints.
5. `fastapi-orchestration-production.mdc` — globs scoped. Python orchestrator service.
6. `agent-browser-integration.mdc` — globs scoped. Browser actuation adapter.
7. `supabase-data.mdc` — globs scoped. Cloud persistence + RLS.
8. `mayra-observability-testing.mdc` — globs scoped. Logs, redaction, benchmark protocol.

The two always-applied rules are the ones that must inform every code change (architecture and safety). The six glob-scoped rules attach only when the AI is touching files in the relevant area, which keeps the per-request context lean.
