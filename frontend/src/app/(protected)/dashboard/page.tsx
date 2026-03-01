'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  KpiCards,
  TrendsChart,
  CategoryChart,
  AlertsPanel,
  ComplaintManager,
  TeamPerformance,
  QuickActions,
  IndiaMapView,
} from '@/components/dashboard';
import { Separator } from '@/components/ui/separator';
import { Activity, Shield } from 'lucide-react';

// Lazy-load the 3D component to avoid SSR issues and reduce initial bundle
const CommandCenter3D = dynamic(
  () => import('@/components/3d/CommandCenter3D').then((m) => ({ default: m.CommandCenter3D })),
  { ssr: false, loading: () => <div className="w-full h-70 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" /> },
);

export default function Dashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);

  // GSAP staggered section reveal
  useEffect(() => {
    if (!dashboardRef.current) return;
    const sections = dashboardRef.current.querySelectorAll('.dashboard-section');
    gsap.fromTo(
      sections,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.2,
      },
    );
  }, []);

  return (
    <div ref={dashboardRef} className="h-full w-full flex flex-col gap-6 pb-8">
      {/* ── Header ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Tricolor top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)' }} />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF9933]/10 flex items-center justify-center border border-[#FF9933]/20">
            <Shield size={20} className="text-[#FF9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)' }}>
              National Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time overview of citizen complaints, team activity, and analytics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-[#138808]/10 text-[#34D399] border border-[#138808]/20 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(19,136,8,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            LIVE
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#FF9933]/10 text-[#FF9933] border border-[#FF9933]/20 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,153,51,0.15)]">
            <Activity size={12} />
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* ── 3D Command Center ──────────────────────────────── */}
      <div className="dashboard-section">
        <Suspense fallback={<div className="w-full h-70 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" />}>
          <CommandCenter3D />
        </Suspense>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="dashboard-section">
        <KpiCards />
      </div>

      {/* ── India Map ──────────────────────────────────────── */}
      <div className="dashboard-section">
        <IndiaMapView />
      </div>

      {/* ── Analytics + Alerts ─────────────────────────────── */}
      <div className="dashboard-section grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <TrendsChart />
          <CategoryChart />
        </div>
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* ── Complaint Management ───────────────────────────── */}
      <div className="dashboard-section">
        <ComplaintManager />
      </div>

      <Separator className="bg-white/5" />

      {/* ── Team Performance ───────────────────────────────── */}
      <div className="dashboard-section">
        <TeamPerformance />
      </div>

      {/* ── Quick Actions FAB ──────────────────────────────── */}
      <QuickActions />
    </div>
  );
}
