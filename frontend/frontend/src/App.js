// src/App.js
import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState("cozy");
  const [bedrooms, setBedrooms] = useState(2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const talkToBackend = async () => {
    setErrorMsg("");
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/design`, {
        description,
        mood,
        bedrooms: Number(bedrooms) || 2,
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not reach backend. Is it running on 127.0.0.1:8000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>🏠 Custom Dream House AI Builder</h1>

      <label>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="e.g., modern family home with garden and big windows"
      />

      <label>Mood</label>
      <select value={mood} onChange={(e) => setMood(e.target.value)} style={{ width: "100%", marginBottom: 12 }}>
        <option value="cozy">cozy</option>
        <option value="modern">modern</option>
        <option value="eco">eco</option>
        <option value="luxury">luxury</option>
      </select>

      <label>Bedrooms</label>
      <input
        type="number"
        value={bedrooms}
        onChange={(e) => setBedrooms(e.target.value)}
        min={1}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <button onClick={talkToBackend} disabled={loading} style={{ padding: "10px 16px" }}>
        {loading ? "Thinking..." : "Generate Layout"}
      </button>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>Result</h2>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, overflowX: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>

          <h3>Rooms</h3>
          <ul>
            {result.rooms.map((r, i) => (
              <li key={i}>
                <strong>{r.name}</strong> — {r.size}m² at ({r.x}, {r.y})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
