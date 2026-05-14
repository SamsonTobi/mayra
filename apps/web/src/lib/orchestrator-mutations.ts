import type { ApprovalDecision } from "@mayra/contracts";

/** Bearer POST helpers kept out of frozen `orchestrator-client.ts` (lane split). */

export async function postApprove(
  port: number,
  token: string,
  body: ApprovalDecision,
): Promise<void> {
  const r = await fetch(`http://127.0.0.1:${port}/v1/actions/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`approve failed: ${r.status} ${t}`);
  }
}
