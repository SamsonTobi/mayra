import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/globals.css";
import { OrchestratorProvider } from "@/providers/orchestrator-context";
import { CloudAuthProvider } from "@/providers/cloud-auth-context";
import { SupabaseBootstrap } from "@/providers/supabase-bootstrap";
import { BrowserShellHint } from "@/components/common/BrowserShellHint";
import { AppLayout } from "@/components/common/AppLayout";
import { WebAuthGate } from "@/components/common/WebAuthGate";

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
        <Suspense fallback={null}>
          <CloudAuthProvider>
            <OrchestratorProvider>
              <SupabaseBootstrap />
              <BrowserShellHint />
              <WebAuthGate>
                <AppLayout>{children}</AppLayout>
              </WebAuthGate>
            </OrchestratorProvider>
          </CloudAuthProvider>
        </Suspense>
      </body>
    </html>
  );
}

