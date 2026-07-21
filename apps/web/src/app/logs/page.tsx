import { Suspense } from "react";
import { LogsClient } from "./LogsClient";
import { WebAuthGate } from "@/components/common/WebAuthGate";

export default function LogsPage() {
  return (
    <WebAuthGate>
      <Suspense fallback={<p className="muted">Loading logs…</p>}>
        <LogsClient />
      </Suspense>
    </WebAuthGate>
  );
}
