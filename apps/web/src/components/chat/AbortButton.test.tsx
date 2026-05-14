import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AbortButton } from "./AbortButton";

describe("AbortButton", () => {
  it("calls onAbort and respects disabled when no task", async () => {
    const onAbort = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <AbortButton taskId={null} disabled={false} onAbort={onAbort} />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<AbortButton taskId="t1" disabled={false} onAbort={onAbort} />);
    await user.click(screen.getByRole("button", { name: /abort task/i }));
    expect(onAbort).toHaveBeenCalledOnce();
    rerender(<AbortButton taskId="t1" disabled onAbort={onAbort} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
