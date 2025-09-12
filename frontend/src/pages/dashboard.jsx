import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard({ onOpen, onNew }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <button
        onClick={onNew}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        + New Project
      </button>

      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="p-2 border rounded flex justify-between items-center"
          >
            <span>{p.name}</span>
            <button
              onClick={() => onOpen(p)}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
