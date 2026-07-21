"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "@phosphor-icons/react";
import { Dropdown } from "../common/Dropdown";
import { LocalCloudToggle, type TaskTarget } from "./LocalCloudToggle";

const PROVIDER_STORAGE_KEY = "mayra.chat.provider";

type Props = {
  onSend: (text: string, provider: string) => void;
  disabled?: boolean;
  isAbortable?: boolean;
  onAbort?: () => void;
  // Per-task target toggle (desktop mode only)
  target?: TaskTarget;
  onTargetChange?: (target: TaskTarget) => void;
  showTargetToggle?: boolean;
  cloudAvailable?: boolean;
  onCloudLoginRequired?: () => void;
};

function readStoredProvider(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PROVIDER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Composer({
  onSend,
  disabled,
  isAbortable,
  onAbort,
  target,
  onTargetChange,
  showTargetToggle,
  cloudAvailable,
  onCloudLoginRequired,
}: Props) {
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

  // The `value` here is the literal OpenRouter model ID sent straight to the
  // orchestrator as `provider`. The orchestrator's `_ordered_provider_clients`
  // sees it isn't a known provider slug ("openrouter"/"gemini") and routes it
  // through the OpenRouter client with `rec._model_override = <this value>`,
  // which `_build_stream_body` then sends as the `model` field in the API
  // request. Empty string = Auto (orchestrator picks from the fallback list,
  // which defaults to Gemini 2.5 Flash-Lite for speed and cost).
  //
  // Gemini 2.5 Flash-Lite is the default for 90% of standard clicking,
  // navigation, and form-filling — it's extremely fast and cheap. Stronger
  // models (Qwen3-VL-30B, Gemini Flash, GLM-4.6V) are available for complex
  // reasoning tasks.
  const providerOptions = [
    { value: "", label: "Auto" },
    { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (recommended)" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "qwen/qwen3-vl-30b-a3b-instruct", label: "Qwen3-VL 30B" },
    { value: "z-ai/glm-4.6v", label: "GLM-4.6V" },
    { value: "xiaomi/mimo-v2.5", label: "MiMo-V2.5" },
    { value: "minimax/minimax-m3", label: "MiniMax M3" },
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
        placeholder={
          isAbortable
            ? "Steer the agent or stop it..."
            : "Ask Mayra to do anything on the web..."
        }
        className="composer-textarea"
      />
      <div className="composer-actions-row">
        {showTargetToggle && target && onTargetChange ? (
          <LocalCloudToggle
            value={target}
            onChange={onTargetChange}
            cloudAvailable={cloudAvailable ?? false}
            onCloudLoginRequired={onCloudLoginRequired}
          />
        ) : null}
        <Dropdown
          value={provider}
          onChange={setProvider}
          options={providerOptions}
          disabled={disabled}
          placeholder="Model"
          variant="clean"
        />
        {/* Show the stop button when the agent is running */}
        {isAbortable && onAbort ? (
          <button
            type="button"
            className="composer-abort-btn"
            onClick={onAbort}
            disabled={disabled}
            title="Stop agent"
            aria-label="Stop agent"
          >
            <Square size={16} weight="fill" />
          </button>
        ) : null}
        {/* Always show the send button — the user can send steering
            messages to a running agent at any time. */}
        <button
          type="submit"
          className="composer-send-btn"
          disabled={disabled || !text.trim()}
          title="Send"
          aria-label="Send message"
        >
          <ArrowUp size={16} weight="bold" />
        </button>
      </div>
    </form>
  );
}
