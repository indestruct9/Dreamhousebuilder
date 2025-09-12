// src/components/ThreeDViewer.jsx
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function RoomBox({ room, isSelected, onSelect }) {
  // room: { name, size, x, y }
  const size = Number(room.size) || 3;
  const x = Number(room.x) || 0;
  const y = Number(room.y) || 0;
  const position = [x + size / 2, 0.5, y + size / 2];

  return (
    <mesh
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect && onSelect(room);
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[size, 1, size]} />
      <meshStandardMaterial color={isSelected ? "#ff8c42" : "#cfcfcf"} />
    </mesh>
  );
}

export default function ThreeDViewer({ layout = { rooms: [] }, selectedRoomName, onSelectRoom }) {
  const rooms = layout.rooms || [];

  return (
    <div style={{ width: "100%", height: "480px", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
      <Canvas shadows camera={{ position: [12, 12, 12], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <OrbitControls />
        {/* ground */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>

        {rooms.map((room, i) => (
          <RoomBox
            key={room.name ?? i}
            room={room}
            isSelected={selectedRoomName === room.name}
            onSelect={onSelectRoom}
          />
        ))}
      </Canvas>
    </div>
  );
}
