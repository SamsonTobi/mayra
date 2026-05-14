# Product Requirements Document (PRD): Mayra

## 1. Product Overview

**Product Name:** Mayra  
**Mission:** To serve as an active, localized digital collaborator capable of autonomously navigating complex, dynamic web interfaces via visual understanding.  
**Form Factor:** A native, standalone desktop application built with Tauri (Next.js static export frontend) and backed by a local Python orchestration service.  
**Core Technologies:** Multi-Model AI (Cloudflare Workers AI, Gemini, Grok), `agent-browser` (CDP-based rendering/action), Tauri + Next.js (UI), Python FastAPI (Orchestration Engine), Supabase Cloud (Database).

## 2. Rationale & Academic Context

Mayra is the core technical deliverable for a final-year Information Technology thesis. It proves the superiority of visual grounding over traditional DOM parsing on real-world, legacy, and dynamic websites.  
_Note on Database:_ Using cloud-hosted Supabase is the optimal strategy because an autonomous web agent inherently requires uninterrupted internet access to function. A local DB offers no offline advantages here, and the cloud approach allows for immediate cross-device access to evaluation metrics.

## 3. Product Scope & Limitations

- **Evaluation Focus:** Development will hyper-optimize for 5-10 curated, highly realistic benchmark workflows (e.g., Nigerian institutional portals, complex dynamic e-commerce flows).
- **Open-Ended Browsing:** The agent will accept open-ended prompts from the user. However, when a task exceeds its capabilities, it will gracefully degrade via chat, stating that its functionalities do not support the request yet.
- **Memory Bound:** Initial implementations will strictly utilize Session Memory (retaining context of the ongoing chat and active workflow). Long-term memory is deferred to future iterations to control project scope.

## 4. System Architecture

Mayra utilizes a decoupled, local-first hybrid architecture:

1.  **UI/Presentation Layer (Tauri + Next.js static export):** Provides the chat interface, configuration settings, and renders visual snapshots of the agent's work. The UI can perform safe read/write operations to Supabase using publishable keys and RLS policies, while sensitive operations remain backend-only.
2.  **Orchestration Engine (Python FastAPI):** A local background service that handles the AI reasoning and chat loop. It receives UI inputs, maintains conversation history, constructs enriched prompts, routes requests to the configured AI model via a unified abstraction layer, parses the JSON response, and translates it into physical browser actions. It also holds secret credentials and performs privileged database writes.
3.  **Actuation & Perception (`agent-browser`):** The native browser daemon communicating via CDP (Chrome DevTools Protocol). It captures screenshots, generates the accessibility tree, injects Set-of-Marks (SoM) overlays, and executes clicks/typing.
4.  **Data Persistence (Supabase Cloud):** Stores user sessions, task goals, interaction logs, and evaluation metrics required for the thesis methodology.
5.  **Identity & Access (Device ID):** On first run, Mayra generates a local device ID and signs into Supabase using anonymous auth. RLS policies restrict reads and writes to the authenticated device session.

## 5. UI & User Experience (UX)

- **Initial Boot Sequence:** The onboarding flow asks users to choose between (a) connecting to an existing Chrome instance (remote debugging required) or (b) launching a new agent-managed Chrome instance. If the user selects an existing instance, Mayra provides a guided flow to enable remote debugging and then attempts auto-connect. This choice is available on every app launch.
- **Headed Browsing Default:** Users will visually interact with both the Tauri Chat UI and an active, visible Chrome window running side-by-side, allowing the user to watch the agent make decisions in real time. (Headless mode is supported as a background setting).
- **Chat-Centric Interface:** The primary interaction mode is conversational. The user types a goal (e.g., "Download my transcript"), and the AI responds conversationally regarding its progress while orchestrating the browser.

## 6. AI Conversation & Model Strategy

- **Model Agnosticism (BYOK):** Mayra avoids vendor lock-in by allowing users to bring their own AI configuration. Supported options include:
  - **Cloudflare Workers AI:** Users can select open-source models (e.g., Llama 3 Vision) hosted on Cloudflare's edge network.
  - **Google Gemini & xAI Grok:** Users can enter their own API keys for direct access to proprietary models like Gemini Flash/Pro and Grok.
- **Model Selection UX:** The Settings panel exposes a Model Provider dropdown with per-provider configuration (model name, region, safety level, and API key). The app validates the config with a lightweight health check (list-models or a 1-token prompt) before enabling it. The last-used model is stored locally and can be overridden per task.
- **Credential Handling:** API keys are stored locally (Tauri secure store) and never synced to Supabase. The backend reads them on demand and keeps them in memory only for the duration of the request.
- **LLM Interface Abstraction:** The Python FastAPI backend utilizes an abstraction layer (e.g., LiteLLM) to standardize schemas across different model APIs, ensuring seamless interoperability.
- **Provider Fallbacks:** If a request fails due to rate limits or model errors, Mayra falls back to a user-defined secondary model and notifies the user in chat.
- **Chat Architecture & Prompt Construction:**
  - **Stateful Conversation:** The backend maintains the session's chat history to provide context for both the user and the agent's reasoning loop.
  - **Enriched Prompts:** When acting or chatting, the backend constructs a prompt that merges the user's instructions, the conversation history, the active accessibility tree, and a freshly captured browser screenshot infused with Set-of-Marks (SoM) bounding boxes.
  - **Response Shaping:** The model must return two outputs: (1) a natural language chat reply and (2) a structured JSON action payload. The backend validates the JSON and only forwards safe actions to `agent-browser`.
  - **Streaming UX:** The model streams tokens via Server-Sent Events (SSE) or WebSockets. The UI shows a typing indicator while streaming and then displays the finalized assistant reply and any executed actions.
  - **Message Types in UI:** User, Assistant, System Status (e.g., "Pausing for 2FA"), and Action Logs (structured cards with action type, target, and risk level).
  - **Redaction & Privacy:** The chat renderer masks API keys and sensitive form values before storing or displaying logs.

## 7. Autonomy, Intervention, & Control

- **Steering & Adjusting:** The user can steer the agent dynamically via the chat interface (e.g., "Actually, skip this page and go to the portal").
- **Manual Takeover & Auto-Resume:** If the user interacts with the managed Chrome window, Mayra pauses execution and takes a new snapshot. If the screen state matches the previous state, it auto-resumes after a short idle window (e.g., 30 seconds). If the screen has changed, it requires explicit confirmation before resuming.
- **Hard Abort:** The UI will feature a prominent "Abort Task" button that instantaneously interrupts the Python orchestration loop and halts `agent-browser`.

## 8. Safety, Forms, & Human-In-The-Loop (HITL)

Safety is enforced granularly to prevent hallucinated destructive actions.

- **2-Factor Authentication (2FA):** If Mayra encounters a 2FA prompt, it will pause the orchestration loop, push an OS-level Desktop Notification via Tauri, and send a message in the chat UI: _"Please enter the OTP to continue."_
- **Granular Auto-Submit Policies:**
  - _Basic Forms:_ Features like general searches, simple logins, and innocuous data entry can be designated as "Auto-Submit" via the Desktop App Settings.
  - _Destructive Actions:_ Payments, deletions, or massive DB updates strictly require explicit user approval.
- **High-Risk Classification:** Actions are considered high risk if they submit forms, finalize checkouts, change account settings, upload files, delete data, or involve buttons containing text like "delete", "remove", "pay", "purchase", "confirm", "submit", or "save changes". When uncertain, the action is treated as high risk.
- **HITL Confirmation Flow:** High-risk actions will trigger a UI Alert Popup within the Tauri app. The popup will display an annotated screenshot of the targeted button/field alongside the prompt: _"Done filling your form, confirm details before submission,"_ requiring a manual Click-to-Approve.

## 9. Model Action Schema & Validation

Mayra must enforce strict action schemas to prevent unsafe or malformed tool calls.

- **Allowed Actions (v1):** `click`, `type`, `scroll`, `wait`, `navigate`.
- **Schema (required fields):** `action`, `target_ref`, `value`, `risk`, `reason`.
- **Validation:** If the model response fails schema validation, the orchestrator requests a repair response and does not execute any action.

## 10. Rate Limits & Step Budget

- **Per-Task Step Budget:** 25 to 40 steps per task.
- **Retries:** Maximum of 2 to 3 retries per step.
- **Global Throttle:** Default 10 to 12 requests per minute to stay within free-tier VLM limits.
- **Budget Exhaustion:** When the limit is reached, Mayra stops, reports the failure, and asks the user whether to continue.

## 11. Evaluation Protocol

- **Trials Per Task:** 5 runs per task.
- **Temperature:** 0.0 to 0.2 for repeatability.
- **Baseline:** One handcrafted Playwright script per task (best-case DOM baseline).
- **Metrics:** Task success rate, visual grounding precision, and end-to-end latency.

## 12. Artifacts & Outputs

Upon completion of a task, Mayra generates structured artifacts synced to Supabase:

- **Event Logs:** A JSON timeline of every goal, observation, intended action, and execution result.
- **Visual Documentation:** Retained screenshots of critical interaction nodes (e.g., the screen state before and after clicking a button).
- **Status Update:** A final chat message confirming the success, failure, or degraded fallback state of the assigned goal.

## 13. Data Retention & Notifications

- **Retention Window:** 30 days by default.
- **User Notice:** A desktop notification is sent before deletion, allowing the user to review logs before they are removed.
- **Deletion:** If no action is taken, data is deleted automatically after the retention window.
