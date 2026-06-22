# Design System Rules & Guidelines

This document outlines the core visual system, color palettes, sizing rules, and architectural constraints used for the Mayra UI overhaul.

## 1. Color System (Neutral Dark Theme)

To achieve a clean, premium, neutral aesthetic:
* **Backgrounds**:
  * Main Container & Sidebar: `#0c0c0e` (Same background color for both sidebar and main panel; no color-based distinction).
  * Hover Items / Tooltips: `rgba(255, 255, 255, 0.04)` or `#18181b`.
  * Shaded Containers (e.g. Model Selector, Input box inner controls): `#27272a` (light neutral shade).
* **Borders**:
  * Divider Line: `1px solid #1f1f23` (extremely thin, low-contrast divider).
  * Focused Input Borders: `#3f3f46`.
* **Typography / Text**:
  * Main text: `#fafafa` (bright off-white)
  * Secondary / Muted: `#a1a1aa` (neutral slate-gray)
  * System alerts / Errors: Red `#f87171` (background: `rgba(239, 68, 68, 0.1)`)
* **Accents**:
  * Action items / circular buttons: Background `#ffffff` (foreground `#09090b` / black icon) when active; `#27272a` (foreground `#71717a` / gray icon) when disabled.

---

## 2. Layout & Interactions

* **Collapsible Sidebar**:
  * Slides completely out of view (`width: 0`, overflow hidden, offset transform).
  * Only a floating button / expand trigger remains visible at the top-left margin to slide it back out.
  * Sidebar houses:
    * Navigation icons (Chat, Settings, Logs).
    * Agent history (past tasks list loaded from `localStorage`).
    * User Profile Widget (gradient avatar + Guest info) at the bottom left.
* **Chatbox Flow**:
  * **First run**: Placed in the center of the screen with bold text `Hey, what do you want to work on?`.
  * **Active run**: Floats down to the bottom of the screen. Stream outputs render starting at the top and growing downwards.
* **Scrollbars**:
  * Hidden or extremely thin (`scrollbar-width: none` or `width: 4px` on Webkit).

---

## 3. Code Constraints

* **File Limits**: All React UI components and layouts must be strictly **under 350 lines of code** per file. If any file grows beyond this, split it into smaller sub-components or utility hooks.
* **Component-Based**: Group related elements into self-contained reusable subcomponents.
* **Icons**: Use `@phosphor-icons/react` package exclusively for all icons.
