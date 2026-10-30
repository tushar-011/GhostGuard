"use client";

import { Suspense } from "react";
import { SettingsPage } from "@/components/ghostguard";

export const dynamic = "force-dynamic";

export default function SettingsRoute() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
