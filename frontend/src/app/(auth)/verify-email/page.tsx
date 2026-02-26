'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { authApi } from '@/lib/api';

type Status = 'loading' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'missing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          setErrorMessage(
            axiosErr.response?.data?.message || 'Verification failed. The link may have expired.'
          );
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Verification failed. The link may have expired.');
        }
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans p-4 overflow-hidden">
      <AbstractBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="backdrop-blur-xl bg-[#020617]/40 border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl p-10 relative overflow-hidden text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Loading */}
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center ring-1 ring-blue-500/30">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white mb-1">Verifying your email</h2>
                <p className="text-zinc-400 text-sm">Please wait a moment…</p>
              </div>
            </motion.div>
          )}

          {/* Success */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center ring-1 ring-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white mb-1">Email Verified!</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Your account has been activated. You can now sign in.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.01] text-sm uppercase tracking-wider"
              >
                Go to Login
              </Link>
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center ring-1 ring-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white mb-1">Verification Failed</h2>
                <p className="text-red-300/80 text-sm mb-6">{errorMessage}</p>
              </div>
              <div className="w-full flex flex-col gap-2">
                <Link
                  href="/resend-verification"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.01] text-sm uppercase tracking-wider"
                >
                  Resend Verification Email
                </Link>
                <Link
                  href="/login"
                  className="w-full border border-white/10 hover:bg-white/5 text-zinc-300 font-medium py-3 rounded-lg transition-all text-sm"
                >
                  Back to Login
                </Link>
              </div>
            </motion.div>
          )}

          {/* Missing token */}
          {status === 'missing' && (
            <motion.div
              key="missing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 bg-yellow-500/15 rounded-full flex items-center justify-center ring-1 ring-yellow-500/40">
                <Mail className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white mb-1">No Token Found</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  This link appears to be invalid. Please use the link from your verification email.
                </p>
              </div>
              <div className="w-full flex flex-col gap-2">
                <Link
                  href="/resend-verification"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.01] text-sm uppercase tracking-wider"
                >
                  Resend Verification Email
                </Link>
                <Link
                  href="/login"
                  className="w-full border border-white/10 hover:bg-white/5 text-zinc-300 font-medium py-3 rounded-lg transition-all text-sm"
                >
                  Back to Login
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        <div className="text-center mt-6 text-[10px] text-zinc-600 uppercase tracking-widest">
          &copy; 2026 P-CRM Platform. Secure Access.
        </div>
      </motion.div>
    </div>
  );
}
