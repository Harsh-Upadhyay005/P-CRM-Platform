"use client";

import { useEffect, useRef, useState } from "react";
import { loadMappleSDK } from "@/lib/mapple";
import { complaintsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface ComplaintMarker {
  id: string;
  trackingId: string;
  latitude: number;
  longitude: number;
  status: string;
  priority: string;
  locality: string;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "RESOLVED":    return "#10B981";
    case "CLOSED":      return "#6B7280";
    case "IN_PROGRESS": return "#3B82F6";
    case "ESCALATED":   return "#EF4444";
    case "ASSIGNED":    return "#F59E0B";
    case "OPEN":        return "#FBBF24";
    default:            return "#9CA3AF";
  }
}

// Build a plain data-URI SVG circle for each status color
function markerSvgUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="3"/><circle cx="14" cy="14" r="4" fill="white" opacity="0.8"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function DelhiDistrictMap({ containerId = "delhi-map-container" }: { containerId?: string } = {}) {
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const markersRef      = useRef<any[]>([]);
  const complaintsRef   = useRef<ComplaintMarker[]>([]);

  const [complaints,        setComplaints]        = useState<ComplaintMarker[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintMarker | null>(null);

  // Keep ref in sync so the map-ready callback always sees latest data
  useEffect(() => { complaintsRef.current = complaints; }, [complaints]);

  // ── 1. Fetch complaints ─────────────────────────────────────────────────
  useEffect(() => {
    complaintsApi.list({ page: 1, limit: 1000 })
      .then((response) => {
        if (response.success && response.data?.data) {
          const withLocation = response.data.data
            .filter((c: any) => c.latitude != null && c.longitude != null)
            .map((c: any) => ({
              id:        c.id,
              trackingId: c.trackingId,
              latitude:  Number(c.latitude),
              longitude: Number(c.longitude),
              status:    c.status,
              priority:  c.priority,
              locality:  c.locality || "Unknown location",
            }));
          setComplaints(withLocation);
        }
      })
      .catch((err) => console.error("[Map] fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── 2. Init map + place markers once both SDK and data are ready ─────────
  useEffect(() => {
    if (loading) return;         // wait for fetch to finish
    if (!mapRef.current) return;

    function placeMarkers(mappls: any, map: any, items: ComplaintMarker[]) {
      // Clear previous markers using the official Mappls.remove() API
      markersRef.current.forEach((m) => {
        try { mappls.remove({ map, layer: m }); } catch (_) { /* ignore */ }
      });
      markersRef.current = [];

      items.forEach((complaint) => {
        const color = getStatusColor(complaint.status);
        try {
          const marker = new mappls.Marker({
            map,
            position: { lat: complaint.latitude, lng: complaint.longitude },
            // Per official V3 docs: icon is a URL string; width/height are top-level
            icon:   markerSvgUrl(color),
            width:  28,
            height: 28,
            popupHtml: `<div style="font-size:12px;min-width:160px">
              <strong>${complaint.trackingId}</strong><br/>
              ${complaint.locality}<br/>
              <span style="color:${color};font-weight:bold">${complaint.status}</span>
            </div>`,
            popupOptions: true,
          });
          markersRef.current.push(marker);
        } catch (err) {
          console.error("[Map] Marker failed:", complaint.trackingId, err);
        }
      });

      console.log(`[Map] Placed ${markersRef.current.length} markers`);
    }

    loadMappleSDK()
      .then(() => {
        const mappls = (window as any).mappls;
        if (!mappls) { console.error("[Map] mappls global not found after SDK load"); return; }

        // If map already initialised (hot reload), reuse it
        if (mapInstanceRef.current) {
          placeMarkers(mappls, mapInstanceRef.current, complaintsRef.current);
          return;
        }

        const map = new mappls.Map(containerId, {
          center:      [28.6139, 77.2090],
          zoom:        11,
          zoomControl: true,
          hybrid:      false,
        });

        mapInstanceRef.current = map;

        // Try "load" event first; fall back to a 2-second timeout
        let placed = false;

        const tryPlace = () => {
          if (placed) return;
          placed = true;
          placeMarkers(mappls, map, complaintsRef.current);
        };

        try { map.on("load", tryPlace); } catch (_) { /* SDK may not support */ }
        // Guaranteed fallback — markers will appear even if "load" never fires
        setTimeout(tryPlace, 2000);
      })
      .catch((err) => console.error("[Map] SDK load failed:", err));

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove?.(); } catch (_) { /* ignore */ }
        mapInstanceRef.current = null;
      }
    };
    // Only run once after loading transitions to false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, containerId]);

  // ── 3. Re-place markers if complaints arrive after map is ready ──────────
  useEffect(() => {
    if (!mapInstanceRef.current || complaints.length === 0) return;
    const mappls = (window as any).mappls;
    if (!mappls) return;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => {
      try { mappls.remove({ map, layer: m }); } catch (_) { /* ignore */ }
    });
    markersRef.current = [];

    complaints.forEach((complaint) => {
      const color = getStatusColor(complaint.status);
      try {
        const marker = new mappls.Marker({
          map,
          position: { lat: complaint.latitude, lng: complaint.longitude },
          icon:   markerSvgUrl(color),
          width:  28,
          height: 28,
          popupHtml: `<div style="font-size:12px;min-width:160px">
            <strong>${complaint.trackingId}</strong><br/>
            ${complaint.locality}<br/>
            <span style="color:${color};font-weight:bold">${complaint.status}</span>
          </div>`,
          popupOptions: true,
        });
        markersRef.current.push(marker);
      } catch (err) {
        console.error("[Map] Marker failed:", complaint.trackingId, err);
      }
    });

    console.log(`[Map] Re-placed ${markersRef.current.length} markers after data update`);
  }, [complaints]);

  return (
    <div
      className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: "rgba(15,23,42,0.98)" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Delhi Complaints Map</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading ? "Loading..." : `${complaints.length} complaints with location data`}
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div
        id={containerId}
        ref={mapRef}
        style={{ width: "100%", height: "480px" }}
        className={loading ? "opacity-40" : "opacity-100"}
      />

      {/* Selected complaint panel */}
      {selectedComplaint && (
        <div className="absolute bottom-20 left-4 bg-slate-900/95 border border-white/10 rounded-xl p-4 min-w-64 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">{selectedComplaint.trackingId}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedComplaint.locality}</p>
            </div>
            <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="flex gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              selectedComplaint.status === "RESOLVED"    ? "bg-green-500/20 text-green-400" :
              selectedComplaint.status === "ESCALATED"   ? "bg-red-500/20 text-red-400" :
              selectedComplaint.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {selectedComplaint.status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              selectedComplaint.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
              selectedComplaint.priority === "HIGH"     ? "bg-orange-500/20 text-orange-400" :
              "bg-slate-500/20 text-slate-400"
            }`}>
              {selectedComplaint.priority}
            </span>
          </div>
          <Link href={`/complaints/${selectedComplaint.id}`}>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
              View Details →
            </button>
          </Link>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Status Legend</p>
        {[
          { color: "#10B981", label: "Resolved" },
          { color: "#3B82F6", label: "In Progress" },
          { color: "#EF4444", label: "Escalated" },
          { color: "#F59E0B", label: "Assigned" },
          { color: "#FBBF24", label: "Open" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
