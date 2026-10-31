"use client";

import { Suspense } from "react";
import BreachWatch from "@/components/BreachWatch";

export const dynamic = "force-dynamic";

export default function BreachWatchRoute() {
  return (
    <Suspense fallback={null}>
      <BreachWatch />
    </Suspense>
  );
}

