"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { complaintsApi } from "@/lib/api";
import { Complaint, ComplaintStatus } from "@/types";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  PlusCircle,
  Search,
  FileText,
  Clock,
  CheckCircle,
  Zap,
  ChevronRight,
  Inbox,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Status Badge ────────────────────────────────────────────────────────────

const statusStyles: Record<ComplaintStatus, string> = {
  OPEN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ASSIGNED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ESCALATED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
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



interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  borderClass: string;
  textClass: string;
  delay?: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  borderClass,
  textClass,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative group rounded-xl border ${borderClass} ${colorClass} p-4 overflow-hidden backdrop-blur-md
        hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:border-white/20 transition-all duration-500 cursor-default shadow-md`}
    >
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-25 ${colorClass} group-hover:opacity-60 group-hover:scale-150 transition-all duration-700`}
      />
      <div className="relative z-10">
        <div
          className={`inline-flex items-center justify-center p-2 rounded-lg ${colorClass} ring-1 ring-white/5 mb-3`}
        >
          <Icon size={18} className={textClass} />
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
      </div>
    </motion.div>
  );
}



export function CitizenDashboard() {
  const { user } = useAuth();

  // Fetch the citizen's own complaints (backend ABAC ensures only their data is returned)
  const { data, isLoading } = useQuery({
    queryKey: ["complaints", "citizen-summary"],
    queryFn: () => complaintsApi.list({ limit: 100 }),
    staleTime: 30_000,
  });

  const complaints: Complaint[] = data?.data?.data ?? [];
  const totalFromPagination: number =
    data?.data?.pagination?.total ?? complaints.length;

  // Derive stats from the fetched page (good enough for typical citizen use)
  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED",
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === "RESOLVED" || c.status === "CLOSED",
  ).length;
  const escalatedCount = complaints.filter(
    (c) => c.status === "ESCALATED",
  ).length;

  // Show the 5 most recent complaints
  const recentComplaints = complaints.slice(0, 5);

  const firstName = user?.name?.split(" ")[0] ?? "Citizen";

  return (
    <div className="w-full flex flex-col gap-6 pb-24">
      
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg overflow-hidden gap-4"
      >
        {/* Tricolor top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background:
              "linear-gradient(90deg, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)",
          }}
        />

        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #FF9933, #FFFFFF, #138808)",
              }}
            >
              {firstName}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Here&apos;s a summary of your filed complaints and their current
            status.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            href="/submit"
            className="flex items-center gap-2 bg-[#FF9933]/10 hover:bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          >
            <PlusCircle size={16} />
            File a Complaint
          </Link>
          <Link
            href="/track"
            className="flex items-center gap-2 bg-[#138808]/10 hover:bg-[#138808]/20 text-emerald-400 border border-[#138808]/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          >
            <Search size={16} />
            Track by ID
          </Link>
        </div>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Filed"
          value={totalFromPagination}
          icon={Inbox}
          colorClass="bg-orange-500/10"
          borderClass="border-orange-500/20"
          textClass="text-orange-400"
          delay={0}
        />
        <StatCard
          label="Open / Pending"
          value={openCount + inProgressCount}
          icon={Clock}
          colorClass="bg-blue-500/10"
          borderClass="border-blue-500/20"
          textClass="text-blue-400"
          delay={0.08}
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={CheckCircle}
          colorClass="bg-emerald-500/10"
          borderClass="border-emerald-500/20"
          textClass="text-emerald-400"
          delay={0.16}
        />
        <StatCard
          label="Escalated"
          value={escalatedCount}
          icon={Zap}
          colorClass="bg-purple-500/10"
          borderClass="border-purple-500/20"
          textClass="text-purple-400"
          delay={0.24}
        />
      </div>

      {/* ── Recent Complaints ────────────────────────────────────────── */}
      <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileText size={16} className="text-[#FF9933]" />
              My Recent Complaints
            </CardTitle>
            <Link
              href="/complaints"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-slate-800/30 animate-pulse"
                />
              ))}
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm font-medium">
                No complaints filed yet
              </p>
              <p className="text-slate-600 text-xs max-w-xs">
                You haven&apos;t submitted any complaints. Use the button above
                to file your first one.
              </p>
              <Link
                href="/submit"
                className="mt-2 flex items-center gap-2 bg-[#FF9933]/10 hover:bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                <PlusCircle size={15} />
                File a Complaint
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5">
              {recentComplaints.map((complaint, i) => (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/60 hover:shadow-md transition-all duration-300 group cursor-pointer"
                >
                  {/* Status dot */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      complaint.status === "RESOLVED" ||
                      complaint.status === "CLOSED"
                        ? "bg-emerald-400"
                        : complaint.status === "ESCALATED"
                          ? "bg-purple-400 animate-pulse"
                          : complaint.status === "IN_PROGRESS" ||
                              complaint.status === "ASSIGNED"
                            ? "bg-amber-400"
                            : "bg-blue-400"
                    }`}
                  />

                  {/* Tracking ID + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 group-hover:text-blue-400 transition-colors truncate">
                      {complaint.trackingId}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {complaint.category ?? "Uncategorized"} ·{" "}
                      {complaint.department?.name ?? "Unassigned"}
                    </p>
                  </div>

                  {/* Status badge */}
                  <StatusBadge status={complaint.status} />

                  {/* Date */}
                  <span className="text-[11px] text-slate-500 hidden sm:block shrink-0">
                    {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>

                  {/* Arrow */}
                  <Link
                    href={`/complaints/${complaint.id}`}
                    className="shrink-0 text-slate-600 hover:text-blue-400 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Footer hint */}
          {recentComplaints.length > 0 && (
            <p className="text-[11px] text-slate-600 text-center mt-4">
              Showing {recentComplaints.length} of {totalFromPagination}{" "}
              complaint
              {totalFromPagination !== 1 ? "s" : ""} ·{" "}
              <Link
                href="/complaints"
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                view all
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Help Card ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Track by Tracking ID */}
        <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl hover:border-white/20 transition-all duration-500 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Search size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Track Your Complaint
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Use your Tracking ID (sent to your email) to check the live status
              without logging in.
            </p>
            <Link
              href="/track"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Go to tracker
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* File New */}
        <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl hover:border-white/20 transition-all duration-500 group">
          <div className="w-10 h-10 rounded-xl bg-[#FF9933]/10 border border-[#FF9933]/20 flex items-center justify-center shrink-0">
            <PlusCircle size={18} className="text-[#FF9933]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">
              File a New Complaint
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Submit a new grievance to your local authority. You&apos;ll
              receive a Tracking ID via email.
            </p>
            <Link
              href="/submit"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#FF9933] hover:text-orange-300 font-medium transition-colors"
            >
              Submit now
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
