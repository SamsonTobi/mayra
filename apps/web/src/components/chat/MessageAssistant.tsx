"use client";

import type { ChatMessage } from "@mayra/contracts";
import { ChatObservationThumbnail } from "./ChatObservationThumbnail";
import { CopyButton } from "./CopyButton";

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
      <div className="message-content-row">
        <div className="bubble">{message.markdown}</div>
        <CopyButton text={message.markdown} />
      </div>
      {message.observation_screenshot_path ? (
        <ChatObservationThumbnail
          screenshotPath={message.observation_screenshot_path}
          screenshotUrl={(message as Record<string, unknown>).observation_screenshot_url as string | undefined}
        />
      ) : null}
      {modelLabel ? <p className="chat-model-meta muted">{modelLabel}</p> : null}
    </div>
  );
}
