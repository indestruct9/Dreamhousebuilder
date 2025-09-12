// src/components/RoomEditor.jsx
import React from "react";

export default function RoomEditor({ room, onChange, onDelete }) {
  if (!room) return <div className="p-3 text-sm">No room selected</div>;

  const handle = (field) => (e) => {
    const val = e.target.value;
    if (field === "name") {
      onChange && onChange({ ...room, name: val });
    } else {
      const num = parseFloat(val);
      onChange && onChange({ ...room, [field]: Number.isFinite(num) ? num : 0 });
    }
  };

  return (
    <div className="p-3 bg-white rounded shadow">
      <label className="block text-sm font-medium">Name</label>
      <input className="border p-1 w-full mb-2" value={room.name} onChange={handle("name")} />

      <label className="block text-sm font-medium">Size (m)</label>
      <input className="border p-1 w-full mb-2" value={room.size} onChange={handle("size")} />

      <label className="block text-sm font-medium">X</label>
      <input className="border p-1 w-full mb-2" value={room.x} onChange={handle("x")} />

      <label className="block text-sm font-medium">Y</label>
      <input className="border p-1 w-full mb-2" value={room.y} onChange={handle("y")} />

      <div className="flex gap-2">
        <button
          className="px-3 py-1 bg-red-600 text-white rounded"
          onClick={() => onDelete && onDelete(room.name)}
        >Delete Room</button>
      </div>
    </div>
  );
}
