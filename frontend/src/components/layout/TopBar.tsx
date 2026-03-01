'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationsApi, getErrorMessage } from '@/lib/api';
import { Bell, User, Check, CheckCheck, Menu } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Notification } from '@/types';
import { useSidebar } from '@/lib/sidebar-context';

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

export function TopBar() {
  const { user } = useAuth();
  const { toggle } = useSidebar();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30_000,
    enabled: !!user,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    staleTime: 30_000,
    enabled: open && !!user,
  });

  const unreadCount = countData?.data?.unreadCount ?? 0;
  const notifications: Notification[] = notifData?.data?.data ?? [];

  // SSE connection for live updates with exponential-backoff reconnect
  useEffect(() => {
    if (!user) return;

    let retryDelay = 3_000;
    let retryTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      sseRef.current?.close();
      sseRef.current = new EventSource(`${API_BASE_URL}/notifications/stream`, { withCredentials: true });

      sseRef.current.addEventListener('notification', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      sseRef.current.onopen = () => {
        retryDelay = 3_000; // reset on successful connect
      };

      sseRef.current.onerror = () => {
        sseRef.current?.close();
        if (!destroyed) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 60_000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      sseRef.current?.close();
    };
  }, [user, queryClient]);

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-slate-900/90 backdrop-blur-xl border-b border-[#138808]/20 sticky top-0 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-linear-to-r from-transparent via-[#138808]/50 to-transparent opacity-50" />
      
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <span className="text-slate-400 text-sm hidden sm:block">Welcome back,</span>
        <span className="text-white font-semibold transform hover:scale-105 transition-transform cursor-default flex items-center gap-2">
          {user?.name}
          <div className="h-1.5 w-1.5 rounded-full bg-[#138808] shadow-[0_0_8px_#138808]" />
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 text-slate-400 hover:text-[#FF9933] transition-colors rounded-full hover:bg-[#FF9933]/10">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.75 shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-90 bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200 shadow-2xl p-0"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-400 hover:text-white gap-1"
                  onClick={handleMarkAll}
                >
                  <CheckCheck size={12} /> Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-95">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No notifications</p>
              ) : (
                <div>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group
                        ${!n.isRead ? 'bg-purple-500/5' : ''}`}
                      onClick={() => !n.isRead && handleMarkOne(n.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-purple-400' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                            onClick={(e) => { e.stopPropagation(); handleMarkOne(n.id); }}
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="px-4 py-2 border-t border-white/10">
              <Link href="/notifications" onClick={() => setOpen(false)}>
                <p className="text-xs text-purple-400 hover:text-purple-300 text-center transition-colors">
                  View all notifications →
                </p>
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/profile">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/10 shadow-lg cursor-pointer hover:scale-105 transition-transform">
            {user?.name?.[0]?.toUpperCase() || <User size={14} />}
          </div>
        </Link>
      </div>
    </header>
  );
}
