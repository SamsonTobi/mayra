"use client";

import type { ChatMessage } from "@mayra/contracts";

function IconRetry() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 256 256"
      aria-hidden
      className="retry-icon"
    >
      <path
        fill="currentColor"
        d="M224 128a96 96 0 1 1-96-96a8 8 0 0 1 0 16a80 80 0 1 0 23.23 56.26l-14.43-14.43a8 8 0 0 1 11.31-11.31l29.66 29.66a8 8 0 0 1 0 11.31l-29.66 29.66a8 8 0 0 1-11.31-11.31l14.43-14.43A95.71 95.71 0 0 1 224 128Z"
      />
    </svg>
  );
}

export function MessageSystemStatus({
  message,
  onRetry,
}: {
  message: Extract<ChatMessage, { kind: "system_status" }>;
  onRetry?: () => void;
}) {
  const cls =
    message.severity === "error"
      ? "system-row error"
      : message.severity === "warn"
        ? "system-row warn"
        : "system-row";
  const showRetry = message.severity === "error" && Boolean(onRetry);
  return (
    <div className={cls}>
      {showRetry ? (
        <button
          type="button"
          className="retry-button"
          onClick={onRetry}
          aria-label="Retry last message"
          title="Retry last message"
        >
          <IconRetry />
        </button>
      ) : null}
      <span className="system-row-text">{message.text}</span>
    </div>
  );
}
