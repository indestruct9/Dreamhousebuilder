// src/pages/Editor.jsx
import React, { useEffect, useRef, useState } from "react";
import PreferenceForm from "../components/PreferenceForm";
import ThreeDViewer from "../components/ThreeDViewer";
import RoomList from "../components/RoomList";
import RoomEditor from "../components/RoomEditor";
import api from "../services/api";

/**
 * Editor with:
 * - history stack (undo / redo)
 * - export floorplan SVG
 * - integrates with ThreeDViewer via onTransformEnd (or onMoveRoom)
 *
 * Note: this file intentionally keeps the same external API used earlier.
 */

export default function Editor() {
  const [layout, setLayout] = useState(null);
  const [selected, setSelected] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [saved, setSaved] = useState(false);

  // transform controls
  const [transformMode, setTransformMode] = useState("translate");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const snapSize = 0.25;

  const viewerRef = useRef(null);

  // history stacks in refs (so they don't trigger re-renders)
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const initialLoadRef = useRef(true);

  // Load stored layout (from Dashboard open or localStorage)
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
    // mark initial load finished on next tick
    setTimeout(() => (initialLoadRef.current = false), 10);
  }, []);

  // Utility: deep clone layout
  const cloneLayout = (l) => (l ? JSON.parse(JSON.stringify(l)) : { rooms: [], meta: {} });

  // Push to history (internal)
  const pushHistory = (prev) => {
    if (!prev) return;
    undoStackRef.current.push(cloneLayout(prev));
    // limit history size
    if (undoStackRef.current.length > 100) undoStackRef.current.shift();
    // clearing redo stack on new change
    redoStackRef.current = [];
  };

  // Wrapper to set layout and push history (unless skipHistory true)
  const setLayoutWithHistory = (updater, { skipHistory = false } = {}) => {
    setLayout((prev) => {
      if (!skipHistory && !initialLoadRef.current) {
        pushHistory(prev);
      }
      const next = typeof updater === "function" ? updater(prev || { rooms: [], meta: {} }) : updater;
      return next;
    });
  };

  // Undo
  const undo = () => {
    const undoStack = undoStackRef.current;
    if (!undoStack.length) {
      return alert("Nothing to undo");
    }
    setLayout((current) => {
      // push current to redo
      redoStackRef.current.push(cloneLayout(current));
      const prev = undoStack.pop();
      return prev;
    });
  };

  // Redo
  const redo = () => {
    const redoStack = redoStackRef.current;
    if (!redoStack.length) {
      return alert("Nothing to redo");
    }
    setLayout((current) => {
      // push current to undo
      undoStackRef.current.push(cloneLayout(current));
      const next = redoStack.pop();
      return next;
    });
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z and Ctrl/Cmd+Y
  useEffect(() => {
    const onKey = (e) => {
      const z = e.key.toLowerCase() === "z";
      const y = e.key.toLowerCase() === "y";
      if ((e.ctrlKey || e.metaKey) && z) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && y) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Handlers using setLayoutWithHistory so they are undoable ----

  const handleGenerated = (newLayout) => {
    // generation is a big change; treat it as a new root — skip pushing prior state
    setLayoutWithHistory(() => newLayout, { skipHistory: true });
    setSelected(null);
    setProjectId(null);
    setThumbnailUrl(null);
  };

  const handleSelectRoom = (roomOrName) => {
    const name = typeof roomOrName === "string" ? roomOrName : roomOrName?.name;
    setSelected(name);
  };

  // On transform end from ThreeDViewer (move/rotate/scale complete)
  const handleTransformEnd = (roomName, { x, y, rotationY, scale }) => {
    setLayoutWithHistory((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) =>
        r.name === roomName ? { ...r, x: Number(x), y: Number(y), rotationY: rotationY ?? r.rotationY, scale: scale ?? r.scale ?? 1 } : r
      );
      return { ...prev, rooms };
    });
  };

  const handleRoomChange = (updatedRoom) => {
    setLayoutWithHistory((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => (r.name === updatedRoom.name ? updatedRoom : r));
      return { ...prev, rooms };
    });
  };

  const handleDeleteRoom = (name) => {
    setLayoutWithHistory((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.filter((r) => r.name !== name);
      setSelected(null);
      return { ...prev, rooms };
    });
  };

  const handleAddRoom = (room) => {
    setLayoutWithHistory((prev) => {
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
      if (thumbnail) setThumbnailUrl(thumbnail);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Save failed. Check backend console.");
    }
  };

  // Export layout JSON locally
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

  // ---------------- Floorplan SVG export ----------------
  const createFloorplanSVGString = (layoutObj) => {
    if (!layoutObj || !layoutObj.rooms || !layoutObj.rooms.length) return "";

    const rooms = layoutObj.rooms;
    // compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rooms.forEach((r) => {
      const x1 = Number(r.x);
      const y1 = Number(r.y);
      const s = Number(r.size) || 1;
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x1 + s);
      maxY = Math.max(maxY, y1 + s);
    });
    if (!isFinite(minX)) {
      minX = 0; minY = 0; maxX = 10; maxY = 10;
    }

    const padding = 20; // px
    const pxPerUnit = 80; // pixels per meter / unit — adjust if you want bigger
    const width = Math.max(200, Math.ceil((maxX - minX) * pxPerUnit) + padding * 2);
    const height = Math.max(200, Math.ceil((maxY - minY) * pxPerUnit) + padding * 2);

    // helper to convert world coords to svg pixel coords
    const worldToSvgX = (x) => Math.round((x - minX) * pxPerUnit) + padding;
    const worldToSvgY = (y) => Math.round((y - minY) * pxPerUnit) + padding;

    // build rects
    let rects = "";
    rooms.forEach((r, idx) => {
      const s = Number(r.size) || 1;
      const sx = worldToSvgX(Number(r.x));
      const sy = worldToSvgY(Number(r.y));
      const sw = Math.max(1, Math.round(s * pxPerUnit));
      const sh = Math.max(1, Math.round(s * pxPerUnit));
      // rectangle and label
      rects += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="rgba(58, 141, 255, 0.12)" stroke="#2A8BFF" stroke-width="2" />`;
      // room name (centered)
      const textX = sx + sw / 2;
      const textY = sy + sh / 2;
      rects += `<text x="${textX}" y="${textY}" font-family="Arial" font-size="${Math.max(10, Math.round(pxPerUnit/6))}" fill="#0b1723" text-anchor="middle" dominant-baseline="middle">${escapeXml(r.name)}</text>`;
      // size text bottom-left
      rects += `<text x="${sx + 6}" y="${sy + sh - 6}" font-family="Arial" font-size="10" fill="#243444" >${s} m</text>`;
    });

    // scale legend
    const scaleText = `Scale: 1 unit = 1 m, ${pxPerUnit}px per m`;
    const title = layoutObj.meta?.description || "Floorplan";

    const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 60}" viewBox="0 0 ${width} ${height + 60}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g transform="translate(0,0)">
    <text x="${padding}" y="${padding - 4}" font-family="Arial" font-size="18" fill="#0b1723">${escapeXml(title)}</text>
    ${rects}
    <text x="${padding}" y="${height + 30}" font-family="Arial" font-size="12" fill="#444">${escapeXml(scaleText)}</text>
  </g>
</svg>`;
    return svg;
  };

  // helper to escape XML content for svg
  const escapeXml = (unsafe) => {
    if (!unsafe && unsafe !== 0) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const handleExportSVG = () => {
    if (!layout) return alert("Nothing to export");
    const svgString = createFloorplanSVGString(layout);
    if (!svgString) return alert("Cannot generate SVG for empty layout.");
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (layout.meta?.description || "floorplan") + ".svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------- render UI ----------------
  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h2 className="text-lg font-bold">Preferences</h2>
        <PreferenceForm onGenerated={handleGenerated} />

        <div className="mt-4">
          <h3 className="font-semibold">Add Room</h3>
          <AddRoomForm onAdd={(r) => handleAddRoom(r)} />
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Transform Controls</h3>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setTransformMode("translate")} className={`px-2 py-1 rounded ${transformMode === "translate" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Move</button>
            <button onClick={() => setTransformMode("rotate")} className={`px-2 py-1 rounded ${transformMode === "rotate" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Rotate</button>
            <button onClick={() => setTransformMode("scale")} className={`px-2 py-1 rounded ${transformMode === "scale" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Scale</button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
            <span className="text-sm">Snap to grid ({snapEnabled ? snapSize : "off"})</span>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleSaveProject} className="px-3 py-1 bg-blue-600 text-white rounded">Save Project (with thumbnail)</button>
          <button onClick={handleExportJSON} className="px-3 py-1 bg-gray-600 text-white rounded">Export JSON</button>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={undo} className="px-3 py-1 bg-yellow-500 text-white rounded">Undo (Ctrl/Cmd+Z)</button>
          <button onClick={redo} className="px-3 py-1 bg-yellow-500 text-white rounded">Redo (Ctrl/Cmd+Y)</button>
        </div>

        <div className="mt-3">
          <button onClick={handleExportSVG} className="px-3 py-1 bg-green-600 text-white rounded">Export 2D Floorplan (SVG)</button>
        </div>

        {thumbnailUrl && (
          <div className="mt-4">
            <h3 className="font-semibold">Thumbnail Preview</h3>
            <img src={thumbnailUrl} alt="thumbnail" style={{ width: "100%", borderRadius: 6, border: "1px solid #ddd" }} />
          </div>
        )}

        {saved && <div className="mt-2 text-green-600">Saved ✔</div>}
      </div>

      <div className="col-span-1">
        <h2 className="text-lg font-bold mb-2">3D Viewer</h2>
        <ThreeDViewer
          ref={viewerRef}
          layout={layout || { rooms: [] }}
          selectedRoomName={selected}
          onSelectRoom={handleSelectRoom}
          onTransformEnd={handleTransformEnd}
          mode={transformMode}
          snap={snapEnabled ? snapSize : 0}
        />
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

/* small AddRoomForm nested component */
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
