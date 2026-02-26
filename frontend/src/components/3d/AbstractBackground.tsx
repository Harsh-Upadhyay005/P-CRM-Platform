'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';

function NetworkParticles(props: React.ComponentProps<'group'>) {
  const count = 300; // Number of nodes
  const ref = useRef<THREE.Group>(null!);
  
  // Generate random positions for particles
  // Seed-based deterministic random to avoid React compiler warnings
  const [positions, connections] = useMemo(() => {
    // Using a simple LCG PRNG inside useMemo for deterministic positions
    const state = { seed: 42 };
    const seededRandom = () => {
      state.seed = (state.seed * 16807 + 0) % 2147483647;
      return (state.seed - 1) / 2147483646;
    };

    const pos = new Float32Array(count * 3);
    const conn: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
        const r = 15 * Math.cbrt(seededRandom());
        const theta = seededRandom() * 2 * Math.PI;
        const phi = Math.acos(2 * seededRandom() - 1);
        
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
    }

    for (let i = 0; i < count; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        
        if (seededRandom() > 0.5) { 
             const j = Math.floor(seededRandom() * count);
             conn.push(new THREE.Vector3(x, y, z));
             conn.push(new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]));
        }
    }

    return [pos, conn];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
        // Slow rotation for the whole network
        ref.current.rotation.y -= delta * 0.05;
        ref.current.rotation.x -= delta * 0.02;
    }
  });

  return (
    <group ref={ref} {...props}>
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#34d399" // Emerald-400
          size={0.06}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
        />
      </Points>
      {/* Render lines */}
      <Line
        points={connections}
        color="#059669" // Emerald-600
        opacity={0.15}
        transparent
        lineWidth={1}
      />
    </group>
  );
}

export default function AbstractBackground() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 bg-[#020617]">
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <fog attach="fog" args={['#020617', 5, 25]} />
        <ambientLight intensity={0.5} />
        <React.Suspense fallback={null}>
            <NetworkParticles />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
