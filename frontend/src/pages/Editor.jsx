import React, { useState, useEffect } from "react";

export default function Editor() {
  const [layout, setLayout] = useState(null);

  // ✅ Load project from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("loadedLayout");
    if (stored) {
      try {
        setLayout(JSON.parse(stored));
        localStorage.removeItem("loadedLayout");
      } catch (e) {
        console.error("Failed to parse stored layout", e);
      }
    }
  }, []);

  // Placeholder: Render layout or empty state
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editor</h1>
      {layout ? (
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(layout, null, 2)}</pre>
      ) : (
        <p>No layout loaded yet. Generate one from the form or open from Dashboard.</p>
      )}
    </div>
  );
}
