# Proposal Edits: Vision-Based AI Browser Agent

Based on the strategic shift from a Chrome Extension (Manifest V3) to a local desktop daemon approach using `agent-browser`, here are the detailed edits to make to your project proposal.

## 1. Updates to Aims and Objectives (Section 1.4)

_Remove the paragraph stating the agent will be packaged as a Chromium-based browser extension. Replace it with:_

> "This research focuses specifically on the development of a client-side, vision-based agent packaged as a local orchestrated daemon utilizing the Chrome DevTools Protocol (CDP). By leveraging a lightweight, native bridging daemon (such as Vercel's `agent-browser`), the study bypasses the strict inactivity lifecycles of Manifest V3 while preserving local execution, privacy, and direct access to the user's authenticated sessions. The evaluation will focus on the agent’s ability to generalize across unfamiliar, dynamic, and unstructured web interfaces (like institutional portals) using visual cues rather than relying on underlying HTML structures."

## 2. Updates to Methodology (Section 1.5)

_Rewrite your system architecture paragraph to reflect the new stack:_

> "This research combines a targeted literature review with a build-and-evaluate engineering methodology. The proposed system utilizes a decoupled client-daemon architecture. Rather than relying on a constrained browser extension, the perception and actuation layer is handled by a local CDP-based native daemon (`agent-browser`). This daemon connects to the user’s existing browser profile, allowing the agent to securely piggyback on existing authenticated sessions without transmitting cookies to an external server.
>
> The orchestration loop is managed by a local Python application. For perception, the daemon captures the accessibility tree and automatically injects Set-of-Marks (SoM) overlays into a high-fidelity snapshot of the current viewport, generating semantic references for interactive elements. This visual and structural data is sent to a Vision-Language Model (Gemini Flash) via API. The model processes the visual data and returns a structured action plan (e.g., clicking a specific overlay reference, typing text), which the orchestrator then pipes back to the browser daemon for execution.
>
> Safety is strictly enforced through a Human-in-the-Loop (HITL) gate. High-risk operations identified by the orchestrator prompt the user for explicit confirmation before execution, ensuring safe autonomous action. Memory and state log data are stored in a local PostgreSQL/Supabase database to allow for thorough analysis and reproducibility during the evaluation phase."

## 3. Updates to Expected Contribution to Knowledge (Section 1.6)

_Refine the contributions to focus on the intelligence and evaluation, now that the "extension plumbing" is removed:_

> "This research anticipates making substantial contributions across three distinct domains:
>
> **1. Architectural Frameworks for Local Autonomous Agents:** By decoupling the reasoning engine from the browser execution layer via CDP, this research demonstrates a robust, privacy-preserving architecture that circumvents the limitations of Manifest V3 while proving that advanced LLM workflows can run effectively on edge client architectures.
>
> **2. Empirical Evaluation of Visual Grounding on Legacy Web Infrastructure:** Much of the existing literature evaluates agents on pristine benchmarks (like WebArena). This project will contribute vital empirical data by benchmarking a Vision-Language Model against traditional DOM-reliant automation (like Playwright) on inconsistent, legacy, and dynamic interfaces (e.g., Nigerian institutional portals like FUTA). This will concretely quantify the error recovery rate and resilience of vision-based navigation where static DOM structures fail.
>
> **3. Practical Implementation of Asynchronous Safety (HITL):** By designing and testing a strict Human-in-the-Loop verification protocol for high-risk actions, this research provides a practical UX framework for safe 'background agency', a crucial step as AI moves from conversational partners to active executors."

---

## 4. Evaluation Strategy: How it Changes

**What you proposed before:** Running the massive WebArena and Mind2Web benchmarks inside a Chrome extension.
_Why it was bad:_ WebArena is designed for Python API scripts and runs in isolated local Docker containers. Orchestrating that through a Chrome extension would have been a nightmare of networking and CORS issues, shifting your thesis into a DevOps nightmare rather than an AI project.

**What you will do now (The New Evaluation Strategy):**
Because you are now using a Python backend and `agent-browser`, your evaluation becomes extremely precise, realistic, and achievable. You will design **5 to 10 curated real-world tasks**.

- **Setup:** You will run a comparative evaluation between two scripts.
  1. A traditional DOM-based script (written manually using Playwright/Selenium).
  2. Your Vision-Based AI Agent (Gemini Flash + `agent-browser`).
- **The Tasks:** Select tasks that are notoriously painful for traditional bots but easy for humans to see. For example:
  - _Task A:_ Navigating a highly dynamic e-commerce site where class names change on every load.
  - _Task B:_ Interacting with a university portal (e.g., FUTA) that has nested, JavaScript-heavy dropdown menus, broken HTML tags, or Canvas-rendered UIs.
  - _Task C:_ Finding a specific contact email on a poorly structured site and extracting it.
- **The Metrics:** You will measure:
  - **Task Success Rate (Functional Correctness):** Did it actually complete the goal?
  - **Visual Grounding Precision:** Did it click the correct pixel/Set-of-Marks label accurately?
  - **Resilience (The "Break" test):** If you slightly alter the website (or wait 2 weeks for the website developers to push an update that breaks XPath), does the traditional bot crash? Does the Vision AI adapt visual changes and succeed?

By doing this, your evaluation strongly proves your thesis: _Vision-based agents are vastly superior and less brittle than DOM-based automation on the messy, real-world web._
