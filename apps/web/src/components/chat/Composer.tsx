"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string, provider: string) => void;
  disabled?: boolean;
};

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("");

  return (
    <form
      className="row"
      style={{ alignItems: "stretch", marginTop: "0.75rem", gap: "0.5rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        onSend(t, provider);
        setText("");
      }}
    >
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        disabled={disabled}
        title="Model Provider"
        style={{ flexShrink: 0 }}
      >
        <option value="">Auto (Fallback)</option>
        <option value="gemini">Gemini</option>
        <option value="groq">Groq</option>
        <option value="cloudflare">Cloudflare</option>
      </select>
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
