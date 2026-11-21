import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { QualityLevel } from '../types/room';
import { detectSoftwareWebGL } from './webglCapabilities';

interface PostProcessingEffectsProps {
  qualityLevel: QualityLevel;
  bloomStrength?: number;
}

/**
 * Linear HDR architectural grading pass placed BEFORE OutputPass so ACES Filmic tone mapping
 * & sRGB output encoding operate cleanly without double-clamping bright surfaces.
 */
const ArchitecturalLinearGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.2 },
    uGrain: { value: 0.01 },
    uHighlightRollOff: { value: 0.14 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uHighlightRollOff;
    uniform float uTime;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = max(tex.rgb, vec3(0.0));

      // Soft highlight shoulder in linear space to keep plaster, marble & bedding texture crisp
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      if (luma > 0.75) {
        float compressed = 0.75 + (luma - 0.75) / (1.0 + (luma - 0.75) * uHighlightRollOff * 5.0);
        col *= compressed / max(luma, 0.0001);
      }

      // Subtle architectural color grading: warm highlights, cool neutral crevice shadows
      vec3 warmTint = vec3(1.015, 1.0, 0.975);
      vec3 coolShadow = vec3(0.965, 0.985, 1.015);
      col *= mix(coolShadow, warmTint, smoothstep(0.08, 0.82, luma));

      // Gentle peripheral vignette to anchor room framing
      vec2 centered = vUv - 0.5;
      float dist = dot(centered, centered);
      float vig = 1.0 - smoothstep(0.16, 0.72, dist) * uVignette;
      col *= vig;

      // Ultra-subtle photographic grain
      float noise = (rand(vUv + fract(uTime * 0.13)) - 0.5) * uGrain;
      col = max(col + noise, vec3(0.0));

      gl_FragColor = vec4(col, tex.a);
    }
  `,
};

const ActivePostProcessingComposer: React.FC<{
  qualityLevel: QualityLevel;
  bloomStrength: number;
}> = ({ qualityLevel, bloomStrength }) => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const gradePassRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      qualityLevel === 'ultra' ? 2 : qualityLevel === 'high' ? 1.5 : 1.25,
    );
    const width = Math.max(1, Math.floor(size.width * dpr));
    const height = Math.max(1, Math.floor(size.height * dpr));

    const composer = new EffectComposer(gl);
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let ssaoPass: SSAOPass | null = null;
    if (qualityLevel === 'high' || qualityLevel === 'ultra') {
      ssaoPass = new SSAOPass(scene, camera, width, height);
      ssaoPass.kernelRadius = qualityLevel === 'ultra' ? 0.44 : 0.34;
      ssaoPass.minDistance = 0.0022;
      ssaoPass.maxDistance = 0.16;
      composer.addPass(ssaoPass);
    }

    // High threshold (1.35) guarantees only emissive bulbs/flames bloom, never plaster or linens
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      Math.min(0.11, qualityLevel === 'ultra' ? bloomStrength * 1.08 : bloomStrength * 0.9),
      0.35,
      1.35,
    );
    composer.addPass(bloomPass);

    const gradePass = new ShaderPass(ArchitecturalLinearGradeShader);
    gradePass.uniforms.uVignette.value = qualityLevel === 'ultra' ? 0.22 : 0.17;
    gradePass.uniforms.uGrain.value = qualityLevel === 'ultra' ? 0.01 : 0.006;
    gradePass.uniforms.uHighlightRollOff.value = 0.18;
    composer.addPass(gradePass);
    gradePassRef.current = gradePass;

    // OutputPass applies renderer's ACESFilmicToneMapping + sRGB conversion
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    let smaaPass: SMAAPass | null = null;
    if (qualityLevel === 'high' || qualityLevel === 'ultra') {
      smaaPass = new SMAAPass();
      composer.addPass(smaaPass);
    }

    composerRef.current = composer;

    return () => {
      composer.dispose();
      if (ssaoPass && typeof ssaoPass.dispose === 'function') {
        ssaoPass.dispose();
      }
      bloomPass.dispose();
      gradePass.dispose?.();
      smaaPass?.dispose?.();
      composerRef.current = null;
      gradePassRef.current = null;
    };
  }, [qualityLevel, bloomStrength, gl, scene, camera, size.width, size.height]);

  useFrame(({ clock }) => {
    if (!composerRef.current) return;
    if (gradePassRef.current) {
      gradePassRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
    composerRef.current.render();
  }, 1);

  return null;
};

export const PostProcessingEffects: React.FC<PostProcessingEffectsProps> = ({
  qualityLevel,
  bloomStrength = 0.06,
}) => {
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const enabled = !isSoftwareGl && qualityLevel !== 'low';

  if (!enabled) return null;

  return (
    <ActivePostProcessingComposer
      qualityLevel={qualityLevel}
      bloomStrength={bloomStrength}
    />
  );
};
