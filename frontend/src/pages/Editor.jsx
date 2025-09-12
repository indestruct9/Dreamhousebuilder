// src/pages/Editor.jsx
import React, { useEffect, useRef, useState } from "react";
import PreferenceForm from "../components/PreferenceForm";
import ThreeDViewer from "../components/ThreeDViewer";
import RoomList from "../components/RoomList";
import RoomEditor from "../components/RoomEditor";
import api from "../services/api";

export default function Editor() {
  const [layout, setLayout] = useState(null);
  const [selected, setSelected] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  const viewerRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("loadedLayout");
    const storedId = localStorage.getItem("loadedProjectId");
    if (stored) {
      try {
        setLayout(JSON.parse(stored));
        localStorage.removeItem("loadedLayout");
      } catch (e) {}
    }
    if (storedId) {
      setProjectId(storedId);
      localStorage.removeItem("loadedProjectId");
    }
  }, []);

  const handleGenerated = (newLayout) => {
    setLayout(newLayout);
    setSelected(null);
    setProjectId(null);
    setThumbnailUrl(null);
  };

  const handleSelectRoom = (roomOrName) => {
    const name = typeof roomOrName === "string" ? roomOrName : roomOrName.name;
    setSelected(name);
  };

  const handleUpdateRoom = (updatedRoom) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => (r.name === updatedRoom.name ? updatedRoom : r));
      return { ...prev, rooms };
    });
  };

  const handleRoomChange = (updatedRoom) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => (r.name === updatedRoom.name ? updatedRoom : r));
      return { ...prev, rooms };
    });
  };

  const handleDeleteRoom = (name) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.filter((r) => r.name !== name);
      setSelected(null);
      return { ...prev, rooms };
    });
  };

  const handleAddRoom = (room) => {
    setLayout((prev) => {
      const rlist = prev?.rooms ? [...prev.rooms] : [];
      let base = room.name || "Room";
      let suffix = 1;
      let nm = base;
      while (rlist.some((rr) => rr.name === nm)) {
        suffix += 1;
        nm = `${base} ${suffix}`;
      }
      const newRoom = { ...room, name: nm };
      return { rooms: [...rlist, newRoom], meta: prev?.meta || {} };
    });
  };

  // Save project: capture screenshot, then POST to backend with thumbnail
  const handleSaveProject = async () => {
    if (!layout) return alert("No layout to save.");
    const name = prompt("Project name:", (layout?.meta?.description || "My Project"));
    if (!name) return;

    // Capture screenshot (PNG base64)
    let thumbnail = null;
    try {
      if (viewerRef.current && typeof viewerRef.current.capture === "function") {
        thumbnail = viewerRef.current.capture(); // data:image/png;base64,...
      }
    } catch (e) {
      console.warn("Capture failed:", e);
    }

    try {
      if (projectId) {
        await api.put(`/projects/${projectId}`, { name, layout, thumbnail });
        alert("Project updated.");
      } else {
        const res = await api.post("/save-project", { name, layout, thumbnail });
        setProjectId(res.data.id);
        alert("Saved. id: " + res.data.id);
      }
      // preview thumbnail if present
      if (thumbnail) {
        setThumbnailUrl(thumbnail);
      }
    } catch (err) {
      console.error(err);
      alert("Save failed. Check backend console.");
    }
  };

  // Download layout JSON locally
  const handleExportJSON = () => {
    if (!layout) return alert("No layout to export");
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (layout.meta?.description || "layout") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h2 className="text-lg font-bold">Preferences</h2>
        <PreferenceForm onGenerated={handleGenerated} />

        <div className="mt-4">
          <h3 className="font-semibold">Add Room</h3>
          <AddRoomForm onAdd={(r) => handleAddRoom(r)} />
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleSaveProject} className="px-3 py-1 bg-blue-600 text-white rounded">Save Project (with thumbnail)</button>
          <button onClick={handleExportJSON} className="px-3 py-1 bg-gray-600 text-white rounded">Export JSON</button>
        </div>

        {thumbnailUrl && (
          <div className="mt-4">
            <h3 className="font-semibold">Thumbnail Preview</h3>
            <img src={thumbnailUrl} alt="thumbnail" style={{ width: "100%", borderRadius: 6, border: "1px solid #ddd" }} />
          </div>
        )}
      </div>

      <div className="col-span-1">
        <h2 className="text-lg font-bold mb-2">3D Viewer</h2>
        <ThreeDViewer ref={viewerRef} layout={layout || { rooms: [] }} selectedRoomName={selected} onSelectRoom={handleSelectRoom} />
      </div>

      <div className="col-span-1 space-y-4">
        <h2 className="text-lg font-bold">Rooms</h2>
        <RoomList layout={layout || { rooms: [] }} onSelect={(r) => handleSelectRoom(r)} />
        <div className="mt-4">
          <h3 className="font-semibold">Editor</h3>
          <RoomEditor room={(layout?.rooms || []).find((r) => r.name === selected)} onChange={handleRoomChange} onDelete={handleDeleteRoom} />
        </div>
      </div>
    </div>
  );
}

function AddRoomForm({ onAdd }) {
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState(3);
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);

  const submit = (e) => {
    e.preventDefault();
    const room = { name: name || "Room", size: Number(size) || 3, x: Number(x) || 0, y: Number(y) || 0 };
    onAdd && onAdd(room);
    setName("");
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <input placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} className="border p-1 w-full" />
      <input placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} className="border p-1 w-full" />
      <div className="flex gap-2">
        <input placeholder="X" value={x} onChange={(e) => setX(e.target.value)} className="border p-1 w-1/2" />
        <input placeholder="Y" value={y} onChange={(e) => setY(e.target.value)} className="border p-1 w-1/2" />
      </div>
      <button className="px-3 py-1 bg-green-600 text-white rounded" type="submit">Add Room</button>
    </form>
  );
}
