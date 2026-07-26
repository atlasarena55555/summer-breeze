import { useMemo } from 'react';
import * as THREE from 'three';


export function Frog({
    color = "#ffd700",
    scale = 1,
    ...props
}) {

    const frog = useMemo(() => {

        const frogShape = [];
        const frogBody = [];
        const frogBackLegs = [];
        const frogFrontLegs = [];

        function addPart(geometry: THREE.BufferGeometry, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
            const mesh = new THREE.Mesh(geometry);
            mesh.position.set(...position);
            mesh.rotation.set(...rotation);
            frogShape.push(mesh);
            return mesh;
        }

        // Body
        const body = addPart(
            new THREE.BoxGeometry(1.8, 0.8, 1.5), [0, 0, 0]
        );
        frogBody.push(body);

        // Head
        const head = addPart(
            new THREE.BoxGeometry(1.3, 0.55, 1.15), [0, 0.45, 0.2]
        );
        frogBody.push(head);

        // Front Feet
        const lf = addPart(
            new THREE.BoxGeometry(0.28, 0.25, 0.55),
            [-0.6, -0.38, 0.55],
            [0.35, 0, 0]
        );
        frogFrontLegs.push(lf);
        const rf = addPart(
            new THREE.BoxGeometry(0.28, 0.25, 0.55),
            [0.6, -0.38, 0.55],
            [0.35, 0, 0]
        );
        frogFrontLegs.push(rf);

        // Back Feet
        const lb = addPart(
            new THREE.BoxGeometry(0.38, 0.25, 0.9),
            [-0.72, -0.35, -0.45],
            [-0.45, 0.3, 0]
        );
        frogBackLegs.push(lb);
        
        const rb = addPart(
            new THREE.BoxGeometry(0.38, 0.25, 0.9),
            [0.72, -0.35, -0.45],
            [-0.45, -0.3, 0]
        );
        frogBackLegs.push(rb);

        frogShape.push({
            position: [0, -0.5, 0],
            rotation: [1.5, 0, 0]
        });

        return frogShape;
       
    }, []);

    return (
        <group {...props} scale={scale}>
            {frog.map((p, i) => (
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
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}