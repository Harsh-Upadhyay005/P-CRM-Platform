'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsOverview } from '@/types';
import {
  BarChart2, TrendingUp, Building2, Users, ShieldAlert, Zap, Tag,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend, PieChart, Pie, LineChart, Line,
} from 'recharts';

const COLORS = ['#a855f7', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: e.color }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  );
}

function LoadingCard({ height = 300 }: { height?: number }) {
  return (
    <div className={`rounded-xl bg-slate-800/30 animate-pulse w-full`} style={{ height }} />
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
    staleTime: 60_000,
  });

  const o = data?.data as AnalyticsOverview | undefined;

  // getOverview returns { total, byStatus, byPriority, sla, avgResolutionTime, resolvedCount }
  const stats = o
    ? [
        { label: 'Total Complaints', value: o.total ?? 0, color: 'text-blue-400', icon: BarChart2, bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Open', value: o.byStatus?.OPEN ?? 0, color: 'text-amber-400', icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Resolved', value: o.resolvedCount ?? 0, color: 'text-emerald-400', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Avg Resolution', value: o.avgResolutionTime ?? '—', color: 'text-purple-400', icon: Clock, bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { label: 'SLA Breached', value: o.sla?.breachedCount ?? 0, color: 'text-red-400', icon: ShieldAlert, bg: 'bg-red-500/10', border: 'border-red-500/20' },
        { label: 'Escalated', value: o.byStatus?.ESCALATED ?? 0, color: 'text-orange-400', icon: Zap, bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-slate-800/30 animate-pulse" />)
          : stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`rounded-xl border ${s.border} ${s.bg} p-4 backdrop-blur-md`}
                >
                  <Icon size={18} className={`${s.color} mb-3`} />
                  <p className="text-2xl font-bold text-white">{String(s.value)}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}

// ─── Trends Tab ───────────────────────────────────────────────
function TrendsTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'trends', days],
    queryFn: () => analyticsApi.getTrends(days),
    staleTime: 60_000,
  });

  // getTrends returns ApiResponse<{ granularity, days, since, data: TrendPoint[] }>
  const trendData = (data?.data as any)?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
              ${days === d ? 'bg-purple-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            {d}d
          </button>
        ))}
      </div>
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Complaints Filed vs Resolved ({days} days)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingCard height={300} /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Filed" stroke="#a855f7" fill="url(#gc)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#gr)" strokeWidth={2} dot={false} />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Department Stats Tab ─────────────────────────────────────
function DepartmentTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: () => analyticsApi.getDepartmentStats(),
    staleTime: 120_000,
  });

  // getDepartmentStats returns array of { department: { id, name, slug, slaHours }, total, byStatus, sla, avgResolutionTime }
  const rawDepts: any[] = data?.data ?? [];
  const deptData = rawDepts.map((d) => ({
    name: d.department?.name ?? 'Unknown',
    total: d.total ?? 0,
    resolved: (d.byStatus?.RESOLVED ?? 0) + (d.byStatus?.CLOSED ?? 0),
    breachPct: d.sla?.breachPct ?? 0,
  }));

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">Department Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingCard height={340} /> : deptData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">No department data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={deptData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total" fill="#a855f7" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Officers Tab ─────────────────────────────────────────────
function OfficersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'officers'],
    queryFn: () => analyticsApi.getOfficerLeaderboard(),
    staleTime: 120_000,
  });

  // getOfficerLeaderboard returns array of { officer: { id, name }, totalAssigned, resolvedCount, ... }
  const rawOfficers: any[] = data?.data ?? [];
  const officers = rawOfficers.map((o) => ({
    name: o.officer?.name ?? 'Unknown',
    assigned: o.totalAssigned ?? 0,
    completed: o.resolvedCount ?? 0,
  }));

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">Officer Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingCard height={340} /> : officers.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">No officer data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={officers} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[0, 4, 4, 0]} opacity={0.85} />
              <Bar dataKey="completed" name="Resolved" fill="#10b981" radius={[0, 4, 4, 0]} opacity={0.85} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── SLA Heatmap Tab ──────────────────────────────────────────
function SlaHeatmapTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'sla-heatmap'],
    queryFn: () => analyticsApi.getSlaHeatmap(),
    staleTime: 120_000,
  });

  // getSlaHeatmap returns { granularity, since, periods, departments: [{ id, name, slaHours, heatmap:[{period,total,breached,breachPct}] }] }
  const raw = data?.data as any;
  const slaByDept = (raw?.departments ?? []).map((d: any) => {
    const hm: any[] = d.heatmap ?? [];
    const total = hm.reduce((s: number, h: any) => s + (h.total ?? 0), 0);
    const breached = hm.reduce((s: number, h: any) => s + (h.breached ?? 0), 0);
    return {
      name: d.name ?? 'Unknown',
      breachPct: total > 0 ? +(breached / total * 100).toFixed(1) : 0,
      total,
      breached,
    };
  });

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">SLA Breach Rate by Department</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingCard height={300} /> : slaByDept.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">No SLA data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={slaByDept} layout="vertical" margin={{ top: 5, right: 40, left: 90, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="breachPct" name="Breach %" fill="#ef4444" radius={[0, 4, 4, 0]} opacity={0.85} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Escalation Trends Tab ────────────────────────────────────
function EscalationTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'escalations', days],
    queryFn: () => analyticsApi.getEscalationTrends(days),
    staleTime: 60_000,
  });

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-300">Escalation Trends</CardTitle>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors
                ${days === d ? 'bg-orange-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingCard height={280} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={(data?.data as any)?.data ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="escalations" name="Escalations" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Category Tab ─────────────────────────────────────────────
function CategoryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'categories'],
    queryFn: () => analyticsApi.getCategoryDistribution(),
    staleTime: 120_000,
  });

  // getCategoryDistribution returns { total, uncategorized, categories: [{ category, total, ... }], ... }
  const rawCats: any[] = (data?.data as any)?.categories ?? [];
  const categoryData = rawCats.map((item, i) => ({
    name: item.category ?? 'Uncategorized',
    value: item.total,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">By Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingCard height={280} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Complaints" radius={[4, 4, 0, 0]}>
                  {categoryData.map((e, i) => <Cell key={i} fill={e.fill} opacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Distribution Share</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingCard height={280} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                  {categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { isDeptHead } = useRole();

  if (!isDeptHead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">You need at least Department Head access to view analytics.</p>
      </div>
    );
  }

  const tabs = [
    { value: 'overview', label: 'Overview', icon: BarChart2 },
    { value: 'trends', label: 'Trends', icon: TrendingUp },
    { value: 'departments', label: 'Departments', icon: Building2 },
    { value: 'officers', label: 'Officers', icon: Users },
    { value: 'sla', label: 'SLA Heatmap', icon: ShieldAlert },
    { value: 'escalations', label: 'Escalations', icon: Zap },
    { value: 'categories', label: 'Categories', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={24} className="text-purple-400" /> Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">Comprehensive insights into complaint management performance</p>
      </motion.div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-900/60 border border-white/5 h-10 flex-wrap gap-0.5 mb-6">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 gap-1.5 h-8"
            >
              <Icon size={13} /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="trends"><TrendsTab /></TabsContent>
        <TabsContent value="departments"><DepartmentTab /></TabsContent>
        <TabsContent value="officers"><OfficersTab /></TabsContent>
        <TabsContent value="sla"><SlaHeatmapTab /></TabsContent>
        <TabsContent value="escalations"><EscalationTab /></TabsContent>
        <TabsContent value="categories"><CategoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
