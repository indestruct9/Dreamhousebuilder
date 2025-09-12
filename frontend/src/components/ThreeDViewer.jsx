// src/components/ThreeDViewer.jsx
import React, { useRef, useImperativeHandle, forwardRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Grid } from "@react-three/drei";
import * as THREE from "three";

const DragPlane = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};

const CanvasContent = forwardRef(({ layout, selectedRoomName, onSelectRoom, onMoveRoom }, ref) => {
  const { gl, camera, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const [dragging, setDragging] = useState(null); // room name
  const dragOffset = useRef([0, 0]); // offset inside room

  // Expose screenshot capture
  useImperativeHandle(
    ref,
    () => ({
      capture: () => {
        try {
          gl.render(scene, camera);
        } catch (e) {}
        return gl.domElement.toDataURL("image/png");
      },
    }),
    [gl, scene, camera]
  );

  const handlePointerDown = (e, room) => {
    e.stopPropagation();
    onSelectRoom && onSelectRoom(room.name);
    setDragging(room.name);

    // calculate offset inside box
    const intersect = e.intersections[0];
    if (intersect) {
      const point = intersect.point;
      dragOffset.current = [point.x - room.x, point.z - room.y];
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    // raycast to drag plane
    mouse.x = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      const [ox, oy] = dragOffset.current;
      const newX = intersectPoint.x - ox;
      const newY = intersectPoint.z - oy;
      onMoveRoom && onMoveRoom(dragging, newX, newY);
    }
  };

  useFrame(() => {}); // ensure rerender

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight skyColor={"#bde0ff"} groundColor={"#444"} intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <Grid args={[100, 100]} cellColor="#2b2b2b" sectionColor="#2b2b2b" position={[0, 0.001, 0]} />

      <DragPlane />

      {layout.rooms?.map((room) => {
        const size = Number(room.size) || 3;
        const centerX = room.x + size / 2;
        const centerZ = room.y + size / 2;
        return (
          <group key={room.name} position={[centerX, 0, centerZ]}>
            <mesh
              position={[0, 0.5, 0]}
              castShadow
              receiveShadow
              onPointerDown={(e) => handlePointerDown(e, room)}
              onPointerUp={handlePointerUp}
              onPointerMove={handlePointerMove}
            >
              <boxGeometry args={[size, 1, size]} />
              <meshStandardMaterial
                color={selectedRoomName === room.name ? "#ff8c42" : "#2aa3ff"}
                roughness={0.5}
                metalness={0.1}
              />
            </mesh>
            <Html position={[0, 1.05, 0]} center>
              <div
                style={{
                  color: "white",
                  background: "rgba(0,0,0,0.6)",
                  padding: "3px 6px",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                {room.name}
              </div>
            </Html>
          </group>
        );
      })}

      <OrbitControls />
    </>
  );
});

const ThreeDViewer = forwardRef(({ layout = { rooms: [] }, selectedRoomName, onSelectRoom, onMoveRoom }, ref) => {
  const innerRef = useRef();

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!innerRef.current) return null;
      return innerRef.current.capture();
    },
  }));

  return (
    <div
      style={{
        width: "100%",
        height: "520px",
        borderRadius: 8,
        overflow: "hidden",
        background: "#111",
      }}
    >
      <Canvas shadows camera={{ position: [10, 12, 10], fov: 50 }}>
        <CanvasContent
          ref={innerRef}
          layout={layout}
          selectedRoomName={selectedRoomName}
          onSelectRoom={onSelectRoom}
          onMoveRoom={onMoveRoom}
        />
      </Canvas>
    </div>
  );
});

export default ThreeDViewer;
