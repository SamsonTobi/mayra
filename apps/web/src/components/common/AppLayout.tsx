"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { CaretRight } from "@phosphor-icons/react";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-container">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(true)} />
      <main className="main-content">
        {collapsed && (
          <button
            type="button"
            className="sidebar-toggle-floating"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <CaretRight size={20} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
