'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, getErrorMessage } from '@/lib/api';
import { Notification } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCheck, Check, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sseRef = useRef<EventSource | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => notificationsApi.list({ page, limit: 30 }),
    staleTime: 10_000,
  });

  const notifications: Notification[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;
  const unread = notifications.filter((n) => !n.isRead).length;

  // SSE live connection
  useEffect(() => {
    if (!user) return;
    sseRef.current = new EventSource(`${API_BASE_URL}/notifications/stream`, { withCredentials: true });
    sseRef.current.addEventListener('notification', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    sseRef.current.onerror = () => sseRef.current?.close();
    return () => sseRef.current?.close();
  }, [user, qc]);

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={24} className="text-purple-400" /> Notifications
            {unread > 0 && (
              <Badge className="bg-purple-600 text-white text-xs px-2">{unread} unread</Badge>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Stay up to date with complaint updates and system events</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ['notifications'] })}
          >
            <RefreshCw size={13} /> Refresh
          </Button>
          {unread > 0 && (
            <Button
              size="sm"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 gap-1.5"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck size={13} /> Mark all read
            </Button>
          )}
        </div>
      </motion.div>

      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/30 animate-pulse m-2 rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Bell size={40} className="text-slate-600" />
              <p className="text-slate-500 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-3 px-6 py-4 border-b border-white/5 hover:bg-white/2 transition-colors group
                    ${!n.isRead ? 'bg-purple-500/4' : ''}`}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-purple-400' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1.5 font-mono">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
                      title="Mark as read"
                      onClick={() => markOneMutation.mutate(n.id)}
                    >
                      <Check size={13} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">Page {page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 bg-slate-800/50 text-slate-300" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 bg-slate-800/50 text-slate-300" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
