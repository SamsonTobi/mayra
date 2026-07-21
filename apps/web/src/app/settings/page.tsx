"use client";

import { ProviderSettings } from "@/components/settings/ProviderSettings";
import { RetentionSettings } from "@/components/settings/RetentionSettings";
import { SafetySettings } from "@/components/settings/SafetySettings";
import { BrowserDetectionCard } from "@/components/settings/BrowserDetectionCard";
import { AnnotatedScreenshotCapture } from "@/components/settings/AnnotatedScreenshotCapture";
import { isWebMode } from "@/lib/mode";

export default function SettingsPage() {
  const web = isWebMode();
  return (
    <div className="page-content">
      <h1>Settings</h1>
      {!web ? <BrowserDetectionCard /> : null}
      {!web ? <AnnotatedScreenshotCapture /> : null}
      <ProviderSettings />
      <SafetySettings />
      <RetentionSettings />
    </div>
  );
}
