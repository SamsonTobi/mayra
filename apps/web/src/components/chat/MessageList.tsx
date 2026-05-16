"use client";

import type { ChatMessage } from "@mayra/contracts";
import { MessageActionLog } from "./MessageActionLog";
import { MessageApprovalRequest } from "./MessageApprovalRequest";
import { MessageAssistant } from "./MessageAssistant";
import { MessageSystemStatus } from "./MessageSystemStatus";
import { MessageUser } from "./MessageUser";

type Props = {
  messages: ChatMessage[];
  port: number | null;
  token: string | null;
  onRetry?: () => void;
};

export function MessageList({ messages, port, token, onRetry }: Props) {
  return (
    <div>
      {messages.map((m) => {
        if (m.kind === "user") return <MessageUser key={m.id} message={m} />;
        if (m.kind === "assistant")
          return <MessageAssistant key={m.id} message={m} />;
        if (m.kind === "system_status")
          return <MessageSystemStatus key={m.id} message={m} onRetry={onRetry} />;
        if (m.kind === "action_log")
          return <MessageActionLog key={m.id} message={m} />;
        if (m.kind === "approval_request")
          return (
            <MessageApprovalRequest
              key={m.id}
              message={m}
              port={port}
              token={token}
            />
          );
        return null;
      })}
    </div>
  );
}
