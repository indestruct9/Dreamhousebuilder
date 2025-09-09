import React, { useState } from "react";
import PreferenceForm from "../components/PreferenceForm";
import RoomList from "../components/RoomList";
import ThreeDViewer from "../components/ThreeDViewer";

export default function Editor(){
  const [layout, setLayout] = useState(null); // layout JSON from backend

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Design your dream house</h2>
      <PreferenceForm setLayout={setLayout} />
      {layout && (
        <div className="grid md:grid-cols-2 gap-6">
          <RoomList layout={layout} />
          <ThreeDViewer layout={layout} />
        </div>
      )}
    </div>
  );
}
