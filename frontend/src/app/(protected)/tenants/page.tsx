'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, getErrorMessage } from '@/lib/api';
import { Tenant } from '@/types';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Plus, MoreVertical, Edit2, PowerOff, RefreshCw, Users, Briefcase, FileText, MapPin, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRole } from '@/hooks/useRole';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { STATE_CODES, getStateLabelFromCode, inferLocationFromServiceArea, inferLocationFromServiceAreas } from '@/lib/state-codes';
import { useAuth } from '@/hooks/useAuth';

interface TenantFormData {
  name: string;
  slug: string;
  stateCode: string;
  stateLabel: string;
  districtLabel: string;
  areas: string[];
}
const empty: TenantFormData = {
  name: '',
  slug: '',
  stateCode: '',
  stateLabel: '',
  districtLabel: '',
  areas: [],
};

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function TenantsPage() {
  const { isSuperAdmin } = useRole();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantFormData>(empty);
  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
    staleTime: 30_000,
    enabled: isSuperAdmin,
  });
  const tenants: Tenant[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: TenantFormData) => tenantsApi.create(d),
    onSuccess: () => { toast.success('Tenant created'); qc.invalidateQueries({ queryKey: ['tenants'] }); setDialogOpen(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<TenantFormData> }) => tenantsApi.update(id, d),
    onSuccess: () => { toast.success('Tenant updated'); qc.invalidateQueries({ queryKey: ['tenants'] }); setDialogOpen(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.deactivate(id),
    onSuccess: () => { toast.success('Tenant deactivated'); qc.invalidateQueries({ queryKey: ['tenants'] }); setDeactivateTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  }

  function openEdit(t: Tenant) {
    const inferred = inferLocationFromServiceAreas(t.areas);
    setEditing(t);
    setForm({
      name: t.name,
      slug: t.slug,
      stateCode: t.stateCode ?? inferred?.stateCode ?? '',
      stateLabel: t.stateLabel ?? inferred?.stateLabel ?? '',
      districtLabel: t.districtLabel ?? inferred?.districtLabel ?? '',
      areas: t.areas ?? [],
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    let payload: TenantFormData = { ...form };
    if (!payload.stateCode || !payload.stateLabel.trim() || !payload.districtLabel.trim()) {
      const inferred = inferLocationFromServiceAreas(payload.areas);
      if (inferred) {
        payload = {
          ...payload,
          stateCode: payload.stateCode || inferred.stateCode,
          stateLabel: payload.stateLabel || inferred.stateLabel,
          districtLabel: payload.districtLabel || inferred.districtLabel,
        };
        setForm(payload);
      }
    }

    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    if (!payload.stateCode || !payload.stateLabel.trim() || !payload.districtLabel.trim()) {
      toast.error('Unable to infer state/district from service area. Please add a full area like "BHU, Varanasi, Uttar Pradesh, India" or fill fields manually.');
      return;
    }
    if ((payload.areas ?? []).length < 1) {
      toast.error('At least one service area is required');
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, d: payload });
    else createMutation.mutate(payload);
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Building2 size={48} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Access Denied</p>
          <p className="text-slate-400 text-sm mt-1">Tenant management requires Super Admin access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={24} className="text-purple-400" /> Tenants
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage platform tenants (organizations)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5" onClick={() => refetch()}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5" onClick={openCreate}>
            <Plus size={13} /> New Tenant
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-900/40 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <Building2 size={40} className="text-slate-600" />
          <p className="text-slate-500 text-sm">No tenants yet</p>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 mt-2" onClick={openCreate}>
            <Plus size={13} /> Create first tenant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t, i) => (
            (() => {
              const inferred = inferLocationFromServiceAreas(t.areas);
              const stateLabel = t.stateLabel ?? inferred?.stateLabel ?? '—';
              const stateCode = t.stateCode ?? inferred?.stateCode ?? '';
              const districtLabel = t.districtLabel ?? inferred?.districtLabel ?? '—';

              return (
            <motion.div key={t.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
              <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 hover:border-purple-500/20 transition-colors relative group">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm leading-tight">{t.name}</p>
                        <p className="text-slate-500 text-xs font-mono">{t.slug}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-300 min-w-37.5">
                        <DropdownMenuItem className="hover:bg-slate-800 cursor-pointer gap-2" onClick={() => openEdit(t)}>
                          <Edit2 size={13} /> Edit
                        </DropdownMenuItem>
                        {(t as any).isActive !== false && (
                          <DropdownMenuItem className="hover:bg-slate-800 cursor-pointer gap-2 text-red-400 focus:text-red-400" onClick={() => setDeactivateTarget(t)}>
                            <PowerOff size={13} /> Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="text-xs text-slate-400 mb-3 space-y-1">
                    <p className="truncate">State: <span className="text-slate-300">{stateLabel}{stateCode ? ` (${stateCode})` : ''}</span></p>
                    <p className="truncate">District: <span className="text-slate-300">{districtLabel}</span></p>
                  </div>

                  <Badge
                    className={`text-[10px] px-2 py-0.5 border font-medium mb-3 ${
                      (t as any).isActive === false
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {(t as any).isActive === false ? 'Inactive' : 'Active'}
                  </Badge>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                    <div className="text-center">
                      <Link
                        href={`/users?tenantId=${t.id}`}
                        className="inline-flex flex-col items-center rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                        title={`View users of ${t.name}`}
                      >
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          <Users size={11} />
                          <span className="text-xs font-semibold text-slate-300">{(t as any)._count?.users ?? '—'}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Users</p>
                      </Link>
                    </div>
                    <div className="text-center">
                      <Link
                        href={`/departments?tenantId=${t.id}`}
                        className="inline-flex flex-col items-center rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                        title={`View departments of ${t.name}`}
                      >
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          <Briefcase size={11} />
                          <span className="text-xs font-semibold text-slate-300">{(t as any)._count?.departments ?? '—'}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Depts</p>
                      </Link>
                    </div>
                    <div className="text-center">
                      <Link
                        href={`/complaints?tenantId=${t.id}`}
                        className="inline-flex flex-col items-center rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                        title={`View complaints of ${t.name}`}
                      >
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          <FileText size={11} />
                          <span className="text-xs font-semibold text-slate-300">{(t as any)._count?.complaints ?? '—'}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Cases</p>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
              );
            })()
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tenant' : 'New Tenant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                placeholder="Acme Corporation"
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="acme-corp"
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600 font-mono text-sm"
              />
              <p className="text-[11px] text-slate-600">Used in URLs. Only lowercase letters, numbers, hyphens.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">State Code (auto from service area)</Label>
              <select
                value={form.stateCode}
                onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
                disabled={!!editing && !user?.isPlatformOwner}
                className="w-full bg-slate-800/60 border border-white/10 rounded-md px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              >
                <option value="" className="bg-slate-900">Select state code</option>
                {STATE_CODES.map((code) => (
                  <option key={code} value={code} className="bg-slate-900">
                    {code} - {getStateLabelFromCode(code)}
                  </option>
                ))}
              </select>
              {!!editing && !user?.isPlatformOwner && (
                <p className="text-[11px] text-amber-300">Only platform owner can change tenant state code.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">State Label (auto from service area)</Label>
              <Input
                value={form.stateLabel}
                onChange={(e) => setForm((f) => ({ ...f, stateLabel: e.target.value }))}
                placeholder="Uttar Pradesh"
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">District Label (auto from service area)</Label>
              <Input
                value={form.districtLabel}
                onChange={(e) => setForm((f) => ({ ...f, districtLabel: e.target.value }))}
                placeholder="Varanasi"
                className="bg-slate-800/60 border-white/10 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm flex items-center gap-1">
                <MapPin size={11} /> Service Areas *
              </Label>
              <LocationAutocomplete
                onChange={(value) => {
                  if (value && !(form.areas ?? []).includes(value)) {
                    const inferred = inferLocationFromServiceArea(value);
                    setForm((f) => ({
                      ...f,
                      areas: [...(f.areas ?? []), value],
                      stateCode: f.stateCode || inferred?.stateCode || '',
                      stateLabel: f.stateLabel || inferred?.stateLabel || '',
                      districtLabel: f.districtLabel || inferred?.districtLabel || '',
                    }));
                  }
                }}
                placeholder="Search for a service area..."
                className="[&_.geoapify-autocomplete-input]:w-full [&_.geoapify-autocomplete-input]:bg-slate-800/60 [&_.geoapify-autocomplete-input]:border [&_.geoapify-autocomplete-input]:border-white/10 [&_.geoapify-autocomplete-input]:rounded-lg [&_.geoapify-autocomplete-input]:px-4 [&_.geoapify-autocomplete-input]:py-2 [&_.geoapify-autocomplete-input]:text-slate-200 [&_.geoapify-autocomplete-input]:text-sm [&_.geoapify-autocomplete-input]:placeholder:text-slate-600 [&_.geoapify-autocomplete-input]:focus:outline-none"
              />
              <p className="text-[11px] text-slate-600">Add areas in full format so state/district can be inferred, e.g. "BHU, Varanasi, Uttar Pradesh, India".</p>
              {(form.areas ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.areas ?? []).map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px]"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, areas: (f.areas ?? []).filter((a) => a !== area) }))}
                        className="hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSubmit} disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save Changes' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Tenant</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm py-2">
            Are you sure you want to deactivate <span className="text-white font-semibold">{deactivateTarget?.name}</span>?
            This will prevent all users in this tenant from logging in.
          </p>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
