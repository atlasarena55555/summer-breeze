import { useMemo } from 'react';
import * as THREE from 'three';
import { ThickEdges } from './OutlineMaterial';

export function RegularPolygon({
    sides,
    color = "#8e44ad",
    scale = 1,
    connected = false,
    ...props
}: {
    sides: number;
    color?: string;
    scale?: number;
    connected?: boolean;
} & any) {
    const geometry = useMemo(() => {
        const safeSides = Math.max(3, Math.floor(sides));
        const shape = new THREE.Shape();
        const radius = 0.45;
        const startAngle = Math.PI / 2;

        for (let i = 0; i < safeSides; i++) {
            const angle = startAngle + (i * Math.PI * 2) / safeSides;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.15,
            bevelEnabled: true,
            bevelThickness: 0.025,
            bevelSize: 0.015,
            bevelSegments: 3
        });
        geo.center();
        return geo;
    }, [sides]);

    return (
        <group {...props} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.3}
                    metalness={0.65}
                    emissive={color}
                    emissiveIntensity={connected ? 0.8 : 0.12}
                />
            </mesh>
            <ThickEdges geometry={geometry} thresholdAngle={15} />
        </group>
    );
}
