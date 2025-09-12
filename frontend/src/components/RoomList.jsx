import React from "react";
import Room from "./Room";

const mockRooms = [
  { name: "Living Room", size: 250 },
  { name: "Bedroom", size: 180 },
  { name: "Kitchen", size: 120 },
];

export default function RoomList() {
  return (
    <div className="grid gap-4">
      {mockRooms.map((r, i) => (
        <Room key={i} name={r.name} size={r.size} />
      ))}
    </div>
  );
}
