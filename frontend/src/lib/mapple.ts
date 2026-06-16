import react from "react";

export const loadMappleSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    
    // Already loaded
    if ((window as any).mappls) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://apis.mapmyindia.com/advancedmaps/v1/${process.env.NEXT_PUBLIC_MAPMYINDIA_API_KEY}/map_load?v=1.5`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mapple SDK load failed"));
    document.head.appendChild(script);
  });
};

