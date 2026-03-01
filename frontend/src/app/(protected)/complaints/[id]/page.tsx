'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, usersApi, departmentsApi, getErrorMessage } from '@/lib/api';
import { Complaint, Note, Attachment, ComplaintStatus, Priority, User, Department, RoleType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, FileText, User as UserIcon, Phone, Mail, Clock, Tag,
  Building2, Paperclip, MessageSquare, AlertTriangle, Send, Upload, Trash2,
  ChevronRight, RefreshCw, Trash, Star, Edit2, Timer, Copy, ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRole } from '@/hooks/useRole';

// ─── Status transition map (mirrors backend statusEngine.js) ──────────────────
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN:        ['ASSIGNED', 'ESCALATED'],
  ASSIGNED:    ['IN_PROGRESS', 'ESCALATED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED'],
  ESCALATED:   ['ASSIGNED', 'IN_PROGRESS'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

const ROLE_STATUS_PERMISSIONS: Record<RoleType, ComplaintStatus[] | null> = {
  CALL_OPERATOR:   [],
  OFFICER:         ['IN_PROGRESS', 'RESOLVED'],
  DEPARTMENT_HEAD: ['IN_PROGRESS', 'RESOLVED', 'ESCALATED'],
  ADMIN:           null, // null = all allowed
  SUPER_ADMIN:     null,
};

function validNextStatusesForRole(current: ComplaintStatus, role: RoleType): ComplaintStatus[] {
  const permitted = ROLE_STATUS_PERMISSIONS[role];
  const all = TRANSITIONS[current] ?? [];
  if (permitted === null || permitted === undefined) return all;
  return all.filter((s) => permitted.includes(s));
}

const PRIORITY_OPTIONS: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  MEDIUM: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  HIGH: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/20',
};
const STATUS_COLORS: Record<ComplaintStatus, string> = {
  OPEN: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  ASSIGNED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  ESCALATED: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  CLOSED: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const SLA_COLORS = {
  OK: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  WARNING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  BREACHED: 'bg-red-500/15 text-red-400 border-red-500/20',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, isDeptHead, isCallOperator, role } = useRole();
  const qc = useQueryClient();

  const [noteText, setNoteText] = useState('');
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<ComplaintStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignDepartmentId, setAssignDepartmentId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');

  const { data: complaintData, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.getById(id),
    enabled: !!id,
  });
  const complaint: Complaint | undefined = complaintData?.data;

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['complaint-notes', id],
    queryFn: () => complaintsApi.getNotes(id),
    enabled: !!id,
  });
  const notes: Note[] = notesData?.data ?? [];

  const { data: attachData } = useQuery({
    queryKey: ['complaint-attachments', id],
    queryFn: () => complaintsApi.getAttachments(id),
    enabled: !!id,
  });
  const attachments: Attachment[] = attachData?.data ?? [];

  const { data: officersData } = useQuery({
    queryKey: ['officers'],
    queryFn: () => usersApi.list({ limit: 100, role: 'OFFICER' }),
    enabled: isAdmin || isDeptHead,
  });
  const officers: User[] = officersData?.data?.data ?? [];

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => departmentsApi.list({ limit: 100 }),
    enabled: isAdmin || isDeptHead,
  });
  const departments: Department[] = departmentsData?.data?.data ?? [];

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => complaintsApi.addNote(id, note),
    onSuccess: () => { toast.success('Note added'); setNoteText(''); qc.invalidateQueries({ queryKey: ['complaint-notes', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => complaintsApi.updateStatus(id, status, note),
    onSuccess: () => { toast.success('Status updated'); setStatusDialog(false); qc.invalidateQueries({ queryKey: ['complaint', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const assignMutation = useMutation({
    mutationFn: ({ officerId, departmentId }: { officerId?: string; departmentId?: string }) => complaintsApi.assign(id, officerId, departmentId),
    onSuccess: () => { toast.success('Complaint assigned'); setAssignDialog(false); qc.invalidateQueries({ queryKey: ['complaint', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const editMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => complaintsApi.update(id, data),
    onSuccess: () => { toast.success('Complaint updated'); setEditDialog(false); qc.invalidateQueries({ queryKey: ['complaint', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => complaintsApi.uploadAttachment(id, file),
    onSuccess: () => { toast.success('File uploaded'); qc.invalidateQueries({ queryKey: ['complaint-attachments', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteComplaintMutation = useMutation({
    mutationFn: () => complaintsApi.deleteComplaint(id),
    onSuccess: () => { toast.success('Complaint deleted'); router.push('/complaints'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: feedbackData } = useQuery({
    queryKey: ['complaint-feedback', id],
    queryFn: async () => {
      try {
        return await complaintsApi.getFeedback(id);
      } catch (e: unknown) {
        // 404 means no feedback submitted yet — not an error
        if (e && typeof e === 'object' && 'response' in e) {
          const axiosErr = e as { response?: { status?: number } };
          if (axiosErr.response?.status === 404) return { data: null };
        }
        throw e;
      }
    },
    enabled: !!id && (complaint?.status === 'RESOLVED' || complaint?.status === 'CLOSED'),
  });
  const feedback = feedbackData?.data;

  const deleteAttachMutation = useMutation({
    mutationFn: (attachId: string) => complaintsApi.deleteAttachment(id, attachId),
    onSuccess: () => { toast.success('Attachment deleted'); qc.invalidateQueries({ queryKey: ['complaint-attachments', id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-800/40 rounded-xl" />
          <div className="h-60 bg-slate-800/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-white font-semibold">Complaint not found</p>
        <Button variant="ghost" className="text-slate-400" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  // Compute valid next statuses for the current user's role
  const allowedStatuses = complaint && role ? validNextStatusesForRole(complaint.status, role) : [];

  return (
    <div className="space-y-6">
      {/* Duplicate Detection Warning */}
      {complaint.duplicateScore != null && complaint.duplicateScore > 0.7 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
          <Copy size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Potential Duplicate Detected</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Similarity score: <span className="font-mono font-bold">{(complaint.duplicateScore * 100).toFixed(0)}%</span>
              {complaint.potentialDuplicateId && (
                <> · <Link href={`/complaints/${complaint.potentialDuplicateId}`} className="underline underline-offset-2 hover:text-amber-300 inline-flex items-center gap-1">View potential duplicate <ExternalLink size={10} /></Link></>
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{complaint.trackingId}</h1>
              <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[complaint.status]}`}>{complaint.status.replace('_', ' ')}</Badge>
              <Badge variant="outline" className={`text-xs border ${PRIORITY_COLORS[complaint.priority]}`}>{complaint.priority}</Badge>
              {/* SLA Badge */}
              {complaint.slaSummary && (
                <Badge variant="outline" className={`text-xs border gap-1 ${SLA_COLORS[complaint.slaSummary.state]}`}>
                  <Timer size={10} />
                  {complaint.slaSummary.remainingLabel}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Created {fmt(complaint.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button size="sm" variant="outline" className="border-white/10 bg-slate-800/50 text-slate-300 hover:text-white gap-1.5 h-8" onClick={() => {
              setEditDescription(complaint.description);
              setEditCategory(complaint.category ?? '');
              setEditPriority(complaint.priority);
              setEditDialog(true);
            }}>
              <Edit2 size={13} /> Edit
            </Button>
          )}
          {(isAdmin || isDeptHead) && (
            <Button size="sm" variant="outline" className="border-white/10 bg-slate-800/50 text-slate-300 hover:text-white gap-1.5 h-8" onClick={() => {
              setAssignOfficerId(complaint.assignedTo?.id ?? '');
              setAssignDepartmentId(complaint.department?.id ?? '');
              setAssignDialog(true);
            }}>
              <UserIcon size={13} /> Assign
            </Button>
          )}
          {!isCallOperator && allowedStatuses.length > 0 && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-8" onClick={() => { setNewStatus(''); setStatusNote(''); setStatusDialog(true); }}>
              <RefreshCw size={13} /> Update Status
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 gap-1.5 h-8" onClick={() => setDeleteConfirm(true)}>
              <Trash size={13} /> Delete
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200 flex items-center gap-2"><FileText size={15} className="text-purple-400" /> Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              {complaint.category && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Tag size={11} /> Category: <span className="text-slate-300">{complaint.category}</span>
                </div>
              )}
              {complaint.aiScore != null && (
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span>AI Priority Score: <span className="text-amber-400 font-mono">{complaint.aiScore.toFixed(2)}</span></span>
                  {complaint.sentimentScore != null && (
                    <span>Sentiment: <span className="text-blue-400 font-mono">{complaint.sentimentScore.toFixed(2)}</span></span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          {complaint.statusHistory?.length > 0 && (
            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Clock size={15} className="text-purple-400" /> Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complaint.statusHistory.map((h, i) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-0.5 shrink-0" />
                        {i < complaint.statusHistory.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" style={{ minHeight: 24 }} />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.oldStatus && <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[h.oldStatus]}`}>{h.oldStatus}</Badge>}
                          {h.oldStatus && <ChevronRight size={10} className="text-slate-600" />}
                          <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[h.newStatus]}`}>{h.newStatus}</Badge>
                          <span className="text-slate-600 text-[11px] ml-auto">{fmt(h.changedAt)}</span>
                        </div>
                        {h.changedBy && <p className="text-[11px] text-slate-600 mt-0.5">by {h.changedBy.name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200 flex items-center gap-2"><MessageSquare size={15} className="text-purple-400" /> Notes ({notes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notesLoading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-slate-800/40 animate-pulse rounded-lg" />)}</div>
              ) : notes.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-slate-800/40 rounded-lg p-3 border border-white/5">
                      <p className="text-slate-300 text-sm leading-relaxed">{n.note}</p>
                      <p className="text-[11px] text-slate-600 mt-1.5">{(n.createdBy ?? n.user)?.name ?? 'Unknown'} · {fmt(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Textarea
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1 bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm resize-none"
                />
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white self-end h-9 w-9 p-0 shrink-0"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate(noteText.trim())}
                >
                  <Send size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Paperclip size={15} className="text-purple-400" /> Attachments ({attachments.length})</CardTitle>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1.5 h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
                  <Upload size={12} /> {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }} />
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-4">No attachments</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-lg border border-white/5 group">
                      <Paperclip size={13} className="text-slate-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate block">{a.fileName}</a>
                        <p className="text-[11px] text-slate-600">{fmtBytes(a.fileSize)} · {a.uploadedBy?.name}</p>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-slate-600 hover:text-red-400 transition-all"
                        onClick={() => deleteAttachMutation.mutate(a.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Citizen info */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200 flex items-center gap-2"><UserIcon size={15} className="text-purple-400" /> Citizen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <p className="text-white font-medium">{complaint.citizenName}</p>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone size={12} /> <span>{complaint.citizenPhone}</span>
              </div>
              {complaint.citizenEmail && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail size={12} /> <span className="truncate">{complaint.citizenEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Building2 size={15} className="text-purple-400" /> Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Department</p>
                <p className="text-slate-200">{complaint.department?.name ?? <span className="text-slate-600 italic">Unassigned</span>}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Assigned Officer</p>
                <p className="text-slate-200">{complaint.assignedTo?.name ?? <span className="text-slate-600 italic">Unassigned</span>}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Created By</p>
                <p className="text-slate-200">{complaint.createdBy?.name ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          {/* SLA Timer */}
          {complaint.slaSummary && (
            <Card className={`backdrop-blur-md border ${SLA_COLORS[complaint.slaSummary.state]}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Timer size={15} className={complaint.slaSummary.breached ? 'text-red-400' : 'text-emerald-400'} /> SLA Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs border ${SLA_COLORS[complaint.slaSummary.state]}`}>
                    {complaint.slaSummary.state}
                  </Badge>
                </div>
                <p className="text-slate-300 text-xs">{complaint.slaSummary.remainingLabel}</p>
                <p className="text-slate-500 text-[11px]">Deadline: {fmt(complaint.slaSummary.deadline)}</p>
              </CardContent>
            </Card>
          )}

          {/* Tracking */}
          <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Tag size={15} className="text-purple-400" /> Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-slate-500 text-xs mb-1">Tracking ID</p>
                <p className="font-mono text-slate-200 text-xs">{complaint.trackingId}</p>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Resolved At</p>
                  <p className="text-emerald-400 text-xs">{fmt(complaint.resolvedAt)}</p>
                </div>
              )}
              <Link
                href={`/track/${complaint.trackingId}`}
                className="block mt-2 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
              >
                View public tracking page →
              </Link>
            </CardContent>
          </Card>

          {/* Citizen Feedback */}
          {feedback && (
            <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-200 flex items-center gap-2"><Star size={15} className="text-amber-400" /> Citizen Feedback</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={14} className={s <= feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                  ))}
                  <span className="ml-2 text-slate-400 text-xs">{feedback.rating}/5</span>
                </div>
                {feedback.comment && <p className="text-slate-400 text-xs italic leading-relaxed">&ldquo;{feedback.comment}&rdquo;</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {allowedStatuses.length === 0 ? (
              <p className="text-sm text-slate-400">No status transitions available for your role from the current status.</p>
            ) : (
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplaintStatus)}>
                <SelectTrigger className="bg-slate-800/60 border-white/10 text-slate-300">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Textarea
              placeholder="Optional note…"
              value={statusNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatusNote(e.target.value)}
              rows={2}
              className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!newStatus || updateStatusMutation.isPending}
              onClick={() => newStatus && updateStatusMutation.mutate({ status: newStatus, note: statusNote || undefined })}
            >
              {updateStatusMutation.isPending ? 'Saving…' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Assign Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Department</label>
              <Select value={assignDepartmentId} onValueChange={setAssignDepartmentId}>
                <SelectTrigger className="bg-slate-800/60 border-white/10 text-slate-300">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Officer</label>
              <Select value={assignOfficerId} onValueChange={setAssignOfficerId}>
                <SelectTrigger className="bg-slate-800/60 border-white/10 text-slate-300">
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}{o.department ? ` (${o.department.name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={(!assignOfficerId && !assignDepartmentId) || assignMutation.isPending}
              onClick={() => assignMutation.mutate({
                officerId: assignOfficerId || undefined,
                departmentId: assignDepartmentId || undefined,
              })}
            >
              {assignMutation.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-red-400">Delete Complaint</DialogTitle></DialogHeader>
          <p className="text-slate-400 text-sm py-2">
            Are you sure you want to permanently delete complaint <span className="text-white font-mono font-semibold">{complaint.trackingId}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteComplaintMutation.isPending}
              onClick={() => deleteComplaintMutation.mutate()}
            >
              {deleteComplaintMutation.isPending ? 'Deleting…' : 'Delete Complaint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Complaint Dialog (Admin only) */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Edit Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                rows={4}
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
              <Input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g. roads, water, electricity"
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Priority</label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                <SelectTrigger className="bg-slate-800/60 border-white/10 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={editMutation.isPending}
              onClick={() => editMutation.mutate({
                description: editDescription,
                category: editCategory || null,
                priority: editPriority,
              })}
            >
              {editMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
