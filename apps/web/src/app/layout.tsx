import type { Metadata } from "next";
import "@/styles/globals.css";
import { OrchestratorProvider } from "@/providers/orchestrator-context";
import { SupabaseBootstrap } from "@/providers/supabase-bootstrap";
import { BrowserShellHint } from "@/components/common/BrowserShellHint";
import { SiteNav } from "@/components/common/SiteNav";

export const metadata: Metadata = {
  title: "Mayra",
  description: "Local-first desktop agent UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <OrchestratorProvider>
          <SupabaseBootstrap />
          <BrowserShellHint />
          <SiteNav />
          <main className="shell">{children}</main>
        </OrchestratorProvider>
      </body>
    </html>
  );
}
