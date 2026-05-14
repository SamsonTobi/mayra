"use client";

import { ProviderSettings } from "@/components/settings/ProviderSettings";
import { RetentionSettings } from "@/components/settings/RetentionSettings";
import { SafetySettings } from "@/components/settings/SafetySettings";

export default function SettingsPage() {
  return (
    <section>
      <h1>Settings</h1>
      <ProviderSettings />
      <SafetySettings />
      <RetentionSettings />
    </section>
  );
}
