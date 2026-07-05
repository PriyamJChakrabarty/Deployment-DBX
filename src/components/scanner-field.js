"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// A field of points standing in for "a codebase being scanned" — idle drift
// plus a glow that tracks the cursor like a detector sweeping for a hit.
const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uIntensity;
  uniform float uPixelRatio;
  attribute float aPhase;
  varying float vGlow;

  void main() {
    vec3 pos = position;
    pos.z += sin(uTime * 0.6 + aPhase) * 0.08;

    float dist = distance(pos.xy, uMouse.xy);
    float glow = smoothstep(2.4, 0.0, dist);
    vGlow = glow;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.6 + glow * 5.5 * uIntensity) * uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uBaseColor;
  uniform vec3 uAccentColor;
  varying float vGlow;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uBaseColor, uAccentColor, vGlow);
    float baseAlpha = mix(0.55, 1.0, vGlow);
    gl_FragColor = vec4(color, alpha * baseAlpha);
  }
`;

function ScannerParticles({ accent, density, intensity }) {
  const materialRef = useRef(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  const { positions, phases } = useMemo(() => {
    const cols = Math.round(Math.sqrt(density * 1.6));
    const rows = Math.max(1, Math.round(density / cols));
    const positions = new Float32Array(cols * rows * 3);
    const phases = new Float32Array(cols * rows);
    let i = 0;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const px = (cols === 1 ? 0 : x / (cols - 1) - 0.5) * 15;
        const py = (rows === 1 ? 0 : y / (rows - 1) - 0.5) * 10;
        positions[i * 3] = px + (Math.random() - 0.5) * 0.15;
        positions[i * 3 + 1] = py + (Math.random() - 0.5) * 0.15;
        positions[i * 3 + 2] = 0;
        phases[i] = Math.random() * Math.PI * 2;
        i++;
      }
    }
    return { positions, phases };
  }, [density]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(999, 999, 0) },
      uIntensity: { value: intensity },
      uPixelRatio: { value: 1 },
      uBaseColor: { value: new THREE.Color("#5b6b7f") },
      uAccentColor: { value: new THREE.Color(accent) },
    }),
    [accent, intensity]
  );

  useFrame(({ clock, pointer, camera, gl }) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, target)) {
      material.uniforms.uMouse.value.copy(target);
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Full-bleed decorative WebGL background. Renders behind foreground content
 * (caller is responsible for z-index/stacking) so it never intercepts clicks —
 * it's positioned under the UI, not made pointer-events:none, because R3F's
 * pointer tracking listens on the canvas element itself and needs real events
 * to compute the cursor-glow uniform.
 */
export default function ScannerField({ className = "", accent = "#ff5d3a", density = 900, intensity = 1 }) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.75]}
      >
        <ScannerParticles accent={accent} density={density} intensity={intensity} />
      </Canvas>
    </div>
  );
}
