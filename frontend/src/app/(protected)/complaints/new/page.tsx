'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { complaintsApi, getErrorMessage } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const createComplaintSchema = z.object({
  citizenName: z.string().min(2, 'Name is too short'),
  citizenPhone: z.string().regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number'),
  citizenEmail: z.union([z.string().email(), z.literal('')]).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

type ComplaintForm = z.infer<typeof createComplaintSchema>;

export default function NewComplaintPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ComplaintForm>({
    resolver: zodResolver(createComplaintSchema),
  });

  const [submitError, setSubmitError] = useState('');

  const onSubmit = async (formData: ComplaintForm) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
        await complaintsApi.create({ ...formData, citizenEmail: formData.citizenEmail || undefined });
        router.push('/complaints');
    } catch (e: unknown) {
        setSubmitError(getErrorMessage(e));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/complaints" className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors font-medium text-sm">
        <ArrowLeft size={16} className="mr-2" /> Back to Complaints
      </Link>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">File New Complaint</h1>
            <p className="text-slate-400 text-sm mt-1">Record a citizen grievance for tracking</p>
        </div>

        {submitError && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs flex items-center gap-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Citizen Name <span className="text-red-400">*</span></label>
                    <input 
                        {...register('citizenName')}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                        placeholder="John Doe"
                    />
                    {errors.citizenName && <p className="text-red-400 text-xs">{errors.citizenName.message}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Phone Number <span className="text-red-400">*</span></label>
                    <input 
                        {...register('citizenPhone')}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                        placeholder="+91 98765 43210"
                    />
                    {errors.citizenPhone && <p className="text-red-400 text-xs">{errors.citizenPhone.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address (Optional)</label>
                <input 
                    {...register('citizenEmail')}
                     className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    placeholder="john@example.com"
                />
                 {errors.citizenEmail && <p className="text-red-400 text-xs">{errors.citizenEmail.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Complaint Description <span className="text-red-400">*</span></label>
                <textarea 
                    {...register('description')}
                     className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600 min-h-30"
                    placeholder="Describe the issue in detail..."
                />
                 {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Category</label>
                    <select 
                         {...register('category')}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                        <option value="">Select Category</option>
                        <option value="Water">Water Supply</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Roads">Roads & Infrastructure</option>
                        <option value="Sanitation">Sanitation</option>
                    </select>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Priority</label>
                     <select 
                         {...register('priority', { setValueAs: (v) => v === '' ? undefined : v })}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                        <option value="">Auto-Detect (AI)</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                    </select>
                </div>
             </div>

             <div className="pt-4 flex justify-end">
                <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Submit Complaint
                </button>
             </div>
        </form>
      </div>
    </div>
  );
}
