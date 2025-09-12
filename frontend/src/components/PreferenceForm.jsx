import { useState } from "react";
import api from "../services/api";

export default function PreferenceForm({ onBack, onNext }) {
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState("cozy");
  const [bedrooms, setBedrooms] = useState(2);

  const handleGenerate = async () => {
    const res = await api.post("/design", { description, mood, bedrooms });
    onNext(res.data);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">New Project</h1>

      <div className="mb-2">
        <label>Description:</label>
        <input
          className="border p-2 w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label>Mood:</label>
        <input
          className="border p-2 w-full"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label>Bedrooms:</label>
        <input
          type="number"
          className="border p-2 w-full"
          value={bedrooms}
          onChange={(e) => setBedrooms(Number(e.target.value))}
        />
      </div>

      <button
        onClick={handleGenerate}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Generate Layout
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
