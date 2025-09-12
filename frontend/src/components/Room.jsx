import React from "react";
import { Box } from "@react-three/drei";

const Room = ({ name, size, x, y }) => {
  return (
    <mesh position={[x, 0, y]}>
      <boxGeometry args={[size, 1, size]} />
      <meshStandardMaterial color="skyblue" />
    </mesh>
  );
};

export default Room;
