'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { HoloMaterialImpl } from './holo-material';

// ── Types ──────────────────────────────────────────────────────

export type PackState = 'entering' | 'idle' | 'anticipation' | 'tearing' | 'opened' | 'gone';

interface BoosterPackProps {
  state: PackState;
  onClick?: () => void;
  onTearComplete?: () => void;
}

// ── Easing ─────────────────────────────────────────────────────

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

// ── Create holographic pack material ────────────────────────────

function createHoloPackMat() {
  const mat = new HoloMaterialImpl();
  // Set uniforms after construction (Three.js v0.183+ rejects custom props in constructor)
  mat.uniforms.uTime.value = 0;
  mat.uniforms.uHoloIntensity.value = 0.7;
  mat.uniforms.uBaseColor.value = new THREE.Color('#0a0318');
  mat.uniforms.uFresnelPower.value = 2.5;
  mat.uniforms.uRainbowSpeed.value = 0.3;
  mat.uniforms.uRainbowScale.value = 1.2;
  mat.uniforms.uMetalness.value = 0.8;
  mat.uniforms.uRoughness.value = 0.15;
  return mat;
}

// ── Pack Component ─────────────────────────────────────────────

export function BoosterPack({ state, onClick, onTearComplete }: BoosterPackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flapRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Holographic materials — created once via useMemo, attached via <primitive>
  const bodyMat = useMemo(() => createHoloPackMat(), []);
  const flapMat = useMemo(() => createHoloPackMat(), []);

  // Animation progress trackers
  const enterProgress = useRef(0);
  const anticipationProgress = useRef(0);
  const tearProgress = useRef(0);
  const exitProgress = useRef(0);
  const [tearDone, setTearDone] = useState(false);
  const [hovered, setHovered] = useState(false);

  useFrame((frameState, delta) => {
    if (!groupRef.current) return;
    const t = frameState.clock.elapsedTime;

    // Update shader uniforms
    bodyMat.uniforms.uTime.value = t;
    const targetIntensity = hovered && state === 'idle' ? 0.9 : 0.7;
    bodyMat.uniforms.uHoloIntensity.value = THREE.MathUtils.lerp(
      bodyMat.uniforms.uHoloIntensity.value, targetIntensity, 0.05
    );
    flapMat.uniforms.uTime.value = t;
    flapMat.uniforms.uHoloIntensity.value = bodyMat.uniforms.uHoloIntensity.value;

    // ── Enter animation: fly in from top-right ──
    if (state === 'entering') {
      enterProgress.current = Math.min(1, enterProgress.current + delta * 1.8);
      const ease = easeOutBack(enterProgress.current);
      groupRef.current.position.x = THREE.MathUtils.lerp(3, 0, ease);
      groupRef.current.position.y = THREE.MathUtils.lerp(4, 0, ease);
      groupRef.current.position.z = THREE.MathUtils.lerp(-2, 0, ease);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(-0.5, 0, ease);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(0.8, 0, ease);
    }

    // ── Idle: gentle float + slow rotation ──
    if (state === 'idle') {
      groupRef.current.position.y = Math.sin(t * 1.0) * 0.06;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.08;
      groupRef.current.rotation.x = Math.sin(t * 0.6) * 0.02;
      const sc = hovered ? 1.04 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(sc, sc, sc), 0.1);
    }

    // ── Anticipation: shake + squeeze ──
    if (state === 'anticipation') {
      anticipationProgress.current = Math.min(1, anticipationProgress.current + delta * 2.5);
      const p = anticipationProgress.current;
      const shakeIntensity = p * 0.04;
      groupRef.current.position.x = Math.sin(t * 50) * shakeIntensity;
      groupRef.current.position.y = Math.cos(t * 45) * shakeIntensity * 0.5;
      groupRef.current.rotation.z = Math.sin(t * 40) * shakeIntensity * 0.8;
      groupRef.current.scale.set(1 + p * 0.03, 1 - p * 0.04, 1);
    }

    // ── Tearing: flap rotates open, light beam ──
    if (state === 'tearing') {
      tearProgress.current = Math.min(1, tearProgress.current + delta * 1.2);
      const p = tearProgress.current;

      groupRef.current.position.x = 0;
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.set(1, 1, 1);

      if (flapRef.current) {
        const flapAngle = easeOutCubic(p) * Math.PI * 0.85;
        flapRef.current.rotation.x = -flapAngle;
        flapRef.current.position.y = easeOutCubic(p) * 0.3;
      }

      if (lightRef.current) {
        lightRef.current.intensity = Math.sin(p * Math.PI) * 8;
        lightRef.current.position.y = p * 0.5;
      }

      if (glowRef.current) {
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(p * Math.PI) * 0.6;
        glowRef.current.scale.setScalar(1 + p * 2);
      }

      if (p >= 1 && !tearDone) {
        setTearDone(true);
        onTearComplete?.();
      }
    }

    // ── Opened → shrink away ──
    if (state === 'opened' || state === 'gone') {
      exitProgress.current = Math.min(1, exitProgress.current + delta * 2);
      const p = easeInQuad(exitProgress.current);
      groupRef.current.scale.lerp(new THREE.Vector3(1 - p, 1 - p, 1 - p), 0.15);
      groupRef.current.position.y = -p * 2;
      if (glowRef.current) {
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.95;
      }
    }
  });

  const isClickable = state === 'idle';

  return (
    <group
      ref={groupRef}
      position={[3, 4, -2]}
      onClick={isClickable ? onClick : undefined}
      onPointerOver={() => { if (isClickable) { setHovered(true); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* ── Pack body (holographic material) ── */}
      <group>
        <RoundedBox args={[1.8, 2.6, 0.35]} radius={0.06} smoothness={4} position={[0, -0.2, 0]}>
          <primitive object={bodyMat} attach="material" />
        </RoundedBox>

        {/* Pack face decoration */}
        <group position={[0, 0, 0.19]}>
          <mesh position={[0, 0.65, 0]}>
            <planeGeometry args={[1.5, 0.04]} />
            <meshBasicMaterial color="#ff6600" />
          </mesh>

          <Text
            position={[0, 0.35, 0]}
            fontSize={0.2}
            color="#ff6600"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.2}
          >
            TRENCH
          </Text>
          <Text
            position={[0, 0.1, 0]}
            fontSize={0.2}
            color="#ff6600"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.2}
          >
            GRAILS
          </Text>
          <Text
            position={[0, -0.2, 0]}
            fontSize={0.065}
            color="#cccccc"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.35}
          >
            BOOSTER PACK
          </Text>

          <mesh position={[0, -0.65, 0]}>
            <planeGeometry args={[1.5, 0.04]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.5} />
          </mesh>

          <Text
            position={[0, -0.85, 0]}
            fontSize={0.05}
            color="#999999"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.15}
          >
            6 COLLECTIBLE CARDS
          </Text>
        </group>
      </group>

      {/* ── Flap (top, tears off — also holographic) ── */}
      <group position={[0, 1.1, 0]}>
        <group ref={flapRef}>
          <RoundedBox args={[1.8, 0.7, 0.35]} radius={0.06} smoothness={4} position={[0, 0.35, 0]}>
            <primitive object={flapMat} attach="material" />
          </RoundedBox>
          <mesh position={[0, 0, 0.18]}>
            <planeGeometry args={[1.6, 0.02]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.3} />
          </mesh>
        </group>
      </group>

      {/* ── Light beam from inside ── */}
      <pointLight ref={lightRef} position={[0, 0.5, 0]} intensity={0} color="#ffaa44" distance={5} />

      {/* ── Glow effect ── */}
      <mesh ref={glowRef} position={[0, 0.5, 0.2]}>
        <planeGeometry args={[1, 1.5]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
