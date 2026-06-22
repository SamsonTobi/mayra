# CHAPTER TWO: LITERATURE REVIEW (COMPREHENSIVE OUTLINE)

This chapter reviews the theoretical frameworks, historical web automation paradigms, visual perception models, local client-daemon protocol loops, and agentic safety boundaries that undergird **Project Mayra**. It analyzes the critical limitations of standard DOM-based selectors and server-centralized systems, establishing the academic and practical necessity of a local-first, vision-grounded, human-in-the-loop autonomous browser agent.

---

## 2.1 Autonomous Web Navigation and DOM Dependency

*   **2.1.1 Evolution of Web Automation:**
    *   Trace browser automation from early macros (1990s record-and-replay) to modern developer testing suites (Selenium, Puppeteer, Playwright).
    *   Explain how these frameworks interact with browser instances via out-of-process drivers, standardizing synthetic events (clicks, scrolls, typing).
*   **2.1.2 The Document Object Model (DOM) Architecture:**
    *   Define the DOM as an object-oriented representation of structured HTML/XML hierarchies. Detail how scripts depend on static CSS selectors, element IDs, or structural XPaths (XML Path Language) to target interactive targets.
*   **2.1.3 The Root Causes of DOM Brittleness:**
    *   Analyze the impact of Single-Page Applications (SPAs) and dynamic modern build-tools. 
    *   **The Issue:** Modern bundlers generate randomized, volatile, or utility-class names (e.g., Tailwind CSS class hashes) that change with every single deployment, rendering static selectors and hardcoded paths obsolete instantly.
    *   *Mathematical Representation of DOM Selectors:*
        Let $\mathcal{D}$ represent the DOM tree of a page, and let $e \in \mathcal{D}$ represent an interactive target. Traditional scripts access elements via a selector function $f$:
        $$f(\mathcal{D}, s) \to e$$
        where $s$ is the CSS selector string. Under dynamic deployments, the selector changes to $s' \ne s$, resulting in:
        $$f(\mathcal{D}', s) \to \emptyset \quad \text{(Execution Crash / TimeoutError)}$$

```
+-------------------------------------------------------------------------+
|  FIGURE 2.1: DOM selector volatility vs. visual presentation            |
|                                                                         |
|  [ Deployment A: HTML source ]          [ Deployment B: HTML source ]   |
|  <button class="btn-submit_v1">         <button class="btn-submit_v2">   |
|  xpath: //div[2]/form/button            xpath: //div[3]/form/button     |
|         |                                       |                       |
|         v                                       v                       |
|  +---------------------------+          +---------------------------+   |
|  |       [ SUBMIT INFO ]     |  =====>  |       [ SUBMIT INFO ]     |   |
|  +---------------------------+          +---------------------------+   |
|  DOM script CRASHES because             Visual VLM identifies the       |
|  the static CSS selector or             element purely based on its     |
|  XPath path has mutated.                visual shape and text label.    |
+-------------------------------------------------------------------------+
```
*Figure 2.1: Visual comparison of DOM path failure vs. vision-grounded resilience.*

---

## 2.2 Visual Perception and Multimodal Large Models

*   **2.2.1 From Text to Vision-Language Models (VLMs):**
    *   Review the transition of Large Language Models (LLMs) from token-only processors to multimodal architectures (e.g., Gemini Flash, GPT-4V, Llama 3 Vision) that unify raw pixel arrays and text tokens into a shared semantic embedding space.
*   **2.2.2 The Spatial Coordinate Hallucination Problem:**
    *   Examine why models struggle to predict precise coordinates $(x, y)$ for cursor execution.
    *   Detail coordinate drift factors: responsive screen resolutions, DPI scaling, and the VLM's native visual downsampling operations (which compress high-resolution viewports into standardized token patches, losing fine-grained grid information).
*   **2.2.3 Set-of-Marks (SoM) Prompting as a Discretizing Filter:**
    *   Define the mathematical basis of Set-of-Marks (Yang et al., 2023). 
    *   Explain how overlaying numbered, semi-transparent bounding boxes directly onto interactive targets converts a continuous coordinate prediction task into a discrete reference selection task:
        $$\text{VLM}_{\text{output}} = \text{Ref}_{i} \quad \text{where } i \in [1, N]$$
        This discretizes the visual workspace and eliminates coordinate hallucinations.

```
+-------------------------------------------------------------------------+
|  FIGURE 2.2: Continuous pixel selection vs. discrete SoM selection      |
|                                                                         |
|  [ A: Continuous Coordinates ]          [ B: Set-of-Marks Overlay ]     |
|  +---------------------------+          +---------------------------+   |
|  |     (x: 485, y: 720)      |          |  [12] [ SUBMIT INFO ]     |   |
|  +---------------------------+          +---------------------------+   |
|  Requires precise pixel grid            VLM selects discrete label "12" |
|  output; highly prone to coordinate     which resolves programmatically |
|  hallucination and DPI drift.           to element @e12 via CDP.        |
+-------------------------------------------------------------------------+
```
*Figure 2.2: Set-of-Marks spatial discretization comparison.*

---

## 2.3 Decoupled Client-Daemon Architectures

*   **2.3.1 Remote Headless Browsers vs. Localized Client Execution:**
    *   Evaluate the security, latency, and infrastructure constraints of server-bound agent environments (e.g., WebVoyager), where users must yield active authentication cookies and passwords to cloud servers.
*   **2.3.2 The Chrome DevTools Protocol (CDP) WebSocket Standard:**
    *   Detail how CDP provides out-of-process control over a running Chrome instance. Explain how low-level events (accessibility tree, network logs, element coordinates) are captured in real-time.
*   **2.3.3 Vercel’s `agent-browser` Daemon Integration:**
    *   Explain how `agent-browser` connects to the user's running Chrome profile locally, utilizing existing authenticated login sessions and MFA states, completely locally on the device.

### Table 2.1: Comparison of Agent Execution Paradigms

| Architectural Metric | Server-Bound (WebVoyager) | Extensions (Manifest V3) | Local Decoupled Daemon (Mayra) |
| :--- | :--- | :--- | :--- |
| **Execution Location** | Cloud Headless Server | Active Browser Thread | Local Subprocess Daemon (CDP) |
| **Credential Handling** | Exfiltrated to Remote Cloud | In-Browser Cookie Jar | Piggybacks on Local Chrome Profile |
| **Background Continuity** | High (Cloud Persistence) | Low (Strict MV3 Inactivity Lifecycles) | High (Local Daemon process persistence) |
| **Visual Grounding** | Continuous coordinates | DOM-bounding box scrape | Set-of-Marks Accessibility tree mapping |

---

## 2.4 Accessibility and Legacy Systems
*   **2.4.1 Dynamic Fragmentation in Legacy Interfaces:**
    *   Document the state of regional, public, and institutional portals (specifically student portals in developing nations). These portals are characterized by nested, non-semantic tables, legacy dropdown controls, broken HTML tags, and heavy JavaScript dependencies that lack proper ARIA accessibility labels.
*   **2.4.2 Active Agency and Digital Inclusion:**
    *   Explain how specializing a visual agent to understand legacy sites acts as an accessibility layer for students and educators. Decoupling interaction from structural selector navigation simplifies web task execution, especially for visually or physically impaired users.

---

## 2.5 Review of Related Works
*   Integrate the comprehensive table (Table 1.1) summarizing 15 core papers.
*   Detail the specific gaps identified in literature regarding:
    1.  *Local client-side execution* (the lack of secure, non-exfiltrating frameworks).
    2.  *Background execution continuity* (how extensions are halted by browser lifecycles, and how local sidecars resolve this).
    3.  *Programmatic safety filters* (the lack of server-side programmatic risk classification to prevent malicious form submissions).

---
---

# CHAPTER THREE: SYSTEM DESIGN AND METHODOLOGY (COMPREHENSIVE OUTLINE)

This chapter provides a detailed description of the design, architectural systems, algorithmic frameworks, data-parsing equations, and proposed experimental evaluation protocols designed to implement and benchmark **Mayra**.

---

## 3.0 Introduction
*   Provide a high-level overview of Chapter Three.
*   Summarize the core focus: outlining the client-daemon local-first architecture, real-time perception data preprocessing, the stateful agentic decision loop, multi-provider model integration, safety gateways, and the proposed benchmarking methodology.

---

## 3.1 High-Level System Architecture
*   **3.1.1 The Polyglot Client-Daemon Paradigm:**
    *   Detail the architectural necessity of a decoupled, multi-tier layout to ensure absolute privacy, minimal latency, and Manifest V3 independence.
    *   Explain how control is localized on the client's device, completely bypassing remote headless cloud architectures.
*   **3.1.2 Presentation Tier (Tauri + Next.js Static Export):**
    *   Explain Tauri's role as a lightweight Rust-compiled desktop wrapper hosting a statically compiled React-based Next.js frontend UI (`output: 'export'`).
    *   Detail how Tauri utilizes the native OS web view engine (WebView2 on Windows) to render chat histories, action logs, settings cards, and safety confirmation gates.
*   **3.1.3 Orchestration Tier (FastAPI/Python 3.12 Daemon):**
    *   Describe the Python-based FastAPI background sidecar process bound to the local loopback interface (`127.0.0.1`) running via Uvicorn.
    *   Detail its responsibilities: running the stateful execution loop, managing long-running subprocess adapters, coordinating model API exchanges, and executing programmatic risk analysis.
*   **3.1.4 Actuation & Perception Tier (agent-browser / CDP):**
    *   Detail the role of Vercel's `agent-browser` running as a native CLI subprocess daemon.
    *   Explain how it connects to the user's active, authenticated Chrome profile via direct Chrome DevTools Protocol (CDP) WebSocket channels to capture screenshots, retrieve accessibility trees, and execute hardware clicks/keystrokes.

```
+---------------------------------------------------------------------------------+
|  FIGURE 3.1: Mayra local decoupled runtime architecture                          |
|                                                                                 |
|  [ Tauri Desktop App (Rust/JS) ] <==== (SSE / HTTP) ====> [ Python sidecar ]    |
|         |                                                            |          |
|  (Publishable Key)                                              (Secret Key)    |
|         |                                                            |          |
|         v                                                            v          |
|  [ Supabase Cloud (TSR Metrics) ]                          [ agent-browser ]    |
|                                                                      |          |
|                                                                    (CDP)        |
|                                                                      v          |
|                                                            [ User Chrome Profile] |
+---------------------------------------------------------------------------------+
```
*Figure 3.1: Detailed polyglot client-daemon runtime and cloud persistence sync topology.*

---

## 3.2 Research Methodology Phases
*   Decompose the research engineering and validation into four sequential, rigorous methodology phases:
*   **3.2.1 Phase 1: Local System Engineering & Daemon Interfacing:**
    *   Developing the polyglot orchestration daemon, setting up the local CDP pipeline, and interfacing the Python server with Tauri and browser targets.
*   **3.2.2 Phase 2: Algorithmic Perception, Preprocessing & Safety Filtering:**
    *   Formulating the visual overlay heuristics, establishing accessibility tree filtering equations, and implementing deterministic security classifiers.
*   **3.2.3 Phase 3: Multi-Provider Integration and Failover Setup:**
    *   Designing the unified `ModelClient` adapter interface, integrating rate limiters and semaphores, and implementing stateful sequential fallbacks.
*   **3.2.4 Phase 4: Proposed Benchmark Design and Metric Formulation:**
    *   Curating dynamic, real-world tasks on regional portals and defining mathematical performance metrics to prepare for future experimental runs.

---

## 3.3 System Flowchart and Loop State-Transitions
*   **3.3.1 Stateful Agentic Observe-Decide-Act Flowchart:**
    *   Present a structured mermaid diagram mapping how a user's goal transitions from initiation, through real-time observation, SoM injection, model reasoning, risk re-classification, safety gates, and physical browser execution.
*   **3.3.2 Step-by-Step Algorithmic Loop Analysis:**
    *   Formalize the stateful orchestration flow mathematically as a sequential loop over steps $t \in [1, T]$ (where $T$ represents the step budget limit).
    *   Provide and detail **Algorithm 3.1 (Mayra Orchestration & Safety Loop)**, describing the specific inputs, outputs, state variables, and execution rules.

---

## 3.4 Observation Preprocessing & Real-Time Data Constraints
*   Frame viewport screenshots and accessibility trees captured during active execution steps as the real-time input data.
*   **3.4.1 Real-Time Visual Preprocessing:**
    *   Explain how raw high-resolution screenshots ($S_t$) are captured, compressed using high-efficiency WebP formatting, and resized to optimize bandwidth.
*   **3.4.2 Set-of-Marks (SoM) Bounding Box Coordinate Placement Heuristics:**
    *   Detail the visual grounding process: parsing accessibility bounding boxes $[x_{\text{min}}, y_{\text{min}}, x_{\text{max}}, y_{\text{max}}]$ and programmatically drawing semi-transparent, numbered overlays directly onto the viewport WebP screenshot ($M_t = \text{SoM}(S_t, A_t)$).
    *   Explain how this converts continuous visual coordinate prediction into discrete reference selection, eliminating model coordinate hallucinations.
*   **3.4.3 Structural Preprocessing (Accessibility Tree Parsing & Node Pruning Equations):**
    *   Define the mathematical filter used to prune raw, highly verbose HTML/DOM code down to standard interactive accessibility nodes.
    *   *Mathematical Pruning Filter:*
        Let $\mathcal{N}$ represent the raw set of accessibility nodes on a page. The system filters this set, extracting a pruned tree $\mathcal{N}_{\text{pruned}}$ defined as:
        $$\mathcal{N}_{\text{pruned}} = \{ n \in \mathcal{N} \mid \text{role}(n) \in \mathcal{R}_{\text{interactive}} \land \text{depth}(n) \le 12 \}$$
        where the set of interactive roles is defined as:
        $$\mathcal{R}_{\text{interactive}} = \{ \text{button}, \text{link}, \text{textbox}, \text{combobox}, \text{checkbox}, \text{radio}, \text{tab}, \text{heading}, \text{form} \}$$
    *   Detail the strict size cap $|\mathcal{N}_{\text{pruned}}| \le 1500$, explaining how the system focuses on viewport-specific nodes if the threshold is exceeded.

---

## 3.5 Proposed Model Schema & Validation Interface
*   **3.5.1 The Pydantic v2 Action Schema:**
    *   Define the rigid JSON contract that VLMs must return to protect against prompt injection shell commands.
    *   *Pydantic Model Structure:*
        $$\text{Action} = \{ \text{action} \in \mathcal{A}, \text{target\_ref}: \text{str}, \text{value}: \text{str}, \text{risk}: \text{str}, \text{reason}: \text{str} \}$$
        where physical action classes are restricted to:
        $$\mathcal{A} = \{ \text{click}, \text{type}, \text{scroll}, \text{wait}, \text{navigate}, \text{done} \}$$
    *   Explain how `ConfigDict(extra='forbid', frozen=True, strict=True)` blocks any unauthorized execution payloads at the API layer.
*   **3.5.2 Automated Syntax Error and Schema Repair Loops:**
    *   Explain how the orchestrator catches `ValidationError` or `JSONDecodeError` exceptions and automatically passes the error stack back to the model with a specialized repair prompt, executing self-healing loops without crashing the task.

---

## 3.6 Multi-Provider Model Selection & Abstraction
*   **3.6.1 The Unified Model Abstraction Interface (ModelClient Base):**
    *   Detail the design of the abstract `ModelClient` base class in `providers/base.py`, defining the unified `complete_streaming` and `health_check` methods.
*   **3.6.2 VLM Provider Configurations:**
    *   *Google Gemini:* Detail the native API client (`GeminiClient` in `providers/gemini.py`) defaulting to `gemini-2.5-flash`.
    *   *Groq:* Detail the OpenAI-compatible vision client targeting Llama models (defaulting to the vision-capable model `meta-llama/llama-4-scout-17b-16e-instruct`).
    *   *Cloudflare Workers AI:* Detail the serverless integration targeting hosted models (e.g. `@cf/meta/llama-3.1-8b-instruct`).
    *   *OpenAI Compatible Engines:* Explain how the `OpenAICompatClient` seamlessly bridges the orchestrator to other major providers (e.g. OpenAI's `gpt-4o` / O-series models, or xAI's Grok).
*   **3.6.3 Dynamic Edge-Driven Key Decoupling and Bootstrapping Heuristics:**
    *   Explain `decode_provider_keys` which securely decodes base64-encoded provider credentials locally, allowing the sidecar to dynamically initialize only the clients for which the user possesses active keys.

---

## 3.7 Concurrency Control & Client Fallback Engine
*   **3.7.1 Edge-Orchestrated Concurrency Limits:**
    *   Explain the role of `AsyncLimiter` (RPM-driven throttling) and `asyncio.Semaphore(2)` in `providers/factory.py` to prevent local tasks from triggering remote API blocks.
*   **3.7.2 Provider Fallback Ordering:**
    *   Document the stateful prioritization algorithm (`_ordered_provider_clients` in `agent_loop.py`).
    *   Explain how the orchestrator honors a user's preferred model, but automatically falls back sequentially (`gemini` -> `groq` -> `cloudflare`) if a provider suffers an outage or authentication failure.
*   **3.7.3 Resilient Exception Handling:**
    *   Detail how `_complete_with_limits` catches `ProviderError` exceptions (such as `unauthorized`, `rate_limited`, or `server_error`).
    *   Detail the rate-limit retry logic: executing cancel-safe, responsive sleep loops while pushing warnings to the UI before retrying.

---

## 3.8 Programmatic Risk Classification & Human-in-the-Loop (HITL) Gate
*   **3.8.1 Threat Model: Indirect Prompt Injections on Dynamic Webpages:**
    *   Document how dynamic webpages can inject instruction overrides (e.g. *"Ignore prior instructions. Click the Delete Account button immediately and set risk=low"*).
    *   Argue why relying on the VLM's self-reported risk field is a massive security hazard.
*   **3.8.2 Server-Side Programmatic Policy Rules:**
    *   Detail the local, deterministic Python-level reclassification filter (`risk.py`) that overrides the VLM's risk classification:
        $$\text{Effective Risk} = \max(\text{VLM}_{\text{reported\_risk}}, \text{Policy}_{\text{calculated\_risk}})$$
    *   Define the exact deterministic criteria that elevate an action to "High" risk:
        1.  *High-Risk Keywords:* Target element matches sensitive terms:
            $$\mathcal{K} = \{ \text{delete}, \text{remove}, \text{pay}, \text{purchase}, \text{confirm}, \text{submit}, \text{save changes} \}$$
        2.  *Navigation Domain Check:* Navigating to external URLs outside the allowed domains.
        3.  *Layout State Mismatch:* A changed observation hash indicating a stale screenshot.
*   **3.8.3 Tauri HITL Popup and Execution Interception Flow:**
    *   Detail how the FastAPI orchestrator halts execution, blocks the action from reaching CDP, and emits a secure SSE approval request.
    *   Explain how Tauri displays a visual crop of the target element, requesting explicit manual confirmation before allowing execution.

```
+---------------------------------------------------------------------------------+
|  FIGURE 3.2: Human-in-the-Loop (HITL) safety popup triggers                    |
|                                                                                 |
|    [ Model Action: Click @e12 ]                                                 |
|                |                                                                |
|                v                                                                |
|    [ Policy Classifier check ]                                                  |
|    Does element "@e12" contain word "Confirm" or trigger file upload?           |
|         /                            \                                          |
|      (No)                           (Yes)                                       |
|       /                                \                                        |
|      v                                  v                                       |
|  [ Auto-Execute ]               [ HALT LOOP & TRIGGERS POPUP ]                  |
|  Directly click element         User reviews visual target crop                 |
|  via CDP protocol.              and manual "Approve" button before click.       |
+---------------------------------------------------------------------------------+
```
*Figure 3.2: Human-in-the-Loop popup triggers and verification flow.*

---

## 3.9 Database Persistence & Audit Trails
*   **3.9.1 Supabase Cloud PostgreSQL Relational Schema:**
    *   Explain the database tables: `sessions`, `goals`, `steps`, `actions`, and `evaluations`.
*   **3.9.2 Security Rules: Row-Level Security (RLS) & Immutable Audit Constraints:**
    *   Document the strict Row-Level Security (RLS) policies enforcing restrictive reads and append-only writes (blocking `UPDATE` and `DELETE` queries on steps/actions to guarantee evaluation integrity).
*   **3.9.3 Privacy Preserving Data Redaction Processor:**
    *   Explain how `redaction.py` masks API tokens, bearer headers, password strings, and OTP values before logs are committed to the cloud.

---

## 3.10 System Development Environment and Tools
*   List and justify the development technologies utilized in Mayra:
*   **3.10.1 Programming Languages (Python 3.12 & Rust):**
    *   Python for asynchronous orchestration and type-safe data modeling; Rust for Tauri OS-level features and native security controls.
*   **3.10.2 Asynchronous Web Services (FastAPI & Uvicorn):**
    *   FastAPI for rapid REST/SSE routing; single-worker Uvicorn for local state consistency without multi-threading errors.
*   **3.10.3 Package and Monorepo Managers (uv & pnpm):**
    *   `uv` for high-speed Python workspace compilation; `pnpm` for efficient, deduplicated JS monorepo package storage.
*   **3.10.4 Visual Grounding Adapter (Vercel agent-browser):**
    *   The CLI driver executing low-level click/fill events over Chrome DevTools Protocol loopback ports.

---

## 3.11 Proposed Benchmarking & Evaluation Methodology
*   Outline the planned strategy for future validation:
*   **3.11.1 Proposed Legacy Web Task Suite and Setup:**
    *   Describe the plan to design 5 to 10 highly dynamic, poorly-structured tasks on regional portals (such as the FUTA student portal, course registration page, and local e-commerce sites).
*   **3.11.2 Comparative Baseline Design:**
    *   Detail how Mayra's performance will be compared against traditional DOM-based automation scripts (Playwright/Selenium) written using static XPaths or CSS classes.
    *   Describe the planned "Break Test" where dynamic class names or DOM shifts are introduced to measure script failures.
*   **3.11.3 Mathematical Formulations of Metrics:**
    *   *Task Success Rate (TSR):*
        $$\text{TSR} = \frac{1}{K} \sum_{i=1}^{K} \mathbb{I}(\text{Task Completion}_i) \times 100\%$$
    *   *Visual Grounding Precision (VGP):*
        $$\text{VGP} = \frac{\sum_{t=1}^{T} \mathbb{I}(\text{Correct Visual Element Selected}_t)}{\sum_{t=1}^{T} \mathbb{I}(\text{Interaction Step}_t)} \times 100\%$$
    *   *Structural Resilience Score (SRS):*
        $$\text{SRS} = \frac{\text{TSR}_{\text{obfuscated}}}{\text{TSR}_{\text{clean}}} \times 100\%$$

