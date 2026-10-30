"use client";

import { Suspense } from "react";
import { AccountsPage } from "@/components/ghostguard";

export const dynamic = "force-dynamic";

export default function AccountsRoute() {
  return (
    <Suspense fallback={null}>
      <AccountsPage />
    </Suspense>
  );
}
