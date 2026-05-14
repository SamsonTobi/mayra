"use client";

import type { ChatMessage } from "@mayra/contracts";

export function MessageSystemStatus({
  message,
}: {
  message: Extract<ChatMessage, { kind: "system_status" }>;
}) {
  const cls =
    message.severity === "error"
      ? "system-row error"
      : message.severity === "warn"
        ? "system-row warn"
        : "system-row";
  return <div className={cls}>{message.text}</div>;
}
