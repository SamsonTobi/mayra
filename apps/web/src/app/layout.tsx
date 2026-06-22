import type { Metadata } from "next";
import "@/styles/globals.css";
import { OrchestratorProvider } from "@/providers/orchestrator-context";
import { SupabaseBootstrap } from "@/providers/supabase-bootstrap";
import { BrowserShellHint } from "@/components/common/BrowserShellHint";
import { AppLayout } from "@/components/common/AppLayout";

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
          <AppLayout>{children}</AppLayout>
        </OrchestratorProvider>
      </body>
    </html>
  );
}

