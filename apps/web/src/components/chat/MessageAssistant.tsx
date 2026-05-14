"use client";

import type { ChatMessage } from "@mayra/contracts";

export function MessageAssistant({
  message,
}: {
  message: Extract<ChatMessage, { kind: "assistant" }>;
}) {
  return (
    <div className="message-assistant">
      <div className="bubble">{message.markdown}</div>
    </div>
  );
}
