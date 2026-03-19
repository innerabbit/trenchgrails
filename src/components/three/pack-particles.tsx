'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Particle Burst — triggers on pack tear ──────────────────────

const PARTICLE_COUNT = 60;

interface PackParticlesProps {
  active: boolean;
  position?: [number, number, number];
}

export function PackParticles({ active, position = [0, 0.5, 0] }: PackParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startedRef = useRef(false);
  const timeRef = useRef(0);

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const vels: THREE.Vector3[] = [];

    const colorOptions = [
      new THREE.Color('#ff6600'),
      new THREE.Color('#ff9933'),
      new THREE.Color('#ffcc00'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = position[0];
      positions[i * 3 + 1] = position[1];
      positions[i * 3 + 2] = position[2];

      // Radial burst from seam
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI; // bias upward
      const speed = 1.5 + Math.random() * 3;
      vels.push(new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi) * speed,
        Math.abs(Math.sin(phi)) * speed * 0.8 + Math.random() * 1.5, // upward bias
        Math.sin(theta) * Math.cos(phi) * speed * 0.6,
      ));

      const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 0.03 + Math.random() * 0.05;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    return { geometry: geo, velocities: vels };
  }, [position]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    if (active && !startedRef.current) {
      startedRef.current = true;
      timeRef.current = 0;
      // Reset positions
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos.setXYZ(i, position[0], position[1], position[2]);
      }
      pos.needsUpdate = true;
    }

    if (!startedRef.current) return;

    timeRef.current += delta;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const gravity = 3.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const vel = velocities[i];
      const tt = timeRef.current;
      positions.setXYZ(
        i,
        position[0] + vel.x * tt,
        position[1] + vel.y * tt - 0.5 * gravity * tt * tt,
        position[2] + vel.z * tt,
      );
    }
    positions.needsUpdate = true;

    // Fade out
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - timeRef.current * 0.5);
    mat.size = Math.max(0.01, 0.06 - timeRef.current * 0.015);
  });

  if (!active && !startedRef.current) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
