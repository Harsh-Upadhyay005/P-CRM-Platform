'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { alertsData, type Alert } from '@/lib/dashboard-mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Clock, ShieldAlert, Flame } from 'lucide-react';

const severityConfig: Record<Alert['severity'], { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500 animate-pulse' },
  warning:  { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  info:     { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-500' },
};

const typeIcon: Record<Alert['type'], LucideIcon> = {
  overdue: Clock,
  'high-priority': Flame,
  stale: AlertTriangle,
};

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AlertsPanel() {
  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-400" />
          Active Alerts
        </CardTitle>
        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/25 text-xs font-mono">
          {alertsData.length}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0">
        <ScrollArea className="h-85 pr-2">
          <div className="space-y-2.5">
            {alertsData.map((alert, i) => {
              const Icon = typeIcon[alert.type];
              const sev = severityConfig[alert.severity];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`group relative rounded-lg border ${sev.badge} p-3 cursor-pointer
                    hover:scale-[1.01] transition-all duration-200`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 p-1.5 rounded-md ${sev.badge}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot} shrink-0`} />
                        <p className="text-xs font-semibold text-white truncate">{alert.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{alert.description}</p>
                      <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{timeAgo(alert.timestamp)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
