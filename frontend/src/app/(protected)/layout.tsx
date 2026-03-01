'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context';

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isOpen, close } = useSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-purple-500/30">
      <Sidebar />
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}
      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 min-w-0">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 relative overflow-hidden">
             {/* 3D Content Background Overlay */}
             <div className="absolute inset-0 pointer-events-none">
               <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
               <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
             </div>
             <div className="relative z-10 w-full h-full">
               {children}
             </div>
        </main>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </SidebarProvider>
  );
}
