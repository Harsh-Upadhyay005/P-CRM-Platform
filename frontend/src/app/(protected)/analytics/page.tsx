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
  CheckCircle, Clock, AlertTriangle, Download,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend, PieChart, Pie, LineChart, Line,
} from 'recharts';

const COLORS = ['#a855f7', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; fill?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="bg-slate-950/95 border border-white/20 rounded-lg px-3 py-2.5 min-w-32.5"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.75)' }}
    >
      {label && (
        <p className="text-xs font-semibold text-slate-300 mb-2 pb-1.5 border-b border-white/10">{label}</p>
      )}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: e.color ?? e.fill ?? '#a855f7' }}
          />
          <span className="text-xs text-slate-400">{e.name}:</span>
          <span className="text-sm font-bold text-white ml-auto pl-2">{e.value}</span>
        </div>
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
        { label: 'Total Complaints', value: o.total ?? 0, color: 'text-blue-400', icon: BarChart2, bg: 'bg-blue-500/10', border: 'border-blue-500/20', accent: 'bg-blue-500' },
        { label: 'Open', value: o.byStatus?.OPEN ?? 0, color: 'text-amber-400', icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20', accent: 'bg-amber-500' },
        { label: 'Resolved', value: o.resolvedCount ?? 0, color: 'text-emerald-400', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', accent: 'bg-emerald-500' },
        { label: 'Avg Resolution', value: o.avgResolutionTime ?? '—', color: 'text-purple-400', icon: Clock, bg: 'bg-purple-500/10', border: 'border-purple-500/20', accent: 'bg-purple-500' },
        { label: 'SLA Breached', value: o.sla?.breachedCount ?? 0, color: 'text-red-400', icon: ShieldAlert, bg: 'bg-red-500/10', border: 'border-red-500/20', accent: 'bg-red-500' },
        { label: 'Escalated', value: o.byStatus?.ESCALATED ?? 0, color: 'text-orange-400', icon: Zap, bg: 'bg-orange-500/10', border: 'border-orange-500/20', accent: 'bg-orange-500' },
      ]
    : [];

  const statusData = o
    ? [
        { name: 'Open', value: o.byStatus.OPEN, fill: '#f59e0b' },
        { name: 'Assigned', value: o.byStatus.ASSIGNED, fill: '#3b82f6' },
        { name: 'In Progress', value: o.byStatus.IN_PROGRESS, fill: '#a855f7' },
        { name: 'Escalated', value: o.byStatus.ESCALATED, fill: '#f97316' },
        { name: 'Resolved', value: o.byStatus.RESOLVED, fill: '#10b981' },
        { name: 'Closed', value: o.byStatus.CLOSED, fill: '#64748b' },
      ].filter((d) => d.value > 0)
    : [];

  const priorityData = o
    ? [
        { name: 'Low', value: o.byPriority.LOW, fill: '#10b981' },
        { name: 'Medium', value: o.byPriority.MEDIUM, fill: '#3b82f6' },
        { name: 'High', value: o.byPriority.HIGH, fill: '#f59e0b' },
        { name: 'Critical', value: o.byPriority.CRITICAL, fill: '#ef4444' },
      ]
    : [];

  const total = o?.total ?? 0;
  const resolutionRate = total > 0 ? +(((o?.resolvedCount ?? 0) / total) * 100).toFixed(1) : 0;
  const slaCompliance = total > 0 ? +(((total - (o?.sla?.breachedCount ?? 0)) / total) * 100).toFixed(1) : 100;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
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
                  className={`rounded-xl border ${s.border} ${s.bg} p-4 backdrop-blur-md relative overflow-hidden`}
                >
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${s.accent} opacity-60`} />
                  <Icon size={18} className={`${s.color} mb-3`} />
                  <p className="text-2xl font-bold text-white">{String(s.value)}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </motion.div>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <LoadingCard height={240} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                    {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, outline: 'none' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <LoadingCard height={240} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={priorityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, outline: 'none' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" name="Complaints" radius={[4, 4, 0, 0]}>
                    {priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Bars */}
      {!isLoading && o && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-emerald-400" /> Resolution Rate
                </span>
                <span className="text-sm font-bold text-emerald-400">{resolutionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${resolutionRate}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">{o.resolvedCount ?? 0} of {total} complaints resolved</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <ShieldAlert size={11} className="text-red-400" /> SLA Compliance
                </span>
                <span className={`text-sm font-bold ${slaCompliance >= 80 ? 'text-emerald-400' : slaCompliance >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {slaCompliance}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${slaCompliance >= 80 ? 'bg-emerald-500' : slaCompliance >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${slaCompliance}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">{o.sla?.breachedCount ?? 0} active complaints have breached SLA</p>
            </CardContent>
          </Card>
        </div>
      )}
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
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
    <div className="space-y-4">
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
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="total" name="Total" fill="#a855f7" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {!isLoading && rawDepts.length > 0 && (
        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Performance Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {rawDepts
                .slice()
                .sort((a: any, b: any) => (b.total ?? 0) - (a.total ?? 0))
                .map((d: any, i: number) => {
                  const name = d.department?.name ?? 'Unknown';
                  const tot = d.total ?? 0;
                  const resolved = (d.byStatus?.RESOLVED ?? 0) + (d.byStatus?.CLOSED ?? 0);
                  const breachPct: number = d.sla?.breachPct ?? 0;
                  const resRate = tot > 0 ? Math.round((resolved / tot) * 100) : 0;
                  return (
                    <div key={d.department?.id ?? i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <span className="text-xs font-bold text-slate-500 w-5 shrink-0">#{i + 1}</span>
                      <span className="text-xs font-medium text-white flex-1 truncate">{name}</span>
                      <span className="text-xs text-slate-400 w-16 text-right shrink-0">{tot} total</span>
                      <span className="text-xs text-emerald-400 w-16 text-right shrink-0">{resolved} done</span>
                      <div className="w-24 hidden sm:block shrink-0">
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${resRate}%` }} />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5 text-right">{resRate}% resolved</p>
                      </div>
                      <span className={`text-[10px] font-semibold w-20 text-right shrink-0 ${breachPct > 30 ? 'text-red-400' : breachPct > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {breachPct.toFixed(1)}% breach
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
    <div className="space-y-4">
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
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[0, 4, 4, 0]} opacity={0.85} />
                <Bar dataKey="completed" name="Resolved" fill="#10b981" radius={[0, 4, 4, 0]} opacity={0.85} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {!isLoading && rawOfficers.length > 0 && (
        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Efficiency Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rawOfficers
                .slice()
                .sort((a: any, b: any) => (b.resolvedCount ?? 0) - (a.resolvedCount ?? 0))
                .map((off: any, i: number) => {
                  const name = off.officer?.name ?? 'Unknown';
                  const assigned = off.totalAssigned ?? 0;
                  const resolved = off.resolvedCount ?? 0;
                  const rate = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;
                  return (
                    <div key={off.officer?.id ?? i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <span className={`text-xs font-bold w-5 shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-xs font-medium text-white flex-1 truncate">{name}</span>
                      <span className="text-xs text-slate-400 w-20 text-right shrink-0">{assigned} assigned</span>
                      <span className="text-xs text-emerald-400 w-20 text-right shrink-0">{resolved} resolved</span>
                      <div className="w-28 hidden sm:block shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-slate-500">Efficiency</span>
                          <span className={`text-[10px] font-semibold ${rate >= 70 ? 'text-emerald-400' : rate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{rate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, outline: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

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

  const TAB_TO_REPORT: Record<string, string> = {
    overview: 'overview', departments: 'departments', officers: 'officers', categories: 'categories',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={24} className="text-purple-400" /> Analytics
            </h1>
            <p className="text-slate-400 text-sm mt-1">Comprehensive insights into complaint management performance</p>
          </div>
          <button
            onClick={async () => {
              setExporting(true);
              try { await analyticsApi.exportAnalytics(TAB_TO_REPORT[activeTab] ?? 'overview'); }
              finally { setExporting(false); }
            }}
            disabled={exporting}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 shrink-0 mt-1"
          >
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
