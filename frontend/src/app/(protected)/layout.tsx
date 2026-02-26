'use client';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // We can add global checks or loading states here
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 transition-all duration-300">
        <TopBar />
        <main className="flex-1 p-6 relative overflow-hidden">
             {/* 3D Content Background Overlay could go here */}
             <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-900/5 via-transparent to-purple-900/5" />
             <div className="relative z-10 w-full h-full">
               {children}
             </div>
        </main>
      </div>
    </div>
  );
}
