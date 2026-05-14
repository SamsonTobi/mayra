"use client";

import type { ActionLogMessage } from "@mayra/contracts";
import { redactActionValueForDisplay } from "@/lib/redact";

function riskClass(r: string): string {
  if (r === "high") return "badge badge-high";
  if (r === "medium") return "badge badge-med";
  return "badge badge-low";
}

export function MessageActionLog({ message }: { message: ActionLogMessage }) {
  const displayValue = redactActionValueForDisplay(message.action);
  return (
    <section className="card" data-testid="action-log-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{message.action.action}</strong>
        <span className={riskClass(message.action.risk)}>{message.action.risk}</span>
      </div>
      <p className="muted" style={{ margin: "0.35rem 0" }}>
        <code>{message.action.target_ref}</code>
      </p>
      <p style={{ margin: "0.25rem 0" }}>
        <span className="muted">Value:</span> {displayValue}
      </p>
      <p className="muted" style={{ margin: "0.25rem 0" }}>
        {message.action.reason}
      </p>
      {message.screenshot_path ? (
        <p className="muted">
          Screenshot: <code>{message.screenshot_path}</code>
        </p>
      ) : null}
    </section>
  );
}
