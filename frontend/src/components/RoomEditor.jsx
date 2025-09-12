import React, { useState } from "react";

export default function RoomEditor() {
  const [room, setRoom] = useState({ name: "", size: "" });

  function handleChange(e) {
    setRoom({ ...room, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    alert(`Room added: ${JSON.stringify(room)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        name="name"
        placeholder="Room Name"
        value={room.name}
        onChange={handleChange}
        className="border p-2 w-full rounded"
      />
      <input
        name="size"
        placeholder="Room Size (sq ft)"
        value={room.size}
        onChange={handleChange}
        className="border p-2 w-full rounded"
      />
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Add Room</button>
    </form>
  );
}
