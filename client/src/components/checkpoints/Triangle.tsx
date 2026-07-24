import { useMemo } from 'react';
import * as THREE from 'three';

export function Triangle({
    color = "#8e44ad",
    scale = 1,
    connected = false,
    ...props
}: {
    color?: string;
    scale?: number;
    connected?: boolean;
} & any) {
    const geometry = useMemo(() => {
        const triangle = new THREE.ConeGeometry(0.6, 1.1);
        triangle.rotateX(1.5);
        triangle.rotateY(3.14);
        triangle.translate(0, 0, -0.11);
        return triangle;
    }, []);

    return (
        <group {...props} scale={scale}>
            {/* Main mesh */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={color}
                    roughness={1}
                    metalness={0.5}
                    emissive={color}
                    emissiveIntensity={connected ? 1 : 0}
                />
            </mesh>
        </group>
    );
}