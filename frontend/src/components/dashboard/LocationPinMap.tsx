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
  const [detecting, setDetecting] = useState(false);

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

          await dropPinAndGeocode(lat, lng);
        });
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove?.();
      }
    };
  }, []);

  // Drop pin at location and geocode
  const dropPinAndGeocode = async (lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    const mappls = (window as any).mappls;

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

    // Center map on pin
    map.setCenter({ lat, lng });
    map.setZoom(15);

    await reverseGeocode(lat, lng);
  };

  // Detect user's current location
  const detectMyLocation = () => {
    setDetecting(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        await dropPinAndGeocode(lat, lng);
        setDetecting(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Could not detect your location.";
        if (error.code === 1) {
          message = "Location permission denied. Please enable location access.";
        } else if (error.code === 2) {
          message = "Location unavailable. Please try again.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }
        alert(message);
        setDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Reverse geocode using Mapple REST API
  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const key = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;
      const res = await fetch(
        `https://search.mappls.com/search/address/rev-geocode?lat=${lat}&lng=${lng}&access_token=${key}`
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
          <div className="flex items-center gap-2">
            <button
              onClick={detectMyLocation}
              disabled={detecting || loading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              {detecting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  📍 Detect My Location
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
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
              📍 Click "Detect My Location" or click anywhere on the map to drop a pin
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