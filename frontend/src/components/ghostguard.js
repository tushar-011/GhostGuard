"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Globe2,
  Grid2X2,
  Layers,
  Layers3,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Milestone,
  Clock,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Users,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, useRef, createContext, useContext } from "react";
import DottedIdentityGlobe from "@/components/DottedIdentityGlobe";
import CategorizedFootprintDirectory from "@/components/CategorizedFootprintDirectory";
import GhostAICopilot from "@/components/GhostAICopilot";
import DeadManAuthModal from "@/components/DeadManAuthModal";
import api, { authApi, auditApi, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

const handleGoogleLogin = () => {
  window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google`;
};

const accounts = [
  { id: 1, name: "Google Workspace", category: "Productivity", email: "alex@demo.co", status: "Secure", activity: "2 days ago", color: "cyan", icon: Globe2 },
  { id: 2, name: "Notion", category: "Productivity", email: "alex@demo.co", status: "Review", activity: "1 week ago", color: "violet", icon: FileText },
  { id: 3, name: "Figma", category: "Creative", email: "alex@demo.co", status: "Secure", activity: "3 days ago", color: "pink", icon: Layers3 },
  { id: 4, name: "GitHub", category: "Development", email: "alex@demo.co", status: "Review", activity: "Yesterday", color: "slate", icon: GitBranch },
  { id: 5, name: "Slack", category: "Productivity", email: "alex@demo.co", status: "Secure", activity: "Today", color: "orange", icon: MessageIcon },
  { id: 6, name: "Dropbox", category: "Storage", email: "alex@demo.co", status: "Preserved", activity: "2 weeks ago", color: "blue", icon: Cloud },
];

function MessageIcon(props) {
  return <span className="text-sm font-bold" {...props}>#</span>;
}

function mapBackendAssetToAccount(asset, index) {
  const cat = asset.category || "General Service";
  let color = "cyan";
  let icon = Globe2;

  const lowerCat = cat.toLowerCase();
  if (lowerCat.includes("develop") || lowerCat.includes("cloud")) {
    color = "slate";
    icon = GitBranch;
  } else if (lowerCat.includes("financ") || lowerCat.includes("crypto") || lowerCat.includes("pay")) {
    color = "pink";
    icon = Shield;
  } else if (lowerCat.includes("creative") || lowerCat.includes("design")) {
    color = "pink";
    icon = Layers3;
  } else if (lowerCat.includes("productiv") || lowerCat.includes("collab")) {
    color = "violet";
    icon = FileText;
  } else if (lowerCat.includes("social") || lowerCat.includes("messag")) {
    color = "orange";
    icon = MessageIcon;
  } else if (lowerCat.includes("storage")) {
    color = "blue";
    icon = Cloud;
  }

  let activity = "Discovered";
  if (asset.ageInMonths !== undefined && asset.ageInMonths !== null) {
    activity = `${asset.ageInMonths} mo${asset.ageInMonths === 1 ? '' : 's'} ago`;
  } else if (asset.detectedDate) {
    try {
      activity = new Date(asset.detectedDate).toLocaleDateString();
    } catch {
      activity = "Discovered";
    }
  }

  return {
    id: asset.domain || `acc-${index}`,
    domain: asset.domain,
    name: asset.serviceName || asset.domain,
    category: cat,
    email: asset.senderEmail || "Gmail discovery",
    status: asset.status || (asset.isDormant ? "Review" : "Secure"),
    rawStatus: asset.status || "UNREVIEWED",
    activity,
    color,
    icon,
    riskLevel: asset.riskLevel || "Low",
    ghostScore: typeof asset.ghostScore === "number" ? asset.ghostScore : 0,
    isDormant: Boolean(asset.isDormant),
    remediationTip: asset.remediationTip || "Audit account permissions and revoke unused sessions.",
    snippet: asset.snippet || "",
    detectedDate: asset.detectedDate || "",
    isLive: true
  };
}

const navItems = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const dashboardNav = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/accounts", label: "All accounts", icon: Grid2X2 },
  { href: "/dashboard/identity-map", label: "Identity directory", icon: Network },
  { href: "/dashboard/timeline", label: "Timeline", icon: Milestone },
  { href: "/dashboard/breachwatch", label: "BreachWatch", icon: ShieldAlert },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("ghostguard-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("ghostguard-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme((value) => value === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = createContext({ theme: "dark", setTheme: () => {}, toggleTheme: () => {} });
export function useTheme() {
  return useContext(ThemeContext);
}

export const GhostGuardContext = createContext({
  isLive: false,
  userEmail: "",
  userName: "",
  sessionExpired: false,
  loading: false,
  isScanning: false,
  scanMessage: "",
  stats: null,
  assets: [],
  graph: null,
  deadManArmed: false,
  deadManArmedAt: null,
  refreshData: async () => {},
  scanInbox: async () => {},
  updateAccountStatus: async () => {},
  removeAccount: async () => {},
  triggerDeadManSwitch: async () => {},
  disarmDeadManSwitch: async () => {},
  logout: async () => {},
});

export function useGhostGuard() {
  return useContext(GhostGuardContext);
}

export function GhostGuardProvider({ children }) {
  const router = useRouter();
  const [isLive, setIsLive] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("auth") === "success" ||
      window.localStorage.getItem("ghostguard_auth") === "true" ||
      window.localStorage.getItem("ghostguard_mode") === "LIVE"
    );
  });
  const [userEmail, setUserEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("email") ||
      window.localStorage.getItem("ghostguard_email") ||
      ""
    );
  });
  const [userName, setUserName] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [graph, setGraph] = useState(null);
  const [deadManArmed, setDeadManArmed] = useState(false);
  const [deadManArmedAt, setDeadManArmedAt] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkAuthAndLoad() {
      let live = false;
      let email = "";

      if (typeof window !== "undefined") {
        if (auth && typeof auth.authStateReady === "function") {
          try {
            await auth.authStateReady();
          } catch {}
        }
        if (auth && auth.currentUser) {
          live = true;
          email = auth.currentUser.email || email;
          if (auth.currentUser.displayName) {
            setUserName(auth.currentUser.displayName);
          }
          try {
            const token = await auth.currentUser.getIdToken();
            if (token) {
              window.localStorage.setItem("ghostguard_id_token", token);
            }
          } catch {}
          window.localStorage.setItem("ghostguard_auth", "true");
          window.localStorage.setItem("ghostguard_mode", "LIVE");
          if (email) window.localStorage.setItem("ghostguard_email", email);
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get("auth") === "success") {
          live = true;
          if (params.get("email")) {
            email = params.get("email");
          }
          window.localStorage.setItem("ghostguard_auth", "true");
          window.localStorage.setItem("ghostguard_mode", "LIVE");
          if (email) window.localStorage.setItem("ghostguard_email", email);
          window.localStorage.setItem(
            "ghostguard-demo-session",
            JSON.stringify({
              authenticated: true,
              isLive: true,
              email: email || "google-authenticated-user",
              createdAt: Date.now()
            })
          );
        } else if (
          window.localStorage.getItem("ghostguard_auth") === "true" ||
          window.localStorage.getItem("ghostguard_mode") === "LIVE"
        ) {
          live = true;
          email = window.localStorage.getItem("ghostguard_email") || email;
        }
      }

      // Check with backend /auth/status
      try {
        const statusRes = await authApi.checkStatus();
        if (statusRes && statusRes.authenticated) {
          live = true;
          if (statusRes.email) email = statusRes.email;
          if (statusRes.user?.name) setUserName(statusRes.user.name);
          setSessionExpired(false);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("ghostguard_auth", "true");
            window.localStorage.setItem("ghostguard_mode", "LIVE");
            if (email) window.localStorage.setItem("ghostguard_email", email);
          }
        }
      } catch (err) {
        if (err.status === 401) {
          setSessionExpired(true);
        }
      }

      if (active) {
        setIsLive(live);
        if (email) setUserEmail(email);
        if (live) {
          loadLiveData(email);
        }
      }
    }

    checkAuthAndLoad();
    return () => { active = false; };
  }, []);

  async function loadLiveData(email) {
    setLoading(true);
    setScanMessage("Scanning Gmail for orphaned assets...");

    try {
      // 1. Fetch scan (or fallback to stored accounts)
      let currentAssets = [];
      try {
        const scanRes = await auditApi.scan();
        if (scanRes && scanRes.assets) {
          currentAssets = scanRes.assets;
          setAssets(scanRes.assets);
          setSessionExpired(false);
        }
      } catch (scanErr) {
        if (scanErr.status === 401) {
          setSessionExpired(true);
          try {
            const accountsRes = await auditApi.getAccounts();
            if (accountsRes && accountsRes.assets && accountsRes.assets.length > 0) {
              currentAssets = accountsRes.assets;
              setAssets(accountsRes.assets);
            }
          } catch {}
        }
      }

      // 2. Fetch stats
      try {
        const statsRes = await auditApi.getStats();
        const s = statsRes?.stats || statsRes;
        if (s) {
          setStats(s);
          if (s.deadManArmed !== undefined) {
            setDeadManArmed(Boolean(s.deadManArmed));
          }
          if (s.deadManArmedAt !== undefined) {
            setDeadManArmedAt(s.deadManArmedAt);
          }
          const total = s.totalDiscovered ?? currentAssets.length;
          setScanMessage(`Discovered ${total} registered accounts.`);
        } else if (currentAssets.length > 0) {
          setScanMessage(`Discovered ${currentAssets.length} registered accounts.`);
        }
      } catch (statsErr) {
        if (statsErr.status === 401) {
          setSessionExpired(true);
        }
      }

      // 3. Fetch graph
      try {
        const graphRes = await auditApi.getGraph({ email: email || userEmail });
        if (graphRes && graphRes.graph) {
          setGraph(graphRes.graph);
        }
      } catch {}
    } catch (e) {
      console.warn("Live data load issue:", e);
    } finally {
      setLoading(false);
    }
  }

  async function scanInbox() {
    setIsScanning(true);
    setScanMessage("Scanning Gmail for orphaned assets...");
    try {
      const scanRes = await auditApi.scan();
      if (scanRes && scanRes.assets) {
        setAssets(scanRes.assets);
        setSessionExpired(false);

        const statsRes = await auditApi.getStats();
        const s = statsRes?.stats || statsRes;
        if (s) {
          setStats(s);
          if (s.deadManArmed !== undefined) {
            setDeadManArmed(Boolean(s.deadManArmed));
          }
          if (s.deadManArmedAt !== undefined) {
            setDeadManArmedAt(s.deadManArmedAt);
          }
        }

        const totalAccounts = s?.totalDiscovered ?? scanRes.assets.length;
        setScanMessage(`Scan complete: Discovered ${totalAccounts} registered accounts.`);

        const graphRes = await auditApi.getGraph({ email: userEmail });
        if (graphRes && graphRes.graph) setGraph(graphRes.graph);
      }
    } catch (err) {
      if (err.status === 401) {
        setSessionExpired(true);
        setScanMessage("Backend session expired. Reconnect Gmail.");
      } else {
        setScanMessage(`Scan error: ${err.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function updateAccountStatus(domain, action, notes) {
    try {
      const res = await auditApi.updateAction({ domain, action, notes });
      setAssets((prev) =>
        prev.map((acc) =>
          acc.domain === domain || acc.serviceName === domain
            ? { ...acc, status: action, rawStatus: action }
            : acc
        )
      );
      try {
        const statsRes = await auditApi.getStats();
        if (statsRes && statsRes.stats) setStats(statsRes.stats);
      } catch {}
      return res;
    } catch (err) {
      console.error("Failed updating account action:", err);
      throw err;
    }
  }

  async function removeAccount(domain) {
    try {
      const res = await auditApi.removeAsset(domain);
      setAssets((prev) =>
        prev.filter((acc) => acc.domain !== domain && acc.serviceName !== domain)
      );
      if (res && res.stats) {
        setStats(res.stats);
      } else {
        try {
          const statsRes = await auditApi.getStats();
          if (statsRes && statsRes.stats) setStats(statsRes.stats);
        } catch {}
      }
      return res;
    } catch (err) {
      console.error("Failed removing account:", err);
      throw err;
    }
  }

  async function triggerDeadManSwitch(params = { confirmation: 'PURGE' }) {
    try {
      const res = await auditApi.triggerDeadManSwitch(params);
      setDeadManArmed(true);
      setDeadManArmedAt(new Date().toISOString());
      setAssets((prev) =>
        prev.map((acc) => ({
          ...acc,
          previousStatus: acc.status || "UNREVIEWED",
          status: "MARKED_FOR_DELETION",
          rawStatus: "MARKED_FOR_DELETION",
        }))
      );
      try {
        const statsRes = await auditApi.getStats();
        const s = statsRes?.stats || statsRes;
        if (s) {
          setStats(s);
          if (s.deadManArmed !== undefined) setDeadManArmed(Boolean(s.deadManArmed));
        }
      } catch {}
      return res;
    } catch (err) {
      console.error("Failed triggering Dead Man's Switch:", err);
      throw err;
    }
  }

  async function disarmDeadManSwitch() {
    try {
      const res = await auditApi.disarmDeadManSwitch();
      setDeadManArmed(false);
      setDeadManArmedAt(null);
      try {
        const accountsRes = await auditApi.getAccounts();
        if (accountsRes && accountsRes.assets) {
          setAssets(accountsRes.assets);
        }
      } catch {}
      try {
        const statsRes = await auditApi.getStats();
        const s = statsRes?.stats || statsRes;
        if (s) {
          setStats(s);
          if (s.deadManArmed !== undefined) setDeadManArmed(Boolean(s.deadManArmed));
        }
      } catch {}
      return res;
    } catch (err) {
      console.error("Failed disarming Dead Man's Switch:", err);
      throw err;
    }
  }

  async function logout() {
    try {
      if (auth && typeof auth.signOut === "function") {
        await auth.signOut();
      }
    } catch {}
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ghostguard-demo-session");
      window.localStorage.removeItem("ghostguard_auth");
      window.localStorage.removeItem("ghostguard_mode");
      window.localStorage.removeItem("ghostguard_email");
      window.localStorage.removeItem("ghostguard_id_token");
    }
    setIsLive(false);
    setUserEmail("");
    setUserName("");
    setStats(null);
    setAssets([]);
    setGraph(null);
    router.replace("/login");
  }

  return (
    <GhostGuardContext.Provider
      value={{
        isLive,
        userEmail,
        userName,
        sessionExpired,
        loading,
        isScanning,
        scanMessage,
        stats,
        assets,
        graph,
        refreshData: () => loadLiveData(userEmail),
        scanInbox,
        updateAccountStatus,
        removeAccount,
        deadManArmed,
        deadManArmedAt,
        triggerDeadManSwitch,
        disarmDeadManSwitch,
        logout,
      }}
    >
      {children}
    </GhostGuardContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Toggle theme">
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Logo({ compact = false }) {
  return (
    <Link href="/" className="logo" aria-label="GhostGuard home">
      <span className="logo-mark"><Shield size={18} strokeWidth={2.5} /></span>
      {!compact && <span>Ghost<span className="logo-accent">Guard</span></span>}
    </Link>
  );
}

export function GhostGuardLoader({ inline = false }) {
  return (
    <div className={inline ? "inline-loader" : "global-loader"} role="status" aria-live="polite">
      <span className="loader-shield"><Shield size={inline ? 14 : 25} /></span>
      {!inline && <span className="loader-copy">Securing your digital space...</span>}
      <span className="loader-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

export function PublicShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="site-shell">
      <header className={`public-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="container nav-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link className={pathname === "/" ? "active" : ""} href="/">Home</Link>
            {navItems.map((item) => <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>)}
            <Link className="nav-security" href="/#security"><ShieldCheck size={14} /> Security</Link>
          </nav>
          <div className="nav-actions">
            <ThemeToggle />
            <Link className="text-button desktop-only" href="/login">Log in</Link>
            <Link className="button button-small button-primary desktop-only" href="/signup">Get started <ArrowRight size={15} /></Link>
            <button className="icon-button mobile-only" onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && <motion.nav className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
            {navItems.map((item) => <Link href={item.href} onClick={() => setMenuOpen(false)} key={item.href}>{item.label}</Link>)}
            <Link href="/#security" onClick={() => setMenuOpen(false)}>Security</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link className="button button-primary" href="/signup" onClick={() => setMenuOpen(false)}>Get started <ArrowRight size={15} /></Link>
          </motion.nav>}
        </AnimatePresence>
      </header>
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <Reveal className="footer-reveal"><footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo /><p>A clearer view of your digital identity. Private by design, powerful by choice.</p><span className="eyebrow"><LockKeyhole size={13} /> Privacy-first by default</span></div>
        <div><h4>Product</h4><Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/dashboard">Dashboard</Link></div>
        <div><h4>Company</h4><Link href="/about">About GhostGuard</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></div>
        <div><h4>Legal</h4><Link href="/terms">Terms</Link><Link href="/privacy">Privacy policy</Link><a href="mailto:hello@ghostguard.app">hello@ghostguard.app</a></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 GhostGuard. Frontend concept — demo data only.</span><span className="footer-status"><span className="status-dot" /> Built for clarity</span></div>
    </footer></Reveal>
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className={className} initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, margin: "-70px" }} transition={{ duration: .55, delay }}>{children}</motion.div>;
}

export function HomePage() {
  return <PublicShell>
    <section className="hero section-grid">
      <div className="container hero-grid">
        <Reveal className="hero-copy"><span className="pill"><Sparkles size={14} /> Your identity, in focus</span><div className="hero-heading-wrap"><div className="hero-identity-orbit" aria-hidden="true"><span className="hero-orbit-shield" /><span className="hero-orbit-ring hero-orbit-ring-one" /><span className="hero-orbit-ring hero-orbit-ring-two" /><span className="hero-orbit-node hero-orbit-node-one" /><span className="hero-orbit-node hero-orbit-node-two" /><span className="hero-orbit-node hero-orbit-node-three" /></div><ShieldCheck className="hero-heading-mark" size={42} aria-hidden="true" /><h1>GhostGuard</h1></div><p>Discover, visualize, and manage your digital accounts from one secure place. GhostGuard helps you understand your online presence and take control of your digital footprint.</p><div className="hero-actions"><button type="button" onClick={handleGoogleLogin} className="button button-primary button-large" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>Connect Gmail <ArrowRight size={17} /></button><Link href="/features" className="button button-ghost button-large"><span className="play-icon">▶</span> Explore features</Link></div><div className="trust-row"><span><ShieldCheck size={15} /> Privacy-first</span><span><Zap size={15} /> Built for clarity</span><span><Users size={15} /> Human control</span></div></Reveal>
        <Reveal className="hero-visual" delay={.15}><IdentityOrb /></Reveal>
      </div>
      <div className="hero-glow" />
    </section>
    <section className="section section-muted"><div className="container"><SectionIntro eyebrow="The digital identity gap" title="Your online life is bigger than your inbox." copy="Every sign-up, workspace, and forgotten login becomes another piece of your digital footprint. GhostGuard brings those pieces into view — without taking control away from you." /><div className="problem-grid">{[["01", "Too many accounts", "Your digital identity spreads across dozens of services, each with its own settings and security posture.", Network], ["02", "Forgotten registrations", "Old sign-ups and unused services can quietly stay connected long after you stop using them.", CircleHelp], ["03", "Unclear security", "It is hard to know what needs attention when every platform shows a different view.", ShieldCheck]].map(([num, title, copy, Icon], index) => <Reveal className="problem-card" delay={index * .08} key={num}><span className="card-number">{num}</span><Icon size={24} className="card-icon" /><h3>{title}</h3><p>{copy}</p></Reveal>)}</div></div></section>
    <section className="section"><div className="container"><SectionIntro eyebrow="One clear command center" title="Everything you need to see the bigger picture." copy="GhostGuard gives your digital life a structure — so you can make informed decisions at your own pace." /><div className="feature-grid">{featureData.map((item, index) => <FeatureCard item={item} index={index} key={item.title} />)}</div></div></section>
    <section className="section section-dark homepage-section-four"><div className="container split-section"><div><SectionIntro eyebrow="A calmer way forward" title="From scattered accounts to a clear next step." copy="GhostGuard turns digital housekeeping into a simple, visual workflow. Add what you know, review what needs attention, and decide what happens next." align="left" /><Link className="button button-primary" href="/how-it-works">See how it works <ArrowRight size={16} /></Link></div><StepCard /></div></section>
    <section className="section"><div className="container"><SectionIntro eyebrow="A map of your digital life" title="See how everything connects." copy="Explore a visual overview of your accounts and the relationships between them. The example below uses demonstration data." /><div className="preview-panel"><IdentityPreview /></div></div></section>
    <section className="section section-muted"><div className="container"><div className="dashboard-preview-head"><SectionIntro eyebrow="Built for action" title="A dashboard that respects your attention." copy="See the important things first, then choose your next move. All numbers shown are demonstration data." /><Link href="/dashboard" className="button button-ghost">Explore demo dashboard <ArrowRight size={16} /></Link></div><DashboardPreview /></div></section>
    <section id="security" className="section"><div className="container security-section"><div className="security-art"><div className="security-ring ring-one" /><div className="security-ring ring-two" /><ShieldCheck size={56} /></div><div><SectionIntro eyebrow="Privacy is a product feature" title="Control without compromise." copy="GhostGuard is designed to explain what it can see, what it can do, and what remains yours to decide." align="left" /><div className="security-points"><span><Check size={16} /> Transparent permissions</span><span><Check size={16} /> Local actions stay local</span><span><Check size={16} /> No claims of complete discovery</span></div></div></div></section>
    <FaqSection />
    <section className="section final-cta"><div className="container cta-card"><div className="cta-orb" /><span className="pill">Your next step starts here</span><h2>Make your digital identity <span className="gradient-text">visible.</span></h2><p>Start with what you know. GhostGuard helps you build the bigger picture from there.</p><Link className="button button-primary button-large" href="/signup">Get started free <ArrowRight size={17} /></Link></div></section>
  </PublicShell>;
}

const featureData = [
  { title: "Account discovery", copy: "Bring known accounts into one thoughtful, reviewable inventory.", icon: Search, color: "cyan" },
  { title: "Centralized management", copy: "Keep context, status, and next steps together in one place.", icon: Layers3, color: "violet" },
  { title: "Identity mind map", copy: "See your accounts as a connected digital identity, not a list.", icon: Network, color: "pink" },
  { title: "Security overview", copy: "Surface accounts that may need your attention without alarmism.", icon: ShieldCheck, color: "green" },
  { title: "Manual additions", copy: "Add what you know, even when a provider connection is not right for you.", icon: Plus, color: "orange" },
  { title: "Privacy and control", copy: "Understand the difference between local records and external actions.", icon: LockKeyhole, color: "blue" },
];

function SectionIntro({ eyebrow, title, copy, align = "center" }) {
  return <Reveal className={`section-intro align-${align}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{copy}</p></Reveal>;
}

function FeatureCard({ item, index }) {
  const Icon = item.icon;
  return <Reveal delay={index * .05}><div className="feature-card"><span className={`feature-icon ${item.color}`}><Icon size={21} /></span><h3>{item.title}</h3><p>{item.copy}</p><ChevronRight size={16} className="feature-arrow" /></div></Reveal>;
}

function IdentityOrb() {
  const nodes = [{ name: "Google", x: 8, y: 24, icon: Globe2 }, { name: "Figma", x: 73, y: 18, icon: Layers3 }, { name: "GitHub", x: 74, y: 68, icon: GitBranch }, { name: "Notion", x: 8, y: 70, icon: FileText }];
  return <div className="identity-orb globe-visual"><div className="orb-grid" /><div className="globe-sphere"><div className="globe-map"><span className="globe-latitude latitude-one" /><span className="globe-latitude latitude-two" /><span className="globe-longitude longitude-one" /><span className="globe-longitude longitude-two" /><svg className="globe-continents" viewBox="0 0 220 220" aria-hidden="true"><path d="M37 67 52 48l19 5 7 15-12 9-2 17-17 4-13-13Zm46 12 16-8 13 7 7 18-12 9-15-5-3-12Zm49-20 18-5 18 12-3 19-14 3-9-12Zm-9 48 13-7 12 15-7 16-13-4Z" /></svg><i className="globe-node globe-node-one" /><i className="globe-node globe-node-two" /><i className="globe-node globe-node-three" /></div></div><div className="orbit orbit-one" /><div className="orbit orbit-two" /><svg className="orb-lines" viewBox="0 0 500 430" aria-hidden="true"><line x1="250" y1="215" x2="95" y2="120" /><line x1="250" y1="215" x2="385" y2="105" /><line x1="250" y1="215" x2="395" y2="305" /><line x1="250" y1="215" x2="95" y2="315" /></svg><div className="orb-center"><Shield size={32} /><span>your<br />identity</span></div>{nodes.map(({ name, x, y, icon: Icon }) => <motion.div className="orb-node" style={{ left: `${x}%`, top: `${y}%` }} animate={{ y: [0, -7, 0] }} transition={{ duration: 4 + x / 20, repeat: Infinity, ease: "easeInOut" }} key={name}><Icon size={17} /><span>{name}</span></motion.div>)}</div>;
}

function StepCard() {
  return <div className="steps-card">{[["01", "Connect or add", "Start with the accounts you already know."], ["02", "Review the picture", "See what belongs to your digital identity."], ["03", "Choose your action", "Keep, secure, revoke, delete locally, or preserve."]].map(([n, title, copy], i) => <div className="step" key={n}><span className="step-number">{n}</span><div><h3>{title}</h3><p>{copy}</p></div>{i < 2 && <div className="step-line" />}</div>)}</div>;
}

function IdentityPreview() {
  return <div className="identity-preview"><div className="preview-center"><Shield size={25} /><span>Alex&apos;s identity</span><small>demo profile</small></div>{[["Google", "Productivity", "top-left"], ["Figma", "Creative", "top-right"], ["GitHub", "Development", "bottom-left"], ["Slack", "Productivity", "bottom-right"]].map(([name, cat, pos]) => <div className={`preview-node ${pos}`} key={name}><span className="mini-node-icon"><Globe2 size={15} /></span><div><strong>{name}</strong><small>{cat}</small></div></div>)}</div>;
}

function DashboardPreview() {
  return <div className="dashboard-preview"><div className="preview-sidebar"><Logo compact /><span className="preview-side-active"><BarChart3 size={15} /></span><span><Grid2X2 size={15} /></span><span><Network size={15} /></span><span><Settings size={15} /></span></div><div className="preview-main"><div className="preview-top"><div><span className="eyebrow">Demo workspace</span><h3>Good morning, Alex</h3></div><span className="demo-badge">DEMO DATA</span></div><div className="metric-grid">{[["12", "Total accounts", "↑ 3 this month"], ["03", "Need attention", "2 medium, 1 low"], ["87%", "Security score", "↑ 6% this month"]].map(([n, l, d]) => <div className="metric" key={l}><strong>{n}</strong><span>{l}</span><small>{d}</small></div>)}</div><div className="preview-lower"><div className="fake-chart"><span className="eyebrow">Identity activity</span><div className="chart-lines"><i /><i /><i /><i /><i /></div></div><div className="fake-list"><span className="eyebrow">Needs attention</span>{accounts.slice(1, 4).map((account) => <div key={account.name}><span className={`list-dot ${account.color}`} /><span>{account.name}</span><small>{account.status}</small></div>)}</div></div></div></div>;
}

function FaqSection() {
  const faqs = [["Does GhostGuard find every account?", "No. Discovery is intentionally described as partial and heuristic. GhostGuard helps you build a clearer inventory, but no provider flow can guarantee complete account coverage."], ["What happens when I connect Gmail?", "Gmail discovery is a future, permissioned feature. You will see what access is requested and review candidate accounts before they become local GhostGuard records."], ["Does revoke delete my account?", "No. Revoke refers to an external OAuth access or permission where supported. Deleting a local GhostGuard record is a separate action. External account deletion is outside the initial scope."], ["Is this connected to a real account?", "No. This frontend uses demonstration data and local state only. Authentication, Firebase, Gmail, and backend integrations are not connected in this phase."]];
  const [open, setOpen] = useState(0);
  return <section className="section section-muted"><div className="container faq-grid"><SectionIntro eyebrow="Questions, answered" title="Clarity before control." copy="A few things worth knowing before you start." align="left" /><div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${open === index ? "open" : ""}`} key={question}><button onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span><ChevronDown size={18} /></button><AnimatePresence>{open === index && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{answer}</motion.p>}</AnimatePresence></div>)}</div></div></section>;
}

export function AuthPage({ mode = "login" }) {
  const login = mode === "login";
  const forgot = mode === "forgot";
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login: firebaseLogin, signup: firebaseSignup, loginWithGoogle } = useAuth();

  const handleGoogleSignIn = () => {
    setError("");
    setSubmitting(true);
    // Direct 1-click Google OAuth flow: provides identity AND grants Gmail inbox read scope
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const email = (form.get("email") || "").toString().trim();
    const password = (form.get("password") || "").toString();
    const name = (form.get("name") || "").toString().trim();
    const confirm = (form.get("confirm") || "").toString();
    const terms = form.get("terms");

    if (!email || (!forgot && !password) || (!login && !forgot && !name)) {
      setError("Please complete the required fields to continue.");
      return;
    }
    if (!login && !forgot && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!forgot && !login && !terms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      if (forgot) {
        if (auth) {
          const { sendPasswordResetEmail } = await import("firebase/auth");
          await sendPasswordResetEmail(auth, email);
        }
        setSubmitted(true);
        setSubmitting(false);
        return;
      }

      if (login) {
        let user = null;
        try {
          if (firebaseLogin) {
            user = await firebaseLogin(email, password);
          }
        } catch (fbErr) {
          // Check local demo registration fallback
          const registration = JSON.parse(window.localStorage.getItem("ghostguard-demo-registration") || "null");
          if (registration && registration.email === email && registration.password === password) {
            window.localStorage.setItem("ghostguard-demo-session", JSON.stringify({ email, createdAt: Date.now() }));
            window.localStorage.setItem("ghostguard_auth", "true");
            window.localStorage.setItem("ghostguard_mode", "LIVE");
            window.localStorage.setItem("ghostguard_email", email);
            router.push(`/dashboard?auth=success&email=${encodeURIComponent(email)}`);
            return;
          }

          let msg = fbErr.message || "Failed to sign in.";
          if (fbErr.code === "auth/invalid-credential" || fbErr.code === "auth/user-not-found" || fbErr.code === "auth/wrong-password") {
            msg = "Invalid email or password. Please check your credentials.";
          } else if (fbErr.code === "auth/too-many-requests") {
            msg = "Access temporarily disabled due to many failed login attempts. Try again later.";
          }
          setError(msg);
          setSubmitting(false);
          return;
        }

        const uid = user?.uid || user?.user?.uid || auth?.currentUser?.uid || '';

        if (typeof window !== "undefined") {
          window.localStorage.setItem("ghostguard_auth", "true");
          window.localStorage.setItem("ghostguard_mode", "LIVE");
          window.localStorage.setItem("ghostguard_email", email);
          window.localStorage.setItem(
            "ghostguard-demo-session",
            JSON.stringify({
              authenticated: true,
              isLive: true,
              email,
              createdAt: Date.now()
            })
          );
        }

        // Inspect backend session / Firestore to verify connected Gmail token
        try {
          const status = await authApi.checkStatus();
          if (!status?.hasGmail && !status?.connectedGmail) {
            window.location.href = `${API_BASE_URL}/auth/google?uid=${encodeURIComponent(uid)}`;
            return;
          }
        } catch (statusErr) {
          console.warn("Status check error during login:", statusErr.message);
        }

        router.push(`/dashboard?auth=success&email=${encodeURIComponent(email)}`);
        return;
      }

      // Registration / Signup
      let user = null;
      let uid = "";
      try {
        if (firebaseSignup) {
          user = await firebaseSignup(email, password);
          uid = user?.uid || user?.user?.uid || auth?.currentUser?.uid || '';
        }
      } catch (fbErr) {
        let msg = fbErr.message || "Failed to create account.";
        if (fbErr.code === "auth/email-already-in-use") {
          msg = "An account with this email already exists. Please log in.";
        } else if (fbErr.code === "auth/weak-password") {
          msg = "Password should be at least 6 characters.";
        }
        setError(msg);
        setSubmitting(false);
        return;
      }

      try {
        await authApi.updateProfile({
          displayName: name,
          email,
        });
      } catch (profileErr) {
        console.warn("Could not save profile metadata:", profileErr.message);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("ghostguard_auth", "true");
        window.localStorage.setItem("ghostguard_mode", "LIVE");
        window.localStorage.setItem("ghostguard_email", email);
        window.localStorage.setItem(
          "ghostguard-demo-registration",
          JSON.stringify({ name, email, password })
        );
        window.localStorage.setItem(
          "ghostguard-demo-session",
          JSON.stringify({
            authenticated: true,
            isLive: true,
            email,
            name,
            createdAt: Date.now()
          })
        );
      }

      // Mandatory Gmail Connection Bridge: Redirect to Google OAuth with Firebase UID
      window.location.href = `${API_BASE_URL}/auth/google?uid=${encodeURIComponent(uid)}`;
      return;
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  }

  const title = forgot ? "Reset your password" : login ? "Log in to your workspace" : "Create your GhostGuard account";
  const eyebrow = forgot ? "Account recovery" : login ? "Welcome back" : "Start with clarity";
  return <PublicShell><section className="auth-page auth-page-form-only"><div className="auth-form-wrap"><div className="auth-form"><div className="mobile-auth-logo"><Logo /></div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p className="auth-subtitle">{forgot ? "Enter your email to receive recovery instructions." : login ? "Log in to access your digital security workspace." : "Create your account to start auditing and securing your digital footprint."}</p>{submitted ? <div className="success-panel"><span className="success-icon"><Check /></span><h3>{forgot ? "Recovery instructions sent" : "Account ready"}</h3><p>{forgot ? "Check your email for instructions to reset your password." : "Your account is ready. Log in to continue to the dashboard."}</p><Link href="/login" className="button button-primary">{forgot ? "Return to login" : "Continue to login"} <ArrowRight size={16} /></Link></div> : <>
  {!forgot && (
    <>
      <button
        type="button"
        className="button button-primary button-full google-prominent-btn"
        onClick={handleGoogleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "linear-gradient(135deg, rgba(74, 222, 128, 0.22) 0%, rgba(16, 185, 129, 0.3) 100%)",
          border: "1px solid rgba(74, 222, 128, 0.45)",
          color: "#f1f5ee",
          padding: "14px 20px",
          borderRadius: "12px",
          fontSize: "15px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "6px",
          width: "100%",
          boxShadow: "0 4px 20px rgba(16, 185, 129, 0.22)",
          transition: "all 0.2s ease"
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
        </svg>
        <span>{login ? "Sign in with Google" : "Connect with Google"}</span>
        <span style={{
          fontSize: "11px",
          padding: "3px 8px",
          borderRadius: "999px",
          background: "rgba(74, 222, 128, 0.25)",
          border: "1px solid rgba(74, 222, 128, 0.4)",
          color: "#4ade80",
          fontWeight: "600",
          letterSpacing: "0.03em"
        }}>
          Recommended
        </span>
      </button>
      <div style={{ textAlign: "center", fontSize: "11.5px", color: "#8ea890", marginBottom: "16px" }}>
        ✦ 1-click authentication & automatic inbox asset discovery
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0 18px", color: "var(--muted)", fontSize: "12px" }}>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }} />
        <span>or continue with email</span>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }} />
      </div>
    </>
  )}
  <form onSubmit={submit} noValidate>{!login && !forgot && <label>Full name<input name="name" placeholder="Alex Morgan" /></label>}<label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>{!forgot && <label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}{!login && !forgot && <label>Confirm password<input name="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" required /></label>}{login ? <div className="form-row"><label className="checkbox"><input type="checkbox" name="remember" /> <span>Remember me</span></label><Link href="/forgot-password">Forgot password?</Link></div> : !forgot && <label className="checkbox"><input type="checkbox" required name="terms" /> <span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>}{error && <p className="form-error">{error}</p>}<button className="button button-ghost button-full" type="submit" disabled={submitting} style={{ border: "1px solid rgba(74, 222, 128, 0.3)" }}>{submitting ? <><GhostGuardLoader inline /> Processing...</> : <>{forgot ? "Send recovery email" : login ? "Log in with email" : "Create account with email"} <ArrowRight size={16} /></>}</button>{!forgot && (
    <div style={{
      marginTop: "14px",
      padding: "10px 14px",
      borderRadius: "8px",
      background: "rgba(74, 222, 128, 0.05)",
      border: "1px dashed rgba(74, 222, 128, 0.2)",
      fontSize: "12px",
      color: "#9bb89e",
      lineHeight: "1.5",
      textAlign: "center"
    }}>
      Signing up with email will prompt you to connect your Gmail account on the next step to enable inbox asset discovery.
    </div>
  )}</form></>}<p className="auth-switch">{forgot ? "Remembered your password?" : login ? "New to GhostGuard?" : "Already have an account?"} <Link href={forgot || !login ? "/login" : "/signup"}>{forgot || !login ? "Log in" : "Create an account"}</Link></p></div></div></section></PublicShell>;
}

export function PageHero({ eyebrow, title, copy }) {
  return <section className="page-hero"><div className="container narrow"><span className="pill">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></section>;
}

export function InfoPage({ type }) {
  const content = {
    features: { eyebrow: "One clear command center", title: "Designed for a more understandable digital life.", copy: "GhostGuard brings your accounts, context, and next steps into one calm, visual workspace." },
    "how-it-works": { eyebrow: "A simpler workflow", title: "See it. Understand it. Decide.", copy: "Start with the accounts you know, build a clearer picture, and make deliberate choices about what happens next." },
    about: { eyebrow: "Why GhostGuard", title: "Digital identity should feel like yours.", copy: "We are exploring a more transparent, human way to understand the accounts that make up our online lives." },
    privacy: { eyebrow: "Privacy policy", title: "Privacy is part of the product.", copy: "This frontend concept is not connected to a backend and does not collect or store your information." },
    terms: { eyebrow: "Terms and conditions", title: "Clear expectations, by design.", copy: "These demo terms explain the current frontend-only scope of GhostGuard." },
  }[type];
  return <PublicShell><PageHero {...content} />{type === "features" ? <FeaturePageBody /> : type === "how-it-works" ? <HowPageBody /> : <LegalOrAbout type={type} />}</PublicShell>;
}

function FeaturePageBody() {
  return <><section className="section"><div className="container feature-grid feature-grid-large">{featureData.map((item, index) => <FeatureCard item={item} index={index} key={item.title} />)}</div></section><section className="section section-muted"><div className="container split-section"><SectionIntro eyebrow="Built around clarity" title="The action is always yours." copy="GhostGuard separates what the product can show from what only you can decide." align="left" /><div className="action-list">{["KEEP — retain the local record", "SECURE — flag it for improvement", "REVOKE — represent external access revocation", "DELETE — remove only the local record", "PRESERVE — mark for future reference"].map((item) => <div key={item}><Check size={16} /> {item}</div>)}</div></div></section></>;
}

function HowPageBody() {
  return <section className="section"><div className="container workflow-grid">{[["01", "Connect or add accounts", "Start with manual entries or, in a future phase, an explicitly permissioned provider discovery flow."], ["02", "Review your identity map", "See candidate services and known accounts in a visual map. Discovery is partial, never guaranteed complete."], ["03", "Organize the context", "Add categories, notes, and status so your inventory reflects what matters to you."], ["04", "Choose a clear next step", "Keep, secure, revoke, delete locally, or preserve — with each action explained in plain language."]].map(([n, title, copy], index) => <Reveal className="workflow-step" delay={index * .08} key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></Reveal>)}</div></section>;
}

function LegalOrAbout({ type }) {
  const paragraphs = type === "about" ? ["GhostGuard is a product concept built around a simple belief: people should be able to understand their digital identity without handing over more control than necessary.", "The frontend experience is intentionally transparent. It uses demonstration data, separates local organization from provider actions, and treats discovery as a helpful signal rather than a complete answer.", "The product direction, backend architecture, and data model are still being finalized."] : ["This page describes the current frontend concept only. GhostGuard is not connected to Firebase, Gmail, authentication, or any backend service in this phase.", "No real account information is collected, discovered, stored, revoked, or deleted by this frontend. Any records, metrics, or activity shown in the interface are demonstration data.", "Before a production launch, this content must be reviewed and finalized alongside the authentication, data retention, provider permission, and security decisions."];
  return <section className="section"><div className="container legal-copy">{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="callout"><ShieldCheck size={20} /><span>External account deletion is outside the initial scope. Local GhostGuard record deletion and external OAuth revocation are separate concepts.</span></div></div></section>;
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  return <PublicShell><PageHero eyebrow="We are listening" title="Questions, ideas, or just curious?" copy="Send a note to the GhostGuard team. This form is a frontend demo and does not send a real message." /><section className="section"><div className="container contact-grid"><div><SectionIntro eyebrow="Get in touch" title="Let’s make digital identity clearer." copy="Whether you are thinking about privacy, product feedback, or the future of your account inventory, we would love to hear from you." align="left" /><div className="contact-detail"><Mail size={18} /><div><strong>Email</strong><span>hello@ghostguard.app</span></div></div><div className="contact-detail"><CircleHelp size={18} /><div><strong>Response time</strong><span>Usually within 2–3 business days</span></div></div></div><form className="contact-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Name<input required placeholder="Your name" /></label><label>Email<input required type="email" placeholder="you@example.com" /></label><label>Message<textarea required rows="5" placeholder="How can we help?" /></label>{sent && <p className="success-text"><Check size={16} /> Demo message captured locally. No message was sent.</p>}<button className="button button-primary button-full" type="submit">Send message <ArrowRight size={16} /></button></form></div></section></PublicShell>;
}

export function DashboardShell({ children, title, description }) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const { isLive, userEmail, userName, logout, assets, stats, deadManArmed, disarmDeadManSwitch } = useGhostGuard();
  const [disarming, setDisarming] = useState(false);

  const handleDisarm = async () => {
    setDisarming(true);
    try {
      await disarmDeadManSwitch();
    } catch (err) {
      alert("Failed to disarm Dead Man's Switch: " + (err.message || "Unknown error"));
    } finally {
      setDisarming(false);
    }
  };

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);

  const isLiveEffective = isLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  const effectiveEmail = userEmail || (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("email") || window.localStorage.getItem("ghostguard_email")) : "") || "";
  const displayName = userName || (effectiveEmail ? effectiveEmail.split("@")[0] : (isLiveEffective ? "Workspace" : "Alex"));

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.includes("@")) {
      const parts = email.split("@")[0].split(/[._-]/);
      if (parts.length >= 2 && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.slice(0, 2).toUpperCase();
    }
    return "GG";
  };

  const initials = getInitials(displayName, effectiveEmail);

  const [notifications, setNotifications] = useState([
    {
      id: "alert-welcome",
      title: "Welcome Alert",
      message: "Welcome back to GhostGuard • Your digital footprint scan completed successfully.",
      time: "Just now",
      read: false,
      type: "welcome",
      href: "/dashboard",
    },
    {
      id: "alert-audit",
      title: "Audit Alert",
      message: "3 Dormant/Ghost accounts detected • Review high-exposure platforms.",
      time: "15m ago",
      read: false,
      type: "audit",
      href: "/dashboard/accounts",
    },
    {
      id: "alert-security",
      title: "Security Alert",
      message: "Identity posture is currently active at 89% health.",
      time: "1h ago",
      read: false,
      type: "security",
      href: "/dashboard/security",
    },
  ]);

  // Synchronize dynamic counts from live stats if available
  useEffect(() => {
    if (stats) {
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === "alert-audit" && stats.dormantCount !== undefined) {
            return {
              ...n,
              message: `${stats.dormantCount} Dormant/Ghost accounts detected • Review high-exposure platforms.`,
            };
          }
          if (n.id === "alert-security" && stats.ghostScore !== undefined) {
            const health = Math.max(10, 100 - stats.ghostScore);
            return {
              ...n,
              message: `Identity posture is currently active at ${health}% health.`,
            };
          }
          return n;
        })
      );
    }
  }, [stats]);

  // Outside-click & Escape key listener for clean popover dismiss
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
      }
    }

    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    try {
      if (auth && typeof auth.signOut === "function") {
        await auth.signOut();
      }
    } catch {}
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ghostguard-demo-session");
      window.localStorage.removeItem("ghostguard_auth");
      window.localStorage.removeItem("ghostguard_mode");
      window.localStorage.removeItem("ghostguard_email");
      window.localStorage.removeItem("ghostguard_id_token");
      // Clear all local cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // Reset any query parameters and redirect to landing page
      window.location.href = "/";
    }
  };

  const searchSource = assets && assets.length > 0
    ? assets.map((a, i) => mapBackendAssetToAccount(a, i))
    : accounts;
  const searchResults = query.trim()
    ? searchSource.filter((account) =>
        `${account.name} ${account.email} ${account.category} ${account.domain || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-only" onClick={() => setMobile(false)} aria-label="Close dashboard menu">
            <X />
          </button>
        </div>
        <div className="workspace-switch">
          <ProfileAvatar className="workspace-avatar" initials={initials} />
          <div>
            <strong>{isLiveEffective ? `${displayName}’s Workspace` : "Alex’s workspace"}</strong>
            <small>
              {isLiveEffective ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#4ade80", fontWeight: 600 }}>
                  <span className="status-dot green" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                  LIVE WORKSPACE
                </span>
              ) : (
                "Demo workspace"
              )}
            </small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="dashboard-nav">
          {dashboardNav.map(({ href, label, icon: Icon }) => (
            <Link className={pathname === href ? "active" : ""} href={href} key={href} onClick={() => setMobile(false)}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/">
            <ArrowRight size={16} /> Back to website
          </Link>
          <button onClick={handleLogout}>
            <LogOut size={16} /> Log out{" "}
            <span
              className="demo-mini"
              style={{
                background: isLiveEffective ? "rgba(74, 222, 128, 0.2)" : undefined,
                color: isLiveEffective ? "#4ade80" : undefined,
                borderColor: isLiveEffective ? "rgba(74, 222, 128, 0.4)" : undefined,
              }}
            >
              {isLiveEffective ? "LIVE" : "DEMO"}
            </span>
          </button>
        </div>
      </aside>
      {mobile && (
        <button className="sidebar-overlay mobile-only" onClick={() => setMobile(false)} aria-label="Close sidebar" />
      )}
      <div className="dashboard-content">
        {deadManArmed && (
          <div
            role="alert"
            className="dead-man-switch-banner"
            style={{
              backgroundColor: "rgba(127, 29, 29, 0.95)",
              borderBottom: "1px solid #ef4444",
              color: "#fecaca",
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              zIndex: 100,
              boxShadow: "0 4px 20px rgba(239, 68, 68, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.2px" }}>
                ⚠️ DEAD MAN&apos;S SWITCH ACTIVE: All {stats?.totalDiscovered || assets?.length || 0} accounts queued for deletion.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDisarm}
              disabled={disarming}
              style={{
                backgroundColor: "#b91c1c",
                border: "1px solid #f87171",
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: disarming ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
                transition: "all 0.15s ease",
              }}
            >
              {disarming ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Disarming...
                </>
              ) : (
                <>
                  <ShieldAlert size={14} /> Disarm Protocol
                </>
              )}
            </button>
          </div>
        )}
        <header className="dashboard-header">
          <button className="icon-button mobile-only" onClick={() => setMobile(true)} aria-label="Open dashboard menu">
            <Menu />
          </button>
          <div className="header-title">
            <span className="eyebrow" style={{ color: isLiveEffective ? "var(--cyan)" : undefined }}>
              {isLiveEffective ? "Live workspace" : "Demo workspace"}
            </span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          <div className="header-actions">
            <div className="global-search">
              <label className="header-search">
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." aria-label="Search dashboard" />
              </label>
              {query && (
                <div className="global-search-results">
                  {searchResults.length ? (
                    searchResults.map((account) => (
                      <Link href="/dashboard/accounts" key={account.id} onClick={() => setQuery("")}>
                        <strong>{account.name}</strong>
                        <small>{account.domain || account.email} · {account.category}</small>
                      </Link>
                    ))
                  ) : (
                    <span>No matching accounts</span>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="header-action-wrapper" ref={notificationsRef}>
              <button
                className={`icon-button notification-button ${isNotificationsOpen ? "active" : ""}`}
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  setIsNotificationsOpen((prev) => !prev);
                  setIsProfileMenuOpen(false);
                }}
                style={{ position: "relative" }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    className="notification-indicator-dot"
                    style={{
                      position: "absolute",
                      top: "7px",
                      right: "7px",
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "#4ade80",
                      boxShadow: "0 0 8px #4ade80",
                    }}
                  />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    className="notification-popover"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "13px 16px",
                        borderBottom: "1px solid rgba(74, 222, 128, 0.12)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "13.5px", fontWeight: 700, color: "#f0fdf4" }}>
                          Notifications
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            background: unreadCount > 0 ? "rgba(74, 222, 128, 0.15)" : "rgba(148, 163, 184, 0.12)",
                            color: unreadCount > 0 ? "#4ade80" : "#94a3b8",
                            border: unreadCount > 0 ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(148, 163, 184, 0.2)",
                          }}
                        >
                          {unreadCount} {unreadCount === 1 ? "alert" : "alerts"}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#86efac",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: "2px 4px",
                            borderRadius: "4px",
                            transition: "color 0.15s ease",
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notification Items */}
                    <div style={{ maxHeight: "310px", overflowY: "auto", padding: "6px" }}>
                      {notifications.map((item) => {
                        const isAudit = item.type === "audit";
                        const isWelcome = item.type === "welcome";
                        const iconColor = isAudit ? "#fbbf24" : "#4ade80";
                        const iconBg = isAudit ? "rgba(251, 191, 36, 0.14)" : "rgba(74, 222, 128, 0.14)";
                        const iconBorder = isAudit ? "rgba(251, 191, 36, 0.3)" : "rgba(74, 222, 128, 0.3)";
                        const IconComponent = isAudit ? AlertTriangle : (isWelcome ? Sparkles : ShieldCheck);

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => {
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                              );
                              setIsNotificationsOpen(false);
                            }}
                            className="notification-item"
                            style={{
                              background: item.read ? "transparent" : "rgba(74, 222, 128, 0.04)",
                              border: item.read ? "1px solid transparent" : "1px solid rgba(74, 222, 128, 0.12)",
                            }}
                          >
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "8px",
                                background: iconBg,
                                border: `1px solid ${iconBorder}`,
                                color: iconColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: "2px",
                              }}
                            >
                              <IconComponent size={15} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f0fdf4" }}>
                                  {item.title}
                                </span>
                                <span style={{ fontSize: "10px", color: "#64748b" }}>
                                  {item.time}
                                </span>
                              </div>
                              <p
                                style={{
                                  margin: "3px 0 0",
                                  fontSize: "11.5px",
                                  lineHeight: 1.4,
                                  color: item.read ? "#94a3b8" : "#cbd5e1",
                                }}
                              >
                                {item.message}
                              </p>
                            </div>
                            {!item.read && (
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isAudit ? "#fbbf24" : "#4ade80",
                                  boxShadow: `0 0 6px ${isAudit ? "#fbbf24" : "#4ade80"}`,
                                  position: "absolute",
                                  top: "12px",
                                  right: "9px",
                                }}
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        padding: "10px 16px",
                        borderTop: "1px solid rgba(74, 222, 128, 0.12)",
                        background: "rgba(15, 24, 19, 0.6)",
                        textAlign: "center",
                      }}
                    >
                      <Link
                        href="/dashboard/security"
                        onClick={() => setIsNotificationsOpen(false)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          color: "#86efac",
                          textDecoration: "none",
                          transition: "color 0.15s ease",
                        }}
                      >
                        View all in Security Posture
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Appearance / Theme Toggle (Untouched) */}
            <ThemeToggle />

            {/* Profile Dropdown Menu */}
            <div className="header-action-wrapper" ref={profileMenuRef}>
              <button
                className={`profile-button ${isProfileMenuOpen ? "active" : ""}`}
                aria-label="Open profile menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => {
                  setIsProfileMenuOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                }}
              >
                <ProfileAvatar className="profile-avatar" initials={initials} />
                <ChevronDown
                  size={15}
                  style={{
                    transform: isProfileMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    className="profile-popover"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    {/* User Info Section (Top) */}
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(74, 222, 128, 0.12)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "rgba(74, 222, 128, 0.15)",
                            border: "1px solid rgba(74, 222, 128, 0.3)",
                            color: "#4ade80",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12.5px",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong
                            style={{
                              display: "block",
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#f0fdf4",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayName}
                          </strong>
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              color: "#94a3b8",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {effectiveEmail || "alex@demo.co"}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: "10px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            letterSpacing: "0.4px",
                            background: isLiveEffective ? "rgba(74, 222, 128, 0.14)" : "rgba(34, 211, 238, 0.12)",
                            color: isLiveEffective ? "#4ade80" : "var(--cyan)",
                            border: isLiveEffective ? "1px solid rgba(74, 222, 128, 0.28)" : "1px solid rgba(34, 211, 238, 0.25)",
                          }}
                        >
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: isLiveEffective ? "#4ade80" : "var(--cyan)",
                              boxShadow: isLiveEffective ? "0 0 6px #4ade80" : "none",
                            }}
                          />
                          {isLiveEffective ? "LIVE AUDIT ACTIVE" : "DEMO WORKSPACE"}
                        </span>
                      </div>
                    </div>

                    {/* Menu Navigation Items */}
                    <div style={{ padding: "6px" }}>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="profile-menu-item"
                      >
                        <Grid2X2 size={15} style={{ color: "#4ade80" }} />
                        Identity Overview
                      </Link>
                      <Link
                        href="/dashboard/accounts"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="profile-menu-item"
                      >
                        <Layers size={15} style={{ color: "#4ade80" }} />
                        All Audited Accounts
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="profile-menu-item"
                      >
                        <Settings size={15} style={{ color: "#4ade80" }} />
                        Settings
                      </Link>
                    </div>

                    {/* Divider */}
                    <div style={{ height: "1px", background: "rgba(74, 222, 128, 0.12)", margin: "2px 0" }} />

                    {/* Log Out Button */}
                    <div style={{ padding: "6px" }}>
                      <button
                        onClick={handleLogout}
                        className="profile-logout-button"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main className="dashboard-main">{children}</main>
        <GhostAICopilot />
      </div>
    </div>
  );
}

function ProfileAvatar({ className = "", src = "", alt = "Profile", initials = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className={`profile-avatar-fallback ${className}`}>
      {src && !imageFailed ? (
        // Profile images are optional demo data; the icon remains the reliable fallback.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setImageFailed(true)} />
      ) : initials ? (
        <span style={{ fontSize: "11px", fontWeight: 700 }}>{initials}</span>
      ) : (
        <UserRound size={17} aria-hidden="true" />
      )}
    </span>
  );
}

export function DemoBanner() {
  const { isLive, sessionExpired } = useGhostGuard();

  const isLiveEffective = isLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  if (sessionExpired) {
    return (
      <div
        style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f87171" }}>
          <Shield size={20} />
          <span style={{ fontSize: "13px" }}>
            <strong>Backend session expired.</strong> Click below to reconnect your Gmail.
          </span>
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/google`}
          className="button button-primary"
          style={{ padding: "8px 16px", fontSize: "12px" }}
        >
          Reconnect Gmail
        </a>
      </div>
    );
  }

  // If live mode is active, completely hide the "No backend is connected" demo banner!
  if (isLiveEffective) {
    return null;
  }

  return (
    <div className="demo-banner">
      <Sparkles size={15} />
      <span>
        <strong>Demo workspace</strong> — sample records and metrics are for demonstration only. No backend is connected.
      </span>
    </div>
  );
}

export function DashboardPage() {
  const {
    isLive: contextIsLive,
    userEmail: contextUserEmail,
    loading: contextLoading,
    isScanning,
    scanMessage,
    stats: contextStats,
    assets: contextAssets,
    scanInbox,
  } = useGhostGuard();

  const [localStats, setLocalStats] = useState(null);
  const [localAssets, setLocalAssets] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localEmail, setLocalEmail] = useState("");

  const isLiveEffective = contextIsLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  // Immediate on-mount fetch for live dashboard data
  useEffect(() => {
    let active = true;

    async function fetchDashboardLive() {
      let emailFromUrl = "";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("auth") === "success") {
          window.localStorage.setItem("ghostguard_auth", "true");
          window.localStorage.setItem("ghostguard_mode", "LIVE");
          emailFromUrl = params.get("email") || "";
          if (emailFromUrl) window.localStorage.setItem("ghostguard_email", emailFromUrl);
        } else {
          emailFromUrl = window.localStorage.getItem("ghostguard_email") || "";
        }
      }

      if (emailFromUrl && active) {
        setLocalEmail(emailFromUrl);
      }

      setLocalLoading(true);

      try {
        // 1. Fetch scan (or fallback to stored accounts)
        try {
          const scanRes = await auditApi.scan();
          if (active && scanRes?.assets) {
            setLocalAssets(scanRes.assets);
          }
        } catch (scanErr) {
          if (scanErr.status === 401) {
            try {
              const accRes = await auditApi.getAccounts();
              if (active && accRes?.assets && accRes.assets.length > 0) {
                setLocalAssets(accRes.assets);
              }
            } catch {}
          }
        }

        // 2. Fetch stats
        try {
          const statsRes = await auditApi.getStats();
          if (active && statsRes?.stats) {
            setLocalStats(statsRes.stats);
          }
        } catch (statsErr) {
          // stats error handling
        }
      } catch (err) {
        console.warn("Dashboard on-mount fetch error:", err);
      } finally {
        if (active) setLocalLoading(false);
      }
    }

    if (isLiveEffective) {
      fetchDashboardLive();
    }

    return () => { active = false; };
  }, [isLiveEffective]);

  const stats = contextStats || localStats;
  const assets = (contextAssets && contextAssets.length > 0) ? contextAssets : localAssets;
  const loading = contextLoading || localLoading;
  const activeEmail = localEmail || contextUserEmail || (typeof window !== "undefined" ? window.localStorage.getItem("ghostguard_email") : "") || "";

  // 1. Metric Card 1: totalDiscovered (Total accounts)
  const totalCount = stats?.totalDiscovered ?? (assets.length > 0 ? assets.length : (isLiveEffective ? 0 : 25));

  // 2. Metric Card 2: dormantCount or highRiskCount (Need attention)
  const needAttentionCount = stats
    ? ((stats.highRiskCount || 0) + (stats.dormantCount || 0)) || stats.highRiskCount || stats.dormantCount || 0
    : (assets.length > 0
        ? assets.filter((a) => a.riskLevel === "High" || a.riskLevel === "HIGH" || a.isDormant).length
        : (isLiveEffective ? 0 : 13));

  // 3. Metric Card 3: Security Score (calculate dynamically from safe vs high-risk ratio)
  const highRiskCount = stats?.highRiskCount ?? (assets.length > 0 ? assets.filter((a) => a.riskLevel === "High" || a.riskLevel === "HIGH").length : 0);
  const securityScore = isLiveEffective
    ? `${Math.round(((totalCount - highRiskCount) / (totalCount || 1)) * 100)}%`
    : "52%";

  // 4. Metric Card 4: reviewedCount (Preserved / Secured)
  const preservedCount = stats?.reviewedCount ?? stats?.statusBreakdown?.SECURED ?? (isLiveEffective ? 0 : 1);

  // Attention accounts for the feed
  const attentionAccounts = assets.length > 0
    ? assets
        .filter((a) => a.riskLevel === "High" || a.riskLevel === "HIGH" || a.isDormant || a.flag?.includes("Dormant") || a.status === "Review Needed" || a.status === "UNREVIEWED")
        .slice(0, 5)
        .map((a, i) => mapBackendAssetToAccount(a, i))
    : (isLiveEffective ? [] : accounts.filter((a) => a.status === "Review"));

  const greetingIdentity = activeEmail || "Your Account";

  return (
    <DashboardShell title="Overview" description="Real-time audit and posture of your digital identity.">
      {!isLiveEffective && <DemoBanner />}

      {loading && (
        <div style={{ background: "rgba(34, 211, 238, 0.08)", border: "1px solid rgba(34, 211, 238, 0.25)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "var(--cyan)" }}>
          <Sparkles className="animate-spin" size={22} />
          <div>
            <strong style={{ display: "block", fontSize: "14px" }}>Scanning Gmail for orphaned assets...</strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Connecting to Gmail API, discovering account registrations, and computing risk telemetry.</span>
          </div>
        </div>
      )}

      {isScanning && !loading && (
        <div style={{ background: "rgba(34, 211, 238, 0.1)", border: "1px solid rgba(34, 211, 238, 0.3)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", color: "var(--cyan)" }}>
          <GhostGuardLoader inline />
          <span>Auditing Gmail inbox for orphaned assets...</span>
        </div>
      )}

      {scanMessage && !isScanning && !loading && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 16px", marginBottom: "16px", color: "var(--foreground)", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{scanMessage}</span>
          <button onClick={() => {}} className="icon-button" style={{ padding: "4px" }}><X size={14} /></button>
        </div>
      )}

      <div className="welcome-row">
        <div>
          <h2>
            {isLiveEffective ? `Welcome Back, ${greetingIdentity}` : "Good morning, Alex"} <span>✦</span>
          </h2>
          <p>
            {isLiveEffective ? `Audited identity posture for ${activeEmail || "your connected inbox"}.` : "Here’s what’s happening across your digital identity."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="button button-ghost" onClick={scanInbox} disabled={isScanning || loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={15} /> {isScanning ? "Scanning..." : "Scan Inbox"}
          </button>
          <Link className="button button-primary" href="/dashboard/accounts">
            <Plus size={16} /> Add account
          </Link>
        </div>
      </div>

      <div className="metric-grid dashboard-metrics">
        {[
          [String(totalCount), "Total accounts", isLiveEffective ? "Live discovered from Gmail" : "Discovered & manual", "cyan"],
          [String(needAttentionCount), "Need attention", "High risk & dormant accounts", "orange"],
          [securityScore, "Security score", "Identity health posture", "green"],
          [String(preservedCount), "Preserved / Secured", "Remediated in audit store", "violet"]
        ].map(([number, label, detail, color]) => (
          <div className="dashboard-metric" key={label}>
            <span className={`metric-icon ${color}`}>
              {label === "Security score" ? <ShieldCheck size={18} /> : label === "Preserved / Secured" ? <LockKeyhole size={18} /> : <BarChart3 size={18} />}
            </span>
            <strong>{number}</strong>
            <span>{label}</span>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <section className="footprint-section">
        {/* Left Column: Title, Live Stats Readout & Quick Actions */}
        <div className="footprint-col footprint-left">
          <div className="footprint-left-header">
            <span className="eyebrow"><Activity size={14} /> Live Identity Topology</span>
            <h2>Your Digital Footprint</h2>
            <p>Continuous real-time audit of verified account registrations, dormant ghosts, and perimeter trust relationships.</p>
          </div>

          <div className="footprint-stat-group">
            <div className="footprint-stat-card">
              <div className="stat-icon-wrap cyan"><Globe2 size={16} /></div>
              <div className="stat-card-body">
                <strong>{totalCount}</strong>
                <span>Active Bridges</span>
                <small>Connected service nodes</small>
              </div>
            </div>
            <div className="footprint-stat-card">
              <div className="stat-icon-wrap rose"><AlertTriangle size={16} /></div>
              <div className="stat-card-body">
                <strong>{stats?.dormantCount ?? stats?.highRiskCount ?? 0}</strong>
                <span>Dormant Ghost Assets</span>
                <small>Unattended &gt; 12 months</small>
              </div>
            </div>
            <div className="footprint-stat-card">
              <div className="stat-icon-wrap emerald"><Layers size={16} /></div>
              <div className="stat-card-body">
                <strong>{Object.keys(stats?.categoryBreakdown || {}).length || (assets.length > 0 ? new Set(assets.map(a => a.category)).size : 4)}</strong>
                <span>Monitored Categories</span>
                <small>SaaS, Cloud &amp; Finance</small>
              </div>
            </div>
          </div>

          <div className="footprint-actions">
            <button className="button button-primary button-small" onClick={scanInbox} disabled={isScanning || loading} type="button">
              <Sparkles size={14} className={isScanning ? "animate-spin" : ""} /> {isScanning ? "Scanning..." : "Scan Gmail"}
            </button>
            <Link className="button button-ghost button-small" href="/dashboard/accounts">
              All Accounts <ChevronRight size={14} />
            </Link>
            <Link className="button button-ghost button-small" href="/dashboard/identity-map">
              Mind Map <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* Center Column: Prominent Hero ~500px-600px Dotted Constellation Globe */}
        <div className="footprint-col footprint-center">
          <div className="footprint-center-header">
            <span className="demo-badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
              {isLiveEffective ? "● LIVE GMAIL AUDIT ACTIVE · LOCALHOST:5000" : "DEMO CONSTELLATION"}
            </span>
          </div>
          <DottedIdentityGlobe assets={assets} userEmail={activeEmail || "user@domain.com"} />
          <span className="footprint-hint">
            Interactive constellation lattice — drag to orient orbit · hover chips to inspect risk details
          </span>
        </div>

        {/* Right Column: Live Telemetry Stream */}
        <div className="footprint-col footprint-right">
          <div className="footprint-telemetry-head">
            <span className="eyebrow"><Shield size={14} /> Perimeter Posture</span>
            <h3>Identity Telemetry</h3>
            <p>Real-time risk &amp; event stream</p>
          </div>

          {/* Security Health Status Card */}
          <div className="telemetry-health-card">
            <div className="health-score-row">
              <div>
                <span className="health-label">Security Posture</span>
                <strong>{securityScore}</strong>
              </div>
              <span className={`health-badge ${parseInt(securityScore) >= 75 ? "optimal" : parseInt(securityScore) >= 50 ? "warning" : "critical"}`}>
                {parseInt(securityScore) >= 80 ? "Optimal" : parseInt(securityScore) >= 60 ? "Review Advised" : "Elevated Risk"}
              </span>
            </div>
            <div className="health-bar-track">
              <div className="health-bar-fill" style={{ width: securityScore, background: parseInt(securityScore) >= 75 ? "#10b981" : parseInt(securityScore) >= 50 ? "#f59e0b" : "#f43f5e" }} />
            </div>
          </div>

          {/* Risk Distribution Badges */}
          <div className="telemetry-risk-pills">
            <div className="risk-pill">
              <span className="pill-dot red" />
              <div className="pill-data">
                <span>High Risk</span>
                <strong>{stats?.riskBreakdown?.High ?? highRiskCount}</strong>
              </div>
            </div>
            <div className="risk-pill">
              <span className="pill-dot amber" />
              <div className="pill-data">
                <span>Medium</span>
                <strong>{stats?.riskBreakdown?.Medium ?? 0}</strong>
              </div>
            </div>
            <div className="risk-pill">
              <span className="pill-dot green" />
              <div className="pill-data">
                <span>Secured</span>
                <strong>{stats?.riskBreakdown?.Low ?? Math.max(0, totalCount - highRiskCount)}</strong>
              </div>
            </div>
          </div>

          {/* Recently Discovered Services Feed */}
          <div className="telemetry-recent-feed">
            <span className="feed-title">Recently Discovered Services</span>
            {assets.slice(0, 4).map((item, i) => (
              <div className="telemetry-feed-item" key={item.domain || item.id || i}>
                <div className="feed-item-left">
                  <strong>{item.serviceName || item.domain}</strong>
                  <small>{item.domain}</small>
                </div>
                <span className={`risk-tag ${(item.riskLevel || "Low").toLowerCase()}`}>
                  {item.riskLevel || "LOW"}
                </span>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="feed-empty-state">
                <span>No services discovered yet. Run a scan to discover accounts.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <QuickActions onRunScan={scanInbox} isScanning={isScanning} />

      <div className="dashboard-columns">
        <Panel title="Accounts requiring attention" action="View all" href="/dashboard/accounts">
          <div className="attention-list">
            {attentionAccounts.length > 0 ? (
              attentionAccounts.map((account) => (
                <AccountRow account={account} key={account.id} />
              ))
            ) : (
              <div style={{ padding: "20px 0", color: "var(--muted)", fontSize: "13px" }}>
                ✓ No high-risk or dormant accounts currently need attention.
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Security overview" action="View security" href="/dashboard/security">
          <div className="security-score">
            <div className="score-circle"><strong>{securityScore}</strong><small>/ 100</small></div>
            <div>
              <strong>{securityScore > 75 ? "Good foundation" : "Review needed"}</strong>
              <p>{needAttentionCount} accounts could use your review.</p>
              <span className="score-progress"><i style={{ width: `${securityScore}%` }} /></span>
            </div>
          </div>
          <div className="score-foot"><span>Last audited recently</span><span className="text-cyan">Live telemetry</span></div>
        </Panel>
      </div>

      <div className="dashboard-columns">
        <Panel title="Recent activity" action="See all" href="/dashboard/accounts">
          <div className="activity-list">
            {[["Audited", "Google Workspace", "Today", Plus], ["Scored", "GitHub", "Yesterday", ShieldCheck], ["Secured", "Stripe", "3 days ago", LockKeyhole]].map(([action, name, time, Icon]) => (
              <div className="activity-row" key={name}>
                <span className="activity-icon"><Icon size={15} /></span>
                <span><strong>{action}</strong> {name}<small>{time}</small></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Account categories">
          <div className="category-list">
            {[["Productivity", 5, "cyan"], ["Developer", 3, "pink"], ["Finance", 2, "violet"], ["Social & Media", 2, "blue"]].map(([name, count, color]) => (
              <div key={name}>
                <span className={`category-dot ${color}`} />
                <span>{name}</span>
                <strong>{count}</strong>
                <div><i style={{ width: `${count * 15}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}

function QuickActions({ onRunScan, isScanning }) {
  return (
    <section className="quick-actions">
      <div><span className="eyebrow">Next steps</span><h2>Quick actions</h2></div>
      <div className="quick-action-grid">
        <Link className="quick-action" href="/dashboard/accounts">
          <Plus size={18} />
          <span><strong>Add account</strong><small>Create a local record</small></span>
          <ChevronRight size={16} />
        </Link>
        <button className="quick-action" onClick={onRunScan} disabled={isScanning} type="button">
          <ShieldCheck size={18} />
          <span>
            <strong>Run security scan</strong>
            <small>{isScanning ? "Auditing inbox..." : "Scan Gmail for registered accounts"}</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <Link className="quick-action" href="/dashboard/identity-map">
          <Network size={18} />
          <span><strong>Explore Identity Directory</strong><small>Categorized footprint catalog</small></span>
          <ChevronRight size={16} />
        </Link>
        <Link className="quick-action" href="/dashboard/security">
          <FileText size={18} />
          <span><strong>View security report</strong><small>Open security insights</small></span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}



export function SecurityDashboardPage() {
  const securityItems = [
    ["Google Workspace", "Strong", "2-step verification detected", "green"],
    ["Notion", "Review", "Last activity was 1 week ago", "orange"],
    ["GitHub", "Review", "Recovery settings need attention", "orange"],
    ["Figma", "Strong", "No recent warnings", "green"],
  ];
  return <DashboardShell title="Security" description="Review demo security signals across your identity."><DemoBanner /><div className="security-dashboard-grid"><div className="security-status-card"><div className="security-status-ring"><ShieldCheck size={32} /><strong>87</strong><span>out of 100</span></div><div><span className="eyebrow">Demo security score</span><h2>Good foundation</h2><p>Three recommendations can improve this sample workspace.</p><span className="score-progress"><i /></span></div></div><div className="security-stat-grid">{[["03", "Accounts to review", "orange"], ["09", "Strong accounts", "green"], ["02", "Recent events", "cyan"]].map(([value, label, color]) => <div className="security-stat" key={label}><span className={`metric-icon ${color}`}><ShieldCheck size={17} /></span><strong>{value}</strong><span>{label}</span></div>)}</div></div><div className="dashboard-columns security-content-grid"><Panel title="Connected account status"><div className="security-account-list">{securityItems.map(([name, status, detail, color]) => <div className="security-account-row" key={name}><span className={`status-dot ${color}`} /><div><strong>{name}</strong><small>{detail}</small></div><span className={`status-label ${color}`}>{status}</span></div>)}</div></Panel><Panel title="Recommended actions"><div className="security-recommendations"><div><ShieldCheck size={18} /><span><strong>Review recovery settings</strong><small>Check the accounts marked for review.</small></span><ChevronRight size={16} /></div><div><LockKeyhole size={18} /><span><strong>Confirm preserved records</strong><small>Keep important context available locally.</small></span><ChevronRight size={16} /></div><div><Eye size={18} /><span><strong>Review permissions</strong><small>Demo data only; no provider access is active.</small></span><ChevronRight size={16} /></div></div></Panel></div><Panel title="Recent security activity"><div className="activity-list">{[["Security review completed", "Today", ShieldCheck], ["Account marked for review", "Yesterday", Eye], ["Local record preserved", "3 days ago", LockKeyhole]].map(([event, time, Icon]) => <div className="activity-row" key={event}><span className="activity-icon"><Icon size={15} /></span><span><strong>{event}</strong><small>{time}</small></span></div>)}</div></Panel></DashboardShell>;
}

function Panel({ title, action, href, children }) {
  return <section className="panel"><div className="panel-head"><h3>{title}</h3>{action && <Link href={href}>{action} <ArrowRight size={14} /></Link>}</div>{children}</section>;
}

function AccountRow({ account, onAction }) {
  const Icon = account.icon || Globe2;
  const statusStr = account.status || "Review";
  const statusClass = statusStr.toLowerCase().replace(/_/g, "-");
  return (
    <div className="account-row">
      <span className={`account-logo ${account.color || "cyan"}`}>
        <Icon size={17} />
      </span>
      <span className="account-info">
        <strong>{account.name}</strong>
        <small>{account.category} · {account.domain || account.email}</small>
      </span>
      <span className={`status status-${statusClass}`}>
        {account.riskLevel ? `${account.riskLevel} (${account.status || "UNREVIEWED"})` : account.status}
      </span>
      {onAction && (
        <button className="icon-button small-icon" onClick={() => onAction(account)} aria-label={`Open ${account.name}`}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export function AccountsPage() {
  const {
    isLive: contextIsLive,
    assets: contextAssets,
    scanInbox,
    isScanning,
    updateAccountStatus,
    removeAccount,
    scanMessage,
  } = useGhostGuard();

  const [localAssets, setLocalAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [localAdded, setLocalAdded] = useState([]);
  const [removedDomains, setRemovedDomains] = useState(new Set());

  const isLiveEffective = contextIsLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  // Immediate on-mount fetch for live accounts if not loaded
  useEffect(() => {
    let active = true;

    async function loadRealAccounts() {
      if (contextAssets && contextAssets.length > 0) return;
      setLoading(true);
      try {
        const scanRes = await auditApi.scan();
        if (active && scanRes?.assets) {
          setLocalAssets(scanRes.assets);
        }
      } catch (err) {
        try {
          const accRes = await auditApi.getAccounts();
          if (active && accRes?.assets) {
            setLocalAssets(accRes.assets);
          }
        } catch {}
      } finally {
        if (active) setLoading(false);
      }
    }

    if (isLiveEffective) {
      loadRealAccounts();
    }

    return () => { active = false; };
  }, [isLiveEffective, contextAssets]);

  const activeAssets = (contextAssets && contextAssets.length > 0) ? contextAssets : localAssets;

  // Live assets mapped to Account format, filtering out removed records
  const mappedLiveRecords = (activeAssets && activeAssets.length > 0)
    ? activeAssets
        .filter((a) => !removedDomains.has(a.domain) && !removedDomains.has(a.serviceName) && !removedDomains.has(String(a.id)))
        .map((a, i) => mapBackendAssetToAccount(a, i))
    : (isLiveEffective ? [] : accounts.filter((a) => !removedDomains.has(String(a.id)) && !removedDomains.has(a.name)));

  const records = [
    ...localAdded.filter((a) => !removedDomains.has(String(a.id)) && !removedDomains.has(a.domain)),
    ...mappedLiveRecords
  ];

  const handleRescan = async () => {
    try {
      await scanInbox();
    } catch (err) {
      alert(`Rescan error: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (domain, newStatus) => {
    try {
      await updateAccountStatus(domain, newStatus);
      setLocalAssets((prev) =>
        prev.map((acc) =>
          acc.domain === domain || acc.serviceName === domain
            ? { ...acc, status: newStatus, rawStatus: newStatus }
            : acc
        )
      );
      if (selected && (selected.domain === domain || selected.name === domain)) {
        setSelected((prev) => ({ ...prev, status: newStatus, rawStatus: newStatus }));
      }
    } catch (e) {
      console.warn("Could not update account status:", e);
    }
  };

  const handleDeleteAccount = async (targetAccount) => {
    const rawDomain = targetAccount?.domain || targetAccount?.name || (typeof targetAccount === "string" ? targetAccount : "");
    const rawId = targetAccount?.id || rawDomain;

    // Optimistically remove from frontend list
    setRemovedDomains((prev) => new Set([...prev, String(rawDomain), String(rawId)]));
    setLocalAssets((prev) => prev.filter((acc) => acc.domain !== rawDomain && acc.serviceName !== rawDomain && String(acc.id) !== String(rawId)));
    setLocalAdded((prev) => prev.filter((acc) => acc.domain !== rawDomain && String(acc.id) !== String(rawId)));
    setSelected(null);

    try {
      if (removeAccount) {
        await removeAccount(rawDomain);
      } else {
        await auditApi.removeAsset(rawDomain);
      }
    } catch (err) {
      console.error("Failed to remove record:", err);
    }
  };

  const categoriesList = ["All categories", ...Array.from(new Set(records.map((r) => r.category).filter(Boolean)))];

  const filtered = records.filter((account) => {
    const matchesSearch = account.name.toLowerCase().includes(search.toLowerCase()) ||
      (account.domain && account.domain.toLowerCase().includes(search.toLowerCase())) ||
      (account.email && account.email.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = category === "All categories" || account.category === category;
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "Dormant" && (account.isDormant || account.status === "Review")) ||
      (statusFilter === "High Risk" && account.riskLevel === "High") ||
      account.status === statusFilter ||
      account.rawStatus === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <DashboardShell title="All accounts" description="Your digital identity inventory, audited and scored.">
      {!isLiveEffective && <DemoBanner />}

      <div className="page-actions">
        <div>
          <h2>Account inventory <span className="count-badge">{records.length}</span></h2>
          <p>{scanMessage || (isLiveEffective ? "Live synced with Gmail API scan." : "Local audit store records.")}</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="button button-ghost" onClick={handleRescan} disabled={isScanning || loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={15} /> {isScanning ? "Scanning..." : "Rescan Inbox"}
          </button>
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add account
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="filter-search">
          <Search size={16} />
          <input placeholder="Search domain, name, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          {categoriesList.map((cat) => <option key={cat}>{cat}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" style={{ width: "auto", minWidth: "130px", color: "var(--muted)", background: "var(--surface)" }}>
          <option value="All">Status: All</option>
          <option value="Dormant">Status: Dormant</option>
          <option value="High Risk">Risk: High</option>
          <option value="SECURED">SECURED</option>
          <option value="KEPT">KEPT</option>
          <option value="REVOKED">REVOKED</option>
          <option value="MARKED_FOR_DELETION">FOR DELETION</option>
        </select>
      </div>

      <div className="accounts-table">
        <div className="table-head">
          <span>Service & Domain</span>
          <span>Category</span>
          <span>First Detected</span>
          <span>Risk & Ghost Score</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {(isScanning || loading) && records.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--cyan)" }}>
            <Sparkles className="animate-spin" size={26} style={{ margin: "0 auto 12px" }} />
            <strong style={{ display: "block", fontSize: "15px", color: "var(--foreground)" }}>Auditing Gmail inbox for orphaned assets...</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "13px" }}>Connecting to Gmail API, reading account confirmations, and calculating risk telemetry.</p>
          </div>
        ) : filtered.map((account) => (
          <div className="table-row" key={account.id} style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1.2fr 1fr 1.2fr", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <span className={`account-logo ${account.color || "cyan"}`} style={{ flexShrink: 0, width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: "8px" }}>
                <Globe2 size={16} />
              </span>
              <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                <strong style={{ display: "block", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.serviceName || account.name}</strong>
                <small style={{ color: "var(--muted)", fontSize: "12px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.domain || account.email}</small>
              </div>
            </div>
            <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{account.category}</span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{account.detectedDateFormatted || account.activity}</span>
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "4px",
                background: (account.riskLevel === "High" || account.riskLevel === "HIGH") ? "rgba(244, 63, 94, 0.15)" : (account.riskLevel === "Medium" || account.riskLevel === "MEDIUM") ? "rgba(251, 146, 60, 0.15)" : "rgba(74, 222, 128, 0.15)",
                color: (account.riskLevel === "High" || account.riskLevel === "HIGH") ? "#fb7185" : (account.riskLevel === "Medium" || account.riskLevel === "MEDIUM") ? "#fb923c" : "#4ade80"
              }}>
                {account.riskLevel || "LOW"} · {account.ghostScore}/100
              </span>
            </div>
            <div>
              <span className={`status status-${(account.status || "review").toLowerCase().replace(/_/g, "-")}`}>
                {account.status || "UNREVIEWED"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                className="button button-ghost button-small"
                style={{ padding: "4px 8px", fontSize: "11px", minHeight: "28px" }}
                onClick={() => handleUpdateStatus(account.domain, "SECURED")}
                title="Mark as Secured"
              >
                Secure
              </button>
              <button
                className="button button-ghost button-small"
                style={{ padding: "4px 8px", fontSize: "11px", minHeight: "28px", color: "var(--orange)", borderColor: "rgba(251, 146, 60, 0.3)" }}
                onClick={() => handleUpdateStatus(account.domain, "REVOKED")}
                title="Revoke access"
              >
                Revoke
              </button>
              <button className="text-button" onClick={() => setSelected(account)} style={{ fontSize: "12px", padding: "4px" }}>
                Details <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {!(isScanning || loading) && filtered.length === 0 && (
          <div className="empty-state">
            <Search size={25} />
            <h3>No matching accounts</h3>
            <p>Try a different search or filter criteria.</p>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="Add an account" onClose={() => setShowForm(false)}>
          <form className="modal-form" onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setLocalAdded([{
              id: Date.now(),
              domain: form.get("url") || form.get("platform").toLowerCase().replace(/\s+/g, "") + ".com",
              name: form.get("platform"),
              category: form.get("category"),
              email: form.get("email") || "Not specified",
              status: "Review",
              rawStatus: "UNREVIEWED",
              activity: "Just now",
              color: "cyan",
              icon: Globe2
            }, ...localAdded]);
            setShowForm(false);
          }}>
            <p className="modal-note"><LockKeyhole size={15} /> This creates a local demo record in this session.</p>
            <label>Platform name<input name="platform" required placeholder="e.g. Linear" /></label>
            <label>Website URL<input name="url" type="url" placeholder="https://example.com" /></label>
            <label>Email used<input name="email" type="email" placeholder="you@example.com" /></label>
            <label>Category
              <select name="category">
                <option>Productivity & Collaboration</option>
                <option>Developer & Cloud</option>
                <option>Financial Services</option>
                <option>Creative & Design</option>
                <option>Storage</option>
              </select>
            </label>
            <label>Notes<textarea name="notes" rows="3" placeholder="Optional context" /></label>
            <button className="button button-primary button-full" type="submit">Add record <Plus size={16} /></button>
          </form>
        </Modal>
      )}

      {selected && (
        <AccountDetail
          account={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDeleteAccount}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </DashboardShell>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function AccountDetail({ account, onClose, onDelete, onUpdateStatus }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const Icon = account.icon || Globe2;

  const handleAction = async (actionKey) => {
    setSubmitting(true);
    setMessage("");
    try {
      const rawDomain = account.domain || account.name || "";
      if (rawDomain) {
        await auditApi.updateAction({
          domain: rawDomain,
          action: actionKey,
        });
      }
      if (onUpdateStatus) {
        onUpdateStatus(rawDomain, actionKey);
      }
      setMessage(`Status updated to "${actionKey}" successfully in audit store.`);
    } catch (err) {
      setMessage(`Action note: ${err.message || "Updated in local state."}`);
      if (onUpdateStatus) {
        onUpdateStatus(account.domain || account.name, actionKey);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRecord = async () => {
    setSubmitting(true);
    try {
      const rawDomain = account.domain || account.name || "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/audit/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: rawDomain, action: 'REMOVE_RECORD' })
      });
      if (res.ok) {
        if (onDelete) {
          onDelete(account);
        }
        onClose();
      } else {
        if (onDelete) {
          onDelete(account);
        }
        onClose();
      }
    } catch (err) {
      console.error('Failed to remove record:', err);
      if (onDelete) {
        onDelete(account);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSecure = async () => {
    await handleAction("SECURED");
    const rawDomain = account.domain || account.name || "";
    if (rawDomain) {
      const targetUrl = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRevoke = async () => {
    await handleAction("REVOKED");
    window.open("https://myaccount.google.com/connections", "_blank", "noopener,noreferrer");
  };

  const handleKeep = async () => {
    await handleAction("KEPT");
  };

  const handleMarkForDeletion = async () => {
    await handleAction("MARKED_FOR_DELETION");
  };

  return (
    <Modal title={account.name} onClose={onClose}>
      <div className="detail-hero">
        <span className={`account-logo large ${account.color || "cyan"}`}>
          <Icon size={24} />
        </span>
        <div>
          <strong>{account.category}</strong>
          <span>{account.domain ? `${account.domain} · ` : ""}{account.email}</span>
        </div>
        <span className={`status status-${(account.status || "review").toLowerCase().replace(/_/g, "-")}`}>
          {account.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", margin: "14px 0", padding: "12px", background: "var(--surface-strong)", borderRadius: "10px" }}>
        <div>
          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Risk Level</span>
          <strong style={{ fontSize: "13px", color: account.riskLevel === "High" ? "#fb7185" : account.riskLevel === "Medium" ? "#fb923c" : "#4ade80" }}>
            {account.riskLevel || "Low"}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Ghost Score</span>
          <strong style={{ fontSize: "13px" }}>{account.ghostScore ?? 0}/100</strong>
        </div>
        <div>
          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Dormancy</span>
          <strong style={{ fontSize: "13px", color: account.isDormant ? "#fb923c" : "var(--foreground)" }}>
            {account.isDormant ? "Dormant" : "Active"}
          </strong>
        </div>
      </div>

      {account.remediationTip && (
        <div style={{ margin: "12px 0", padding: "10px 14px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.25)" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--violet)", display: "block", marginBottom: "3px" }}>
            Remediation Recommendation
          </span>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--foreground)" }}>
            {account.remediationTip}
          </p>
        </div>
      )}

      {account.snippet && (
        <div style={{ margin: "10px 0 16px", padding: "10px", borderRadius: "8px", background: "var(--surface-soft)", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>
            Detected Email Snippet
          </span>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>
            &ldquo;{account.snippet}&rdquo;
          </p>
        </div>
      )}

      <p className="modal-note">
        Select a remediation status to persist into the GhostGuard audit ledger:
      </p>

      <div className="action-buttons">
        <button
          type="button"
          disabled={submitting}
          onClick={handleKeep}
          style={{ borderColor: account.status === "KEPT" ? "var(--green)" : undefined }}
        >
          {account.status === "KEPT" ? "✓ KEPT" : "KEEP"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSecure}
          style={{ borderColor: account.status === "SECURED" ? "var(--green)" : undefined }}
        >
          {account.status === "SECURED" ? "✓ SECURED" : "SECURE"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleRevoke}
          style={{ borderColor: account.status === "REVOKED" ? "var(--orange)" : undefined }}
        >
          {account.status === "REVOKED" ? "✓ REVOKED" : "REVOKE"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleMarkForDeletion}
          style={{ borderColor: account.status === "MARKED_FOR_DELETION" ? "#fb7185" : undefined }}
        >
          {account.status === "MARKED_FOR_DELETION" ? "✓ FOR DELETION" : "MARK FOR DELETION"}
        </button>
        <button
          type="button"
          className="danger-action"
          disabled={submitting}
          onClick={handleRemoveRecord}
        >
          <Trash2 size={15} /> REMOVE RECORD
        </button>
      </div>

      {message && (
        <p className="success-text">
          <Check size={15} /> {message}
        </p>
      )}
    </Modal>
  );
}

export { AccountDetail, Modal, AccountDetail as AccountModal };

export function IdentityMapPage() {
  return <CategorizedFootprintDirectory />;
}

export { CategorizedFootprintDirectory };

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isLive, userEmail, userName, assets, refreshData, logout, deadManArmed, triggerDeadManSwitch, disarmDeadManSwitch } = useGhostGuard();
  const [isDeadManModalOpen, setIsDeadManModalOpen] = useState(false);
  const [disarmingSwitch, setDisarmingSwitch] = useState(false);

  const handleArmDeadMan = async ({ confirmation, password }) => {
    await triggerDeadManSwitch({ confirmation });
  };

  const handleDisarmSwitch = async () => {
    setDisarmingSwitch(true);
    try {
      await disarmDeadManSwitch();
    } catch (err) {
      alert("Failed to disarm Dead Man's Switch: " + (err.message || "Unknown error"));
    } finally {
      setDisarmingSwitch(false);
    }
  };

  const isLiveEffective = isLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  const effectiveEmail = userEmail || (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("email") || window.localStorage.getItem("ghostguard_email")) : "") || "";
  const initialName = userName || (effectiveEmail ? effectiveEmail.split("@")[0] : (isLiveEffective ? "Workspace Admin" : "User"));

  // 1. Tab switching state
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'appearance' | 'notifications' | 'privacy' | 'account'

  // Profile form state
  const [fullName, setFullName] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("ghostguard_user_name") || initialName;
    }
    return initialName;
  });
  const [savedProfile, setSavedProfile] = useState(false);

  // Notification preference toggles
  const [weeklyReview, setWeeklyReview] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [breachNotices, setBreachNotices] = useState(true);
  const [savedNotifications, setSavedNotifications] = useState(false);

  // Motion reduction state
  const [reduceMotion, setReduceMotion] = useState(false);

  // Cache & Export states
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [exporting, setExporting] = useState(false);

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.includes("@")) {
      const parts = email.split("@")[0].split(/[._-]/);
      if (parts.length >= 2 && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.slice(0, 2).toUpperCase();
    }
    return "GG";
  };

  const initials = getInitials(fullName, effectiveEmail);

  const tabs = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Data", icon: ShieldCheck },
    { id: "account", label: "Account & Danger Zone", icon: LockKeyhole },
  ];

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ghostguard_user_name", fullName);
    }
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 3000);
  };

  const handleSaveNotifications = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "ghostguard_notification_prefs",
        JSON.stringify({ weeklyReview, criticalAlerts, breachNotices })
      );
    }
    setSavedNotifications(true);
    setTimeout(() => setSavedNotifications(false), 3000);
  };

  const handleClearCache = async () => {
    if (!window.confirm("Are you sure you want to clear your local audit store cache? This will reset all discovered accounts.")) {
      return;
    }
    setClearingCache(true);
    try {
      await auditApi.clearCache();
      if (refreshData) {
        await refreshData();
      }
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 4000);
    } catch (err) {
      console.error("Failed clearing audit cache:", err);
      alert(`Could not clear cache: ${err.message}`);
    } finally {
      setClearingCache(false);
    }
  };

  const handleExportTelemetry = () => {
    try {
      setExporting(true);
      const exportData = {
        exportedAt: new Date().toISOString(),
        auditedIdentity: effectiveEmail || "GhostGuard User",
        totalDiscovered: assets ? assets.length : 0,
        assets: assets || [],
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `ghostguard-telemetry-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setTimeout(() => setExporting(false), 1200);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your Google account and revoke session? You will be returned to the home screen.")) {
      return;
    }
    try {
      if (auth && typeof auth.signOut === "function") {
        await auth.signOut();
      }
    } catch {}
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ghostguard-demo-session");
      window.localStorage.removeItem("ghostguard_auth");
      window.localStorage.removeItem("ghostguard_mode");
      window.localStorage.removeItem("ghostguard_email");
      window.localStorage.removeItem("ghostguard_id_token");
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.href = "/";
    }
  };

  return (
    <DashboardShell
      title="Settings"
      description="Manage preferences, notification triggers, and privacy controls."
    >
      <DemoBanner />
      <div className="settings-modern-layout">
        {/* Left Sub-Navigation Sidebar */}
        <aside className="settings-sidebar-card">
          <div style={{ padding: "4px 8px 8px", borderBottom: "1px solid rgba(74, 222, 128, 0.1)", marginBottom: "4px" }}>
            <span className="eyebrow" style={{ color: "#4ade80", fontSize: "10px" }}>WORKSPACE PREFERENCES</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-tab-btn ${isActive ? "active" : ""}`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {isActive && <ChevronRight size={14} style={{ marginLeft: "auto", color: "#4ade80" }} />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Active Tab Content Panel */}
        <div style={{ minWidth: 0 }}>
          <AnimatePresence mode="wait">
            {/* 1. PROFILE TAB */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="settings-panel-card"
              >
                <div className="settings-panel-header">
                  <h2 className="settings-panel-title">Profile Information</h2>
                  <p className="settings-panel-subtitle">
                    Manage your display credentials, personal information, and authenticated identity.
                  </p>
                </div>

                {/* Avatar Section */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    background: "rgba(15, 24, 19, 0.4)",
                    borderRadius: "12px",
                    border: "1px solid rgba(74, 222, 128, 0.1)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      background: "rgba(74, 222, 128, 0.15)",
                      border: "1.5px solid rgba(74, 222, 128, 0.35)",
                      color: "#4ade80",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "14px", color: "#f0fdf4" }}>{fullName || "User Profile"}</strong>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "9999px",
                          background: "rgba(74, 222, 128, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(74, 222, 128, 0.3)",
                        }}
                      >
                        ● Google Verified
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="button button-ghost"
                        style={{ padding: "5px 12px", fontSize: "11.5px", minHeight: "32px" }}
                        onClick={() => {
                          if (effectiveEmail) {
                            setFullName(effectiveEmail.split("@")[0]);
                            setSavedProfile(true);
                            setTimeout(() => setSavedProfile(false), 3000);
                          }
                        }}
                      >
                        <RefreshCw size={13} style={{ marginRight: "4px" }} /> Sync from Google
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "16px" }}>
                  <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
                    Full Name / Display Name
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your display name"
                      style={{
                        padding: "11px 14px",
                        borderRadius: "9px",
                        background: "rgba(15, 24, 19, 0.6)",
                        border: "1px solid rgba(74, 222, 128, 0.2)",
                        color: "#f0fdf4",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "7px", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
                    Email Address (Managed by Google)
                    <input
                      readOnly
                      value={effectiveEmail || "user@gmail.com"}
                      style={{
                        padding: "11px 14px",
                        borderRadius: "9px",
                        background: "rgba(15, 24, 19, 0.3)",
                        border: "1px solid rgba(74, 222, 128, 0.1)",
                        color: "#94a3b8",
                        fontSize: "14px",
                        cursor: "not-allowed",
                      }}
                    />
                    <small style={{ color: "#64748b", fontSize: "11px" }}>
                      Managed via Google OAuth 2.0. Primary authentication identifier for inbox audits.
                    </small>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    <button
                      type="submit"
                      className="button button-primary"
                      style={{
                        background: "#4ade80",
                        color: "#0c1a12",
                        fontWeight: 700,
                        padding: "10px 22px",
                      }}
                    >
                      Save Changes <Check size={16} />
                    </button>
                    {savedProfile && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>
                        <Check size={15} /> Profile changes saved successfully.
                      </span>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {/* 2. APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="settings-panel-card"
              >
                <div className="settings-panel-header">
                  <h2 className="settings-panel-title">Appearance &amp; Interface</h2>
                  <p className="settings-panel-subtitle">
                    Choose how GhostGuard feels across your workspace.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                  {/* Dark Theme Option */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "16px",
                      borderRadius: "12px",
                      border: theme === "dark" ? "1.5px solid #4ade80" : "1px solid rgba(74, 222, 128, 0.14)",
                      background: theme === "dark" ? "rgba(74, 222, 128, 0.08)" : "rgba(15, 24, 19, 0.4)",
                      cursor: "pointer",
                      textAlign: "left",
                      position: "relative",
                      transition: "all 0.15s ease",
                      boxShadow: theme === "dark" ? "0 0 16px rgba(74, 222, 128, 0.15)" : "none",
                    }}
                  >
                    <span
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#0f1813",
                        border: "1px solid #4ade80",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Moon size={18} style={{ color: "#4ade80" }} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>Dark theme</strong>
                      <small style={{ color: "#94a3b8", fontSize: "11px" }}>Midnight forest &amp; cyber emerald</small>
                    </div>
                    {theme === "dark" && <Check size={18} style={{ color: "#4ade80" }} />}
                  </button>

                  {/* Light Theme Option */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "16px",
                      borderRadius: "12px",
                      border: theme === "light" ? "1.5px solid #4ade80" : "1px solid rgba(74, 222, 128, 0.14)",
                      background: theme === "light" ? "rgba(74, 222, 128, 0.08)" : "rgba(15, 24, 19, 0.4)",
                      cursor: "pointer",
                      textAlign: "left",
                      position: "relative",
                      transition: "all 0.15s ease",
                      boxShadow: theme === "light" ? "0 0 16px rgba(74, 222, 128, 0.15)" : "none",
                    }}
                  >
                    <span
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#ffffff",
                        border: "1px solid rgba(148, 163, 184, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Sun size={18} style={{ color: "#f59e0b" }} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>Light theme</strong>
                      <small style={{ color: "#94a3b8", fontSize: "11px" }}>Clean white &amp; soft lavender</small>
                    </div>
                    {theme === "light" && <Check size={18} style={{ color: "#4ade80" }} />}
                  </button>
                </div>

                {/* Motion Reduction Preference */}
                <div className="settings-card-row">
                  <div>
                    <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>Motion Reduction</strong>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      Respect reduced motion preferences for interface transitions and 3D globe rendering.
                    </span>
                  </div>
                  <ToggleSwitch
                    id="motion-reduction"
                    label="Toggle motion reduction"
                    checked={reduceMotion}
                    onChange={setReduceMotion}
                  />
                </div>
              </motion.div>
            )}

            {/* 3. NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="settings-panel-card"
              >
                <div className="settings-panel-header">
                  <h2 className="settings-panel-title">Audit Alerts &amp; Notifications</h2>
                  <p className="settings-panel-subtitle">
                    Configure real-time alerting channels for orphaned and exposed digital assets.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  {/* Toggle 1: Weekly identity hygiene review */}
                  <div className="settings-card-row">
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>
                        Weekly identity hygiene review
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                        Receive a scheduled digest summary of dormant accounts and security score fluctuations.
                      </span>
                    </div>
                    <ToggleSwitch
                      id="weekly-review"
                      label="Toggle weekly review"
                      checked={weeklyReview}
                      onChange={setWeeklyReview}
                    />
                  </div>

                  {/* Toggle 2: Critical ghost asset alerts */}
                  <div className="settings-card-row">
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>
                        Critical ghost asset alerts
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                        Immediate alerting when a high-risk external account is detected inactive for over 12 months.
                      </span>
                    </div>
                    <ToggleSwitch
                      id="critical-alerts"
                      label="Toggle critical alerts"
                      checked={criticalAlerts}
                      onChange={setCriticalAlerts}
                    />
                  </div>

                  {/* Toggle 3: Immediate breach exposure notices */}
                  <div className="settings-card-row">
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>
                        Immediate breach exposure notices
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                        Push telemetry notifications whenever an audited domain is cited in known credential leak feeds.
                      </span>
                    </div>
                    <ToggleSwitch
                      id="breach-notices"
                      label="Toggle breach notices"
                      checked={breachNotices}
                      onChange={setBreachNotices}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="button button-primary"
                    style={{ background: "#4ade80", color: "#0c1a12", fontWeight: 700, padding: "10px 22px" }}
                  >
                    Save Alert Preferences <Check size={16} />
                  </button>
                  {savedNotifications && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>
                      <Check size={15} /> Preferences saved.
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. PRIVACY & DATA TAB */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="settings-panel-card"
              >
                <div className="settings-panel-header">
                  <h2 className="settings-panel-title">Privacy &amp; Data Retention</h2>
                  <p className="settings-panel-subtitle">
                    GhostGuard is architected with zero-trust principles for user metadata.
                  </p>
                </div>

                {/* Data Retention Policy Disclosure */}
                <div
                  style={{
                    padding: "18px 20px",
                    background: "rgba(74, 222, 128, 0.06)",
                    border: "1px solid rgba(74, 222, 128, 0.22)",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#4ade80" }}>
                    <ShieldCheck size={22} />
                    <strong style={{ fontSize: "14.5px" }}>Zero-Knowledge Local Analysis</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#f0fdf4", lineHeight: 1.55 }}>
                    Your inbox scan metadata is stored locally and never sold to third parties.
                  </p>
                  <ul style={{ margin: "4px 0 0", paddingLeft: "18px", color: "#94a3b8", fontSize: "11.5px", lineHeight: 1.6 }}>
                    <li><strong>Local Cache Only:</strong> Account discovery metadata is stored directly in <code style={{ color: "#4ade80" }}>data/audit_store.json</code> on your private instance.</li>
                    <li><strong>No Content Harvesting:</strong> Email body text, attachments, passwords, and message contents are never parsed or persisted.</li>
                    <li><strong>Instant Purge:</strong> You retain complete ownership and can clear all audit findings at any time.</li>
                  </ul>
                </div>

                {/* Storage Telemetry Stats */}
                <div className="settings-card-row">
                  <div>
                    <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>Local Store File</strong>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      Active findings file: <code style={{ color: "#86efac" }}>data/audit_store.json</code> ({assets?.length || 0} discovered services)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(74, 222, 128, 0.12)",
                      color: "#4ade80",
                      border: "1px solid rgba(74, 222, 128, 0.25)",
                    }}
                  >
                    ISOLATED
                  </span>
                </div>

                {/* Clear Audit Cache Button */}
                <div className="settings-card-row" style={{ borderColor: "rgba(248, 113, 113, 0.25)" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "13.5px", color: "#fca5a5" }}>Clear Audit Cache</strong>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      Permanently wipes cached records in <code style={{ color: "#f87171" }}>data/audit_store.json</code> and resets scanned inventory.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="button"
                    style={{
                      background: "rgba(248, 113, 113, 0.12)",
                      border: "1px solid rgba(248, 113, 113, 0.35)",
                      color: "#fca5a5",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "8px 16px",
                      minHeight: "36px",
                    }}
                  >
                    {clearingCache ? <GhostGuardLoader inline /> : <Trash2 size={14} />} Clear Audit Cache
                  </button>
                </div>
                {cacheCleared && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>
                    <Check size={15} /> Audit cache cleared. Local database has been reset.
                  </span>
                )}
              </motion.div>
            )}

            {/* 5. ACCOUNT & DANGER ZONE TAB */}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="settings-panel-card"
              >
                <div className="settings-panel-header">
                  <h2 className="settings-panel-title">Account &amp; Danger Zone</h2>
                  <p className="settings-panel-subtitle">
                    Manage your authorization tokens and export telemetry history.
                  </p>
                </div>

                {/* Export Telemetry */}
                <div className="settings-card-row">
                  <div>
                    <strong style={{ display: "block", fontSize: "13.5px", color: "#f0fdf4" }}>Export Audit Telemetry</strong>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      Download a structured JSON archive containing all {assets?.length || 0} discovered services, risk telemetry, and remediation notes.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportTelemetry}
                    disabled={exporting}
                    className="button"
                    style={{
                      background: "rgba(74, 222, 128, 0.1)",
                      border: "1px solid rgba(74, 222, 128, 0.3)",
                      color: "#4ade80",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "8px 16px",
                      minHeight: "36px",
                    }}
                  >
                    <Download size={14} /> {exporting ? "Exporting..." : "Export Audit Telemetry"}
                  </button>
                </div>

                {/* Disconnect Google Account */}
                <div className="settings-card-row" style={{ borderColor: "rgba(248, 113, 113, 0.3)" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "13.5px", color: "#f87171" }}>Disconnect Google Account</strong>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                      Revokes local session authorization and disconnects GhostGuard from {effectiveEmail || "Google Workspace"}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="button"
                    style={{
                      background: "rgba(248, 113, 113, 0.15)",
                      border: "1px solid rgba(248, 113, 113, 0.4)",
                      color: "#fca5a5",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "8px 16px",
                      minHeight: "36px",
                    }}
                  >
                    <LogOut size={14} /> Disconnect Google Account
                  </button>
                </div>

                {/* Emergency Protocol: Dead Man's Switch */}
                <div
                  className="settings-card-row"
                  style={{
                    borderColor: deadManArmed ? "rgba(239, 68, 68, 0.7)" : "rgba(239, 68, 68, 0.35)",
                    background: deadManArmed ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                    borderRadius: "10px",
                    padding: "16px",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <AlertOctagon size={16} style={{ color: "#ef4444" }} />
                      <strong style={{ fontSize: "14px", color: "#fca5a5" }}>
                        Emergency Protocol: Dead Man&apos;s Switch
                      </strong>
                      {deadManArmed && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            background: "#ef4444",
                            color: "#ffffff",
                            letterSpacing: "0.5px",
                          }}
                        >
                          ARMED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8", display: "block", lineHeight: "1.5" }}>
                      Autonomous digital footprint purge. In a critical perimeter compromise, arms emergency decommissioning to mark all {assets?.length || 0} discovered accounts for deletion (<code style={{ color: "#f87171" }}>MARKED_FOR_DELETION</code>). Strictly requires re-authentication.
                    </span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {deadManArmed ? (
                      <button
                        type="button"
                        onClick={handleDisarmSwitch}
                        disabled={disarmingSwitch}
                        className="button"
                        style={{
                          background: "#b91c1c",
                          border: "1px solid #ef4444",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "8px 16px",
                          minHeight: "36px",
                          boxShadow: "0 0 12px rgba(239, 68, 68, 0.4)",
                          cursor: disarmingSwitch ? "wait" : "pointer",
                        }}
                      >
                        <ShieldAlert size={14} />
                        {disarmingSwitch ? "Disarming..." : "Disarm Protocol"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeadManModalOpen(true)}
                        className="button"
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.5)",
                          color: "#fca5a5",
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "8px 16px",
                          minHeight: "36px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <AlertOctagon size={14} /> ⚠️ Arm Dead Man&apos;s Switch
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <DeadManAuthModal
        isOpen={isDeadManModalOpen}
        onClose={() => setIsDeadManModalOpen(false)}
        onArmed={handleArmDeadMan}
        accountCount={assets?.length || 0}
      />
    </DashboardShell>
  );
}

function ToggleSwitch({ checked, onChange, id, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "9999px",
        background: checked ? "#4ade80" : "rgba(148, 163, 184, 0.2)",
        border: checked ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(148, 163, 184, 0.3)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
        boxShadow: checked ? "0 0 10px rgba(74, 222, 128, 0.3)" : "none",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: checked ? "22px" : "2px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: checked ? "#0f1813" : "#cbd5e1",
          transition: "left 0.2s ease, background 0.2s ease",
        }}
      />
    </button>
  );
}

import DigitalFootprintTimeline from "./DigitalFootprintTimeline";
import BreachWatch from "./BreachWatch";
export { DigitalFootprintTimeline, DigitalFootprintTimeline as TimelinePage, BreachWatch, BreachWatch as BreachWatchPage, GhostAICopilot };

