'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { teamData } from '@/lib/dashboard-mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Clock, Star } from 'lucide-react';

export function TeamPerformance() {
  // Sort by completion rate
  const sorted = [...teamData].sort((a, b) => (b.completed / b.assigned) - (a.completed / a.assigned));

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
          {sorted.map((member, i) => {
            const completionRate = Math.round((member.completed / member.assigned) * 100);
            const isTop = i === 0;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative rounded-xl border border-white/5 p-4 
                  ${isTop ? 'bg-gradient-to-br from-amber-500/5 to-transparent ring-1 ring-amber-500/20' : 'bg-slate-800/30'}
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
                      {member.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{member.department}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Completion rate */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Completion</span>
                      <span className="text-xs font-mono text-slate-300">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5 bg-slate-700">
                    </Progress>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{member.assigned}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Assigned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-400">{member.completed}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-amber-400">{member.pending}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Pending</p>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <Badge variant="outline" className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1">
                      <Clock size={9} /> {member.avgResolutionHours}h avg
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-transparent border-white/10 text-slate-400 gap-1">
                      <Star size={9} /> {member.satisfaction}%
                    </Badge>
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
