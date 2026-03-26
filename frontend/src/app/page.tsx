"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  BarChart2,
  Timer,
  Workflow,
  Globe2,
  Lock,
  FileText,
  Search,
  CheckCircle2,
  Zap,
  Bell,
  ArrowUpRight,
  Shield,
  Star,
  Paperclip,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  Inbox,
  Clock,
  Loader,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AbstractBackground from "@/components/3d/AbstractBackground";
import { useAuth } from "@/hooks/useAuth";

import { useTranslation } from "react-i18next";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.25, 0.4, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] uppercase tracking-[0.25em] text-emerald-400 mb-4 font-medium">
      {children}
    </p>
  );
}

function SectionH2({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-3xl sm:text-4xl font-light tracking-tight text-white leading-[1.15] ${className}`}
    >
      {children}
    </h2>
  );
}

export default function Home() {
  const { user, isLoading, isAuthChecked } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(newLang);
  };
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 420], [1, 0.96]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Only redirect after auth check is complete to prevent premature redirects
    if (isAuthChecked && !isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, isAuthChecked, router]);

  

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* 3-D canvas background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AbstractBackground />
        {/* Dark overlay so content stays readable over the particle network */}
        <div className="absolute inset-0 bg-[#020617]/55" />
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-1">
        <div className="absolute top-[-15%] left-[8%]  w-[700px] h-[700px] rounded-full bg-emerald-500/[0.11] blur-[180px]" />
        <div className="absolute bottom-[-10%] right-[3%] w-[540px] h-[540px] rounded-full bg-teal-500/[0.09]  blur-[150px]" />
        <div className="absolute top-[55%] left-[40%]  w-[400px] h-[400px] rounded-full bg-emerald-600/[0.07]  blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        <div className="sticky top-0 sm:top-4 z-50 w-full px-0 sm:px-6 lg:px-8 flex justify-center">
          <header className="w-full max-w-7xl backdrop-blur-2xl bg-[#020617]/25 sm:bg-white/[0.015] border-b sm:border border-white/[0.05] sm:rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_8px_32px_0_rgba(0,0,0,0.2)] transition-all duration-500 sm:hover:bg-white/[0.03] hover:border-white/[0.1] hover:shadow-[0_8px_40px_0_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-8 h-16 relative z-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="flex h-12 w-12 items-center justify-center group-hover:scale-105 transition-all duration-300 ease-out flex-shrink-0">
                <img src="/logo.png" alt="Bharat-Setu Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div className="leading-none">
                <p className="text-[14px] font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-emerald-300 group-hover:to-teal-200 transition-all duration-300">
                  {t('landing.brandName', 'Bharat-Setu')}
                </p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 mt-0.5 group-hover:text-emerald-300 transition-colors duration-300">
                  {t('nav.brandSubtitle', 'Grievance Platform')}
                </p>
              </div>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-1 text-[13px]">
              {[
                [t('nav.problem', 'Problem'), "#problem"],
                [t('nav.features', 'Features'), "#features"],
                [t('nav.howItWorks', 'How it works'), "#workflow"],
                [t('nav.forCitizens', 'For citizens'), "#citizen"],
                [t('nav.roles', 'Roles'), "#roles"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="relative px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white transition-all duration-300 font-medium group overflow-hidden"
                >
                  <span className="relative z-10">{label}</span>
                  <div className="absolute inset-0 bg-white/[0.06] rounded-lg opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-300 ease-out" />
                </a>
              ))}
            </nav>

            {/* Desktop actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all duration-300 mr-2"
                title={t('landing.toggleLanguage', 'Toggle Language')}
              >
                {i18n.language === 'hi' ? 'EN' : 'HI'}
              </button>
              <Link
                href="/track"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium text-zinc-300 hover:text-white transition-all duration-300 group relative overflow-hidden"
              >
                <span className="relative z-10 group-hover:translate-x-0.5 transition-transform duration-300 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  {t('nav.track', 'Track')}
                </span>
                <div className="absolute inset-0 bg-white/[0.06] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out" />
              </Link>
              <div className="w-px h-5 bg-white/[0.12]" />
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.14] bg-white/[0.04] px-4 py-2 text-[12.5px] font-medium text-zinc-200 hover:bg-white/[0.09] hover:border-white/[0.25] text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 ease-out"
              >
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                {t('nav.signIn', 'Sign in')}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 ease-out"
              >
                {t('nav.getStarted', 'Get started')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Mobile right: track + hamburger */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[12px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
                title={t('landing.toggleLanguage', 'Toggle Language')}
              >
                {i18n.language === 'hi' ? 'EN' : 'HI'}
              </button>
              <Link
                href="/track"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <Search className="h-3.5 w-3.5" />
                {t('nav.track', 'Track')}
              </Link>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile nav drawer */}
          <div
            className={`lg:hidden transition-all duration-300 ease-in-out bg-[#020617]/40 sm:bg-transparent relative z-10 ${
              mobileOpen ? "max-h-[400px] border-t border-white/[0.07] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            <nav className="flex flex-col px-5 py-3 gap-0.5">
                {[
                  [t('nav.problem', 'Problem'), "#problem"],
                  [t('nav.features', 'Features'), "#features"],
                  [t('nav.howItWorks', 'How it works'), "#workflow"],
                  [t('nav.forCitizens', 'For citizens'), "#citizen"],
                  [t('nav.roles', 'Roles'), "#roles"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    {label}
                  </a>
                ))}
                <div className="mt-3 pt-3 border-t border-white/[0.07] flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 justify-center rounded-lg border border-white/[0.14] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-zinc-200 hover:bg-white/[0.08] transition-all"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {t('nav.signIn', 'Sign in')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 justify-center rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-all"
                  >
                    {t('nav.getStarted', 'Get started')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </nav>
            </div>
          </header>
        </div>

        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-5 sm:px-8 py-12"
        >
          <div className="max-w-4xl mx-auto text-center w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-1.5 text-[11.5px] font-medium text-emerald-300 mb-6"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t('hero.badge', 'Built for modern government offices')}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.18,
                duration: 0.7,
                ease: [0.22, 0.4, 0.22, 1],
              }}
              className="text-4xl sm:text-6xl lg:text-[68px] font-semibold tracking-tight text-white leading-[1.06] mx-auto"
            >
              {t('hero.title1', 'Every citizen complaint.')}{" "}
              <span className="bg-linear-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                {t('hero.title2', 'Resolved.')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.65 }}
              className="mt-5 text-[16px] sm:text-[17px] text-zinc-300 leading-relaxed max-w-2xl mx-auto"
            >
              {t('landing.replaceWhatsapp')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, duration: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-7 py-3 text-[14px] font-semibold text-white shadow-xl shadow-emerald-900/40 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >{t('landing.requestAccess', 'Request access')}<ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/submit"
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.05] px-6 py-3 text-[14px] font-medium text-zinc-100 hover:bg-white/[0.1] hover:text-white hover:border-white/25 transition-all"
              >
                <FileText className="mr-2 h-4 w-4 text-emerald-400" />
                {t('landing.fileComplaint')}
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.65 }}
              className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-6 sm:gap-x-14 sm:gap-y-0"
            >
              {[
                ["6", "User roles"],
                ["6", "Status stages"],
                ["7", "Analytics views"],
                ["3", "AI engines"],
              ].map(([val, lbl], i) => (
                <React.Fragment key={lbl}>
                  {i > 0 && <div className="hidden sm:block w-px h-10 bg-white/[0.15]" />}
                  <div className="text-center">
                    <p className="text-[32px] sm:text-[42px] font-light text-white tracking-tight leading-none">
                      {val}
                    </p>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-medium mt-2">
                      {lbl}
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <Reveal className="px-5 sm:px-8 pb-10 sm:pb-14">
          <div className="max-w-6xl mx-auto group perspective-[2000px]">
            <div className="rounded-3xl border border-white/[0.14] bg-linear-to-b from-slate-900/60 via-[#020617]/80 to-[#020617]/95 p-1 shadow-[0_40px_160px_rgba(0,0,0,0.75)] overflow-hidden transition-all duration-700 ease-out hover:shadow-[0_40px_160px_rgba(16,185,129,0.15)] hover:border-white/20 hover:-translate-y-2">
              <div className="rounded-[22px] bg-[#020617]/50 p-5 sm:p-7">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">{t('landing.liveDashboard', 'Live dashboard')}</p>
                    <p className="text-sm font-medium text-white mt-1">{t('landing.realTimeOverview')}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] text-emerald-300">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{t('landing.live', 'Live')}</span>
                </div>

                {/* KPI Cards — matches actual dashboard style */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Total Complaints', value: '1,284', icon: <Inbox className="h-[18px] w-[18px] text-orange-400" />, bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'bg-orange-500/10' },
                    { label: 'Open',             value: '243',   icon: <Clock className="h-[18px] w-[18px] text-blue-300" />,   bg: 'bg-blue-800/10',   border: 'border-blue-800/20',   glow: 'bg-blue-800/10' },
                    { label: 'In Progress',      value: '389',   icon: <Loader className="h-[18px] w-[18px] text-indigo-400" />, bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', glow: 'bg-indigo-500/10' },
                    { label: 'Resolved',         value: '617',   icon: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'bg-emerald-500/10' },
                    { label: 'SLA Breached',     value: '12',    icon: <AlertTriangle className="h-[18px] w-[18px] text-red-400" />,    bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'bg-red-500/10' },
                    { label: 'Escalated',        value: '23',    icon: <Zap className="h-[18px] w-[18px] text-amber-400" />,          bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   glow: 'bg-amber-500/10' },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className={`relative rounded-xl border ${kpi.border} ${kpi.bg} p-4 overflow-hidden backdrop-blur-md hover:scale-[1.03] transition-all duration-300 cursor-default`}
                    >
                      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${kpi.glow}`} />
                      <div className="relative z-10">
                        <div className="mb-3">
                          <div className={`inline-flex p-2 rounded-lg ${kpi.bg} ring-1 ring-white/5`}>
                            {kpi.icon}
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">{kpi.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lifecycle Pipeline */}
                <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-3">{t('landing.lifecyclePipeline')}</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                      { stage: 'Open',        count: 243,  w: 60,  color: 'bg-blue-500' },
                      { stage: 'Assigned',    count: 156,  w: 38,  color: 'bg-indigo-400' },
                      { stage: 'In Progress', count: 389,  w: 96,  color: 'bg-amber-500' },
                      { stage: 'Resolved',    count: 617,  w: 100, color: 'bg-emerald-500' },
                      { stage: 'Closed',      count: 412,  w: 67,  color: 'bg-slate-500' },
                    ].map((s) => (
                      <div key={s.stage} className="flex-1 min-w-[70px]">
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className="text-zinc-400 truncate">{s.stage}</span>
                          <span className="text-zinc-300 font-medium">{s.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <div className={`h-full rounded-full ${s.color} opacity-60`} style={{ width: `${s.w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </Reveal>

        <section
          id="problem"
          className="px-5 sm:px-8 pb-16 sm:pb-24 scroll-mt-24"
        >
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.theProblem', 'The problem')}</Eyebrow>
              <SectionH2 className="max-w-3xl">{t('landing.complaintsWhatsapp', 'Complaints live in WhatsApp.')}<br className="hidden sm:block" />{t('landing.notInSystems', 'Not in systems.')}</SectionH2>
              <p className="mt-5 text-zinc-300 text-[15px] leading-relaxed max-w-2xl font-light">
                Phone calls, walk-ins, registers, sticky notes, group chats —
                everything ends up scattered across people, and when someone
                leaves, the knowledge leaves too. There is no single source of
                truth.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {/* Without */}
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-7 h-full transition-all duration-300 hover:border-zinc-500/50 hover:bg-zinc-800/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-1 ease-out">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 mb-5">
                    {t('landing.withoutPlatform')}
                  </p>
                  <ul className="space-y-4">
                    {[
                      [
                        "No tracking",
                        "Complaints go missing between people and apps",
                      ],
                      [
                        "No owner",
                        "Nobody knows who was supposed to act, or by when",
                      ],
                      [
                        "No visibility",
                        "Leadership sees curated reports, not the real picture",
                      ],
                      [
                        "No data",
                        "When staff turn over, institutional knowledge disappears",
                      ],
                      [
                        "No trust",
                        "Citizens get no updates — they assume nothing was done",
                      ],
                    ].map(([title, desc]) => (
                      <li key={title} className="flex items-start gap-3">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
                        <span>
                          <span className="text-[13px] font-medium text-zinc-300">
                            {title} —{" "}
                          </span>
                          <span className="text-[13px] text-zinc-500 font-light">
                            {desc}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              {/* With */}
              <Reveal delay={0.18}>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-7 h-full transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/[0.1] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 ease-out">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400 mb-5">
                    {t('landing.withPlatform')}
                  </p>
                  <ul className="space-y-4">
                    {[
                      [
                        "Unique ID on submit",
                        "Every complaint timestamped and trackable from second one",
                      ],
                      [
                        "Enforced ownership",
                        "Officer and department locked in — system, not memory",
                      ],
                      [
                        "Live leadership view",
                        "Seven real-time analytics dashboards, scoped to authority",
                      ],
                      [
                        t('landing.details.d3Title', t('landing.details.d3Title', t('landing.details.d3Title', "Immutable audit trail"))),
                        "Full status history survives any personnel change",
                      ],
                      [
                        "Citizen transparency",
                        "Track status anytime with only the tracking ID",
                      ],
                    ].map(([title, desc]) => (
                      <li key={title} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>
                          <span className="text-[13px] font-medium text-white">
                            {title} —{" "}
                          </span>
                          <span className="text-[13px] text-zinc-300 font-light">
                            {desc}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="px-5 sm:px-8 pb-16 sm:pb-24 scroll-mt-24"
        >
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.coreCapabilities', 'Core capabilities')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.needsNothingElse')}
              </SectionH2>
            </Reveal>

            <div className="mt-12 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Workflow className="h-5 w-5" />,
                  bg: "bg-emerald-500/[0.08]",
                  border: "border-emerald-500/10",
                  iconColor: "text-emerald-400",
                  title: t('landing.features.f1Title', t('landing.features.f1Title', t('landing.features.f1Title', "Structured lifecycle"))),
                  desc: t('landing.features.f1Desc', t('landing.features.f1Desc', t('landing.features.f1Desc', "OPEN → ASSIGNED → IN PROGRESS → RESOLVED → CLOSED. Role-gated transitions enforced by the system — no skipping, no silent closures, no workarounds."))),
                },
                {
                  icon: <Sparkles className="h-5 w-5" />,
                  bg: "bg-teal-500/[0.08]",
                  border: "border-teal-500/10",
                  iconColor: "text-teal-300",
                  title: t('landing.features.f2Title', t('landing.features.f2Title', t('landing.features.f2Title', "Built-in AI intelligence"))),
                  desc: t('landing.features.f2Desc', t('landing.features.f2Desc', t('landing.features.f2Desc', "Three on-device engines — priority prediction, sentiment analysis, duplicate detection — score every complaint before a human touches it. No external API, no extra cost."))),
                },
                {
                  icon: <Timer className="h-5 w-5" />,
                  bg: "bg-amber-500/[0.08]",
                  border: "border-amber-500/10",
                  iconColor: "text-amber-400",
                  title: t('landing.features.f3Title', t('landing.features.f3Title', t('landing.features.f3Title', "SLA auto-escalation"))),
                  desc: t('landing.features.f3Desc', t('landing.features.f3Desc', t('landing.features.f3Desc', "Per-department deadlines with a background job that warns at 75% elapsed time and auto-escalates breaches every 30 minutes — with email alerts dispatched automatically."))),
                },
                {
                  icon: <BarChart2 className="h-5 w-5" />,
                  bg: "bg-cyan-500/[0.08]",
                  border: "border-cyan-500/10",
                  iconColor: "text-cyan-300",
                  title: t('landing.features.f4Title', t('landing.features.f4Title', t('landing.features.f4Title', "Executive analytics"))),
                  desc: t('landing.features.f4Desc', t('landing.features.f4Desc', t('landing.features.f4Desc', "Seven live reports — Overview, Trends, Department Performance, Officer Leaderboard, SLA Heatmap, Escalation Trends, Category Distribution — scoped to the viewer's authority."))),
                },
                {
                  icon: <Bell className="h-5 w-5" />,
                  bg: "bg-indigo-500/[0.08]",
                  border: "border-indigo-500/10",
                  iconColor: "text-indigo-400",
                  title: t('landing.features.f5Title', t('landing.features.f5Title', t('landing.features.f5Title', "Real-time notifications"))),
                  desc: t('landing.features.f5Desc', t('landing.features.f5Desc', t('landing.features.f5Desc', "Server-Sent Events deliver instant in-app alerts on assignment, status change and SLA breach. No polling, no page refresh — the dashboard updates the moment something changes."))),
                },
                {
                  icon: <Globe2 className="h-5 w-5" />,
                  bg: "bg-slate-500/[0.08]",
                  border: "border-white/[0.13]",
                  iconColor: "text-slate-300",
                  title: t('landing.multiOffice'),
                  desc: "{t('landing.multiOfficeDesc')}",
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 0.07}>
                  <div
                    className={`rounded-2xl border ${item.border} bg-white/[0.06] p-6 h-full group transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:border-white/[0.25] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ease-out`}
                  >
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} mb-4 ${item.iconColor} transition-transform duration-300 group-hover:scale-110 ease-out`}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-white mb-2 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-zinc-300 leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.aiLayer', 'AI intelligence layer')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.threeEngines')}
              </SectionH2>
              <p className="mt-5 text-zinc-300 text-[15px] leading-relaxed max-w-2xl font-light">
                {t('landing.autoScored')}
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {/* Mock complaint card (left) */}
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/[0.13] bg-white/[0.06] p-6 h-full flex flex-col gap-5">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">{t('landing.incomingComplaint', 'Incoming complaint')}</p>
                      <code className="font-mono text-[10.5px] text-zinc-500">
                        BharatSetu-20260301-A4F7B3C2
                      </code>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-[0.15em] mb-1">{t('landing.descriptionLabel', 'Description')}</p>
                        <p className="text-[13.5px] text-zinc-200 leading-relaxed font-light">
                          {t('landing.complaintExample')}
                        </p>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-2.5">
                        <div>
                          <p className="text-[10px] text-zinc-400 mb-1">{t('landing.categoryLabel', 'Category')}</p>
                          <p className="text-[12.5px] text-zinc-300">{t('landing.waterSupply', 'Water Supply')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 mb-1">{t('landing.filedByLabel', 'Filed by')}</p>
                          <p className="text-[12.5px] text-zinc-300">{t('landing.publicPortal', 'Public portal')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status + assignment row */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-1">{t('landing.statusLabel')}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/[0.12] border border-amber-500/25 px-2 py-0.5 text-[10.5px] text-amber-300 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{t('landing.escalatedLabel', 'Escalated')}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-1">{t('landing.departmentLabel', 'Department')}</p>
                      <p className="text-[11.5px] text-zinc-300 font-medium">{t('landing.waterDept', 'Water Dept.')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-1">{t('landing.assignedToLabel', 'Assigned to')}</p>
                      <p className="text-[11.5px] text-zinc-300 font-medium">
                        R. Kumar
                      </p>
                    </div>
                  </div>

                  {/* SLA row */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">{t('landing.slaDeadlineLabel')}</span>
                    <span className="text-red-400 font-medium">{t('landing.breachedLabel', 'Breached — 6 h ago')}</span>
                  </div>

                  <div className="pt-0 border-t border-white/[0.1]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-8 mb-2.5">{t('landing.aiAnalysisLabel', 'AI analysis — completed in <50ms')}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/[0.1] border border-red-500/20 px-3 py-1.5 text-[11px] text-red-300 font-medium">
                        <Sparkles className="h-3 w-3" />{t('landing.priorityCritical', 'Priority: CRITICAL')}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/[0.1] border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-300 font-medium">
                        <TrendingUp className="h-3 w-3" />{t('landing.sentimentDistressed', 'Sentiment: DISTRESSED')}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.1] border border-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-300 font-medium">
                        <CheckCircle2 className="h-3 w-3" />{t('landing.duplicateNone', 'Duplicate: NONE')}</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Engine cards (right) */}
              <div className="flex flex-col gap-3.5">
                {[
                  {
                    icon: <Sparkles className="h-4 w-4 text-teal-300" />,
                    name: t('landing.engine1Name', "Priority Prediction"),
                    detail: t('landing.engine1Detail', "Rates CRITICAL / HIGH / MEDIUM / LOW based on the description. A burst water main ranks higher than a noise complaint — automatically, every time."),
                    example: t('landing.engine1Example', "Health + infrastructure language → CRITICAL override"),
                    bg: "border-teal-500/10",
                  },
                  {
                    icon: <TrendingUp className="h-4 w-4 text-amber-400" />,
                    name: t('landing.engine2Name', "Sentiment Analysis"),
                    detail: t('landing.engine2Detail', "Detects distress, urgency and frustration in the citizen's language. Distressed reports surface in leadership views before calm ones at the same priority."),
                    example: t('landing.engine2Example', '"children are sick" → DISTRESSED escalation flag'),
                    bg: "border-amber-500/10",
                  },
                  {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
                    name: t('landing.engine3Name', "Duplicate Detection"),
                    detail: t('landing.duplicateDetail', "AI compares incoming reports with recent active issues. Flags potential duplicates to prevent redundant dispatch."),
                    example: t('landing.duplicateExample', "90% similarity w/ #4092 → DUPLICATE WARNING"),
                    bg: "border-emerald-500/10",
                  },
                ].map((engine, i) => (
                  <Reveal key={engine.name} delay={0.12 + i * 0.09}>
                    <div
                      className={`rounded-2xl border ${engine.bg} bg-white/[0.06] p-5 group transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 ease-out`}
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.13] transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/[0.1] ease-out">
                          {engine.icon}
                        </div>
                        <h3 className="text-[13.5px] font-semibold text-white tracking-tight">
                          {engine.name}
                        </h3>
                      </div>
                      <p className="text-[12.5px] text-zinc-300 font-light leading-relaxed mb-2.5">
                        {engine.detail}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        &rarr; {engine.example}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="px-5 sm:px-8 pb-16 sm:pb-24 scroll-mt-24"
        >
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.howItWorks', 'How it works')}</Eyebrow>
              <SectionH2 className="max-w-xl">
                {t('landing.fourSteps')}
              </SectionH2>
            </Reveal>

            <div className="mt-12 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-14 left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] h-px bg-linear-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="grid gap-5 md:grid-cols-4 relative">
                {[
                  {
                    step: "01",
                    icon: <FileText className="h-4 w-4 text-emerald-400" />,
                    title: t('landing.workflows.w1Title', t('landing.workflows.w1Title', t('landing.workflows.w1Title', "Citizen submits"))),
                    desc: t('landing.workflows.w1Desc', t('landing.workflows.w1Desc', t('landing.workflows.w1Desc', "Through the public portal or via staff. Instant tracking ID issued. AI scores priority, sentiment, and duplicate status before a human opens it."))),
                  },
                  {
                    step: "02",
                    icon: <Users className="h-4 w-4 text-teal-300" />,
                    title: t('landing.workflows.w2Title', t('landing.workflows.w2Title', t('landing.workflows.w2Title', "Routed to the right team"))),
                    desc: t('landing.workflows.w2Desc', t('landing.workflows.w2Desc', t('landing.workflows.w2Desc', "Admin or Department Head assigns to officer. System enforces scope — officers see only their own queue, heads only their department."))),
                  },
                  {
                    step: "03",
                    icon: <Zap className="h-4 w-4 text-amber-400" />,
                    title: t('landing.workflows.w3Title', t('landing.workflows.w3Title', t('landing.workflows.w3Title', "Officer resolves"))),
                    desc: t('landing.workflows.w3Desc', t('landing.workflows.w3Desc', t('landing.workflows.w3Desc', "Officer moves through the enforced lifecycle with full notes, file attachments and an SLA timer visible on every card—escalating automatically if breached."))),
                  },
                  {
                    step: "04",
                    icon: <Star className="h-4 w-4 text-emerald-400" />,
                    title: t('landing.citizenRates', 'Citizen rates & closes'),
                    desc: t('landing.citizenRatesDesc'),
                  },
                ].map((s, i) => (
                  <Reveal key={s.step} delay={i * 0.1}>
                    <div className="rounded-2xl border border-white/[0.13] bg-white/[0.06] p-6 h-full relative overflow-hidden group transition-all duration-300 hover:bg-white/[0.08] hover:border-emerald-500/25 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 ease-out">
                      <div className="absolute top-4 right-4 text-[48px] font-extralight text-white/[0.025] leading-none select-none group-hover:text-emerald-500/10 transition-colors duration-300">
                        {s.step}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.07] border border-white/[0.13] z-10 transition-transform duration-300 group-hover:scale-110 ease-out">
                          {s.icon}
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                          Step {s.step}
                        </span>
                      </div>
                      <h3 className="text-[14.5px] font-semibold text-white mb-2 tracking-tight">
                        {s.title}
                      </h3>
                      <p className="text-[12.5px] text-zinc-300 leading-relaxed font-light">
                        {s.desc}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="citizen"
          className="px-5 sm:px-8 pb-16 sm:pb-24 scroll-mt-24"
        >
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.forCitizens', 'For citizens')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.noLogin')}
              </SectionH2>
              <p className="mt-5 text-zinc-300 text-[15px] font-light leading-relaxed max-w-2xl">
                {t('landing.citizenAccess')}
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <FileText className="h-6 w-6 text-emerald-400" />,
                  bg: "bg-emerald-500/[0.07]",
                  border: "border-emerald-500/12",
                  title: t('landing.citizenCards.c1Title', t('landing.citizenCards.c1Title', t('landing.citizenCards.c1Title', "File a complaint"))),
                  desc: t('landing.citizenCards.c1Desc', t('landing.citizenCards.c1Desc', t('landing.citizenCards.c1Desc', "Submit any grievance — road, water, sanitation, safety — with a description and optional contact details. No account, no app download."))),
                  action: t('landing.citizenCards.c1Action', t('landing.citizenCards.c1Action', t('landing.citizenCards.c1Action', "Submit now"))),
                  href: "/submit",
                  badge: "Open to public",
                },
                {
                  icon: <Search className="h-6 w-6 text-teal-300" />,
                  bg: "bg-teal-500/[0.07]",
                  border: "border-teal-500/12",
                  title: t('landing.citizenCards.c2Title', t('landing.citizenCards.c2Title', t('landing.citizenCards.c2Title', "Track your complaint"))),
                  desc: t('landing.citizenCards.c2Desc', t('landing.citizenCards.c2Desc', t('landing.citizenCards.c2Desc', "Enter your tracking ID to see the current status, assigned department, officer name, and last update — live, in real time."))),
                  action: t('landing.citizenCards.c2Action', t('landing.citizenCards.c2Action', t('landing.citizenCards.c2Action', "Track now"))),
                  href: "/track",
                  badge: "No login needed",
                },
                {
                  icon: <Star className="h-6 w-6 text-amber-400" />,
                  bg: "bg-amber-500/[0.07]",
                  border: "border-amber-500/12",
                  title: t('landing.citizenCards.c3Title', t('landing.citizenCards.c3Title', t('landing.citizenCards.c3Title', "Rate the service"))),
                  desc: t('landing.rateServiceDesc'),
                  action: t('landing.citizenCards.c3Action', t('landing.citizenCards.c3Action', t('landing.citizenCards.c3Action', "Track to rate"))),
                  href: "/track",
                  badge: "Anonymous",
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 0.1}>
                  <div
                    className={`rounded-2xl border ${item.border} bg-white/[0.06] p-7 h-full flex flex-col group transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.25] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 ease-out`}
                  >
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} mb-5 transition-transform duration-300 group-hover:scale-110 ease-out`}
                    >
                      {item.icon}
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-white tracking-tight">
                        {item.title}
                      </h3>
                      <span className="rounded-full bg-white/[0.10] border border-white/[0.22] px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-zinc-300 font-medium">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[13px] text-zinc-300 leading-relaxed font-light flex-1">
                      {item.desc}
                    </p>
                    <Link
                      href={item.href}
                      className="mt-6 inline-flex items-center text-[12.5px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors group-hover:gap-2 gap-1.5"
                    >
                      {item.action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.everyDetail')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.accountabilityFirst')}
              </SectionH2>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <Paperclip className="h-5 w-5 text-emerald-400" />,
                  title: t('landing.details.d1Title', t('landing.details.d1Title', t('landing.details.d1Title', "File attachments"))),
                  desc: t('landing.details.d1Desc', t('landing.details.d1Desc', t('landing.details.d1Desc', "Officers and citizens attach photos, scanned documents, and site reports directly to the complaint. Files stored with signed, time-limited access links — no permanent public exposure."))),
                  detail: t('landing.details.d1Detail', t('landing.details.d1Detail', t('landing.details.d1Detail', "Officers see evidence before visiting the site."))),
                },
                {
                  icon: <MessageSquare className="h-5 w-5 text-teal-300" />,
                  title: t('landing.details.d2Title', t('landing.details.d2Title', t('landing.details.d2Title', "Internal staff notes"))),
                  desc: t('landing.details.d2Desc', t('landing.details.d2Desc', t('landing.details.d2Desc', "Officers and department heads add private notes to complaints — field observations, coordination details, internal decisions — never visible to citizens."))),
                  detail: t('landing.details.d2Detail', t('landing.details.d2Detail', t('landing.details.d2Detail', "No more parallel WhatsApp threads that disappear."))),
                },
                {
                  icon: <Shield className="h-5 w-5 text-indigo-400" />,
                  title: t('landing.details.d3Title'),
                  desc: t('landing.immutableAudit'),
                  detail:
                    t('landing.chronologicalRecord'),
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 0.1}>
                  <div className="rounded-2xl border border-white/[0.13] bg-white/[0.06] p-6 h-full group transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.25] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 ease-out">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] border border-white/[0.13] mb-5 transition-transform duration-300 group-hover:scale-110 ease-out">
                      {item.icon}
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-white mb-2 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-zinc-300 leading-relaxed font-light mb-4">
                      {item.desc}
                    </p>
                    <p className="text-[11.5px] text-zinc-400 italic">
                      {item.detail}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="roles"
          className="px-5 sm:px-8 pb-16 sm:pb-24 scroll-mt-24"
        >
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.designedForEveryRole', 'Designed for every role')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.rolesTitle', 'Six distinctive roles')}
              </SectionH2>
              <p className="mt-5 text-[15px] text-zinc-300 font-light max-w-2xl leading-relaxed">
                {t('landing.rolesDesc', 'Every user sees exactly what they need — nothing more. Role scopes are enforced in code, not policy.')}
              </p>
            </Reveal>

            <div className="mt-12 space-y-3">
              {[
                {
                  role: t('landing.rolePlatformOwner', "Platform Owner"),
                  who: t('landing.rolePlatformOwnerWho', "Central IT / Platform maintainer"),
                  does: t('landing.rolePlatformOwnerDoes', "Global platform management, cross-state audit and analytics, top-level tenant provisioning"),
                  badge: t('landing.roleGlobalAuthority', "Global authority"),
                  badgeColor:
                    "bg-purple-500/[0.08] border-purple-500/15 text-purple-300",
                },
                {
                  role: t('landing.roleSuperAdmin', "State Super Admin"),
                  who: t('landing.roleSuperAdminWho', "State Nodal Officer"),
                  does: t('landing.roleSuperAdminDoes', "Cross-office management within their state, tenant provisioning, state-wide audit and analytics"),
                  badge: t('landing.roleHighestAuthority', "Highest authority (State)"),
                  badgeColor:
                    "bg-emerald-500/[0.08] border-emerald-500/15 text-emerald-300",
                },
                {
                  role: t('landing.roleAdmin', "Admin"),
                  who: t('landing.roleAdminWho', "Office administrator, IT manager"),
                  does: t('landing.roleAdminDoes', "Full office management — user creation, department setup, all complaints within their tenant"),
                  badge: t('landing.roleOfficeWide', "Office-wide"),
                  badgeColor:
                    "bg-teal-500/[0.08] border-teal-500/15 text-teal-300",
                },
                {
                  role: t('landing.roleDeptHead', "Department Head"),
                  who: t('landing.roleDeptHeadWho', "HOD, section chief"),
                  does: t('landing.roleDeptHeadDoes', "Assign complaints within their department, department analytics, SLA monitoring for their team"),
                  badge: t('landing.roleDeptScoped', "Dept-scoped"),
                  badgeColor:
                    "bg-blue-500/[0.08] border-blue-500/15 text-blue-300",
                },
                {
                  role: t('landing.roleOfficer', "Officer"),
                  who: t('landing.roleOfficerWho', "Field officers, resolution staff"),
                  does: t('landing.roleOfficerDoes', "See and action only their own assignments — update status, add notes, upload evidence"),
                  badge: t('landing.roleAssignmentScoped', "Assignment-scoped"),
                  badgeColor:
                    "bg-indigo-500/[0.08] border-indigo-500/15 text-indigo-300",
                },
                {
                  role: t('landing.roleCallOperator', "Call Operator"),
                  who: t('landing.roleCallOperatorWho', "Front-desk staff, call centre agents"),
                  does: t('landing.roleCallOperatorDoes', "Log complaints on behalf of citizens — phone, walk-in, letter — and track them by ID"),
                  badge: t('landing.roleIntakeOnly', "Intake only"),
                  badgeColor:
                    "bg-zinc-500/[0.08] border-zinc-500/15 text-zinc-400",
                },
              ].map((r, i) => (
                <Reveal key={r.role} delay={i * 0.06}>
                  <div className="rounded-2xl border border-white/[0.13] bg-white/[0.06] px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 group transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.25] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 ease-out">
                    <div className="sm:w-[160px] shrink-0">
                      <p className="text-[14px] font-semibold text-white tracking-tight group-hover:text-emerald-400 transition-colors duration-300">
                        {r.role}
                      </p>
                      <p className="text-[11.5px] text-zinc-400 mt-0.5 font-light">
                        {r.who}
                      </p>
                    </div>
                    <div className="flex-1 sm:border-l sm:border-white/[0.1] sm:pl-6">
                      <p className="text-[13px] text-zinc-300 font-light leading-relaxed">
                        {r.does}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[10.5px] font-medium ${r.badgeColor}`}
                      >
                        {r.badge}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <Eyebrow>{t('landing.whyNotHelpdesk')}</Eyebrow>
              <SectionH2 className="max-w-2xl">
                {t('landing.govGradeTools')}
              </SectionH2>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-12 rounded-2xl border border-white/[0.13] bg-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.25] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="grid grid-cols-3 text-[11px] uppercase tracking-[0.2em] text-zinc-400 border-b border-white/[0.1] px-6 py-3 bg-[#020617]/50">
                  <span>{t('landing.capabilityLabel', 'Capability')}</span>
                  <span className="text-center">{t('landing.genericHelpdesk', 'Generic helpdesk')}</span>
                  <span className="text-center text-emerald-400">
                    {t('landing.brandName', 'Bharat-Setu')}
                  </span>
                </div>
                {[
                  [
                    t('landing.capIso', "Multi-office data isolation"),
                    t('landing.genericPaid', "Paid enterprise tier"),
                    t('landing.pcrmBuiltIn', "Built in from ground up"),
                  ],
                  [
                    t('landing.capRoles', "Government role hierarchy"),
                    t('landing.genericRoles', "Generic agent/admin"),
                    t('landing.pcrmRoles', "5-level political hierarchy"),
                  ],
                  [
                    t('landing.capSla', "SLA auto-escalation"),
                    t('landing.genericSla', "Manual rules only"),
                    t('landing.pcrmSla', "Background job — automatic"),
                  ],
                  [
                    t('landing.capAi', "AI priority detection"),
                    t('landing.genericAi', "External API add-on"),
                    t('landing.pcrmAi', "Included, runs locally"),
                  ],
                  [
                    t('landing.capTrack', "Citizen tracking without login"),
                    t('landing.genericTrack', "Not standard"),
                    t('landing.pcrmTrack', "Core feature, no account needed"),
                  ],
                  [
                    t('landing.capRating', "Citizen satisfaction rating"),
                    t('landing.genericRating', "Not standard"),
                    t('landing.pcrmRating', "Built in, tracking ID only"),
                  ],
                  [
                    t('landing.capDupe', "Duplicate complaint detection"),
                    t('landing.genericDupe', "Not standard"),
                    t('landing.pcrmDupe', "TF-IDF cosine similarity engine"),
                  ],
                  [
                    t('landing.capAssign', "Department-scoped assignment"),
                    t('landing.genericAssign', "Not standard"),
                    t('landing.pcrmAssign', "Enforced in code — unbypassable"),
                  ],
                  [
                    t('landing.capAudit', "Immutable audit trail"),
                    t('landing.genericAudit', "Basic logs"),
                    t('landing.pcrmAudit', "Structured, queryable, atomic"),
                  ],
                ].map(([feat, generic, pcrm], i) => (
                  <div
                    key={feat}
                    className={`grid grid-cols-3 items-center px-6 py-3.5 text-[13px] gap-4 ${i % 2 === 0 ? "" : "bg-white/[0.03]"} border-b border-white/[0.07] last:border-0 transition-colors duration-300 hover:bg-white/[0.05] cursor-default`}
                  >
                    <span className="text-zinc-300 font-light">{feat}</span>
                    <span className="text-center text-zinc-400 font-light text-[12px]">
                      {generic}
                    </span>
                    <span className="text-center text-emerald-300/80 font-light text-[12px]">
                      {pcrm}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <Reveal className="px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="rounded-3xl border border-emerald-500/10 bg-linear-to-b from-emerald-500/[0.045] to-transparent p-10 sm:p-16 transition-all duration-500 hover:border-emerald-500/25 hover:from-emerald-500/[0.08] hover:shadow-[0_8px_40px_rgba(16,185,129,0.1)] hover:-translate-y-1 ease-out group">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/[0.09] border border-emerald-500/15 mb-7 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ease-out">
                <ShieldCheck className="h-7 w-7 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
              </div>
              <h2 className="text-2xl sm:text-[32px] font-light tracking-tight text-white leading-[1.2]">
                {t('landing.readyToBring')}
                <br className="hidden sm:block" />{t('landing.toYourOffice', 'to your office?')}</h2>
              <p className="mt-5 text-zinc-400 text-[14.5px] leading-relaxed max-w-lg mx-auto font-light">
                {t('hero.subtitle', 'No complaint is lost. No deadline is invisible. No step is undocumented. Start managing citizen grievances the way a modern office should.')}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-900/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] ease-out"
                >
                  {t('hero.getStartedBtn', 'Get started')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.08] hover:border-white/[0.25] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-1 ease-out"
                >
                  <Lock className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                  {t('hero.staffSignInBtn', 'Staff sign in')}
                </Link>
              </div>

              {/* Citizen links */}
              <div className="mt-8 pt-6 border-t border-white/[0.09]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400 mb-3">
                  {t('landing.citizensNoAccount')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.13] px-4 py-2 text-[12px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:border-white/[0.25] text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 ease-out"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />{t('landing.submitComplaintLabel', 'Submit a complaint')}<ArrowUpRight className="h-3 w-3 text-zinc-400" />
                  </Link>
                  <Link
                    href="/track"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.13] px-4 py-2 text-[12px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:border-white/[0.25] text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 ease-out"
                  >
                    <Search className="h-3.5 w-3.5 text-emerald-400" />{t('landing.trackComplaintLabel', 'Track a complaint')}<ArrowUpRight className="h-3 w-3 text-zinc-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <footer className="border-t border-white/[0.08] bg-[#020617]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Main columns */}
            <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2.5 group mb-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-400">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[14px] font-bold text-white">
                    {t('landing.brandName', 'Bharat-Setu')}
                  </span>
                </Link>
                <p className="text-[12.5px] text-zinc-400 leading-relaxed max-w-[200px]">
                  {t('landing.modernGrievance')}
                </p>
              </div>

              {/* Platform */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">{t('landing.platformLabel', 'Platform')}</p>
                <ul className="space-y-2.5">
                  {[
                    [t('nav.features', 'Features'), "#features"],
                    [t('nav.howItWorks', 'How it works'), "#workflow"],
                    ["AI intelligence", "#features"],
                    ["Analytics", "#features"],
                    [t('nav.roles', 'Roles'), "#roles"],
                  ].map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Citizens */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">{t('landing.citizensLabel', 'Citizens')}</p>
                <ul className="space-y-2.5">
                  {[
                    ["Submit a complaint", "/submit"],
                    ["Track your complaint", "/track"],
                    ["Rate the service", "/track"],
                  ].map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Access */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">{t('landing.accessLabel', 'Access')}</p>
                <ul className="space-y-2.5">
                  {[
                    ["Staff sign in", "/login"],
                    ["Request access", "/register"],
                  ].map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-all"
                  >{t('landing.getStarted', 'Get started')}<ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/[0.06] py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11.5px] text-zinc-500">
                &copy; {new Date().getFullYear()} P&#8209;CRM Platform. Built
                for public service.
              </p>
              <div className="flex items-center gap-3">
                {[
                  "Multi-tenant",
                  "AI-powered",
                  "Audit-ready",
                  "Open infrastructure",
                ].map((t, i, arr) => (
                  <React.Fragment key={t}>
                    <span className="text-[11.5px] text-zinc-500">{t}</span>
                    {i < arr.length - 1 && (
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
