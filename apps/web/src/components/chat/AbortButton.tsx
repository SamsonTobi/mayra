"use client";

type Props = {
  taskId: string | null;
  disabled: boolean;
  onAbort: () => Promise<void> | void;
};

/**
 * Premium Stop Agent Button.
 * Styled with red alerts, shadows, and clean state transformations.
 */
export function AbortButton({ taskId, disabled, onAbort }: Props) {
  return (
    <button
      type="button"
      className="btn"
      disabled={disabled || !taskId}
      onClick={() => void onAbort()}
      style={{
        borderColor: "#ef4444",
        background: disabled || !taskId ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.15)",
        color: disabled || !taskId ? "#9aa0a6" : "#f87171",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.40rem",
        fontWeight: 600,
        boxShadow: disabled || !taskId ? "none" : "0 0 10px rgba(239, 68, 68, 0.12)",
        transition: "all 0.2s ease",
        opacity: disabled || !taskId ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: "0.85rem" }}>🛑</span> Stop Agent
    </button>
  );
}
