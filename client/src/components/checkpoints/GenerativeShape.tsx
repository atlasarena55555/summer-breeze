import { useMemo } from "react";
import * as THREE from "three";

export function GenerativeShape({
  color = "#8e44ad",
  scale = 1,
  connected = false,
  sides,
  ...props
}: {
  color?: string;
  scale?: number;
  connected?: boolean;
  sides?: number;
} & any) {
  const geometry = useMemo(() => {
    // Draw shape with sides based on checkpoint num
    const shapeDraw = new THREE.Shape();
    const radius = 0.62;

    // find vertices for sides
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        if (i === 0) {
            shapeDraw.moveTo(x, y);
        } else {
            shapeDraw.lineTo(x, y);
        }
    }
    shapeDraw.closePath();

    // Add to geometry
    const shapeGeo = new THREE.ExtrudeGeometry(shapeDraw);
    shapeGeo.rotateX(1.56);
    return shapeGeo;

  }, [sides]);

  return (
    <group {...props} scale={scale}>
      {/* Main mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          side={2}
          color={color}
          roughness={1}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={connected ? 1 : 0}
        />
      </mesh>
    </group>
  );
}
