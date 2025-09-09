import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function RoomBox({ room }) {
  const { x = 0, y = 0, size = 3 } = room;
  // convert floor plan coordinates to 3D positions, y -> z in 3D
  return (
    <mesh position={[x + size/2, 0.5, y + size/2]}>
      <boxGeometry args={[size, 1, size]} />
      <meshStandardMaterial opacity={0.8} transparent />
    </mesh>
  );
}

export default function ThreeDViewer({ layout }) {
  const rooms = layout?.rooms || [];
  return (
    <div className="bg-white p-2 rounded shadow h-96">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <OrbitControls />
        {rooms.map((r, i) => <RoomBox key={i} room={r} />)}
      </Canvas>
    </div>
  );
}
