'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, getErrorMessage } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { Department } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Plus, MoreVertical, Pencil, Trash2, Users, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function DeptForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Department>;
  onSave: (data: { name: string; slaHours: number }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slaHours, setSlaHours] = useState(initial?.slaHours ?? 48);

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-medium">Department Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Water & Sanitation"
          className="bg-slate-800/50 border-white/10 text-slate-200"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-medium">SLA Hours</label>
        <Input
          type="number"
          value={slaHours}
          onChange={(e) => setSlaHours(Number(e.target.value))}
          min={1}
          placeholder="48"
          className="bg-slate-800/50 border-white/10 text-slate-200"
        />
        <p className="text-[10px] text-slate-500">Complaints must be resolved within this many hours</p>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-500"
          disabled={!name.trim() || isPending}
          onClick={() => onSave({ name: name.trim(), slaHours })}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: () => departmentsApi.list({ limit: 100 }),
    staleTime: 60_000,
  });

  const departments: Department[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: { name: string; slaHours: number }) => departmentsApi.create(d),
    onSuccess: () => {
      toast.success('Department created');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setCreateOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => departmentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Department updated');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setEditDept(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      toast.success('Department deleted');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setConfirmDelete(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={24} className="text-purple-400" /> Departments
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage departments and SLA configurations</p>
        </div>
        {isAdmin && (
          <Button
            className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> New Department
          </Button>
        )}
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-800/30 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-red-400 text-sm">Failed to load departments.</p>
      ) : departments.length === 0 ? (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={40} className="text-slate-600" />
            <p className="text-slate-500 text-sm">No departments yet.</p>
            {isAdmin && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> Create first department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`bg-slate-900/40 backdrop-blur-md border-white/5 hover:border-purple-500/30 transition-all duration-300 group
                ${!dept.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
                      <Building2 size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">{dept.name}</CardTitle>
                      <p className="text-[10px] text-slate-500 font-mono">{dept.slug}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 min-w-35">
                        <DropdownMenuItem className="text-xs cursor-pointer hover:bg-white/5 gap-2" onClick={() => setEditDept(dept)}>
                          <Pencil size={12} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem
                          className="text-xs cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                          onClick={() => setConfirmDelete(dept)}
                        >
                          <Trash2 size={12} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-lg bg-slate-800/40 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users size={11} className="text-slate-500" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Staff</span>
                      </div>
                      <p className="text-lg font-bold text-white">{dept._count?.users ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/40 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={11} className="text-slate-500" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cases</span>
                      </div>
                      <p className="text-lg font-bold text-white">{dept._count?.complaints ?? 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={11} className="text-amber-400" />
                      SLA: <span className="text-amber-400 font-semibold">{dept.slaHours}h</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={dept.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/30 text-[9px]'}
                    >
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">New Department</DialogTitle>
          </DialogHeader>
          <DeptForm
            onSave={(d) => createMutation.mutate(d)}
            onCancel={() => setCreateOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDept} onOpenChange={(o) => !o && setEditDept(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Department</DialogTitle>
          </DialogHeader>
          {editDept && (
            <DeptForm
              initial={editDept}
              onSave={(d) => updateMutation.mutate({ id: editDept.id, data: d })}
              onCancel={() => setEditDept(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Delete <span className="text-white font-medium">{confirmDelete?.name}</span>? This may affect complaints assigned to it.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
