'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/lib/api';
import { AuditLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRole } from '@/hooks/useRole';

function timeAgo(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function actionColor(action: string) {
  if (/create|assign/i.test(action)) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (/update|status|escalat/i.test(action)) return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  if (/delete|deactivat/i.test(action)) return 'bg-red-500/15 text-red-400 border-red-500/20';
  if (/login|logout|auth/i.test(action)) return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
}

export default function AuditLogsPage() {
  const { isAdmin, isSuperAdmin } = useRole();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: actionsData } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => auditLogsApi.getActions(),
    staleTime: 60_000 * 5,
  });
  const actions: string[] = actionsData?.data ?? [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, action, entityType, fromDate, toDate],
    queryFn: () => auditLogsApi.getLogs({
      page,
      limit: 25,
      ...(action && action !== 'all' ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(fromDate ? { from: fromDate } : {}),
      ...(toDate ? { to: toDate } : {}),
    }),
    staleTime: 15_000,
    enabled: isAdmin || isSuperAdmin,
  });

  const logs: AuditLog[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const displayed = search
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.entityType?.toLowerCase().includes(search.toLowerCase()) ||
          (l.user as any)?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Access Denied</p>
          <p className="text-slate-400 text-sm mt-1">Audit logs are restricted to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-purple-400" /> Audit Logs
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track every action performed in the system</p>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </motion.div>

      {/* Filters */}
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search user, action, entity…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm h-9"
              />
            </div>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger className="w-48 bg-slate-800/60 border-white/10 text-slate-300 text-sm h-9">
                <Filter size={13} className="mr-1 text-slate-500" />
                <SelectValue placeholder="Filter action" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Entity type…"
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="w-36 bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm h-9"
            />
            <input
              type="date"
              title="From date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-40 bg-slate-800/60 border border-white/10 rounded-md px-3 text-slate-300 text-sm h-9 focus:outline-none focus:border-purple-500/50 scheme-dark"
            />
            <input
              type="date"
              title="To date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-40 bg-slate-800/60 border border-white/10 rounded-md px-3 text-slate-300 text-sm h-9 focus:outline-none focus:border-purple-500/50 scheme-dark"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entity ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-5 py-3.5">
                            <div className="h-3.5 bg-slate-800/60 animate-pulse rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : displayed.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-500 text-sm">No audit logs found</td>
                    </tr>
                  )
                  : displayed.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{timeAgo(log.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-300 text-sm">
                          {(log.user as any)?.name ?? log.userId ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className={`text-[11px] font-mono border ${actionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{log.entityType ?? '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 truncate max-w-30">{log.entityId ?? '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">{log.ipAddress ?? '—'}</td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Page {page} of {pagination.totalPages} · {pagination.total} total records
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-white/10 bg-slate-800/50 text-slate-300" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={13} />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-white/10 bg-slate-800/50 text-slate-300" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
