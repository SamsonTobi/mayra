"use client";

import type { ChatMessage } from "@mayra/contracts";

export function MessageUser({ message }: { message: Extract<ChatMessage, { kind: "user" }> }) {
  return (
    <div className="message-user">
      <div className="bubble">{message.text}</div>
    </div>
  );
}
