import { useMemo } from 'react';
import * as THREE from 'three';


export function Flower02({
    color = "#ffd700",
    scale = 0.5,
    connected = false,
    ...props
}) {

    const petals = useMemo(() => {
        const petalShape = new THREE.Shape()
            .moveTo(0, 0)
            .quadraticCurveTo(-1.2, 2, 0, 1.4)
            .quadraticCurveTo(1.2, 2, 0, 0);

        const geo = new THREE.ExtrudeGeometry(petalShape, {
            depth: 0.2,
            bevelEnabled: false
        });

        const count = 2;
        const radius = 0;

        const meshes = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 3.5;

            meshes.push({
                position: [
                    -0.2,
                    Math.sin(angle) * radius,
                    0.4
                ],
                rotation: [1.3, 0, angle - Math.PI * 1.2],
                geometry: geo
            });
        }

        return meshes;
    }, []);

    return (
        <group {...props} scale={scale}>
            {petals.map((p, i) => (
                <group key={i}>
                    <mesh
                        geometry={p.geometry}
                        position={p.position}
                        rotation={p.rotation}
                    >
                        <meshStandardMaterial
                            color={color}
                            roughness={0.3}
                            metalness={0.6}
                            emissive={color}
                            emissiveIntensity={connected ? 1 : 0}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}