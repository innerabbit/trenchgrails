'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { RARITY_HOLO_CONFIG, HoloMaterialImpl } from './holo-material';
import type { RarityTier, ManaColor, ShapeType, MaterialType } from '@/types/cards';

// ── Types ──────────────────────────────────────────────────────

export interface HoloCardData {
  shape: ShapeType;
  material: MaterialType;
  mana_color: ManaColor;
  rarity_tier: RarityTier;
  atk: number;
  def: number;
  hp: number;
  mana_cost: number;
  ability: string | null;
  card_number: number;
}

interface HoloCardProps {
  card: HoloCardData;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  revealed?: boolean;
  index?: number;
  onClick?: () => void;
  animate?: boolean; // enable fly-in from origin
}

// ── Visual config ──────────────────────────────────────────────

const MANA_HEX: Record<ManaColor, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  white: '#e5e7eb', gold: '#eab308', chrome: '#94a3b8',
};

const RARITY_BORDER: Record<RarityTier, string> = {
  common: '#555555',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
};

const SHAPE_SYMBOLS: Record<ShapeType, string> = {
  circle: '●', square: '■', triangle: '▲', star: '★', hexagon: '⬡',
  cube: '◆', cylinder: '◎', pentagon: '⬠',
  diamond: '◇', torus: '◉', heart: '♥', pyramid: '△', knot: '∞',
};

// ── Easing ─────────────────────────────────────────────────────

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Card Component ─────────────────────────────────────────────

export function HoloCard({
  card, position, rotation = [0, 0, 0], scale = 1,
  revealed = false, index = 0, onClick, animate = false,
}: HoloCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Animation state
  const flyProgress = useRef(0);
  const flipProgress = useRef(0);
  const targetFlip = revealed ? Math.PI : 0;

  const holoConfig = RARITY_HOLO_CONFIG[card.rarity_tier];
  const manaHex = MANA_HEX[card.mana_color];
  const borderColor = RARITY_BORDER[card.rarity_tier];

  // Base color depends on material
  const baseColor = useMemo(() => {
    switch (card.material) {
      case 'gold': return new THREE.Color('#c8a000');
      case 'chrome': return new THREE.Color('#b8c0cc');
      case '3d': return new THREE.Color('#2a2a3e');
      default: return new THREE.Color('#1a1a2e');
    }
  }, [card.material]);

  // Holographic material — created via useMemo, attached via <primitive>
  const holoMat = useMemo(() => {
    const mat = new HoloMaterialImpl();
    mat.uniforms.uTime.value = 0;
    mat.uniforms.uHoloIntensity.value = 0;
    mat.uniforms.uBaseColor.value = baseColor;
    mat.uniforms.uFresnelPower.value = holoConfig.fresnelPower;
    mat.uniforms.uRainbowSpeed.value = holoConfig.rainbowSpeed;
    mat.uniforms.uRainbowScale.value = 1.5;
    mat.uniforms.uMetalness.value = holoConfig.metalness;
    mat.uniforms.uRoughness.value = holoConfig.roughness;
    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.rarity_tier, card.material]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // ── Fly-in animation ──
    if (animate && flyProgress.current < 1) {
      flyProgress.current = Math.min(1, flyProgress.current + delta * 2.0);
      const ease = easeOutBack(flyProgress.current);
      groupRef.current.position.x = THREE.MathUtils.lerp(0, position[0], ease);
      groupRef.current.position.y = THREE.MathUtils.lerp(1.5, position[1], ease);
      groupRef.current.position.z = THREE.MathUtils.lerp(0, position[2], ease);
    } else if (!animate || flyProgress.current >= 1) {
      // Settled — lerp to target with gentle hover
      const hover = revealed ? Math.sin(t * 1.2 + index * 0.8) * 0.02 : 0;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], 0.08);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + hover, 0.08);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], 0.08);
    }

    // ── Flip animation ──
    flipProgress.current = THREE.MathUtils.lerp(flipProgress.current, targetFlip, 0.07);
    groupRef.current.rotation.x = rotation[0];
    groupRef.current.rotation.y = rotation[1] + flipProgress.current;
    groupRef.current.rotation.z = rotation[2];

    // ── Scale (hover effect) ──
    const targetScale = hovered && revealed ? scale * 1.06 : scale;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    // ── Update holo shader ──
    holoMat.uniforms.uTime.value = t;
    const targetIntensity = revealed ? holoConfig.holoIntensity + (hovered ? 0.2 : 0) : 0;
    holoMat.uniforms.uHoloIntensity.value = THREE.MathUtils.lerp(
      holoMat.uniforms.uHoloIntensity.value, targetIntensity, 0.05
    );
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* ── Card body with holo material ── */}
      <RoundedBox args={[1.4, 2.0, 0.03]} radius={0.05} smoothness={4}>
        <primitive object={holoMat} attach="material" />
      </RoundedBox>

      {/* ── Rarity border glow ── */}
      <RoundedBox args={[1.44, 2.04, 0.015]} radius={0.055} smoothness={4} position={[0, 0, -0.01]}>
        <meshBasicMaterial
          color={borderColor}
          transparent
          opacity={revealed ? 0.5 : 0.1}
        />
      </RoundedBox>

      {/* ── Card FRONT content (on -Z face, visible when Y rotated π) ── */}
      {revealed && (
        <group position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
          {/* Mana color bar at top */}
          <mesh position={[0, 0.87, 0]}>
            <planeGeometry args={[1.3, 0.1]} />
            <meshBasicMaterial color={manaHex} />
          </mesh>

          {/* Card number */}
          <Text
            position={[0.55, 0.87, 0.001]}
            fontSize={0.055}
            color="#ffffff"
            anchorX="right"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
          >
            {`#${card.card_number}`}
          </Text>

          {/* Rarity label */}
          <Text
            position={[-0.55, 0.87, 0.001]}
            fontSize={0.05}
            color="#ffffff"
            anchorX="left"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.08}
          >
            {card.rarity_tier.toUpperCase()}
          </Text>

          {/* Shape symbol — large, centered */}
          <Text
            position={[0, 0.3, 0.001]}
            fontSize={0.5}
            color={manaHex}
            anchorX="center"
            anchorY="middle"
          >
            {SHAPE_SYMBOLS[card.shape]}
          </Text>

          {/* Shape name */}
          <Text
            position={[0, -0.05, 0.001]}
            fontSize={0.11}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.1}
          >
            {card.shape.toUpperCase()}
          </Text>

          {/* Material subtitle */}
          <Text
            position={[0, -0.2, 0.001]}
            fontSize={0.065}
            color={borderColor}
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.15}
          >
            {card.material.toUpperCase()}
          </Text>

          {/* Stats row */}
          <group position={[0, -0.55, 0.001]}>
            {/* ATK */}
            <mesh position={[-0.42, 0, 0]}>
              <planeGeometry args={[0.24, 0.16]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.2} />
            </mesh>
            <Text position={[-0.42, 0, 0.001]} fontSize={0.065} color="#ef4444" anchorX="center" font="/fonts/inter-bold.woff2">
              {`${card.atk}`}
            </Text>
            <Text position={[-0.42, -0.12, 0.001]} fontSize={0.035} color="#ef4444" anchorX="center" font="/fonts/inter-bold.woff2">ATK</Text>

            {/* DEF */}
            <mesh position={[-0.14, 0, 0]}>
              <planeGeometry args={[0.24, 0.16]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
            </mesh>
            <Text position={[-0.14, 0, 0.001]} fontSize={0.065} color="#3b82f6" anchorX="center" font="/fonts/inter-bold.woff2">
              {`${card.def}`}
            </Text>
            <Text position={[-0.14, -0.12, 0.001]} fontSize={0.035} color="#3b82f6" anchorX="center" font="/fonts/inter-bold.woff2">DEF</Text>

            {/* HP */}
            <mesh position={[0.14, 0, 0]}>
              <planeGeometry args={[0.24, 0.16]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.2} />
            </mesh>
            <Text position={[0.14, 0, 0.001]} fontSize={0.065} color="#22c55e" anchorX="center" font="/fonts/inter-bold.woff2">
              {`${card.hp}`}
            </Text>
            <Text position={[0.14, -0.12, 0.001]} fontSize={0.035} color="#22c55e" anchorX="center" font="/fonts/inter-bold.woff2">HP</Text>

            {/* MANA */}
            <mesh position={[0.42, 0, 0]}>
              <planeGeometry args={[0.24, 0.16]} />
              <meshBasicMaterial color="#eab308" transparent opacity={0.2} />
            </mesh>
            <Text position={[0.42, 0, 0.001]} fontSize={0.065} color="#eab308" anchorX="center" font="/fonts/inter-bold.woff2">
              {`${card.mana_cost}`}
            </Text>
            <Text position={[0.42, -0.12, 0.001]} fontSize={0.035} color="#eab308" anchorX="center" font="/fonts/inter-bold.woff2">MANA</Text>
          </group>

          {/* Ability text */}
          {card.ability && (
            <Text
              position={[0, -0.82, 0.001]}
              fontSize={0.055}
              color="#c084fc"
              anchorX="center"
              anchorY="middle"
              maxWidth={1.1}
              font="/fonts/inter-bold.woff2"
            >
              {`✦ ${card.ability}`}
            </Text>
          )}
        </group>
      )}

      {/* ── Card BACK (on +Z face, visible by default) ── */}
      {!revealed && (
        <group position={[0, 0, 0.02]}>
          {/* Logo area background */}
          <RoundedBox args={[1.1, 1.6, 0.001]} radius={0.04} smoothness={4} position={[0, 0, 0]}>
            <meshBasicMaterial color="#ff6600" transparent opacity={0.08} />
          </RoundedBox>
          {/* Border line */}
          <RoundedBox args={[1.15, 1.65, 0.001]} radius={0.04} smoothness={4} position={[0, 0, -0.001]}>
            <meshBasicMaterial color="#ff6600" transparent opacity={0.15} />
          </RoundedBox>
          <Text
            position={[0, 0.15, 0.001]}
            fontSize={0.14}
            color="#ff6600"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.18}
          >
            TRENCH
          </Text>
          <Text
            position={[0, -0.05, 0.001]}
            fontSize={0.14}
            color="#ff6600"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.18}
          >
            GRAILS
          </Text>
          <Text
            position={[0, -0.3, 0.001]}
            fontSize={0.04}
            color="#ff660066"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-bold.woff2"
            letterSpacing={0.3}
          >
            COLLECT. TRADE. BATTLE.
          </Text>
        </group>
      )}
    </group>
  );
}
