import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/globals.css";
import { OrchestratorProvider } from "@/providers/orchestrator-context";
import { CloudAuthProvider } from "@/providers/cloud-auth-context";
import { SupabaseBootstrap } from "@/providers/supabase-bootstrap";
import { BrowserShellHint } from "@/components/common/BrowserShellHint";
import { AppLayout } from "@/components/common/AppLayout";
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
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <CloudAuthProvider>
            <OrchestratorProvider>
              <SupabaseBootstrap />
              <BrowserShellHint />
              {isWebMode() ? <>{children}</> : <AppLayout>{children}</AppLayout>}
            </OrchestratorProvider>
          </CloudAuthProvider>
        </Suspense>
      </body>
    </html>
  );
}

