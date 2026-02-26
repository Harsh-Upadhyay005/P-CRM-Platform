'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { authApi, getErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
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
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4">
              <Mail size={22} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h1>
            <p className="text-slate-400 text-sm mt-1.5 text-center">
              {sent ? "Check your inbox" : "Enter your email and we'll send a reset link"}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 size={48} className="text-emerald-400" />
              </div>
              <p className="text-slate-300 text-sm">
                If an account with <span className="text-white font-medium">{email}</span> exists, a password reset link has been sent. Please check your email.
              </p>
              <Link href="/login" className="block mt-4 text-purple-400 hover:text-purple-300 text-sm text-center transition-colors">
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-purple-900/30"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mt-2"
              >
                <ArrowLeft size={13} /> Back to login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
