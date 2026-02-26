'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  KpiCards,
  TrendsChart,
  CategoryChart,
  AlertsPanel,
  ComplaintManager,
  TeamPerformance,
  QuickActions,
} from '@/components/dashboard';
import { Separator } from '@/components/ui/separator';
import { Activity } from 'lucide-react';

// Lazy-load the 3D component to avoid SSR issues and reduce initial bundle
const CommandCenter3D = dynamic(
  () => import('@/components/3d/CommandCenter3D').then((m) => ({ default: m.CommandCenter3D })),
  { ssr: false, loading: () => <div className="w-full h-70 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" /> },
);

export default function Dashboard() {
  return (
    <div className="h-full w-full flex flex-col gap-6 pb-8">
      {/* ── Header ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg"
      >
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-emerald-400">
            Political Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time overview of citizen complaints, team activity, and analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
          <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <Activity size={12} />
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* ── 3D Command Center ──────────────────────────────── */}
      <Suspense fallback={<div className="w-full h-70 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" />}>
        <CommandCenter3D />
      </Suspense>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <KpiCards />

      {/* ── Analytics + Alerts ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      <ComplaintManager />

      <Separator className="bg-white/5" />

      {/* ── Team Performance ───────────────────────────────── */}
      <TeamPerformance />

      {/* ── Quick Actions FAB ──────────────────────────────── */}
      <QuickActions />
    </div>
  );
}
