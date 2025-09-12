// src/components/RoomList.jsx
import React from "react";

export default function RoomList({ layout = { rooms: [] }, onSelect }) {
  const rooms = layout.rooms || [];
  if (!rooms.length) return <div className="p-3 bg-white rounded">No rooms yet</div>;

  return (
    <div className="p-3 bg-white rounded shadow max-h-64 overflow-auto">
      <ul className="space-y-2">
        {rooms.map((r, i) => (
          <li key={r.name ?? i} className="flex items-center justify-between border-b pb-1">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-gray-600">pos: ({r.x}, {r.y}) • size: {r.size}</div>
            </div>
            <div>
              <button onClick={() => onSelect && onSelect(r)} className="px-2 py-1 bg-blue-600 text-white rounded">Select</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
