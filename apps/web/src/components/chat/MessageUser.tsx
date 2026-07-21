"use client";

import type { ChatMessage } from "@mayra/contracts";
import { CopyButton } from "./CopyButton";

export function MessageUser({ message }: { message: Extract<ChatMessage, { kind: "user" }> }) {
  return (
    <div className="message-user">
      <div className="message-content-row">
        <CopyButton text={message.text} />
        <div className="bubble">{message.text}</div>
      </div>
    </div>
  );
}
