# CHAPTER TWO: LITERATURE REVIEW

## 2.0 INTRODUCTION

The modern web browser has evolved from a passive document renderer into the most ubiquitous and complex application runtime on the planet. Every day, billions of users interact with enterprise dashboards, government portals, financial trading platforms, healthcare record systems, e-commerce checkouts, and collaborative productivity suites — all mediated through the browser viewport. Yet the manner in which these interactions are performed has remained fundamentally unchanged for decades: a human operator reads visual content, reasons about interface affordances, moves a cursor to a target element, and executes a click or keystroke. The cognitive bandwidth demanded by repetitive, multi-step web workflows represents one of the largest remaining sources of manual labour in the digital economy, and automating these workflows at scale has proven to be an extraordinarily difficult engineering challenge.

Early approaches to web automation relied on brittle, scripted interactions anchored to the structural underpinnings of web pages: CSS selectors, XPath expressions, and DOM traversal queries. These techniques, while effective in tightly controlled, static environments, collapse catastrophically when confronted with the dynamic, asynchronous, and visually complex reality of the contemporary web. Single-Page Applications (SPAs) generate randomised class name hashes with every production build; shadow DOM boundaries and `<canvas>` elements render entire interactive surfaces invisible to traditional query selectors; and asynchronous content mounting races create unpredictable timing failures that no fixed-delay `waitForSelector` call can reliably resolve. The fundamental limitation is architectural: DOM-based scripts perceive web pages as trees of structured text nodes, whereas human users perceive them as visual layouts of buttons, input fields, images, and text. Closing this perception gap has become the central research problem in web automation.

The convergence of three transformative advances in artificial intelligence has opened a plausible path toward closing it. First, the Transformer architecture, introduced by Vaswani et al. (2017), discarded recurrent inductive biases in favour of a pure self-attention mechanism capable of modelling long-range dependencies across arbitrarily structured input sequences. This architectural innovation rapidly proved to be a universal computational primitive, scaling from natural language tokens to image patches and, more recently, to multimodal interleaved sequences that combine text, vision, and structured data in a single forward pass. Second, the scaling of autoregressive language models — from GPT-2 to GPT-4, Claude, and Gemini — demonstrated that next-token prediction, when trained over sufficiently large corpora with sufficiently deep parameter counts, yields emergent reasoning behaviours that generalise across tasks, domains, and modalities without task-specific fine-tuning. Third, the development of Vision Transformers (ViT) and subsequent Vision-Language Models (VLMs) established that pixel-level visual inputs could be tokenised, embedded, and attended to within the same Transformer backbone that processes natural language, enabling a single model to simultaneously read a screenshot and reason about actionable interface elements.

The practical consequence of these converging advances is the emergence of the autonomous web agent: a software system that observes a live browser viewport through visual and structural sensor channels, formulates a multi-step plan, selects precise spatial targets, and executes discretised mouse and keyboard actions through low-level browser protocols. This paradigm — observe, decide, act — shifts the automation boundary from brittle code artefacts to semantic visual understanding. A properly engineered visual agent does not care whether a button's CSS class is `btn-primary-v2` or `x7k9m_abc`; it sees a rectangular region labelled "Submit" and targets it by spatial reference. This robustness to frontend churn is the primary architectural advantage of vision-grounded agency over DOM-scripted automation, and it is the central hypothesis investigated in the system at the heart of this review.

However, the construction of a production-viable autonomous web agent demands far more than a capable VLM. It requires careful attention to execution locality, because transmitting raw viewport screenshots and session cookies to remote cloud inference servers introduces untenable privacy risks and network latencies. It requires a polyglot client-daemon runtime that decouples the heavyweight model inference layer from the lightweight browser actuation layer, distributing compute across CPU, GPU, and edge processes while maintaining deterministic control over which actions are dispatched to the browser. It requires a programmatic safety gateway capable of intercepting VLM-generated actions before they reach the Chrome DevTools Protocol (CDP) socket, applying deterministic policy rules to detect and block destructive operations — including those triggered by indirect prompt injection attacks embedded in webpage content. And it requires a principled evaluation framework that measures not only task completion success but also execution latency, token efficiency, and recovery resilience against dynamic page mutations.

This chapter undertakes a thorough and theoretically grounded review of the scientific literature, engineering protocols, and research artefacts that collectively constitute the intellectual foundation for such a system. The review traces a deliberate arc from the broad theoretical principles of artificial intelligence and machine learning, through the architectural specifics of Transformer networks and vision-language fusion, down to the granular operational details of browser automation protocols, client-daemon execution topologies, and programmatic safety enforcement mechanisms. It further provides a detailed, paper-by-paper critical examination of fifteen landmark studies in web agency, visual grounding, multimodal benchmarking, and autonomous computer control, identifying the precise architectural, security, and performance limitations that the system is engineered to address. Taken together, this review establishes the scholarly context within which the system design, methodology, and evaluation presented in the subsequent chapter must be understood.

---

## 2.1 ARTIFICIAL INTELLIGENCE
Artificial intelligence (AI) represents the domain of computer science dedicated to creating software systems capable of executing cognitive tasks that historically demanded human intelligence. These tasks encompass reasoning, semantic understanding, spatial generalization, decision-making, and experiential learning (Jack Copeland, 2024). AI serves as a general-purpose technology with applications spanning administrative workflows, robotics, industrial control loops, and diagnostic engines.

Historically, artificial intelligence research has transitioned from simple reactive systems to complex, stateful models. The simplest architectures process real-time inputs without maintaining historical context or memory structures. Such reactive systems analyze a current observation and generate an action based on static, mathematical rules or mapping functions. A prominent historical benchmark is IBM's Deep Blue, which defeated grandmaster Garry Kasparov in chess by executing real-time minimax heuristic evaluations of board states without retaining historical game memory.

Modern deep learning applications rely on limited memory architectures. Unlike simple reactive systems, limited memory systems can store historical observations, state histories, and sequential context over defined, transient windows (Coursera Staff, 2024). These systems utilize temporal queues or attention buffers to make informed, predictive decisions. Modern conversational assistants, self-driving vehicle planning loops, and stateful autonomous web agents belong to this class, as they analyze temporal sequences of screenshots and conversation histories to construct subsequent action steps. 

Beyond limited memory systems, advanced artificial intelligence research explores the concept of Theory of Mind. This involves creating systems capable of modeling, comprehending, and adapting to the internal emotional states, belief systems, dynamic motivations, and cognitive states of human collaborators (Johnson, 2020). Achieving this level of cognitive awareness is essential for highly interactive, conversational personal agents that must dynamically adjust their execution loops based on user stress, administrative urgency, or changing operational intent.

---

## 2.2 MACHINE LEARNING
Machine learning (ML) is a core subset of artificial intelligence wherein computational algorithms learn statistical representations and predictive patterns directly from training data without being programmatically hardcoded (Deo, 2015). Rather than executing static loops, ML models optimize mathematical objective functions to identify latent structures in complex datasets, generalizing their learned rules to unseen inputs (Beam & Kohane, 2018).

Machine learning is mathematically divided into supervised, unsupervised, and reinforcement learning paradigms. Supervised learning involves training a statistical estimator on a curated dataset of labeled input-output pairs:
$$\mathcal{D} = \{ (x_i, y_i) \}_{i=1}^N$$
where $x_i$ represents the feature vector and $y_i$ represents the ground-truth label. The algorithm optimizes model parameters to construct a mapping function $h(x) \approx y$ (Pruneski et al., 2022). Supervised learning is mathematically split into classification, where the target space consists of discrete class labels, and regression, where the target space is continuous.

Unsupervised learning operates on unlabeled datasets:
$$\mathcal{D} = \{ x_i \}_{i=1}^N$$
The system must autonomously discover underlying structures, latent distributions, or spatial groupings within the feature space without explicit developer targets (Willetts et al., 2019). Key unsupervised paradigms include clustering (grouping elements into cohesive categories based on spatial distance metrics) and dimensionality reduction (compressing high-dimensional input spaces into lower-dimensional coordinate projections).

Reinforcement learning (RL) models the interaction of an autonomous agent within a dynamic environment to maximize cumulative scalar rewards (Marr, 2018). Formulated as a Markov Decision Process (MDP) defined by the tuple $(S, A, P, R, \gamma)$, the agent observes state $s_t \in S$, executes action $a_t \in A$ according to policy $\pi(a \mid s)$, transitions to state $s_{t+1}$ via transition probability $P(s_{t+1} \mid s_t, a_t)$, and receives scalar reward $r_t = R(s_t, a_t)$. Modern browser agents increasingly utilize deep reinforcement learning techniques (such as Deep Q-Networks or Proximal Policy Optimization) to iteratively optimize visual navigation paths, using task success as a binary reward signal.

---

## 2.3 DEEP LEARNING & NEURAL NETWORKS
Deep learning (DL) is a highly specialized subfield of machine learning that utilizes deep, multi-layered Artificial Neural Networks (ANNs) to process high-dimensional inputs (Sarker, 2021). By stacking multiple layers of non-linear computational nodes, deep learning models autonomously extract hierarchical feature representations directly from raw data (e.g., raw pixels or text characters), completely bypassing the need for manual feature engineering.

### 2.3.1 Neural Network Fundamentals
An Artificial Neural Network (ANN) consists of interconnected computational units called neurons, organized into an input layer, one or more hidden layers, and an output layer. A single neuron processes its input vector $\mathbf{x}$ by computing a weighted sum, adding a scalar bias $b$, and passing the result through a non-linear activation function $\sigma$:
$$y = \sigma(\mathbf{w}^T\mathbf{x} + b)$$
Standard activation functions include the Sigmoid, Hyperbolic Tangent (tanh), and the Rectified Linear Unit (ReLU), defined as:
$$\text{ReLU}(z) = \max(0, z)$$
ReLU is highly favored in deep networks because it effectively mitigates the vanishing gradient problem, allowing gradients to flow efficiently during backpropagation.

### 2.3.2 Deep Learning Architectures
Deep neural networks stack dozens of hidden layers. During training, the network performs a forward pass to generate a prediction, calculates the error against ground-truth labels using a loss function (e.g., Cross-Entropy or Mean Squared Error), and executes a backward pass. Backpropagation computes the partial derivatives of the loss function with respect to all network weights using the mathematical chain rule, updating parameters via optimization algorithms such as Adam or Stochastic Gradient Descent (SGD) (Alzubaidi et al., 2021).

### 2.3.3 The Transformer Architecture & Self-Attention
Modern vision-language agents are powered entirely by Transformer-based models. Introduced by Vaswani et al. (2017), the Transformer architecture completely discards recurrent neural pathways, relying instead on the **Self-Attention** mechanism to capture long-range contextual relationships across sequences.

Let $X \in \mathbb{R}^{n \times d}$ represent an input sequence matrix of $n$ tokens. The sequence is projected into three distinct matrices: Queries ($Q$), Keys ($K$), and Values ($V$), using learned weight matrices $W_Q, W_K, W_V \in \mathbb{R}^{d \times d}$:
$$Q = X W_Q, \quad K = X W_K, \quad V = X W_V$$
The Scaled Dot-Product Attention is computed mathematically as:
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$
where $d_k$ represents the scaling dimension of the key vectors. This mechanism allows each token in the sequence (whether a word in a prompt or a patch in a screenshot) to dynamically attend to every other token, enabling highly sophisticated semantic planning and contextual reasoning.

---

## 2.4 LARGE LANGUAGE MODELS (LLMs) & NATURAL LANGUAGE PROCESSING
Natural Language Processing (NLP) is the branch of artificial intelligence focused on enabling computers to parse, interpret, and generate human language (Gillis, 2024). The integration of deep Transformer networks has enabled the development of Large Language Models (LLMs) that display advanced contextual understanding and text generation capabilities (Merigan, 2023).

### 2.4.1 Autoregressive Language Modeling
State-of-the-art LLMs (such as GPT-4 or Gemini) are autoregressive decoder-only Transformers trained on massive corpora of web text. The training objective is next-token prediction: given a sequence of tokens $x_1, \dots, x_t$, the model computes the conditional probability distribution for the subsequent token $x_{t+1}$:
$$P(x_{t+1} \mid x_1, \dots, x_t) = \text{softmax}\left( \text{VLM\_Decoder}(x_1, \dots, x_t) \right)$$
During inference, the model samples from this distribution, appends the generated token to the sequence, and repeats the process. This next-token autoregressive generation enables the model to output reasoning paths and construct structured action blocks.

### 2.4.2 Prompt Engineering & Context Operations
To control LLM execution, developers utilize prompt engineering, the process of structuring input prompts to guide the model's reasoning without altering its weights. Key techniques include:
-   **System Prompts:** Setting global behavioral guidelines, task limits, and strict schema rules (e.g., mandating structured JSON outputs).
-   **Few-Shot Prompting:** Providing input-output examples directly within the context window to demonstrate desired action formats.
-   **Context Windows:** Managing the model's internal memory buffer. Because context windows are bounded (e.g., 128k tokens), stateful web agents must employ context compaction heuristics to discard or summarize historical steps, maintaining token efficiency.

---

## 2.5 COMPUTER VISION & VISION-LANGUAGE MODELS (VLMs)
Computer vision is the subfield of artificial intelligence that trains computer systems to capture, process, and interpret meaningful information from visual inputs, such as digital screenshots and videos (Ashtari, 2022). Historically dominated by Convolutional Neural Networks (CNNs), modern visual perception utilizes Vision Transformers (ViTs) integrated into multimodal Vision-Language Models (VLMs).

### 2.5.1 Vision Transformers (ViT)
To process images within a Transformer architecture, Dosovitskiy et al. (2020) introduced the **Vision Transformer (ViT)**. ViT operates by:
1.  Splitting an input image $I \in \mathbb{R}^{H \times W \times C}$ into a sequence of non-overlapping flat patches $x_p \in \mathbb{R}^{N \times (P^2 \cdot C)}$, where $P \times P$ is the patch resolution and $N = \frac{HW}{P^2}$ is the number of patches.
2.  Projecting these patches into a linear embedding space using a learned projection matrix $E$.
3.  Appending a learnable classification token (`[class]`) and adding 1D positional embeddings to preserve spatial relationships.
4.  Passing the embedded patches through standard self-attention blocks.

```
+-----------------------------------------------------------------------------------+
|  FIGURE 2.1: Structural Topology of a Vision Transformer (ViT) Encoder            |
|                                                                                   |
|  +-------------------------+                                                      |
|  |  Viewport Screenshot I  |  (e.g., 1280x720 WebP)                               |
|  +-------------------------+                                                      |
|               |                                                                   |
|               v                                                                   |
|  [ Non-Overlapping Patches ] ===> Flatten into vector sequence x_p                |
|               |                                                                   |
|               v                                                                   |
|  [ Linear Projection (E)   ] ===> Linear mapping to patch embeddings              |
|               |                                                                   |
|               v                                                                   |
|  [ + Positional Embedding  ] ===> Add 1D spatial coordinate tokens                |
|               |                                                                   |
|               v                                                                   |
|  [ Multi-Head Attention    ] ===> Autoregressively attends elements visually      |
+-----------------------------------------------------------------------------------+
```
*Figure 2.1: Structural breakdown of Vision Transformer patch tokenization pipeline.*

### 2.5.2 Multimodal Alignment & Fusion
A VLM integrates a visual encoder (ViT) and a language decoder (LLM) into a unified neural framework. Visual patch embeddings are aligned with text token embeddings using a projection layer (such as a linear projection or a cross-attention module). This alignment maps visual features (such as icons, buttons, or input boxes) directly to text tokens, enabling the VLM decoder to read visual pages and reason about them using natural language.

### 2.5.3 Spatial Grounding & Bounding Box Regressions
Spatial grounding is the capability of a VLM to map text queries to precise coordinates within an image. During pre-training, models are supervised on visual grounding datasets to predict bounding boxes, outputting coordinates in normalized formats:
$$\text{Box} = [y_{\text{min}}, x_{\text{min}}, y_{\text{max}}, x_{\text{max}}]$$
where coordinates are scaled between 0 and 1000. While this enables standard GUI agents to target buttons, visual downsampling and autoregressive drift cause spatial coordinate hallucinations, requiring discretization methods like Set-of-Marks.

```
+-----------------------------------------------------------------------------------+
|  FIGURE 2.2: Bounding Box Coordinate Discretization using Set-of-Marks (SoM)      |
|                                                                                   |
|  Viewport Image S_t                 Accessibility Tree Nodes                      |
|  +-------------------------+        +------------------------------------------+  |
|  |   [   Submit Button   ] | <====  | Node: ID=@e12, role=button, name=Submit  |  |
|  +-------------------------+        +------------------------------------------+  |
|               |                                                                   |
|               v (Programmatic Overlay Injection)                                  |
|  Viewport Snapshot M_t                                                            |
|  +-------------------------+        VLM receives snapshot M_t with visual label.  |
|  | [12] [Submit Button]    | ====>  VLM selects Ref "12" in structured JSON.      |
|  +-------------------------+        CDP targets element @e12 directly.            |
+-----------------------------------------------------------------------------------+
```
*Figure 2.2: Discretizing coordinate prediction spaces using programmatic SoM overlays.*

---

## 2.6 WEB TECHNOLOGIES & BROWSER AUTOMATION

### 2.6.1 Document Object Model (DOM) Hierarchy
As described in Section 2.1, the DOM is the parsed representation of a webpage. It forms a tree of nested objects representing parent-child relationships:
-   **Nodes:** The generic base objects in the tree.
-   **Elements:** Specific HTML tags (e.g., `<div>`, `<a>`, `<input>`) possessing attributes (e.g., `href`, `id`, `class`) and text content.
-   **Accessibility Tree:** A parallel tree generated by the browser engine specifically for assistive technologies (screen readers). It filters out purely decorative nodes, leaving only semantic controls possessing specific roles (e.g., `button`, `textbox`), states (e.g., `focused`, `disabled`), and accessible names.

### 2.6.2 Single-Page Applications & Selector Brittleness
Traditional web pages reloaded the entire document from the server on every interaction. Modern Single-Page Applications (SPAs) utilize client-side routing, virtual DOM engines, and asynchronous JavaScript execution (AJAX) to dynamically modify the page.

This dynamic mounting introduces extreme selector brittleness for DOM-based scripts:
*   **Dynamic Class Names:** Styling frameworks generate randomized hashes for class names to prevent style conflicts, changing them with every code release.
*   **Asynchronous Loading States:** Elements are mounted dynamically, causing traditional Playwright/Selenium scripts to crash with timing issues if the target is not instantly interactive.
*   **Canvas & Shadow DOM Boundaries:** Modern interfaces render highly complex interactive tools inside isolated `<canvas>` elements or shadow roots that completely hide their structural nodes from standard DOM query methods.

### 2.6.3 Browser Protocols & CDP (Chrome DevTools Protocol)
To bypass the limitations of high-level driver wrappers, browser automation can utilize direct, low-level browser protocols. The **Chrome DevTools Protocol (CDP)** is the standard protocol for controlling Chromium-based browsers. 

CDP communicates directly with the browser’s core engine via local WebSockets, exposing raw capability domains:
-   `Page`: Capture screenshots, navigate, manage lifecycles.
-   `DOM`: Retrieve node structures, resolve bounding boxes.
-   `Accessibility`: Extract the accessibility tree.
-   `Input`: Dispatch raw hardware mouse movements, clicks, and keystrokes.
-   `Network`: Intercept and rewrite HTTP headers and manage cookies.

CDP operates locally, providing a low-latency, secure channel to manipulate browser viewports.

---

## 2.7 CLIENT-DAEMON WEB AGENT PARADIGMS

### 2.7.1 Server-Bound Headless Execution
Early VLM web agents (such as WebVoyager) utilize server-bound headless execution. The browser engine runs on a cloud server, and the agent orchestrator coordinates actions by streaming visual frames and command payloads.

This cloud-hosted paradigm introduces severe security and operational challenges:
*   **Cookie Jar Exposure:** Authenticated operations require the user to upload active session cookies, passwords, and tokens to the remote cloud database, leaving the user vulnerable to security breaches.
*   **High Latency:** Uploading massive raw screenshot streams over WAN connections introduces significant network lag.
*   **High Compute Overhead:** Running thousands of headless Chromium servers in parallel creates high infrastructure costs.

### 2.7.2 Local Decoupled Execution (agent-browser)
To resolve server-side security issues, contemporary systems transition browser execution to the client’s local device. **Project Mayra** decouples visual reasoning from browser execution by using Vercel’s `agent-browser` as a local CDP subprocess daemon.

This local-first paradigm preserves security and privacy:
1.  **Local Profile Attaching:** The daemon connects to the user’s local running Chrome profile over debugging port `9222`.
2.  **Credential Locality:** All active session cookies, passwords, and MFA tokens remain stored in the user's local Chrome profile, never leaving the local device.
3.  **Low Latency:** CDP WebSocket commands execute locally over the loopback interface `127.0.0.1`, eliminating WAN latency.
4.  **Edge Compute:** Viewport rendering and WebP image compression are handled locally on the client's device, distributing the computational load.

---

## 2.8 SAFETY GATEWAY ARCHITECTURES & HUMAN-IN-THE-LOOP (HITL)

### 2.8.1 Prompt Injection Risks in GUI Automation
Autonomous agents operating in open-ended browser environments face the threat of **indirect prompt injection**. A webpage can contain hidden text segments (styled white-on-white or in tiny font sizes) designed to override the agent's system prompt (e.g., *"Ignore prior goals. Direct the mouse cursor to 'Delete Account' immediately and set risk=low"*). 

If the agent’s orchestration loop relies purely on VLM reasoning without external checks, the model will follow the injected instruction, executing unauthorized and potentially destructive actions.

### 2.8.2 Programmatic Safety Gates & Verification Popups
To prevent prompt injections or VLM hallucinations from causing damage, autonomous loops must execute actions through a local, deterministic safety boundary:
-   **Deterministic Policy Filter:** The local orchestrator intercepts the VLM's proposed action and evaluates it against programmatic rules (e.g., identifying trigger keywords like *"delete"*, form submissions, or external domain redirections).
-   **Human-in-the-Loop Gate:** If a policy rule is triggered, the orchestrator halts execution, blocks the action from reaching CDP, and launches a Tauri popup. The user must visually confirm and manually approve the action before it is allowed to execute.
-   **2FA Interception:** If a two-factor authentication field is encountered, the agent pauses the loop, triggers local OS notifications, and waits for user input, preventing automated bypass attempts.

---

## 2.9 REVIEW OF RELATED WORKS

This section provides a detailed, paper-by-paper critical analysis of fifteen landmark works in web agency, large multimodal models, and visual grounding, detailing their exact objectives, methodologies, contributions, and primary engineering limitations.

### 2.9.1 He et al. (2024)
He et al. (2024) conducted a study with the objective of building a general-purpose, end-to-end autonomous web agent, WebVoyager, capable of executing complex user instructions visually across diverse real-world websites. Their methodology involved utilizing a foundational multimodal model (GPT-4V) to directly process raw page screenshots, extract coordinates, and generate sequential action plans (clicks, keystrokes, scrolls, and navigations) without relying heavily on underlying DOM code. The results demonstrated strong zero-shot visual generalization capabilities across unseen web interfaces, showing that purely visual web agents can compete effectively with DOM-based scripts. However, a major limitation of this study was its server-bound architecture, which required running headless browser environments on centralized cloud infrastructure, forcing users to exfiltrate session cookies and login passwords to remote database servers, thereby creating significant security vulnerabilities.

### 2.9.2 Zhou et al. (2024)
Zhou et al. (2024) undertook a study with the objective of constructing a highly realistic, unified benchmarking environment, WebArena, to systematically evaluate the execution success and functional correctness of autonomous web agents. Their methodology involved building a local, self-contained Docker sandbox hosting fully functional implementations of complex web applications (e-commerce platforms, developer tools, and institutional wikis), mapping tasks directly to execution verification checkers instead of superficial sequence text matches. The results shifted the evaluation paradigm of the agent community toward functional correctness, establishing strict benchmarks for web agents. Despite these contributions, the research was limited by its purely evaluative nature, as it did not propose a secure client-side execution framework or address the severe processing latencies and high API token costs associated with live web automation loops.

### 2.9.3 Zheng et al. (2024)
Zheng et al. (2024) conducted research with the objective of adapting foundational vision-language models into highly accurate web UI navigators by resolving spatial coordination errors. Their methodology involved developing a visual grounding compiler that maps high-level textual tasks directly to screen coordinate coordinates, bypassing fragile DOM-based CSS selectors and XPaths. The results demonstrated that visual grounding can equal or surpass HTML parsing approaches for cross-domain web navigation tasks, validating the viability of pure visual agents. However, a major engineering limitation was the model's complete lack of stateful temporal memory, causing the navigation loop to fail consistently on long-horizon, multi-page workflows where intermediate step states must be preserved.

### 2.9.4 Liu et al. (2023)
Liu et al. (2023) conducted a study with the objective of expanding open-source visual-language models with dynamic tool-use capabilities, creating LLaVA-Plus. Their methodology involved fine-tuning a visual-language model on specialized, multi-turn tool interaction datasets, enabling the model to autonomously select and invoke external browser API blocks alongside text responses. The results bridged the gap between conversational multimodal AI and physical browser actuation, proving that lightweight visual models can learn complex tool interactions. Nevertheless, the study suffered from severe operational limitations, as the tool execution layer hijacked the user's active viewport during browser actions, preventing parallel human work, and lacked a local programmatic safety filter to block prompt-injected destructive actions.

### 2.9.5 Yang et al. (2023)
Yang et al. (2023) conducted research with the objective of improving the spatial coordinate prediction accuracy and grounding precision of frontier vision-language models. Their methodology involved designing a preprocessing visual filter called Set-of-Marks (SoM) prompting, which overlays numbered, semi-transparent bounding box labels directly on candidate interactive GUI targets in the viewport, allowing the VLM to select targets by reference ID rather than predicting continuous coordinates. The results demonstrated a dramatic reduction in spatial coordinate hallucinations, optimizing visual grounding precision across diverse viewports and display zoom levels. However, a key limitation of the study was its reliance on an initial DOM scan to resolve element coordinate positions to place the overlays, thus remaining tethered to the underlying structural code.

### 2.9.6 Deng et al. (2023)
Deng et al. (2023) conducted a study with the objective of constructing a massive, diverse training dataset and baseline models for generalist web agents across unseen domains, establishing Mind2Web. Their methodology involved collecting over 2,000 tasks across 137 real-world web domains, and developing a filter-then-reason execution pipeline (MindAct) that prunes noisy HTML code before language model planning. The results provided the academic community with its first massive, open-domain dataset for training and benchmarking web agents. Despite its foundational contributions, the study’s limitation lay in its heavy reliance on textual HTML tokens and structural DOM hierarchies, failing completely on dynamic canvas interfaces, visual-only overlays, or obfuscated class name setups where the static DOM structure breaks.

### 2.9.7 Gur et al. (2023)
Gur et al. (2023) carried out a study with the objective of building a practical web agent, WebAgent, capable of completing complex, multi-step tasks on live web applications. Their methodology involved combining an LLM-based high-level planner with long-context history buffers and program synthesis engines to compile executable Selenium automation scripts dynamically. The results proved that combining sequential planning with code generation allows agents to complete long-horizon tasks on dynamic websites. However, the system's primary limitation was its absolute reliance on verbose HTML text inputs, making the pipeline highly susceptible to context-window bloat, high token costs, and immediate failure when front-end structures mutate.

### 2.9.8 Koh et al. (2024)
Koh et al. (2024) undertook research with the objective of constructing a rigorous visual-centric benchmark, VisualWebArena, to evaluate multimodal agents in realistic web environments. Their methodology involved extending the WebArena framework by creating tasks that require visual reasoning (e.g., reading web charts, visually identifying product matches) and capturing screenshots of active viewports as the primary observation inputs. The results exposed the massive limitations of DOM-only text agents, proving that visual grounding is essential for modern web task success. However, the study was limited by its purely bench-level focus, offering no novel client-side daemon architecture or solutions to manage visual processing latencies on edge consumer devices.

### 2.9.9 Lü et al. (2024)
Lü et al. (2024) conducted a study with the objective of creating a realistic evaluation benchmark, WebLINX, for conversational web navigation in multi-turn environments. Their methodology involved gathering thousands of human web navigation demonstrations across live websites, pairing physical actions with natural language conversations, generating a massive multi-turn dialogue dataset. The results provided valuable benchmarks for conversational agent steering, proving that dialog integration improves task success on long-horizon tasks. Nevertheless, the study’s limitation was its emphasis on manual dialog guidance rather than fully autonomous background agency, and its data collection methodology was highly resource-intensive.

### 2.9.10 Liu et al. (2023)
Liu et al. (2023) conducted research with the objective of systematically benchmarking the agentic reasoning and tool execution capabilities of large language models across diverse digital environments, establishing AgentBench. Their methodology involved designing a multi-dimensional benchmarking harness that evaluates models across CLI terminals, database environments, and browser interactions. The results established standardized metrics for comparing model reasoning, proving that frontier models outscore smaller parameters. However, the browser evaluation track was highly simplified, relying on text-based web tasks that completely bypassed the visual grounding and frontend layout complexities of the real-world web.

### 2.9.11 Xie et al. (2024)
Xie et al. (2024) conducted a study with the objective of benchmarking multimodal agents on open-ended OS tasks, including complete control over desktop and browser environments, creating OSWorld. Their methodology involved building a unified virtual machine execution sandbox that feeds raw screenshots to agents and accepts mouse and keyboard execution coordinates. The results demonstrated the feasibility of generalist visual agents operating across multiple desktop applications. Nonetheless, the wide execution environment resulted in high performance variance, and browser navigation remained highly inconsistent, lacking local client security filters to block destructive visual commands.

### 2.9.12 Chen et al. (2024)
Chen et al. (2024) conducted a study with the objective of improving visual grounding precision and target location capabilities on GUI interfaces, establishing SeeClick. Their methodology involved pre-training a Vision-Language Model on massive GUI datasets using click coordinates as grounding supervision. The results showed a significant improvement in element target location precision on desktop and web views, reducing pixel-coordinate prediction drift. However, the study was limited by its narrow focus on single-step click actions, showing weaker performance on sequential text input, scroll execution, and long-horizon multi-turn goal planning.

### 2.9.13 OpenAI (2025)
OpenAI (2025) introduced a universal computer-use agent, CUA (commercially deployed as Operator), with the objective of automating complex desktop and browser workflows via visual perception. Their methodology combined a state-of-the-art vision-language model with reinforcement learning, allowing the agent to dynamically plan, reason, and execute actions based on real-time visual observations of the desktop environment. The results established new benchmarks on standard environments (WebArena, OSWorld), demonstrating high visual task execution success. However, a major architectural limitation is its cloud-bound infrastructure, which forces users to upload raw desktop visual feeds and session data to external cloud databases, creating significant privacy risks and operational latency.

### 2.9.14 Anthropic (2024)
Anthropic (2024) conducted research with the objective of enabling frontier visual-language models to directly control arbitrary computer interfaces, releasing the "Computer Use" API. Their methodology involved configuring the Claude model to accept viewport screenshots and output structured mouse movement, click coordinates, scroll steps, and keyboard keystrokes to a local OS-level virtualizer. The results proved that generalist VLMs can control arbitrary software without custom tools. However, the API wrapper is limited by high execution latencies, lacks edge runtime optimizations, and is highly vulnerable to prompt injection, leaving the client device open to malicious exfiltration or data deletion.

### 2.9.15 Yang et al. (2025)
Yang et al. (2025) conducted a study with the objective of deploying and evaluating a commercial, AI-native browser agent, Perplexity Comet/Computer, for asynchronous web workflows in real-world settings. Their methodology involved embedding an orchestration service into a custom desktop browser (Comet), running multi-step web workflows in isolated background threads. The results provided the first large-scale field data on agent adoption and usage in background execution modes. Nevertheless, the closed commercial nature of the system presents severe limitations, as it relies on external model APIs, lacks local developer customization, and transmits active browsing histories to cloud servers, compromising privacy.
