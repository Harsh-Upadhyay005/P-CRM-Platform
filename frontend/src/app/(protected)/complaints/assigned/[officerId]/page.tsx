"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { complaintsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clock,
  User,
} from "lucide-react";
import { ComplaintStatus, Priority, Complaint } from "@/types";
import { useRole } from "@/hooks/useRole";

const statusStyles: Record<ComplaintStatus, string> = {
  OPEN: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  ASSIGNED: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  IN_PROGRESS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ESCALATED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const priorityStyles: Record<Priority, string> = {
  LOW: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  MEDIUM: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  HIGH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <Badge
      variant="outline"
      className={`${statusStyles[status]} text-[10px] font-semibold uppercase tracking-wider`}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge
      variant="outline"
      className={`${priorityStyles[priority]} text-[10px] font-semibold uppercase`}
    >
      {priority}
    </Badge>
  );
}

function SlaTimer({
  createdAt,
  status,
}: {
  createdAt: string;
  status: ComplaintStatus;
}) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (status === "RESOLVED" || status === "CLOSED") {
    return <span className="text-emerald-400 text-xs">Done</span>;
  }

  if (now === null) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const hrs = Math.floor((now - new Date(createdAt).getTime()) / 3600000);
  return (
    <span
      className={`text-xs font-mono flex items-center gap-1 ${hrs > 48 ? "text-red-400" : "text-slate-400"}`}
    >
      <Clock size={12} />
      {hrs}h
    </span>
  );
}

interface Props {
  params: Promise<{ officerId: string }>;
}

export default function OfficerComplaintsPage({ params }: Props) {
  const { officerId } = use(params);
  const { isCitizen } = useRole();
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "__all__">("__all__");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "__all__">("__all__");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["complaints", "officer", officerId, statusFilter, priorityFilter, search, page],
    queryFn: () =>
      complaintsApi.list({
        assignedToId: officerId,
        page,
        limit: 20,
        ...(statusFilter !== "__all__" ? { status: statusFilter as ComplaintStatus } : {}),
        ...(priorityFilter !== "__all__" ? { priority: priorityFilter as Priority } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 30_000,
    enabled: !isCitizen,
  });

  const complaints: Complaint[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">Officer Complaints</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Complaints assigned to this officer
            {pagination && (
              <span className="ml-2 text-slate-600">({pagination.total} total)</span>
            )}
          </p>
        </div>
      </div>

      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-slate-300">
              Assigned Complaints
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <Input
                  placeholder="Search complaints..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-8 w-50 bg-slate-800/50 border-white/5 text-xs text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ComplaintStatus | "__all__"); setPage(1); }}>
                <SelectTrigger className="h-8 w-30 bg-slate-800/50 border-white/5 text-xs text-slate-300">
                  <Filter size={12} className="mr-1 text-slate-500" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="__all__" className="text-xs">All Status</SelectItem>
                  <SelectItem value="OPEN" className="text-xs">Open</SelectItem>
                  <SelectItem value="ASSIGNED" className="text-xs">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
                  <SelectItem value="ESCALATED" className="text-xs">Escalated</SelectItem>
                  <SelectItem value="RESOLVED" className="text-xs">Resolved</SelectItem>
                  <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v as Priority | "__all__"); setPage(1); }}>
                <SelectTrigger className="h-8 w-27.5 bg-slate-800/50 border-white/5 text-xs text-slate-300">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="__all__" className="text-xs">All Priority</SelectItem>
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
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No complaints found for this officer.</p>
            </div>
          ) : (
            <>
              <div className="h-[420px] overflow-auto rounded-md [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.700)_transparent]">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs font-semibold w-32">
                        Tracking ID
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold">
                        Citizen
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold hidden sm:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold">
                        Priority
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold hidden md:table-cell">
                        Assigned To
                      </TableHead>
                      <TableHead className="text-slate-400 text-xs font-semibold">
                        SLA
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.map((c) => (
                      <TableRow
                        key={c.id}
                        className="border-white/5 hover:bg-white/2 cursor-pointer"
                        onClick={() => window.location.href = `/complaints/${c.id}`}
                      >
                        <TableCell className="text-xs font-mono text-purple-400">
                          {c.trackingId}
                        </TableCell>
                        <TableCell className="text-xs text-slate-200 max-w-[120px] truncate">
                          {c.citizenName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 hidden sm:table-cell">
                          {c.category ?? "—"}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={c.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-slate-300 flex items-center gap-1.5">
                            <User size={12} className="text-slate-500" />
                            {c.assignedTo?.name ?? "Unassigned"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SlaTimer createdAt={c.createdAt} status={c.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
