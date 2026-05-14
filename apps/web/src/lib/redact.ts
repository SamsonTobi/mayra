import type { Action } from "@mayra/contracts";

const PASSWORD_FIELD = /password|passwd|pwd|secret/i;

/**
 * Last-line UI defense: mask values when the accessibility ref hints at a secret field
 * (PRD §6, safety contracts).
 */
export function redactActionValueForDisplay(action: Action): string {
  const v = action.value;
  if (v == null || v === "") return "—";
  const ref = action.target_ref ?? "";
  if (PASSWORD_FIELD.test(ref)) {
    return "[REDACTED:password_field]";
  }
  return v;
}
