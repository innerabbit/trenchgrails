'use client';

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// ── GLSL Holographic Card Material ──────────────────────────────
// Fresnel-based iridescence with animated rainbow gradient.
// uHoloIntensity controls the effect strength per rarity tier.

const HoloShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uHoloIntensity: 0.0,
    uBaseColor: new THREE.Color('#1a1a2e'),
    uFresnelPower: 3.0,
    uRainbowSpeed: 0.2,
    uRainbowScale: 1.5,
    uMetalness: 0.3,
    uRoughness: 0.4,
  },
  // ── Vertex Shader ──
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // ── Fragment Shader ──
  /* glsl */ `
    uniform float uTime;
    uniform float uHoloIntensity;
    uniform vec3 uBaseColor;
    uniform float uFresnelPower;
    uniform float uRainbowSpeed;
    uniform float uRainbowScale;
    uniform float uMetalness;
    uniform float uRoughness;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;

    // Simple environment reflection approximation
    vec3 envReflection(vec3 normal, vec3 viewDir) {
      vec3 reflected = reflect(-viewDir, normal);
      float y = reflected.y * 0.5 + 0.5;
      // Sky gradient: dark blue bottom → light top
      vec3 sky = mix(vec3(0.1, 0.12, 0.18), vec3(0.7, 0.75, 0.85), y);
      // Add some warmth from "studio lights"
      float side = abs(reflected.x);
      sky += vec3(0.15, 0.1, 0.05) * side;
      return sky;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewDir);

      // Fresnel term — stronger at glancing angles
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);

      // Rainbow holographic pattern
      float phase = vUv.x * uRainbowScale + vUv.y * uRainbowScale * 0.7 + uTime * uRainbowSpeed;
      vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (phase + vec3(0.0, 0.33, 0.67)));

      // Animated shimmer — subtle movement across surface
      float shimmer = sin(vUv.x * 12.0 + uTime * 1.5) * sin(vUv.y * 8.0 + uTime * 0.8);
      shimmer = shimmer * 0.5 + 0.5;

      // Environment reflection for metallic feel
      vec3 envColor = envReflection(normal, viewDir);

      // Base material with metalness
      vec3 baseWithMetal = mix(uBaseColor, envColor, uMetalness);

      // Mix holographic effect based on fresnel and intensity
      float holoMix = fresnel * uHoloIntensity + shimmer * uHoloIntensity * 0.15;
      vec3 color = mix(baseWithMetal, rainbow, clamp(holoMix, 0.0, 1.0));

      // Add specular highlight
      vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
      vec3 halfVec = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfVec), 0.0), mix(8.0, 64.0, 1.0 - uRoughness));
      color += vec3(1.0) * specular * 0.5 * (1.0 + uHoloIntensity);

      // Slight emissive glow for high holo intensity (legendary cards)
      float emissive = uHoloIntensity * fresnel * 0.3;
      color += rainbow * emissive;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
);

extend({ HoloShaderMaterial });

// Re-export the constructor for manual use
export const HoloMaterialImpl = HoloShaderMaterial;

// ── Rarity → shader config mapping ──────────────────────────────

export const RARITY_HOLO_CONFIG: Record<string, {
  holoIntensity: number;
  metalness: number;
  roughness: number;
  fresnelPower: number;
  rainbowSpeed: number;
}> = {
  common:    { holoIntensity: 0.0,  metalness: 0.1, roughness: 0.7, fresnelPower: 3.0, rainbowSpeed: 0.0 },
  uncommon:  { holoIntensity: 0.15, metalness: 0.3, roughness: 0.5, fresnelPower: 3.5, rainbowSpeed: 0.1 },
  rare:      { holoIntensity: 0.45, metalness: 0.5, roughness: 0.35, fresnelPower: 3.0, rainbowSpeed: 0.2 },
  epic:      { holoIntensity: 0.7,  metalness: 0.7, roughness: 0.2, fresnelPower: 2.5, rainbowSpeed: 0.3 },
  legendary: { holoIntensity: 1.0,  metalness: 0.85, roughness: 0.1, fresnelPower: 2.0, rainbowSpeed: 0.5 },
};

export { HoloShaderMaterial };
