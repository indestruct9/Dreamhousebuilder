// src/components/ThreeDViewer.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * ThreeDViewer
 * Props:
 *  - layout: { rooms: [ {name, size, x, y, rotation? , scale? } ] }
 *  - selectedRoomName
 *  - onSelectRoom(name)
 *  - onTransformEnd(name, { x, y, rotationY, scale })
 *  - mode: "translate" | "rotate" | "scale"
 *  - snap: number (optional) - grid snap size in same units as x,y
 *
 * Exposes:
 *  - capture(): returns dataURL PNG of canvas via ref
 */

const SceneInner = forwardRef(({ layout, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0 }, ref) => {
  const { gl, scene, camera } = useThree();
  const transformRef = useRef();
  const groupRefs = useRef({}); // name -> group object3D

  // expose capture() up to outer ref
  useImperativeHandle(ref, () => ({
    capture: () => {
      try {
        // ensure a final render
        gl.render(scene, camera);
      } catch (e) {}
      return gl.domElement.toDataURL("image/png");
    },
  }), [gl, scene, camera]);

  // When selection changes or transformRef created, attach events to control
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    // objectChange fires continuously while transforming
    const onObjectChange = () => {
      // live updates not pushed here; we wait until interaction ends
    };

    // mouseUp indicates the user finished the transform
    const onMouseUp = () => {
      if (!selectedRoomName) return;
      const grp = groupRefs.current[selectedRoomName];
      if (!grp) return;
      // grp.position is center position; convert to top-left x,y in layout coordinate system:
      const roomDef = (layout.rooms || []).find((r) => r.name === selectedRoomName);
      const size = Number(roomDef?.size) || 3;
      // center -> top-left:
      const newX = Number((grp.position.x - size / 2).toFixed(3));
      const newY = Number((grp.position.z - size / 2).toFixed(3));
      const rotationY = Number((grp.rotation.y || 0).toFixed(5));
      const scale = Number((grp.scale.x || 1).toFixed(5));
      // optional snapping
      const snapTo = (v) => (snap ? Math.round(v / snap) * snap : v);
      onTransformEnd && onTransformEnd(selectedRoomName, {
        x: snapTo(newX),
        y: snapTo(newY),
        rotationY,
        scale,
      });
    };

    controls.addEventListener("objectChange", onObjectChange);
    controls.addEventListener("mouseUp", onMouseUp);

    return () => {
      controls.removeEventListener("objectChange", onObjectChange);
      controls.removeEventListener("mouseUp", onMouseUp);
    };
  }, [transformRef, selectedRoomName, layout, onTransformEnd, snap]);

  // Keep the group positions in sync with layout when layout changes externally
  useEffect(() => {
    (layout.rooms || []).forEach((r) => {
      const g = groupRefs.current[r.name];
      if (g) {
        const size = Number(r.size) || 3;
        g.position.set(Number(r.x) + size / 2, 0, Number(r.y) + size / 2);
        if (typeof r.rotationY !== "undefined") g.rotation.set(0, r.rotationY, 0);
        if (typeof r.scale !== "undefined") g.scale.set(r.scale, r.scale, r.scale);
      }
    });
  }, [layout]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight skyColor={"#bde0ff"} groundColor={"#444"} intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <Grid args={[100, 100]} cellColor="#2b2b2b" sectionColor="#2b2b2b" position={[0, 0.001, 0]} />

      {/* Ground plane to receive pointer events if needed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#111" transparent opacity={0} />
      </mesh>

      {(layout.rooms || []).map((room) => {
        const size = Number(room.size) || 3;
        const centerX = Number(room.x) + size / 2;
        const centerZ = Number(room.y) + size / 2;
        const isSelected = selectedRoomName === room.name;

        // If selected, wrap the group in TransformControls so user can transform it
        const GroupContents = (
          <group
            key={room.name + "-group"}
            ref={(el) => (groupRefs.current[room.name] = el)}
            position={[centerX, 0, centerZ]}
          >
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectRoom && onSelectRoom(room.name);
              }}
            >
              <boxGeometry args={[size, 1, size]} />
              <meshStandardMaterial color={isSelected ? "#ff8c42" : "#2aa3ff"} roughness={0.5} metalness={0.1} />
            </mesh>
            <Html position={[0, 1.05, 0]} center>
              <div style={{ color: "white", background: "rgba(0,0,0,0.6)", padding: "3px 6px", borderRadius: 6, fontSize: 12 }}>
                {room.name}
              </div>
            </Html>
          </group>
        );

        return isSelected ? (
          <TransformControls
            key={room.name}
            ref={transformRef}
            mode={mode}
            showX
            showY
            showZ
            // disable pointer events propagation so OrbitControls doesn't fight
            onMouseDown={(e) => { e.stopPropagation(); }}
          >
            {GroupContents}
          </TransformControls>
        ) : (
          GroupContents
        );
      })}

      <OrbitControls />
    </>
  );
});

const ThreeDViewer = forwardRef(({ layout = { rooms: [] }, selectedRoomName, onSelectRoom, onTransformEnd, mode = "translate", snap = 0 }, ref) => {
  const innerRef = useRef();

  // forward capture
  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!innerRef.current) return null;
      return innerRef.current.capture();
    },
  }));

  return (
    <div style={{ width: "100%", height: "520px", borderRadius: 8, overflow: "hidden", background: "#111" }}>
      <Canvas shadows camera={{ position: [10, 12, 10], fov: 50 }}>
        <SceneInner ref={innerRef} layout={layout} selectedRoomName={selectedRoomName} onSelectRoom={onSelectRoom} onTransformEnd={onTransformEnd} mode={mode} snap={snap} />
      </Canvas>
    </div>
  );
});

export default ThreeDViewer;
