'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { complaintsApi } from '@/lib/api';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileText, MapPin, Tag, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyResolutionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [complaint, setComplaint] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [citizenComment, setCitizenComment] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    
    const fetchVerification = async () => {
      try {
        const response = await complaintsApi.getVerificationByToken(token);
        if (response.success) {
          setVerification(response.data.verification);
          setComplaint(response.data.complaint);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load verification details');
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [token]);

  const handleSubmit = async (isResolved: boolean) => {
    if (!citizenComment.trim() && !isResolved) {
      toast.error('Please provide a comment explaining why the issue is not resolved');
      return;
    }

    setSubmitting(true);
    try {
      const response = await complaintsApi.submitResolutionVerification(
        token,
        isResolved,
        citizenComment.trim() || undefined
      );
      
      if (response.success) {
        setSuccessMessage(response.data.message);
        setShowSuccess(true);
        toast.success(response.data.message);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to submit verification';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={48} className="text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (error || !verification || !complaint) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 text-center">
          <XCircle size={64} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-slate-400 mb-6">{error || 'This verification link is invalid or has expired.'}</p>
          <button
            onClick={() => router.push('/submit')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (verification.hasResponded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 text-center">
          <CheckCircle2 size={64} className="text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Already Responded</h1>
          <p className="text-slate-400 mb-4">You have already responded to this verification request.</p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500 mb-1">Your Response:</p>
            <p className="text-white font-semibold">
              {verification.isResolved ? '✓ Issue Resolved' : '✗ Issue Not Resolved'}
            </p>
            {verification.citizenComment && (
              <p className="text-slate-400 text-sm mt-2 italic">"{verification.citizenComment}"</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Responded on {new Date(verification.respondedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => router.push('/submit')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (verification.isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle size={64} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
          <p className="text-slate-400 mb-6">
            This verification link expired on {new Date(verification.expiresAt).toLocaleDateString()}.
            Please contact support if you need assistance.
          </p>
          <button
            onClick={() => router.push('/submit')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 text-center">
          <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-slate-300 mb-6">{successMessage}</p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500 mb-1">Complaint Tracking ID:</p>
            <p className="text-white font-mono font-semibold text-lg">{complaint.trackingId}</p>
          </div>
          <button
            onClick={() => router.push('/submit')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Verify Resolution Status</h1>
          <p className="text-amber-100 text-sm">
            Please confirm if your complaint has been resolved
          </p>
        </div>

        {/* Complaint Details */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Complaint Details</h2>
          </div>
          
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
              <p className="text-white font-mono font-semibold">{complaint.trackingId}</p>
            </div>

            {complaint.category && (
              <div className="flex items-start gap-2">
                <Tag size={16} className="text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="text-slate-300">{complaint.category}</p>
                </div>
              </div>
            )}

            {complaint.locality && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-slate-300">{complaint.locality}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-slate-400 mt-1" />
              <div>
                <p className="text-xs text-slate-500">Filed On</p>
                <p className="text-slate-300">{new Date(complaint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-slate-300 text-sm">{complaint.description}</p>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Is this issue resolved?</h2>
          
          <div className="mb-6">
            <label className="block text-sm text-slate-300 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={citizenComment}
              onChange={(e) => setCitizenComment(e.target.value)}
              placeholder="Please share any feedback about the resolution..."
              rows={4}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <XCircle size={20} />
                  <span>Not Resolved</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Yes, Resolved</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Expires on {new Date(verification.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
