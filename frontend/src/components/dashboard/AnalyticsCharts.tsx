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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function TrendsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: () => analyticsApi.getTrends(30),
    staleTime: 60_000,
  });

  // getTrends returns ApiResponse<{ granularity, days, since, data: TrendPoint[] }>
  // so actual array is at data.data.data
  const trendData = (data?.data as any)?.data ?? [];

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
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
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
              <TabsTrigger value="bar" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">Bar</TabsTrigger>
              <TabsTrigger value="pie" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">Pie</TabsTrigger>
            </TabsList>
            <TabsContent value="bar" className="mt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
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
                  <Tooltip content={<CustomTooltip />} />
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
