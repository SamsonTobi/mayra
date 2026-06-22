"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

export type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  variant?: "default" | "clean";
};

export function Dropdown({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Select...",
  className,
  style,
  triggerStyle,
  variant = "default",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${variant} ${className || ""}`}
      style={{ position: "relative", ...style }}
    >
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: variant === "clean" ? "0.25rem" : "0.5rem",
          cursor: disabled ? "not-allowed" : "pointer",
          ...triggerStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <CaretDown size={12} weight="bold" style={{ flexShrink: 0 }} />
      </button>

      {isOpen && (
        <ul className="custom-dropdown-menu">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`custom-dropdown-item ${opt.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
