import { Suspense } from "react";
import { LogsClient } from "./LogsClient";

export default function LogsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading logs…</p>}>
      <LogsClient />
    </Suspense>
  );
}
