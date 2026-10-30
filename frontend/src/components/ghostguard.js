"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
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
  Network,
  Plus,
  Search,
  Settings,
  Shield,
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
import api, { authApi, auditApi, API_BASE_URL } from "@/lib/api";

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
  refreshData: async () => {},
  scanInbox: async () => {},
  updateAccountStatus: async () => {},
  removeAccount: async () => {},
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

  useEffect(() => {
    let active = true;

    async function checkAuthAndLoad() {
      let live = false;
      let email = "";

      if (typeof window !== "undefined") {
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
          email = window.localStorage.getItem("ghostguard_email") || "";
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
      try {
        const scanRes = await auditApi.scan();
        if (scanRes && scanRes.assets) {
          setAssets(scanRes.assets);
          setScanMessage(`Discovered ${scanRes.assets.length} registered accounts.`);
          setSessionExpired(false);
        }
      } catch (scanErr) {
        if (scanErr.status === 401) {
          setSessionExpired(true);
          try {
            const accountsRes = await auditApi.getAccounts();
            if (accountsRes && accountsRes.assets && accountsRes.assets.length > 0) {
              setAssets(accountsRes.assets);
            }
          } catch {}
        }
      }

      // 2. Fetch stats
      try {
        const statsRes = await auditApi.getStats();
        if (statsRes && statsRes.stats) {
          setStats(statsRes.stats);
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
        setScanMessage(`Scan complete: Discovered ${scanRes.count || scanRes.assets.length} registered accounts.`);

        const statsRes = await auditApi.getStats();
        if (statsRes && statsRes.stats) setStats(statsRes.stats);

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

  async function logout() {
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ghostguard-demo-session");
      window.localStorage.removeItem("ghostguard_auth");
      window.localStorage.removeItem("ghostguard_mode");
      window.localStorage.removeItem("ghostguard_email");
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
  function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    if (!form.get("email") || (!forgot && !form.get("password")) || (!login && !forgot && !form.get("name"))) {
      setError("Please complete the required fields to continue.");
      return;
    }
    if (!login && !forgot && form.get("password") !== form.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    if (!forgot && !login && !form.get("terms")) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    setError("");
    if (login) {
      const registration = JSON.parse(window.localStorage.getItem("ghostguard-demo-registration") || "null");
      if (!registration || registration.email !== form.get("email") || registration.password !== form.get("password")) {
        setError("Use the email and password from your demo registration.");
        return;
      }
    }
    setSubmitting(true);
    if (login) {
      window.localStorage.setItem("ghostguard-demo-session", JSON.stringify({ email: form.get("email"), createdAt: Date.now() }));
      router.push("/dashboard");
      return;
    }
    window.localStorage.setItem("ghostguard-demo-registration", JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }));
    setSubmitted(true);
  }
  const title = forgot ? "Reset your demo password" : login ? "Log in to your workspace" : "Create your GhostGuard account";
  const eyebrow = forgot ? "Account recovery" : login ? "Welcome back" : "Start with clarity";
  return <PublicShell><section className="auth-page auth-page-form-only"><div className="auth-form-wrap"><div className="auth-form"><div className="mobile-auth-logo"><Logo /></div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p className="auth-subtitle">{forgot ? "Enter your email to receive a frontend-only recovery confirmation." : login ? "Use the demo form below to explore the experience." : "This creates a frontend demo state only — you will continue to login before opening the dashboard."}</p>{submitted ? <div className="success-panel"><span className="success-icon"><Check /></span><h3>{forgot ? "Demo recovery request ready" : "Demo registration complete"}</h3><p>{forgot ? "This is a frontend-only experience. No email was sent." : "Your demo registration is ready. Log in to continue to the dashboard."}</p><Link href="/login" className="button button-primary">{forgot ? "Return to login" : "Continue to login"} <ArrowRight size={16} /></Link></div> : <>
  {!forgot && (
    <>
      <button
        type="button"
        className="button button-google button-full"
        onClick={handleGoogleLogin}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          background: "var(--surface-strong)",
          border: "1px solid var(--line-strong)",
          color: "var(--foreground)",
          padding: "12px 16px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "16px",
          width: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
        </svg>
        {login ? "Sign in with Google" : "Connect with Google"}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0 18px", color: "var(--muted)", fontSize: "12px" }}>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }} />
        <span>or continue with email</span>
        <span style={{ flex: 1, height: "1px", background: "var(--line)" }} />
      </div>
    </>
  )}
  <form onSubmit={submit} noValidate>{!login && !forgot && <label>Full name<input name="name" placeholder="Alex Morgan" /></label>}<label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>{!forgot && <label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}{!login && !forgot && <label>Confirm password<input name="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" required /></label>}{login ? <div className="form-row"><label className="checkbox"><input type="checkbox" name="remember" /> <span>Remember me</span></label><Link href="/forgot-password">Forgot password?</Link></div> : !forgot && <label className="checkbox"><input type="checkbox" required name="terms" /> <span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>}{error && <p className="form-error">{error}</p>}<button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? <><GhostGuardLoader inline /> Processing demo request</> : <>{forgot ? "Send demo recovery email" : login ? "Log in to demo" : "Create demo account"} <ArrowRight size={16} /></>}</button></form></>}<p className="auth-switch">{forgot ? "Remembered your password?" : login ? "New to GhostGuard?" : "Already have an account?"} <Link href={forgot || !login ? "/login" : "/signup"}>{forgot || !login ? "Log in" : "Create an account"}</Link></p></div></div></section></PublicShell>;
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
  const { isLive, userEmail, userName, logout, assets } = useGhostGuard();

  const isLiveEffective = isLive || (typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("auth") === "success" ||
    window.localStorage.getItem("ghostguard_auth") === "true" ||
    window.localStorage.getItem("ghostguard_mode") === "LIVE"
  ));

  const effectiveEmail = userEmail || (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("email") || window.localStorage.getItem("ghostguard_email")) : "") || "";
  const displayName = userName || (effectiveEmail ? effectiveEmail.split("@")[0] : (isLiveEffective ? "Workspace" : "Alex"));

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
          <ProfileAvatar className="workspace-avatar" />
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
          <button onClick={logout}>
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
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={18} />
              <span />
            </button>
            <ThemeToggle />
            <button className="profile-button" aria-label="Open profile menu">
              <ProfileAvatar className="profile-avatar" />
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}

function ProfileAvatar({ className = "", src = "", alt = "Profile" }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className={`profile-avatar-fallback ${className}`}>
      {src && !imageFailed ? (
        // Profile images are optional demo data; the icon remains the reliable fallback.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setImageFailed(true)} />
      ) : <UserRound size={17} aria-hidden="true" />}
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
    sessionExpired: contextSessionExpired,
  } = useGhostGuard();

  const [localStats, setLocalStats] = useState(null);
  const [localAssets, setLocalAssets] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localSessionExpired, setLocalSessionExpired] = useState(false);
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
            setLocalSessionExpired(false);
          }
        } catch (scanErr) {
          if (scanErr.status === 401) {
            if (active) setLocalSessionExpired(true);
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
          if (statsErr.status === 401 && active) {
            setLocalSessionExpired(true);
          }
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

  const stats = localStats || contextStats;
  const assets = localAssets.length > 0 ? localAssets : contextAssets;
  const loading = localLoading || contextLoading;
  const sessionExpired = localSessionExpired || contextSessionExpired;
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

      {sessionExpired && (
        <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ShieldCheck size={26} style={{ color: "#f87171" }} />
            <div>
              <strong style={{ display: "block", color: "#f8fafc", fontSize: "14px" }}>Backend session expired</strong>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>Please reconnect your Gmail to refresh active API access.</span>
            </div>
          </div>
          <button onClick={handleGoogleLogin} className="button button-primary" style={{ padding: "8px 18px", fontSize: "13px" }}>
            Reconnect Gmail
          </button>
        </div>
      )}

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
  const [saved, setSaved] = useState(false);
  return <DashboardShell title="Settings" description="Shape your GhostGuard experience."><DemoBanner /><div className="settings-layout"><div className="settings-tabs"><span className="active">Profile</span><span>Appearance</span><span>Notifications</span><span>Privacy</span><span>Account</span></div><div className="settings-content"><SettingSection title="Profile" copy="This information stays in the frontend demo only."><div className="profile-edit"><span className="profile-avatar large">A</span><button className="button button-ghost">Change avatar</button></div><div className="settings-fields"><label>Full name<input defaultValue="Alex Morgan" /></label><label>Email address<input defaultValue="alex@demo.co" type="email" /></label></div></SettingSection><SettingSection title="Appearance" copy="Choose how GhostGuard feels across your workspace."><div className="theme-options"><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-swatch dark-swatch" /><strong>Dark theme</strong><small>Midnight navy and electric violet</small>{theme === "dark" && <Check size={16} />}</button><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-swatch light-swatch" /><strong>Light theme</strong><small>Clean white and soft lavender</small>{theme === "light" && <Check size={16} />}</button></div></SettingSection><SettingSection title="Preferences" copy="Manage how your workspace behaves."><label className="toggle-row"><span><strong>Weekly identity review</strong><small>Receive a reminder to review accounts that need attention.</small></span><input type="checkbox" defaultChecked /></label><label className="toggle-row"><span><strong>Motion reduction</strong><small>Respect reduced motion preferences for interface animations.</small></span><input type="checkbox" /></label></SettingSection><button className="button button-primary" onClick={() => setSaved(true)}>Save demo preferences <Check size={16} /></button>{saved && <p className="success-text"><Check size={16} /> Preferences updated in local frontend state. No database is connected.</p>}</div></div></DashboardShell>;
}

function SettingSection({ title, copy, children }) {
  return <section className="settings-section"><div><h2>{title}</h2><p>{copy}</p></div>{children}</section>;
}
