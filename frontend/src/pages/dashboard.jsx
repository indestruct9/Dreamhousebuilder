// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard(){
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load projects. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (id) => {
    try {
      const res = await api.get(`/projects/${id}`);
      const layout = res.data.layout;
      // Use localStorage or navigate to editor with state
      localStorage.setItem("loadedLayout", JSON.stringify(layout));
      navigate("/editor");
      // Editor should read localStorage on mount to load project (see below)
    } catch (err) {
      console.error(err);
      alert("Failed to load project");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Saved Projects</h2>
      {loading ? <p>Loading...</p> : (
        projects.length === 0 ? <p>No saved projects yet.</p> : (
          <ul className="space-y-2">
            {projects.map(p => (
              <li key={p.id} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <strong>{p.name}</strong>
                  <div className="text-sm text-gray-600">{p.id}</div>
                </div>
                <div>
                  <button onClick={()=>openProject(p.id)} className="px-3 py-1 bg-green-600 text-white rounded">Open</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
