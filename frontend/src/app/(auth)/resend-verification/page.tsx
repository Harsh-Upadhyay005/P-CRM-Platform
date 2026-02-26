'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { authApi } from '@/lib/api';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.resendVerification(email);
      setSuccess(true);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Something went wrong. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans p-4 overflow-hidden">
      <AbstractBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="backdrop-blur-xl bg-[#020617]/40 border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          {success ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center relative z-10 py-4"
            >
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center ring-1 ring-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white mb-1">Email Sent!</h2>
                <p className="text-zinc-400 text-sm">
                  A new verification link has been sent to <span className="text-emerald-400">{email}</span>.
                  Check your inbox.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 w-full border border-white/10 hover:bg-white/5 text-zinc-300 font-medium py-3 rounded-lg transition-all text-sm text-center"
              >
                Back to Login
              </Link>
            </motion.div>
          ) : (
            <div className="relative z-10">
              <div className="mb-8">
                <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 mb-4">
                  <Mail className="w-6 h-6 text-emerald-300" />
                </div>
                <h1 className="text-2xl font-light text-white mb-1">Resend Verification</h1>
                <p className="text-zinc-500 text-xs uppercase tracking-widest">Enter your registered email</p>
              </div>

              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="email"
                      required
                      className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-4 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30"
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Verification Email
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center pt-4 border-t border-dashed border-white/5 text-xs">
                <Link href="/login" className="text-emerald-300 font-medium hover:text-white transition-colors">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-[10px] text-zinc-600 uppercase tracking-widest">
          &copy; 2026 P-CRM Platform. Secure Access.
        </div>
      </motion.div>
    </div>
  );
}
