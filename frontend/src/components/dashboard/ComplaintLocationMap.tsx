'use client';

import { useEffect, useRef } from 'react';

interface ComplaintLocationMapProps {
  latitude: number;
  longitude: number;
  locality?: string | null;
  containerId?: string;
}

declare global {
  interface Window {
    mappls?: any;
    mappls_plugin?: any;
  }
}

export function ComplaintLocationMap({ 
  latitude, 
  longitude, 
  locality,
  containerId = 'complaint-location-map' 
}: ComplaintLocationMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;
    if (!apiKey) {
      console.error('Mappls API key not found');
      return;
    }

    const initMap = () => {
      if (!window.mappls || mapRef.current) return;

      try {
        // Initialize map centered on complaint location
        const map = new window.mappls.Map(containerId, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: true,
          location: true,
        });

        mapRef.current = map;

        // Add marker at complaint location
        if (window.mappls_plugin && window.mappls_plugin.marker) {
          const marker = new window.mappls_plugin.marker({
            map: map,
            position: [latitude, longitude],
            icon: {
              url: 'https://apis.mapmyindia.com/map_v3/1.png', // Red marker
              width: 30,
              height: 40,
            },
            popupHtml: `
              <div style="padding: 8px; min-width: 150px;">
                <strong style="color: #1e293b; font-size: 13px;">Complaint Location</strong>
                ${locality ? `<p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">${locality}</p>` : ''}
                <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">
                  ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                </p>
              </div>
            `,
            popupOptions: {
              openPopup: true,
              offset: [0, -20],
            },
          });

          markerRef.current = marker;
        }
      } catch (error) {
        console.error('Error initializing Mappls map:', error);
      }
    };

    // Load Mappls SDK if not already loaded
    if (!scriptLoaded.current && !window.mappls) {
      scriptLoaded.current = true;

      const script = document.createElement('script');
      script.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk?layer=vector&v=3.0&callback=initMapplsSDK`;
      script.async = true;
      script.defer = true;

      (window as any).initMapplsSDK = () => {
        // Load marker plugin
        const pluginScript = document.createElement('script');
        pluginScript.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk_plugins?v=3.0`;
        pluginScript.async = true;
        pluginScript.onload = () => {
          setTimeout(initMap, 100);
        };
        document.head.appendChild(pluginScript);
      };

      document.head.appendChild(script);
    } else if (window.mappls) {
      initMap();
    }

    return () => {
      // Cleanup
      if (markerRef.current && markerRef.current.remove) {
        markerRef.current.remove();
      }
      if (mapRef.current && mapRef.current.remove) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, locality, containerId]);

  return (
    <div className="space-y-3">
      <div 
        id={containerId}
        className="w-full h-64 rounded-lg border border-white/10 bg-slate-800/40"
      />
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>📍 Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</span>
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Open in Google Maps ↗
        </a>
      </div>
    </div>
  );
}
