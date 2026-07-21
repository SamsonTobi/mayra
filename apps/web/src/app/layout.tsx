import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/globals.css";
import { OrchestratorProvider } from "@/providers/orchestrator-context";
import { CloudAuthProvider } from "@/providers/cloud-auth-context";
import { SupabaseBootstrap } from "@/providers/supabase-bootstrap";
import { BrowserShellHint } from "@/components/common/BrowserShellHint";
import { AppLayout } from "@/components/common/AppLayout";
import { WebAuthGate } from "@/components/common/WebAuthGate";
import { WebLayout } from "@/components/common/WebLayout";
import { isWebMode } from "@/lib/mode";

export const metadata: Metadata = {
  title: "Mayra",
  description: "Local-first desktop agent UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // In web mode, the login page is a standalone full-screen page (no sidebar).
  // We can't use usePathname here (server component), so we conditionally
  // render AppLayout inside WebAuthGate which is a client component.
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <CloudAuthProvider>
            <OrchestratorProvider>
              <SupabaseBootstrap />
              <BrowserShellHint />
              <WebAuthGate>
                {isWebMode() ? <WebLayout>{children}</WebLayout> : <AppLayout>{children}</AppLayout>}
              </WebAuthGate>
            </OrchestratorProvider>
          </CloudAuthProvider>
        </Suspense>
      </body>
    </html>
  );
}

