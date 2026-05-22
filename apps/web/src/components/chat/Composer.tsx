"use client";

import { useEffect, useState } from "react";

const PROVIDER_STORAGE_KEY = "mayra.chat.provider";

type Props = {
  onSend: (text: string, provider: string) => void;
  disabled?: boolean;
};

function readStoredProvider(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PROVIDER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState(readStoredProvider);

  useEffect(() => {
    try {
      if (provider) {
        sessionStorage.setItem(PROVIDER_STORAGE_KEY, provider);
      } else {
        sessionStorage.removeItem(PROVIDER_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [provider]);

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
        placeholder="Describe the goal..."
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
