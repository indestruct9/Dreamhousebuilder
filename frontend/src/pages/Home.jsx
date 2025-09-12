import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">🏡 DreamHouse AI Builder</h1>
      <p className="mt-4">Design your custom dream house using AI and 3D models.</p>
      <div className="mt-6 space-x-4">
        <Link to="/editor" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Editor</Link>
        <Link to="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg">Dashboard</Link>
      </div>
    </div>
  );
}
