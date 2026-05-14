export type CreateTaskInput = {
  goal: string;
  allowed_domains: string[];
  session_id?: string | null;
  start_blocked_sleeper?: boolean;
};

export type CreateTaskResult = { task_id: string };

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

  async createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
    const r = await fetch(`${this.base()}/v1/tasks`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`createTask failed: ${r.status} ${text}`);
    }
    return (await r.json()) as CreateTaskResult;
  }

  async abort(taskId: string): Promise<void> {
    const r = await fetch(`${this.base()}/v1/tasks/${taskId}/abort`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!r.ok) {
      const text = await r.text();
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
      const body = await r.text();
      throw new Error(`postTaskMessage failed: ${r.status} ${body}`);
    }
  }
}
