"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Mail,
  Trash2,
  Lock,
  RefreshCw,
  Sparkles,
  Code2,
  Briefcase,
  CreditCard,
  Share2,
  Cloud,
  Palette,
  Globe,
  Layers,
  Filter,
  ArrowUpDown,
  Check,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useGhostGuard, DashboardShell, DemoBanner } from "@/components/ghostguard";
import api, { auditApi } from "@/lib/api";

/**
 * Normalizes raw category string to standard category keys and metadata
 */
export function getCategoryMeta(categoryName = "") {
  const norm = (categoryName || "").toLowerCase().trim();

  if (norm.includes("dev") || norm.includes("code") || norm.includes("git")) {
    return {
      key: "developer",
      label: "Developer Services",
      icon: Code2,
      color: "#22d3ee",
      badgeColor: "rgba(34, 211, 238, 0.15)",
      borderColor: "rgba(34, 211, 238, 0.3)",
      description: "Code repositories, container registries, deployment & cloud APIs",
    };
  }

  if (norm.includes("prod") || norm.includes("work") || norm.includes("task") || norm.includes("collab")) {
    return {
      key: "productivity",
      label: "Productivity Suite",
      icon: Briefcase,
      color: "#8b5cf6",
      badgeColor: "rgba(139, 92, 246, 0.15)",
      borderColor: "rgba(139, 92, 246, 0.3)",
      description: "Team documentation, task management, email & workspace software",
    };
  }

  if (norm.includes("fin") || norm.includes("pay") || norm.includes("bank") || norm.includes("crypto") || norm.includes("bill")) {
    return {
      key: "finance",
      label: "Financial Platforms",
      icon: CreditCard,
      color: "#f59e0b",
      badgeColor: "rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      description: "Payment gateways, billing systems, merchant accounts & banking bridges",
    };
  }

  if (norm.includes("soc") || norm.includes("media") || norm.includes("comm") || norm.includes("chat")) {
    return {
      key: "social",
      label: "Social & Media",
      icon: Share2,
      color: "#3b82f6",
      badgeColor: "rgba(59, 130, 246, 0.15)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      description: "Social networking, video streaming, discussions & public profiles",
    };
  }

  if (norm.includes("stor") || norm.includes("cloud") || norm.includes("drive") || norm.includes("file")) {
    return {
      key: "storage",
      label: "Cloud & Storage",
      icon: Cloud,
      color: "#06b6d4",
      badgeColor: "rgba(6, 182, 212, 0.15)",
      borderColor: "rgba(6, 182, 212, 0.3)",
      description: "Cloud drives, document storage, backups & blob hosting",
    };
  }

  if (norm.includes("creat") || norm.includes("design") || norm.includes("photo") || norm.includes("art")) {
    return {
      key: "creative",
      label: "Creative & Design",
      icon: Palette,
      color: "#ec4899",
      badgeColor: "rgba(236, 72, 153, 0.15)",
      borderColor: "rgba(236, 72, 153, 0.3)",
      description: "Vector tools, UI prototyping, digital assets & creative media",
    };
  }

  return {
    key: "general",
    label: "General Services",
    icon: Globe,
    color: "#10b981",
    badgeColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    description: "SaaS subscriptions, utility accounts & third-party services",
  };
}

/**
 * Rich fallback demo dataset for demonstration when live Gmail is not connected
 */
const DEMO_FALLBACK_ACCOUNTS = [
  {
    id: "demo-gh",
    serviceName: "GitHub",
    domain: "github.com",
    category: "Developer",
    detectedDate: "2023-11-14T08:30:00.000Z",
    firstDiscoveredEmail: "[GitHub] Please verify your email address.",
    snippet: "Thanks for signing up for GitHub! Verify your email to access repositories and personal access tokens.",
    riskLevel: "High",
    ghostScore: 84,
    status: "UNREVIEWED",
    remediationTip: "Developer platform dormant > 12 months with potential API keys and repository access. Enable 2FA or rotate tokens.",
    isDormant: true,
  },
  {
    id: "demo-docker",
    serviceName: "Docker Hub",
    domain: "hub.docker.com",
    category: "Developer",
    detectedDate: "2023-08-20T14:10:00.000Z",
    firstDiscoveredEmail: "Confirm your Docker Hub registration",
    snippet: "Welcome to Docker! Push and pull public and private container images from Docker Hub.",
    riskLevel: "High",
    ghostScore: 78,
    status: "UNREVIEWED",
    remediationTip: "Dormant container registry. Audit deployed container image tokens and delete if abandoned.",
    isDormant: true,
  },
  {
    id: "demo-vercel",
    serviceName: "Vercel",
    domain: "vercel.com",
    category: "Developer",
    detectedDate: "2024-04-12T11:20:00.000Z",
    firstDiscoveredEmail: "Welcome to Vercel!",
    snippet: "Your Vercel deployment preview is ready. You signed up using GitHub OAuth.",
    riskLevel: "Medium",
    ghostScore: 52,
    status: "SECURED",
    remediationTip: "Review connected git providers and environment secrets on active projects.",
    isDormant: false,
  },
  {
    id: "demo-notion",
    serviceName: "Notion",
    domain: "notion.so",
    category: "Productivity",
    detectedDate: "2023-10-12T10:15:00.000Z",
    firstDiscoveredEmail: "Welcome to Notion! Your all-in-one workspace",
    snippet: "Welcome to Notion! Set up your team workspaces, engineering wikis, and project trackers.",
    riskLevel: "High",
    ghostScore: 76,
    status: "UNREVIEWED",
    remediationTip: "Workspace inactive > 12 months. Export any proprietary notes and delete workspace via Settings & Members.",
    isDormant: true,
  },
  {
    id: "demo-slack",
    serviceName: "Slack",
    domain: "slack.com",
    category: "Productivity",
    detectedDate: "2024-02-18T09:30:00.000Z",
    firstDiscoveredEmail: "Confirm your email to join the workspace on Slack",
    snippet: "You have been added to the developer workspace on Slack. Sign in to collaborate.",
    riskLevel: "Low",
    ghostScore: 24,
    status: "KEPT",
    remediationTip: "Active team chat. Ensure multi-factor authentication is configured.",
    isDormant: false,
  },
  {
    id: "demo-gw",
    serviceName: "Google Workspace",
    domain: "workspace.google.com",
    category: "Productivity",
    detectedDate: "2024-08-01T15:00:00.000Z",
    firstDiscoveredEmail: "Google Workspace account created",
    snippet: "Welcome to Google Workspace. You have access to Gmail, Calendar, Docs, and Drive.",
    riskLevel: "Low",
    ghostScore: 18,
    status: "SECURED",
    remediationTip: "Primary identity provider. Verified 2FA and recovery phone active.",
    isDormant: false,
  },
  {
    id: "demo-stripe",
    serviceName: "Stripe",
    domain: "stripe.com",
    category: "Finance",
    detectedDate: "2023-09-05T11:00:00.000Z",
    firstDiscoveredEmail: "Activate your account to start accepting payments",
    snippet: "Finish setting up your Stripe account and verify your merchant banking details.",
    riskLevel: "High",
    ghostScore: 92,
    status: "UNREVIEWED",
    remediationTip: "CRITICAL: Financial service inactive > 6 months. Check for linked bank accounts, customer data, and active API keys.",
    isDormant: true,
  },
  {
    id: "demo-paypal",
    serviceName: "PayPal",
    domain: "paypal.com",
    category: "Finance",
    detectedDate: "2024-01-10T12:00:00.000Z",
    firstDiscoveredEmail: "Welcome to PayPal",
    snippet: "Your PayPal account is set up and ready to send and receive payments online.",
    riskLevel: "Medium",
    ghostScore: 58,
    status: "SECURED",
    remediationTip: "Verify registered debit/credit cards and ensure SMS 2-step verification is enabled.",
    isDormant: false,
  },
  {
    id: "demo-x",
    serviceName: "X (Twitter)",
    domain: "x.com",
    category: "Social & Media",
    detectedDate: "2023-05-10T16:00:00.000Z",
    firstDiscoveredEmail: "Confirm your X account",
    snippet: "Confirm your email address to complete your X registration and customize your profile.",
    riskLevel: "Medium",
    ghostScore: 62,
    status: "UNREVIEWED",
    remediationTip: "Social account inactive > 18 months. Review connected OAuth apps or revoke account access.",
    isDormant: true,
  },
  {
    id: "demo-linkedin",
    serviceName: "LinkedIn",
    domain: "linkedin.com",
    category: "Social & Media",
    detectedDate: "2024-03-22T08:15:00.000Z",
    firstDiscoveredEmail: "Confirm your email address on LinkedIn",
    snippet: "You joined LinkedIn! Connect with colleagues and explore industry opportunities.",
    riskLevel: "Low",
    ghostScore: 28,
    status: "KEPT",
    remediationTip: "Professional network profile. Review public visibility settings in Privacy & Settings.",
    isDormant: false,
  },
  {
    id: "demo-dropbox",
    serviceName: "Dropbox",
    domain: "dropbox.com",
    category: "Storage",
    detectedDate: "2023-07-15T13:45:00.000Z",
    firstDiscoveredEmail: "Welcome to Dropbox! Get started with cloud sync",
    snippet: "Keep your files safe and synced across all your devices with your Dropbox cloud storage.",
    riskLevel: "Medium",
    ghostScore: 66,
    status: "MARKED_FOR_DELETION",
    remediationTip: "Dormant cloud storage. Download archived files and close account to prevent data retention.",
    isDormant: true,
  },
  {
    id: "demo-figma",
    serviceName: "Figma",
    domain: "figma.com",
    category: "Creative",
    detectedDate: "2024-05-19T10:00:00.000Z",
    firstDiscoveredEmail: "Welcome to Figma - Let's build together",
    snippet: "Thanks for joining Figma! Explore multiplayer design canvases and community plugins.",
    riskLevel: "Low",
    ghostScore: 22,
    status: "SECURED",
    remediationTip: "Active design tool. Review team workspace member invitations and public link sharing.",
    isDormant: false,
  },
];

/**
 * Service Favicon with fallback initials
 */
function ServiceAvatar({ domain, serviceName, categoryColor }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = useMemo(() => {
    const raw = serviceName || domain || "?";
    const parts = raw.split(/[\s.-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [serviceName, domain]);

  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";

  return (
    <div
      style={{
        width: "38px",
        height: "38px",
        borderRadius: "10px",
        background: "rgba(15, 23, 42, 0.9)",
        border: `1.5px solid ${categoryColor ? `${categoryColor}40` : "rgba(148, 163, 184, 0.2)"}`,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      {!imgFailed && faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt={serviceName || domain}
          width={20}
          height={20}
          style={{ width: "20px", height: "20px", objectFit: "contain" }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: categoryColor || "#22d3ee",
            letterSpacing: "0.5px",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

/**
 * Main Categorized Footprint Directory Component
 */
export default function CategorizedFootprintDirectory() {
  const {
    isLive: contextIsLive,
    userEmail,
    assets: contextAssets,
    stats: contextStats,
    scanInbox,
    isScanning,
    updateAccountStatus,
    scanMessage,
  } = useGhostGuard();

  const [localAssets, setLocalAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("all");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("RISK_DESC");
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [expandedSnippets, setExpandedSnippets] = useState({});

  const isLiveEffective =
    contextIsLive ||
    (typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("auth") === "success" ||
        window.localStorage.getItem("ghostguard_auth") === "true" ||
        window.localStorage.getItem("ghostguard_mode") === "LIVE"));

  // Fetch real discovered assets if in live mode and context is empty
  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      if (contextAssets && contextAssets.length > 0) {
        setLocalAssets(contextAssets);
        return;
      }

      setLoading(true);
      try {
        const accRes = await auditApi.getAccounts();
        if (active && accRes?.assets && accRes.assets.length > 0) {
          setLocalAssets(accRes.assets);
        } else {
          // If store is empty, try scanning
          const scanRes = await auditApi.scan();
          if (active && scanRes?.assets && scanRes.assets.length > 0) {
            setLocalAssets(scanRes.assets);
          }
        }
      } catch (err) {
        console.warn("Failed fetching live accounts in directory:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (isLiveEffective) {
      loadAccounts();
    } else {
      setLocalAssets(DEMO_FALLBACK_ACCOUNTS);
    }

    return () => {
      active = false;
    };
  }, [isLiveEffective, contextAssets]);

  // Keep local assets synced with context assets when updated
  useEffect(() => {
    if (contextAssets && contextAssets.length > 0) {
      setLocalAssets(contextAssets);
    }
  }, [contextAssets]);

  // Base list of accounts (real or demo fallback)
  const allAccounts = useMemo(() => {
    if (localAssets && localAssets.length > 0) {
      return localAssets;
    }
    if (contextAssets && contextAssets.length > 0) {
      return contextAssets;
    }
    return isLiveEffective ? [] : DEMO_FALLBACK_ACCOUNTS;
  }, [localAssets, contextAssets, isLiveEffective]);

  // Handle Action Trigger with Optimistic Update
  const handleAccountAction = useCallback(
    async (domain, newAction) => {
      if (!domain || !newAction) return;

      setActionInProgress((prev) => ({ ...prev, [domain]: true }));
      const prevAccounts = [...allAccounts];

      // Optimistic update
      if (newAction === "REMOVE_RECORD") {
        setLocalAssets((prev) =>
          prev.filter((acc) => acc.domain !== domain && acc.serviceName !== domain)
        );
      } else {
        setLocalAssets((prev) =>
          prev.map((acc) =>
            acc.domain === domain || acc.serviceName === domain
              ? { ...acc, status: newAction, rawStatus: newAction }
              : acc
          )
        );
      }

      // External helper tab opening for remediation workflows
      if (newAction === "SECURE") {
        const targetUrl = domain.startsWith("http") ? domain : `https://${domain}`;
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else if (newAction === "REVOKE") {
        window.open("https://myaccount.google.com/connections", "_blank", "noopener,noreferrer");
      }

      try {
        if (updateAccountStatus) {
          await updateAccountStatus(domain, newAction);
        } else {
          await auditApi.updateAction({ domain, action: newAction });
        }

        setToastMessage({
          type: "success",
          text: `"${domain}" marked as ${newAction.replace(/_/g, " ")}.`,
        });
        setTimeout(() => setToastMessage(null), 3500);
      } catch (err) {
        // Rollback on failure
        setLocalAssets(prevAccounts);
        setToastMessage({
          type: "error",
          text: `Failed updating "${domain}": ${err.message}`,
        });
        setTimeout(() => setToastMessage(null), 4500);
      } finally {
        setActionInProgress((prev) => ({ ...prev, [domain]: false }));
      }
    },
    [allAccounts, updateAccountStatus]
  );

  // Filter and Sort Accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let result = [...allAccounts];

    // 1. Live text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          (a.serviceName && a.serviceName.toLowerCase().includes(q)) ||
          (a.domain && a.domain.toLowerCase().includes(q)) ||
          (a.category && a.category.toLowerCase().includes(q)) ||
          (a.snippet && a.snippet.toLowerCase().includes(q)) ||
          (a.firstDiscoveredEmail && a.firstDiscoveredEmail.toLowerCase().includes(q))
      );
    }

    // 2. Risk filter
    if (riskFilter !== "ALL") {
      result = result.filter((a) => {
        const risk = (a.riskLevel || "").toUpperCase();
        if (riskFilter === "HIGH") return risk === "HIGH";
        if (riskFilter === "MEDIUM") return risk === "MEDIUM";
        if (riskFilter === "LOW") return risk === "LOW";
        return true;
      });
    }

    // 3. Category Filter
    if (selectedCategoryKey !== "all") {
      result = result.filter((a) => {
        const meta = getCategoryMeta(a.category);
        return meta.key === selectedCategoryKey;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === "RISK_DESC") {
        const scoreA = a.ghostScore ?? (a.riskLevel === "High" ? 80 : a.riskLevel === "Medium" ? 50 : 20);
        const scoreB = b.ghostScore ?? (b.riskLevel === "High" ? 80 : b.riskLevel === "Medium" ? 50 : 20);
        return scoreB - scoreA;
      }
      if (sortBy === "RISK_ASC") {
        const scoreA = a.ghostScore ?? (a.riskLevel === "High" ? 80 : a.riskLevel === "Medium" ? 50 : 20);
        const scoreB = b.ghostScore ?? (b.riskLevel === "High" ? 80 : b.riskLevel === "Medium" ? 50 : 20);
        return scoreA - scoreB;
      }
      if (sortBy === "NAME_ASC") {
        const nameA = (a.serviceName || a.domain || "").toLowerCase();
        const nameB = (b.serviceName || b.domain || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "NAME_DESC") {
        const nameA = (a.serviceName || a.domain || "").toLowerCase();
        const nameB = (b.serviceName || b.domain || "").toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === "DATE_DESC") {
        const dateA = a.detectedDate ? new Date(a.detectedDate).getTime() : 0;
        const dateB = b.detectedDate ? new Date(b.detectedDate).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "DATE_ASC") {
        const dateA = a.detectedDate ? new Date(a.detectedDate).getTime() : 0;
        const dateB = b.detectedDate ? new Date(b.detectedDate).getTime() : 0;
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [allAccounts, searchQuery, riskFilter, selectedCategoryKey, sortBy]);

  // Group accounts by category meta
  const groupedCategories = useMemo(() => {
    const groups = {};

    filteredAndSortedAccounts.forEach((account) => {
      const meta = getCategoryMeta(account.category);
      if (!groups[meta.key]) {
        groups[meta.key] = {
          meta,
          accounts: [],
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
        };
      }
      groups[meta.key].accounts.push(account);

      const r = (account.riskLevel || "").toUpperCase();
      if (r === "HIGH") groups[meta.key].highRiskCount++;
      else if (r === "MEDIUM") groups[meta.key].mediumRiskCount++;
      else groups[meta.key].lowRiskCount++;
    });

    return Object.values(groups);
  }, [filteredAndSortedAccounts]);

  // Category counts for top filter pills (computed from allAccounts, respecting search/risk if needed)
  const categoryPillCounts = useMemo(() => {
    const counts = { all: allAccounts.length };
    allAccounts.forEach((acc) => {
      const meta = getCategoryMeta(acc.category);
      counts[meta.key] = (counts[meta.key] || 0) + 1;
    });
    return counts;
  }, [allAccounts]);

  // Overall risk breakdown
  const overallRiskCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    allAccounts.forEach((acc) => {
      const r = (acc.riskLevel || "").toUpperCase();
      if (r === "HIGH") high++;
      else if (r === "MEDIUM") medium++;
      else low++;
    });
    return { high, medium, low, total: allAccounts.length };
  }, [allAccounts]);

  // Accordion Expand/Collapse All
  const areAllExpanded = useMemo(() => {
    if (groupedCategories.length === 0) return true;
    return groupedCategories.every((g) => !collapsedCategories[g.meta.key]);
  }, [groupedCategories, collapsedCategories]);

  const toggleExpandCollapseAll = () => {
    if (areAllExpanded) {
      const newCollapsed = {};
      groupedCategories.forEach((g) => {
        newCollapsed[g.meta.key] = true;
      });
      setCollapsedCategories(newCollapsed);
    } else {
      setCollapsedCategories({});
    }
  };

  const toggleCategoryCollapse = (key) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSnippetExpand = (id) => {
    setExpandedSnippets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategoryKey("all");
    setRiskFilter("ALL");
    setSortBy("RISK_DESC");
  };

  return (
    <DashboardShell
      title="Identity Directory / Categorized Footprint"
      description="Structured catalog of your digital footprint across identified services."
    >
      {!isLiveEffective && <DemoBanner />}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 100,
            padding: "12px 18px",
            borderRadius: "10px",
            background: toastMessage.type === "success" ? "#064e3b" : "#881337",
            border: `1px solid ${toastMessage.type === "success" ? "#10b981" : "#f43f5e"}`,
            color: "#f8fafc",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            animation: "tooltip-pop 0.2s ease-out",
          }}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} color="#34d399" />
          ) : (
            <AlertTriangle size={16} color="#fb7185" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: "transparent",
              border: 0,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px",
              marginLeft: "6px",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Sub-Header & Live Metric Readout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", letterSpacing: "-0.03em" }}>
              Categorized Footprint Directory
            </h2>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                background: isLiveEffective ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                color: isLiveEffective ? "#10b981" : "var(--muted)",
                border: `1px solid ${isLiveEffective ? "rgba(16, 185, 129, 0.35)" : "rgba(148, 163, 184, 0.25)"}`,
              }}
            >
              {isLiveEffective ? "● LIVE AUDIT ACTIVE · LOCALHOST:5000" : "DEMO CATALOG"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
            Audited account records organized by operational scope, perimeter exposure, and risk priority.
          </p>
        </div>

        {/* Global Directory Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={scanInbox}
            disabled={isScanning || loading}
            className="button button-primary button-small"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={13} className={isScanning || loading ? "animate-spin" : ""} />
            {isScanning ? "Auditing Gmail..." : "Scan Gmail"}
          </button>

          <Link
            href="/dashboard/accounts"
            className="button button-ghost button-small"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Layers size={13} /> All Accounts
          </Link>
        </div>
      </div>

      {/* Directory Control Strip: Search, Filters, Sort, Expand */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Row 1: Search & Dropdowns */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: "relative",
              flex: "1 1 280px",
              maxWidth: "440px",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--faint)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by service name, domain, or snippet..."
              style={{
                width: "100%",
                padding: "9px 34px 9px 36px",
                fontSize: "13px",
                borderRadius: "8px",
                background: "var(--surface-soft)",
                border: "1px solid var(--line)",
                color: "var(--foreground)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Controls: Risk Filter, Sort By, Expand Toggle */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            {/* Risk Filter Select */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={14} color="var(--muted)" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  background: "var(--surface-soft)",
                  border: "1px solid var(--line)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk Only</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            {/* Sort Select */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ArrowUpDown size={14} color="var(--muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  background: "var(--surface-soft)",
                  border: "1px solid var(--line)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="RISK_DESC">Risk (High to Low)</option>
                <option value="RISK_ASC">Risk (Low to High)</option>
                <option value="NAME_ASC">Alphabetical (A-Z)</option>
                <option value="NAME_DESC">Alphabetical (Z-A)</option>
                <option value="DATE_DESC">Date (Newest First)</option>
                <option value="DATE_ASC">Date (Oldest First)</option>
              </select>
            </div>

            {/* Expand / Collapse All Toggle Button */}
            <button
              type="button"
              onClick={toggleExpandCollapseAll}
              className="button button-ghost button-small"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "8px 12px",
              }}
            >
              <ChevronsUpDown size={14} />
              {areAllExpanded ? "Collapse All" : "Expand All"}
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            paddingTop: "6px",
            borderTop: "1px solid rgba(148, 163, 184, 0.08)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Categories:
          </span>

          {/* "All" Category Pill */}
          <button
            type="button"
            onClick={() => setSelectedCategoryKey("all")}
            style={{
              padding: "5px 11px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              border: `1px solid ${selectedCategoryKey === "all" ? "#10b981" : "var(--line)"}`,
              background: selectedCategoryKey === "all" ? "rgba(16, 185, 129, 0.15)" : "var(--surface-soft)",
              color: selectedCategoryKey === "all" ? "#10b981" : "var(--foreground)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>All</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 5px",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.3)",
                color: "var(--muted)",
              }}
            >
              {categoryPillCounts.all || 0}
            </span>
          </button>

          {/* Dynamic / Standard Category Pills */}
          {[
            { key: "developer", label: "Developer", icon: Code2, color: "#22d3ee" },
            { key: "productivity", label: "Productivity", icon: Briefcase, color: "#8b5cf6" },
            { key: "finance", label: "Finance", icon: CreditCard, color: "#f59e0b" },
            { key: "social", label: "Social & Media", icon: Share2, color: "#3b82f6" },
            { key: "storage", label: "Storage", icon: Cloud, color: "#06b6d4" },
            { key: "creative", label: "Creative", icon: Palette, color: "#ec4899" },
            { key: "general", label: "General Service", icon: Globe, color: "#10b981" },
          ].map(({ key, label, icon: Icon, color }) => {
            const count = categoryPillCounts[key] || 0;
            if (count === 0 && selectedCategoryKey !== key) return null;
            const isSelected = selectedCategoryKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategoryKey(key)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: `1px solid ${isSelected ? color : "var(--line)"}`,
                  background: isSelected ? `${color}25` : "var(--surface-soft)",
                  color: isSelected ? "#f8fafc" : "var(--muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Icon size={12} color={color} />
                <span>{label}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "10px",
                    background: "rgba(0,0,0,0.3)",
                    color: isSelected ? "#f8fafc" : "var(--muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Filter Metrics Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--muted)",
            paddingTop: "4px",
          }}
        >
          <span>
            Showing <strong style={{ color: "var(--foreground)" }}>{filteredAndSortedAccounts.length}</strong> of{" "}
            {allAccounts.length} services across {groupedCategories.length} categories
          </span>

          {(searchQuery || riskFilter !== "ALL" || selectedCategoryKey !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: "transparent",
                border: 0,
                color: "#22d3ee",
                cursor: "pointer",
                padding: 0,
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Empty State: If No Accounts Match Search or Filters */}
      {groupedCategories.length === 0 && (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: "16px",
            color: "var(--muted)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(34, 211, 238, 0.1)",
              color: "#22d3ee",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
            }}
          >
            <Search size={22} />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "var(--foreground)" }}>
            No accounts match your filters
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "13px", maxWidth: "400px", marginInline: "auto" }}>
            {searchQuery
              ? `No services found matching "${searchQuery}". Try searching by domain or clearing active filters.`
              : "No services found in this category or risk level."}
          </p>
          <button type="button" onClick={resetFilters} className="button button-ghost button-small">
            Reset All Filters
          </button>
        </div>
      )}

      {/* Grouped Category Accordion Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {groupedCategories.map(({ meta, accounts, highRiskCount, mediumRiskCount, lowRiskCount }) => {
          const isCollapsed = Boolean(collapsedCategories[meta.key]);
          const Icon = meta.icon;

          return (
            <section
              key={meta.key}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                transition: "border-color 0.2s ease",
              }}
            >
              {/* Category Accordion Header */}
              <div
                onClick={() => toggleCategoryCollapse(meta.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  cursor: "pointer",
                  userSelect: "none",
                  background: isCollapsed
                    ? "var(--surface)"
                    : `radial-gradient(circle at 10% 50%, ${meta.color}0a, transparent 40%), var(--surface-soft)`,
                  borderBottom: isCollapsed ? "none" : "1px solid var(--line)",
                  transition: "background 0.2s ease",
                }}
              >
                {/* Left: Category Icon + Title + Total Count */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: meta.badgeColor,
                      border: `1px solid ${meta.borderColor}`,
                      display: "grid",
                      placeItems: "center",
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "var(--foreground)",
                        }}
                      >
                        {meta.label}
                      </h3>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "10px",
                          background: "var(--surface)",
                          color: "var(--muted)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {accounts.length} {accounts.length === 1 ? "service" : "services"}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                      {meta.description}
                    </span>
                  </div>
                </div>

                {/* Right: Risk Tally Pills & Chevron Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {highRiskCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "rgba(244, 63, 94, 0.14)",
                        color: "#f43f5e",
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#f43f5e",
                          boxShadow: "0 0 6px #f43f5e",
                        }}
                      />
                      {highRiskCount} High Risk
                    </span>
                  )}

                  {mediumRiskCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "rgba(245, 158, 11, 0.14)",
                        color: "#f59e0b",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      {mediumRiskCount} Medium
                    </span>
                  )}

                  {lowRiskCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "rgba(16, 185, 129, 0.14)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {lowRiskCount} Secured
                    </span>
                  )}

                  {/* Chevron Icon */}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--muted)",
                      marginLeft: "4px",
                    }}
                  >
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </div>
              </div>

              {/* Category Service Cards Table (When Expanded) */}
              {!isCollapsed && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {accounts.map((account, idx) => {
                    const domain = account.domain || account.name || "";
                    const serviceName = account.serviceName || account.name || domain;
                    const risk = (account.riskLevel || "Low").toUpperCase();
                    const score = account.ghostScore ?? (risk === "HIGH" ? 82 : risk === "MEDIUM" ? 54 : 18);
                    const status = (account.status || "UNREVIEWED").toUpperCase();
                    const isProcessing = Boolean(actionInProgress[domain]);
                    const isSnippetOpen = Boolean(expandedSnippets[account.id || domain || idx]);

                    const isDormant = account.isDormant || score >= 70;

                    // Formatted detected date
                    let dateDisplay = "Discovered recently";
                    if (account.detectedDate) {
                      try {
                        const d = new Date(account.detectedDate);
                        dateDisplay = d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } catch {
                        dateDisplay = String(account.detectedDate).slice(0, 10);
                      }
                    }

                    return (
                      <div
                        key={account.id || domain || idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          padding: "16px 20px",
                          borderBottom:
                            idx < accounts.length - 1 ? "1px solid rgba(148, 163, 184, 0.08)" : "none",
                          background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Main Service Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "14px",
                          }}
                        >
                          {/* Column 1: Service Brand, Name, Domain Link */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flex: "1 1 240px",
                              minWidth: "220px",
                            }}
                          >
                            <ServiceAvatar
                              domain={domain}
                              serviceName={serviceName}
                              categoryColor={meta.color}
                            />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ fontSize: "14px", color: "var(--foreground)" }}>
                                  {serviceName}
                                </strong>
                                {isDormant && (
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 800,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: "rgba(244, 63, 94, 0.15)",
                                      color: "#fb7185",
                                      border: "1px solid rgba(244, 63, 94, 0.25)",
                                    }}
                                  >
                                    GHOST
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <a
                                  href={`https://${domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--muted)",
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "#22d3ee")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                                >
                                  {domain}
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Detection Context (Date & Email Snippet) */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              flex: "1 1 220px",
                              minWidth: "200px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted)" }}>
                              <Calendar size={12} color="var(--faint)" />
                              <span>Detected: <strong style={{ color: "var(--foreground)" }}>{dateDisplay}</strong></span>
                            </div>

                            {account.snippet && (
                              <div
                                onClick={() => toggleSnippetExpand(account.id || domain || idx)}
                                title="Click to view email snippet"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "11px",
                                  color: "var(--faint)",
                                  cursor: "pointer",
                                  whiteSpace: isSnippetOpen ? "normal" : "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "320px",
                                }}
                              >
                                <Mail size={11} color="var(--faint)" />
                                <span style={{ fontStyle: "italic" }}>
                                  &ldquo;{account.snippet}&rdquo;
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Column 3: Risk Score Badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                background:
                                  risk === "HIGH"
                                    ? "rgba(244, 63, 94, 0.12)"
                                    : risk === "MEDIUM"
                                    ? "rgba(245, 158, 11, 0.12)"
                                    : "rgba(16, 185, 129, 0.12)",
                                border: `1px solid ${
                                  risk === "HIGH"
                                    ? "rgba(244, 63, 94, 0.3)"
                                    : risk === "MEDIUM"
                                    ? "rgba(245, 158, 11, 0.3)"
                                    : "rgba(16, 185, 129, 0.3)"
                                }`,
                              }}
                            >
                              <span
                                style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  background:
                                    risk === "HIGH"
                                      ? "#f43f5e"
                                      : risk === "MEDIUM"
                                      ? "#f59e0b"
                                      : "#10b981",
                                  boxShadow: `0 0 6px ${
                                    risk === "HIGH"
                                      ? "#f43f5e"
                                      : risk === "MEDIUM"
                                      ? "#f59e0b"
                                      : "#10b981"
                                  }`,
                                }}
                              />
                              <strong
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color:
                                    risk === "HIGH"
                                      ? "#fb7185"
                                      : risk === "MEDIUM"
                                      ? "#fbbf24"
                                      : "#34d399",
                                }}
                              >
                                {risk} RISK · {score}
                              </strong>
                            </div>
                          </div>

                          {/* Column 4: Current Ledger Status Badge */}
                          <div style={{ minWidth: "110px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "10px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  status.includes("SECURE")
                                    ? "rgba(16, 185, 129, 0.14)"
                                    : status.includes("KEPT")
                                    ? "rgba(139, 92, 246, 0.14)"
                                    : status.includes("DELET") || status.includes("REVOK")
                                    ? "rgba(244, 63, 94, 0.14)"
                                    : "rgba(245, 158, 11, 0.14)",
                                color:
                                  status.includes("SECURE")
                                    ? "#10b981"
                                    : status.includes("KEPT")
                                    ? "#a78bfa"
                                    : status.includes("DELET") || status.includes("REVOK")
                                    ? "#f43f5e"
                                    : "#f59e0b",
                                border: `1px solid ${
                                  status.includes("SECURE")
                                    ? "rgba(16, 185, 129, 0.3)"
                                    : status.includes("KEPT")
                                    ? "rgba(139, 92, 246, 0.3)"
                                    : status.includes("DELET") || status.includes("REVOK")
                                    ? "rgba(244, 63, 94, 0.3)"
                                    : "rgba(245, 158, 11, 0.3)"
                                }`,
                              }}
                            >
                              {status.includes("SECURE") && <CheckCircle2 size={11} />}
                              {status.includes("DELET") && <Trash2 size={11} />}
                              {status.replace(/_/g, " ")}
                            </span>
                          </div>

                          {/* Column 5: Inline Quick Action Menu */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexShrink: 0,
                            }}
                          >
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccountAction(domain, "SECURE")}
                              title="Mark as Secured (2FA verified / active)"
                              style={{
                                padding: "5px 9px",
                                fontSize: "11px",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: "1px solid rgba(16, 185, 129, 0.35)",
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#10b981",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              Secure
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccountAction(domain, "KEEP")}
                              title="Keep account active in local ledger"
                              style={{
                                padding: "5px 9px",
                                fontSize: "11px",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: "1px solid rgba(139, 92, 246, 0.35)",
                                background: "rgba(139, 92, 246, 0.12)",
                                color: "#a78bfa",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              Keep
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccountAction(domain, "MARKED_FOR_DELETION")}
                              title="Flag for Deletion (Orphaned ghost account)"
                              style={{
                                padding: "5px 9px",
                                fontSize: "11px",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: "1px solid rgba(244, 63, 94, 0.35)",
                                background: "rgba(244, 63, 94, 0.12)",
                                color: "#fb7185",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              Delete
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccountAction(domain, "REVOKE")}
                              title="Revoke OAuth or third-party token access"
                              style={{
                                padding: "5px 9px",
                                fontSize: "11px",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: "1px solid rgba(245, 158, 11, 0.35)",
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "#f59e0b",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              Revoke
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccountAction(domain, "REMOVE_RECORD")}
                              title="Permanently remove record from ledger"
                              style={{
                                padding: "5px 7px",
                                fontSize: "11px",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: "1px solid rgba(148, 163, 184, 0.25)",
                                background: "transparent",
                                color: "var(--muted)",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Remediation Tip */}
                        {account.remediationTip && (
                          <div
                            style={{
                              marginTop: "4px",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              background: "rgba(15, 23, 42, 0.6)",
                              border: "1px solid rgba(148, 163, 184, 0.12)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "11px",
                              color: "var(--muted)",
                            }}
                          >
                            <ShieldCheck size={13} color="#10b981" />
                            <span>
                              <strong style={{ color: "#34d399", marginRight: "4px" }}>
                                Remediation:
                              </strong>
                              {account.remediationTip}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </DashboardShell>
  );
}

