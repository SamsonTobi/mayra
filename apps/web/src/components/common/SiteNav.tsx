"use client";

import Link from "next/link";

export function SiteNav() {
  return (
    <nav
      className="row"
      style={{
        borderBottom: "1px solid var(--border)",
        padding: "0.65rem 1.25rem",
        marginBottom: "0.5rem",
      }}
    >
      <Link href="/">Chat</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/logs">Logs</Link>
    </nav>
  );
}
