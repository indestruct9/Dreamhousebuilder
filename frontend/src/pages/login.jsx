// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/login", { username, password });
      const token = res.data.token;
      const uname = res.data.username;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("username", uname);
        alert("Logged in as " + uname);
        nav("/dashboard");
      } else {
        alert("Login failed");
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded shadow">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="border p-2 w-full rounded" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="border p-2 w-full rounded" />
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? "Logging in..." : "Login"}
          </button>
          <Link to="/register" className="px-4 py-2 bg-gray-200 rounded">Register</Link>
        </div>
      </form>
    </div>
  );
}
