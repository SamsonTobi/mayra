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
};

export type HealthzBody = {
  status: string;
  agent_browser_ok?: boolean;
  agent_browser_detail?: Record<string, unknown> | null;
};

export type ValidateSettingsInput = {
  provider: "cloudflare" | "gemini" | "grok";
  model: string;
};

export type ValidateSettingsResult = {
  ok: boolean;
  latency_ms: number;
};

/**
 * Thin fetch wrapper for the local orchestrator (see MAYRA_TECHNICAL_SPEC §3.4).
 * No secrets in NEXT_PUBLIC_* — port + token come from Tauri at runtime.
 */
export class OrchestratorClient {
  constructor(
    private readonly port: number,
    private readonly token: string,
  ) {}

  private base(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async errorBody(text: string): Promise<string> {
    const t = text.trim();
    if (!t) return `(empty body)`;
    try {
      const j = JSON.parse(t) as { message?: string; code?: string; detail?: unknown };
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
    if (!r.ok) {
      const text = await this.errorBody(await r.text());
      throw new Error(`createTask failed: ${r.status} ${text}`);
    }
    return (await r.json()) as CreateTaskResult;
  }

  /** Public: no bearer required. */
  async healthz(): Promise<HealthzBody> {
    const r = await fetch(`${this.base()}/healthz`);
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`healthz failed: ${r.status} ${t}`);
    }
    return (await r.json()) as HealthzBody;
  }

  async connectSession(cdpPort: number): Promise<{ session_id: string }> {
    const r = await fetch(`${this.base()}/v1/sessions/connect`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ port: cdpPort }),
    });
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`connectSession failed: ${r.status} — ${t}`);
    }
    return (await r.json()) as { session_id: string };
  }

  async listSessions(): Promise<SessionSummary[]> {
    const r = await fetch(`${this.base()}/v1/sessions`, {
      headers: this.headers(),
    });
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`listSessions failed: ${r.status} ${t}`);
    }
    return (await r.json()) as SessionSummary[];
  }

  async snapshotSession(sessionId: string): Promise<SessionSnapshotResult> {
    const r = await fetch(`${this.base()}/v1/sessions/${sessionId}/snapshot`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`snapshotSession failed: ${r.status} ${t}`);
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
    if (!r.ok) {
      const t = await this.errorBody(await r.text());
      throw new Error(`validateSettings failed: ${r.status} ${t}`);
    }
    return (await r.json()) as ValidateSettingsResult;
  }

  async abort(taskId: string): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/abort`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!r.ok) {
      const text = await this.errorBody(await r.text());
      throw new Error(`abort failed: ${r.status} ${text}`);
    }
  }

  /** Mid-run steering / goal continuation (PRD §7). */
  async postTaskMessage(taskId: string, text: string): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/message`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text }),
    });
    if (!r.ok) {
      const body = await this.errorBody(await r.text());
      throw new Error(`postTaskMessage failed: ${r.status} ${body}`);
    }
  }
}
