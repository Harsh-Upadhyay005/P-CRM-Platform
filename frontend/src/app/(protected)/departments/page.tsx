'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi, tenantsApi, usersApi, getErrorMessage } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { Department, User, RoleType, Tenant } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2, Plus, MoreVertical, Pencil, Trash2, Users, AlertTriangle,
  Clock, Crown, X, MapPin, UserCog,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<RoleType, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DEPARTMENT_HEAD: 'Dept. Head',
  OFFICER: 'Officer',
  CALL_OPERATOR: 'Operator',
};

function DeptForm({
  initial,
  onSave,
  onCancel,
  isPending,
  isSuperAdmin = false,
  isCreate = false,
}: {
  initial?: Partial<Department>;
  onSave: (data: { name: string; slaHours: number; serviceAreas: string[]; tenantId?: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  isSuperAdmin?: boolean;
  isCreate?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slaHours, setSlaHours] = useState(initial?.slaHours ?? 48);
  const [serviceAreas, setServiceAreas] = useState<string[]>(initial?.serviceAreas ?? []);
  const [areaInput, setAreaInput] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'list-for-dept'],
    queryFn: () => tenantsApi.list({ limit: 100 }),
    enabled: isSuperAdmin && isCreate,
    staleTime: 60_000,
  });
  const tenants: Tenant[] = tenantsData?.data?.data ?? [];

  const addArea = () => {
    const v = areaInput.trim();
    if (v && !serviceAreas.includes(v)) {
      setServiceAreas([...serviceAreas, v]);
    }
    setAreaInput('');
  };

  const removeArea = (area: string) =>
    setServiceAreas(serviceAreas.filter((a) => a !== area));

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-medium">Department Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Water &amp; Sanitation"
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
      {isSuperAdmin && isCreate && (
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Tenant</label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="bg-slate-800/50 border-white/10 text-slate-200">
              <SelectValue placeholder="Select a tenant…" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <MapPin size={11} className="text-slate-500" /> Service Areas
          <span className="text-slate-600 font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <Input
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } }}
            placeholder="e.g. BHU, Varanasi"
            className="bg-slate-800/50 border-white/10 text-slate-200 text-sm flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addArea}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            Add
          </Button>
        </div>
        <p className="text-[10px] text-slate-500">Press Enter or click Add. Area names can include a city, e.g. &quot;Lanka, Varanasi&quot;. Citizens from these areas will be routed to this department.</p>
        {serviceAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {serviceAreas.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px]"
              >
                {a}
                <button type="button" onClick={() => removeArea(a)} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-500"
          disabled={!name.trim() || isPending || (isSuperAdmin && isCreate && !selectedTenantId)}
          onClick={() => onSave({
            name: name.trim(),
            slaHours,
            serviceAreas,
            ...(isSuperAdmin && isCreate && selectedTenantId && { tenantId: selectedTenantId }),
          })}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ─── Members Dialog ───────────────────────────────────────────────────────────
function DeptMembersDialog({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['users', 'dept-members', dept.id],
    queryFn: () => usersApi.list({ departmentId: dept.id, limit: 100 }),
    staleTime: 15_000,
  });
  const members: User[] = membersData?.data?.data ?? [];

  const { data: allUsersData } = useQuery({
    queryKey: ['users', 'all-for-assign', dept.tenantId],
    queryFn: () => usersApi.list({ limit: 200, tenantId: dept.tenantId }),
    staleTime: 30_000,
  });
  const allUsers: User[] = allUsersData?.data?.data ?? [];
  const memberIds = new Set(members.map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id) && u.isActive);

  const assignMutation = useMutation({
    mutationFn: (userId: string) => departmentsApi.assignUser(userId, dept.id),
    onSuccess: () => {
      toast.success('User assigned to department');
      qc.invalidateQueries({ queryKey: ['users', 'dept-members', dept.id] });
      qc.invalidateQueries({ queryKey: ['users', 'all-for-assign', dept.tenantId] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setSelectedUserId('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => departmentsApi.assignUser(userId, null),
    onSuccess: () => {
      toast.success('User removed from department');
      qc.invalidateQueries({ queryKey: ['users', 'dept-members', dept.id] });
      qc.invalidateQueries({ queryKey: ['users', 'all-for-assign', dept.tenantId] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, roleType }: { userId: string; roleType: RoleType }) =>
      usersApi.assignRole(userId, roleType, dept.id),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users', 'dept-members', dept.id] });
      qc.invalidateQueries({ queryKey: ['users', 'all-for-assign', dept.tenantId] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deptHead = members.find((m) => m.role.type === 'DEPARTMENT_HEAD');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users size={16} className="text-purple-400" />
            {dept.name} — Members
          </DialogTitle>
        </DialogHeader>

        {/* Dept head banner */}
        {deptHead ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm">
            <Crown size={13} className="text-purple-400 shrink-0" />
            <span className="text-slate-300">Head:</span>
            <span className="text-white font-medium">{deptHead.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <Crown size={11} /> No department head assigned yet
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No members assigned yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-slate-700 text-slate-200 text-[10px]">
                      {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                  </div>
                  {m.role.type === 'DEPARTMENT_HEAD' && (
                    <span title="Department Head">
                      <Crown size={11} className="text-purple-400 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <Select
                    value={m.role.type}
                    onValueChange={(role) =>
                      changeRoleMutation.mutate({ userId: m.id, roleType: role as RoleType })
                    }
                    disabled={changeRoleMutation.isPending}
                  >
                    <SelectTrigger className="h-6 w-[96px] text-[10px] bg-slate-700/40 border-white/10 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      <SelectItem value="CALL_OPERATOR" className="text-xs">Operator</SelectItem>
                      <SelectItem value="OFFICER" className="text-xs">Officer</SelectItem>
                      <SelectItem value="DEPARTMENT_HEAD" className="text-xs">Dept. Head</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => removeMutation.mutate(m.id)}
                    disabled={removeMutation.isPending}
                    title="Remove from department"
                  >
                    <X size={11} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assign existing user */}
        {availableUsers.length > 0 && (
          <div className="border-t border-white/5 pt-4 space-y-2">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <UserCog size={12} /> Assign existing user to this department
            </p>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-sm flex-1">
                  <SelectValue placeholder="Pick a user…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      <span className="text-slate-500 text-xs ml-1">({ROLE_LABELS[u.role.type]})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 shrink-0"
                disabled={!selectedUserId || assignMutation.isPending}
                onClick={() => { if (selectedUserId) assignMutation.mutate(selectedUserId); }}
              >
                Assign
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const { isAdmin, isSuperAdmin } = useRole();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);
  const [manageMembersDept, setManageMembersDept] = useState<Department | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: () => departmentsApi.list({ limit: 100 }),
    staleTime: 60_000,
  });

  const departments: Department[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: { name: string; slaHours: number; serviceAreas: string[]; tenantId?: string }) => departmentsApi.create(d),
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

                  {/* Service areas */}
                  {dept.serviceAreas && dept.serviceAreas.length > 0 && (
                    <div className="mt-2.5">
                      <div className="flex items-center gap-1 mb-1.5">
                        <MapPin size={10} className="text-slate-500" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Areas</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dept.serviceAreas.slice(0, 3).map((a) => (
                          <span key={a} className="px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 text-[10px]">
                            {a}
                          </span>
                        ))}
                        {dept.serviceAreas.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-500 text-[10px]">
                            +{dept.serviceAreas.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={11} className="text-amber-400" />
                      SLA: <span className="text-amber-400 font-semibold">{dept.slaHours}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 gap-1"
                          onClick={() => setManageMembersDept(dept)}
                        >
                          <Users size={10} /> Members
                        </Button>
                      )}
                      <Badge
                        variant="outline"
                        className={dept.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30 text-[9px]'}
                      >
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
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
            isSuperAdmin={isSuperAdmin}
            isCreate
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

      {/* Manage Members Dialog */}
      {manageMembersDept && (
        <DeptMembersDialog
          dept={manageMembersDept}
          onClose={() => setManageMembersDept(null)}
        />
      )}
    </div>
  );
}
