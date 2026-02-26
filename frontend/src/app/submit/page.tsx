'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { complaintsApi, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import AbstractBackground from '@/components/3d/AbstractBackground';
import toast from 'react-hot-toast';

const submitSchema = z.object({
  citizenName:  z.string().min(2, 'Name must be at least 2 characters'),
  citizenPhone: z.string().regex(/^\+?[\d\s\-()\/.]{7,20}$/, 'Invalid phone number'),
  citizenEmail: z.string().email('A valid email is required to receive updates'),
  description:  z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category:     z.string().max(100).optional(),
  priority:     z.preprocess(v => v === '' ? undefined : v, z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()),
});

type SubmitForm = z.infer<typeof submitSchema>;

export default function PublicSubmitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [tenantSlugInput, setTenantSlugInput] = useState('');

  const envTenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG ?? '';
  const needsTenantSlug = !envTenantSlug;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubmitForm>({ resolver: zodResolver(submitSchema) });

  async function onSubmit(data: SubmitForm) {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await complaintsApi.createPublic({
        ...data,
        tenantSlug: envTenantSlug || tenantSlugInput,
      });
      const id = (res.data as { trackingId: string }).trackingId;
      setTrackingId(id);
      reset();
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start font-sans pt-12 pb-16 px-4 overflow-hidden">
      <AbstractBackground />

      {/* Header */}
      <div className="z-10 w-full max-w-xl mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={15} /> Back to Home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 mb-4">
            <Send size={22} className="text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Submit a Complaint</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            No account required. Fill in the details below and you&apos;ll receive a tracking ID instantly.
          </p>
        </div>
      </div>

      {/* Success State */}
      {trackingId && (
        <div className="z-10 w-full max-w-xl bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Complaint Submitted!</h2>
          <p className="text-slate-400 text-sm mb-4">Your complaint has been received. Use the tracking ID below to check its status anytime.</p>
          <div className="bg-slate-900/80 border border-white/10 rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Tracking ID</p>
            <p className="font-mono text-2xl font-bold text-emerald-400">{trackingId}</p>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`/track/${trackingId}`}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Track this Complaint
            </Link>
            <button
              onClick={() => setTrackingId(null)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl border border-white/10 transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {!trackingId && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="z-10 w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5"
        >
          {/* Org Slug — only shown when NEXT_PUBLIC_TENANT_SLUG is not configured */}
          {needsTenantSlug && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Organisation Slug <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={tenantSlugInput}
                onChange={(e) => setTenantSlugInput(e.target.value)}
                placeholder="e.g. city-municipal-corp"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
              />
              <p className="text-slate-600 text-xs mt-1">The slug of the government office you are filing with.</p>
            </div>
          )}

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('citizenName')}
                type="text"
                placeholder="Your full name"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
              />
              {errors.citizenName && <p className="text-red-400 text-xs mt-1">{errors.citizenName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                {...register('citizenPhone')}
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
              />
              {errors.citizenPhone && <p className="text-red-400 text-xs mt-1">{errors.citizenPhone.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              {...register('citizenEmail')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <p className="text-slate-600 text-xs mt-1">You&apos;ll receive updates about your complaint on this email.</p>
            {errors.citizenEmail && <p className="text-red-400 text-xs mt-1">{errors.citizenEmail.message}</p>}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
              <input
                {...register('category')}
                type="text"
                placeholder="e.g. Roads, Water Supply…"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
              <select
                {...register('priority')}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Auto-Detect (AI)</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describe your complaint in detail — what happened, where, and when…"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (needsTenantSlug && !tenantSlugInput.trim())}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? 'Submitting…' : 'Submit Complaint'}
          </button>

          <p className="text-center text-xs text-slate-600">
            Want to track an existing complaint?{' '}
            <Link href="/track" className="text-purple-400 hover:text-purple-300">
              Track here
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
