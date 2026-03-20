'use client';

import Link from 'next/link';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { IndiaMapView } from '@/components/dashboard';
import { useRole } from '@/hooks/useRole';
import {
  ArrowUpRight,
  Download,
  Globe2,
  RefreshCw,
} from 'lucide-react';

type StateMetric = {
  id: string;
  name: string;
  complaints: number;
  resolved: number;
  pending: number;
  critical: number;
  complaintShare: number;
  resolvedShare: number;
  riskScore: number;
  cities: { name: string; complaints: number }[];
};

const STATE_LABELS: Record<string, string> = {
  AN: 'Andaman & Nicobar',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DN: 'Dadra & Nagar Haveli / Daman & Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JH: 'Jharkhand',
  JK: 'Jammu & Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  TS: 'Telangana',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

function csvEscape(value: string | number): string {
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function MapPage() {
  const router = useRouter();
  const { isCitizen } = useRole();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['analytics', 'map-command-center'],
    queryFn: () => analyticsApi.getMapStats(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15_000);

    return () => clearInterval(interval);
  }, [refetch]);

  const states = useMemo(() => data?.data?.states ?? [], [data?.data?.states]);

  const computed = useMemo(() => {
    const totalComplaints = states.reduce((sum, state) => sum + state.complaints, 0);

    const mapped: StateMetric[] = states.map((state) => {
      const complaintShare =
        totalComplaints > 0 ? (state.complaints / totalComplaints) * 100 : 0;
      const resolvedShare =
        state.complaints > 0 ? (state.resolved / state.complaints) * 100 : 0;
      const pendingShare =
        state.complaints > 0 ? (state.pending / state.complaints) * 100 : 0;
      const criticalShare =
        state.complaints > 0 ? (state.critical / state.complaints) * 100 : 0;
      const riskScore = pendingShare * 0.65 + criticalShare * 0.35;

      return {
        id: state.id,
        name: STATE_LABELS[state.id] ?? state.id,
        complaints: state.complaints,
        resolved: state.resolved,
        pending: state.pending,
        critical: state.critical,
        complaintShare,
        resolvedShare,
        riskScore,
        cities: state.cities,
      };
    });

    const filtered = mapped.filter((state) => state.complaints > 0);

    const sorted = [...filtered].sort((a, b) => b.complaints - a.complaints);

    const totalPending = mapped.reduce((sum, state) => sum + state.pending, 0);
    const totalCritical = mapped.reduce((sum, state) => sum + state.critical, 0);
    const totalResolved = mapped.reduce((sum, state) => sum + state.resolved, 0);

    const topHotspots = sorted.slice(0, 8);

    const topCities = filtered
      .flatMap((state) =>
        state.cities.map((city) => ({
          city: city.name,
          state: state.name,
          complaints: city.complaints,
        })),
      )
      .sort((a, b) => b.complaints - a.complaints)
      .slice(0, 10);

    const alertStates = mapped
      .filter(
        (state) =>
          (state.complaints >= 5 && state.critical >= 2) ||
          state.pending >= 6 ||
          (state.complaints >= 4 && state.resolvedShare < 25),
      )
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    return {
      totalComplaints,
      totalPending,
      totalCritical,
      totalResolved,
      filtered,
      topHotspots,
      topCities,
      alertStates,
      sorted,
      activeStates: mapped.filter((state) => state.complaints > 0).length,
    };
  }, [states]);

  const exportFilteredView = () => {
    const rows = [
      [
        'State',
        'Complaints',
        'Pending',
        'Resolved',
        'Critical',
        'Complaint Share %',
        'Resolved Rate %',
        'Risk Score',
      ],
      ...computed.sorted.map((state) => [
        state.name,
        state.complaints,
        state.pending,
        state.resolved,
        state.critical,
        state.complaintShare.toFixed(2),
        state.resolvedShare.toFixed(2),
        state.riskScore.toFixed(2),
      ]),
    ];
    downloadCsv(
      `map-command-center-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  };

  const openComplaintsForState = (state: StateMetric) => {
    const params = new URLSearchParams();
    params.set('stateId', state.id);
    params.set('search', state.name);
    router.push(`/complaints?${params.toString()}`);
  };

  const getPrimaryMetric = (state: StateMetric) => {
    return { label: 'Complaints', value: state.complaints };
  };

  const maxPrimaryMetric = Math.max(
    ...computed.topHotspots.map((state) => getPrimaryMetric(state).value),
    1,
  );

  if (isCitizen) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-300">
          The map view is available for staff roles.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-24">
      <div className="relative flex flex-wrap items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background:
              'linear-gradient(90deg, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)',
          }}
        />
        <div className="w-10 h-10 rounded-xl bg-[#FF9933]/10 flex items-center justify-center border border-[#FF9933]/20">
          <Globe2 size={20} className="text-[#FF9933]" />
        </div>
        <div className="flex-1 min-w-66">
          <h1
            className="text-2xl font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)',
            }}
          >
            India Geo Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated operations map with hotspot intelligence, risk scoring, and region-level action cues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/60 transition-colors"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportFilteredView}
            className="inline-flex items-center gap-2 rounded-lg border border-[#138808]/30 bg-[#138808]/10 px-3 py-2 text-xs text-emerald-300 hover:bg-[#138808]/20 transition-colors"
          >
            <Download size={14} />
            Export View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Complaints</p>
          <p className="text-2xl font-bold text-white mt-1">{computed.totalComplaints.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across {computed.activeStates} active states</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-300">Pending Queue</p>
          <p className="text-2xl font-bold text-amber-200 mt-1">{computed.totalPending.toLocaleString()}</p>
          <p className="text-[11px] text-amber-200/70 mt-1">
            {computed.totalComplaints > 0
              ? `${((computed.totalPending / computed.totalComplaints) * 100).toFixed(1)}% of total`
              : '0.0% of total'}
          </p>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-red-300">Critical Exposure</p>
          <p className="text-2xl font-bold text-red-200 mt-1">{computed.totalCritical.toLocaleString()}</p>
          <p className="text-[11px] text-red-200/70 mt-1">
            {computed.totalComplaints > 0
              ? `${((computed.totalCritical / computed.totalComplaints) * 100).toFixed(1)}% critical`
              : '0.0% critical'}
          </p>
        </div>
      </div>

      <IndiaMapView visibleStateIds={computed.filtered.map((state) => state.id)} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">State Hotspot Ranking</h2>
            <span className="text-[11px] text-slate-500">{computed.filtered.length} states in current view</span>
          </div>
          {isLoading ? (
            <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
          ) : computed.topHotspots.length === 0 ? (
            <p className="text-sm text-slate-400">No states match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {computed.topHotspots.map((state, index) => (
                (() => {
                  const primary = getPrimaryMetric(state);
                  const barWidth = Math.min((primary.value / maxPrimaryMetric) * 100, 100);
                  return (
                <div
                  key={state.id}
                  className="rounded-lg border border-white/8 bg-slate-950/40 px-3 py-2 cursor-pointer hover:border-[#FF9933]/50"
                  onClick={() => openComplaintsForState(state)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-slate-500 w-5">{String(index + 1).padStart(2, '0')}</span>
                      <p className="text-sm text-slate-200 truncate">{state.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-mono">
                      <span className="text-slate-400">{primary.label}</span>
                      <span className="text-white font-semibold">
                        {primary.value}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#FF9933] to-[#EF4444]"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Pending {state.pending}</span>
                    <span>Critical {state.critical}</span>
                    <span>Resolved {state.resolvedShare.toFixed(1)}%</span>
                    <span>Risk {state.riskScore.toFixed(1)}</span>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Operational Alerts</h2>
          {isLoading ? (
            <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
          ) : computed.alertStates.length === 0 ? (
            <p className="text-sm text-slate-400">No high-risk state signals right now.</p>
          ) : (
            <div className="space-y-2.5">
              {computed.alertStates.map((state) => (
                <div
                  key={state.id}
                  className="rounded-lg border border-red-400/20 bg-red-500/5 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-red-100 font-medium truncate">{state.name}</p>
                    <span className="text-[11px] font-mono text-red-200">Risk {state.riskScore.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded bg-white/5 p-2 text-slate-300">Pending {state.pending}</div>
                    <div className="rounded bg-white/5 p-2 text-slate-300">Critical {state.critical}</div>
                    <div className="rounded bg-white/5 p-2 text-slate-300">Resolved {state.resolvedShare.toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/complaints"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#FFB66B] hover:text-[#FFCC95]"
          >
            Open complaint queue
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Top Cities By Volume</h2>
          {isLoading ? (
            <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
          ) : computed.topCities.length === 0 ? (
            <p className="text-sm text-slate-400">No city-level entries available.</p>
          ) : (
            <div className="space-y-2">
              {computed.topCities.map((entry, index) => (
                <div
                  key={`${entry.state}-${entry.city}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-slate-950/40 border border-white/8 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-slate-200">{entry.city}</p>
                    <p className="text-[11px] text-slate-500">{entry.state}</p>
                  </div>
                  <p className="text-sm font-mono text-[#FFB66B]">{entry.complaints}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}