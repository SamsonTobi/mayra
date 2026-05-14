"use client";

import { ProviderSettings } from "@/components/settings/ProviderSettings";
import { RetentionSettings } from "@/components/settings/RetentionSettings";
import { SafetySettings } from "@/components/settings/SafetySettings";
import { BrowserDetectionCard } from "@/components/settings/BrowserDetectionCard";

export default function SettingsPage() {
  return (
    <section>
      <h1>Settings</h1>
      <BrowserDetectionCard />
      <ProviderSettings />
      <SafetySettings />
      <RetentionSettings />
    </section>
  );
}
