'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────
   Animated 3D Header – Ashoka Chakra inspired
   Government theme: Saffron, White, Green, Navy
   ───────────────────────────────────────────────────────────── */

// ── Ashoka Chakra (spinning ring with 24 spokes)
function AshokaChakra() {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.15;
    }
  });

  const spokes = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      return { angle, key: i };
    });
  }, []);

  return (
    <group>
      {/* Outer ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.4, 0.05, 32, 100]} />
        <meshStandardMaterial color="#000080" metalness={0.8} roughness={0.1} />
      </mesh>

      {/* Internal rim ring */}
      <mesh>
        <torusGeometry args={[1.30, 0.015, 16, 64]} />
        <meshStandardMaterial color="#000080" metalness={0.9} roughness={0.2} transparent opacity={0.6} />
      </mesh>

      {/* Center hub rings */}
      <group>
        <mesh>
          <torusGeometry args={[0.25, 0.03, 32, 64]} />
          <meshStandardMaterial color="#000080" metalness={0.8} roughness={0.1} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.2, 64]} />
          <meshStandardMaterial color="#000080" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>

      {/* Spokes */}
      <group ref={groupRef}>
        {spokes.map(({ angle, key }) => {
          const innerRadius = 0.25;
          const outerRadius = 1.30;
          const x1 = Math.cos(angle) * innerRadius;
          const y1 = Math.sin(angle) * innerRadius;
          const x2 = Math.cos(angle) * outerRadius;
          const y2 = Math.sin(angle) * outerRadius;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const length = outerRadius - innerRadius;

          return (
            <group key={key} position={[midX, midY, 0]} rotation={[0, 0, angle - Math.PI / 2]}>
              {/* Spoke body */}
              <mesh>
                <cylinderGeometry args={[0.01, 0.025, length, 12]} />
                <meshStandardMaterial color="#000080" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Glow rings */}
      <mesh position={[0, 0, -0.1]}>
        <torusGeometry args={[1.6, 0.05, 8, 100]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.15} />
      </mesh>
      <mesh position={[0, 0, -0.15]}>
        <torusGeometry args={[1.8, 0.05, 8, 100]} />
        <meshBasicMaterial color="#138808" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// ── Orbiting data particles (represent states/complaints)
function DataOrbit() {
  const ref = useRef<THREE.Group>(null!);
  const count = 28;

  // Use a seeded PRNG so values are stable across renders (no Math.random in render)
  const particles = useMemo(() => {
    let seed = 42;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.8 + rng() * 0.4;
      const zOffset = (rng() - 0.5) * 0.3;
      return {
        angle, radius, zOffset,
        size: 0.02 + rng() * 0.02,
        color: i % 3 === 0 ? '#FF9933' : i % 3 === 1 ? '#138808' : '#FFFFFF',
        key: i,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.08;
  });

  return (
    <group ref={ref}>
      {particles.map((p) => (
        <mesh key={p.key} position={[Math.cos(p.angle) * p.radius, Math.sin(p.angle) * p.radius, p.zOffset]}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating text badges
function FloatingLabels() {
  return (
    <group>
      <Float speed={1.2} floatIntensity={0.2}>
        <Text position={[-2.8, 1.5, 0]} fontSize={0.16} color="#CBD5E1" anchorX="left" font={undefined} letterSpacing={0.15}>
          BHARAT COMPLAINT
        </Text>
        <Text position={[-2.8, 1.2, 0]} fontSize={0.1} color="#64748B" anchorX="left" font={undefined} letterSpacing={0.2}>
          RESOLUTION PLATFORM
        </Text>
      </Float>
      <Float speed={1} floatIntensity={0.15}>
        <Text position={[1.5, -1.6, 0]} fontSize={0.08} color="#475569" anchorX="left" font={undefined} letterSpacing={0.1}>
          {'सत्यमेव जयते'}
        </Text>
      </Float>
    </group>
  );
}

// ── Tricolor accent lines
function TricolorAccents() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.children.forEach((child, i) => {
        (child as THREE.Mesh).position.x = Math.sin(t * 0.3 + i * 0.5) * 0.1 - 3;
      });
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[-3, 0.5, -0.5]}>
        <boxGeometry args={[0.3, 0.008, 0.001]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-3, 0.45, -0.5]}>
        <boxGeometry args={[0.25, 0.008, 0.001]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-3, 0.4, -0.5]}>
        <boxGeometry args={[0.2, 0.008, 0.001]} />
        <meshBasicMaterial color="#138808" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export function CommandCenter3D() {
  return (
    <div
      className="relative w-full h-70 rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
      style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 50%, rgba(15,23,42,0.95) 100%)' }}
    >
      {/* Top tricolor bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: 'linear-gradient(90deg, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%)' }} />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-r from-[#FF9933]/5 via-transparent to-[#138808]/5 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none z-10" />

      {/* Title overlay — responsive HTML (replaces Three.js FloatingLabels) */}
      <div className="absolute top-3 left-4 z-10 flex flex-col gap-0.5">
        <p className="text-[11px] sm:text-xs text-slate-300 font-mono tracking-[0.18em] uppercase leading-tight">
          Bharat Complaint
        </p>
        <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-[0.22em] uppercase">
          Resolution Platform
        </p>
      </div>

      {/* Footer label */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#138808]" />
        </div>
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          Government CRM Platform • National Command Center
        </p>
      </div>

      {/* Live indicator */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/60 border border-white/5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[9px] text-slate-400 font-mono">ACTIVE</span>
      </div>

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#FF9933" />
        <pointLight position={[-5, -3, 3]} intensity={0.3} color="#138808" />
        <pointLight position={[0, 0, 5]} intensity={0.2} color="#FFFFFF" />

        <React.Suspense fallback={null}>
          <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.2}>
            <AshokaChakra />
            <DataOrbit />
          </Float>
          <Sparkles count={60} scale={8} size={1.2} speed={0.2} opacity={0.15} color="#FF9933" />
          <Sparkles count={40} scale={6} size={0.8} speed={0.15} opacity={0.1} color="#138808" />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
