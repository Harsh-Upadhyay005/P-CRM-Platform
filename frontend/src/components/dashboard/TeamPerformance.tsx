'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Clock, Star } from 'lucide-react';

export function TeamPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'officers'],
    queryFn: () => analyticsApi.getOfficerLeaderboard(),
    staleTime: 120_000,
  });

  // getOfficerLeaderboard returns [{ officer:{id,name}, totalAssigned, resolvedCount, slaComplianceRate, avgResolutionTime, ... }]
  const officers = [...(data?.data ?? [])].sort(
    (a: any, b: any) => (b.resolvedCount / (b.totalAssigned || 1)) - (a.resolvedCount / (a.totalAssigned || 1))
  );

  if (isLoading) {
    return (
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Users size={16} className="text-purple-400" />Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-800/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (officers.length === 0) {
    return (
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Users size={16} className="text-purple-400" />Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-500 text-center py-8">No officer data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Users size={16} className="text-purple-400" />Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {officers.map((member: any, i: number) => {
            const name: string = member.officer?.name ?? 'Unknown';
            const assigned: number = member.totalAssigned ?? 0;
            const completed: number = member.resolvedCount ?? 0;
            const completionRate = Math.round((completed / (assigned || 1)) * 100);
            const isTop = i === 0;
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative rounded-xl border border-white/5 p-4
                  ${isTop ? 'bg-linear-to-br from-amber-500/5 to-transparent ring-1 ring-amber-500/20' : 'bg-slate-800/30'}
                  hover:bg-slate-800/50 transition-all duration-200`}
              >
                {isTop && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-amber-500/20 rounded-full p-1 ring-1 ring-amber-500/40">
                      <Trophy size={12} className="text-amber-400" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9 ring-2 ring-white/10">
                    <AvatarFallback className="bg-slate-700 text-slate-200 text-xs font-bold">
                      {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{name}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Completion</span>
                      <span className="text-xs font-mono text-slate-300">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5 bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{assigned}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Assigned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-400">{completed}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-amber-400">{assigned - completed}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <Badge variant="outline" className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1">
                      <Clock size={9} /> {member.avgResolutionTime ?? '—'}
                    </Badge>
                    {(member.slaComplianceRate ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1">
                        <Star size={9} /> {member.slaComplianceRate}% SLA
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
