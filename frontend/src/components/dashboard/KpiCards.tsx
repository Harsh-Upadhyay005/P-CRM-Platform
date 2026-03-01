'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import type { LucideIcon } from 'lucide-react';
import type { AnalyticsOverview } from '@/types';
import {
  Inbox,
  Clock,
  Loader,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
} from 'lucide-react';

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  saffron: { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400',  glow: 'shadow-orange-500/20',  icon: 'text-orange-400' },
  navy:    { bg: 'bg-blue-800/10',    border: 'border-blue-800/20',    text: 'text-blue-300',    glow: 'shadow-blue-800/20',    icon: 'text-blue-300' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/20',   icon: 'text-amber-400' },
  indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400',  glow: 'shadow-indigo-500/20',  icon: 'text-indigo-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', icon: 'text-emerald-400' },
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     glow: 'shadow-red-500/20',     icon: 'text-red-400' },
};

interface KpiStatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  change?: number;
}

export function KpiCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
    staleTime: 60_000,
  });

  const overview = data?.data as AnalyticsOverview | undefined;

  // getOverview returns { total, byStatus, byPriority, sla, avgResolutionTime, resolvedCount }
  const stats: KpiStatItem[] = overview
    ? [
        { label: 'Total Complaints', value: overview.total ?? 0, icon: Inbox, color: 'saffron' },
        { label: 'Open', value: overview.byStatus?.OPEN ?? 0, icon: Clock, color: 'navy' },
        { label: 'In Progress', value: (overview.byStatus?.IN_PROGRESS ?? 0) + (overview.byStatus?.ASSIGNED ?? 0), icon: Loader, color: 'indigo' },
        { label: 'Resolved', value: overview.resolvedCount ?? 0, icon: CheckCircle, color: 'emerald' },
        { label: 'SLA Breached', value: overview.sla?.breachedCount ?? 0, icon: AlertTriangle, color: 'red' },
        { label: 'Escalated', value: overview.byStatus?.ESCALATED ?? 0, icon: Zap, color: 'amber' },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-white/5 bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const c = colorMap[stat.color] || colorMap.purple;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`relative group rounded-xl border ${c.border} ${c.bg} p-4 overflow-hidden backdrop-blur-md
              hover:scale-[1.03] hover:shadow-lg ${c.glow} transition-all duration-300 cursor-default`}
          >
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${c.bg}`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${c.bg} ring-1 ring-white/5`}>
                  <Icon size={18} className={c.icon} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
