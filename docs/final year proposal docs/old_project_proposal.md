# Development of a Vision-Based AI Browser Agent

**Written By:** Adebowale Oluwatobi Samson  
**Matric No:** IFT/20/5012  
**Supervisor:** Dr. O.A. Madamidola  

*A Thesis submitted to the Department of Information Technology, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in Information Technology of the Federal University of Technology, Akure, Ondo State, Nigeria.*

**February, 2026**

---

## Table of Contents

* [1. Introduction](#1-introduction)
  * [1.1 Background of the Study](#11-background-of-the-study)
  * [1.2 Literature Review of Related Works](#12-literature-review-of-related-works)
  * [1.3 Research Motivation](#13-research-motivation)
  * [1.4 Aim and Objectives of the Study](#14-aim-and-objectives-of-the-study)
  * [1.5 Methodology](#15-methodology)
  * [1.6 Expected Contribution to Knowledge](#16-expected-contribution-to-knowledge)
* [References](#references)

---

## 1. Introduction

### 1.1 Background of the Study

Web navigation and interaction constitute an essential component of modern digital operations, ensuring that individuals and organizations can seamlessly access information, execute transactions, and manage workflows. The effectiveness of web interaction directly influences productivity, operational efficiency, and user satisfaction. An autonomous browser agent is a sophisticated software system capable of perceiving a web environment, understanding the interface, and taking autonomous actions such as clicking, typing, and scrolling to achieve a user-defined goal without human intervention (Zheng et al., 2024). Historically, users and developers relied on conventional automation methods which often involve hardcoded scripts, macro recorders, and labor-intensive manual data entry. Although these conventional methods may have worked for simpler, static websites, they often suffer from severe inefficiencies, inaccuracies, and a profound lack of scalability when applied to the modern, dynamic web (He et al., 2024).

Traditional automation depends entirely on parsing the Document Object Model (DOM), the underlying HTML and XML structure of a webpage. According to Zhou et al. (2024), traditional web automation systems, although functional in controlled environments, are plagued with limitations such as extreme brittleness, inability to handle visual-only elements, and a complete lack of semantic understanding. These inefficiencies have led to challenges like broken workflows, high maintenance costs, and an inability to scale automation across diverse platforms. Modern web development frameworks utilize virtual DOMs and dynamically generated class names, meaning that the underlying code changes with almost every deployment. This renders static XPath or CSS selectors obsolete rapidly. Furthermore, these systems lack real-time visual context integration, a crucial aspect of modern automation that has become indispensable with the rise of complex, single-page applications.

With the advent of complex web applications, the complexity of digital workflows has increased exponentially. Users must now deal with multi-step authentications, cross-platform data synchronization, and highly dynamic user interfaces. These factors require an automation system that provides not only reliable interaction but also cognitive and predictive capabilities. As industries undergo rapid digital transformation, there is an increasing desire for technologies that can automate repetitive activities, decrease errors, and improve visibility throughout digital workflows. The emergence of advanced artificial intelligence (AI), specifically Large Multimodal Models (LMMs) and Vision-Language Models (VLMs), has made it possible to develop intelligent browser agents that address the shortcomings of traditional methods (Yang et al., 2023).

The application of VLMs has transformed browser automation by allowing real-time monitoring, zero-shot reasoning, and direct integration of visual context. These cutting-edge technologies use real-time visual data and complex neural networks to boost interaction accuracy and semantic understanding. Unlike their predecessors, VLMs process raw screenshots, analyze pixel distributions, recognize shapes, and understand the spatial relationships of elements on a screen. When an LMM observes a webpage, it identifies a "Checkout" button because it visually resembles a checkout button, completely bypassing the fragile DOM (Gur et al., 2023).

Intelligent web automation goes beyond mere script execution; it entails using complex algorithms to analyze visual data in real-time and make predictive decisions that optimize task completion. This transformation provides businesses and everyday users with the tools they need to delegate complex digital chores, thereby reducing cognitive load and improving operational efficiency (Liu et al., 2023; Deng et al., 2023).

Recent breakthroughs further validate the potential of vision-based agents for seamless computer interaction. The development of general-purpose computer use models, such as those introduced by Anthropic (2024), demonstrates that frontier vision-language models can directly interpret screen images to perform pixel-accurate cursor movements, clicks, and text inputs, mimicking human behavior. By empowering models to use arbitrary software without requiring bespoke tool integrations or underlying structural code, these advancements represent a significant step toward generalist automation that can reliably navigate and execute complex, multi-step digital workflows.

---

### 1.2 Literature Review of Related Works

Table 1 summarizes the recent advancements in autonomous web agents and large multimodal models, highlighting their objectives, methodologies, contributions, and key limitations.

#### Table 1: Summary of Related Works in Autonomous Web Agents

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
| **OpenAI (2025)**<br>_Computer-Using Agent (CUA) Powering Operator_ | To create a universal vision-based GUI agent for autonomous web and desktop tasks. | Combines GPT-4o vision with reinforcement learning for iterative screen observation + mouse/keyboard actions. | Achieves new SOTA on OSWorld (38.1 %), WebArena (58.1 %), and WebVoyager (87 %); enables fully autonomous Operator. | Early-stage with mandatory user confirmation for high-risk actions; variance on dynamic/captcha sites. |
| **Anthropic (2024)**<br>_Claude Computer Use_ | To enable frontier VLMs to control any computer interface and browser via pure vision. | API tool that takes screenshots and outputs precise cursor, click, type, and scroll actions. | First public frontier GUI agent; strong generalization across unseen apps/websites with no DOM reliance. | Beta release; ongoing safety/misalignment risks; API-only access limits client-side deployment. |
| **Yang et al. (2025)**<br>_The Adoption and Usage of AI Agents: Early Evidence from Perplexity (Comet & Computer)_ | To deploy and study a real-world AI-native browser agent for asynchronous web workflows. | Embedded multimodal agent in custom Comet browser + multi-model orchestration (Perplexity Computer) for background execution. | Provides the first large-scale field study of agent usage (hundreds of millions of interactions) and multi-model background agency. | Adoption-focused rather than novel architecture; heavy reliance on external model APIs; privacy considerations in background mode. |

Despite the significant advancements in VLM-enabled web agents, previous research reveals limitations in fully exploiting the potential of these models for intelligent, real-time, client-side execution. Many agent architectures have been reported in the literature, but they often suffer from severe architectural constraints.

Shi et al. (2024) developed WebVoyager, an end-to-end web agent utilizing Large Multimodal Models. While WebVoyager demonstrated impressive capabilities in navigating complex websites, the system was heavily reliant on massive, server-side infrastructure running headless browsers. It lacked the ability to operate directly within a user’s personal browser environment, requiring users to surrender their session cookies and authentication tokens to a remote server. This research highlighted the need for integrating VLMs into client-side extensions to enhance privacy and reduce latency.

Similarly, Liu et al. (2023) introduced LLaVA-Plus, a multimodal agent capable of using tools. However, the system did not include asynchronous background execution capabilities. When tasked with a multi-step web workflow, the agent hijacked the active viewport, preventing the user from continuing their own work. Furthermore, these systems often lacked a robust Human-in-the-Loop (HITL) verification protocol, executing high-risk actions (such as submitting forms or deleting data) without explicit user consent.

---

### 1.3 Research Motivation

In the increasingly competitive and globalized digital environment, effective web navigation and task automation have become critical components of operational efficiency. The mismanagement of digital workflows, leading to repetitive data entry, missed information, and errors in execution, has significant financial implications for businesses across industries. While traditional DOM-based automation systems have addressed some of these challenges through rigid scripting, they remain limited in their ability to adapt to real-time changes in web interfaces and dynamic content rendering.

The rise of Vision-Language Models (VLMs) has the potential to transform web automation by delivering real-time visual comprehension, enabling predictive analytics, and automating complex decision-making. However, as highlighted in the literature review, current VLM agents are predominantly server-bound, synchronous, and lack the necessary safety protocols for consumer deployment.

This research is motivated by the urgent need to develop a client-side, vision-based AI browser agent that integrates real-time visual state capture. The driving force behind this research is the desire to unlock the latent utility of the modern web browser. Currently, browsers are fundamentally passive tools. They sit idle, waiting for human input. By embedding a vision-based autonomous agent directly into the browser as an extension, we can transform it from a passive window into an active collaborator.

Furthermore, this research explores the concept of “background agency.” Current AI tools function primarily as conversational consultants. A true autonomous agent should be capable of receiving a high-level goal, disappearing into a background tab, and returning only when the task is complete. This transition from synchronous, conversational AI to asynchronous, execution-oriented AI represents the next meaningful evolution in human-computer interaction.

Finally, accessibility is a core motivation. A vision-based agent could serve as a universal interface layer, decoupling the complexity of modern web interfaces from the physical capability of the user, potentially making the web significantly more accessible to those who struggle with conventional point-and-click navigation.

---

### 1.4 Aim and Objectives of the Study

The overarching aim of this project is to develop an intelligent, vision-based autonomous browser agent capable of navigating web interfaces, interpreting visual elements, and executing workflows automatically.

To achieve this aim, the specific objectives of the research are to:

1. **Design** a vision-based autonomous browser agent capable of navigating web interfaces using real-time visual state capture.
2. **Implement** the designed agent utilizing a Vision-Language Model (VLM) for UI grounding and an asynchronous background execution engine.
3. **Evaluate** the performance of the implemented system using standard task success metrics, accuracy, and operational latency.

This research focuses specifically on the development of a client-side, vision-based agent packaged as a Chromium-based browser extension (Manifest V3). The study will prioritize the agent’s ability to generalize across unfamiliar, dynamic web interfaces using visual cues rather than relying on underlying HTML structures. The evaluation will be limited to standard web tasks (e-commerce navigation, information retrieval, form filling) and will not encompass interactions with desktop applications or operating system-level functions outside the browser environment. The project will utilize existing foundational VLMs (such as GPT-4V or Claude 3 Vision) via API, focusing the engineering effort on the grounding architecture, background execution, and safety protocols.

---

### 1.5 Methodology

This research combines a targeted literature review with a build-and-evaluate engineering methodology. The implementation is organized into five phases: Visual State Capture, Vision-Language Grounding, Asynchronous Execution, Human-in-the-Loop Verification, and System Evaluation.

The proposed system uses a hybrid client-server architecture where the browser extension performs time-critical perception and action execution, and a backend service performs planning and large-model inference. On the client side, the extension is split into:
- **(i) A user-facing chat UI** (popup or side panel) for receiving prompts and displaying step-by-step progress,
- **(ii) A background service worker** that manages task state and tool invocation, and
- **(iii) Content scripts** that run inside pages to read UI context and execute interactions.

On the server side, a Python FastAPI application exposes endpoints (and a streaming channel via WebSocket or server-sent events) that accept observations and return a structured action plan.

For perception, the extension captures a high-fidelity screenshot of the current viewport (and, where needed, a focused crop around candidate targets). In parallel, it extracts a compact structural snapshot consisting of only the visible and interactive elements (text, role/type, bounding boxes, and limited attributes), which reduces token cost while still resolving ambiguity. To improve grounding reliability, a Set-of-Marks procedure injects numbered overlays onto clickable and focusable elements. The model is then asked to reference marks by number and produce actions in a constrained schema (click/type/scroll/wait/navigate), rather than guessing raw pixel coordinates.

Operational autonomy is provided by an asynchronous execution loop that runs in isolated contexts. Using Chrome Offscreen Documents (and/or hidden tabs), the agent can execute tasks inside a separate “shadow” environment while leaving the user’s active tab undisturbed. Each step follows an observe-decide-act cycle, with explicit waits and re-observation to handle dynamic SPAs, loading states, and UI transitions.

Memory and session handling are treated as first-class engineering concerns. The backend persists long-term state in a PostgreSQL database, storing users, conversations, runs, step logs, and artifacts (with screenshots and DOM snapshots stored as files or blobs referenced by the database). Website authentication sessions remain in the browser’s execution context (cookies and local storage are not copied to the server), while the server stores only run metadata and pointers needed for reproducibility and audit.

Safety is enforced through a Human-in-the-Loop gate that classifies actions by risk. Low-risk actions can proceed automatically, but sensitive operations (logins, payments, account changes) require a mandatory confirmation in the extension UI with a clear preview of the intended target mark and action. Finally, system performance will be evaluated on WebArena and Mind2Web using Task Success Rate, element grounding precision (correct mark selection), and end-to-end latency.

---

### 1.6 Expected Contribution to Knowledge

This research anticipates making substantial contributions across three distinct but interconnected domains: the practical engineering of client-side AI, the empirical evaluation of visual versus structural web navigation, and the evolving paradigms of human-agent collaboration.

1. **Practical Engineering of Client-Side AI:** This project will rigorously explore the feasibility and architectural constraints of deploying vision-based agents directly to consumer devices via browser extensions. By attempting to package this sophisticated technology into a standard, lightweight browser extension, this research will generate invaluable practical knowledge regarding latency challenges, memory constraints, and architectural bottlenecks inherent in bringing Large Multimodal Models (LMMs) to the edge.
2. **Empirical Evaluation of Web Navigation Paradigm:** This work will contribute vital empirical data to the ongoing debate regarding robust web navigation. By directly benchmarking our vision-based extension against established DOM-reliant automation frameworks on identical, complex tasks, we will quantify its resilience. We will provide concrete metrics on error recovery rates and generalization across unfamiliar domains.
3. **Paradigms of Human-Agent Collaboration:** This project will advance our understanding of human-agent collaboration, specifically concerning the concept of "background agency." By implementing and testing a strict Human-in-the-Loop verification protocol for high-risk actions, this research will offer initial, practical frameworks for designing the user experience of asynchronous AI, which is critical as autonomous personal assistants become increasingly integrated into our daily digital lives.

---

## References

* Anthropic (2024). *Developing Computer Use*. Anthropic Research Blog. [https://www.anthropic.com/news/developing-computer-use](https://www.anthropic.com/news/developing-computer-use)
* Chen, Q., et al. (2024). *SeeClick: Harnessing GUI Grounding for GUI Agents*. arXiv preprint arXiv:2401.10900. [https://arxiv.org/abs/2401.10900](https://arxiv.org/abs/2401.10900)
* Deng, X., Gu, Y., Zheng, B., Chen, S., Stevens, S., Wang, B., Sun, H., & Su, Y. (2023). *Mind2Web: Towards a Generalist Agent for the Web*. Advances in Neural Information Processing Systems, 36. [https://arxiv.org/abs/2306.06070](https://arxiv.org/abs/2306.06070)
* Gur, I., Furuta, H., Huang, A., Safdari, M., Matsuo, Y., Eck, D., & Faust, A. (2023). *A Real-World WebAgent with Planning, Long Context Understanding, and Program Synthesis*. arXiv preprint arXiv:2307.12856 (ICLR 2024 Oral). [https://arxiv.org/abs/2307.12856](https://arxiv.org/abs/2307.12856)
* He, H., Yao, W., Ma, K., Yu, W., Dai, Y., Zhang, H., Lan, Z., & Yu, D. (2024). *WebVoyager: Building an End-to-End Web Agent with Large Multimodal Models*. arXiv preprint arXiv:2401.13919. [https://arxiv.org/abs/2401.13919](https://arxiv.org/abs/2401.13919)
* Koh, J. Y., Lo, R., Sridhar, A., et al. (2024). *VisualWebArena: Evaluating Multimodal Agents on Realistic Visual Web Tasks*. arXiv preprint arXiv:2401.13649. [https://arxiv.org/abs/2401.13649](https://arxiv.org/abs/2401.13649)
* Liu, S., Cheng, H., Liu, H., Zhang, H., Li, F., Ren, T., Zou, X., Yang, J., Su, H., Zhu, J., Zhang, L., Gao, J., & Li, C. (2023). *LLaVA-Plus: Learning to Use Tools for Creating Multimodal Agents*. arXiv preprint arXiv:2311.05437. [https://arxiv.org/abs/2311.05437](https://arxiv.org/abs/2311.05437)
* Liu, X., et al. (2023). *AgentBench: Evaluating LLMs as Agents*. arXiv preprint arXiv:2308.03688. [https://arxiv.org/abs/2308.03688](https://arxiv.org/abs/2308.03688)
* Lü, X. H., et al. (2024). *WebLINX: Real-World Website Navigation with Multi-Turn Dialogue*. arXiv preprint arXiv:2402.05930. [https://arxiv.org/abs/2402.05930](https://arxiv.org/abs/2402.05930)
* OpenAI (2025). *Computer-Using Agent*. [https://openai.com/index/computer-using-agent/](https://openai.com/index/computer-using-agent/)
* Xie, T., et al. (2024). *OSWorld: Benchmarking Multimodal Agents for Open-Ended Computer Tasks*. arXiv preprint arXiv:2404.07972. [https://arxiv.org/abs/2404.07972](https://arxiv.org/abs/2404.07972)
* Yang, J., Yonack, N., Zyskowski, K., Yarats, D., Ho, J., & Ma, J. (2025). *The Adoption and Usage of AI Agents: Early Evidence from Perplexity*. arXiv preprint arXiv:2512.07828. [https://arxiv.org/abs/2512.07828](https://arxiv.org/abs/2512.07828)
* Yang, J., Zhang, H., Li, F., Zou, X., Li, C., & Gao, J. (2023). *Set-of-Mark Prompting Unleashes Extraordinary Visual Grounding in GPT-4V*. arXiv preprint arXiv:2310.11441. [https://arxiv.org/abs/2310.11441](https://arxiv.org/abs/2310.11441)
* Zheng, B., Gou, B., Kil, J., Sun, H., & Su, Y. (2024). *GPT-4V(ision) is a Generalist Web Agent, if Grounded*. arXiv preprint arXiv:2401.01614. [https://arxiv.org/abs/2401.01614](https://arxiv.org/abs/2401.01614)
* Zhou, S., Xu, F. F., Zhu, H., Zhou, X., Lo, R., Sridhar, A., Cheng, X., Ou, T., Bisk, Y., Fried, D., Alon, U., & Neubig, G. (2024). *WebArena: A Realistic Web Environment for Building Autonomous Agents*. International Conference on Learning Representations (ICLR). [https://arxiv.org/abs/2307.13854](https://arxiv.org/abs/2307.13854) (project site: [https://webarena.dev](https://webarena.dev))