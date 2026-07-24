import { useMemo } from 'react';
import * as THREE from 'three';

export function Circle({
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
        const ring = new THREE.CylinderGeometry(0.6, 0.6);
        return ring;
    }, []);

    return (
        <group {...props} scale={scale}>
            {/* Main mesh */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    flatShading={false}
                    color={color}
                    roughness={1}
                    metalness={0.8}
                    emissive={color}
                    emissiveIntensity={connected ? 1 : 0}
                />
            </mesh>
        </group>
    );
}