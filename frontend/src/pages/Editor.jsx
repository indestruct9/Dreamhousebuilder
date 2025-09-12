import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import api from "../services/api";

export default function Editor({ layout, onBack }) {
  const handleSave = async () => {
    const name = prompt("Project name:");
    if (!name) return;
    const res = await api.post("/save-project", { name, layout });
    alert("Saved with ID: " + res.data.id);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Editor</h1>

      <div className="w-full h-96 border mb-4">
        <Canvas camera={{ position: [5, 5, 5] }}>
          <ambientLight />
          <OrbitControls />
          {layout?.rooms?.map((room, i) => (
            <mesh key={i} position={[i * 2, 0, 0]}>
              <boxGeometry args={[2, 1, 2]} />
              <meshStandardMaterial color={"lightblue"} />
            </mesh>
          ))}
        </Canvas>
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Project
      </button>
      <button
        onClick={onBack}
        className="ml-2 bg-gray-400 text-white px-4 py-2 rounded"
      >
        Back
      </button>
    </div>
  );
}
