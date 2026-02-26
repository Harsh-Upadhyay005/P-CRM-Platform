'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Sparkles } from '@react-three/drei';
import { BarChart3D } from '@/components/3d/BarChart3D';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface DashboardStats {
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
}

function DashboardScene({ stats }: { stats: DashboardStats | undefined }) {
  // Transform stats into bar chart data
  const data = useMemo(() => [
    { label: 'Open', value: stats?.open || 12, color: '#ef4444' }, // Red
    { label: 'In Progress', value: stats?.inProgress || 35, color: '#f59e0b' }, // Amber
    { label: 'Resolved', value: stats?.resolved || 42, color: '#10b981' }, // Emerald
    { label: 'Escalated', value: stats?.escalated || 5, color: '#a855f7' }, // Purple
  ], [stats]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <spotLight position={[-10, 10, -10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      
      <Environment preset="city" />
      
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
         <BarChart3D data={data} position={[0, -1, 0]} scale={[0.8, 0.8, 0.8]} />
      </Float>

      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
      <OrbitControls makeDefault enableZoom={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.8} />
      
      <Sparkles count={50} scale={6} size={2} speed={0.4} opacity={0.5} color="#4ade80" />
    </>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
        // Mock data fetch since backend might not be fully ready with endpoints
        // In production: const res = await complaintsApi.getStats(); return res;
        return { open: 12, inProgress: 8, resolved: 24, escalated: 2 }; 
    }
  });

  return (
    <div className="h-full w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Analytics Overview
        </h1>
        <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
                LIVE
            </span>
        </div>
      </div>

      <div className="relative w-full h-[500px] bg-slate-900/50 rounded-2xl border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm group">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
        
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <Canvas shadows camera={{ position: [0, 4, 8], fov: 45 }}>
            <Suspense fallback={null}>
              <DashboardScene stats={stats} />
            </Suspense>
          </Canvas>
        )}
        
        <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
            Interactive 3D View • Drag to Rotate
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats Cards (2D Overlay) */}
          <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1">
              <h3 className="text-slate-400 text-sm font-medium">Resolution Rate</h3>
              <p className="text-2xl font-bold text-white mt-1">87%</p>
              <div className="h-1 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[87%]" />
              </div>
          </div>
          
           <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5 hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <h3 className="text-slate-400 text-sm font-medium">Avg Response Time</h3>
              <p className="text-2xl font-bold text-white mt-1">2.4h</p>
               <div className="h-1 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[60%]" />
              </div>
          </div>
          
           <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5 hover:border-amber-500/30 transition-all hover:-translate-y-1">
              <h3 className="text-slate-400 text-sm font-medium">Pending High Priority</h3>
              <p className="text-2xl font-bold text-white mt-1">5</p>
               <div className="h-1 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[20%]" />
              </div>
          </div>
      </div>
    </div>
  );
}
