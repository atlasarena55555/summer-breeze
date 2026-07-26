import { useMemo } from "react";
import * as THREE from "three";

export function GenerativeShape({
  color = "#8e44ad",
  scale = 1,
  connected = false,
  checkpoint_num,
  ...props
}: {
  color?: string;
  scale?: number;
  connected?: boolean;
} & any) {
  const geometry = useMemo(() => {
    // Draw shape with sides based on checkpoint num
    const shapeDraw = new THREE.Shape();
    const radius = 1;
    const sides = checkpoint_num;

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
    const shapeGeo = new THREE.ShapeGeometry(shapeDraw);
    return shapeGeo;

  }, []);

  return (
    <group {...props} scale={scale}>
      {/* Main mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
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
