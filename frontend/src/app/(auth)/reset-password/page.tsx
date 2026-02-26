'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { authApi, getErrorMessage } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Invalid or missing reset token'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans p-4 overflow-hidden">
      <AbstractBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4">
              <Lock size={22} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
            <p className="text-slate-400 text-sm mt-1.5">Enter your new password below</p>
          </div>

          {!token ? (
            <div className="text-center space-y-4">
              <AlertTriangle size={40} className="text-amber-400 mx-auto" />
              <p className="text-slate-300 text-sm">Invalid or missing reset token. Please request a new password reset link.</p>
              <Link href="/forgot-password" className="block text-purple-400 hover:text-purple-300 text-sm">
                Request new link →
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
              <p className="text-white font-semibold">Password reset successfully!</p>
              <p className="text-slate-400 text-sm">Redirecting you to login…</p>
              <Link href="/login" className="block text-purple-400 hover:text-purple-300 text-sm">
                Login now →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Password strength hint */}
              {password && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? password.length >= 12
                            ? 'bg-emerald-500'
                            : password.length >= 8
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-purple-900/30"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>

              <Link href="/login" className="block text-slate-500 hover:text-slate-300 text-sm text-center transition-colors">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
