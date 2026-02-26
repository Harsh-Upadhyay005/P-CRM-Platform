'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { kpiStats } from '@/lib/dashboard-mock-data';
import type { LucideIcon } from 'lucide-react';
import {
  Inbox,
  Clock,
  Loader,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  inbox: Inbox,
  clock: Clock,
  loader: Loader,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
};

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'shadow-blue-500/20',    icon: 'text-blue-400' },
  indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400',  glow: 'shadow-indigo-500/20',  icon: 'text-indigo-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/20',   icon: 'text-amber-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'shadow-purple-500/20',  icon: 'text-purple-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', icon: 'text-emerald-400' },
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     glow: 'shadow-red-500/20',     icon: 'text-red-400' },
};

export function KpiCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpiStats.map((stat, i) => {
        const Icon = iconMap[stat.icon] || Inbox;
        const c = colorMap[stat.color] || colorMap.purple;
        const isPositive = stat.change >= 0;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`relative group rounded-xl border ${c.border} ${c.bg} p-4 overflow-hidden backdrop-blur-md
              hover:scale-[1.03] hover:shadow-lg ${c.glow} transition-all duration-300 cursor-default`}
          >
            {/* Glow blob */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${c.bg}`} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${c.bg} ring-1 ring-white/5`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(stat.change)}%
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
