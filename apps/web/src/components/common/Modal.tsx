"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: Props) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal aria-labelledby="modal-title">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: "1.1rem" }}>
            {title}
          </h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ marginTop: "0.75rem" }}>{children}</div>
      </div>
    </div>
  );
}
