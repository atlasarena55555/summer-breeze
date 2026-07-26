import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getPlayerPalette,
  toUpperId,
  type PlayerColorLower,
} from "@/constants/playerColors";
import { CyberRing } from "./CyberRing";

type PlayerProps = {
  color?: PlayerColorLower;
  position?: [number, number, number];
  rotation?: number; // Y-axis rotation in radians
  isMe?: boolean;
  /** Multiplier for the floor CyberRing glow (e.g. tutorial spotlight). */
  ringGlowBoost?: number;
  scale?: number;
};

const JUMP_DURATION = 0.3;
const JUMP_HEIGHT = 3;

export function FrogPlayer({
  color = "green",
  position = [0, 0, 0],
  rotation = 0,
  isMe = false,
  ringGlowBoost = 1,
  scale = 0.75,
}: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const frogRef = useRef<THREE.Group>(null);
  const isFirstFrame = useRef(true);
  const previousPositionRef = useRef<[number, number, number]>([
    position[0],
    position[1],
    position[2],
  ]);
  const targetRotationRef = useRef(rotation);
  const jumpProgressRef = useRef(1);
  const positionX = position[0];
  const positionY = position[1];
  const positionZ = position[2];

  const frogShape = [];
  const frogBody = [];
  const frogBackLegs = [];
  const frogFrontLegs = [];

  const paletteHex = useMemo(() => {
    const p = getPlayerPalette(toUpperId(color));
    return { main: p.main, glow: p.glow, rim: p.rim };
  }, [color]);

  const colorPalette = useMemo(
    () => ({
      main: new THREE.Color(paletteHex.main),
      glow: new THREE.Color(paletteHex.glow),
      rim: new THREE.Color(paletteHex.rim),
    }),
    [paletteHex],
  );

  // Glass Shader for the Rounded Cube
  const glassMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: colorPalette.main },
        uRimColor: { value: colorPalette.rim },
        uTime: { value: 0 },
      },
      vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uRimColor;
                uniform float uTime;

                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vUv;

                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 viewDir = normalize(vViewPosition);

                    // Fresnel effect
                    float fresnel = 1.0 - max(0.0, dot(normal, viewDir));
                    fresnel = pow(fresnel, 4.0);

                    vec3 col = mix(uColor * 0.4, uRimColor, fresnel);
                    float alpha = 0.7 + fresnel * 0.3;

                    gl_FragColor = vec4(col, alpha);
                }
            `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  }, [colorPalette]);

  const frog = useMemo(() => {
    function addPart(
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
      material?: THREE.MeshStandardMaterial,
    ) {
      const mesh = new THREE.Mesh(
        geometry,
        material ??
          new THREE.MeshStandardMaterial({
            color: paletteHex.glow,
            roughness: 0.3,
            metalness: 0.6,
            emissive: color,
          }),
      );
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.userData.baseRotation = mesh.rotation.clone();
      mesh.userData.basePosition = mesh.position.clone();
      frogShape.push(mesh);
      return mesh;
    }

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: true,
    });

    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      flatShading: true,
    });

    // Body
    const body = addPart(new THREE.BoxGeometry(1.3, 0.8, 1.5), [0, 0, 0]);
    frogBody.push(body);

    // Head
    const head = addPart(
      new THREE.BoxGeometry(1.1, 0.55, 1.15),
      [0, 0.45, 0.2],
    );
    frogBody.push(head);

    // Eyes
    const eyeL = addPart(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      [-0.35, 0.78, 0.45],
      [0, 0, 0],
      eyeMaterial,
    );
    frogBody.push(eyeL);
    const eyeR = addPart(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      [0.35, 0.78, 0.45],
      [0, 0, 0],
      eyeMaterial,
    );
    frogBody.push(eyeR);
    const pupilL = addPart(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      [-0.35, 1.2, 0.59],
      [0, 0, 0],
      pupilMaterial,
    );
    frogBody.push(pupilL);
    const pupilR = addPart(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      [0.35, 1.2, 0.59],
      [0, 0, 0],
      pupilMaterial,
    );
    frogBody.push(pupilR);

    // Front Feet
    const lf = addPart(
      new THREE.BoxGeometry(0.28, 0.25, 0.55),
      [-0.6, -0.38, 0.55],
      [0.35, 0, 0],
    );
    frogFrontLegs.push(lf);
    const rf = addPart(
      new THREE.BoxGeometry(0.28, 0.25, 0.55),
      [0.6, -0.38, 0.55],
      [0.35, 0, 0],
    );
    frogFrontLegs.push(rf);

    // Back Feet
    const lb = addPart(
      new THREE.BoxGeometry(0.38, 0.25, 0.9),
      [-0.72, -0.35, -0.45],
      [-0.45, 0.3, 0],
    );
    frogBackLegs.push(lb);

    const rb = addPart(
      new THREE.BoxGeometry(0.38, 0.25, 0.9),
      [0.72, -0.35, -0.45],
      [-0.45, -0.3, 0],
    );
    frogBackLegs.push(rb);

    frogShape.push({
      position: [0, -0.5, 0],
      rotation: [1.5, 0, 0],
    });

    return frogShape;
  }, []);

  const onMove = useCallback((nextX: number, nextY: number, nextZ: number) => {
    const previousPosition = previousPositionRef.current;
    const deltaX = nextX - previousPosition[0];
    const deltaZ = nextZ - previousPosition[2];

    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaZ) > 0.001) {
      // The frog model faces +Z, so atan2 maps the movement vector directly
      // to the correct Y-axis rotation.
      targetRotationRef.current = Math.atan2(deltaX, deltaZ);
      jumpProgressRef.current = 0;
    }

    previousPositionRef.current = [nextX, nextY, nextZ];
  }, []);

  useEffect(() => {
    targetRotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    onMove(positionX, positionY, positionZ);
  }, [onMove, positionX, positionY, positionZ]);

  useFrame((_state, delta) => {
    // Smoothly lerp to target position and rotation
    if (groupRef.current) {
      if (isFirstFrame.current) {
        groupRef.current.position.set(position[0], position[1], position[2]);
        groupRef.current.rotation.y = rotation;
        isFirstFrame.current = false;
      } else {
        const lerpSpeed = 0.6;
        groupRef.current.position.x = THREE.MathUtils.lerp(
          groupRef.current.position.x,
          position[0],
          lerpSpeed,
        );
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          position[1],
          lerpSpeed,
        );
        groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          position[2],
          lerpSpeed,
        );

        // Turn via the shortest angle so left/right changes never cause a
        // nearly full spin.
        const angleDelta = Math.atan2(
          Math.sin(targetRotationRef.current - groupRef.current.rotation.y),
          Math.cos(targetRotationRef.current - groupRef.current.rotation.y),
        );
        groupRef.current.rotation.y += angleDelta * (1 - Math.exp(-18 * delta));
      }
    }

    if (frogRef.current) {

      // 0-1 hop cycle
      const hop = (Math.sin(2 * 4) + 1) * 0.5;

      // Body squashes slightly
      frogBody.forEach((part) => {
        part.scale.y = 1 - hop * 0.12;
        part.scale.x = 1 + hop * 0.08;
        part.scale.z = 1 + hop * 0.08;
      });

      // Back legs compress then extend
      frogBackLegs.forEach((leg) => {
        leg.rotation.x = leg.userData.baseRotation.x - hop * 0.8;
      });

      // Front legs move a little
      frogFrontLegs.forEach((leg) => {
        leg.rotation.x = leg.userData.baseRotation.x + hop * 0.25;
      });
    }
  });

  return (
    <group scale={scale} ref={groupRef}>
      <group ref={frogRef}>
        {frog.map((p, i) => (
          <group key={i}>
            <mesh
              geometry={p.geometry}
              material={p.material}
              position={p.position}
              rotation={p.rotation}
            />
          </group>
        ))}
      </group>

      <CyberRing
        color={paletteHex.glow}
        radius={1.4}
        innerOnly={!isMe}
        glowBoost={ringGlowBoost}
        position={[0, -0.8, 0]}
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat
      />
    </group>
  );
}
