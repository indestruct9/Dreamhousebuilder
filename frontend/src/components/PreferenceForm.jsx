import React, { useState } from "react";
import api from "../services/api";

export default function PreferenceForm({ setLayout }) {
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState("cozy");
  const [bedrooms, setBedrooms] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        description,
        mood,
        bedrooms: Number(bedrooms)
      };
      const res = await api.post("/design", payload);
      // expect backend to return JSON layout e.g. { rooms: [...], positions: [...] }
      setLayout(res.data);
    } catch (err) {
      console.error("Request failed:", err);
      alert("Failed to get design. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
      <div>
        <label className="block text-sm font-medium">Describe your dream house</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., modern 3BHK with garden and study"
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block text-sm">Mood</label>
          <select value={mood} onChange={(e)=>setMood(e.target.value)} className="mt-1 border rounded px-2 py-1">
            <option value="cozy">Cozy</option>
            <option value="modern">Modern</option>
            <option value="eco">Eco-friendly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Bedrooms</label>
          <input type="number" min="1" max="10" value={bedrooms} onChange={(e)=>setBedrooms(e.target.value)} className="mt-1 w-24 border rounded px-2 py-1"/>
        </div>
      </div>

      <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
        {loading ? "Generating..." : "Generate Layout"}
      </button>
    </form>
  );
}
