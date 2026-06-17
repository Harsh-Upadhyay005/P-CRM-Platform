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

// Status → color mapping
function getStatusColor(status: string): string {
  switch (status) {
    case "RESOLVED": return "#10B981"; // Green
    case "CLOSED": return "#6B7280"; // Gray
    case "IN_PROGRESS": return "#3B82F6"; // Blue
    case "ESCALATED": return "#EF4444"; // Red
    case "ASSIGNED": return "#F59E0B"; // Orange
    case "OPEN": return "#FBBF24"; // Yellow
    default: return "#9CA3AF"; // Gray
  }
}

export function DelhiDistrictMap({ containerId = "delhi-map-container" }: { containerId?: string } = {}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [complaints, setComplaints] = useState<ComplaintMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintMarker | null>(null);

  // Fetch complaints with location data
  useEffect(() => {
    async function fetchComplaints() {
      try {
        const response = await complaintsApi.list({ page: 1, limit: 1000 });
        
        if (response.success && response.data?.data) {
          // Filter complaints that have latitude/longitude
          const withLocation = response.data.data
            .filter((c: any) => c.latitude && c.longitude)
            .map((c: any) => ({
              id: c.id,
              trackingId: c.trackingId,
              latitude: c.latitude,
              longitude: c.longitude,
              status: c.status,
              priority: c.priority,
              locality: c.locality || "Unknown location",
            }));

          setComplaints(withLocation);
        }
      } catch (error) {
        console.error("Failed to fetch complaints:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComplaints();
  }, []);

  // Init map and add markers
  useEffect(() => {
    if (!mapRef.current || loading) return;

    loadMappleSDK().then(() => {
      const mappls = (window as any).mappls;

      // Center on Delhi
      const map = new mappls.Map(containerId, {
        center: [28.6139, 77.2090],
        zoom: 11,
        zoomControl: true,
        hybrid: false,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        // Clear existing markers
        markersRef.current.forEach((marker) => {
          if (marker && marker.remove) marker.remove();
        });
        markersRef.current = [];

        // Add marker for each complaint (only if we have complaints)
        if (complaints.length > 0) {
          complaints.forEach((complaint) => {
            const color = getStatusColor(complaint.status);
            
            const marker = new mappls.Marker({
              map,
              position: { lat: complaint.latitude, lng: complaint.longitude },
              icon: {
                html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
              },
            });

            marker.addListener("click", () => {
              setSelectedComplaint(complaint);
            });

            markersRef.current.push(marker);
          });
        }
      });
    });

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove?.();
      }
    };
  }, [complaints, containerId, loading]);

  return (
    <div className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
         style={{ background: "rgba(15,23,42,0.98)" }}>
      
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Delhi Complaints Map
            </h2>
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

      {/* Map Container */}
      <div
        id={containerId}
        ref={mapRef}
        style={{ width: "100%", height: "480px" }}
        className={loading ? "opacity-40" : "opacity-100"}
      />

      {/* Selected Complaint Panel */}
      {selectedComplaint && (
        <div className="absolute bottom-20 left-4 bg-slate-900/95 border border-white/10 rounded-xl p-4 min-w-64 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                {selectedComplaint.trackingId}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedComplaint.locality}
              </p>
            </div>
            <button
              onClick={() => setSelectedComplaint(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              selectedComplaint.status === "RESOLVED" ? "bg-green-500/20 text-green-400" :
              selectedComplaint.status === "ESCALATED" ? "bg-red-500/20 text-red-400" :
              selectedComplaint.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {selectedComplaint.status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              selectedComplaint.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
              selectedComplaint.priority === "HIGH" ? "bg-orange-500/20 text-orange-400" :
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
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          Status Legend
        </p>
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