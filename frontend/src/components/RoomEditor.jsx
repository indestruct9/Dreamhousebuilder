// src/components/RoomEditor.jsx
import React from "react";

export default function RoomEditor({ room, onChange, onDelete }) {
  if (!room) return <div className="p-3 text-sm text-gray-600">No room selected</div>;

  const handleField = (field) => (e) => {
    let value = e.target.value;
    if (field === "name") {
      onChange({ ...room, name: value });
      return;
    }
    // numeric fields
    const num = parseFloat(value);
    onChange({ ...room, [field]: Number.isFinite(num) ? num : 0 });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <label className="block text-sm font-medium mb-1">Name</label>
      <input value={room.name} onChange={handleField("name")} className="w-full border px-2 py-1 mb-3" />

      <label className="block text-sm font-medium mb-1">Size (m)</label>
      <input type="number" step="0.1" value={room.size} onChange={handleField("size")} className="w-full border px-2 py-1 mb-3" />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">X</label>
          <input type="number" step="0.1" value={room.x} onChange={handleField("x")} className="w-full border px-2 py-1" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Y</label>
          <input type="number" step="0.1" value={room.y} onChange={handleField("y")} className="w-full border px-2 py-1" />
        </div>
      </div>

      <div className="mt-3">
        <button onClick={() => onDelete && onDelete(room.name)} className="px-3 py-1 bg-red-600 text-white rounded">
          Delete Room
        </button>
      </div>
    </div>
  );
}
