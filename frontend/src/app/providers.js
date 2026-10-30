"use client";

import { useEffect, useState } from "react";
import { GhostGuardLoader, ThemeProvider } from "@/components/ghostguard";

export default function Providers({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return <ThemeProvider>{ready ? children : <GhostGuardLoader />}</ThemeProvider>;
}
