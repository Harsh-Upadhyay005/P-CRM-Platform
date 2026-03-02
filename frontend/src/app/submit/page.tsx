'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { complaintsApi, getErrorMessage } from '@/lib/api';
import { COMPLAINT_CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Send, Paperclip, Search, Building2, ChevronDown } from 'lucide-react';
import AbstractBackground from '@/components/3d/AbstractBackground';
import toast from 'react-hot-toast';

// ─── Schema ───────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  citizenName:  z.string().min(2, 'Name must be at least 2 characters'),
  citizenPhone: z.string().regex(/^\+?[\d\s\-()\/.]{7,20}$/, 'Invalid phone number'),
  citizenEmail: z.string().email('A valid email is required to receive updates'),
  locality:     z.string().min(2).max(150).optional().or(z.literal('')),
  description:  z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category:     z.string().max(100).optional(),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

type SubmitForm = z.infer<typeof submitSchema>;

// ─── Tenant Search Combobox ───────────────────────────────────────────────────

function TenantSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<{ name: string; slug: string }[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<{ name: string; slug: string } | null>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await complaintsApi.searchPublicTenants(q);
      setResults((res.data as { name: string; slug: string }[]) ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setSelected(null);
    onChange('');
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0) search('');
  };

  const handleSelect = (item: { name: string; slug: string }) => {
    setSelected(item);
    setQuery(item.name);
    onChange(item.slug);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search by organisation name…"
          autoComplete="off"
          className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-xs text-slate-500">
              {query ? 'No matching organisations found.' : 'Start typing to search…'}
            </p>
          )}
          {results.map((item) => (
            <button
              key={item.slug}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors"
            >
              <Building2 size={13} className="text-purple-400 shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{item.name}</p>
                <p className="text-xs text-slate-500 font-mono">{item.slug}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5">
          <CheckCircle2 size={11} /> Selected: <span className="font-mono">{selected.slug}</span>
        </p>
      )}
      {!selected && value === '' && query.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">Please select an organisation from the list.</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicSubmitPage() {
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [trackingId, setTrackingId]         = useState<string | null>(null);
  const [submitError, setSubmitError]       = useState('');
  const [tenantSlug, setTenantSlug]         = useState('');
  const [departments, setDepartments]       = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId]     = useState('');
  const [categorySelect, setCategorySelect] = useState('');
  const [categoryOther, setCategoryOther]   = useState('');

  const envTenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG ?? '';
  const resolvedSlug  = envTenantSlug || tenantSlug;
  const needsSlug     = !envTenantSlug;

  // Load departments whenever a tenant slug is confirmed
  useEffect(() => {
    if (!resolvedSlug) { setDepartments([]); setDepartmentId(''); return; }
    complaintsApi.getPublicDepartments(resolvedSlug)
      .then((res) => setDepartments((res.data as { id: string; name: string }[]) ?? []))
      .catch(() => setDepartments([]));
  }, [resolvedSlug]);

  const resolvedCategory = categorySelect === 'Other' ? categoryOther : categorySelect;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubmitForm>({ resolver: zodResolver(submitSchema) });

  async function onSubmit(data: SubmitForm) {
    if (needsSlug && !tenantSlug) {
      setSubmitError('Please select an organisation first.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await complaintsApi.createPublic({
        ...data,
        locality:     (data as any).locality || undefined,
        category:     resolvedCategory || undefined,
        departmentId: departmentId || undefined,
        tenantSlug:   resolvedSlug,
      });
      const id = (res.data as { trackingId: string }).trackingId;
      setTrackingId(id);
      reset();
      setCategorySelect('');
      setCategoryOther('');
      setDepartmentId('');
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldCls = 'w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50';
  const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

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

      {/* ── Success State ── */}
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

      {/* ── Form ── */}
      {!trackingId && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="z-10 w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5"
        >
          {/* Organisation search */}
          {needsSlug && (
            <div>
              <label className={labelCls}>
                Organisation <span className="text-red-400">*</span>
              </label>
              <TenantSearch value={tenantSlug} onChange={setTenantSlug} />
            </div>
          )}

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
              <input {...register('citizenName')} type="text" placeholder="Your full name" className={fieldCls} />
              {errors.citizenName && <p className="text-red-400 text-xs mt-1">{errors.citizenName.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone Number <span className="text-red-400">*</span></label>
              <input {...register('citizenPhone')} type="tel" placeholder="+91 98765 43210" className={fieldCls} />
              {errors.citizenPhone && <p className="text-red-400 text-xs mt-1">{errors.citizenPhone.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
            <input {...register('citizenEmail')} type="email" placeholder="you@example.com" className={fieldCls} />
            <p className="text-slate-500 text-xs mt-1">You&apos;ll receive updates about your complaint on this email.</p>
            {errors.citizenEmail && <p className="text-red-400 text-xs mt-1">{errors.citizenEmail.message}</p>}
          </div>

          {/* Locality */}
          <div>
            <label className={labelCls}>Locality / Area <span className="text-slate-500 font-normal">(optional)</span></label>
            <input
              {...register('locality')}
              type="text"
              placeholder="e.g. Lanka, Varanasi or Dwarka, Delhi"
              className={fieldCls}
            />
            <p className="text-slate-500 text-xs mt-1">Helps us route your complaint to the right officer and prevents it from being marked as a duplicate of a similar complaint in a different area.</p>
            {errors.locality && <p className="text-red-400 text-xs mt-1">{errors.locality.message}</p>}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <div className="relative">
                <select
                  value={categorySelect}
                  onChange={(e) => { setCategorySelect(e.target.value); setCategoryOther(''); }}
                  className={`${fieldCls} appearance-none pr-9`}
                >
                  <option value="">Select a category…</option>
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              {categorySelect === 'Other' && (
                <input
                  type="text"
                  value={categoryOther}
                  onChange={(e) => setCategoryOther(e.target.value)}
                  placeholder="Describe the category…"
                  className={`${fieldCls} mt-2`}
                  maxLength={100}
                />
              )}
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <div className="relative">
                <select
                  {...register('priority', { setValueAs: (v) => v === '' ? undefined : v })}
                  className={`${fieldCls} appearance-none pr-9`}
                >
                  <option value="">Auto-Detect (AI)</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Department (loads after tenant is selected) */}
          {departments.length > 0 && (
            <div>
              <label className={labelCls}>
                Department <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={`${fieldCls} appearance-none pr-9`}
                >
                  <option value="">Let the system assign automatically</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-red-400">*</span></label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describe your complaint in detail — what happened, where, and when…"
              className={`${fieldCls} resize-none`}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Attachments hint */}
          <div className="flex items-start gap-2.5 bg-slate-800/40 border border-white/8 rounded-xl px-4 py-3">
            <Paperclip size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">
              Want to attach photos or documents?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">Sign in</Link>{' '}
              to file with attachments using the staff portal.
            </p>
          </div>

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (needsSlug && !tenantSlug)}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? 'Submitting…' : 'Submit Complaint'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Want to track an existing complaint?{' '}
            <Link href="/track" className="text-purple-400 hover:text-purple-300">Track here</Link>
          </p>
        </form>
      )}
    </div>
  );
}
