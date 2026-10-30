"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Globe2,
  Grid2X2,
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
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as THREE from "three";

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

const navItems = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const dashboardNav = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/accounts", label: "All accounts", icon: Grid2X2 },
  { href: "/dashboard/identity-map", label: "Identity map", icon: Network },
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
        <Reveal className="hero-copy"><span className="pill"><Sparkles size={14} /> Your identity, in focus</span><div className="hero-heading-wrap"><div className="hero-identity-orbit" aria-hidden="true"><span className="hero-orbit-shield" /><span className="hero-orbit-ring hero-orbit-ring-one" /><span className="hero-orbit-ring hero-orbit-ring-two" /><span className="hero-orbit-node hero-orbit-node-one" /><span className="hero-orbit-node hero-orbit-node-two" /><span className="hero-orbit-node hero-orbit-node-three" /></div><ShieldCheck className="hero-heading-mark" size={42} aria-hidden="true" /><h1>GhostGuard</h1></div><p>Discover, visualize, and manage your digital accounts from one secure place. GhostGuard helps you understand your online presence and take control of your digital footprint.</p><div className="hero-actions"><Link href="/signup" className="button button-primary button-large">Get started free <ArrowRight size={17} /></Link><Link href="/features" className="button button-ghost button-large"><span className="play-icon">▶</span> Explore features</Link></div><div className="trust-row"><span><ShieldCheck size={15} /> Privacy-first</span><span><Zap size={15} /> Built for clarity</span><span><Users size={15} /> Human control</span></div></Reveal>
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
  return <PublicShell><section className="auth-page auth-page-form-only"><div className="auth-form-wrap"><div className="auth-form"><div className="mobile-auth-logo"><Logo /></div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p className="auth-subtitle">{forgot ? "Enter your email to receive a frontend-only recovery confirmation." : login ? "Use the demo form below to explore the experience." : "This creates a frontend demo state only — you will continue to login before opening the dashboard."}</p>{submitted ? <div className="success-panel"><span className="success-icon"><Check /></span><h3>{forgot ? "Demo recovery request ready" : "Demo registration complete"}</h3><p>{forgot ? "This is a frontend-only experience. No email was sent." : "Your demo registration is ready. Log in to continue to the dashboard."}</p><Link href="/login" className="button button-primary">{forgot ? "Return to login" : "Continue to login"} <ArrowRight size={16} /></Link></div> : <form onSubmit={submit} noValidate>{!login && !forgot && <label>Full name<input name="name" placeholder="Alex Morgan" /></label>}<label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>{!forgot && <label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}{!login && !forgot && <label>Confirm password<input name="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" required /></label>}{login ? <div className="form-row"><label className="checkbox"><input type="checkbox" name="remember" /> <span>Remember me</span></label><Link href="/forgot-password">Forgot password?</Link></div> : !forgot && <label className="checkbox"><input type="checkbox" required name="terms" /> <span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>}{error && <p className="form-error">{error}</p>}<button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? <><GhostGuardLoader inline /> Processing demo request</> : <>{forgot ? "Send demo recovery email" : login ? "Log in to demo" : "Create demo account"} <ArrowRight size={16} /></>}</button></form>}<p className="auth-switch">{forgot ? "Remembered your password?" : login ? "New to GhostGuard?" : "Already have an account?"} <Link href={forgot || !login ? "/login" : "/signup"}>{forgot || !login ? "Log in" : "Create an account"}</Link></p></div></div></section></PublicShell>;
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
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionChecked, setSessionChecked] = useState(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const active = Boolean(window.localStorage.getItem("ghostguard-demo-session"));
      setSessionChecked(active);
      if (!active) router.replace("/login");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);
  function logout() {
    window.localStorage.removeItem("ghostguard-demo-session");
    router.replace("/login");
  }
  if (sessionChecked !== true) return <GhostGuardLoader />;
  const searchResults = query.trim() ? accounts.filter((account) => `${account.name} ${account.email} ${account.category}`.toLowerCase().includes(query.toLowerCase())) : [];
  return <div className="dashboard-shell"><aside className={`dashboard-sidebar ${mobile ? "open" : ""}`}><div className="sidebar-top"><Logo /><button className="icon-button mobile-only" onClick={() => setMobile(false)} aria-label="Close dashboard menu"><X /></button></div><div className="workspace-switch"><ProfileAvatar className="workspace-avatar" /><div><strong>Alex’s workspace</strong><small>Demo workspace</small></div><ChevronDown size={15} /></div><nav className="dashboard-nav">{dashboardNav.map(({ href, label, icon: Icon }) => <Link className={pathname === href ? "active" : ""} href={href} key={href} onClick={() => setMobile(false)}><Icon size={17} />{label}</Link>)}</nav><div className="sidebar-bottom"><Link href="/"><ArrowRight size={16} /> Back to website</Link><button onClick={logout}><LogOut size={16} /> Log out <span className="demo-mini">DEMO</span></button></div></aside>{mobile && <button className="sidebar-overlay mobile-only" onClick={() => setMobile(false)} aria-label="Close sidebar" /> }<div className="dashboard-content"><header className="dashboard-header"><button className="icon-button mobile-only" onClick={() => setMobile(true)} aria-label="Open dashboard menu"><Menu /></button><div className="header-title"><span className="eyebrow">Demo workspace</span><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="header-actions"><div className="global-search"><label className="header-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." aria-label="Search dashboard" /></label>{query && <div className="global-search-results">{searchResults.length ? searchResults.map((account) => <Link href="/dashboard/accounts" key={account.id} onClick={() => setQuery("")}><strong>{account.name}</strong><small>{account.email} · {account.category}</small></Link>) : <span>No matching demo accounts</span>}</div>}</div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><span /></button><ThemeToggle /><button className="profile-button" aria-label="Open profile menu"><ProfileAvatar className="profile-avatar" /><ChevronDown size={15} /></button></div></header><main className="dashboard-main">{children}</main></div></div>;
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

function DemoBanner() {
  return <div className="demo-banner"><Sparkles size={15} /><span><strong>Demo workspace</strong> — sample records and metrics are for demonstration only. No backend is connected.</span></div>;
}

export function DashboardPage() {
  return <DashboardShell title="Overview" description="A calm view of your digital identity."><DemoBanner /><div className="welcome-row"><div><h2>Good morning, Alex <span>✦</span></h2><p>Here’s what’s happening across your digital identity.</p></div><Link className="button button-primary" href="/dashboard/accounts"><Plus size={16} /> Add account</Link></div><div className="metric-grid dashboard-metrics">{[["12", "Total accounts", "↑ 3 this month", "cyan"], ["03", "Need attention", "2 medium · 1 low", "orange"], ["87%", "Security score", "↑ 6% this month", "green"], ["06", "Preserved", "Your selected records", "violet"]].map(([number, label, detail, color]) => <div className="dashboard-metric" key={label}><span className={`metric-icon ${color}`}>{label === "Security score" ? <ShieldCheck size={18} /> : label === "Preserved" ? <LockKeyhole size={18} /> : <BarChart3 size={18} />}</span><strong>{number}</strong><span>{label}</span><small>{detail}</small></div>)}</div><section className="india-globe-section"><div className="india-globe-copy"><span className="eyebrow"><Globe2 size={14} /> Geographic-inspired visualization</span><h2>Your Digital World, Connected.</h2><p>Explore your digital identity through a geographical-inspired security visualization.</p><span className="demo-badge">DEMO DATA · INDIA FOCUS</span></div><IndiaGlobe /></section><QuickActions /><div className="dashboard-columns"><Panel title="Accounts requiring attention" action="View all" href="/dashboard/accounts"><div className="attention-list">{accounts.filter((a) => a.status === "Review").map((account) => <AccountRow account={account} key={account.id} />)}</div></Panel><Panel title="Security overview" action="View security" href="/dashboard/security"><div className="security-score"><div className="score-circle"><strong>87</strong><small>/ 100</small></div><div><strong>Good foundation</strong><p>Three accounts could use a review.</p><span className="score-progress"><i /></span></div></div><div className="score-foot"><span>Last checked today</span><span className="text-cyan">+6% this month</span></div></Panel></div><div className="dashboard-columns"><Panel title="Recent activity" action="See all" href="/dashboard/accounts"><div className="activity-list">{[["Added", "Dropbox", "2 hours ago", Plus], ["Marked for review", "Notion", "Yesterday", ShieldCheck], ["Preserved", "Slack", "3 days ago", LockKeyhole]].map(([action, name, time, Icon]) => <div className="activity-row" key={name}><span className="activity-icon"><Icon size={15} /></span><span><strong>{action}</strong> {name}<small>{time}</small></span></div>)}</div></Panel><Panel title="Account categories"><div className="category-list">{[["Productivity", 5, "cyan"], ["Creative", 3, "pink"], ["Development", 2, "violet"], ["Storage", 2, "blue"]].map(([name, count, color]) => <div key={name}><span className={`category-dot ${color}`} /><span>{name}</span><strong>{count}</strong><div><i style={{ width: `${count * 15}%` }} /></div></div>)}</div></Panel></div></DashboardShell>;
}

function QuickActions() {
  const [scan, setScan] = useState(false);
  return <section className="quick-actions"><div><span className="eyebrow">Next steps</span><h2>Quick actions</h2></div><div className="quick-action-grid"><Link className="quick-action" href="/dashboard/accounts"><Plus size={18} /><span><strong>Add account</strong><small>Create a local demo record</small></span><ChevronRight size={16} /></Link><button className="quick-action" onClick={() => setScan(true)}><ShieldCheck size={18} /><span><strong>Run security scan</strong><small>{scan ? "Demo scan complete: 3 reviews found" : "Review sample account signals"}</small></span><ChevronRight size={16} /></button><Link className="quick-action" href="/dashboard/identity-map"><Network size={18} /><span><strong>Explore Identity Map</strong><small>View connected demo accounts</small></span><ChevronRight size={16} /></Link><Link className="quick-action" href="/dashboard/security"><FileText size={18} /><span><strong>View security report</strong><small>Open the demo security dashboard</small></span><ChevronRight size={16} /></Link></div></section>;
}

function IndiaGlobe({ compact = false }) {
  const mountRef = useRef(null);
  const resetRef = useRef(() => {});
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      window.setTimeout(() => setWebglUnavailable(true), 0);
      return undefined;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
    camera.position.z = 4;
    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = -THREE.MathUtils.degToRad(78);
    scene.add(earthGroup);
    const ambient = new THREE.AmbientLight(0x6d86a0, 1.15);
    const sun = new THREE.DirectionalLight(0xfff4dd, 2.2);
    sun.position.set(-3, 2, 4);
    scene.add(ambient, sun);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 18 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMaterial);
    earthGroup.add(earth);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.055, 48, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color(0x4fdcff) } },
        vertexShader: "varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: "varying vec3 vNormal; uniform vec3 glowColor; void main(){float intensity=pow(.72-dot(vNormal,vec3(0.,0.,1.)),2.2);gl_FragColor=vec4(glowColor,intensity*.75);}",
      }),
    );
    earthGroup.add(atmosphere);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xa9b887 });
    const violetMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const network = new THREE.Group();
    earthGroup.add(network);
    const markerData = [
      { name: "New Delhi", detail: "Demo connection point", lat: 28.6, lon: 77.2 },
      { name: "Mumbai", detail: "Demo connection point", lat: 19.1, lon: 72.9 },
      { name: "Chennai", detail: "Demo connection point", lat: 13.1, lon: 80.3 },
      { name: "Kolkata", detail: "Demo connection point", lat: 22.6, lon: 88.4 },
    ];
    const points = markerData.map(({ lat, lon }, index) => {
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon + 180);
      const position = new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(1.012);
      const point = new THREE.Mesh(new THREE.SphereGeometry(.032, 12, 12), index % 2 ? violetMaterial : pointMaterial);
      point.position.copy(position);
      point.userData.markerIndex = index;
      network.add(point);
      return position;
    });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8bc7c0, transparent: true, opacity: .78 });
    for (let index = 1; index < points.length; index += 1) {
      network.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([points[index - 1], points[index]]), lineMaterial));
    }
    const textureLoader = new THREE.TextureLoader();
    let earthTexture;
    textureLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg", (texture) => {
      if (!renderer) {
        texture.dispose();
        return;
      }
      earthTexture = texture;
      texture.colorSpace = THREE.SRGBColorSpace;
      earthMaterial.map = texture;
      earthMaterial.needsUpdate = true;
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const initialRotation = -THREE.MathUtils.degToRad(78);
    resetRef.current = () => {
      earthGroup.rotation.set(0, initialRotation, 0);
      camera.position.z = 4;
      setHoveredMarker(null);
    };
    const resize = () => {
      const width = mount.clientWidth || 280;
      const height = mount.clientHeight || 280;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const onPointerDown = (event) => {
      mount.setPointerCapture?.(event.pointerId);
      mount.dataset.dragX = String(event.clientX);
      mount.dataset.dragging = "true";
    };
    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      sun.position.x = pointer.x * 3;
      sun.position.y = pointer.y * 2 + 2;
      if (mount.dataset.dragging === "true") {
        const lastX = Number(mount.dataset.dragX || event.clientX);
        earthGroup.rotation.y += (event.clientX - lastX) * .008;
        mount.dataset.dragX = String(event.clientX);
      }
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(network.children, false)[0];
      network.children.forEach((child) => {
        if (child.userData.markerIndex === undefined) return;
        const active = hit?.object === child;
        child.scale.setScalar(active ? 1.35 : 1);
      });
      setHoveredMarker(hit ? markerData[hit.object.userData.markerIndex] : null);
    };
    const onWheel = (event) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * .0025, 2.9, 5.2);
    };
    const stopDragging = () => { mount.dataset.dragging = "false"; };
    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("pointerup", stopDragging);
    mount.addEventListener("pointercancel", stopDragging);
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let frame;
    const animate = () => {
      if (mount.dataset.dragging !== "true") earthGroup.rotation.y += .0012;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("pointerup", stopDragging);
      mount.removeEventListener("pointercancel", stopDragging);
      network.children.forEach((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
        }
      });
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      earthTexture?.dispose();
      renderer.dispose();
      earth.geometry.dispose();
      earthMaterial.dispose();
      lineMaterial.dispose();
      pointMaterial.dispose();
      violetMaterial.dispose();
      mount.replaceChildren();
    };
  }, []);
  return <div className={`india-globe ${compact ? "india-globe-compact" : ""}`} aria-label="Interactive textured Earth demonstration" title="Drag to rotate, scroll to zoom"><div ref={mountRef} className="india-globe-canvas" />{webglUnavailable && <div className="india-globe-fallback">Interactive Earth visualization unavailable in this browser.</div>}{hoveredMarker && <div className="globe-marker-tooltip"><strong>{hoveredMarker.name}</strong><span>{hoveredMarker.detail}</span></div>}{!compact && <><div className="globe-activity"><span className="status-dot" /> 4 connection points active</div><button className="globe-reset button button-ghost button-small" onClick={() => resetRef.current()} type="button">Reset view</button></>}</div>;
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
  const Icon = account.icon;
  return <div className="account-row"><span className={`account-logo ${account.color}`}><Icon size={17} /></span><span className="account-info"><strong>{account.name}</strong><small>{account.category} · {account.email}</small></span><span className={`status status-${account.status.toLowerCase()}`}>{account.status}</span>{onAction && <button className="icon-button small-icon" onClick={() => onAction(account)} aria-label={`Open ${account.name}`}><ChevronRight size={16} /></button>}</div>;
}

export function AccountsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState(accounts);
  const filtered = records.filter((account) => account.name.toLowerCase().includes(search.toLowerCase()) && (category === "All categories" || account.category === category));
  function addAccount(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setRecords([{ id: Date.now(), name: form.get("platform"), category: form.get("category"), email: form.get("email") || "Not specified", status: "Review", activity: "Just now", color: "cyan", icon: Globe2 }, ...records]);
    setShowForm(false);
  }
  return <DashboardShell title="All accounts" description="Your digital identity inventory, organized your way."><DemoBanner /><div className="page-actions"><div><h2>Account inventory <span className="count-badge">{records.length}</span></h2><p>Demo records only. Add an account to see local state in action.</p></div><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add account</button></div><div className="filters"><label className="filter-search"><Search size={16} /><input placeholder="Search accounts..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option>All categories</option><option>Productivity</option><option>Creative</option><option>Development</option><option>Storage</option></select><button className="filter-button"><ChevronDown size={15} /> Status: All</button><button className="filter-button"><ChevronDown size={15} /> Sort: Recent</button></div><div className="accounts-table"><div className="table-head"><span>Account</span><span>Status</span><span>Last activity</span><span /></div>{filtered.map((account) => <div className="table-row" key={account.id}><AccountRow account={account} onAction={setSelected} /><span className="activity-date">{account.activity}</span><button className="text-button" onClick={() => setSelected(account)}>Details <ChevronRight size={14} /></button></div>)}{filtered.length === 0 && <div className="empty-state"><Search size={25} /><h3>No matching accounts</h3><p>Try a different search or add a new local record.</p></div>}</div>{showForm && <Modal title="Add a local account" onClose={() => setShowForm(false)}><form className="modal-form" onSubmit={addAccount}><p className="modal-note"><LockKeyhole size={15} /> This creates a local demo record only. Nothing is sent or saved remotely.</p><label>Platform name<input name="platform" required placeholder="e.g. Linear" /></label><label>Website URL<input name="url" type="url" placeholder="https://example.com" /></label><label>Email used<input name="email" type="email" placeholder="you@example.com" /></label><label>Category<select name="category"><option>Productivity</option><option>Creative</option><option>Development</option><option>Storage</option></select></label><label>Notes<textarea name="notes" rows="3" placeholder="Optional context" /></label><button className="button button-primary button-full" type="submit">Add local record <Plus size={16} /></button></form></Modal>}{selected && <AccountDetail account={selected} onClose={() => setSelected(null)} onDelete={(id) => { setRecords(records.filter((account) => account.id !== id)); setSelected(null); }} />}</DashboardShell>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.div className="modal" initial={{ opacity: 0, scale: .96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</motion.div></div>;
}

function AccountDetail({ account, onClose, onDelete }) {
  const [message, setMessage] = useState("");
  const Icon = account.icon;
  return <Modal title={account.name} onClose={onClose}><div className="detail-hero"><span className={`account-logo large ${account.color}`}><Icon size={24} /></span><div><strong>{account.category}</strong><span>{account.email}</span></div><span className={`status status-${account.status.toLowerCase()}`}>{account.status}</span></div><p className="modal-note">All actions below are frontend demonstrations. External account deletion is not available.</p><div className="action-buttons">{["KEEP", "SECURE", "REVOKE", "PRESERVE"].map((action) => <button key={action} onClick={() => setMessage(`${action} selected for this local demo record.`)}>{action}</button>)}<button className="danger-action" onClick={() => onDelete(account.id)}><Trash2 size={15} /> DELETE LOCAL RECORD</button></div>{message && <p className="success-text"><Check size={15} /> {message}</p>}</Modal>;
}

export function IdentityMapPage() {
  const [selected, setSelected] = useState(null);
  const nodes = [{ id: "identity", type: "identity", position: { x: 330, y: 190 }, data: { label: "Alex Morgan", subtitle: "Your identity · demo" } }, ...accounts.map((account, index) => ({ id: String(account.id), position: { x: index % 2 ? 600 : 70, y: 40 + Math.floor(index / 2) * 150 }, data: { label: account.name, subtitle: account.category, color: account.color, icon: account.icon } }))];
  const edges = accounts.map((account) => ({ id: `e-${account.id}`, source: "identity", target: String(account.id), animated: true, style: { stroke: account.id % 2 ? "#718258" : "#a9b887", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: account.id % 2 ? "#718258" : "#a9b887" } }));
  return <DashboardShell title="Identity map" description="A visual view of your digital identity connections."><DemoBanner /><div className="map-toolbar"><div><h2>Your identity network</h2><p>Interactive demonstration data — select a node to explore.</p></div><span className="map-legend"><i className="legend-dot cyan" /> Productivity <i className="legend-dot violet" /> Creative <i className="legend-dot pink" /> Other</span></div><div className="map-layout"><div className="map-canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={{ identity: IdentityNode, default: AccountNode }} fitView onNodeClick={(_, node) => setSelected(node)}><Background color="var(--line)" gap={24} /><Controls /><MiniMap nodeColor={(node) => node.type === "identity" ? "#8b5cf6" : "#22d3ee"} /></ReactFlow></div><AnimatePresence>{selected && <motion.aside className="map-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}><button className="icon-button detail-close" onClick={() => setSelected(null)}><X size={17} /></button><span className="eyebrow">Selected node</span><div className="selected-node"><span className="account-logo large violet">{selected.type === "identity" ? <Shield size={23} /> : <Globe2 size={23} />}</span><h3>{selected.data.label}</h3><p>{selected.data.subtitle}</p></div><div className="detail-divider" /><span className="eyebrow">Connection notes</span><p className="detail-copy">This is demonstration data representing how a service might relate to your digital identity.</p><button className="button button-ghost button-full" onClick={() => setSelected(null)}>Close details</button></motion.aside>}</AnimatePresence></div></DashboardShell>;
}

function IdentityNode({ data }) {
  return <div className="flow-identity-node"><Handle type="source" position={Position.Right} /><Shield size={18} /><strong>{data.label}</strong><small>{data.subtitle}</small><Handle type="target" position={Position.Left} /></div>;
}

function AccountNode({ data }) {
  const Icon = data.icon || Globe2;
  return <div className={`flow-account-node ${data.color}`}><Handle type="target" position={Position.Left} /><Icon size={16} /><strong>{data.label}</strong><small>{data.subtitle}</small><Handle type="source" position={Position.Right} /></div>;
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  return <DashboardShell title="Settings" description="Shape your GhostGuard experience."><DemoBanner /><div className="settings-layout"><div className="settings-tabs"><span className="active">Profile</span><span>Appearance</span><span>Notifications</span><span>Privacy</span><span>Account</span></div><div className="settings-content"><SettingSection title="Profile" copy="This information stays in the frontend demo only."><div className="profile-edit"><span className="profile-avatar large">A</span><button className="button button-ghost">Change avatar</button></div><div className="settings-fields"><label>Full name<input defaultValue="Alex Morgan" /></label><label>Email address<input defaultValue="alex@demo.co" type="email" /></label></div></SettingSection><SettingSection title="Appearance" copy="Choose how GhostGuard feels across your workspace."><div className="theme-options"><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-swatch dark-swatch" /><strong>Dark theme</strong><small>Midnight navy and electric violet</small>{theme === "dark" && <Check size={16} />}</button><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-swatch light-swatch" /><strong>Light theme</strong><small>Clean white and soft lavender</small>{theme === "light" && <Check size={16} />}</button></div></SettingSection><SettingSection title="Preferences" copy="Manage how your workspace behaves."><label className="toggle-row"><span><strong>Weekly identity review</strong><small>Receive a reminder to review accounts that need attention.</small></span><input type="checkbox" defaultChecked /></label><label className="toggle-row"><span><strong>Motion reduction</strong><small>Respect reduced motion preferences for interface animations.</small></span><input type="checkbox" /></label></SettingSection><button className="button button-primary" onClick={() => setSaved(true)}>Save demo preferences <Check size={16} /></button>{saved && <p className="success-text"><Check size={16} /> Preferences updated in local frontend state. No database is connected.</p>}</div></div></DashboardShell>;
}

function SettingSection({ title, copy, children }) {
  return <section className="settings-section"><div><h2>{title}</h2><p>{copy}</p></div>{children}</section>;
}
