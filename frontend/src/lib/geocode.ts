export interface LocationData {
    lat: number;
    lng: number;
    address: string;       
    district: string;      // e.g. "South Delhi"
    pincode: string;
    state: string;
  }
  
  // Step 1 — get coordinates from browser
  export function getBrowserLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,   // uses GPS on mobile, not just WiFi
        timeout: 10000,
        maximumAge: 0,              // never use a cached stale position
      });
    });
  }
  
  // Step 2 — reverse geocode via Nominatim (free, no key)
  export async function reverseGeocode(lat: number, lng: number): Promise<LocationData> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          // Nominatim ToS requires a real User-Agent identifying your app
          "User-Agent": "P-CRM-Platform/1.0 (contact@youroffice.gov.in)",
        },
      }
    );
  
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
  
    const addr = data.address ?? {};
  
    return {
      lat,
      lng,
      address: data.display_name ?? "",
      // Nominatim returns different keys for different areas — cover all cases
      district:
        addr.city_district ??
        addr.suburb ??
        addr.county ??
        addr.district ??
        "",
      pincode: addr.postcode ?? "",
      state:   addr.state ?? "",
    };
  }
  
  // Combined helper — call this from the form
  export async function detectAndGeocodeLocation(): Promise<LocationData> {
    const pos = await getBrowserLocation();
    return reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  }