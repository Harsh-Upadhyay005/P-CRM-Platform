import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix: Turbopack infers the wrong workspace root when there are multiple
  // lock files (backend + frontend). Point it explicitly to this directory.
  turbopack: {
    root: process.cwd(),
  },
  // Proxy all /api/v1/* requests to the backend server.
  // In production set BACKEND_URL=https://your-backend.onrender.com in Vercel env vars.
  // This transparent proxy also forwards the Cookie header, so the accessToken
  // set on the frontend domain is automatically sent to the backend on every request.
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
