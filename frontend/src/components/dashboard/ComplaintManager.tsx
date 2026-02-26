'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, LayoutList, Columns3, MoreVertical, User, Clock, Plus } from 'lucide-react';
import { ComplaintStatus, Priority, Complaint } from '@/types';
import Link from 'next/link';

const statusStyles: Record<ComplaintStatus, string> = {
  OPEN:        'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  ASSIGNED:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  IN_PROGRESS: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  ESCALATED:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  RESOLVED:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CLOSED:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const priorityStyles: Record<Priority, string> = {
  LOW:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
  MEDIUM:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  HIGH:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status]} text-[10px] font-semibold uppercase tracking-wider`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={`${priorityStyles[priority]} text-[10px] font-semibold uppercase`}>
      {priority}
    </Badge>
  );
}

function SlaTimer({ createdAt, status }: { createdAt: string; status: ComplaintStatus }) {
  const [now] = React.useState(() => Date.now());
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return <span className="text-emerald-400 text-xs">Done</span>;
  }
  const hrs = Math.floor((now - new Date(createdAt).getTime()) / 3600000);
  return (
    <span className={`text-xs font-mono flex items-center gap-1 ${hrs > 48 ? 'text-red-400' : 'text-slate-400'}`}>
      <Clock size={12} />{hrs}h
    </span>
  );
}

function ComplaintsTable({ data }: { data: Complaint[] }) {
  return (
    <ScrollArea className="h-105">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-slate-400 text-xs font-semibold w-32.5">Tracking ID</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Citizen</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Category</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Priority</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Assigned To</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">SLA</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id} className="border-white/5 hover:bg-white/2 group cursor-pointer">
              <TableCell className="text-xs font-mono text-purple-400">{c.trackingId}</TableCell>
              <TableCell className="text-xs text-slate-200">{c.citizenName}</TableCell>
              <TableCell className="text-xs text-slate-400">{c.category ?? '—'}</TableCell>
              <TableCell><PriorityBadge priority={c.priority} /></TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell>
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <User size={12} className="text-slate-500" />
                  {c.assignedTo?.name ?? 'Unassigned'}
                </span>
              </TableCell>
              <TableCell><SlaTimer createdAt={c.createdAt} status={c.status} /></TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400">
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 min-w-35">
                    <DropdownMenuItem asChild className="text-xs cursor-pointer hover:bg-white/5">
                      <Link href={`/complaints/${c.id}`}>View Details</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

const kanbanColumns: { key: ComplaintStatus; title: string; color: string }[] = [
  { key: 'OPEN', title: 'Open', color: 'border-indigo-500/40' },
  { key: 'ASSIGNED', title: 'Assigned', color: 'border-cyan-500/40' },
  { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-purple-500/40' },
  { key: 'RESOLVED', title: 'Resolved', color: 'border-emerald-500/40' },
];

function KanbanBoard({ data }: { data: Complaint[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {kanbanColumns.map((col) => {
        const items = data.filter((c) => c.status === col.key);
        return (
          <div key={col.key} className={`rounded-xl border-t-2 ${col.color} bg-slate-900/30 border border-white/5 p-3`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{col.title}</h4>
              <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-slate-400">{items.length}</Badge>
            </div>
            <ScrollArea className="h-87.5">
              <div className="space-y-2 pr-1">
                {items.map((c) => (
                  <Link key={c.id} href={`/complaints/${c.id}`}>
                    <div className="rounded-lg bg-slate-800/40 border border-white/5 p-3 hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-purple-400">{c.trackingId}</span>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <p className="text-xs text-slate-200 font-medium mb-1 truncate">{c.citizenName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.category ?? '—'}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User size={10} /> {c.assignedTo?.name?.split(' ')[0] ?? 'None'}
                        </span>
                        <SlaTimer createdAt={c.createdAt} status={c.status} />
                      </div>
                    </div>
                  </Link>
                ))}
                {items.length === 0 && <p className="text-xs text-slate-600 text-center py-8">No items</p>}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

export function ComplaintManager() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', 'dashboard', statusFilter, priorityFilter, search],
    queryFn: () => complaintsApi.list({
      limit: 50,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      search: search || undefined,
    }),
    staleTime: 30_000,
  });

  const complaints: Complaint[] = data?.data?.data ?? [];
  const total = data?.data?.pagination?.total ?? 0;

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-slate-300">Complaint Management</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/complaints/new">
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
                <Plus size={14} /> New Complaint
              </Button>
            </Link>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search complaints…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-50 bg-slate-800/50 border-white/5 text-xs text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-30 bg-slate-800/50 border-white/5 text-xs text-slate-300">
                <Filter size={12} className="mr-1 text-slate-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="OPEN" className="text-xs">Open</SelectItem>
                <SelectItem value="ASSIGNED" className="text-xs">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
                <SelectItem value="ESCALATED" className="text-xs">Escalated</SelectItem>
                <SelectItem value="RESOLVED" className="text-xs">Resolved</SelectItem>
                <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-27.5 bg-slate-800/50 border-white/5 text-xs text-slate-300">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="all" className="text-xs">All Priority</SelectItem>
                <SelectItem value="LOW" className="text-xs">Low</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs">Medium</SelectItem>
                <SelectItem value="HIGH" className="text-xs">High</SelectItem>
                <SelectItem value="CRITICAL" className="text-xs">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-105 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
          </div>
        ) : (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="bg-slate-800/50 border border-white/5 mb-3 h-8">
              <TabsTrigger value="table" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 gap-1.5">
                <LayoutList size={13} /> Table
              </TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 gap-1.5">
                <Columns3 size={13} /> Kanban
              </TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-0"><ComplaintsTable data={complaints} /></TabsContent>
            <TabsContent value="kanban" className="mt-0"><KanbanBoard data={complaints} /></TabsContent>
          </Tabs>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {complaints.length} of {total} complaints</span>
          <Link href="/complaints" className="text-purple-400 hover:text-purple-300 transition-colors">View all →</Link>
        </div>
      </CardContent>
    </Card>
  );
}
