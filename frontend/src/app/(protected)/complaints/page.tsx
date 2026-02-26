'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';

// Status badge component
function StatusBadge({ status }: { status: ComplaintStatus }) {
  const colors: Record<ComplaintStatus, string> = {
    OPEN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ASSIGNED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ESCALATED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
      {status}
    </span>
  );
}

export default function ComplaintsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsApi.list({ limit: 10 }),
  });

  const complaints: Complaint[] = (data?.data as unknown as Complaint[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white">Complaints</h1>
           <p className="text-slate-400 text-sm mt-1">Manage and track citizen complaints</p>
        </div>
        <Link 
          href="/complaints/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus size={18} />
          New Complaint
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex gap-2 p-1 bg-slate-900/40 rounded-xl border border-white/5 w-fit">
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium shadow-sm">All</button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-colors">Open</button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-colors">Assigned</button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-colors">Resolved</button>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Tracking ID</th>
              <th className="px-6 py-4">Citizen</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
               [...Array(5)].map((_, i) => (
                 <tr key={i} className="animate-pulse">
                   <td className="px-6 py-4"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                   <td className="px-6 py-4"><div className="h-4 w-32 bg-white/5 rounded" /></td>
                   <td className="px-6 py-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                   <td className="px-6 py-4"><div className="h-4 w-20 bg-white/5 rounded" /></td>
                   <td className="px-6 py-4"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                   <td className="px-6 py-4"></td>
                 </tr>
               ))
            ) : complaints.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No complaints found.
                    </td>
                </tr>
            ) : (
                complaints.map((complaint: Complaint) => (
                  <tr key={complaint.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-slate-300 group-hover:text-blue-400 transition-colors">
                        #{complaint.trackingId?.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                        {complaint.citizenName}
                        <div className="text-xs text-slate-500 font-normal">{complaint.citizenPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            complaint.priority === 'CRITICAL' ? 'text-red-400 bg-red-500/10' :
                            complaint.priority === 'HIGH' ? 'text-orange-400 bg-orange-500/10' :
                            'text-slate-400 bg-slate-500/10'
                        }`}>
                            {complaint.priority}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <StatusBadge status={complaint.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Link href={`/complaints/${complaint.id}`} className="text-blue-400 hover:text-blue-300 font-medium text-xs hover:underline">
                            View Details
                        </Link>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
