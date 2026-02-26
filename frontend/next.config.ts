import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Setup API proxy to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/:path*`, 
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
