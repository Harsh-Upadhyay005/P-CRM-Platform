'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────
   Animated 3D Header – Majestic Ashoka Chakra & Tricolor
   ───────────────────────────────────────────────────────────── */

// ── Ashoka Chakra (spinning ring with 24 spokes)
function AshokaChakra() {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.2;
    }
  });

  const spokes = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      return { angle, key: i };
    });
  }, []);

  const chakraMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#000080",
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  }), []);

  return (
    <group position={[0, 0, 0]} scale={1.2}>
      {/* Outer ring */}
      <mesh ref={ringRef} material={chakraMaterial}>
        <torusGeometry args={[1.4, 0.08, 64, 128]} />
      </mesh>

      {/* Internal rim ring */}
      <mesh>
        <torusGeometry args={[1.30, 0.02, 32, 128]} />
        <meshPhysicalMaterial color="#000040" metalness={0.9} roughness={0.3} transparent opacity={0.8} />
      </mesh>

      {/* Center hub */}
      <group>
        <mesh material={chakraMaterial}>
          <torusGeometry args={[0.25, 0.04, 32, 64]} />
        </mesh>
        <mesh material={chakraMaterial}>
          <circleGeometry args={[0.22, 64]} />
        </mesh>
        {/* Hub Glow */}
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.12, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
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
              <mesh material={chakraMaterial}>
                <cylinderGeometry args={[0.015, 0.035, length, 16]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Majestic Backdrop Glow Rings */}
      <mesh position={[0, 0, -0.3]}>
        <ringGeometry args={[1.4, 1.8, 64]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.4]}>
        <ringGeometry args={[1.8, 2.2, 64]} />
        <meshBasicMaterial color="#138808" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Central Blue Aura */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[1.4, 64]} />
        <meshBasicMaterial color="#000080" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

// ── Continuous Sweeping Tricolor Fabric
function TriColorFabric() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(40, 1.8, 128, 1), []);
  const initialPositions = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 1.5;
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
        const x = initialPositions[i * 3];
        // Create a luscious, continuous wave that sweeps horizontally
        const waveZ = Math.sin(x * 0.15 - t * 0.8) * 2.0;
        positions.setZ(i, waveZ);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group position={[0, 0, -4]} rotation={[-0.1, 0, 0]}>
      {/* Saffron Band */}
      <mesh position={[0, 1.8, 0]} geometry={geometry}>
        <meshPhysicalMaterial color="#FF9933" transparent opacity={0.8} roughness={0.2} metalness={0.4} clearcoat={1.0} side={THREE.DoubleSide} />
      </mesh>
      
      {/* White Band */}
      <mesh position={[0, 0, 0]} geometry={geometry}>
        <meshPhysicalMaterial color="#FFFFFF" transparent opacity={0.6} roughness={0.1} metalness={0.7} clearcoat={1.0} side={THREE.DoubleSide} emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>

      {/* Green Band */}
      <mesh position={[0, -1.8, 0]} geometry={geometry}>
        <meshPhysicalMaterial color="#138808" transparent opacity={0.8} roughness={0.2} metalness={0.4} clearcoat={1.0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Orbiting data particles (represent glowing ambient data)
function DataOrbit() {
  const ref = useRef<THREE.Group>(null!);
  const count = 40;

  const particles = useMemo(() => {
    let seed = 123;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.5 + rng() * 1.5;
      const zOffset = (rng() - 0.5) * 2.0;
      return {
        angle, radius, zOffset,
        size: 0.02 + rng() * 0.04,
        color: i % 3 === 0 ? '#FF9933' : i % 3 === 1 ? '#138808' : '#FFFFFF',
        speed: 0.2 + rng() * 0.3,
        key: i,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.05;
  });

  return (
    <group ref={ref}>
      {particles.map((p) => (
        <mesh key={p.key} position={[Math.cos(p.angle) * p.radius, Math.sin(p.angle) * p.radius, p.zOffset]}>
          <sphereGeometry args={[p.size, 16, 16]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export function CommandCenter3D() {
  return (
    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950">
      
      {/* Deep premium background with soft glowing corners */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,153,51,0.15),_transparent_40%),radial-gradient(ellipse_at_bottom_right,_rgba(19,136,8,0.15),_transparent_40%)]" />
      
      {/* Top metallic tricolor trim */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%, #138808 100%)', boxShadow: '0 2px 10px rgba(255,255,255,0.2)' }} />

      {/* Overlay Vignette */}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none z-10" />

      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FF9933] shadow-[0_0_8px_#FF9933]" />
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFFFFF]" />
          <div className="w-2 h-2 rounded-full bg-[#138808] shadow-[0_0_8px_#138808]" />
        </div>
        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
          Satyameva Jayate
        </p>
      </div>

      <div className="absolute top-5 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="text-[10px] text-white font-mono tracking-wider">SYSTEM ACTIVE</span>
      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-5, 2, 5]} intensity={0.8} color="#FF9933" />
        <pointLight position={[5, -2, 5]} intensity={0.8} color="#138808" />

        <React.Suspense fallback={null}>
          {/* Sweeping Tricolor Background */}
          <TriColorFabric />
          
          {/* Centered Chakra & Particles */}
          <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
            <AshokaChakra />
            <DataOrbit />
          </Float>
          
          {/* Ambient Sparkles */}
          <Sparkles count={50} scale={10} size={1.5} speed={0.4} opacity={0.4} color="#FF9933" position={[0, 2, -2]} />
          <Sparkles count={50} scale={10} size={1.5} speed={0.4} opacity={0.4} color="#138808" position={[0, -2, -2]} />
          <Sparkles count={30} scale={8} size={2} speed={0.2} opacity={0.6} color="#FFFFFF" />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
