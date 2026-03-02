'use client';

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend, PieChart, Pie,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORY_COLORS = ['#a855f7', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; fill?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="bg-slate-950/95 border border-white/20 rounded-lg px-3 py-2.5 min-w-[130px]"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.75)' }}
    >
      {label && (
        <p className="text-xs font-semibold text-slate-300 mb-2 pb-1.5 border-b border-white/10">{label}</p>
      )}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color ?? entry.fill ?? '#a855f7' }}
          />
          <span className="text-xs text-slate-400">{entry.name}:</span>
          <span className="text-sm font-bold text-white ml-auto pl-2">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: () => analyticsApi.getTrends(30),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // getTrends returns ApiResponse<{ granularity, days, since, data: TrendPoint[] }>
  // so actual array is at data.data.data
  const trendData = (data?.data as any)?.data ?? [];

  // Show ~7 date labels regardless of dataset size; format as "M/D"
  const tickInterval = Math.max(1, Math.ceil(trendData.length / 7) - 1);
  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-');
    return `${parseInt(m)}/${parseInt(day)}`;
  };

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">Complaints Over Time (30 days)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-65 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradComplaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtDate}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, outline: 'none' }}
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="total" name="Filed" stroke="#a855f7" fill="url(#gradComplaints)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#gradResolved)" strokeWidth={2} dot={false} />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'categories'],
    queryFn: () => analyticsApi.getCategoryDistribution(),
    staleTime: 120_000,
  });

  // getCategoryDistribution returns ApiResponse<{ total, uncategorized, categories: { category, total, ... }[], ... }>
  const rawCategories: any[] = (data?.data as any)?.categories ?? [];
  const categoryData = rawCategories.map((item, i) => ({
    name: item.category ?? 'Uncategorized',
    value: item.total,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">Category Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-55 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
          </div>
        ) : (
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="bg-slate-800/50 border border-white/5 mb-2 h-8">
              <TabsTrigger value="bar" className="text-xs text-slate-400 data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">Bar</TabsTrigger>
              <TabsTrigger value="pie" className="text-xs text-slate-400 data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">Pie</TabsTrigger>
            </TabsList>
            <TabsContent value="bar" className="mt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, outline: 'none' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" name="Complaints" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, idx) => <Cell key={idx} fill={entry.fill} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="pie" className="mt-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                    {categoryData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, outline: 'none' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
