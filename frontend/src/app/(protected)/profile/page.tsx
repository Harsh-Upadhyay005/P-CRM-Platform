'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Mail, Building, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { role } = useRole();

  if (!user) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20 pointer-events-none" />
        
        <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ring-slate-900 z-10">
                <span className="text-3xl font-bold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                </span>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                {role?.replace('_', ' ')}
            </div>
        </div>

        <div className="mt-8 space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Mail size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-slate-200 font-medium">{user.email}</p>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Building size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Department</p>
                    <p className="text-slate-200 font-medium">
                        {user.department?.name || 'General Administration'}
                    </p>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Shield size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Account Status</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-slate-200 font-medium">
                            {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
            <button 
                onClick={() => logout()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all font-medium group w-full justify-center sm:w-auto"
            >
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                Sign Out
            </button>
        </div>
      </motion.div>
    </div>
  );
}
