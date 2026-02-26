'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, Search, FileText } from 'lucide-react';
import Link from 'next/link';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Don't block render — unauthenticated users should see the landing page immediately.
  // The redirect to /dashboard happens once loading finishes (see useEffect above).
  if (isLoading && !user) return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans bg-[#020617]">
      <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans">
      <AbstractBackground />
      
      <div className="z-10 w-full max-w-md px-6 text-center">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, type: "spring" }}
           className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 hover:rotate-6 transition-transform"
        >
          <User className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg tracking-tight">
          P-CRM
        </h1>
        
        <p className="text-gray-200 mb-10 text-lg font-light leading-relaxed max-w-xs mx-auto">
          Manage your political office with clarity and efficiency.
        </p>

        <div className="space-y-3">
          <Link
            href="/register"
            className="group relative w-full block bg-white text-gray-900 font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
          >
             <span className="relative z-10 flex items-center justify-center gap-2">
               Get Started
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </span>
          </Link>
          
          <Link
            href="/login"
            className="block w-full bg-white/10 text-white font-semibold py-4 rounded-xl border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In
          </Link>

          {/* Public features — no login required */}
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider">Citizen Services — No Login Required</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/submit"
                className="flex items-center justify-center gap-2 bg-purple-600/15 text-purple-300 font-medium py-3 rounded-xl border border-purple-500/20 hover:bg-purple-600/25 transition-all text-sm"
              >
                <FileText className="w-4 h-4" /> Submit Complaint
              </Link>
              <Link
                href="/track"
                className="flex items-center justify-center gap-2 bg-white/5 text-slate-300 font-medium py-3 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm"
              >
                <Search className="w-4 h-4" /> Track Complaint
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-sm text-gray-500/80">
             © 2026 P-CRM Platform
        </div>
      </div>
    </div>
  );
}
