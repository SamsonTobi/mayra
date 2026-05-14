"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  return (
    <form
      className="row"
      style={{ alignItems: "stretch", marginTop: "0.75rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        onSend(t);
        setText("");
      }}
    >
      <textarea
        rows={2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the goal…"
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
