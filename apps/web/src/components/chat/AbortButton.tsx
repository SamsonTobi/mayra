"use client";

type Props = {
  taskId: string | null;
  disabled: boolean;
  onAbort: () => Promise<void> | void;
};

export function AbortButton({ taskId, disabled, onAbort }: Props) {
  return (
    <button
      type="button"
      className="btn"
      disabled={disabled || !taskId}
      onClick={() => void onAbort()}
    >
      Abort task
    </button>
  );
}
