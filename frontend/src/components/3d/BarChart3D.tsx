'use client';

import React, { useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { animated, useSpring } from '@react-spring/three';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface BarChart3DProps {
  data: BarData[];
  position?: [number, number, number];
  scale?: [number, number, number];
}

interface BarProps {
  position: [number, number, number];
  height: number;
  color: string;
  label: string;
  value: number;
  index: number;
}

const Bar = ({ position, height, color, label, value, index }: BarProps) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  
  useSpring({
    scaleY: hovered ? 1.1 : 1,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  // Animate growth on mount
  const { grow } = useSpring({
    from: { grow: 0 },
    to: { grow: height },
    delay: index * 100,
    config: { mass: 1, tension: 120, friction: 14 },
  });

  return (
    <group position={position}>
      <animated.mesh
        ref={mesh}
        position-y={grow.to(h => h / 2)}
        scale-y={grow}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color={hovered ? 'hotpink' : color} metalness={0.5} roughness={0.2} />
      </animated.mesh>
      
      {/* Label */}
      <Text
        position={[0, -0.5, 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="top"
      >
        {label}
      </Text>

      {/* Value (floating on top) */}
      <animated.group position-y={grow.to(h => h + 0.5)}>
         <Text
           fontSize={0.4}
           color="white"
           anchorX="center"
           anchorY="bottom"
           outlineWidth={0.02}
           outlineColor="#000"
         >
           {value}
         </Text>
      </animated.group>
    </group>
  );
};

export function BarChart3D({ data, position = [0, 0, 0], scale = [1, 1, 1] }: BarChart3DProps) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const maxHeight = 5;

  return (
    <group position={position} scale={scale}>
      {data.map((item, i) => {
        const height = (item.value / maxVal) * maxHeight;
        return (
          <Bar
            key={i}
            position={[(i - data.length / 2) * 1.2, 0, 0]}
            height={height}
            color={item.color}
            label={item.label}
            value={item.value}
            index={i}
          />
        );
      })}
      {/* Base Platform */}
      <mesh position={[0, -0.1, 0]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[data.length * 1.5, 4]} />
         <meshStandardMaterial color="#222" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
