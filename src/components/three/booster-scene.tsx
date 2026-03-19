'use client';

import { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { BoosterPack, type PackState } from './booster-pack';
import { HoloCard, type HoloCardData } from './holo-card';
import { PackParticles } from './pack-particles';

// ── Types ──────────────────────────────────────────────────────

export type BoosterStage = 'idle' | 'opening' | 'revealing' | 'showcase' | 'done';

export type PackCard = HoloCardData;

// ── Card layout helpers ────────────────────────────────────────

function getCardFanPosition(index: number, total: number): [number, number, number] {
  const spread = 3.6;
  const offset = (index - (total - 1) / 2) / Math.max(total - 1, 1);
  return [offset * spread, -Math.abs(offset) * 0.2 + 0.1, -Math.abs(offset) * 0.3];
}

function getCardFanRotation(index: number, total: number): [number, number, number] {
  const offset = (index - (total - 1) / 2) / Math.max(total - 1, 1);
  return [0, offset * -0.12, offset * -0.06];
}

function getShowcasePosition(index: number): [number, number, number] {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return [(col - 1) * 1.7, (0.5 - row) * 2.4, 0];
}

// ── Animated Camera ──────────────────────────────────────────

const CAMERA_TARGETS: Record<BoosterStage, { pos: THREE.Vector3; lookAt: THREE.Vector3 }> = {
  idle:      { pos: new THREE.Vector3(0, 0.3, 5),   lookAt: new THREE.Vector3(0, 0, 0) },
  opening:   { pos: new THREE.Vector3(0, 0.4, 4.5), lookAt: new THREE.Vector3(0, 0.2, 0) },
  revealing: { pos: new THREE.Vector3(0, 0.1, 5.5), lookAt: new THREE.Vector3(0, 0, 0) },
  showcase:  { pos: new THREE.Vector3(0, 0.2, 5.8), lookAt: new THREE.Vector3(0, 0, 0) },
  done:      { pos: new THREE.Vector3(0, 0.2, 5.8), lookAt: new THREE.Vector3(0, 0, 0) },
};

function AnimatedCamera({ stage }: { stage: BoosterStage }) {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const currentPos = useRef(new THREE.Vector3(0, 0.3, 5));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!camRef.current) return;
    const target = CAMERA_TARGETS[stage];
    currentPos.current.lerp(target.pos, 0.03);
    currentLookAt.current.lerp(target.lookAt, 0.03);
    camRef.current.position.copy(currentPos.current);
    camRef.current.lookAt(currentLookAt.current);
  });

  return <PerspectiveCamera ref={camRef} makeDefault position={[0, 0.3, 5]} fov={50} />;
}

// ── Scene Controller ──────────────────────────────────────────

function SceneController({
  cards, stage, setStage, revealedCount, setRevealedCount, onCardClick,
}: {
  cards: PackCard[];
  stage: BoosterStage;
  setStage: (s: BoosterStage) => void;
  revealedCount: number;
  setRevealedCount: (n: number) => void;
  onCardClick?: (card: PackCard, index: number) => void;
}) {
  const [packState, setPackState] = useState<PackState>('entering');
  const enterTimerRef = useRef(0);
  const anticipationTimerRef = useRef(0);

  useFrame((_, delta) => {
    // After entering, transition to idle
    if (packState === 'entering') {
      enterTimerRef.current += delta;
      if (enterTimerRef.current > 0.8) {
        setPackState('idle');
      }
    }

    // Auto-advance anticipation → tearing
    if (packState === 'anticipation') {
      anticipationTimerRef.current += delta;
      if (anticipationTimerRef.current > 0.5) {
        setPackState('tearing');
      }
    }
  });

  const handlePackClick = useCallback(() => {
    if (stage !== 'idle') return;
    setStage('opening');
    setPackState('anticipation');
    anticipationTimerRef.current = 0;
  }, [stage, setStage]);

  const handleTearComplete = useCallback(() => {
    setPackState('opened');
    // Short delay then transition to revealing
    setTimeout(() => {
      setStage('revealing');
      setPackState('gone');
    }, 400);
  }, [setStage]);

  const handleCardClick = useCallback((index: number) => {
    if (stage !== 'revealing') return;
    if (index !== revealedCount) return;
    setRevealedCount(revealedCount + 1);
    onCardClick?.(cards[index], index);
    if (revealedCount + 1 >= cards.length) {
      setTimeout(() => setStage('showcase'), 800);
    }
  }, [stage, revealedCount, cards, setRevealedCount, setStage, onCardClick]);

  return (
    <>
      {/* ── Camera ── */}
      <AnimatedCamera stage={stage} />

      {/* ── Lighting ── */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        castShadow={false}
      />
      {/* Warm rim light */}
      <pointLight position={[-3, 2, 2]} intensity={0.3} color="#ff8844" />
      {/* Cool fill */}
      <pointLight position={[3, -1, 3]} intensity={0.2} color="#4488ff" />

      {/* ── Environment for reflections only (no visible background) ── */}
      <Environment preset="studio" environmentIntensity={0.4} background={false} />

      {/* ── Particles ── */}
      <PackParticles active={packState === 'tearing' || packState === 'opened'} />

      {/* ── Booster Pack ── */}
      {stage !== 'showcase' && stage !== 'done' && packState !== 'gone' && (
        <BoosterPack
          state={packState}
          onClick={handlePackClick}
          onTearComplete={handleTearComplete}
        />
      )}

      {/* ── Cards ── */}
      {(stage === 'revealing' || stage === 'showcase') && cards.map((card, i) => {
        // Only show cards up to current reveal count + 1 (next clickable)
        if (stage === 'revealing' && i > revealedCount) return null;

        const pos = stage === 'showcase'
          ? getShowcasePosition(i)
          : getCardFanPosition(i, cards.length);
        const rot = stage === 'showcase'
          ? [0, 0, 0] as [number, number, number]
          : getCardFanRotation(i, cards.length);

        return (
          <HoloCard
            key={i}
            card={card}
            position={pos}
            rotation={rot}
            scale={stage === 'showcase' ? 0.82 : 0.88}
            revealed={i < revealedCount || stage === 'showcase'}
            index={i}
            onClick={() => handleCardClick(i)}
            animate={stage === 'revealing'}
          />
        );
      })}

      {/* ── Postprocessing (no vignette — transparent bg) ── */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.85}
          luminanceSmoothing={0.3}
          intensity={0.4}
        />
      </EffectComposer>
    </>
  );
}

// ── Public Component ──────────────────────────────────────────

interface BoosterSceneProps {
  cards: PackCard[];
  onStageChange?: (stage: BoosterStage) => void;
  onCardReveal?: (card: PackCard, index: number) => void;
  onComplete?: () => void;
  className?: string;
}

export function BoosterScene({
  cards, onStageChange, onCardReveal, onComplete, className = '',
}: BoosterSceneProps) {
  const [stage, setStage] = useState<BoosterStage>('idle');
  const [revealedCount, setRevealedCount] = useState(0);

  const handleStageChange = useCallback((newStage: BoosterStage) => {
    setStage(newStage);
    onStageChange?.(newStage);
    if (newStage === 'showcase') {
      setTimeout(() => onComplete?.(), 2000);
    }
  }, [onStageChange, onComplete]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          alpha: true,
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <SceneController
          cards={cards}
          stage={stage}
          setStage={handleStageChange}
          revealedCount={revealedCount}
          setRevealedCount={setRevealedCount}
          onCardClick={onCardReveal}
        />
      </Canvas>
    </div>
  );
}
