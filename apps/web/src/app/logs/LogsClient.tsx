"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Task history (F17). Supabase list is T10 — placeholder list + drill-down via `?t=`.
 * Static export cannot emit arbitrary `/logs/[task_id]/` HTML; use query param until SPA
 * fallback is configured in the desktop shell (see MAYRA_BUILD_CHECKLIST note).
 */
export function LogsClient() {
  const sp = useSearchParams();
  const taskId = sp.get("t");

  if (taskId) {
    return (
      <div className="page-content">
        <p>
          <Link href="/logs">← Back to logs</Link>
        </p>
        <h1>Task</h1>
        <p className="muted">
          Drill-down for <code>{taskId}</code>. Supabase reads land in T10.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1>Logs</h1>
      <p className="muted">
        Paginated task list from Supabase (RLS) — wired in T10. Example drill-down:{" "}
        <a href="/logs?t=demo-task">/logs?t=demo-task</a>
      </p>
    </div>
  );
}
