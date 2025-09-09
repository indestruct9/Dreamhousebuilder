import React from "react";
import { Link } from "react-router-dom";

export default function Home(){
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">🏠 Custom Dream House AI Builder</h1>
      <p className="mb-6 max-w-xl text-center">
        Describe your dream home and get an instant layout suggestion.
      </p>
      <div className="space-x-4">
        <Link to="/editor" className="px-6 py-2 bg-blue-600 text-white rounded">Start Designing</Link>
        <Link to="/dashboard" className="px-6 py-2 border rounded">My Projects</Link>
      </div>
    </div>
  );
}
