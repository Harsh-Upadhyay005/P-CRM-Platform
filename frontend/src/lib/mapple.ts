export const loadMappleSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;

    // Already loaded
    if ((window as any).mappls) {
      resolve();
      return;
    }

    const key = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;
    if (!key) {
      reject(new Error("NEXT_PUBLIC_MAPPLS_API_KEY is not set"));
      return;
    }

    const script = document.createElement("script");
    // New SDK URL format (post August 2025 auth update)
    script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${key}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mappls SDK load failed"));
    document.head.appendChild(script);
  });
};
