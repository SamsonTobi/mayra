# CHAPTER ONE
## 1.0 INTRODUCTION

Web navigation and digital workflow execution constitute critical components of modern organizational operations, directly influencing administrative efficiency and productivity. While conventional web automation frameworks (e.g., Selenium or Playwright) automate repetitive tasks, they exhibit extreme structural brittleness in dynamic web environments. Because they rely entirely on parsing static Document Object Model (DOM) hierarchies, modern practices like dynamically generated class names, single-page architectures, and virtual DOMs render pre-configured selectors obsolete rapidly, causing broken workflows and high developer maintenance costs.

To address these issues, Vision-Language Models (VLMs) enable a new computer interaction paradigm by processing raw screenshots and locating interactive elements based on visual layouts rather than underlying HTML trees. However, existing visual agents are predominantly server-bound, creating security and privacy risks by demanding user session credentials. This research introduces **Mayra**, a client-side, vision-based autonomous browser agent that decouples visual reasoning from browser execution via a local Chrome DevTools Protocol (CDP) native daemon. Mayra operates securely in the user’s native browser profile, enabling local background agency and introducing a rigorous, human-in-the-loop safety protocol.

---

## 1.1 Background of the Study

Modern digital systems rely heavily on web-based interfaces to manage operational workflows, synchronize cross-platform data, and facilitate transactional processes. Consequently, the efficiency of web navigation directly impacts enterprise productivity and overall user experience. Historically, digital automation relied on traditional scripted execution frameworks (e.g., Selenium or Playwright) that parse the Document Object Model (DOM), which represents the structural XML/HTML hierarchy of a webpage (He et al., 2024). While functional in static environments, DOM-based automation suffers from severe structural brittleness. Modern web architectures employ single-page frameworks, virtual DOMs, and dynamically generated CSS class names that change with each deployment, rapidly rendering static selectors obsolete. Furthermore, traditional scripts lack cognitive and visual awareness, failing to comprehend spatial layouts or visual-only features like canvas-rendered content, dynamic advertisements, or multi-factor authentication (MFA) prompts (Zhou et al., 2024).

The emergence of Large Multimodal Models (LMMs) and Vision-Language Models (VLMs) has initiated a paradigm shift in autonomous web execution. By integrating visual context with cognitive reasoning, VLMs analyze raw screenshots, interpret spatial pixel layouts, and execute tasks based on visual indicators rather than underlying code (Yang et al., 2023). A visual agent recognizes interactive components (such as buttons or input fields) much like a human operator, bypassing fragile HTML trees. Breakthroughs such as Anthropic’s (2024) "Computer Use" APIs and OpenAI’s (2025) generalist agents have demonstrated the viability of zero-shot visual grounding, enabling agents to control arbitrary applications through cursor actuation and text entry.

Despite these advancements, deploying visual agents on local desktop architectures introduces massive engineering bottlenecks. Early agent frameworks (e.g., WebVoyager) relied heavily on headless browsers deployed on remote, server-side infrastructure, requiring users to yield sensitive session credentials, raising critical security and privacy concerns. Moreover, operating purely via remote APIs results in substantial operational latency and high token consumption. To address these issues, contemporary architectures decouple the visual reasoning loop from the browser execution layer by utilizing local Chrome DevTools Protocol (CDP) native daemons (such as Vercel’s `agent-browser`). This local-first paradigm enables secure, privacy-preserving execution by piggybacking on the user’s active, authenticated browser profile. Furthermore, visual grounding precision is drastically enhanced through Set-of-Marks (SoM) prompting, which overlays numbered bounding boxes on interactive elements, discretizing the visual space and mitigating coordinate hallucination (Yang et al., 2023). Combining this local-first daemon model with highly optimized visual grounding represents a vital advancement in practical, safe, and resilient digital agency.

---

## 1.2 Literature Review of Related Works

Table 1.1 provides a detailed summary of recent advancements in autonomous web agents, large multimodal models, and visual grounding frameworks, emphasizing their core methodology, main contributions, and primary limitations.

### Table 1.1: Summary of Related Works in Autonomous Web Agents

| Author & Title (Year) | Objective | Methodology | Contribution | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **He et al. (2024)**<br>_WebVoyager: Building an End-to-End Web Agent with Large Multimodal Models_ | To build a general-purpose web agent capable of handling real-world tasks visually. | Utilized GPT-4V to process screenshots and generate web interaction plans without relying heavily on HTML parsing. | Demonstrated strong generalization across diverse websites and reduced reliance on structured DOM elements. | Heavily reliant on server-side headless browsers; lacks a robust mechanism for client-side local execution. |
| **Zhou et al. (2024)**<br>_WebArena: A Realistic Web Environment for Building Autonomous Agents_ | To create a realistic evaluation framework for web agents. | Developed a self-contained, fully functional web environment mapping real-world tasks to functional correctness metrics. | Shifted the evaluation paradigm from sequence-matching to execution success (functional correctness) on dynamic sites. | Focuses solely on benchmarking; does not propose a novel agent architecture or solve the identified latency issues. |
| **Zheng et al. (2024)**<br>_GPT-4V(ision) is a Generalist Web Agent, if Grounded_ | To adapt foundational vision models into capable UI navigators. | Used visual grounding techniques to map textual instructions directly to screen coordinates for zero-shot navigation. | Showed that pure visual processing can rival DOM-based parsing for cross-domain web navigation tasks. | Struggles with complex, multi-page state management and asynchronous background tab processing. |
| **Liu et al. (2023)**<br>_LLaVA-Plus: Learning to Use Tools for Creating Multimodal Agents_ | To expand multimodal models with tool-use capabilities. | Fine-tuned a visual-language model to autonomously select and invoke external tools (including browser actions). | Bridged the gap between conversational AI and functional tool usage. | Hacks the active viewport rather than operating asynchronously; lacks a strong Human-in-the-Loop safety barrier. |
| **Yang et al. (2023)**<br>_Set-of-Mark Prompting Unleashes Extraordinary Visual Grounding_ | To improve the coordinate predicting accuracy of VLMs. | Injected numbered, semi-transparent overlays onto interactive elements for the model to reference directly. | Drastically reduced hallucinated pixel predictions by discretizing the screen into selectable marks. | Requires an initial, lightweight DOM scan to accurately place the marks, blending vision with structural constraints. |
| **Deng et al. (2023)**<br>_Mind2Web: Towards a Generalist Agent for the Web_ | To train and evaluate agents across highly diverse, unseen websites. | Employed a filter-then-reason approach (MindAct) to trim noisy HTML before passing it to deep neural networks. | Provided the first massive open-domain dataset for web agents spanning 137 real-world domains. | Primarily relies on text/DOM tokens rather than purely visual reasoning, limiting its adaptability to canvas-rendered elements. |
| **Gur et al. (2023)**<br>_A Real-World WebAgent with Planning, Long Context Understanding, and Program Synthesis_ | To build a practical web agent capable of complex, multi-step real-world tasks. | Combined LLM-based high-level planning, long-context history tracking, and program synthesis for browser control. | Achieved strong results on live websites by integrating reasoning with executable code generation. | Primarily text-heavy with limited native visual grounding; struggles with highly dynamic SPAs. |
| **Koh et al. (2024)**<br>_VisualWebArena: Evaluating Multimodal Agents on Realistic Visual Web Tasks_ | To benchmark vision-driven web agents in realistic visual environments. | Extended WebArena with screenshot-based observations and tasks requiring pure visual reasoning. | Introduced a rigorous visual-centric benchmark that highlights limitations of DOM-only approaches. | Purely evaluative; does not propose new agent architectures and inherits simulation limitations. |
| **Lü et al. (2024)**<br>_WebLINX: Real-World Website Navigation with Multi-Turn Dialogue_ | To create a benchmark for multi-turn conversational web navigation. | Collected human demonstrations across real websites with dialogue-based instructions and visual + DOM inputs. | Provided a large-scale, realistic dataset focused on long-horizon, multi-turn tasks. | Emphasizes dialogue more than fully autonomous background execution; data collection is labor-intensive. |
| **Liu et al. (2023)**<br>_AgentBench: Evaluating LLMs as Agents_ | To systematically evaluate LLMs across diverse agentic environments including web. | Designed a multi-environment benchmark with web navigation as a core track using visual and textual feedback. | Established standardized metrics for comparing generalist agents across domains. | Many environments remain simplified; visual grounding evaluation is secondary to textual reasoning. |
| **Xie et al. (2024)**<br>_OSWorld: Benchmarking Multimodal Agents for Open-Ended Computer Tasks_ | To evaluate multimodal agents in realistic desktop/browser environments. | Created an open-ended OS environment with screenshot observations and action spaces (including full browser control). | Demonstrated the feasibility of generalist agents operating across applications with pure vision. | Very broad scope leads to high variance; browser-specific performance can be inconsistent. |
| **Chen et al. (2024)**<br>_SeeClick: Harnessing GUI Grounding for GUI Agents_ | To improve precise visual grounding for click and interaction actions. | Trained a VLM to predict click coordinates directly from screenshots using grounding supervision. | Significantly boosted element interaction accuracy on both web and desktop GUIs without DOM reliance. | Primarily focused on click actions; weaker on typing, scrolling, and long-horizon planning. |
| **OpenAI (2025)**<br>_Computer-Using Agent (CUA) Powering Operator_ | To create a universal vision-based GUI agent for autonomous web and desktop tasks. | Combines GPT-4o vision with reinforcement learning for iterative screen observation + mouse/keyboard actions. | Achieves new SOTA on OSWorld (38.1%), WebArena (58.1%), and WebVoyager (87.0%); enables fully autonomous Operator. | Early-stage with mandatory user confirmation for high-risk actions; variance on dynamic/captcha sites. |
| **Anthropic (2024)**<br>_Claude Computer Use_ | To enable frontier VLMs to control any computer interface and browser via pure vision. | API tool that takes screenshots and outputs precise cursor, click, type, and scroll actions. | First public frontier GUI agent; strong generalization across unseen apps/websites with no DOM reliance. | Beta release; ongoing safety/misalignment risks; API-only access limits client-side deployment. |
| **Yang et al. (2025)**<br>_The Adoption and Usage of AI Agents: Early Evidence from Perplexity (Comet & Computer)_ | To deploy and study a real-world AI-native browser agent for asynchronous web workflows. | Embedded multimodal agent in custom Comet browser + multi-model orchestration (Perplexity Computer) for background execution. | Provides the first large-scale field study of agent usage and multi-model background agency. | Adoption-focused rather than novel architecture; heavy reliance on external model APIs; privacy considerations in background mode. |

Despite these significant advancements, the current state-of-the-art architectures reveal substantial limitations. The foremost bottleneck is **architectural centralization**. Systems like WebVoyager (He et al., 2024) rely on massive server-hosted headless instances, which forces users to upload active cookies and raw passwords to external servers. This compromises user privacy and increases network latency. Decoupling visual reasoning from server-side infrastructure is crucial to enabling secure client-side agency.

Second, existing models struggle with **asynchronous agency**. Systems like LLaVA-Plus (Liu et al., 2023) execute actions in the user's active viewport, halting the user's workflow during multi-step executions. The development of a local background execution model that runs tasks inside isolated browser instances is an open research challenge.

Finally, the lack of **deterministic safety boundaries** remains a critical issue. Advanced generalist agents like Anthropic's (2024) "Computer Use" operate with an open execution space, making them vulnerable to prompt injection or hallucinated destructive actions (e.g., accidental file deletions or unapproved transactional submissions). Implementing a robust, deterministic Human-in-the-Loop (HITL) gate that acts as a structural filter between VLM output and local browser action is necessary to ensure secure, consumer-grade deployment.

---

## 1.3 Research Motivation

The operational workflows of modern administrative, academic, and financial platforms have become increasingly complex. In developing countries, particularly within Nigeria, institutional platforms (such as the FUTA university portal) feature fragmented user interfaces, nested dynamic dropdowns, legacy visual styles, and inconsistent underlying DOM trees. Traditional DOM-reliant script engines are unable to automate workflows on these legacy platforms, as minor front-end updates render their pre-configured CSS selectors or XPaths completely obsolete. This structural volatility causes broken workflows, increases developer maintenance overhead, and limits the scalability of IT automation.

While Large Multimodal Models (LMMs) offer visual understanding capabilities to interpret web pages like a human operator, their deployment remains restricted by the passive nature of contemporary browsers. Modern browsers function as static, input-driven interfaces that sit idle until a human interacts with them.Decoupling web interaction from DOM dependency and moving toward visual grounding would unlock new automation capabilities. Transforming the browser into an active digital collaborator through a vision-based autonomous agent represents an important step in client-side IT operations.

Furthermore, the academic community lacks comprehensive empirical data evaluating pure visual grounding performance against traditional DOM parsing on inconsistent legacy interfaces. While existing agent benchmarks (such as WebArena) utilize pristine, standardized, and simulated environments, they fail to represent the chaotic frontend realities of regional, legacy institutional portals. Benchmarking a visual agent against traditional Playwright/Selenium frameworks on actual dynamic web applications would yield crucial, replicable data validating visual resilience over brittle script models.

Finally, safety and consumer privacy are primary motivators for this study. The transition from active, synchronous chat-based AI to background execution requires a client-side daemon structure. Storing sensitive cookies, login sessions, and visual frames locally, while routing only redacted observations to external VLM APIs, ensures strict privacy compliance. The design of a deterministic, client-side Human-in-the-Loop (HITL) safety framework ensures that visual agents can execute multi-step routines safely, mitigating security risks.

---

## 1.4 Aim and Objectives of the Study

The overarching aim of this research is to design, implement, and evaluate **Mayra**, an intelligent, vision-based autonomous browser agent packaged as a localized desktop daemon, to enable secure, privacy-preserving, and structurally resilient web automation on dynamic legacy interfaces.

To achieve this central aim, the specific objectives of this study are to:

1. **Design** a client-side, local-first visual browser agent decoupled from structural HTML/DOM selectors, utilizing a hybrid Tauri (Next.js static export) and local Python FastAPI architecture.
2. **Implement** the designed agent incorporating a visual grounding layer via accessibility-infused Set-of-Marks (SoM) overlays, a local Chrome DevTools Protocol (CDP) native daemon (`agent-browser`), and persistent local-to-cloud audit logging via Supabase.
3. **Evaluate** the system's performance on dynamic real-world legacy portals (specifically Nigerian university portals) using Task Success Rate, Visual Grounding Precision, and Structural Resilience against a handcrafted Playwright DOM baseline.

---

## 1.5 Methodology

This research combines a targeted literature review with a build-and-evaluate engineering methodology, organized into five sequential phases:

### 1.5.1 Phase 1: Local System Architecture & Decoupling
The proposed system utilizes a decoupled, local-first hybrid architecture to guarantee user privacy and low execution latency:
* **UI/Presentation Layer:** A standalone desktop application built with Tauri (Next.js static export frontend), providing a chat interface, step-by-step agent tracking, and visual render snapshots.
* **Orchestration Engine:** A local background service written in Python FastAPI, managing the reasoning loop, constructing enriched prompts, validating model outputs, and redacting sensitive data.
* **Actuation & Perception Daemon:** Vercel’s `agent-browser` communicating via the Chrome DevTools Protocol (CDP). It directly interfaces with the user’s native, authenticated Chrome profile, utilizing existing login sessions securely without transferring cookies to an external server.

### 1.5.2 Phase 2: Visual Perception & State Capture
For perception, the `agent-browser` daemon captures high-fidelity viewport screenshots and extracts the parallel accessibility tree of the page. To improve visual grounding precision and prevent spatial coordinate hallucination:
* Clickable, focusable, and interactive elements are identified from the structural tree.
* The daemon automatically injects numbered, semi-transparent Set-of-Marks (SoM) visual overlays onto these candidate targets in a unified snapshot.
* This annotated snapshot is combined with the page's structural layout before being transmitted to the Vision-Language Model.

### 1.5.3 Phase 3: Cognitive Orchestration & Action Generation
The Python orchestrator constructs an enriched system prompt containing user goals, multi-turn chat history, structural layouts, and the Set-of-Marks viewport screenshot. This data is routed to a Vision-Language Model (Gemini Flash) via API:
* The VLM acts as the reasoning engine, returning two outputs: (i) a natural language progress description and (ii) a structured JSON action payload.
* The orchestrator validates the JSON against a strict Pydantic v2 schema (requiring: `action`, `target_ref`, `value`, `risk`, and `reason`).
* Allowed physical actions are constrained to: `click`, `type`, `scroll`, `wait`, and `navigate`.

### 1.5.4 Phase 4: Granular Safety & Human-in-the-Loop Gate
Before any generated action is forwarded to `agent-browser` for execution, it must pass a deterministic safety boundary managed by the orchestrator:
* **Risk Classification:** Actions are classified as high-risk if they submit forms, execute transactional payments, alter account settings, or target buttons containing destructive trigger words (e.g., "delete", "confirm", "submit").
* **Human-in-the-Loop (HITL) Gate:** Low-risk actions (e.g., scrolling, navigating, basic data entry) execute automatically. High-risk operations halt the agent execution loop and trigger a Tauri UI popup. The user is presented with a cropped visual view of the target element, requiring manual confirmation before execution.
* **Two-Factor Authentication (2FA) Handling:** If the agent encounters a 2FA prompt, the loop pauses, issues an OS-level notification, and requests the user to input the OTP directly to resume execution.

### 1.5.5 Phase 5: Empirical Comparative Evaluation
The system will be evaluated using a quantitative benchmark consisting of **5 to 10 curated real-world tasks** on dynamic legacy portals, including the FUTA student portal. The evaluation will compare Mayra against a best-case DOM-based baseline written in Playwright. 
* **Metrics:**
  1. *Task Success Rate (Functional Correctness):* The percentage of successful completions across 5 repeated trials per task at temperature 0.0 to 0.2.
  2. *Visual Grounding Precision:* The ratio of correct element/Set-of-Marks target selections.
  3. *Structural Resilience:* The agent's error recovery rate when website class names, structural hierarchies, or XPaths are modified or obfuscated.
* **Data Persistence:** All logs, executed action arrays, visual observations, and metrics are securely synced to a cloud Supabase database with append-only audit rules and strict Row-Level Security (RLS) configurations.

---

## 1.6 Expected Contribution to Knowledge

This research anticipates making substantial contributions across three distinct domains:

1. **A Framework for Visual-Grounding Specialization on Legacy Academic Portals:** 
   Rather than relying purely on generalized zero-shot visual orchestration (which frequently fails on fragmented regional web infrastructures), this research designs and engineers specialized prompting heuristics and accessibility-tree visual mapping tailored specifically for legacy institutional portals (such as the FUTA student site). This provides a scalable interaction model that empowers students and educators to perform complex administrative tasks autonomously. Ultimately, this establishes a novel accessibility blueprint, demonstrating how specialized visual agency can act as a standardizing proxy layer over brittle, dynamic, and poorly structured interfaces to ease digital operations for end-users.

2. **Empirical Evaluation of Visual Grounding on Legacy Web Infrastructure:** 
   While existing literature focuses on standardized, simulated benchmarks (such as WebArena), this study will contribute vital empirical data evaluating VLMs against traditional DOM-reliant frameworks (such as Playwright) on unstructured, dynamic, and inconsistent regional portals (e.g., Nigerian institutional portals). This will concretely quantify the error-recovery rates and structural resilience of vision-based navigation where static selector systems fail.

3. **Practical Implementation of Asynchronous Safety (HITL):** 
   By designing and testing a strict, deterministic Human-in-the-Loop verification protocol for background execution loops, this research provides a standardized UX/UI safety framework for background agency. It demonstrates how autonomous systems can operate securely without risking destructive form submission or coordinate hallucination.
