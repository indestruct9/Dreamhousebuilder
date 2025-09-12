import React from "react";
import RoomList from "../components/RoomList";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Designs</h1>
      <RoomList />
    </div>
  );
}
