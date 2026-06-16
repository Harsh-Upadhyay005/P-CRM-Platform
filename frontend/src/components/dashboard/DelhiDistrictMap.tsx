"use client";

import { useEffect, useRef, useState } from "react";
import { loadMappleSDK } from "@/lib/mapple";
import { analyticsApi } from "@/lib/api";


// District name → Mapple region code mapping
const DELHI_DISTRICT_CODES: Record<string, string> = {
  "Central Delhi":    "DL-C",
  "East Delhi":       "DL-E",
  "New Delhi":        "DL-ND",
  "North Delhi":      "DL-N",
  "North East Delhi": "DL-NE",
  "North West Delhi": "DL-NW",
  "Shahdara":         "DL-SH",
  "South Delhi":      "DL-S",
  "South East Delhi": "DL-SE",
  "South West Delhi": "DL-SW",
  "West Delhi":       "DL-W",
};

// Complaint count → hex color
function getHeatColor(count: number, max: number): string {
  if (max === 0) return "#10B981";
  const ratio = count / max;
  if (ratio < 0.2)  return "#10B981";
  if (ratio < 0.4)  return "#FBBF24";
  if (ratio < 0.6)  return "#F59E0B";
  if (ratio < 0.8)  return "#EF4444";
  return "#DC2626";
}

interface DistrictStat {
  district: string;
  complaints: number;
  resolved: number;
  pending: number;
  critical: number;
}

export function DelhiDistrictMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [stats, setStats] = useState<DistrictStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStat | null>(null);

  // Fetch district stats from your backend
  useEffect(() => {
    analyticsApi.getDistrictStats()
      .then((res) => setStats(res.data.districts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current) return;

    loadMappleSDK().then(() => {
      const mappls = (window as any).mappls;

      // Center on Delhi
      const map = new mappls.Map("delhi-map-container", {
        center: [28.6139, 77.2090],
        zoom: 10,
        zoomControl: true,
        hybrid: false,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        renderDistrictLayers(map, mappls);
      });
    });

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove?.();
      }
    };
  }, []);

  // Re-render layers when stats load
  useEffect(() => {
    if (!mapInstanceRef.current || stats.length === 0) return;
    const mappls = (window as any).mappls;
    renderDistrictLayers(mapInstanceRef.current, mappls);
  }, [stats]);

  const renderDistrictLayers = (map: any, mappls: any) => {
    const max = Math.max(...stats.map((s) => s.complaints), 1);

    stats.forEach((stat) => {
      const color = getHeatColor(stat.complaints, max);

      // Mapple district boundary layer
      // Uses their built-in administrative boundary API
      mappls.districtLayer({
        map,
        districtName: stat.district,
        fillColor: color,
        fillOpacity: 0.65,
        strokeColor: "#ffffff",
        strokeWidth: 1.5,
        onClick: () => setSelectedDistrict(stat),
        tooltip: `
          <div style="padding:8px;font-family:sans-serif">
            <b>${stat.district}</b><br/>
            Total: ${stat.complaints}<br/>
            Resolved: ${stat.resolved}<br/>
            Pending: ${stat.pending}
          </div>
        `,
      });
    });
  };

  return (
    <div className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
         style={{ background: "rgba(15,23,42,0.98)" }}>
      
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-base font-bold text-white">
          Delhi District Complaint Map
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          District-wise grievance density • Live
        </p>
      </div>

      {/* Map Container */}
      <div
        id="delhi-map-container"
        ref={mapRef}
        style={{ width: "100%", height: "480px" }}
        className={loading ? "opacity-40" : "opacity-100"}
      />

      {/* Selected District Panel */}
      {selectedDistrict && (
        <div className="absolute bottom-20 left-4 bg-slate-900/95 border border-white/10 rounded-xl p-4 min-w-52">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-bold text-white">
              {selectedDistrict.district}
            </h3>
            <button
              onClick={() => setSelectedDistrict(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total",    value: selectedDistrict.complaints, color: "text-white" },
              { label: "Resolved", value: selectedDistrict.resolved,   color: "text-emerald-400" },
              { label: "Pending",  value: selectedDistrict.pending,    color: "text-amber-400" },
              { label: "Critical", value: selectedDistrict.critical,   color: "text-red-400" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-lg p-2 text-center">
                <p className={`text-base font-bold font-mono ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-white/10 rounded-lg p-3">
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          Complaint Density
        </p>
        {[
          { color: "#10B981", label: "Low" },
          { color: "#FBBF24", label: "Medium" },
          { color: "#F59E0B", label: "High" },
          { color: "#EF4444", label: "Very High" },
          { color: "#DC2626", label: "Critical" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}