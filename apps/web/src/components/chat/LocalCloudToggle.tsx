"use client";

import { useState } from "react";
import { Cloud, HardDrive } from "@phosphor-icons/react";

export type TaskTarget = "local" | "cloud";

type Props = {
  value: TaskTarget;
  onChange: (target: TaskTarget) => void;
  cloudAvailable: boolean;
  /** Show a login link/button when cloud is selected but not authenticated */
  onCloudLoginRequired?: () => void;
};

/**
 * Segmented control for choosing the orchestrator target per task.
 * Only shown in desktop mode when cloud is available.
 */
export function LocalCloudToggle({ value, onChange, cloudAvailable, onCloudLoginRequired }: Props) {
  const [hovered, setHovered] = useState<TaskTarget | null>(null);

  const handleCloudClick = () => {
    if (!cloudAvailable && onCloudLoginRequired) {
      onCloudLoginRequired();
      return;
    }
    onChange("cloud");
  };

  return (
    <div
      className="local-cloud-toggle"
      role="radiogroup"
      aria-label="Agent target"
      style={{
        display: "inline-flex",
        gap: "2px",
        padding: "2px",
        background: "var(--surface-2, #1a1a1a)",
        borderRadius: "6px",
        border: "1px solid var(--border, #2a2a2a)",
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "local"}
        onClick={() => onChange("local")}
        onMouseEnter={() => setHovered("local")}
        onMouseLeave={() => setHovered(null)}
        title="Run on your local machine"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "4px",
          border: "none",
          background: value === "local" ? "var(--accent, #3b82f6)" : "transparent",
          color: value === "local" ? "#fff" : "var(--fg-muted, #888)",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: 500,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <HardDrive size={12} weight="regular" />
        Local
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "cloud"}
        onClick={handleCloudClick}
        onMouseEnter={() => setHovered("cloud")}
        onMouseLeave={() => setHovered(null)}
        title={cloudAvailable ? "Run on cloud Chromium" : "Sign in to use cloud"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "4px",
          border: "none",
          background: value === "cloud" ? "var(--accent, #3b82f6)" : "transparent",
          color: value === "cloud" ? "#fff" : "var(--fg-muted, #888)",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: 500,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <Cloud size={12} weight="regular" />
        Cloud
      </button>
    </div>
  );
}
