"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "@phosphor-icons/react";
import { Dropdown } from "../common/Dropdown";

const PROVIDER_STORAGE_KEY = "mayra.chat.provider";

type Props = {
  onSend: (text: string, provider: string) => void;
  disabled?: boolean;
  isAbortable?: boolean;
  onAbort?: () => void;
};

function readStoredProvider(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PROVIDER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Composer({ onSend, disabled, isAbortable, onAbort }: Props) {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState(readStoredProvider);
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
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

  // Synchronously compute auto-resize height before paint to eliminate scroll overlaps and clipping
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const sh = ta.scrollHeight;
    ta.style.height = `${sh + 6}px`; // Add 6px buffer to avoid vertical boundary line clipping
    ta.scrollTop = 0;
    
    // Toggle layout states with hysteresis to prevent jumpy layout loops
    setIsMultiline((prev) => {
      if (prev) {
        // Once multiline, only revert to single-line if the text is short enough to safely fit (<= 15 chars) and has no newlines
        return text.includes("\n") || text.length > 15;
      }
      return sh > 40 || text.includes("\n");
    });
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t, provider);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const t = text.trim();
      if (!t || disabled) return;
      onSend(t, provider);
      setText("");
    }
  };

  const providerOptions = [
    { value: "", label: "Auto (Fallback)" },
    { value: "gemini", label: "Gemini" },
    { value: "groq", label: "Groq" },
    { value: "cloudflare", label: "Cloudflare" },
  ];

  return (
    <form className={`composer-container ${isMultiline ? "multiline" : ""}`} onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Mayra to do anything on the web..."
        className="composer-textarea"
      />
      <div className="composer-actions-row">
        <Dropdown
          value={provider}
          onChange={setProvider}
          options={providerOptions}
          disabled={disabled}
          placeholder="Model"
          variant="clean"
        />
        {isAbortable ? (
          <button
            type="button"
            className="composer-send-btn"
            onClick={onAbort}
            disabled={disabled}
            title="Stop agent"
          >
            <Square size={16} weight="fill" />
          </button>
        ) : (
          <button
            type="submit"
            className="composer-send-btn"
            disabled={disabled || !text.trim()}
            title="Send"
          >
            <ArrowUp size={16} weight="bold" />
          </button>
        )}
      </div>
    </form>
  );
}
