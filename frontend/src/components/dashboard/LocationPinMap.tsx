"use client";

import { useEffect, useRef, useState } from "react";
import { loadMappleSDK } from "@/lib/mapple";
import { Loader2, MapPin, X } from "lucide-react";

interface PinLocation {
  lat: number;
  lng: number;
  address: string;
  district: string;
  pincode: string;
}

interface LocationPinMapProps {
  onLocationSelect: (loc: PinLocation) => void;
  onClose: () => void;
}

export function LocationPinMap({ onLocationSelect, onClose }: LocationPinMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<PinLocation | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  useEffect(() => {
    loadMappleSDK().then(() => {
      const mappls = (window as any).mappls;

      const map = new mappls.Map("pin-drop-map", {
        center: [28.6139, 77.2090], // Delhi center
        zoom: 12,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        setLoading(false);

        // Click on map to drop pin
        map.on("click", async (e: any) => {
          const { lat, lng } = e.lngLat
            ? { lat: e.lngLat.lat, lng: e.lngLat.lng }
            : { lat: e.lat, lng: e.lng };

          // Remove old marker
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Add new marker
          markerRef.current = new mappls.Marker({
            map,
            position: { lat, lng },
            draggable: true,
          });

          // On marker drag end — reverse geocode again
          markerRef.current.on("dragend", async () => {
            const pos = markerRef.current.getPosition();
            await reverseGeocode(pos.lat, pos.lng);
          });

          await reverseGeocode(lat, lng);
        });
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove?.();
      }
    };
  }, []);

  // Reverse geocode using Mapple REST API
  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://apis.mapmyindia.com/advancedmaps/v1/${process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY}/rev_geocode?lat=${lat}&lng=${lng}`
      );
      const data = await res.json();
      const result = data?.results?.[0];

      const loc: PinLocation = {
        lat,
        lng,
        address: result?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        district: result?.district ?? "",
        pincode: result?.pincode ?? "",
      };

      setSelectedLoc(loc);
    } catch {
      // Fallback — just use coordinates
      setSelectedLoc({
        lat,
        lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        district: "",
        pincode: "",
      });
    } finally {
      setReverseLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLoc) {
      onLocationSelect(selectedLoc);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-white">
              Pin your exact location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Map */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          )}
          <div
            id="pin-drop-map"
            ref={mapRef}
            style={{ width: "100%", height: "380px" }}
          />
        </div>

        {/* Bottom Panel */}
        <div className="px-5 py-4 border-t border-white/5">
          {!selectedLoc && !reverseLoading && (
            <p className="text-xs text-slate-500 text-center py-1">
              👆 Click anywhere on the map to drop a pin
            </p>
          )}

          {reverseLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" />
              Fetching address…
            </div>
          )}

          {selectedLoc && !reverseLoading && (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400 mb-0.5">
                  📍 {selectedLoc.district || "Location selected"}
                  {selectedLoc.pincode && (
                    <span className="text-slate-500 ml-1">· {selectedLoc.pincode}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {selectedLoc.address}
                </p>
                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                  {selectedLoc.lat.toFixed(5)}, {selectedLoc.lng.toFixed(5)}
                </p>
              </div>
              <button
                onClick={handleConfirm}
                className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Confirm Location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}