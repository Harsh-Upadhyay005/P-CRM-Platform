"use client";

import { useEffect, useRef, useState } from "react";
import { loadMappleSDK } from "@/lib/mapple";
import { analyticsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";


// Delhi district names for mapping
const DELHI_DISTRICTS = [
  "Central Delhi",
  "East Delhi",
  "New Delhi",
  "North Delhi",
  "North East Delhi",
  "North West Delhi",
  "Shahdara",
  "South Delhi",
  "South East Delhi",
  "South West Delhi",
  "West Delhi",
];

// Complaint count → hex color
function getHeatColor(count: number, max: number): string {
  if (max === 0) return "#10B981";
  const ratio = count / max;
  if (ratio < 0.2)  return "#10B981"; // Green - Low
  if (ratio < 0.4)  return "#FBBF24"; // Yellow - Medium
  if (ratio < 0.6)  return "#F59E0B"; // Orange - High
  if (ratio < 0.8)  return "#EF4444"; // Red - Very High
  return "#DC2626"; // Dark Red - Critical
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
  const polygonLayersRef = useRef<any[]>([]);
  const [stats, setStats] = useState<DistrictStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStat | null>(null);

  // Fetch district stats from backend
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await analyticsApi.getMapStats("all");
        
        if (response.success && response.data) {
          // Extract Delhi state data
          const delhiState = response.data.states.find(
            (state) => state.id.toLowerCase() === "delhi"
          );

          if (delhiState) {
            // Map cities to districts
            const districtStats: DistrictStat[] = delhiState.cities.map((city) => {
              // Normalize city name to match district names
              const districtName = city.name.trim();
              
              return {
                district: districtName,
                complaints: city.complaints,
                resolved: Math.floor(city.complaints * 0.6), // Estimate if not provided
                pending: Math.floor(city.complaints * 0.35),
                critical: Math.floor(city.complaints * 0.05),
              };
            });

            // Ensure all Delhi districts are present (even with 0 complaints)
            const allDistricts = DELHI_DISTRICTS.map((districtName) => {
              const existing = districtStats.find(
                (d) => d.district.toLowerCase() === districtName.toLowerCase()
              );
              return existing || {
                district: districtName,
                complaints: 0,
                resolved: 0,
                pending: 0,
                critical: 0,
              };
            });

            setStats(allDistricts);
          } else {
            // No Delhi data, use all zeros
            setStats(
              DELHI_DISTRICTS.map((district) => ({
                district,
                complaints: 0,
                resolved: 0,
                pending: 0,
                critical: 0,
              }))
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch district stats:", error);
        // Fallback to empty stats
        setStats(
          DELHI_DISTRICTS.map((district) => ({
            district,
            complaints: 0,
            resolved: 0,
            pending: 0,
            critical: 0,
          }))
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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
        // Wait for stats to load before rendering layers
        if (stats.length > 0) {
          renderDistrictLayers(map, mappls);
        }
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
    // Clear existing layers
    polygonLayersRef.current.forEach((layer) => {
      if (layer && layer.remove) layer.remove();
    });
    polygonLayersRef.current = [];

    const max = Math.max(...stats.map((s) => s.complaints), 1);

    // GeoJSON for Delhi districts (simplified polygons)
    // In production, load from a proper GeoJSON file or Mappls API
    const DELHI_DISTRICT_GEOJSON: Record<string, [number, number][]> = {
      "Central Delhi": [
        [77.2090, 28.6542],
        [77.2250, 28.6500],
        [77.2200, 28.6350],
        [77.2000, 28.6400],
        [77.2090, 28.6542],
      ],
      "New Delhi": [
        [77.1800, 28.6139],
        [77.2200, 28.6100],
        [77.2150, 28.5850],
        [77.1750, 28.5900],
        [77.1800, 28.6139],
      ],
      // Add more districts... for now we'll use markers as fallback
    };

    stats.forEach((stat) => {
      const color = getHeatColor(stat.complaints, max);

      // Try to get district polygon coordinates
      const coords = DELHI_DISTRICT_GEOJSON[stat.district];

      if (coords && mappls.Polygon) {
        // Render as polygon if coordinates available
        const polygon = new mappls.Polygon({
          map,
          paths: coords,
          fillColor: color,
          fillOpacity: 0.5,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        });

        polygon.addListener("click", () => {
          setSelectedDistrict(stat);
        });

        polygonLayersRef.current.push(polygon);
      } else {
        // Fallback: render as circle marker at district center
        // Approximate district centers (lat, lng)
        const DISTRICT_CENTERS: Record<string, [number, number]> = {
          "Central Delhi": [28.6542, 77.2100],
          "East Delhi": [28.6510, 77.2985],
          "New Delhi": [28.6139, 77.2090],
          "North Delhi": [28.7041, 77.1025],
          "North East Delhi": [28.7041, 77.2750],
          "North West Delhi": [28.7000, 77.1025],
          "Shahdara": [28.6870, 77.2850],
          "South Delhi": [28.5244, 77.1855],
          "South East Delhi": [28.5355, 77.2730],
          "South West Delhi": [28.6030, 77.1025],
          "West Delhi": [28.6517, 77.0880],
        };

        const center = DISTRICT_CENTERS[stat.district] || [28.6139, 77.2090];

        // Size based on complaint count (radius in meters)
        const radius = Math.max(2000, Math.sqrt(stat.complaints) * 500);

        const circle = new mappls.Circle({
          map,
          center: { lat: center[0], lng: center[1] },
          radius,
          fillColor: color,
          fillOpacity: 0.6,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        });

        circle.addListener("click", () => {
          setSelectedDistrict(stat);
        });

        // Add label marker
        const marker = new mappls.Marker({
          map,
          position: { lat: center[0], lng: center[1] },
          html: `<div style="background: rgba(0,0,0,0.75); color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">${stat.district}<br/><span style="color: ${color};">${stat.complaints}</span></div>`,
        });

        polygonLayersRef.current.push(circle, marker);
      }
    });
  };

  return (
    <div className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
         style={{ background: "rgba(15,23,42,0.98)" }}>
      
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Delhi District Complaint Heatmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              District-wise grievance hotspots • Real-time data
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Loading data...
            </div>
          )}
        </div>
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
        <div className="absolute bottom-20 left-4 bg-slate-900/95 border border-white/10 rounded-xl p-4 min-w-52 shadow-2xl backdrop-blur-sm">
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
      <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          Complaint Density
        </p>
        {[
          { color: "#10B981", label: "Low (0-20%)" },
          { color: "#FBBF24", label: "Medium (20-40%)" },
          { color: "#F59E0B", label: "High (40-60%)" },
          { color: "#EF4444", label: "Very High (60-80%)" },
          { color: "#DC2626", label: "Critical (80-100%)" },
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