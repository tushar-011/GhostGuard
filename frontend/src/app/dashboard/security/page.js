"use client";

import { Suspense } from "react";
import { SecurityDashboardPage } from "@/components/ghostguard";

export const dynamic = "force-dynamic";

export default function SecurityRoute() {
  return (
    <Suspense fallback={null}>
      <SecurityDashboardPage />
    </Suspense>
  );
}
