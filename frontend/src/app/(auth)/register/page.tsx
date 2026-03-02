'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Building, ArrowRight, ArrowLeft, Loader2, LayoutGrid, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import AbstractBackground from '@/components/3d/AbstractBackground';
import { authApi } from '@/lib/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tenantSlug: '',
  });
  const [tenants, setTenants] = useState<{ name: string; slug: string }[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch('/api/v1/complaints/public/tenants')
      .then((r) => r.json())
      .then((data) => {
        const list: { name: string; slug: string }[] = Array.isArray(data?.data) ? data.data : [];
        setTenants(list);
        if (list.length > 0) {
          setFormData((prev) => ({ ...prev, tenantSlug: list[0].slug }));
        }
      })
      .catch(() => {})
      .finally(() => setTenantsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.register(formData);
      setSuccess(true);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Something went wrong');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center font-sans p-4">
        <AbstractBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 bg-[#020617]/60 backdrop-blur-2xl p-10 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />

          {/* Animated mail icon */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-40" />
            <div className="relative w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center ring-1 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Mail className="w-7 h-7 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Check Your Email</h2>
          <p className="text-zinc-400 text-sm mb-1">
            A verification link has been sent to
          </p>
          <p className="text-emerald-400 font-medium text-sm mb-5 break-all">{formData.email}</p>
          <p className="text-zinc-500 text-xs mb-8 leading-relaxed">
            Click the link in the email to activate your account before logging in.
            If you don&apos;t see it, check your spam folder.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 w-full justify-center bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-all"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans p-4 overflow-hidden">
      <AbstractBackground />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="w-full max-w-125 relative z-10"
      >
        <div className="backdrop-blur-xl bg-[#020617]/40 border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl p-8 relative overflow-hidden">
        
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Back to Home */}
          <Link href="/" className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>

          <div className="mb-8 relative z-10 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-light text-white mb-1">Join the Network</h1>
                <p className="text-zinc-500 text-xs uppercase tracking-widest">New User Registration</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <LayoutGrid className="w-5 h-5 text-emerald-300" />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase ml-1">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            required
                            className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-4 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="email"
                            required
                            className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-4 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30"
                            placeholder="john@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase ml-1">Password</label>
                <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-10 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30"
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-400 transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Must be 8-64 chars with uppercase, lowercase, number &amp; special character.</p>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase ml-1">Organization</label>
                <div className="relative group">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors z-10 pointer-events-none" />
                    {tenantsLoading ? (
                      <div className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-4 text-zinc-500 text-sm animate-pulse">
                        Loading organizations…
                      </div>
                    ) : tenants.length > 0 ? (
                      <>
                        <select
                          required
                          value={formData.tenantSlug}
                          onChange={(e) => setFormData({ ...formData, tenantSlug: e.target.value })}
                          className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-8 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30 appearance-none"
                        >
                          {tenants.map((t) => (
                            <option key={t.slug} value={t.slug} className="bg-slate-900">
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </>
                    ) : (
                      <input
                          type="text"
                          required
                          className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-9 pr-4 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all hover:bg-black/30"
                          placeholder="workspace-slug"
                          value={formData.tenantSlug}
                          onChange={(e) => setFormData({ ...formData, tenantSlug: e.target.value })}
                      />
                    )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Select your organisation / municipality.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full mt-6 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Initialize Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-4 border-t border-dashed border-white/5 text-xs">
            <span className="text-zinc-500">Authorized personnel only. </span>
            <Link href="/login" className="text-emerald-300 font-medium hover:text-white transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
