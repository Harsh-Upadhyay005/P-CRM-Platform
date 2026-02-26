'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text, MeshDistortMaterial, GradientTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── Animated Holographic Globe ──────────────────────────────
function HoloGlobe() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.08;
      wireRef.current.rotation.z = Math.sin(t * 0.15) * 0.05;
    }
  });

  return (
    <group>
      {/* Inner solid sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <MeshDistortMaterial
          color="#6b21a8"
          distort={0.15}
          speed={2}
          roughness={0.4}
          metalness={0.8}
          transparent
          opacity={0.6}
        >
          <GradientTexture stops={[0, 0.5, 1]} colors={['#4c1d95', '#7c3aed', '#10b981']} />
        </MeshDistortMaterial>
      </mesh>

      {/* Outer wireframe */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.12} />
      </mesh>

      {/* Ring */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[2, 0.015, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 3.5, 0.3, 0]}>
        <torusGeometry args={[2.2, 0.01, 16, 100]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// ─── Floating Data Points ────────────────────────────────────
function DataPoints() {
  const count = 40;
  const ref = useRef<THREE.Group>(null!);

  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const state = { seed: 99 };
    const rng = () => {
      state.seed = (state.seed * 16807) % 2147483647;
      return (state.seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const r = 1.3 + rng() * 0.6;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      pos.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={ref}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#10b981' : '#f59e0b'} />
        </mesh>
      ))}
    </group>
  );
}

// ─── HUD Labels ──────────────────────────────────────────────
function HudLabels() {
  return (
    <group>
      <Float speed={1.5} floatIntensity={0.3}>
        <Text position={[-2.5, 1.8, 0]} fontSize={0.18} color="#94a3b8" anchorX="left" font={undefined}>
          COMMAND CENTER
        </Text>
        <Text position={[-2.5, 1.5, 0]} fontSize={0.12} color="#64748b" anchorX="left" font={undefined}>
          REAL-TIME NETWORK MONITORING
        </Text>
      </Float>
    </group>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export function CommandCenter3D() {
  return (
    <div className="relative w-full h-70 rounded-2xl overflow-hidden bg-slate-950/60 border border-white/5 shadow-2xl backdrop-blur-md">
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 via-transparent to-emerald-500/5 pointer-events-none z-10" />
      <div className="absolute bottom-3 left-4 z-10">
        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Political Command Center • Holographic View</p>
      </div>

      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#8b5cf6" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#10b981" />

        <React.Suspense fallback={null}>
          <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
            <HoloGlobe />
            <DataPoints />
          </Float>
          <HudLabels />
          <Sparkles count={80} scale={8} size={1.5} speed={0.3} opacity={0.3} color="#a78bfa" />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
