"use client";

import { Suspense } from "react";
import { IdentityMapPage } from "@/components/ghostguard";

export const dynamic = "force-dynamic";

export default function IdentityMapRoute() {
  return (
    <Suspense fallback={null}>
      <IdentityMapPage />
    </Suspense>
  );
}
