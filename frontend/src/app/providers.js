"use client";

import { useEffect, useState } from "react";
import { GhostGuardLoader, ThemeProvider, GhostGuardProvider } from "@/components/ghostguard";
import { AuthProvider } from "@/context/AuthContext";

export default function Providers({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isLive = typeof window !== "undefined" && (
      new URLSearchParams(window.location.search).get("auth") === "success" ||
      window.localStorage.getItem("ghostguard_auth") === "true" ||
      window.localStorage.getItem("ghostguard_mode") === "LIVE"
    );
    if (isLive) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GhostGuardProvider>
          {ready ? children : <GhostGuardLoader />}
        </GhostGuardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
