import React from "react";
import PreferenceForm from "../components/PreferenceForm";
import RoomEditor from "../components/RoomEditor";
import ThreeDViewer from "../components/ThreeDViewer";

export default function Editor() {
  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      <div>
        <h2 className="text-xl font-bold mb-4">User Preferences</h2>
        <PreferenceForm />
        <h2 className="text-xl font-bold mt-8 mb-4">Room Editor</h2>
        <RoomEditor />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">3D Viewer</h2>
        <ThreeDViewer />
      </div>
    </div>
  );
}
