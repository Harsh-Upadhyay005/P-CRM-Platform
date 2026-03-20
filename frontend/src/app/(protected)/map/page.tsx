'use client';

import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { IndiaMapView } from '@/components/dashboard';
import { useRole } from '@/hooks/useRole';
import {
  ArrowUpRight,
  Download,
  Globe2,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';

type TimeWindow = 1 | 7 | 30;

type StateMetric = {
  id: string;
  name: string;
  complaints: number;
  resolved: number;
  pending: number;
  critical: number;
  assignedOpen: number;
  unassignedOpen: number;
  capacityStressPct: number;
  avgResolutionHours: number | null;
  slaBreachPct: number;
  changePct: number;
  anomalyScore: number;
  badges: string[];
  complaintShare: number;
  resolvedShare: number;
  riskScore: number;
  cities: { name: string; complaints: number }[];
  topCategories: { name: string; count: number }[];
  recentComplaints: {
    trackingId: string;
    createdAt: string;
    priority: string;
    status: string;
    category: string;
    locality?: string;
    excerpt: string;
  }[];
};

const WINDOWS: Array<{ label: string; value: TimeWindow }> = [
  { label: '24H', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
];

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
  const [windowDays, setWindowDays] = useState<TimeWindow>(7);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['analytics', 'map-command-center', windowDays],
    queryFn: () => analyticsApi.getMapStats(windowDays),
    staleTime: 60_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15_000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (!isTimelinePlaying) return;
    const points = data?.data?.timeline ?? [];
    if (points.length <= 1) return;
    const timer = setInterval(() => {
      setTimelineIndex((prev) => (prev + 1) % points.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [isTimelinePlaying, data?.data?.timeline]);

  const states = useMemo(() => data?.data?.states ?? [], [data?.data?.states]);

  const computed = useMemo(() => {
    const totalComplaints = states.reduce((sum, state) => sum + state.complaints, 0);

    const mapped: StateMetric[] = states.map((state) => {
      const complaintShare = totalComplaints > 0 ? (state.complaints / totalComplaints) * 100 : 0;
      const resolvedShare = state.complaints > 0 ? (state.resolved / state.complaints) * 100 : 0;
      const pendingShare = state.complaints > 0 ? (state.pending / state.complaints) * 100 : 0;
      const criticalShare = state.complaints > 0 ? (state.critical / state.complaints) * 100 : 0;
      const riskScore = pendingShare * 0.65 + criticalShare * 0.35;

      return {
        ...state,
        name: STATE_LABELS[state.id] ?? state.id,
        complaintShare,
        resolvedShare,
        riskScore,
      };
    });

    const filtered = mapped.filter((state) => state.complaints > 0);
    const byVolume = [...filtered].sort((a, b) => b.complaints - a.complaints);
    const byStress = [...filtered].sort((a, b) => b.capacityStressPct - a.capacityStressPct);
    const byAnomaly = [...filtered].sort((a, b) => b.anomalyScore - a.anomalyScore);

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

    return {
      totalComplaints,
      totalPending: filtered.reduce((sum, s) => sum + s.pending, 0),
      totalCritical: filtered.reduce((sum, s) => sum + s.critical, 0),
      totalResolved: filtered.reduce((sum, s) => sum + s.resolved, 0),
      filtered,
      byVolume,
      byStress,
      byAnomaly,
      topCities,
      activeStates: filtered.length,
    };
  }, [states]);

  const selectedState = useMemo(
    () => computed.filtered.find((state) => state.id === selectedStateId) ?? null,
    [computed.filtered, selectedStateId],
  );

  const timeline = data?.data?.timeline ?? [];
  const safeTimelineIndex = timeline.length > 0 ? timelineIndex % timeline.length : 0;
  const timelinePoint = timeline[safeTimelineIndex] ?? null;



  const exportFilteredView = () => {
    const rows = [
      ['State', 'Complaints', 'Pending', 'Resolved', 'Critical', 'Change %', 'Stress %', 'SLA Breach %', 'Risk Score'],
      ...computed.byVolume.map((state) => [
        state.name,
        state.complaints,
        state.pending,
        state.resolved,
        state.critical,
        state.changePct,
        state.capacityStressPct,
        state.slaBreachPct,
        state.riskScore.toFixed(2),
      ]),
    ];
    downloadCsv(`map-command-center-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const openComplaintsForState = (state: StateMetric) => {
    const params = new URLSearchParams();
    params.set('stateId', state.id);
    router.push(`/complaints?${params.toString()}`);
  };

  if (isCitizen) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-300">The map view is available for staff roles.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-24">
      <div className="relative flex flex-wrap items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)' }} />
        <div className="w-10 h-10 rounded-xl bg-[#FF9933]/10 flex items-center justify-center border border-[#FF9933]/20">
          <Globe2 size={20} className="text-[#FF9933]" />
        </div>
        <div className="flex-1 min-w-72">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)' }}>
            India Geo Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Time-window map intelligence with trend delta, anomaly flags, drill-down, and field-route planning.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            {WINDOWS.map((windowOption) => (
              <button
                key={windowOption.value}
                onClick={() => setWindowDays(windowOption.value)}
                className={`px-3 py-2 text-xs ${windowDays === windowOption.value ? 'bg-[#138808]/25 text-emerald-200' : 'bg-slate-900/50 text-slate-300'}`}
              >
                {windowOption.label}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/60 transition-colors" disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={exportFilteredView} className="inline-flex items-center gap-2 rounded-lg border border-[#138808]/30 bg-[#138808]/10 px-3 py-2 text-xs text-emerald-300 hover:bg-[#138808]/20 transition-colors">
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Complaints</p>
          <p className="text-2xl font-bold text-white mt-1">{computed.totalComplaints.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across {computed.activeStates} active states</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-300">Pending Queue</p>
          <p className="text-2xl font-bold text-amber-200 mt-1">{computed.totalPending.toLocaleString()}</p>
          <p className="text-[11px] text-amber-200/70 mt-1">{computed.totalComplaints > 0 ? `${((computed.totalPending / computed.totalComplaints) * 100).toFixed(1)}% of total` : '0.0% of total'}</p>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-red-300">Critical Exposure</p>
          <p className="text-2xl font-bold text-red-200 mt-1">{computed.totalCritical.toLocaleString()}</p>
          <p className="text-[11px] text-red-200/70 mt-1">{computed.totalComplaints > 0 ? `${((computed.totalCritical / computed.totalComplaints) * 100).toFixed(1)}% critical` : '0.0% critical'}</p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-cyan-300">Period Delta</p>
          <p className="text-2xl font-bold text-cyan-200 mt-1">{data?.data?.comparison?.deltaPct?.toFixed(1) ?? '0.0'}%</p>
          <p className="text-[11px] text-cyan-200/70 mt-1">vs previous {windowDays} days</p>
        </div>
      </div>

      <IndiaMapView
        visibleStateIds={computed.filtered.map((state) => state.id)}
        windowDays={windowDays}
        onStateSelect={(stateId) => setSelectedStateId(stateId)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">State Hotspot Ranking</h2>
            <span className="text-[11px] text-slate-500">{computed.filtered.length} states in current view</span>
          </div>
          {isLoading ? (
            <div className="h-56 rounded-xl bg-white/5 animate-pulse" />
          ) : computed.byVolume.length === 0 ? (
            <p className="text-sm text-slate-400">No states match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {computed.byVolume.slice(0, 10).map((state, index) => (
                <div key={state.id} className="rounded-lg border border-white/8 bg-slate-950/40 px-3 py-2 cursor-pointer hover:border-[#FF9933]/50" onClick={() => setSelectedStateId(state.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-slate-500 w-5">{String(index + 1).padStart(2, '0')}</span>
                      <p className="text-sm text-slate-200 truncate">{state.name}</p>
                    </div>
                    <div className={`text-[11px] font-mono ${state.changePct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {state.changePct >= 0 ? '+' : ''}{state.changePct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {state.badges.map((badge) => (
                      <span key={`${state.id}-${badge}`} className="text-[10px] rounded-full border border-red-300/30 bg-red-500/10 text-red-200 px-2 py-0.5">{badge}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Complaints {state.complaints}</span>
                    <span>SLA {state.slaBreachPct.toFixed(1)}%</span>
                    <span>Stress {state.capacityStressPct.toFixed(1)}%</span>
                    <span>Risk {state.riskScore.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">State Drill-Down</h2>
          {!selectedState ? (
            <p className="text-sm text-slate-400">Click any state in the map or ranking to view categories, SLA, recent complaints, and route cues.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-white font-semibold">{selectedState.name}</p>
                <p className="text-[11px] text-slate-400">Avg resolution: {selectedState.avgResolutionHours ?? 0}h | SLA breach: {selectedState.slaBreachPct.toFixed(1)}%</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selectedState.topCategories.slice(0, 4).map((category) => (
                  <div key={category.name} className="rounded bg-white/5 p-2 text-slate-300 flex items-center justify-between">
                    <span className="truncate">{category.name}</span>
                    <span className="font-mono text-[#FFB66B]">{category.count}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {selectedState.recentComplaints.slice(0, 3).map((complaint) => (
                  <div key={complaint.trackingId} className="rounded border border-white/10 bg-slate-950/45 p-2">
                    <p className="text-[11px] text-white font-mono">{complaint.trackingId}</p>
                    <p className="text-[11px] text-slate-300 truncate">{complaint.excerpt || complaint.category}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => openComplaintsForState(selectedState)} className="inline-flex items-center gap-1.5 text-xs text-[#FFB66B] hover:text-[#FFCC95]">
                Open state complaint queue <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Incident Timeline Playback</h2>
            <button onClick={() => setIsTimelinePlaying((prev) => !prev)} className="text-xs inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-slate-200">
              {isTimelinePlaying ? <Pause size={12} /> : <Play size={12} />}
              {isTimelinePlaying ? 'Pause' : 'Play'}
            </button>
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">No timeline points available for this period.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mb-2">{timelinePoint?.date}: {timelinePoint?.total ?? 0} total, {timelinePoint?.critical ?? 0} critical</p>
              <div className="flex items-end gap-1 h-24">
                {timeline.map((point, idx) => {
                  const max = Math.max(...timeline.map((p) => p.total), 1);
                  const h = Math.max((point.total / max) * 100, 6);
                  return (
                    <button
                      key={point.date}
                      onClick={() => setTimelineIndex(idx)}
                      className={`flex-1 rounded-t ${idx === safeTimelineIndex ? 'bg-[#FF9933]' : 'bg-slate-600/50'}`}
                      style={{ height: `${h}%` }}
                      title={`${point.date} - ${point.total}`}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Capacity Stress Overlay</h2>
          <div className="space-y-2">
            {computed.byStress.slice(0, 6).map((state) => (
              <div key={state.id} className="rounded-lg bg-slate-950/40 border border-white/8 px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{state.name}</span>
                  <span className="text-amber-200">{state.capacityStressPct.toFixed(1)}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Assigned {state.assignedOpen} | Unassigned {state.unassignedOpen}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Geo Anomaly Detection</h2>
          <div className="space-y-2">
            {(data?.data?.anomalyStates ?? []).slice(0, 6).map((state) => (
              <div key={state.id} className="rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-2">
                <p className="text-xs text-fuchsia-100">{STATE_LABELS[state.id] ?? state.id}</p>
                <p className="text-[11px] text-fuchsia-200/90">Anomaly {state.anomalyScore.toFixed(2)} | Change {state.changePct.toFixed(1)}%</p>
              </div>
            ))}
            {(data?.data?.anomalyStates ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No abnormal spikes detected in selected window.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Field Route Optimization Queue</h2>
          <div className="space-y-2">
            {(data?.data?.routePlan ?? []).slice(0, 8).map((city) => (
              <div key={city.city} className="flex items-center justify-between rounded-lg bg-slate-950/40 border border-white/8 px-3 py-2">
                <p className="text-sm text-slate-200">#{city.sequence} {city.city}</p>
                <p className="text-sm font-mono text-[#FFB66B]">{city.complaints}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Top Complaint Categories</h2>
          <div className="space-y-2">
            {computed.filtered
              .flatMap((state) =>
                state.topCategories.map((cat) => ({
                  name: cat.name,
                  count: cat.count,
                })),
              )
              .reduce((acc, item) => {
                const existing = acc.find((x) => x.name === item.name);
                if (existing) {
                  existing.count += item.count;
                } else {
                  acc.push(item);
                }
                return acc;
              }, [] as { name: string; count: number }[])
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((category) => {
                const pct = computed.totalComplaints > 0 ? (category.count / computed.totalComplaints) * 100 : 0;
                return (
                  <div key={category.name} className="rounded-lg border border-white/8 bg-slate-950/40 px-3 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-200 truncate">{category.name}</p>
                      <p className="text-xs font-mono text-[#FFB66B]">{category.count}</p>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[#FF9933] to-[#FFB66B] h-1.5 rounded-full"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
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
                <div key={`${entry.state}-${entry.city}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-950/40 border border-white/8 px-3 py-2">
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

        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Escalation Badges Summary</h2>
          <div className="space-y-2">
            {computed.byVolume.filter((state) => state.badges.length > 0).slice(0, 8).map((state) => (
              <div key={state.id} className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-100">{state.name}</p>
                  <p className="text-[11px] text-red-200 font-mono">{state.badges.length} badges</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {state.badges.map((badge) => (
                    <span key={`${state.id}-${badge}-summary`} className="text-[10px] rounded-full border border-red-300/30 bg-red-500/10 text-red-200 px-2 py-0.5">{badge}</span>
                  ))}
                </div>
              </div>
            ))}
            {computed.byVolume.filter((state) => state.badges.length > 0).length === 0 && (
              <p className="text-sm text-slate-400">No escalation badges currently active.</p>
            )}
          </div>
          <Link href="/complaints" className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#FFB66B] hover:text-[#FFCC95]">
            Open complaint queue
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
