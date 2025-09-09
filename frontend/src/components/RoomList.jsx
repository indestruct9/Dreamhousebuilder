import React from "react";

export default function RoomList({ layout }) {
  // layout.rooms expected: [{ name, size, x, y }, ...]
  const rooms = layout?.rooms || [];
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Rooms</h3>
      <ul className="space-y-1">
        {rooms.map((r, i) => (
          <li key={i} className="border rounded p-2">
            <strong>{r.name}</strong> — size: {r.size || "N/A"} — pos: ({r.x},{r.y})
          </li>
        ))}
      </ul>
    </div>
  );
}
