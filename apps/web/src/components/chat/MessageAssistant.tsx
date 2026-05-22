"use client";

import type { ChatMessage } from "@mayra/contracts";
import { ChatObservationThumbnail } from "./ChatObservationThumbnail";

export function MessageAssistant({
  message,
}: {
  message: Extract<ChatMessage, { kind: "assistant" }>;
}) {
  const modelLabel =
    message.provider && message.model
      ? `${message.provider} · ${message.model}`
      : message.provider ?? message.model ?? null;

  return (
    <div className="message-assistant">
      <div className="bubble">{message.markdown}</div>
      {message.observation_screenshot_path ? (
        <ChatObservationThumbnail screenshotPath={message.observation_screenshot_path} />
      ) : null}
      {modelLabel ? <p className="chat-model-meta muted">{modelLabel}</p> : null}
    </div>
  );
}
