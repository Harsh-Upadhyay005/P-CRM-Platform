'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { MapPin, TrendingUp, AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { geoMercator, geoPath } from 'd3-geo';
import indiaData from './india.json';

/* ─────────────────────────────────────────────────────────────
   India Map – SVG-based interactive choropleth
   Shows complaint density per state with government color palette
   ───────────────────────────────────────────────────────────── */

// ── State Data with complaint counts (demo data)
export interface StateData {
  id: string;
  name: string;
  complaints: number;
  resolved: number;
  pending: number;
  critical: number;
  cities: { name: string; complaints: number; lat: number; lng: number }[];
}

const INDIA_STATES: StateData[] = [
  { id: 'JK', name: 'Jammu & Kashmir', complaints: 342, resolved: 198, pending: 112, critical: 32, cities: [{ name: 'Srinagar', complaints: 189, lat: 34.08, lng: 74.79 }, { name: 'Jammu', complaints: 153, lat: 32.73, lng: 74.87 }] },
  { id: 'HP', name: 'Himachal Pradesh', complaints: 156, resolved: 120, pending: 28, critical: 8, cities: [{ name: 'Shimla', complaints: 89, lat: 31.1, lng: 77.17 }, { name: 'Dharamsala', complaints: 67, lat: 32.22, lng: 76.32 }] },
  { id: 'PB', name: 'Punjab', complaints: 512, resolved: 345, pending: 134, critical: 33, cities: [{ name: 'Chandigarh', complaints: 234, lat: 30.73, lng: 76.78 }, { name: 'Amritsar', complaints: 156, lat: 31.63, lng: 74.87 }, { name: 'Ludhiana', complaints: 122, lat: 30.9, lng: 75.85 }] },
  { id: 'UK', name: 'Uttarakhand', complaints: 198, resolved: 145, pending: 42, critical: 11, cities: [{ name: 'Dehradun', complaints: 112, lat: 30.32, lng: 78.03 }, { name: 'Haridwar', complaints: 86, lat: 29.95, lng: 78.16 }] },
  { id: 'HR', name: 'Haryana', complaints: 467, resolved: 312, pending: 120, critical: 35, cities: [{ name: 'Gurugram', complaints: 234, lat: 28.46, lng: 77.03 }, { name: 'Faridabad', complaints: 133, lat: 28.41, lng: 77.31 }] },
  { id: 'DL', name: 'Delhi', complaints: 1245, resolved: 789, pending: 356, critical: 100, cities: [{ name: 'New Delhi', complaints: 678, lat: 28.61, lng: 77.21 }, { name: 'Dwarka', complaints: 345, lat: 28.59, lng: 77.04 }, { name: 'Rohini', complaints: 222, lat: 28.74, lng: 77.11 }] },
  { id: 'RJ', name: 'Rajasthan', complaints: 678, resolved: 423, pending: 198, critical: 57, cities: [{ name: 'Jaipur', complaints: 312, lat: 26.92, lng: 75.79 }, { name: 'Jodhpur', complaints: 189, lat: 26.24, lng: 73.02 }, { name: 'Udaipur', complaints: 177, lat: 24.58, lng: 73.68 }] },
  { id: 'UP', name: 'Uttar Pradesh', complaints: 2340, resolved: 1245, pending: 834, critical: 261, cities: [{ name: 'Lucknow', complaints: 567, lat: 26.85, lng: 80.95 }, { name: 'Noida', complaints: 445, lat: 28.57, lng: 77.32 }, { name: 'Varanasi', complaints: 334, lat: 25.32, lng: 83.01 }, { name: 'Agra', complaints: 289, lat: 27.18, lng: 78.02 }] },
  { id: 'BR', name: 'Bihar', complaints: 1567, resolved: 678, pending: 667, critical: 222, cities: [{ name: 'Patna', complaints: 567, lat: 25.6, lng: 85.1 }, { name: 'Gaya', complaints: 345, lat: 24.8, lng: 85.0 }] },
  { id: 'SK', name: 'Sikkim', complaints: 45, resolved: 38, pending: 5, critical: 2, cities: [{ name: 'Gangtok', complaints: 45, lat: 27.33, lng: 88.62 }] },
  { id: 'AR', name: 'Arunachal Pradesh', complaints: 67, resolved: 45, pending: 18, critical: 4, cities: [{ name: 'Itanagar', complaints: 67, lat: 27.1, lng: 93.62 }] },
  { id: 'NL', name: 'Nagaland', complaints: 89, resolved: 56, pending: 28, critical: 5, cities: [{ name: 'Kohima', complaints: 48, lat: 25.67, lng: 94.11 }, { name: 'Dimapur', complaints: 41, lat: 25.91, lng: 93.73 }] },
  { id: 'MN', name: 'Manipur', complaints: 112, resolved: 67, pending: 37, critical: 8, cities: [{ name: 'Imphal', complaints: 112, lat: 24.82, lng: 93.95 }] },
  { id: 'MZ', name: 'Mizoram', complaints: 56, resolved: 42, pending: 12, critical: 2, cities: [{ name: 'Aizawl', complaints: 56, lat: 23.73, lng: 92.72 }] },
  { id: 'TR', name: 'Tripura', complaints: 98, resolved: 67, pending: 25, critical: 6, cities: [{ name: 'Agartala', complaints: 98, lat: 23.83, lng: 91.28 }] },
  { id: 'ML', name: 'Meghalaya', complaints: 78, resolved: 56, pending: 18, critical: 4, cities: [{ name: 'Shillong', complaints: 78, lat: 25.57, lng: 91.88 }] },
  { id: 'AS', name: 'Assam', complaints: 345, resolved: 212, pending: 102, critical: 31, cities: [{ name: 'Guwahati', complaints: 234, lat: 26.14, lng: 91.74 }, { name: 'Dibrugarh', complaints: 111, lat: 27.47, lng: 94.91 }] },
  { id: 'WB', name: 'West Bengal', complaints: 1123, resolved: 678, pending: 334, critical: 111, cities: [{ name: 'Kolkata', complaints: 678, lat: 22.57, lng: 88.36 }, { name: 'Siliguri', complaints: 234, lat: 26.71, lng: 88.43 }, { name: 'Durgapur', complaints: 211, lat: 23.55, lng: 87.32 }] },
  { id: 'JH', name: 'Jharkhand', complaints: 567, resolved: 312, pending: 198, critical: 57, cities: [{ name: 'Ranchi', complaints: 345, lat: 23.34, lng: 85.31 }, { name: 'Jamshedpur', complaints: 222, lat: 22.8, lng: 86.2 }] },
  { id: 'OD', name: 'Odisha', complaints: 456, resolved: 298, pending: 123, critical: 35, cities: [{ name: 'Bhubaneswar', complaints: 267, lat: 20.3, lng: 85.82 }, { name: 'Cuttack', complaints: 189, lat: 20.46, lng: 85.89 }] },
  { id: 'CT', name: 'Chhattisgarh', complaints: 389, resolved: 234, pending: 120, critical: 35, cities: [{ name: 'Raipur', complaints: 234, lat: 21.25, lng: 81.63 }, { name: 'Bilaspur', complaints: 155, lat: 22.08, lng: 82.15 }] },
  { id: 'MP', name: 'Madhya Pradesh', complaints: 789, resolved: 456, pending: 267, critical: 66, cities: [{ name: 'Bhopal', complaints: 345, lat: 23.26, lng: 77.41 }, { name: 'Indore', complaints: 289, lat: 22.72, lng: 75.86 }, { name: 'Jabalpur', complaints: 155, lat: 23.18, lng: 79.95 }] },
  { id: 'GJ', name: 'Gujarat', complaints: 678, resolved: 478, pending: 156, critical: 44, cities: [{ name: 'Ahmedabad', complaints: 345, lat: 23.02, lng: 72.57 }, { name: 'Surat', complaints: 189, lat: 21.17, lng: 72.83 }, { name: 'Vadodara', complaints: 144, lat: 22.31, lng: 73.19 }] },
  { id: 'MH', name: 'Maharashtra', complaints: 1890, resolved: 1123, pending: 567, critical: 200, cities: [{ name: 'Mumbai', complaints: 789, lat: 19.08, lng: 72.88 }, { name: 'Pune', complaints: 456, lat: 18.52, lng: 73.86 }, { name: 'Nagpur', complaints: 345, lat: 21.15, lng: 79.09 }, { name: 'Nashik', complaints: 300, lat: 20.0, lng: 73.79 }] },
  { id: 'GA', name: 'Goa', complaints: 89, resolved: 67, pending: 18, critical: 4, cities: [{ name: 'Panaji', complaints: 56, lat: 15.5, lng: 73.83 }, { name: 'Margao', complaints: 33, lat: 15.28, lng: 73.96 }] },
  { id: 'KA', name: 'Karnataka', complaints: 1234, resolved: 789, pending: 345, critical: 100, cities: [{ name: 'Bengaluru', complaints: 678, lat: 12.97, lng: 77.59 }, { name: 'Mysuru', complaints: 234, lat: 12.3, lng: 76.65 }, { name: 'Hubli', complaints: 178, lat: 15.36, lng: 75.12 }] },
  { id: 'KL', name: 'Kerala', complaints: 567, resolved: 423, pending: 112, critical: 32, cities: [{ name: 'Thiruvananthapuram', complaints: 234, lat: 8.52, lng: 76.94 }, { name: 'Kochi', complaints: 189, lat: 9.93, lng: 76.27 }, { name: 'Kozhikode', complaints: 144, lat: 11.25, lng: 75.77 }] },
  { id: 'TN', name: 'Tamil Nadu', complaints: 1456, resolved: 934, pending: 389, critical: 133, cities: [{ name: 'Chennai', complaints: 567, lat: 13.08, lng: 80.27 }, { name: 'Coimbatore', complaints: 345, lat: 11.02, lng: 76.96 }, { name: 'Madurai', complaints: 289, lat: 9.92, lng: 78.12 }] },
  { id: 'AP', name: 'Andhra Pradesh', complaints: 789, resolved: 456, pending: 267, critical: 66, cities: [{ name: 'Visakhapatnam', complaints: 345, lat: 17.69, lng: 83.22 }, { name: 'Vijayawada', complaints: 234, lat: 16.51, lng: 80.65 }, { name: 'Tirupati', complaints: 210, lat: 13.63, lng: 79.42 }] },
  { id: 'TS', name: 'Telangana', complaints: 1012, resolved: 678, pending: 256, critical: 78, cities: [{ name: 'Hyderabad', complaints: 678, lat: 17.38, lng: 78.49 }, { name: 'Warangal', complaints: 189, lat: 17.98, lng: 79.6 }, { name: 'Nizamabad', complaints: 145, lat: 18.67, lng: 78.09 }] },
  { id: 'LD', name: 'Lakshadweep', complaints: 12, resolved: 10, pending: 2, critical: 0, cities: [{ name: 'Kavaratti', complaints: 12, lat: 10.57, lng: 72.64 }] },
  { id: 'AN', name: 'Andaman & Nicobar', complaints: 34, resolved: 28, pending: 5, critical: 1, cities: [{ name: 'Port Blair', complaints: 34, lat: 11.67, lng: 92.74 }] },
  { id: 'LA', name: 'Ladakh', complaints: 23, resolved: 18, pending: 4, critical: 1, cities: [{ name: 'Leh', complaints: 23, lat: 34.15, lng: 77.58 }] },
  { id: 'PY', name: 'Puducherry', complaints: 67, resolved: 52, pending: 12, critical: 3, cities: [{ name: 'Puducherry', complaints: 67, lat: 11.93, lng: 79.83 }] },
  { id: 'CH', name: 'Chandigarh', complaints: 145, resolved: 112, pending: 28, critical: 5, cities: [{ name: 'Chandigarh', complaints: 145, lat: 30.73, lng: 76.78 }] },
  { id: 'DN', name: 'Dadra & Nagar Haveli', complaints: 34, resolved: 25, pending: 7, critical: 2, cities: [{ name: 'Silvassa', complaints: 34, lat: 20.27, lng: 73.01 }] },
  { id: 'DD', name: 'Daman & Diu', complaints: 28, resolved: 22, pending: 5, critical: 1, cities: [{ name: 'Daman', complaints: 28, lat: 20.41, lng: 72.85 }] },
];

// Heat color based on complaint count — green (low) → saffron (mid) → deep red (high)
function getHeatColor(complaints: number, max: number): string {
  const ratio = Math.min(complaints / max, 1);
  if (ratio < 0.2) return '#10B981';         // emerald – very low
  if (ratio < 0.35) return '#34D399';        // green
  if (ratio < 0.5) return '#FBBF24';         // amber
  if (ratio < 0.65) return '#F59E0B';        // orange-amber
  if (ratio < 0.8) return '#FF9933';         // saffron
  if (ratio < 0.9) return '#EF4444';         // red
  return '#DC2626';                           // deep red – critical
}

function getHeatOpacity(complaints: number, max: number): number {
  const ratio = Math.min(complaints / max, 1);
  return 0.35 + ratio * 0.55;
}

// ── SVG paths for Indian states using d3-geo and imported GeoJSON
const STATE_MAPPING: Record<string, string> = {
  'INAN': 'AN', // Andaman & Nicobar
  'INAP': 'AP', // Andhra Pradesh
  'INAR': 'AR', // Arunachal Pradesh
  'INAS': 'AS', // Assam
  'INBR': 'BR', // Bihar
  'INCH': 'CH', // Chandigarh
  'INCT': 'CT', // Chhattisgarh
  'INDH': 'DN', // Dādra and Nagar Haveli and Damān and Diu (Using DN, DD will be ignored/merged)
  'INDL': 'DL', // Delhi
  'INGA': 'GA', // Goa
  'INGJ': 'GJ', // Gujarat
  'INHR': 'HR', // Haryana
  'INHP': 'HP', // Himachal Pradesh
  'INJH': 'JH', // Jharkhand
  'INKA': 'KA', // Karnataka
  'INKL': 'KL', // Kerala
  'INLD': 'LD', // Lakshadweep
  'INMP': 'MP', // Madhya Pradesh
  'INMH': 'MH', // Maharashtra
  'INMN': 'MN', // Manipur
  'INML': 'ML', // Meghalaya
  'INMZ': 'MZ', // Mizoram
  'INNL': 'NL', // Nagaland
  'INOR': 'OD', // Odisha
  'INPY': 'PY', // Puducherry
  'INPB': 'PB', // Punjab
  'INRJ': 'RJ', // Rajasthan
  'INSK': 'SK', // Sikkim
  'INTN': 'TN', // Tamil Nadu
  'INTG': 'TS', // Telangana
  'INTR': 'TR', // Tripura
  'INUP': 'UP', // Uttar Pradesh
  'INUT': 'UK', // Uttarakhand
  'INWB': 'WB', // West Bengal
  'INJK': 'JK', // Jammu and Kashmir
  'INLA': 'LA', // Ladakh
};

// Create a projection fitting our 460x520 canvas
const projection = geoMercator().fitSize([460, 520], indiaData as unknown as GeoJSON.FeatureCollection);
const pathGenerator = geoPath().projection(projection);

const STATE_PATHS: Record<string, string> = {};
const STATE_CENTERS: Record<string, [number, number]> = {};

(indiaData as unknown as GeoJSON.FeatureCollection).features.forEach((feature: GeoJSON.Feature) => {
  const code = (feature.properties as Record<string, unknown>)?.id as string;
  const mappedId = STATE_MAPPING[code];
  if (mappedId) {
    STATE_PATHS[mappedId] = pathGenerator(feature) || '';
    const centroid = pathGenerator.centroid(feature);
    if (!Number.isNaN(centroid[0]) && !Number.isNaN(centroid[1])) {
      STATE_CENTERS[mappedId] = centroid as [number, number];
    }
  }
});

// ── Tooltip Component
function StateTooltip({ state, position }: { state: StateData; position: { x: number; y: number } }) {
  const resolvedPct = state.complaints > 0 ? Math.round((state.resolved / state.complaints) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 pointer-events-none"
      style={{ left: position.x + 15, top: position.y - 10 }}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl min-w-60">
        {/* State Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#FF9933]" />
          <h3 className="text-sm font-bold text-white">{state.name}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-white">{state.complaints.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Resolved</p>
            <p className="text-lg font-bold text-emerald-400">{resolvedPct}%</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pending</p>
            <p className="text-sm font-semibold text-amber-400">{state.pending.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Critical</p>
            <p className="text-sm font-semibold text-red-400">{state.critical.toLocaleString()}</p>
          </div>
        </div>

        {/* Top Cities */}
        <div className="border-t border-white/5 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Top Cities</p>
          {state.cities.slice(0, 3).map((city) => (
            <div key={city.name} className="flex items-center justify-between py-0.5">
              <span className="text-xs text-slate-300">{city.name}</span>
              <span className="text-xs font-mono text-[#FF9933]">{city.complaints}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Legend Component
function MapLegend() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-500 mr-1">Low</span>
      {['#10B981', '#34D399', '#FBBF24', '#F59E0B', '#FF9933', '#EF4444', '#DC2626'].map((c) => (
        <div key={c} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
      ))}
      <span className="text-[10px] text-slate-500 ml-1">High</span>
    </div>
  );
}

// ── Summary Stats Bar
function StatsSummary({ states }: { states: StateData[] }) {
  const total = states.reduce((s, st) => s + st.complaints, 0);
  const resolved = states.reduce((s, st) => s + st.resolved, 0);
  const critical = states.reduce((s, st) => s + st.critical, 0);
  const pending = states.reduce((s, st) => s + st.pending, 0);

  const items = [
    { label: 'Total Complaints', value: total.toLocaleString(), icon: MapPin, color: '#FF9933' },
    { label: 'Resolved', value: resolved.toLocaleString(), icon: TrendingUp, color: '#10B981' },
    { label: 'Pending', value: pending.toLocaleString(), icon: AlertTriangle, color: '#FBBF24' },
    { label: 'Critical', value: critical.toLocaleString(), icon: Shield, color: '#EF4444' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <item.icon size={12} style={{ color: item.color }} />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</span>
          </div>
          <p className="text-lg font-bold text-white font-mono">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Top States List
function TopStates({ states }: { states: StateData[] }) {
  const sorted = [...states].sort((a, b) => b.complaints - a.complaints).slice(0, 8);
  const max = sorted[0]?.complaints ?? 1;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <ChevronRight size={12} className="text-[#FF9933]" />
        Highest Complaint States
      </h4>
      {sorted.map((state, i) => {
        const pct = (state.complaints / max) * 100;
        const resolvedPct = state.complaints > 0 ? Math.round((state.resolved / state.complaints) * 100) : 0;
        return (
          <div key={state.id} className="state-bar-item group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600 w-4">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{state.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-emerald-400/70 font-mono">{resolvedPct}%</span>
                <span className="text-xs font-mono font-bold text-white">{state.complaints.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                style={{
                  background: `linear-gradient(90deg, ${getHeatColor(state.complaints, max)}, ${getHeatColor(state.complaints, max)}88)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function IndiaMapView() {
  const mapRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const maxComplaints = useMemo(
    () => Math.max(...INDIA_STATES.map((s) => s.complaints)),
    [],
  );

  // ── GSAP Entry Animation
  useEffect(() => {
    if (!mapRef.current) return;
    const paths = mapRef.current.querySelectorAll('.state-path');
    const statePulses = mapRef.current.querySelectorAll('.state-pulse');

    // Staggered state reveal
    gsap.fromTo(
      paths,
      { opacity: 0, scale: 0.8, transformOrigin: 'center center' },
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: { each: 0.03, from: 'center' },
        ease: 'power2.out',
      },
    );

    // State dots fade in with a bounce
    gsap.fromTo(
      statePulses,
      { opacity: 0, scale: 0, transformOrigin: 'center center' },
      { 
        opacity: 1, 
        scale: 1, 
        duration: 0.6, 
        stagger: 0.03, 
        delay: 0.5, 
        ease: 'back.out(2)' 
      },
    );
  }, []);

  // ── GSAP Pulse animation for state dots
  useEffect(() => {
    if (!mapRef.current) return;
    const pulseRings = mapRef.current.querySelectorAll('.pulse-ring-state');
    pulseRings.forEach((ring) => {
      // Base radius comes from the circle's initial r attribute
      const baseR = parseFloat(ring.getAttribute('r') || '2');
      
      gsap.to(ring, {
        attr: { r: baseR * 2.5 },
        opacity: 0,
        duration: 1.5 + Math.random() * 0.8,
        repeat: -1,
        ease: 'power2.out',
        delay: Math.random() * 1,
      });
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setHoveredState(stateId);
    },
    [],
  );

  const handleStateClick = useCallback((stateId: string) => {
    setSelectedState((prev) => (prev === stateId ? null : stateId));
  }, []);

  const hoveredData = INDIA_STATES.find((s) => s.id === hoveredState);
  const selectedData = INDIA_STATES.find((s) => s.id === selectedState);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)' }}>
      {/* Top gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #FF9933, #FFFFFF, #138808)' }} />

      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF9933]/10 flex items-center justify-center border border-[#FF9933]/20">
              <MapPin size={16} className="text-[#FF9933]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">India Complaint Density Map</h2>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
                State & City-wise Distribution • Live Overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <MapLegend />
            <div className="px-3 py-1.5 rounded-full bg-[#138808]/10 text-[#34D399] border border-[#138808]/20 text-[10px] font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              LIVE DATA
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── Map Area ── */}
          <div ref={containerRef} className="lg:col-span-8 relative">
            <div className="relative bg-slate-900/50 rounded-xl border border-white/5 p-4 overflow-hidden">
              {/* Background grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              <svg
                ref={mapRef}
                viewBox="0 0 460 520"
                className="w-full h-auto max-h-130"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Glow filter */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                  </filter>
                  {/* Radial gradient for selected state */}
                  <radialGradient id="selectedGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF9933" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FF9933" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* ── State Paths ── */}
                {INDIA_STATES.map((state) => {
                  const path = STATE_PATHS[state.id];
                  if (!path) return null;
                  const isHovered = hoveredState === state.id;
                  const isSelected = selectedState === state.id;
                  const color = getHeatColor(state.complaints, maxComplaints);
                  const opacity = getHeatOpacity(state.complaints, maxComplaints);

                  return (
                    <g key={state.id}>
                      <path
                        className="state-path"
                        d={path}
                        fill={color}
                        fillOpacity={isHovered || isSelected ? opacity + 0.2 : opacity}
                        stroke={isSelected ? '#FF9933' : isHovered ? '#fff' : 'rgba(255,255,255,0.15)'}
                        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                        style={{
                          cursor: 'pointer',
                          transition: 'fill-opacity 0.2s, stroke 0.2s, stroke-width 0.2s',
                          filter: isHovered || isSelected ? 'url(#glow)' : 'none',
                        }}
                        onMouseMove={(e) => handleMouseMove(e, state.id)}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => handleStateClick(state.id)}
                      />
                    </g>
                  );
                })}

                {/* ── City Markers & State Dots ── */}
                {INDIA_STATES.map((state) => {
                  const center = STATE_CENTERS[state.id];
                  if (!center) return null;
                  
                  const [cx, cy] = center;
                  
                  const isHovered = hoveredState === state.id;
                  const isSelected = selectedState === state.id;
                  const dotRadius = Math.max(1.5, Math.min((state.complaints / maxComplaints) * 8, 8)); // Scaled based on complaints
                  
                  return (
                    <g key={`dot-${state.id}`} className="state-pulse" style={{ pointerEvents: 'none' }}>
                      {state.complaints > 0 && (
                        <circle
                          className="pulse-ring-state"
                          cx={cx}
                          cy={cy}
                          r={dotRadius}
                          fill="none"
                          stroke="#FF9933"
                          strokeWidth={1}
                          opacity={0.6}
                        />
                      )}
                      {state.complaints > 0 && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered || isSelected ? dotRadius + 1 : dotRadius}
                          fill="#FF9933"
                          opacity={isHovered || isSelected ? 1 : 0.8}
                          style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', filter: (isHovered || isSelected) ? 'url(#glow)' : 'none' }}
                        />
                      )}
                      
                      {/* State abbreviation label */}
                      <text
                        x={cx}
                        y={cy + (state.complaints > 0 ? dotRadius + 6 : 0)}
                        textAnchor="middle"
                        fill="white"
                        fontSize="8"
                        fontWeight="600"
                        opacity={isHovered || isSelected ? 1 : 0.5}
                        style={{ pointerEvents: 'none', transition: 'opacity 0.2s', textShadow: '0px 0px 3px rgba(0,0,0,0.8)' }}
                      >
                        {state.id}
                      </text>

                      {(isHovered || isSelected) && state.complaints > 0 && (
                        <text
                          x={cx + dotRadius + 4}
                          y={cy + 3}
                          fill="#fff"
                          fontSize="8"
                          fontWeight="bold"
                          fontFamily="monospace"
                          style={{ textShadow: '0px 0px 4px rgba(0,0,0,0.8)' }}
                        >
                          {state.complaints}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredData && (
                  <StateTooltip state={hoveredData} position={tooltipPos} />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Side Panel ── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Selected State Detail */}
            <AnimatePresence mode="wait">
              {selectedData ? (
                <motion.div
                  key={selectedData.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/3 rounded-xl border border-white/5 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono text-white" style={{ background: getHeatColor(selectedData.complaints, maxComplaints) }}>
                      {selectedData.id}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedData.name}</h3>
                      <p className="text-[10px] text-slate-500">Detailed breakdown</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-white font-mono">{selectedData.complaints.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Total</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-400 font-mono">
                        {Math.round((selectedData.resolved / selectedData.complaints) * 100)}%
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase">Resolved</p>
                    </div>
                  </div>

                  {/* City breakdown */}
                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">City-wise Distribution</p>
                    {selectedData.cities.map((city) => {
                      const pct = (city.complaints / selectedData.complaints) * 100;
                      return (
                        <div key={city.name} className="mb-2">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs text-slate-300">{city.name}</span>
                            <span className="text-xs font-mono text-[#FF9933]">{city.complaints}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-linear-to-r from-[#FF9933] to-[#FF9933]/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/3 rounded-xl border border-white/5 p-4 flex items-center justify-center"
                >
                  <p className="text-xs text-slate-600 text-center py-4">
                    Click a state on the map<br />to view detailed breakdown
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top States List */}
            <div className="bg-white/3 rounded-xl border border-white/5 p-4 flex-1 overflow-auto">
              <TopStates states={INDIA_STATES} />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4">
          <StatsSummary states={INDIA_STATES} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
          Bharat Complaint Resolution System • State-wise Heatmap
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#FF9933]" />
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="w-1 h-1 rounded-full bg-[#138808]" />
        </div>
      </div>
    </div>
  );
}
