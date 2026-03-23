"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { complaintsApi, departmentsApi } from "@/lib/api";
import { Complaint, ComplaintStatus, Priority, Department } from "@/types";
import { useRole } from "@/hooks/useRole";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_FILTERS: { label: string; value: ComplaintStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Escalated", value: "ESCALATED" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const PRIORITY_FILTERS: { label: string; value: Priority | "" }[] = [
  { label: "All", value: "" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" },
];

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const colors: Record<ComplaintStatus, string> = {
    OPEN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ASSIGNED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ESCALATED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    CLOSED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function ComplaintsPage() {
  const searchParams = useSearchParams();
  const { role, isCitizen } = useRole();
  const isOfficerOnly = role === "OFFICER";
  const canExport =
    role === "DEPARTMENT_HEAD" || role === "ADMIN" || role === "SUPER_ADMIN";
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [tenantIdFilter, setTenantIdFilter] = useState<string>("");
  const [stateIdFilter, setStateIdFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const searchQuery = searchParams.get("search");
    const pageQuery = searchParams.get("page");
    const deptQuery = searchParams.get("departmentId");
    const tenantIdQuery = searchParams.get("tenantId");
    const stateIdQuery = searchParams.get("stateId");

    setStatusFilter(
      status && STATUS_FILTERS.some((s) => s.value === status)
        ? (status as ComplaintStatus)
        : "",
    );
    setPriorityFilter(
      priority && PRIORITY_FILTERS.some((p) => p.value === priority)
        ? (priority as Priority)
        : "",
    );
    setSearch(searchQuery ?? "");
    setDepartmentFilter(deptQuery ?? "");
    setTenantIdFilter(tenantIdQuery ?? "");
    setStateIdFilter(stateIdQuery ?? "");
    setPage(pageQuery && Number(pageQuery) > 0 ? Number(pageQuery) : 1);
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "complaints",
      "list",
      tenantIdFilter,
      statusFilter,
      priorityFilter,
      departmentFilter,
      stateIdFilter,
      search,
      page,
    ],
    queryFn: () =>
      complaintsApi.list({
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(departmentFilter ? { departmentId: departmentFilter } : {}),
        ...(role === "SUPER_ADMIN" && tenantIdFilter
          ? { tenantId: tenantIdFilter }
          : {}),
        ...(stateIdFilter ? { stateId: stateIdFilter } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 15_000,
    enabled: !isCitizen,
  });

  const {
    data: citizenData,
    isLoading: isCitizenLoading,
    isError: isCitizenError,
  } = useQuery({
    queryKey: [
      "complaints",
      "my-complaints",
      statusFilter,
      priorityFilter,
      search,
      page,
    ],
    queryFn: () =>
      complaintsApi.list({
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 15_000,
    enabled: isCitizen,
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments-list", role === "SUPER_ADMIN" ? tenantIdFilter : "self"],
    queryFn: () =>
      departmentsApi.list({
        limit: 100,
        ...(role === "SUPER_ADMIN" && tenantIdFilter
          ? { tenantId: tenantIdFilter }
          : {}),
      }),
    staleTime: 60_000,
    enabled: !isCitizen,
  });
  const departments: Department[] = deptsData?.data?.data ?? [];

  const complaints: Complaint[] = isCitizen
    ? (citizenData?.data?.data ?? [])
    : (data?.data?.data ?? []);
  const pagination = isCitizen
    ? citizenData?.data?.pagination
    : data?.data?.pagination;
  const isLoadingFinal = isCitizen ? isCitizenLoading : isLoading;
  const isErrorFinal = isCitizen ? isCitizenError : isError;

  return (
    <div className="space-y-6">
      {(tenantIdFilter || departmentFilter) && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 flex items-center justify-between gap-2">
          <span>Showing complaints only for selected scope.</span>
          <Link href="/complaints" className="text-blue-100 hover:text-white underline underline-offset-2">
            Back to all complaints
          </Link>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isOfficerOnly ? "My Assigned Complaints" : isCitizen ? "My Complaints" : "Complaints"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isOfficerOnly
              ? "Complaints assigned to you for resolution"
              : isCitizen
                ? "Track your filed complaints"
                : "Manage and track citizen complaints"}
            {pagination && (
              <span className="ml-2 text-slate-600">
                ({pagination.total} total)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  await complaintsApi.exportComplaints({
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(priorityFilter ? { priority: priorityFilter } : {}),
                    ...(departmentFilter
                      ? { departmentId: departmentFilter }
                      : {}),
                    ...(role === "SUPER_ADMIN" && tenantIdFilter
                      ? { tenantId: tenantIdFilter }
                      : {}),
                    ...(search ? { search } : {}),
                  });
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Download size={15} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          )}
          {!isCitizen && (
            <Link
              href="/complaints/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus size={18} />
              New Complaint
            </Link>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder={
                isCitizen
                  ? "Search by tracking ID, category…"
                  : "Search by citizen name, phone…"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-900/40 rounded-xl border border-white/5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={12} />
            <span>Priority:</span>
          </div>
          <div className="flex gap-1 p-1 bg-slate-900/40 rounded-xl border border-white/5 flex-wrap">
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setPriorityFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  priorityFilter === f.value
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!isCitizen && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                <span>Dept:</span>
              </div>
              <Select
                value={departmentFilter || "__all"}
                onValueChange={(v) => {
                  setDepartmentFilter(v === "__all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-44 bg-slate-900/40 border-white/5 text-slate-300 rounded-xl">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200 text-xs">
                  <SelectItem value="__all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {(statusFilter || priorityFilter || departmentFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
                setDepartmentFilter("");
                setSearch("");
                setPage(1);
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors ml-auto"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 font-medium">
            <tr>
              <th className="px-6 py-4">Tracking ID</th>
              {isCitizen && <th className="px-6 py-4">Citizen</th>}
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              {!isCitizen && <th className="px-6 py-4">Department</th>}
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoadingFinal ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(isCitizen ? 5 : 6)].map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-white/5 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isErrorFinal ? (
              <tr>
                <td
                  colSpan={isCitizen ? 5 : 7}
                  className="px-6 py-12 text-center"
                >
                  <span className="text-red-400 text-sm">
                    Failed to load complaints. Please try refreshing the page.
                  </span>
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td
                  colSpan={isCitizen ? 5 : 7}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {isCitizen
                    ? "You haven't filed any complaints yet."
                    : `No complaints found${statusFilter ? ` with status "${statusFilter}"` : ""}${search ? ` matching "${search}"` : ""}.`}
                </td>
              </tr>
            ) : (
              complaints.map((complaint) => (
                <tr
                  key={complaint.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4 font-mono text-slate-300 text-xs group-hover:text-blue-400 transition-colors">
                    {complaint.trackingId}
                  </td>
                  {isCitizen && (
                    <td className="px-6 py-4 text-white font-medium">
                      {complaint.citizenName}
                      <div className="text-xs text-slate-500 font-normal">
                        {complaint.citizenPhone}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        complaint.priority === "CRITICAL"
                          ? "text-red-400 bg-red-500/10"
                          : complaint.priority === "HIGH"
                            ? "text-orange-400 bg-orange-500/10"
                            : complaint.priority === "MEDIUM"
                              ? "text-blue-400 bg-blue-500/10"
                              : "text-slate-400 bg-slate-500/10"
                      }`}
                    >
                      {complaint.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={complaint.status} />
                  </td>
                  {!isCitizen && (
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {complaint.department?.name ?? (
                        <span className="text-slate-600 italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/complaints/${complaint.id}`}
                      className="text-blue-400 hover:text-blue-300 font-medium text-xs hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/5">
            <p className="text-xs text-slate-500">
              Page {page} of {pagination.totalPages} · {pagination.total}{" "}
              complaints
            </p>
            <div className="flex gap-2">
              <button
                className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-slate-800/50 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-slate-800/50 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
