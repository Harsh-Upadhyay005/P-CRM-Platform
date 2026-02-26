'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, getErrorMessage } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { User, RoleType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, MoreVertical, Users, ShieldCheck, UserX, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<RoleType, string> = {
  SUPER_ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
  ADMIN: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DEPARTMENT_HEAD: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  OFFICER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  CALL_OPERATOR: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const ROLE_LABELS: Record<RoleType, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DEPARTMENT_HEAD: 'Dept. Head',
  OFFICER: 'Officer',
  CALL_OPERATOR: 'Operator',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UsersPage() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [assignRoleUser, setAssignRoleUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<RoleType>('OFFICER');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'list', page, roleFilter, search],
    queryFn: () => usersApi.list({
      page,
      limit: 20,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      search: search || undefined,
    }),
    staleTime: 30_000,
  });

  const users: User[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const assignRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: RoleType }) => usersApi.assignRole(id, role),
    onSuccess: () => {
      toast.success('Role updated successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      setAssignRoleUser(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.setStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'User activated' : 'User deactivated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setConfirmDelete(null);
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-purple-400" /> Staff Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage team members, roles and access</p>
        </div>
      </motion.div>

      {/* Filters */}
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 bg-slate-800/50 border-white/5 text-sm text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-white/5 text-sm text-slate-300">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="DEPARTMENT_HEAD">Dept. Head</SelectItem>
                <SelectItem value="OFFICER">Officer</SelectItem>
                <SelectItem value="CALL_OPERATOR">Call Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-slate-300">
            {pagination ? `${pagination.total} users` : 'Loading…'}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400"
            onClick={() => qc.invalidateQueries({ queryKey: ['users'] })}
          >
            <RefreshCw size={14} />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-red-400 text-sm text-center py-8">Failed to load users.</p>
          ) : users.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-semibold">User</TableHead>
                  <TableHead className="text-slate-400 text-xs font-semibold">Role</TableHead>
                  <TableHead className="text-slate-400 text-xs font-semibold">Department</TableHead>
                  <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs font-semibold">Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/2 group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-1 ring-white/10">
                          <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                            {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${ROLE_COLORS[u.role.type]} text-[10px] font-semibold`}>
                        {ROLE_LABELS[u.role.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {u.department?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={u.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                          : 'bg-red-500/15 text-red-400 border-red-500/30 text-[10px]'}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 min-w-40">
                          <DropdownMenuItem
                            className="text-xs cursor-pointer hover:bg-white/5 gap-2"
                            onClick={() => { setAssignRoleUser(u); setNewRole(u.role.type); }}
                          >
                            <ShieldCheck size={12} /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs cursor-pointer hover:bg-white/5 gap-2"
                            onClick={() => toggleStatusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          >
                            <UserX size={12} /> {u.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem
                            className="text-xs cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                            onClick={() => setConfirmDelete(u)}
                          >
                            <Trash2 size={12} /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Page {page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-white/10 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-white/10 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={!!assignRoleUser} onOpenChange={(o) => !o && setAssignRoleUser(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Change Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Changing role for <span className="text-white font-medium">{assignRoleUser?.name}</span>
            </p>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as RoleType)}>
              <SelectTrigger className="bg-slate-800/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="CALL_OPERATOR">Call Operator</SelectItem>
                <SelectItem value="OFFICER">Officer</SelectItem>
                <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAssignRoleUser(null)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500"
                disabled={assignRoleMutation.isPending}
                onClick={() => assignRoleUser && assignRoleMutation.mutate({ id: assignRoleUser.id, role: newRole })}
              >
                {assignRoleMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Are you sure you want to delete <span className="text-white font-medium">{confirmDelete?.name}</span>? This action cannot be undone.
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
