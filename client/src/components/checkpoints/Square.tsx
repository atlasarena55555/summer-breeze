import { useMemo } from 'react';
import * as THREE from 'three';

export function Square({
    color = "#8e44ad",
    scale = 1,
    connected = false,
    ...props
}: {
    color?: string;
    scale?: number;
    connected?: boolean;
} & any) {
    const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1, 6, 6, 6), []);

    return (
        <group {...props} scale={scale}>
            {/* Main mesh */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={color}
                    roughness={1}
                    metalness={0.7}
                    emissive={color}
                    emissiveIntensity={connected ? 1 : 0}
                />
            </mesh>
        </group>
    );
}