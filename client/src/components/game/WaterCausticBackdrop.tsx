/**
 * WaterCausticBackdrop — a subtle, animated water-light pattern around the
 * edges of the game viewport.
 *
 * It follows the same constraints as NebulaBackdrop:
 *   - gameplay stays clear in the center via an early fragment discard;
 *   - all work happens in the existing R3F Canvas;
 *   - the backdrop uses a matrix-free, screen-space quad;
 *   - the shader stays below the scene bloom threshold;
 *   - suspended motes scale down with the device performance tier.
 */

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityMul } from "@/lib/perfTier";

const MOTE_COUNT = Math.round(150 * getQualityMul());
const EDGE_FEATHER = 0.37;
const INTENSITY = 0.01;
const CAUSTIC_SCALE = 24;

// Kept deliberately muted so the game's existing bloom pass does not turn
// the backdrop into a bright halo.
const COLOR_DEEP = new THREE.Color("#06151d");
const COLOR_WATER = new THREE.Color("#174a55");
const COLOR_CAUSTIC = new THREE.Color("#6ab4b1");

const quadVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const quadFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uColorDeep;
  uniform vec3 uColorWater;
  uniform vec3 uColorCaustic;
  uniform float uEdgeFeather;
  uniform float uIntensity;
  uniform float uCausticScale;

  varying vec2 vUv;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise2(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 ease = local * local * (3.0 - 2.0 * local);

    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, ease.x), mix(c, d, ease.x), ease.y);
  }

  // Smooth noise bends the underlying wave interference so its contours
  // continually curl, split, and rejoin instead of forming polygonal cells.
  float organicCaustic(vec2 p, float t) {
    vec2 warpPoint = p * 0.48;
    vec2 noiseWarp = vec2(
      noise2(warpPoint + vec2(t * 0.07, -t * 0.05)),
      noise2(
        warpPoint +
        vec2(7.3, 2.8) +
        vec2(-t * 0.04, t * 0.06)
      )
    ) - 0.5;

    vec2 q = p + noiseWarp * 1.15;
    q += vec2(
      sin(q.y * 0.62 + t * 0.31) +
        sin((q.x + q.y) * 0.27 - t * 0.17),
      cos(q.x * 0.57 - t * 0.28) +
        sin((q.y - q.x) * 0.31 + t * 0.21)
    ) * 0.26;

    float bandA =
      sin(q.x * 1.46 + sin(q.y * 0.78 + t * 0.37) * 1.25);
    float bandB =
      sin(q.y * 1.52 - sin(q.x * 0.72 - t * 0.32) * 1.18);
    float diagonal = sin(
      (q.x + q.y) * 0.81 +
      sin((q.x - q.y) * 0.43 + t * 0.22) * 0.75
    );

    float distanceToFilament = abs(
      bandA + bandB * 0.86 + diagonal * 0.38
    );
    float core =
      1.0 - smoothstep(0.03, 0.15, distanceToFilament);
    float softGlow =
      1.0 - smoothstep(0.08, 0.38, distanceToFilament);

    return core * 0.72 + softGlow * 0.28;
  }

  void main() {
    // Rectangular edge weighting keeps the board and its immediate surround
    // visually quiet, independent of the canvas aspect ratio.
    float edgeDistance = min(
      min(vUv.x, 1.0 - vUv.x),
      min(vUv.y, 1.0 - vUv.y)
    );
    float frameBias =
      1.0 - smoothstep(0.0, uEdgeFeather, edgeDistance);

    // Skip both cellular evaluations for the center of the viewport.
    if (frameBias < 0.02) discard;

    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    p *= uCausticScale;

    float slowTime = uTime * 0.34;
    // Two rotated interference layers form irregular, flowing contours.
    // This uses only four value-noise evaluations per visible pixel and the
    // center discard above avoids even that cost around the game board.
    float largeWeb = organicCaustic(p, slowTime);
    mat2 detailRotation = mat2(0.80, -0.60, 0.60, 0.80);
    vec2 detailP =
      detailRotation * (p * 1.38) + vec2(4.2, -2.7);
    float detailWeb =
      organicCaustic(detailP, -slowTime * 0.72);
    float web = max(largeWeb, detailWeb * 0.62);
    float brightCore = pow(web, 2.4);

    // A broad, low-contrast shimmer prevents the space between filaments
    // from reading as empty black while remaining calm and water-like.
    float shimmer = 0.5 + 0.5 *
      sin(p.x * 0.63 + slowTime * 0.42) *
      cos(p.y * 0.78 - slowTime * 0.31);

    vec3 color = mix(uColorDeep, uColorWater, 0.18 + shimmer * 0.24);
    color = mix(color, uColorCaustic, web * 0.52 + brightCore * 0.28);
    color *= uIntensity;

    float density = frameBias * (0.24 + web * 0.56 + brightCore * 0.20);
    density = density * density * (3.0 - 2.0 * density);
    if (density < 0.003) discard;

    gl_FragColor = vec4(color, density * 0.92);
  }
`;

function WaterCausticQuad({
  intensity = INTENSITY,
}: {
  intensity?: number;
}) {
  const { size } = useThree();
  const targetIntensity = useRef(intensity);
  targetIntensity.current = intensity;

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uColorDeep: { value: COLOR_DEEP.clone() },
      uColorWater: { value: COLOR_WATER.clone() },
      uColorCaustic: { value: COLOR_CAUSTIC.clone() },
      uEdgeFeather: { value: EDGE_FEATHER },
      uIntensity: { value: intensity },
      uCausticScale: { value: CAUSTIC_SCALE },
    }),
    // Uniform objects must remain stable for the life of the material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value =
      ((uniforms.uTime.value as number) + delta) % 4096;
    uniforms.uAspect.value = size.width / Math.max(1, size.height);

    const current = uniforms.uIntensity.value as number;
    const smoothing = 1 - Math.exp(-delta * 5);
    uniforms.uIntensity.value =
      current + (targetIntensity.current - (current/4)) * smoothing;
  });

  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={quadVertex}
        fragmentShader={quadFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

const moteVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;

  uniform float uTime;

  varying float vAlpha;
  varying float vSeed;

  void main() {
    float riseSpeed = 0.003 + fract(aSeed * 9.7) * 0.008;
    float y = mod(position.y + 1.0 + uTime * riseSpeed, 2.0) - 1.0;
    float x = position.x +
      sin(uTime * 0.16 + aSeed * 31.0) *
      (0.008 + fract(aSeed * 4.3) * 0.012);
    x = mod(x + 1.0, 2.0) - 1.0;

    vec2 uv = vec2(x, y) * 0.5 + 0.5;
    float edgeDistance = min(
      min(uv.x, 1.0 - uv.x),
      min(uv.y, 1.0 - uv.y)
    );
    float edgeAlpha = 1.0 - smoothstep(0.03, 0.32, edgeDistance);

    vAlpha = edgeAlpha *
      (0.42 + 0.16 * sin(uTime * 0.55 + aSeed * 23.0));
    vSeed = aSeed;

    gl_Position = vec4(x, y, 0.998, 1.0);
    gl_PointSize = aSize;
  }
`;

const moteFragment = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vSeed;

  void main() {
    if (vAlpha < 0.01) discard;

    vec2 center = gl_PointCoord - 0.5;
    float distanceFromCenter = length(center);
    if (distanceFromCenter > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, distanceFromCenter);
    vec3 cool = vec3(0.42, 0.72, 0.73);
    vec3 pale = vec3(0.68, 0.79, 0.75);
    vec3 color = mix(cool, pale, fract(vSeed * 3.17));
    gl_FragColor = vec4(color * falloff * 0.42, falloff * vAlpha * 0.42);
  }
`;

function WaterMotesBackdrop() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const sizes = new Float32Array(MOTE_COUNT);
    const seeds = new Float32Array(MOTE_COUNT);

    for (let i = 0; i < MOTE_COUNT; i++) {
      positions[i * 3] = Math.random() * 2 - 1;
      positions[i * 3 + 1] = Math.random() * 2 - 1;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0.7 + Math.random() * 1.6;
      seeds[i] = Math.random();
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    result.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    result.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    result.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      10,
    );
    return result;
  }, []);

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value =
      ((uniforms.uTime.value as number) + delta) % 4096;
  });

  return (
    <points renderOrder={-999} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        vertexShader={moteVertex}
        fragmentShader={moteFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Drop-in replacement for NebulaBackdrop. `intensity` is optional and
 * smoothly interpolated so it can later be tied to live game state.
 */
export function WaterCausticBackdrop({
  intensity,
}: {
  intensity?: number;
} = {}) {
  return (
    <>
      <WaterCausticQuad intensity={intensity} />
      <WaterMotesBackdrop />
    </>
  );
}
