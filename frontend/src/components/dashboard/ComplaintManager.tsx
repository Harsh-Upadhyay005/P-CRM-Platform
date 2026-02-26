'use client';

import React, { useState, useMemo } from 'react';
import { mockComplaints, type MockComplaint } from '@/lib/dashboard-mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, LayoutList, Columns3, MoreVertical, User, Clock, Plus, UploadCloud } from 'lucide-react';
import { ComplaintStatus, Priority } from '@/types';

// ─── Status Badge ─────────────────────────────────────────────
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

// ─── SLA Timer ────────────────────────────────────────────────
function SlaTimer({ createdAt, status }: { createdAt: string; status: ComplaintStatus }) {
  const [now] = React.useState(() => Date.now());
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return <span className="text-emerald-400 text-xs">Done</span>;
  }
  const hrs = Math.floor((now - new Date(createdAt).getTime()) / 3600000);
  const isOverdue = hrs > 48;
  return (
    <span className={`text-xs font-mono flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
      <Clock size={12} />
      {hrs}h
    </span>
  );
}

// ─── Table View ───────────────────────────────────────────────
function ComplaintsTable({ data }: { data: MockComplaint[] }) {
  return (
    <ScrollArea className="h-[420px]">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-slate-400 text-xs font-semibold w-[130px]">ID</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Citizen</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Category</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Priority</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">Assigned To</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold">SLA</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id} className="border-white/5 hover:bg-white/[0.02] group cursor-pointer">
              <TableCell className="text-xs font-mono text-purple-400">{c.trackingId}</TableCell>
              <TableCell className="text-xs text-slate-200">{c.citizenName}</TableCell>
              <TableCell className="text-xs text-slate-400">{c.category}</TableCell>
              <TableCell><PriorityBadge priority={c.priority} /></TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell>
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <User size={12} className="text-slate-500" />
                  {c.assignedTo}
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
                  <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 min-w-[140px]">
                    <DropdownMenuItem className="text-xs cursor-pointer hover:bg-white/5">View Details</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer hover:bg-white/5">Update Status</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer hover:bg-white/5">Reassign</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer hover:bg-white/5 text-red-400">Escalate</DropdownMenuItem>
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

// ─── Kanban View ──────────────────────────────────────────────
const kanbanColumns: { key: ComplaintStatus; title: string; color: string }[] = [
  { key: 'OPEN', title: 'Open', color: 'border-indigo-500/40' },
  { key: 'ASSIGNED', title: 'Assigned', color: 'border-cyan-500/40' },
  { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-purple-500/40' },
  { key: 'RESOLVED', title: 'Resolved', color: 'border-emerald-500/40' },
];

function KanbanBoard({ data }: { data: MockComplaint[] }) {
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
            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-1">
                {items.map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-800/40 border border-white/5 p-3 hover:bg-slate-800/60 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-purple-400">{c.trackingId}</span>
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <p className="text-xs text-slate-200 font-medium mb-1 truncate">{c.citizenName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.category}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <User size={10} /> {c.assignedTo.split(' ')[0]}
                      </span>
                      <SlaTimer createdAt={c.createdAt} status={c.status} />
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">No items</p>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Complaint Manager ──────────────────────────────────
export function ComplaintManager() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return mockComplaints.filter((c) => {
      const matchesSearch =
        !search ||
        c.citizenName.toLowerCase().includes(search.toLowerCase()) ||
        c.trackingId.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [search, statusFilter, priorityFilter]);

  return (
    <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-slate-300">Complaint Management</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
                  <Plus size={14} /> New Complaint
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium text-white">File New Complaint</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Citizen Name</label>
                    <Input placeholder="Enter name" className="bg-slate-800/50 border-white/10 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Category</label>
                    <Select>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10 text-slate-200">
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="sanitation">Sanitation</SelectItem>
                        <SelectItem value="water">Water Supply</SelectItem>
                        <SelectItem value="electricity">Electricity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Description</label>
                    <textarea 
                      className="w-full min-h-[80px] rounded-md bg-slate-800/50 border border-white/10 p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Attachments</label>
                    <div className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer">
                      <UploadCloud size={24} className="text-slate-400" />
                      <p className="text-xs text-slate-400">Click to upload or drag and drop</p>
                      <p className="text-[10px] text-slate-500">PNG, JPG, PDF up to 10MB</p>
                      <input type="file" className="hidden" multiple />
                    </div>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                    Submit Complaint
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search complaints…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-[200px] bg-slate-800/50 border-white/5 text-xs text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] bg-slate-800/50 border-white/5 text-xs text-slate-300">
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
              <SelectTrigger className="h-8 w-[110px] bg-slate-800/50 border-white/5 text-xs text-slate-300">
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
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="bg-slate-800/50 border border-white/5 mb-3 h-8">
            <TabsTrigger value="table" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 gap-1.5">
              <LayoutList size={13} /> Table
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 gap-1.5">
              <Columns3 size={13} /> Kanban
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-0">
            <ComplaintsTable data={filtered} />
          </TabsContent>
          <TabsContent value="kanban" className="mt-0">
            <KanbanBoard data={filtered} />
          </TabsContent>
        </Tabs>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {mockComplaints.length} complaints</span>
          <span className="font-mono">Last updated: just now</span>
        </div>
      </CardContent>
    </Card>
  );
}
