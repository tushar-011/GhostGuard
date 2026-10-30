"use client";

import { Suspense } from "react";
import { DashboardPage } from "@/components/ghostguard";

export const dynamic = "force-dynamic";

export default function DashboardRoute() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}
