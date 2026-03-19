'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  workflowApi,
  departmentsApi,
  usersApi,
  tenantsApi,
  getErrorMessage,
} from '@/lib/api';
import {
  CategorySlaPolicy,
  Department,
  Priority,
  Tenant,
  User,
  WorkflowAssignmentRule,
  WorkflowSettings,
} from '@/types';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Workflow,
  Clock4,
  Trash2,
  Pencil,
  Save,
  RefreshCcw,
  Bot,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const toPatternList = (input: string) =>
  input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const toPatternString = (values?: string[]) => (values ?? []).join(', ');

type RuleFormState = {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  stopOnMatch: boolean;
  categoryPatterns: string;
  areaPatterns: string;
  keywordPatterns: string;
  departmentId: string;
  assignToId: string;
  setPriority: Priority | 'NONE';
};

const getInitialRuleForm = (rule?: WorkflowAssignmentRule): RuleFormState => ({
  name: rule?.name ?? '',
  description: rule?.description ?? '',
  priority: rule?.priority ?? 100,
  isActive: rule?.isActive ?? true,
  stopOnMatch: rule?.stopOnMatch ?? true,
  categoryPatterns: toPatternString(rule?.categoryPatterns),
  areaPatterns: toPatternString(rule?.areaPatterns),
  keywordPatterns: toPatternString(rule?.keywordPatterns),
  departmentId: rule?.department?.id ?? 'NONE',
  assignToId: rule?.assignee?.id ?? 'NONE',
  setPriority: rule?.setPriority ?? 'NONE',
});

export default function WorkflowPage() {
  const qc = useQueryClient();
  const { isAdmin, isSuperAdmin } = useRole();

  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowAssignmentRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(getInitialRuleForm());

  const [newPolicyLabel, setNewPolicyLabel] = useState('');
  const [newPolicyHours, setNewPolicyHours] = useState(48);
  const [autoCloseDaysInput, setAutoCloseDaysInput] = useState<string>('7');

  const tenantParam = isSuperAdmin && selectedTenantId !== 'ALL' ? selectedTenantId : undefined;
  const hasScopedTenant = !isSuperAdmin || !!tenantParam;

  const { data: tenantsData } = useQuery({
    queryKey: ['workflow', 'tenants', 'selector'],
    queryFn: () => tenantsApi.list({ limit: 100 }),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });
  const tenants: Tenant[] = tenantsData?.data?.data ?? [];

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['workflow', 'settings', tenantParam ?? 'self'],
    queryFn: () => workflowApi.getSettings(tenantParam),
    enabled: hasScopedTenant,
  });
  const settings: WorkflowSettings | null = settingsData?.data ?? null;

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['workflow', 'rules', tenantParam ?? 'self'],
    queryFn: () => workflowApi.listAssignmentRules({ limit: 200, tenantId: tenantParam }),
    enabled: hasScopedTenant,
  });
  const rules: WorkflowAssignmentRule[] = rulesData?.data?.data ?? [];

  const { data: slaData, isLoading: slaLoading } = useQuery({
    queryKey: ['workflow', 'category-sla', tenantParam ?? 'self'],
    queryFn: () => workflowApi.listCategorySla({ tenantId: tenantParam }),
    enabled: hasScopedTenant,
  });
  const categoryPolicies: CategorySlaPolicy[] = slaData?.data ?? [];

  const { data: departmentsData } = useQuery({
    queryKey: ['workflow', 'departments', tenantParam ?? 'self'],
    queryFn: () => departmentsApi.list({ limit: 200, ...(tenantParam ? { tenantId: tenantParam } : {}) }),
    enabled: isAdmin && hasScopedTenant,
    staleTime: 30_000,
  });
  const departments: Department[] = departmentsData?.data?.data ?? [];

  const { data: usersData } = useQuery({
    queryKey: ['workflow', 'users', tenantParam ?? 'self'],
    queryFn: () => usersApi.list({ limit: 200, ...(tenantParam ? { tenantId: tenantParam } : {}) }),
    enabled: isAdmin && hasScopedTenant,
    staleTime: 30_000,
  });
  const users: User[] = usersData?.data?.data ?? [];

  const assigneeCandidates = users.filter((u) => ['OFFICER', 'DEPARTMENT_HEAD', 'ADMIN'].includes(u.role.type));

  useEffect(() => {
    setAutoCloseDaysInput(String(settings?.autoCloseAfterDays ?? 7));
  }, [settings?.autoCloseAfterDays]);

  const assertTenantScopeForMutation = () => {
    if (!hasScopedTenant) {
      toast.error('Select a tenant first to manage workflow settings.');
      return false;
    }
    return true;
  };

  const refreshWorkflowQueries = () => {
    qc.invalidateQueries({ queryKey: ['workflow', 'settings'] });
    qc.invalidateQueries({ queryKey: ['workflow', 'rules'] });
    qc.invalidateQueries({ queryKey: ['workflow', 'category-sla'] });
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: { smartRoutingEnabled?: boolean; autoCloseEnabled?: boolean; autoCloseAfterDays?: number }) =>
      workflowApi.updateSettings({ ...payload, ...(tenantParam ? { tenantId: tenantParam } : {}) }),
    onSuccess: () => {
      toast.success('Workflow settings updated');
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createRuleMutation = useMutation({
    mutationFn: (payload: RuleFormState) =>
      workflowApi.createAssignmentRule({
        name: payload.name,
        description: payload.description || null,
        priority: payload.priority,
        isActive: payload.isActive,
        stopOnMatch: payload.stopOnMatch,
        categoryPatterns: toPatternList(payload.categoryPatterns),
        areaPatterns: toPatternList(payload.areaPatterns),
        keywordPatterns: toPatternList(payload.keywordPatterns),
        departmentId: payload.departmentId === 'NONE' ? null : payload.departmentId,
        assignToId: payload.assignToId === 'NONE' ? null : payload.assignToId,
        setPriority: payload.setPriority === 'NONE' ? null : payload.setPriority,
        ...(tenantParam ? { tenantId: tenantParam } : {}),
      }),
    onSuccess: () => {
      toast.success('Assignment rule created');
      setRuleDialogOpen(false);
      setEditingRule(null);
      setRuleForm(getInitialRuleForm());
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RuleFormState }) =>
      workflowApi.updateAssignmentRule(id, {
        name: payload.name,
        description: payload.description || null,
        priority: payload.priority,
        isActive: payload.isActive,
        stopOnMatch: payload.stopOnMatch,
        categoryPatterns: toPatternList(payload.categoryPatterns),
        areaPatterns: toPatternList(payload.areaPatterns),
        keywordPatterns: toPatternList(payload.keywordPatterns),
        departmentId: payload.departmentId === 'NONE' ? null : payload.departmentId,
        assignToId: payload.assignToId === 'NONE' ? null : payload.assignToId,
        setPriority: payload.setPriority === 'NONE' ? null : payload.setPriority,
        ...(tenantParam ? { tenantId: tenantParam } : {}),
      }),
    onSuccess: () => {
      toast.success('Assignment rule updated');
      setRuleDialogOpen(false);
      setEditingRule(null);
      setRuleForm(getInitialRuleForm());
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => workflowApi.deleteAssignmentRule(id, tenantParam),
    onSuccess: () => {
      toast.success('Rule deleted');
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const upsertPolicyMutation = useMutation({
    mutationFn: (payload: { categoryLabel: string; slaHours: number }) =>
      workflowApi.upsertCategorySla({
        categoryLabel: payload.categoryLabel,
        slaHours: payload.slaHours,
        ...(tenantParam ? { tenantId: tenantParam } : {}),
      }),
    onSuccess: () => {
      toast.success('Category SLA saved');
      setNewPolicyLabel('');
      setNewPolicyHours(48);
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: string) => workflowApi.deleteCategorySla(id, tenantParam),
    onSuccess: () => {
      toast.success('Category SLA removed');
      refreshWorkflowQueries();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400">You do not have permission to view this page.</p>
      </div>
    );
  }

  const ruleSubmitPending = createRuleMutation.isPending || updateRuleMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Workflow size={24} className="text-cyan-400" /> Workflow Automation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage smart routing, auto-close behavior, assignment rules, and category SLA policies.
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-65 bg-slate-800/50 border-white/10 text-slate-200">
                <SelectValue placeholder="Scope tenant" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="ALL">My current tenant context</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            className="border-white/10 bg-slate-800/30 text-slate-200"
            onClick={() => refreshWorkflowQueries()}
          >
            <RefreshCcw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Bot size={15} className="text-cyan-400" /> Smart Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings?.smartRoutingEnabled ?? false}
                disabled={settingsLoading || updateSettingsMutation.isPending || !hasScopedTenant}
                onChange={(e) => {
                  if (!assertTenantScopeForMutation()) return;
                  updateSettingsMutation.mutate({ smartRoutingEnabled: e.target.checked });
                }}
              />
              Enable AI + service-area routing
            </label>
            <p className="text-xs text-slate-500">
              Routes unassigned complaints to the best-fit department using locality, category hints, and routing keywords.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Clock4 size={15} className="text-amber-400" /> Auto Close
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings?.autoCloseEnabled ?? false}
                disabled={settingsLoading || updateSettingsMutation.isPending || !hasScopedTenant}
                onChange={(e) => {
                  if (!assertTenantScopeForMutation()) return;
                  updateSettingsMutation.mutate({ autoCloseEnabled: e.target.checked });
                }}
              />
              Close resolved complaints automatically
            </label>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Days after RESOLVED with no feedback</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={autoCloseDaysInput}
                  onChange={(e) => setAutoCloseDaysInput(e.target.value)}
                  className="w-28 bg-slate-800/50 border-white/10 text-slate-200"
                  disabled={!hasScopedTenant}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-slate-800/30 text-slate-200"
                  disabled={updateSettingsMutation.isPending || !hasScopedTenant}
                  onClick={() => {
                    if (!assertTenantScopeForMutation()) return;
                    const parsed = Number(autoCloseDaysInput);
                    if (Number.isNaN(parsed) || parsed < 1 || parsed > 365) {
                      toast.error('Auto-close days must be between 1 and 365.');
                      return;
                    }
                    updateSettingsMutation.mutate({ autoCloseAfterDays: parsed });
                  }}
                >
                  Save
                </Button>
                <span className="text-xs text-slate-500">days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Target size={15} className="text-emerald-400" /> Rule Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-300">
              <span>Total assignment rules</span>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">
                {rules.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Active category SLA policies</span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                {categoryPolicies.filter((p) => p.isActive).length}
              </Badge>
            </div>
            <div className="pt-2 text-xs text-slate-500">
              Create explicit assignment rules to auto-route by category, area patterns, and complaint keywords.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-slate-200">Assignment Rules</CardTitle>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5"
            disabled={!hasScopedTenant}
            onClick={() => {
              if (!assertTenantScopeForMutation()) return;
              setEditingRule(null);
              setRuleForm(getInitialRuleForm());
              setRuleDialogOpen(true);
            }}
          >
            <Plus size={14} /> New Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {rulesLoading ? (
            <p className="text-sm text-slate-500">Loading assignment rules…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-slate-500">No rules configured yet.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{rule.name}</p>
                      <Badge variant="outline" className={rule.isActive ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-500/40 text-slate-400'}>
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">
                        Priority {rule.priority}
                      </Badge>
                    </div>
                    {rule.description && <p className="text-xs text-slate-400">{rule.description}</p>}
                    <p className="text-xs text-slate-500">
                      Category: {toPatternString(rule.categoryPatterns) || '-'} | Area: {toPatternString(rule.areaPatterns) || '-'} | Keywords: {toPatternString(rule.keywordPatterns) || '-'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Action: Dept {rule.department?.name ?? '-'} | Assignee {rule.assignee?.name ?? '-'} | Priority override {rule.setPriority ?? '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-slate-800/40 text-slate-200"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleForm(getInitialRuleForm(rule));
                        setRuleDialogOpen(true);
                      }}
                    >
                      <Pencil size={13} className="mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!assertTenantScopeForMutation()) return;
                        deleteRuleMutation.mutate(rule.id);
                      }}
                      disabled={deleteRuleMutation.isPending || !hasScopedTenant}
                    >
                      <Trash2 size={13} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Category SLA Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <p className="text-xs text-slate-400 mb-2">Add / Update SLA per category (e.g. Water: 24h, Road: 72h)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                value={newPolicyLabel}
                onChange={(e) => setNewPolicyLabel(e.target.value)}
                placeholder="Category label"
                className="bg-slate-800/50 border-white/10 text-slate-200"
              />
              <Input
                type="number"
                min={1}
                max={8760}
                value={newPolicyHours}
                onChange={(e) => setNewPolicyHours(Number(e.target.value || 1))}
                className="bg-slate-800/50 border-white/10 text-slate-200"
              />
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={!newPolicyLabel.trim() || upsertPolicyMutation.isPending || !hasScopedTenant}
                onClick={() => {
                  if (!assertTenantScopeForMutation()) return;
                  upsertPolicyMutation.mutate({ categoryLabel: newPolicyLabel.trim(), slaHours: newPolicyHours });
                }}
              >
                <Save size={14} className="mr-1" /> Save Policy
              </Button>
            </div>
          </div>

          {slaLoading ? (
            <p className="text-sm text-slate-500">Loading category SLAs…</p>
          ) : categoryPolicies.length === 0 ? (
            <p className="text-sm text-slate-500">No category-specific SLA yet. Department SLA defaults will be used.</p>
          ) : (
            <div className="space-y-2">
              {categoryPolicies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/20 p-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-200 font-medium">{policy.categoryLabel}</span>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-300">{policy.slaHours}h</Badge>
                    {!policy.isActive && (
                      <Badge variant="outline" className="border-slate-500/40 text-slate-400">Inactive</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (!assertTenantScopeForMutation()) return;
                      deletePolicyMutation.mutate(policy.id);
                    }}
                    disabled={deletePolicyMutation.isPending || !hasScopedTenant}
                  >
                    <Trash2 size={13} className="mr-1" /> Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editingRule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Rule name</label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Water complaints in Ward 4"
                className="bg-slate-800/50 border-white/10 text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Description</label>
              <Input
                value={ruleForm.description}
                onChange={(e) => setRuleForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Optional note for admins"
                className="bg-slate-800/50 border-white/10 text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Rule Priority (lower runs first)</label>
              <Input
                type="number"
                value={ruleForm.priority}
                min={1}
                max={10000}
                onChange={(e) => setRuleForm((s) => ({ ...s, priority: Number(e.target.value || 1) }))}
                className="bg-slate-800/50 border-white/10 text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Priority Override</label>
              <Select value={ruleForm.setPriority} onValueChange={(v) => setRuleForm((s) => ({ ...s, setPriority: v as Priority | 'NONE' }))}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="NONE">No override</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400">Category patterns</label>
                <Input
                  value={ruleForm.categoryPatterns}
                  onChange={(e) => setRuleForm((s) => ({ ...s, categoryPatterns: e.target.value }))}
                  placeholder="water, drainage"
                  className="bg-slate-800/50 border-white/10 text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Area patterns</label>
                <Input
                  value={ruleForm.areaPatterns}
                  onChange={(e) => setRuleForm((s) => ({ ...s, areaPatterns: e.target.value }))}
                  placeholder="gomti nagar, ward 12"
                  className="bg-slate-800/50 border-white/10 text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Keyword patterns</label>
                <Input
                  value={ruleForm.keywordPatterns}
                  onChange={(e) => setRuleForm((s) => ({ ...s, keywordPatterns: e.target.value }))}
                  placeholder="pipe burst, no water"
                  className="bg-slate-800/50 border-white/10 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Assign Department</label>
              <Select value={ruleForm.departmentId} onValueChange={(v) => setRuleForm((s) => ({ ...s, departmentId: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="NONE">No department action</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-400">Assign User</label>
              <Select value={ruleForm.assignToId} onValueChange={(v) => setRuleForm((s) => ({ ...s, assignToId: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="NONE">No assignee action</SelectItem>
                  {assigneeCandidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end gap-1 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm((s) => ({ ...s, isActive: e.target.checked }))}
                />
                Rule active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ruleForm.stopOnMatch}
                  onChange={(e) => setRuleForm((s) => ({ ...s, stopOnMatch: e.target.checked }))}
                />
                Stop evaluating after match
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-500"
              disabled={!ruleForm.name.trim() || ruleSubmitPending || !hasScopedTenant}
              onClick={() => {
                if (!assertTenantScopeForMutation()) return;
                if (editingRule) {
                  updateRuleMutation.mutate({ id: editingRule.id, payload: ruleForm });
                } else {
                  createRuleMutation.mutate(ruleForm);
                }
              }}
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!hasScopedTenant && (
        <Card className="bg-amber-900/20 border-amber-500/30">
          <CardContent className="py-3 text-sm text-amber-200">
            Select a tenant to view and modify workflow settings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
