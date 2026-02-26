'use client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, User } from 'lucide-react';

export function TopBar() {
  const { user } = useAuth();
  
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or Title could go here */}
        <span className="text-slate-400 text-sm">Welcome back,</span>
        <span className="text-white font-semibold transform hover:scale-105 transition-transform cursor-default">
          {user?.name}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/10 shadow-lg">
          {user?.name?.[0]?.toUpperCase() || <User size={14} />}
        </div>
      </div>
    </header>
  );
}
