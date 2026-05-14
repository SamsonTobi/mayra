"use client";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="alertdialog" aria-modal>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="muted">{message}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
