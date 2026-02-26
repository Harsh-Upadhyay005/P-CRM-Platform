'use client';

import React, { useState } from 'react';
import { complaintsApi, getErrorMessage } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, Clock, AlertCircle, ChevronRight, Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import AbstractBackground from '@/components/3d/AbstractBackground';

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN:        { label: 'Open',        color: 'text-blue-400',    icon: <Clock size={14} /> },
  ASSIGNED:    { label: 'Assigned',    color: 'text-indigo-400',  icon: <Clock size={14} /> },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400',   icon: <Clock size={14} /> },
  ESCALATED:   { label: 'Escalated',   color: 'text-purple-400',  icon: <AlertCircle size={14} /> },
  RESOLVED:    { label: 'Resolved',    color: 'text-emerald-400', icon: <CheckCircle2 size={14} /> },
  CLOSED:      { label: 'Closed',      color: 'text-slate-400',   icon: <CheckCircle2 size={14} /> },
};

const ALL_STATUSES: ComplaintStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Feedback
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setLoading(true);
    setError('');
    setComplaint(null);
    setFeedbackSent(false);
    try {
      const res = await complaintsApi.track(trackingId.trim().toUpperCase());
      setComplaint(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackRating || !complaint) return;
    setFeedbackLoading(true);
    try {
      await complaintsApi.submitFeedback(complaint.trackingId, { rating: feedbackRating, comment: feedbackComment });
      setFeedbackSent(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setFeedbackLoading(false);
    }
  }

  const currentStatusIdx = complaint ? ALL_STATUSES.indexOf(complaint.status) : -1;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start font-sans pt-16 pb-12 px-4 overflow-hidden">
      <AbstractBackground />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 mb-4">
          <Search size={24} className="text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Track Your Complaint</h1>
        <p className="text-slate-400 text-sm mt-2">Enter your tracking ID to check the status of your complaint</p>
      </motion.div>

      {/* Search Form */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleTrack}
        className="w-full max-w-lg flex gap-2"
      >
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
          placeholder="e.g. CMP-2024-XXXXXX"
          className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 font-mono text-sm focus:outline-none focus:border-purple-500/50 backdrop-blur-md"
        />
        <button
          type="submit"
          disabled={loading || !trackingId.trim()}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm"
        >
          {loading ? 'Searching…' : 'Track'}
        </button>
      </motion.form>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-400 text-sm">
          {error}
        </motion.p>
      )}

      {/* Result */}
      <AnimatePresence>
        {complaint && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg mt-8 space-y-5"
          >
            {/* Status Card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="font-mono text-xs text-slate-500 mb-1">{complaint.trackingId}</p>
                  <p className="text-white font-semibold text-sm leading-relaxed line-clamp-2">{(complaint.description ?? '').slice(0, 120)}{(complaint.description?.length ?? 0) > 120 ? '…' : ''}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${STATUS_CONFIG[complaint.status].color} shrink-0 ml-3`}>
                  {STATUS_CONFIG[complaint.status].icon}
                  {STATUS_CONFIG[complaint.status].label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  {ALL_STATUSES.slice(0, 5).map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          i <= Math.min(currentStatusIdx, 4)
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-800 border-white/10 text-slate-600'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className={`text-[9px] hidden sm:block ${i <= Math.min(currentStatusIdx, 4) ? 'text-slate-400' : 'text-slate-700'}`}>
                        {STATUS_CONFIG[s].label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (Math.min(currentStatusIdx, 4) / 4) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-600 mb-0.5">Department</p>
                  <p className="text-slate-300">{complaint.department?.name ?? 'Pending assignment'}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-0.5">Submitted</p>
                  <p className="text-slate-300">{fmt(complaint.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-0.5">Priority</p>
                  <p className="text-slate-300">{complaint.priority}</p>
                </div>
                {complaint.resolvedAt && (
                  <div>
                    <p className="text-slate-600 mb-0.5">Resolved</p>
                    <p className="text-emerald-400">{fmt(complaint.resolvedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            {complaint.statusHistory?.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Status Timeline</h3>
                <div className="space-y-3">
                  {complaint.statusHistory.map((h, i) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1 shrink-0" />
                        {i < complaint.statusHistory.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" style={{ minHeight: 20 }} />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${STATUS_CONFIG[h.newStatus]?.color ?? 'text-slate-400'}`}>{h.newStatus.replace('_', ' ')}</span>
                          <ChevronRight size={9} className="text-slate-600" />
                          <span className="text-[11px] text-slate-600">{fmt(h.changedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback — only if resolved/closed */}
            {(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">How was your experience?</h3>
                <p className="text-slate-500 text-xs mb-4">Your feedback helps us improve our services</p>
                {feedbackSent ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span className="text-sm">Thank you for your feedback!</span>
                  </div>
                ) : (
                  <form onSubmit={handleFeedback} className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          className={`text-xl transition-colors ${star <= feedbackRating ? 'text-amber-400' : 'text-slate-700 hover:text-amber-400/60'}`}
                        >
                          <Star size={24} fill={star <= feedbackRating ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Tell us more (optional)…"
                      rows={2}
                      className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-purple-500/50"
                    />
                    <button
                      type="submit"
                      disabled={!feedbackRating || feedbackLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Send size={13} /> {feedbackLoading ? 'Sending…' : 'Submit Feedback'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
