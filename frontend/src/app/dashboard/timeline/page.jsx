"use client";

import { Suspense } from "react";
import DigitalFootprintTimeline from "@/components/DigitalFootprintTimeline";

export const dynamic = "force-dynamic";

export default function TimelineRoute() {
  return (
    <Suspense fallback={null}>
      <DigitalFootprintTimeline />
    </Suspense>
  );
}

