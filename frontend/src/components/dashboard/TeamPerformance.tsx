"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Star, Trophy } from "lucide-react";
import { useRole } from "@/hooks/useRole";

export function TeamPerformance() {
  const { isCitizen } = useRole();

  // Always call hooks — just disable the query for citizens
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "officers"],
    queryFn: () => analyticsApi.getOfficerLeaderboard(),
    staleTime: 120_000,
    enabled: !isCitizen,
  });

  if (isCitizen) {
    return null;
  }

  // Backend returns: { officer:{id,name}, totalAssigned, resolvedCount, openCount, escalatedCount,
  //                   slaBreachedActive, slaComplianceRate, avgResolutionTime, rank, performanceTier }
  // Sort by resolution rate descending; officers with no assignments go to the bottom
  const officers = [...(data?.data ?? [])].sort((a: any, b: any) => {
    if (!a.totalAssigned) return 1;
    if (!b.totalAssigned) return -1;
    return (b.resolvedCount / b.totalAssigned) - (a.resolvedCount / a.totalAssigned);
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Users size={16} className="text-purple-400" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-slate-800/30 animate-pulse"
              />
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
            <Users size={16} className="text-purple-400" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-500 text-center py-8">
            No officer data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {officers.map((member: any, i: number) => {
            const officerId: string = member.officer?.id ?? "";
            const name: string = member.officer?.name ?? "Unknown";
            const assigned: number = member.totalAssigned ?? 0;
            const completed: number = member.resolvedCount ?? 0;
            const pending: number = member.openCount ?? (assigned - completed);
            const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
            const slaBreachedActive: number = member.slaBreachedActive ?? 0;
            const escalated: number = member.escalatedCount ?? 0;
            const isTop = i === 0;

            return (
              <motion.div
                key={officerId || name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/complaints/assigned/${officerId}`}
                  className={`block rounded-xl border border-white/5 p-4 cursor-pointer transition-all duration-200
                    ${isTop
                      ? "bg-linear-to-br from-amber-500/5 to-transparent ring-1 ring-amber-500/20 hover:bg-slate-800/60"
                      : "bg-slate-800/30 hover:bg-slate-800/60 hover:ring-white/10"
                    }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9 ring-2 ring-white/10">
                      <AvatarFallback className="bg-slate-700 text-slate-200 text-xs font-bold">
                        {name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate">
                        {name}
                      </p>
                      {isTop && (
                        <Trophy size={14} className="text-amber-400 shrink-0 ml-2" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Completion
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          {completionRate}%
                        </span>
                      </div>
                      <Progress
                        value={completionRate}
                        className="h-1.5 bg-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">{assigned}</p>
                        <p className="text-[9px] text-slate-500 uppercase">
                          Assigned
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-400">
                          {completed}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase">
                          Resolved
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-bold ${pending > 0 ? "text-amber-400" : "text-slate-400"}`}>
                          {pending}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase">
                          Pending
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1"
                      >
                        <Clock size={9} /> {member.avgResolutionTime ?? "—"}
                      </Badge>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(member.slaComplianceRate ?? 0) > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1"
                          >
                            <Star size={9} /> {member.slaComplianceRate}%
                          </Badge>
                        )}
                        {slaBreachedActive > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-red-500/10 border-red-500/20 text-red-400 gap-1"
                          >
                            SLA: {slaBreachedActive}
                          </Badge>
                        )}
                        {escalated > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-orange-500/10 border-orange-500/20 text-orange-400 gap-1"
                          >
                            Esc: {escalated}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
