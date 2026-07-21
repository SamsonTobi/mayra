export type CreateTaskInput = {
  goal: string;
  allowed_domains: string[];
  initial_messages?: string[];
  session_id?: string | null;
  provider?: string | null;
  start_blocked_sleeper?: boolean;
  start_agent_loop?: boolean;
  max_steps?: number;
};

export type CreateTaskResult = { task_id: string };

export type SessionSummary = {
  session_id: string;
  cdp_port: number;
  last_node_count: number | null;
};

export type SessionSnapshotResult = {
  node_count: number;
  screenshot_path: string;
  screenshot_url?: string | null;
};

export type ConnectAndVerifyResult = {
  session_id: string;
  node_count: number;
  screenshot_path: string;
  screenshot_url?: string | null;
};

export type HealthzBody = {
  status: string;
  agent_browser_ok?: boolean;
  agent_browser_detail?: Record<string, unknown> | null;
};

export type ValidateSettingsInput = {
  provider: "gemini" | "openrouter";
  model: string;
};

export type ValidateSettingsResult = {
  ok: boolean;
  latency_ms: number;
};

/**
 * Thin fetch wrapper for the orchestrator (see MAYRA_TECHNICAL_SPEC §3.4).
 * baseUrl is the full origin (e.g. "http://127.0.0.1:8765" for local mode,
 * "https://mayra-xxx.modal.run" for cloud mode). In local mode, the URL
 * and token come from the Tauri sidecar handshake at runtime.
 *
 * onUnauthorized: optional callback fired when a 401 is received. In cloud
 * mode, this clears the stored token and redirects to /login.
 */
export class OrchestratorClient {
  private readonly onUnauthorized: (() => void) | null;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    onUnauthorized?: (() => void) | null,
  ) {
    this.onUnauthorized = onUnauthorized ?? null;
  }

  private base(): string {
    return this.baseUrl;
  }

  /** Create an AbortSignal that fires after `ms` milliseconds. */
  private timeoutSignal(ms: number): AbortSignal {
    return AbortSignal.timeout(ms);
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  /** Check if a response is a 401 and fire the onUnauthorized callback. */
  private checkAuth(r: Response): void {
    if (r.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }
  }

  private async errorBody(text: string): Promise<string> {
    const t = text.trim();
    if (!t) return `(empty body)`;
    try {
      const j = JSON.parse(t) as {
        message?: string;
        code?: string;
        detail?: unknown;
      };
      if (typeof j.message === "string" && j.message) {
        return j.code ? `${j.code}: ${j.message}` : j.message;
      }
    } catch {
      /* not JSON */
    }
    return t;
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
    const r = await fetch(`${this.base()}/v1/tasks`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const text = await this.errorBody(await r.text());
      throw new Error(`createTask failed: ${r.status} ${text}`);
    }
    return (await r.json()) as CreateTaskResult;
  }

  /** Public: no bearer required. */
  async healthz(): Promise<HealthzBody> {
    console.log("[orchestrator-client] healthz: starting");
    const r = await fetch(`${this.base()}/healthz`, {
      signal: this.timeoutSignal(10_000),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(`[orchestrator-client] healthz: failed ${r.status}`, t);
      throw new Error(`healthz failed: ${r.status} ${t}`);
    }
    const body = (await r.json()) as HealthzBody;
    console.log("[orchestrator-client] healthz: ok", body);
    return body;
  }

  /**
   * Connect to a browser session.
   * @param cdpPort - CDP port of an existing Chrome (local mode). Omit/null for cloud mode
   *   (the orchestrator launches managed Chromium and picks the port).
   */
  async connectSession(cdpPort?: number): Promise<{ session_id: string }> {
    console.log(`[orchestrator-client] connectSession: port=${cdpPort ?? "auto"}`);
    const start = performance.now();
    const r = await fetch(`${this.base()}/v1/sessions/connect`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ port: cdpPort ?? null }),
      signal: this.timeoutSignal(30_000),
    });
    const elapsed = Math.round(performance.now() - start);
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(`[orchestrator-client] connectSession: failed ${r.status} (${elapsed}ms)`, t);
      throw new Error(`connectSession failed: ${r.status} — ${t}`);
    }
    const body = (await r.json()) as { session_id: string };
    console.log(`[orchestrator-client] connectSession: ok session=${body.session_id} (${elapsed}ms)`);
    return body;
  }

  async connectAndVerify(cdpPort: number): Promise<ConnectAndVerifyResult> {
    console.log(`[orchestrator-client] connectAndVerify: port=${cdpPort}`);
    const start = performance.now();
    const r = await fetch(`${this.base()}/v1/sessions/connect-and-verify`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ port: cdpPort }),
      // 30s budget: pages with heavy ad scripts (Meta Pixel, GPT, CSRF loops)
      // can take 10+ seconds just to drain buffered console events after
      // WebSocket connect. The backend's fire-and-forget Runtime.enable +
      // event flood draining keeps the actual work under 5s, but we leave
      // headroom for slow machines and slow networks.
      signal: this.timeoutSignal(30_000),
    });
    const elapsed = Math.round(performance.now() - start);
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(`[orchestrator-client] connectAndVerify: failed ${r.status} (${elapsed}ms)`, t);
      throw new Error(`connectAndVerify failed: ${r.status} — ${t}`);
    }
    const body = (await r.json()) as ConnectAndVerifyResult;
    console.log(`[orchestrator-client] connectAndVerify: ok session=${body.session_id} nodes=${body.node_count} (${elapsed}ms)`);
    return body;
  }

  async listSessions(): Promise<SessionSummary[]> {
    console.log("[orchestrator-client] listSessions: starting");
    const r = await fetch(`${this.base()}/v1/sessions`, {
      headers: this.headers(),
      signal: this.timeoutSignal(10_000),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(`[orchestrator-client] listSessions: failed ${r.status}`, t);
      throw new Error(`listSessions failed: ${r.status} ${t}`);
    }
    const body = (await r.json()) as SessionSummary[];
    console.log(`[orchestrator-client] listSessions: found ${body.length} sessions`, body.map(s => s.session_id.slice(0, 8)));
    return body;
  }

  async snapshotSession(sessionId: string): Promise<SessionSnapshotResult> {
    console.log(`[orchestrator-client] snapshotSession: session=${sessionId.slice(0, 8)} starting`);
    const start = performance.now();
    const r = await fetch(`${this.base()}/v1/sessions/${sessionId}/snapshot`, {
      method: "POST",
      headers: this.headers(),
      signal: this.timeoutSignal(15_000),
    });
    const elapsed = Math.round(performance.now() - start);
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(
        `[orchestrator-client] snapshotSession: failed session=${sessionId.slice(0, 8)} ` +
        `status=${r.status} elapsed=${elapsed}ms`,
        t,
      );
      throw new Error(`snapshotSession failed: ${r.status} ${t}`);
    }
    const body = (await r.json()) as SessionSnapshotResult;
    console.log(
      `[orchestrator-client] snapshotSession: ok session=${sessionId.slice(0, 8)} ` +
      `nodes=${body.node_count} elapsed=${elapsed}ms`,
    );
    return body;
  }

  /** Remove a stale session from the orchestrator's in-memory registry. */
  async deleteSession(sessionId: string): Promise<void> {
    console.log(`[orchestrator-client] deleteSession: session=${sessionId.slice(0, 8)}`);
    try {
      await fetch(`${this.base()}/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: this.headers(),
        signal: this.timeoutSignal(5_000),
      });
      console.log(`[orchestrator-client] deleteSession: done session=${sessionId.slice(0, 8)}`);
    } catch (e) {
      console.warn(`[orchestrator-client] deleteSession: failed session=${sessionId.slice(0, 8)}`, e);
    }
  }

  /** Lightweight verify using direct CDP calls — no agent-browser subprocess.
   *  Much faster than snapshotSession (~2-5s vs 15-60s). Use for startup checks. */
  async verifySession(sessionId: string): Promise<SessionSnapshotResult> {
    console.log(`[orchestrator-client] verifySession: session=${sessionId.slice(0, 8)} starting`);
    const start = performance.now();
    const r = await fetch(`${this.base()}/v1/sessions/${sessionId}/verify`, {
      method: "POST",
      headers: this.headers(),
      signal: this.timeoutSignal(15_000),
    });
    const elapsed = Math.round(performance.now() - start);
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(
        `[orchestrator-client] verifySession: failed session=${sessionId.slice(0, 8)} ` +
        `status=${r.status} elapsed=${elapsed}ms`,
        t,
      );
      throw new Error(`verifySession failed: ${r.status} ${t}`);
    }
    const body = (await r.json()) as SessionSnapshotResult;
    console.log(
      `[orchestrator-client] verifySession: ok session=${sessionId.slice(0, 8)} ` +
      `nodes=${body.node_count} elapsed=${elapsed}ms`,
    );
    return body;
  }

  async annotatedScreenshot(sessionId: string): Promise<SessionSnapshotResult> {
    console.log(`[orchestrator-client] annotatedScreenshot: session=${sessionId.slice(0, 8)} starting`);
    const start = performance.now();
    const r = await fetch(`${this.base()}/v1/sessions/${sessionId}/annotated-screenshot`, {
      method: "POST",
      headers: this.headers(),
      signal: this.timeoutSignal(120_000),
    });
    const elapsed = Math.round(performance.now() - start);
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      console.error(
        `[orchestrator-client] annotatedScreenshot: failed session=${sessionId.slice(0, 8)} ` +
        `status=${r.status} elapsed=${elapsed}ms`,
        t,
      );
      throw new Error(`annotatedScreenshot failed: ${r.status} ${t}`);
    }
    const body = (await r.json()) as SessionSnapshotResult;
    console.log(
      `[orchestrator-client] annotatedScreenshot: ok session=${sessionId.slice(0, 8)} ` +
      `nodes=${body.node_count} elapsed=${elapsed}ms`,
    );
    return body;
  }

  async interactSession(
    sessionId: string,
    input: { action: string; x?: number; y?: number; text?: string },
  ): Promise<SessionSnapshotResult> {
    const r = await fetch(`${this.base()}/v1/sessions/${sessionId}/interact`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`interactSession failed: ${r.status} ${t}`);
    }
    return (await r.json()) as SessionSnapshotResult;
  }

  async validateSettings(
    input: ValidateSettingsInput,
  ): Promise<ValidateSettingsResult> {
    const r = await fetch(`${this.base()}/v1/settings/validate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`validateSettings failed: ${r.status} ${t}`);
    }
    return (await r.json()) as ValidateSettingsResult;
  }

  /** List models available from a configured provider. */
  async listModels(provider: string): Promise<{ id: string; owned_by: string }[]> {
    const r = await fetch(`${this.base()}/v1/models/${provider}`, {
      headers: this.headers(),
      signal: this.timeoutSignal(15_000),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`listModels failed: ${r.status} ${t}`);
    }
    return (await r.json()) as { id: string; owned_by: string }[];
  }

  async abort(taskId: string): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/abort`, {
      method: "POST",
      headers: this.headers(),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const text = await this.errorBody(await r.text());
      throw new Error(`abort failed: ${r.status} ${text}`);
    }
  }

  /** Extend a task that ended (success/budget_exhausted/failed/aborted) with more steps. */
  async continueTask(
    taskId: string,
    input: { additional_steps?: number } = {},
  ): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/continue`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        additional_steps: input.additional_steps ?? 25,
      }),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const text = await this.errorBody(await r.text());
      throw new Error(`continueTask failed: ${r.status} ${text}`);
    }
  }

  /** Mid-run steering / goal continuation (PRD §7). */
  async postTaskMessage(taskId: string, text: string): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/message`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text }),
    });
    this.checkAuth(r);
    if (!r.ok) {
      const body = await this.errorBody(await r.text());
      throw new Error(`postTaskMessage failed: ${r.status} ${body}`);
    }
  }
}
