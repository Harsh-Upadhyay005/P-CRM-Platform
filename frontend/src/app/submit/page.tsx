'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { complaintsApi, getErrorMessage } from '@/lib/api';
import { COMPLAINT_CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Send, Paperclip, Search, Building2, ChevronDown, X, FileText, Image, Upload } from 'lucide-react';
import AbstractBackground from '@/components/3d/AbstractBackground';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { LocationPinMap } from '@/components/dashboard/LocationPinMap';

// Schema 

const submitSchema = z.object({
  citizenName:  z.string().min(2, 'Name must be at least 2 characters'),
  citizenPhone: z.string().regex(/^\+?[\d\s\-()\/.]{7,20}$/, 'Invalid phone number'),
  citizenEmail: z.string().email('A valid email is required to receive updates'),
  locality:     z.string().min(2, 'Location/Area is required').max(150),
  description:  z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category:     z.string().max(100).optional(),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

type SubmitForm = z.infer<typeof submitSchema>;

//  Tenant Search Combobox 

function TenantSearch({
  value,
  onChange,
  autoSelectSlug,
}: {
  value: string;
  onChange: (slug: string) => void;
  autoSelectSlug?: string;
}) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<{ name: string; slug: string }[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<{ name: string; slug: string } | null>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);
  const hasAutoSelected         = useRef(false);

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
      return (res.data as { name: string; slug: string }[]) ?? [];
    } catch {
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-select tenant on mount if autoSelectSlug is provided
  useEffect(() => {
    if (autoSelectSlug && !hasAutoSelected.current && !selected) {
      hasAutoSelected.current = true;
      search('').then((results) => {
        const match = results.find((r) => r.slug === autoSelectSlug);
        if (match) {
          setSelected(match);
          setQuery(match.name);
          onChange(match.slug);
        }
      });
    }
  }, [autoSelectSlug, selected, onChange, search]);

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
        <p className="text-xs text-slate-500 mt-1">Please select an organization from the list.</p>
      )}
    </div>
  );
}

//  Page 

export default function PublicSubmitPage() {
  const { t } = useTranslation();
  const { user, isAuthChecked }             = useAuth();
  const [currentStep, setCurrentStep]       = useState(1);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [trackingId, setTrackingId]         = useState<string | null>(null);
  const [submitError, setSubmitError]       = useState('');
  const [tenantSlug, setTenantSlug]         = useState('');
  const [departments, setDepartments]       = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId]     = useState('');
  const [categorySelect, setCategorySelect] = useState('');
  const [categoryOther, setCategoryOther]   = useState('');
  const [attachments, setAttachments]       = useState<File[]>([]);
  const [isUploading, setIsUploading]     = useState(false);
  const [showPinMap, setShowPinMap]         = useState(false);
  const fileInputRef                       = useRef<HTMLInputElement>(null);

  // Manual locality input state
  const [manualLocality, setManualLocality] = useState('');
  
  // Location coordinates state (from map picker)
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Duplicate detection state
  const [similarComplaints, setSimilarComplaints] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const envTenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG ?? '';
  const isCitizenUser = user?.role?.type === 'CITIZEN';
  const lockedTenantSlug = isCitizenUser ? (user?.tenant?.slug ?? '') : '';
  const awaitingTenantResolution = !envTenantSlug && !isAuthChecked;
  const resolvedSlug  = lockedTenantSlug || envTenantSlug || tenantSlug;
  const needsSlug     = !awaitingTenantResolution && !lockedTenantSlug && !envTenantSlug;

  const totalSteps = 3;

  // Load departments whenever a tenant slug is confirmed
  useEffect(() => {
    if (!resolvedSlug) { setDepartments([]); setDepartmentId(''); return; }
    complaintsApi.getPublicDepartments(resolvedSlug)
      .then((res) => setDepartments((res.data as { id: string; name: string }[]) ?? []))
      .catch(() => setDepartments([]));
  }, [resolvedSlug]);

  const resolvedCategory = categorySelect === 'Other' ? categoryOther : categorySelect;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const newFiles = files.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...newFiles].slice(0, 5);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={14} className="text-purple-400" />;
    return <FileText size={14} className="text-slate-400" />;
  };

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SubmitForm>({ resolver: zodResolver(submitSchema) });

  useEffect(() => {
    if (!isAuthChecked || !user?.email) return;
    if (getValues('citizenEmail')) return;
    setValue('citizenEmail', user.email, { shouldValidate: true });
  }, [getValues, isAuthChecked, setValue, user?.email]);

  async function onSubmit(data: SubmitForm) {
    if (awaitingTenantResolution) {
      setSubmitError('Please wait while we resolve your organisation.');
      return;
    }
    if (!resolvedSlug) {
      setSubmitError('Organisation is required to file a complaint.');
      return;
    }
    if (needsSlug && !tenantSlug) {
      setSubmitError('Please select an organisation first.');
      return;
    }
    
    // Check for similar complaints before submitting
    setCheckingSimilar(true);
    setSubmitError('');
    
    try {
      const similarResponse = await complaintsApi.findSimilar({
        category: resolvedCategory,
        locality: data.locality,
        tenantSlug: resolvedSlug,
        radiusMeters: 500,
      });
      
      if (similarResponse.success && similarResponse.data && similarResponse.data.length > 0) {
        // Found similar complaints - show modal
        setSimilarComplaints(similarResponse.data);
        setPendingSubmitData(data);
        setShowDuplicateModal(true);
        setCheckingSimilar(false);
        return;
      }
      
      // No similar complaints found - proceed with submission
      await submitComplaint(data);
    } catch (error) {
      console.error('Error checking for similar complaints:', error);
      // If checking fails, proceed with submission anyway
      await submitComplaint(data);
    } finally {
      setCheckingSimilar(false);
    }
  }
  
  async function submitComplaint(data: SubmitForm) {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      console.log('[Submit] locationCoords state:', locationCoords);
      console.log('[Submit] Submitting complaint with data:', {
        ...data,
        locality: (data as any).locality,
        latitude: locationCoords?.lat,
        longitude: locationCoords?.lng,
      });
      
      const res = await complaintsApi.createPublic({
        ...data,
        locality:     (data as any).locality || undefined,
        category:     resolvedCategory || undefined,
        departmentId: departmentId || undefined,
        tenantSlug:   resolvedSlug,
        // Include coordinates if available from map picker
        latitude:     locationCoords?.lat,
        longitude:    locationCoords?.lng,
      });
      
      console.log('[Submit] Response:', res);
      
      const trackingIdFromResponse = (res.data as { trackingId: string }).trackingId;
      
      if (attachments.length > 0) {
        setIsUploading(true);
        try {
          const uploadResults = await Promise.allSettled(
            attachments.map((file) => complaintsApi.uploadPublicAttachment(trackingIdFromResponse, file))
          );
          const failedUploads = uploadResults.filter((r) => r.status === 'rejected').length;
          if (failedUploads > 0) {
            const okUploads = uploadResults.length - failedUploads;
            const message =
              okUploads > 0
                ? `${okUploads} file(s) uploaded, ${failedUploads} failed. You can add remaining files later from the complaint detail page.`
                : `Attachment upload failed for ${failedUploads} file(s). Please retry from the complaint detail page.`;
            toast.error(message);
          }
        } catch (uploadError) {
          console.error('Failed to upload some files:', uploadError);
        } finally {
          setIsUploading(false);
        }
      }
      
      setTrackingId(trackingIdFromResponse);
      reset();
      setCategorySelect('');
      setCategoryOther('');
      setDepartmentId('');
      setAttachments([]);
      setManualLocality('');
      setLocationCoords(null);
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldCls = 'w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50';
  const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

  const handlePinLocation = (loc: {
    lat: number;
    lng: number;
    address: string;
    district: string;
    pincode: string;
  }) => {
    // Store coordinates for submission
    setLocationCoords({ lat: loc.lat, lng: loc.lng });
    
    // Set the locality value from the selected location
    // Use the full formatted address instead of just district
    const localityValue = loc.address || [loc.district, "Delhi"].filter(Boolean).join(", ");
    setValue("locality", localityValue, { shouldValidate: true });
    setManualLocality(localityValue);
  };
  
  // Handle upvoting an existing complaint
  const handleUpvote = async (trackingId: string) => {
    try {
      const citizenEmail = getValues('citizenEmail');
      const citizenPhone = getValues('citizenPhone');
      
      if (!citizenEmail) {
        toast.error('Email is required to upvote a complaint');
        return;
      }
      
      const response = await complaintsApi.upvote(trackingId, citizenEmail, citizenPhone);
      if (response.success) {
        toast.success('You have upvoted this complaint! The department has been notified of increased urgency.');
        setShowDuplicateModal(false);
        setSimilarComplaints([]);
        setPendingSubmitData(null);
        // Show success with tracking ID
        setTrackingId(trackingId);
        reset();
        setCategorySelect('');
        setCategoryOther('');
        setDepartmentId('');
        setAttachments([]);
        setManualLocality('');
        setLocationCoords(null);
        setCurrentStep(1);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to upvote complaint. Please try again.';
      toast.error(errorMessage);
    }
  };
  
  // Handle submitting as a new complaint
  const handleSubmitNew = async () => {
    setShowDuplicateModal(false);
    setSimilarComplaints([]);
    if (pendingSubmitData) {
      await submitComplaint(pendingSubmitData);
      setPendingSubmitData(null);
    }
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    const values = getValues();
    
    if (step === 1) {
      // Step 1: Personal Information
      if (!values.citizenName || values.citizenName.length < 2) {
        setSubmitError('Please enter your full name');
        return false;
      }
      if (!values.citizenPhone || !/^\+?[\d\s\-()\/.]{7,20}$/.test(values.citizenPhone)) {
        setSubmitError('Please enter a valid phone number');
        return false;
      }
      if (!values.citizenEmail || !/\S+@\S+\.\S+/.test(values.citizenEmail)) {
        setSubmitError('Please enter a valid email address');
        return false;
      }
      return true;
    }
    
    if (step === 2) {
      // Step 2: Complaint Details
      if (!values.locality || values.locality.length < 2) {
        setSubmitError('Please select your location on the map');
        return false;
      }
      if (!values.description || values.description.length < 10) {
        setSubmitError('Please provide a detailed description (at least 10 characters)');
        return false;
      }
      return true;
    }
    
    return true;
  };

  const handleNextStep = () => {
    setSubmitError('');
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevStep = () => {
    setSubmitError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Personal Information';
      case 2: return 'Complaint Details';
      case 3: return 'Attachments & Review';
      default: return '';
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start font-sans pt-12 pb-16 px-4 overflow-hidden">
      <AbstractBackground />
      
      {/* Pin Drop Map Modal */}
      {showPinMap && (
        <LocationPinMap
          onLocationSelect={handlePinLocation}
          onClose={() => setShowPinMap(false)}
        />
      )}
      
      {/* Duplicate Complaint Detection Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 bg-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Similar Complaints Found
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    We found {similarComplaints.length} similar complaint(s) in your area
                  </p>
                </div>
              </div>
            </div>

            {/* Similar Complaints List */}
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {similarComplaints.map((complaint) => (
                <div
                  key={complaint.trackingId}
                  className="bg-slate-800/60 border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-purple-400">
                          #{complaint.trackingId}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          complaint.status === 'OPEN' ? 'bg-blue-500/20 text-blue-300' :
                          complaint.status === 'ASSIGNED' ? 'bg-yellow-500/20 text-yellow-300' :
                          complaint.status === 'IN_PROGRESS' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium mb-1">
                        {complaint.category}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {complaint.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        📍 {complaint.locality} • 
                        <span className="ml-1">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    {complaint.upvotes && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <span className="text-lg">👍</span>
                        <span className="text-sm font-bold">{complaint.upvotes}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleUpvote(complaint.trackingId)}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    👍 This is the same issue - Upvote
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-white/5 bg-slate-800/40">
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-400 text-center">
                  Is your issue different from the above complaints?
                </p>
                <button
                  onClick={handleSubmitNew}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Send size={16} />
                  No, Submit as New Complaint
                </button>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setSimilarComplaints([]);
                    setPendingSubmitData(null);
                  }}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('submit.title')}</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            {t('submit.subtitle')}
          </p>
        </div>
      </div>

      {/*  Success State  */}
      {trackingId && (
        <div className="z-10 w-full max-w-xl bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('submit.successTitle')}</h2>
          <p className="text-slate-400 text-sm mb-4">{t('submit.successDesc')}</p>
          <div className="bg-slate-900/80 border border-white/10 rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">{t('submit.trackingIdLabel')}</p>
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
            > {t('submit.submitAnotherBtn')} </button>
          </div>
        </div>
      )}

        {/*  Form  */}
      {!trackingId && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="z-10 w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Step Progress Bar */}
          <div className="p-8 border-b border-white/10">
            {/* Step Indicators */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center max-w-md w-full">
                {[1, 2, 3].map((step) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                        currentStep === step 
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20' 
                          : currentStep > step
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-600 bg-slate-800/40 text-slate-500'
                      }`}>
                        {currentStep > step ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <span className="text-base font-bold">{step}</span>
                        )}
                      </div>
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-0.5 mx-3 transition-all ${
                        currentStep > step ? 'bg-emerald-500' : 'bg-slate-700'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* Step Title */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">{getStepTitle()}</h3>
              <p className="text-xs text-slate-500">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-5">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <>
                {/* Organisation */}
                {lockedTenantSlug && (
                  <div>
                    <label className={labelCls}>{t('submit.organisationLabel')}</label>
                    <div className="w-full bg-slate-800/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 flex items-center justify-between">
                      <span>{user?.tenant?.name ?? 'Your organisation'}</span>
                      <span className="text-xs text-slate-500 font-mono">{lockedTenantSlug}</span>
                    </div>
                  </div>
                )}
                {needsSlug && (
                  <div>
                    <label className={labelCls}>
                      Organisation <span className="text-red-400">*</span>
                    </label>
                    <TenantSearch 
                      value={tenantSlug} 
                      onChange={setTenantSlug}
                      autoSelectSlug="main-office"
                    />
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
                    <input {...register('citizenPhone')} type="tel" placeholder={t('submit.phonePlaceholder', '+91 98765 43210')} className={fieldCls} />
                    {errors.citizenPhone && <p className="text-red-400 text-xs mt-1">{errors.citizenPhone.message}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
                  <input {...register('citizenEmail')} type="email" placeholder="you@example.com" className={fieldCls} />
                  <p className="text-slate-500 text-xs mt-1">{t('submit.emailHelp')}</p>
                  {errors.citizenEmail && <p className="text-red-400 text-xs mt-1">{errors.citizenEmail.message}</p>}
                </div>
              </>
            )}

            {/* Step 2: Complaint Details */}
            {currentStep === 2 && (
              <>
                {/* Locality */}
                <div>
                  <label className={labelCls}>
                    Locality / Area <span className="text-red-400">*</span>
                  </label>

                  {/* Pick location on map button */}
                  <button
                    type="button"
                    onClick={() => setShowPinMap(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-slate-800/60 text-sm text-slate-300 hover:bg-white/10 hover:border-purple-500/50 transition-all"
                  >
                    🗺️ Pick location on map
                  </button>

                  {/* Display selected location */}
                  {manualLocality && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        {manualLocality}
                      </p>
                    </div>
                  )}

                  <p className="text-slate-500 text-xs mt-1.5">{t('submit.localityHelp')}</p>
                  {errors.locality && <p className="text-red-400 text-xs mt-1">{errors.locality.message}</p>}
                </div>

                {/* Category + Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t('submit.categoryLabel')}</label>
                    <div className="relative">
                      <select
                        value={categorySelect}
                        onChange={(e) => { setCategorySelect(e.target.value); setCategoryOther(''); }}
                        className={`${fieldCls} appearance-none pr-9`}
                      >
                        <option value="">{t('submit.categorySelectPlaceholder')}</option>
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
                    <label className={labelCls}>{t('submit.priorityLabel')}</label>
                    <div className="relative">
                      <select
                        {...register('priority', { setValueAs: (v) => v === '' ? undefined : v })}
                        className={`${fieldCls} appearance-none pr-9`}
                      >
                        <option value="">{t('submit.autoDetectAI')}</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Department */}
                {resolvedSlug && (
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
              </>
            )}

            {/* Step 3: Attachments & Review */}
            {currentStep === 3 && (
              <>
                {/* Attachments */}
                <div>
                  <label className={labelCls}>
                    Attachments <span className="text-slate-500 font-normal">(optional, max 5 files)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 hover:bg-white/5 transition-all"
                  >
                    <Upload size={24} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      Click or drag files here to upload
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Images, PDFs, or documents (max 10MB each)
                    </p>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getFileIcon(file.type)}
                      <div className="overflow-hidden">
                        <p className="text-sm text-white truncate max-w-50">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <X size={14} className="text-slate-500 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

                {/* Review Summary */}
                <div className="bg-slate-800/40 border border-white/10 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white">Review Your Complaint</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="text-white">{watch('citizenName') || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-white">{watch('citizenEmail') || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-white">{watch('citizenPhone') || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-white">{manualLocality || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <span className="text-white">{resolvedCategory || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attachments:</span>
                      <span className="text-white">{attachments.length} file(s)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="px-8 pb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {submitError}
              </div>
            </div>
          )}

          {/* Step Navigation Buttons */}
          <div className="px-8 pb-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between gap-4">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-xl border border-white/10 transition-all hover:border-white/20"
                >
                  ← Previous
                </button>
              ) : (
                <div></div>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || checkingSimilar || awaitingTenantResolution || (needsSlug && !tenantSlug)}
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                >
                  {(isSubmitting || isUploading || checkingSimilar) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {checkingSimilar ? 'Checking for similar complaints…' : isUploading ? 'Uploading files…' : isSubmitting ? 'Submitting…' : 'Submit Complaint'}
                </button>
              )}
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-6">
              Want to track an existing complaint?{' '}
              <Link href="/track" className="text-purple-400 hover:text-purple-300 underline">Track here</Link>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
