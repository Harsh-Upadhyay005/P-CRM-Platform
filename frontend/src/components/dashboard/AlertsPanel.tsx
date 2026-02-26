'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import { Complaint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, ShieldAlert, Flame, Zap } from 'lucide-react';
import Link from 'next/link';

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getAlertConfig(c: Complaint): { badge: string; dot: string; icon: typeof AlertTriangle; label: string } {
  if (c.status === 'ESCALATED') {
    return { badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500 animate-pulse', icon: Zap, label: 'Escalated' };
  }
  if (c.priority === 'CRITICAL') {
    return { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-500 animate-pulse', icon: Flame, label: 'Critical' };
  }
  const hrs = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 3600000);
  if (hrs > 48) {
    return { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-500', icon: Clock, label: 'SLA Breach' };
  }
  return { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-500', icon: AlertTriangle, label: 'High Priority' };
}

export function AlertsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'alerts'],
    queryFn: () => complaintsApi.list({ status: 'ESCALATED', limit: 20 }),
    staleTime: 30_000,
  });

  const { data: critData } = useQuery({
    queryKey: ['complaints', 'critical'],
    queryFn: () => complaintsApi.list({ priority: 'CRITICAL', status: 'OPEN', limit: 10 }),
    staleTime: 30_000,
  });

  const escalated: Complaint[] = data?.data?.data ?? [];
  const critical: Complaint[] = critData?.data?.data ?? [];

  const alerts = [
    ...escalated,
    ...critical.filter((c) => !escalated.find((e) => e.id === c.id)),
  ].slice(0, 10);

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-400" />
          Active Alerts
        </CardTitle>
        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/25 text-xs font-mono">
          {isLoading ? '…' : alerts.length}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0">
        <ScrollArea className="h-85 pr-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">No active alerts</p>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert, i) => {
                const cfg = getAlertConfig(alert);
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link href={`/complaints/${alert.id}`}>
                      <div className={`group relative rounded-lg border ${cfg.badge} p-3 cursor-pointer hover:scale-[1.01] transition-all duration-200`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-md ${cfg.badge}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                              <p className="text-xs font-semibold text-white truncate">{alert.citizenName}</p>
                              <Badge variant="outline" className={`${cfg.badge} text-[9px] ml-auto`}>{cfg.label}</Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{alert.description}</p>
                            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{timeAgo(alert.createdAt)} · {alert.trackingId}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
