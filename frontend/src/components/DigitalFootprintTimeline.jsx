"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Milestone,
  Calendar,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  Search,
  ExternalLink,
  Lock,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layers,
  Globe2,
  GitBranch,
  FileText,
  Cloud,
  Trash2,
  Eye,
  Zap,
  Check,
  X,
  Activity,
  Info,
  SlidersHorizontal,
  Mail,
  UserCheck,
  KeyRound,
  History,
} from "lucide-react";
import { useGhostGuard, DashboardShell, DemoBanner } from "@/components/ghostguard";
import api, { auditApi } from "@/lib/api";

/**
 * Event categories supported by the timeline
 */
export const TIMELINE_FILTERS = [
  { key: "ALL", label: "All Events" },
  { key: "REGISTRATION", label: "Account Registrations" },
  { key: "DISCOVERY", label: "Ghost Discoveries" },
  { key: "SECURITY", label: "Security Reviews" },
  { key: "DORMANCY", label: "Dormancy Flags" },
];

/**
 * Formats ISO or raw date strings into readable timeline dates
 */
function formatEventDate(dateInput) {
  if (!dateInput) return "Unknown Date";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Extracts month and year string for grouping (e.g. "2024")
 */
function getEventYear(dateInput) {
  if (!dateInput) return "Historical";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Historical";
    return String(d.getFullYear());
  } catch {
    return "Historical";
  }
}

/**
 * Helper to compute an approximate Date from ageInMonths
 */
function computeDateFromAge(ageInMonths) {
  const now = new Date();
  if (typeof ageInMonths !== "number" || isNaN(ageInMonths)) return now;
  const targetTime = now.getTime() - ageInMonths * 30.4 * 24 * 60 * 60 * 1000;
  return new Date(targetTime);
}

/**
 * Map service names / categories to brand colors and icons
 */
function getServiceVisuals(serviceName = "", category = "") {
  const norm = `${serviceName} ${category}`.toLowerCase();

  if (norm.includes("git") || norm.includes("dev") || norm.includes("docker") || norm.includes("cloud")) {
    return { icon: GitBranch, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" };
  }
  if (norm.includes("pay") || norm.includes("stripe") || norm.includes("coinbase") || norm.includes("financ")) {
    return { icon: Shield, color: "#f472b6", bg: "rgba(244, 114, 182, 0.12)" };
  }
  if (norm.includes("notion") || norm.includes("productiv") || norm.includes("doc")) {
    return { icon: FileText, color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)" };
  }
  if (norm.includes("figma") || norm.includes("design") || norm.includes("creative")) {
    return { icon: Layers, color: "#fb7185", bg: "rgba(251, 113, 133, 0.12)" };
  }
  if (norm.includes("slack") || norm.includes("social") || norm.includes("twitter") || norm.includes("messag")) {
    return { icon: Activity, color: "#fb923c", bg: "rgba(251, 146, 60, 0.12)" };
  }
  if (norm.includes("storage") || norm.includes("dropbox") || norm.includes("drive")) {
    return { icon: Cloud, color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" };
  }

  return { icon: Globe2, color: "#4ade80", bg: "rgba(74, 222, 128, 0.12)" };
}

/**
 * Main Digital Footprint Timeline Component
 */
export default function DigitalFootprintTimeline() {
  const {
    assets: contextAssets,
    stats: contextStats,
    isLive: contextIsLive,
    loading: contextLoading,
    scanInbox,
    updateAccountStatus,
    removeAccount,
  } = useGhostGuard();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST_FIRST"); // 'NEWEST_FIRST' | 'OLDEST_FIRST'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Fetch backend audit logs on mount
  useEffect(() => {
    let active = true;
    async function fetchLogs() {
      try {
        const res = await auditApi.getLogs();
        if (active && res && Array.isArray(res.logs)) {
          setAuditLogs(res.logs);
        }
      } catch (err) {
        // Graceful fallback to client-synthesized logs
      }
    }
    fetchLogs();
    return () => {
      active = false;
    };
  }, []);

  // Determine current active asset dataset
  const activeAssets = useMemo(() => {
    if (contextAssets && contextAssets.length > 0) return contextAssets;

    // Fallback demo dataset if unauthenticated or store is empty
    return [
      {
        domain: "stripe.com",
        serviceName: "Stripe",
        category: "Financial Infrastructure",
        ghostScore: 88,
        riskLevel: "HIGH",
        status: "UNREVIEWED",
        isDormant: true,
        ageInMonths: 26,
        detectedDate: "2023-08-05T11:00:00.000Z",
        remediationTip: "Rotate webhook signing secrets and enable MFA hardware keys.",
        snippet: "Finish setting up your Stripe account and verify your business details.",
      },
      {
        domain: "coinbase.com",
        serviceName: "Coinbase",
        category: "Financial",
        ghostScore: 82,
        riskLevel: "HIGH",
        status: "UNREVIEWED",
        isDormant: true,
        ageInMonths: 23,
        detectedDate: "2023-11-10T13:40:00.000Z",
        remediationTip: "Enable hardware security keys and review whitelist withdrawal addresses.",
        snippet: "Verify your email address on Coinbase to secure crypto transactions.",
      },
      {
        domain: "twitter.com",
        serviceName: "Twitter / X",
        category: "Social Network",
        ghostScore: 78,
        riskLevel: "HIGH",
        status: "UNREVIEWED",
        isDormant: true,
        ageInMonths: 38,
        detectedDate: "2022-08-14T18:20:00.000Z",
        remediationTip: "Revoke third-party application write authorizations and reset password.",
        snippet: "Confirm your email address on Twitter to activate your profile.",
      },
      {
        domain: "github.com",
        serviceName: "GitHub",
        category: "Development",
        ghostScore: 55,
        riskLevel: "Medium",
        status: "SECURED",
        isDormant: false,
        ageInMonths: 9,
        detectedDate: "2024-01-15T14:22:10.000Z",
        remediationTip: "Review third-party OAuth application authorizations and SSH keys.",
        snippet: "Please verify your email address to access repositories.",
      },
      {
        domain: "docker.com",
        serviceName: "Docker Hub",
        category: "Development",
        ghostScore: 48,
        riskLevel: "Medium",
        status: "UNREVIEWED",
        isDormant: false,
        ageInMonths: 9,
        detectedDate: "2024-01-18T12:00:00.000Z",
        remediationTip: "Rotate access tokens used in CI/CD pipeline automation.",
        snippet: "Verify your Docker Hub account registration.",
      },
      {
        domain: "slack.com",
        serviceName: "Slack",
        category: "Productivity",
        ghostScore: 40,
        riskLevel: "Medium",
        status: "KEPT",
        isDormant: false,
        ageInMonths: 17,
        detectedDate: "2023-05-03T09:30:00.000Z",
        remediationTip: "Review shared external channels and enterprise grid permissions.",
        snippet: "Confirm your email to join your workspace on Slack.",
      },
      {
        domain: "notion.so",
        serviceName: "Notion",
        category: "Productivity",
        ghostScore: 22,
        riskLevel: "Low",
        status: "KEPT",
        isDormant: true,
        ageInMonths: 24,
        detectedDate: "2023-10-12T10:15:00.000Z",
        remediationTip: "Audit public web sharing permissions across team workspaces.",
        snippet: "Welcome to Notion! Your all-in-one workspace.",
      },
      {
        domain: "figma.com",
        serviceName: "Figma",
        category: "Design",
        ghostScore: 16,
        riskLevel: "Low",
        status: "SECURED",
        isDormant: false,
        ageInMonths: 11,
        detectedDate: "2023-11-20T16:45:00.000Z",
        remediationTip: "Inspect OAuth app connections and public link access.",
        snippet: "Thanks for joining Figma! Explore multiplayer design files.",
      },
      {
        domain: "spotify.com",
        serviceName: "Spotify",
        category: "Entertainment",
        ghostScore: 12,
        riskLevel: "Low",
        status: "UNREVIEWED",
        isDormant: false,
        ageInMonths: 16,
        detectedDate: "2023-06-04T12:05:00.000Z",
        remediationTip: "Review connected speaker and smart home integration permissions.",
        snippet: "Thanks for signing up! Start listening to millions of songs.",
      },
    ];
  }, [contextAssets]);

  // Construct comprehensive chronological timeline events from assets and logs
  const timelineEvents = useMemo(() => {
    const events = [];

    activeAssets.forEach((asset, idx) => {
      const domain = asset.domain || `service-${idx}`;
      const serviceName = asset.serviceName || asset.name || domain;
      const category = asset.category || "General Service";
      const ghostScore = typeof asset.ghostScore === "number" ? asset.ghostScore : 0;
      const riskLevel = asset.riskLevel || (ghostScore >= 70 ? "HIGH" : ghostScore >= 40 ? "Medium" : "Low");
      const status = asset.status || "UNREVIEWED";

      // 1. Creation / Registration Event
      let regDate = null;
      if (asset.detectedDate) {
        regDate = new Date(asset.detectedDate);
      } else if (typeof asset.ageInMonths === "number") {
        regDate = computeDateFromAge(asset.ageInMonths);
      } else {
        regDate = new Date(Date.now() - (idx + 4) * 45 * 24 * 60 * 60 * 1000);
      }

      events.push({
        id: `reg_${domain}`,
        type: "REGISTRATION",
        categoryType: "Account Registrations",
        date: regDate,
        dateString: formatEventDate(regDate),
        year: getEventYear(regDate),
        serviceName,
        domain,
        category,
        ghostScore,
        riskLevel,
        status,
        badgeLabel: "Account Registered",
        badgeStyle: {
          bg: "rgba(56, 189, 248, 0.12)",
          color: "#38bdf8",
          border: "rgba(56, 189, 248, 0.3)",
        },
        description: `Initial confirmation artifact detected for ${serviceName}. Onboarding confirmed and cataloged into digital perimeter.`,
        asset,
      });

      // 2. Dormancy Event (if account is dormant)
      if (asset.isDormant || (asset.ageInMonths && asset.ageInMonths >= 12)) {
        // Dormancy occurred ~12 months after registration
        const dormDate = new Date(regDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const effectiveDormDate = dormDate > new Date() ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : dormDate;

        events.push({
          id: `dorm_${domain}`,
          type: "DORMANCY",
          categoryType: "Dormancy Flags",
          date: effectiveDormDate,
          dateString: formatEventDate(effectiveDormDate),
          year: getEventYear(effectiveDormDate),
          serviceName,
          domain,
          category,
          ghostScore,
          riskLevel,
          status,
          badgeLabel: "Account Marked Dormant",
          badgeStyle: {
            bg: "rgba(251, 191, 36, 0.12)",
            color: "#fbbf24",
            border: "rgba(251, 191, 36, 0.35)",
          },
          description: `No active receipts or transactions detected for 12+ months. Flagged as dormant identity surface.`,
          asset,
        });
      }

      // 3. GhostGuard Scan Discovery Event
      const scanDate = asset.lastScannedAt ? new Date(asset.lastScannedAt) : new Date(Date.now() - (idx % 3 + 1) * 3600 * 1000 * 8);
      events.push({
        id: `disc_${domain}`,
        type: "DISCOVERY",
        categoryType: "Ghost Discoveries",
        date: scanDate,
        dateString: formatEventDate(scanDate),
        year: getEventYear(scanDate),
        serviceName,
        domain,
        category,
        ghostScore,
        riskLevel,
        status,
        badgeLabel: "Discovered by Scan",
        badgeStyle: {
          bg: "rgba(74, 222, 128, 0.12)",
          color: "#4ade80",
          border: "rgba(74, 222, 128, 0.3)",
        },
        description: `GhostGuard non-intrusive Gmail scan indexed this account. Evaluated posture at Ghost Score: ${ghostScore}/100.`,
        asset,
      });

      // 4. Remediation / Security Review Event (if actioned)
      if (status && status !== "UNREVIEWED") {
        const actionDate = asset.userActionDate ? new Date(asset.userActionDate) : new Date(Date.now() - (idx * 2 + 1) * 3600 * 1000 * 12);
        const isRevoked = status === "REVOKED" || status === "MARKED_FOR_DELETION";
        const isSecured = status === "SECURED";

        events.push({
          id: `act_${domain}`,
          type: "SECURITY",
          categoryType: "Security Reviews",
          date: actionDate,
          dateString: formatEventDate(actionDate),
          year: getEventYear(actionDate),
          serviceName,
          domain,
          category,
          ghostScore,
          riskLevel,
          status,
          badgeLabel: isRevoked ? "OAuth Revoked / Secured" : isSecured ? "Credential Hardened" : "Security Verified",
          badgeStyle: {
            bg: isRevoked ? "rgba(251, 113, 133, 0.12)" : "rgba(167, 139, 250, 0.14)",
            color: isRevoked ? "#fb7185" : "#c4b5fd",
            border: isRevoked ? "rgba(251, 113, 133, 0.3)" : "rgba(167, 139, 250, 0.35)",
          },
          description: `User applied remediation action: ${status}. ${asset.userNotes ? `Note: "${asset.userNotes}"` : "State persisted to Cloud Firestore."}`,
          asset,
        });
      }
    });

    // Merge backend audit logs if available
    auditLogs.forEach((log) => {
      const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
      const targetDomain = log.targetId || "Account";
      const actionName = (log.action || "").replace(/^REMEDIATION_/, "");

      events.push({
        id: log.id || `log_${Math.random()}`,
        type: "SECURITY",
        categoryType: "Security Reviews",
        date: logDate,
        dateString: formatEventDate(logDate),
        year: getEventYear(logDate),
        serviceName: targetDomain,
        domain: targetDomain,
        category: "Audit Activity",
        ghostScore: 0,
        riskLevel: "Low",
        status: actionName || "REVIEWED",
        badgeLabel: `Remediation: ${actionName}`,
        badgeStyle: {
          bg: "rgba(167, 139, 250, 0.14)",
          color: "#c4b5fd",
          border: "rgba(167, 139, 250, 0.35)",
        },
        description: `Cloud Firestore audit log registered event: ${log.action} on ${targetDomain}.`,
        asset: activeAssets.find((a) => a.domain === targetDomain) || {
          domain: targetDomain,
          serviceName: targetDomain,
          status: actionName,
        },
      });
    });

    return events;
  }, [activeAssets, auditLogs]);

  // Compute 4 quick summary metrics
  const summaryMetrics = useMemo(() => {
    // 1. Earliest known account
    let earliest = null;
    timelineEvents.forEach((ev) => {
      if (ev.type === "REGISTRATION" && ev.date) {
        if (!earliest || ev.date.getTime() < earliest.date.getTime()) {
          earliest = ev;
        }
      }
    });

    const earliestLabel = earliest
      ? `${earliest.date.toLocaleDateString("en-US", { month: "short", year: "numeric" })} (${earliest.serviceName})`
      : "None registered";

    // 2. Recently discovered in past 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentlyDiscoveredCount = activeAssets.filter((a) => {
      if (!a.detectedDate) return true;
      const d = new Date(a.detectedDate).getTime();
      return !isNaN(d) && d >= thirtyDaysAgo;
    }).length;

    // 3. Unreviewed milestones
    const unreviewedCount = activeAssets.filter((a) => !a.status || a.status === "UNREVIEWED").length;

    // 4. Remediation events
    const remediationCount = activeAssets.filter((a) => a.status && a.status !== "UNREVIEWED").length;

    return {
      earliestLabel,
      recentlyDiscoveredCount: recentlyDiscoveredCount || activeAssets.length,
      unreviewedCount,
      remediationCount: remediationCount || auditLogs.length,
    };
  }, [timelineEvents, activeAssets, auditLogs]);

  // Filter & Sort events
  const filteredEvents = useMemo(() => {
    let result = timelineEvents;

    // Filter pill selection
    if (activeFilter !== "ALL") {
      result = result.filter((ev) => ev.type === activeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ev) =>
          ev.serviceName.toLowerCase().includes(q) ||
          ev.domain.toLowerCase().includes(q) ||
          ev.category.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q)
      );
    }

    // Sort order
    return result.sort((a, b) => {
      const timeA = a.date ? a.date.getTime() : 0;
      const timeB = b.date ? b.date.getTime() : 0;
      return sortOrder === "NEWEST_FIRST" ? timeB - timeA : timeA - timeB;
    });
  }, [timelineEvents, activeFilter, searchQuery, sortOrder]);

  // Group filtered events by year
  const groupedByYear = useMemo(() => {
    const groups = new Map();

    filteredEvents.forEach((ev) => {
      const year = ev.year;
      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year).push(ev);
    });

    return Array.from(groups.entries());
  }, [filteredEvents]);

  // Selected event for deep inspection drawer
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return timelineEvents.find((ev) => ev.id === selectedEventId) || null;
  }, [selectedEventId, timelineEvents]);

  // Handle inline remediation actions
  const handleRemediate = async (domain, action) => {
    setActionInProgress(domain);
    setActionNotice(null);
    try {
      if (action === "REMOVE_RECORD") {
        if (removeAccount) {
          await removeAccount(domain);
        } else {
          await auditApi.removeAsset(domain);
        }
        setActionNotice({ type: "success", text: `Permanently removed ${domain} from digital perimeter.` });
      } else {
        if (updateAccountStatus) {
          await updateAccountStatus(domain, action);
        } else {
          await auditApi.updateAction({ domain, action });
        }
        setActionNotice({ type: "success", text: `Updated ${domain} status to ${action} in Cloud Firestore.` });
      }
    } catch (err) {
      setActionNotice({ type: "error", text: err.message || "Remediation action failed." });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <DashboardShell
      title="Identity Timeline"
      description="Trace the lifecycle of your digital perimeter from initial registration to recent remediation."
    >
      {!contextIsLive && <DemoBanner />}

      {/* 1. Header Section */}
      <div style={{ marginBottom: "26px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(74, 222, 128, 0.1)",
            border: "1px solid rgba(74, 222, 128, 0.25)",
            color: "#4ade80",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          <Clock size={13} />
          CHRONOLOGICAL IDENTITY AUDIT
        </div>
        <h1
          style={{
            fontSize: "30px",
            color: "#f1f5ee",
            margin: "0 0 6px 0",
            fontFamily: '"Recoleta", Georgia, serif',
            fontWeight: "600",
            letterSpacing: "-0.02em",
          }}
        >
          Digital Footprint Timeline
        </h1>
        <p style={{ margin: 0, color: "#8ea890", fontSize: "14.5px", maxWidth: "740px", lineHeight: "1.6" }}>
          Trace the lifecycle of your digital perimeter from initial registration to recent remediation.
        </p>
      </div>

      {/* 2. Quick Metrics Summary Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: "#18261e",
            border: "1px solid rgba(74, 222, 128, 0.16)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#8ea890", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              Earliest Known Account
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>
              <History size={16} />
            </div>
          </div>
          <strong style={{ fontSize: "16px", color: "#f1f5ee", fontWeight: "600", marginTop: "4px" }}>
            {summaryMetrics.earliestLabel}
          </strong>
          <span style={{ fontSize: "11.5px", color: "#6a886d" }}>First detected entry point</span>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: "#18261e",
            border: "1px solid rgba(74, 222, 128, 0.16)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#8ea890", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              Recently Discovered
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(74, 222, 128, 0.12)", color: "#4ade80" }}>
              <Sparkles size={16} />
            </div>
          </div>
          <strong style={{ fontSize: "24px", color: "#4ade80", fontWeight: "700" }}>
            {summaryMetrics.recentlyDiscoveredCount}
          </strong>
          <span style={{ fontSize: "11.5px", color: "#6a886d" }}>Indexed in recent audit scans</span>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: "#18261e",
            border: "1px solid rgba(74, 222, 128, 0.16)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#8ea890", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              Unreviewed Milestones
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(251, 191, 36, 0.12)", color: "#fbbf24" }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <strong style={{ fontSize: "24px", color: "#fbbf24", fontWeight: "700" }}>
            {summaryMetrics.unreviewedCount}
          </strong>
          <span style={{ fontSize: "11.5px", color: "#6a886d" }}>Pending triage & confirmation</span>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: "#18261e",
            border: "1px solid rgba(74, 222, 128, 0.16)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#8ea890", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              Remediation Events
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(167, 139, 250, 0.14)", color: "#c4b5fd" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <strong style={{ fontSize: "24px", color: "#c4b5fd", fontWeight: "700" }}>
            {summaryMetrics.remediationCount}
          </strong>
          <span style={{ fontSize: "11.5px", color: "#6a886d" }}>Secured, kept, or revoked</span>
        </div>
      </div>

      {/* 3. Filter & Sort Bar */}
      <div
        style={{
          background: "#18261e",
          border: "1px solid rgba(74, 222, 128, 0.15)",
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {TIMELINE_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "999px",
                  fontSize: "12.5px",
                  fontWeight: isActive ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  border: isActive ? "1px solid #4ade80" : "1px solid rgba(74, 222, 128, 0.15)",
                  background: isActive ? "rgba(74, 222, 128, 0.18)" : "transparent",
                  color: isActive ? "#f1f5ee" : "#8ea890",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Sort & Search Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Quick Search */}
          <div style={{ position: "relative", minWidth: "200px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#8ea890" }} />
            <input
              type="text"
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: "8px",
                background: "#131e17",
                border: "1px solid rgba(74, 222, 128, 0.2)",
                color: "#f1f5ee",
                fontSize: "12.5px",
                outline: "none",
              }}
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "NEWEST_FIRST" ? "OLDEST_FIRST" : "NEWEST_FIRST"))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "#131e17",
              border: "1px solid rgba(74, 222, 128, 0.25)",
              color: "#c2d6b8",
              fontSize: "12.5px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            <ArrowUpDown size={13} />
            {sortOrder === "NEWEST_FIRST" ? "Newest First" : "Oldest First"}
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            background: actionNotice.type === "success" ? "rgba(74, 222, 128, 0.12)" : "rgba(251, 113, 133, 0.12)",
            border: actionNotice.type === "success" ? "1px solid rgba(74, 222, 128, 0.35)" : "1px solid rgba(251, 113, 133, 0.35)",
            color: actionNotice.type === "success" ? "#4ade80" : "#fb7185",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4. Chronological Interactive Timeline Visualization */}
      <div style={{ position: "relative", minHeight: "400px" }}>
        {filteredEvents.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#18261e",
              border: "1px dashed rgba(74, 222, 128, 0.2)",
              borderRadius: "14px",
              color: "#8ea890",
            }}
          >
            <Clock size={32} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
            <p style={{ margin: "0 0 6px", fontSize: "16px", color: "#f1f5ee" }}>No timeline events found</p>
            <span style={{ fontSize: "13px" }}>Try selecting another filter or adjusting your search term.</span>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: "28px" }}>
            {/* Vertical glowing spine trail */}
            <div
              style={{
                position: "absolute",
                left: "11px",
                top: "14px",
                bottom: "20px",
                width: "2px",
                background: "linear-gradient(180deg, rgba(74, 222, 128, 0.4) 0%, rgba(74, 222, 128, 0.15) 50%, rgba(74, 222, 128, 0.05) 100%)",
              }}
            />

            {/* Render Year Groups */}
            {groupedByYear.map(([year, eventsInYear]) => (
              <div key={year} style={{ marginBottom: "32px" }}>
                {/* Year Marker Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", marginLeft: "-28px" }}>
                  <div
                    style={{
                      padding: "4px 14px",
                      borderRadius: "999px",
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.4) 100%)",
                      border: "1px solid rgba(74, 222, 128, 0.4)",
                      color: "#4ade80",
                      fontSize: "13px",
                      fontWeight: "700",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    {year}
                  </div>
                  <span style={{ fontSize: "12px", color: "#6a886d" }}>
                    {eventsInYear.length} milestone{eventsInYear.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Event Nodes */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {eventsInYear.map((ev) => {
                    const visuals = getServiceVisuals(ev.serviceName, ev.category);
                    const IconComponent = visuals.icon;
                    const isSelected = selectedEventId === ev.id;

                    return (
                      <div
                        key={ev.id}
                        style={{
                          position: "relative",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {/* Node circle on spine */}
                        <div
                          style={{
                            position: "absolute",
                            left: "-23px",
                            top: "20px",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: ev.badgeStyle.color,
                            boxShadow: `0 0 10px ${ev.badgeStyle.color}`,
                            border: "2px solid #131e17",
                            zIndex: 2,
                          }}
                        />

                        {/* Interactive Event Card */}
                        <div
                          onClick={() => setSelectedEventId((prev) => (prev === ev.id ? null : ev.id))}
                          style={{
                            background: isSelected ? "rgba(35, 54, 40, 0.95)" : "#18261e",
                            border: isSelected ? "1px solid #4ade80" : "1px solid rgba(74, 222, 128, 0.16)",
                            borderRadius: "14px",
                            padding: "18px 22px",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                            boxShadow: isSelected ? "0 6px 24px rgba(74, 222, 128, 0.12)" : "0 4px 16px rgba(0, 0, 0, 0.2)",
                          }}
                        >
                          {/* Top Row: Date Pill & Event Badge & Ghost Score */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginBottom: "12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "3px 10px",
                                  borderRadius: "6px",
                                  background: "rgba(194, 214, 184, 0.1)",
                                  border: "1px solid rgba(194, 214, 184, 0.2)",
                                  fontSize: "12px",
                                  color: "#c2d6b8",
                                  fontWeight: "600",
                                }}
                              >
                                <Calendar size={12} />
                                {ev.dateString}
                              </span>

                              <span
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: "6px",
                                  background: ev.badgeStyle.bg,
                                  color: ev.badgeStyle.color,
                                  border: `1px solid ${ev.badgeStyle.border}`,
                                  fontSize: "11px",
                                  fontWeight: "600",
                                }}
                              >
                                {ev.badgeLabel}
                              </span>
                            </div>

                            {/* Risk / Score Pill */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  color: ev.ghostScore >= 70 ? "#f87171" : ev.ghostScore >= 40 ? "#fbbf24" : "#4ade80",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "rgba(0, 0, 0, 0.3)",
                                  border: "1px solid rgba(74, 222, 128, 0.12)",
                                }}
                              >
                                Score: {ev.ghostScore}/100
                              </span>
                              <span style={{ color: "#6a886d", fontSize: "12px" }}>
                                {isSelected ? "Hide details ▴" : "Deep inspect ▾"}
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Service Brand Avatar & Name */}
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: visuals.bg,
                                border: `1px solid ${visuals.color}40`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: visuals.color,
                                flexShrink: 0,
                              }}
                            >
                              <IconComponent size={20} />
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ fontSize: "16px", color: "#f1f5ee" }}>{ev.serviceName}</strong>
                                <span style={{ fontSize: "12px", color: "#8ea890" }}>({ev.domain})</span>
                              </div>
                              <span style={{ fontSize: "12px", color: "#9bb89e" }}>{ev.category}</span>
                            </div>
                          </div>

                          {/* Description */}
                          <p style={{ margin: "6px 0 0", color: "#8ea890", fontSize: "13px", lineHeight: "1.55" }}>
                            {ev.description}
                          </p>

                          {/* 5. Deep Inspection Inline Card (Slide-Down) */}
                          {isSelected && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                marginTop: "16px",
                                paddingTop: "16px",
                                borderTop: "1px solid rgba(74, 222, 128, 0.18)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "14px",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                  gap: "10px",
                                  background: "rgba(19, 30, 23, 0.7)",
                                  padding: "14px",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(74, 222, 128, 0.12)",
                                }}
                              >
                                <div>
                                  <span style={{ fontSize: "11px", color: "#6a886d", textTransform: "uppercase", display: "block" }}>
                                    Original Detection
                                  </span>
                                  <strong style={{ fontSize: "13px", color: "#f1f5ee" }}>
                                    {ev.asset?.detectedDate ? formatEventDate(ev.asset.detectedDate) : ev.dateString}
                                  </strong>
                                </div>

                                <div>
                                  <span style={{ fontSize: "11px", color: "#6a886d", textTransform: "uppercase", display: "block" }}>
                                    Dormancy State
                                  </span>
                                  <strong style={{ fontSize: "13px", color: ev.asset?.isDormant ? "#fbbf24" : "#4ade80" }}>
                                    {ev.asset?.isDormant ? "Dormant (12+ mos inactive)" : "Active perimeter asset"}
                                  </strong>
                                </div>

                                <div>
                                  <span style={{ fontSize: "11px", color: "#6a886d", textTransform: "uppercase", display: "block" }}>
                                    Remediation Status
                                  </span>
                                  <strong style={{ fontSize: "13px", color: "#c4b5fd" }}>
                                    {ev.status || "UNREVIEWED"}
                                  </strong>
                                </div>

                                <div>
                                  <span style={{ fontSize: "11px", color: "#6a886d", textTransform: "uppercase", display: "block" }}>
                                    Domain
                                  </span>
                                  <a
                                    href={`https://${ev.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: "13px",
                                      color: "#38bdf8",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {ev.domain} <ExternalLink size={12} />
                                  </a>
                                </div>
                              </div>

                              {/* Hygiene Advice */}
                              {ev.asset?.remediationTip && (
                                <div
                                  style={{
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(16, 185, 129, 0.08)",
                                    border: "1px solid rgba(74, 222, 128, 0.2)",
                                    fontSize: "12.5px",
                                    color: "#9bb89e",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                  }}
                                >
                                  <ShieldCheck size={16} style={{ color: "#4ade80", flexShrink: 0, marginTop: "2px" }} />
                                  <span>
                                    <strong style={{ color: "#f1f5ee" }}>Hygiene Recommendation:</strong> {ev.asset.remediationTip}
                                  </span>
                                </div>
                              )}

                              {/* One-Click Remediation Actions */}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  disabled={actionInProgress === ev.domain}
                                  onClick={() => handleRemediate(ev.domain, "SECURED")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(74, 222, 128, 0.15)",
                                    border: "1px solid rgba(74, 222, 128, 0.35)",
                                    color: "#4ade80",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Lock size={13} />
                                  Secure Account
                                </button>

                                <button
                                  type="button"
                                  disabled={actionInProgress === ev.domain}
                                  onClick={() => handleRemediate(ev.domain, "REVOKED")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(251, 113, 133, 0.15)",
                                    border: "1px solid rgba(251, 113, 133, 0.35)",
                                    color: "#fb7185",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                  }}
                                >
                                  <X size={13} />
                                  Revoke OAuth
                                </button>

                                <button
                                  type="button"
                                  disabled={actionInProgress === ev.domain}
                                  onClick={() => handleRemediate(ev.domain, "KEPT")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(167, 139, 250, 0.15)",
                                    border: "1px solid rgba(167, 139, 250, 0.35)",
                                    color: "#c4b5fd",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Check size={13} />
                                  Keep & Verify
                                </button>

                                <button
                                  type="button"
                                  disabled={actionInProgress === ev.domain}
                                  onClick={() => handleRemediate(ev.domain, "REMOVE_RECORD")}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    color: "#f87171",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    marginLeft: "auto",
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Remove Record
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

