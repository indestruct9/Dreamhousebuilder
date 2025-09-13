// src/pages/Editor.jsx
import React, { useEffect, useRef, useState } from "react";
import PreferenceForm from "../components/PreferenceForm";
import ThreeDViewer from "../components/ThreeDViewer";
import RoomList from "../components/RoomList";
import RoomEditor from "../components/RoomEditor";
import api from "../services/api";

/**
 * Day 13 Editor — includes Versions compare UI
 *
 * Full replacement for src/pages/Editor.jsx.
 * Works with backend Day12 endpoints:
 *  - GET /projects/{id}/versions
 *  - GET /projects/{id}/versions/{vid}
 *  - POST /projects/{id}/versions/{vid}/revert   (revert remains)
 *
 * Keep other components (PreferenceForm, ThreeDViewer, RoomList, RoomEditor) as-is.
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

  // Versions UI
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsList, setVersionsList] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewingVersion, setPreviewingVersion] = useState(null);

  // Compare UI states
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState(null);
  const [compareRightId, setCompareRightId] = useState(null);
  const [compareLeftLayout, setCompareLeftLayout] = useState(null);
  const [compareRightLayout, setCompareRightLayout] = useState(null);
  const [compareDiff, setCompareDiff] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const viewerRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const initialLoadRef = useRef(true);

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
    setTimeout(() => (initialLoadRef.current = false), 10);
  }, []);

  // ---------- History helpers ----------
  const cloneLayout = (l) => (l ? JSON.parse(JSON.stringify(l)) : { rooms: [], meta: {} });
  const pushHistory = (prev) => {
    if (!prev) return;
    undoStackRef.current.push(cloneLayout(prev));
    if (undoStackRef.current.length > 100) undoStackRef.current.shift();
    redoStackRef.current = [];
  };
  const setLayoutWithHistory = (updater, { skipHistory = false } = {}) => {
    setLayout((prev) => {
      if (!skipHistory && !initialLoadRef.current) {
        pushHistory(prev);
      }
      const next = typeof updater === "function" ? updater(prev || { rooms: [], meta: {} }) : updater;
      return next;
    });
  };

  const undo = () => {
    const undoStack = undoStackRef.current;
    if (!undoStack.length) {
      return alert("Nothing to undo");
    }
    setLayout((current) => {
      redoStackRef.current.push(cloneLayout(current));
      const prev = undoStack.pop();
      return prev;
    });
  };
  const redo = () => {
    const redoStack = redoStackRef.current;
    if (!redoStack.length) {
      return alert("Nothing to redo");
    }
    setLayout((current) => {
      undoStackRef.current.push(cloneLayout(current));
      const next = redoStack.pop();
      return next;
    });
  };

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
  }, []);

  // ---------- Core handlers ----------
  const handleGenerated = (newLayout) => {
    setLayoutWithHistory(() => newLayout, { skipHistory: true });
    setSelected(null);
    setProjectId(null);
    setThumbnailUrl(null);
  };

  const handleSelectRoom = (roomOrName) => {
    const name = typeof roomOrName === "string" ? roomOrName : roomOrName?.name;
    setSelected(name);
  };

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

  // ---------- Save / Export ----------
  const handleSaveProject = async () => {
    if (!layout) return alert("No layout to save.");
    const token = localStorage.getItem("token");
    if (!token) {
      const ok = confirm("You must be logged in to save a project. Go to Login page?");
      if (ok) window.location.href = "/login";
      return;
    }

    const name = prompt("Project name:", (layout?.meta?.description || "My Project"));
    if (!name) return;

    let thumbnail = null;
    try {
      if (viewerRef.current && typeof viewerRef.current.capture === "function") {
        thumbnail = viewerRef.current.capture();
      }
    } catch (e) {
      console.warn("Capture failed:", e);
    }

    try {
      if (projectId) {
        // update — backend will create a version snapshot before update
        await api.put(`/projects/${projectId}`, { name, layout, thumbnail });
        alert("Project updated.");
      } else {
        const res = await api.post("/save-project", { name, layout, thumbnail });
        setProjectId(res.data.id);
        alert("Saved. id: " + res.data.id);
      }
      if (thumbnail) setThumbnailUrl(thumbnail);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Save failed. Check backend console.");
    }
  };

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

  // Export SVG (floorplan) — same helper as before
  const createFloorplanSVGString = (layoutObj) => {
    if (!layoutObj || !layoutObj.rooms || !layoutObj.rooms.length) return "";
    const rooms = layoutObj.rooms;
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
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 10; maxY = 10; }
    const padding = 20; const pxPerUnit = 80;
    const width = Math.max(200, Math.ceil((maxX - minX) * pxPerUnit) + padding * 2);
    const height = Math.max(200, Math.ceil((maxY - minY) * pxPerUnit) + padding * 2);
    const worldToSvgX = (x) => Math.round((x - minX) * pxPerUnit) + padding;
    const worldToSvgY = (y) => Math.round((y - minY) * pxPerUnit) + padding;
    let rects = "";
    rooms.forEach((r) => {
      const s = Number(r.size) || 1;
      const sx = worldToSvgX(Number(r.x));
      const sy = worldToSvgY(Number(r.y));
      const sw = Math.max(1, Math.round(s * pxPerUnit));
      const sh = Math.max(1, Math.round(s * pxPerUnit));
      rects += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="rgba(58, 141, 255, 0.12)" stroke="#2A8BFF" stroke-width="2" />`;
      const textX = sx + sw / 2; const textY = sy + sh / 2;
      rects += `<text x="${textX}" y="${textY}" font-family="Arial" font-size="${Math.max(10, Math.round(pxPerUnit/6))}" fill="#0b1723" text-anchor="middle" dominant-baseline="middle">${escapeXml(r.name)}</text>`;
      rects += `<text x="${sx + 6}" y="${sy + sh - 6}" font-family="Arial" font-size="10" fill="#243444" >${s} m</text>`;
    });
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
  const escapeXml = (unsafe) => {
    if (!unsafe && unsafe !== 0) return "";
    return String(unsafe).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  // ---------- Versions: fetch, preview, revert ----------
  const fetchVersions = async () => {
    if (!projectId) {
      alert("Save project first to get versions.");
      return;
    }
    setLoadingVersions(true);
    try {
      const res = await api.get(`/projects/${projectId}/versions`);
      setVersionsList(res.data.versions || []);
      setVersionsOpen(true);
      // reset compare state
      setCompareMode(false);
      setCompareLeftId(null);
      setCompareRightId(null);
      setCompareLeftLayout(null);
      setCompareRightLayout(null);
      setCompareDiff(null);
    } catch (err) {
      console.error("Failed to fetch versions", err);
      alert(err?.response?.data?.detail || "Failed to fetch versions");
    } finally {
      setLoadingVersions(false);
    }
  };

  const previewVersion = async (vid) => {
    if (!projectId || !vid) return;
    try {
      const res = await api.get(`/projects/${projectId}/versions/${vid}`);
      const vdata = res.data;
      const proj = vdata.project;
      if (!proj) {
        alert("Invalid version data");
        return;
      }
      setPreviewingVersion(vid);
      setLayout(proj.layout);
      setSelected(null);
    } catch (err) {
      console.error("Preview failed", err);
      alert(err?.response?.data?.detail || "Failed to preview version");
    }
  };

  const cancelPreview = async () => {
    if (!projectId) {
      alert("No project to restore; reload.");
      setPreviewingVersion(null);
      return;
    }
    try {
      const res = await api.get(`/projects/${projectId}`);
      const proj = res.data;
      setLayout(proj.layout);
      setPreviewingVersion(null);
    } catch (err) {
      console.error("Failed to reload project after preview", err);
      alert("Failed to reload project. You may need to refresh the page.");
    }
  };

  const revertToVersion = async (vid) => {
    if (!projectId || !vid) return;
    const ok = confirm("Reverting will replace current project with this version. Continue?");
    if (!ok) return;
    try {
      await api.post(`/projects/${projectId}/versions/${vid}/revert`);
      alert("Reverted to version " + vid);
      const proj = (await api.get(`/projects/${projectId}`)).data;
      setLayout(proj.layout);
      setPreviewingVersion(null);
      // refresh versions
      const list = (await api.get(`/projects/${projectId}/versions`)).data.versions;
      setVersionsList(list || []);
    } catch (err) {
      console.error("Revert failed", err);
      alert(err?.response?.data?.detail || "Revert failed");
    }
  };

  // ---------- Compare helpers ----------
  const runCompare = async (leftId, rightId) => {
    if (!projectId) return alert("No project saved yet.");
    if (!leftId || !rightId) return alert("Choose two versions to compare.");
    if (leftId === rightId) return alert("Pick two different versions.");

    setLoadingCompare(true);
    try {
      const [lres, rres] = await Promise.all([
        api.get(`/projects/${projectId}/versions/${leftId}`),
        api.get(`/projects/${projectId}/versions/${rightId}`),
      ]);
      const lproj = lres.data.project;
      const rproj = rres.data.project;
      setCompareLeftLayout(lproj.layout);
      setCompareRightLayout(rproj.layout);
      const diff = computeLayoutDiff(lproj.layout, rproj.layout);
      setCompareDiff(diff);
      setCompareMode(true);
    } catch (err) {
      console.error("Compare failed", err);
      alert(err?.response?.data?.detail || "Compare failed");
    } finally {
      setLoadingCompare(false);
    }
  };

  // compute simple diff between two layouts (A -> B)
  function computeLayoutDiff(A = { rooms: [] }, B = { rooms: [] }) {
    const mapA = new Map((A.rooms || []).map((r) => [r.name, r]));
    const mapB = new Map((B.rooms || []).map((r) => [r.name, r]));
    const added = [];
    const removed = [];
    const modified = [];

    // added: in B but not in A
    for (const [name, br] of mapB.entries()) {
      if (!mapA.has(name)) {
        added.push(br);
      }
    }
    // removed: in A not in B
    for (const [name, ar] of mapA.entries()) {
      if (!mapB.has(name)) {
        removed.push(ar);
      }
    }
    // modified: in both but prop differences
    for (const [name, ar] of mapA.entries()) {
      if (!mapB.has(name)) continue;
      const br = mapB.get(name);
      const changes = {};
      const keys = ["x", "y", "size", "rotationY", "scale"];
      keys.forEach((k) => {
        const av = typeof ar[k] === "undefined" ? null : ar[k];
        const bv = typeof br[k] === "undefined" ? null : br[k];
        // numeric comparison with small epsilon for floats
        if ((typeof av === "number" || typeof bv === "number")) {
          const aNum = Number(av || 0);
          const bNum = Number(bv || 0);
          if (Math.abs(aNum - bNum) > 1e-4) changes[k] = [av, bv];
        } else {
          if (av !== bv) changes[k] = [av, bv];
        }
      });
      if (Object.keys(changes).length > 0) {
        modified.push({ name, changes, from: ar, to: br });
      }
    }

    return { added, removed, modified };
  }

  // swap compare sides
  const swapCompareSides = () => {
    setCompareLeftId((prev) => {
      const oldLeft = prev;
      setCompareRightId((r) => oldLeft);
      return compareRightId;
    });
    // swap layouts/diff too
    setCompareLeftLayout(compareRightLayout);
    setCompareRightLayout(compareLeftLayout);
    if (compareDiff) {
      // reversing diffs is simple: compute again with swapped inputs
      setCompareDiff((prev) => {
        if (!prev) return null;
        const rev = computeLayoutDiff(compareRightLayout, compareLeftLayout);
        return rev;
      });
    }
  };

  // helper to download the diff as JSON (for your report)
  const downloadDiffJSON = () => {
    if (!compareDiff) return alert("No diff computed");
    const blob = new Blob([JSON.stringify(compareDiff, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diff_${projectId}_${compareLeftId}_vs_${compareRightId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- render ----------
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
          <button onClick={handleExportSVG} className="px-3 py-1 bg-green-600 text-white rounded">Export SVG</button>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={undo} className="px-3 py-1 bg-yellow-500 text-white rounded">Undo (Ctrl/Cmd+Z)</button>
          <button onClick={redo} className="px-3 py-1 bg-yellow-500 text-white rounded">Redo (Ctrl/Cmd+Y)</button>
        </div>

        <div className="mt-3">
          <button onClick={() => { if (!projectId) return alert("Save project first to access versions."); fetchVersions(); }} className="px-3 py-1 bg-indigo-600 text-white rounded" disabled={!projectId}>
            Versions
          </button>
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

      {/* Versions modal / panel */}
      {versionsOpen && (
        <div style={{
          position: "fixed", left: 20, right: 20, top: 40, bottom: 40,
          background: "rgba(255,255,255,0.98)", border: "1px solid #ccc", borderRadius: 8, padding: 20, overflow: "auto", zIndex: 9999
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Versions for project {projectId}</h3>
            <div>
              <button onClick={() => { setVersionsOpen(false); setPreviewingVersion(null); setCompareMode(false); }} style={{ marginRight: 8 }} className="px-2 py-1 bg-gray-200 rounded">Close</button>
              <button onClick={cancelPreview} className="px-2 py-1 bg-gray-200 rounded">Reload Current</button>
            </div>
          </div>

          {loadingVersions ? <div>Loading versions...</div> : (
            <div style={{ display: "grid", gap: 12 }}>
              {/* Versions list */}
              <div>
                {versionsList.length === 0 ? <div>No versions found.</div> : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {versionsList.map((v) => (
                      <div key={v.version} style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6, display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 120, height: 80, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {v.thumbnail ? (
                            <img src={`/projects/${projectId}/versions/${v.version}/thumbnail`} alt="thumb" style={{ maxWidth: "100%", maxHeight: "100%" }} onError={(e)=>{e.target.onerror=null; e.target.src="/favicon.ico"}} />
                          ) : <div style={{ fontSize: 12, color: "#666" }}>No thumb</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{v.name || "Version"}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>Version id: {v.version}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>Created: {v.created}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => previewVersion(v.version)} className="px-2 py-1 bg-blue-600 text-white rounded">Preview</button>
                          <button onClick={() => revertToVersion(v.version)} className="px-2 py-1 bg-red-600 text-white rounded">Revert</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compare controls */}
              <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                <h4>Compare Versions</h4>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <select value={compareLeftId || ""} onChange={(e) => setCompareLeftId(e.target.value)} className="border p-1 rounded">
                    <option value="">Select left version</option>
                    {versionsList.map((v) => <option key={v.version} value={v.version}>{v.version} • {v.created}</option>)}
                  </select>
                  <button onClick={() => { if (!compareLeftId || !compareRightId) return; swapCompareSides(); }} className="px-2 py-1 bg-gray-200 rounded">Swap</button>
                  <select value={compareRightId || ""} onChange={(e) => setCompareRightId(e.target.value)} className="border p-1 rounded">
                    <option value="">Select right version</option>
                    {versionsList.map((v) => <option key={v.version} value={v.version}>{v.version} • {v.created}</option>)}
                  </select>
                  <button onClick={() => runCompare(compareLeftId, compareRightId)} className="px-3 py-1 bg-indigo-600 text-white rounded" disabled={loadingCompare}>Compare</button>
                  <button onClick={() => { setCompareMode(false); setCompareLeftLayout(null); setCompareRightLayout(null); setCompareDiff(null); }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
                </div>

                {loadingCompare && <div>Computing diff...</div>}

                {/* Compare view */}
                {compareMode && compareDiff && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Left: {compareLeftId}</div>
                        <div style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
                          <ThreeDViewer layout={compareLeftLayout || { rooms: [] }} selectedRoomName={null} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Right: {compareRightId}</div>
                        <div style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
                          <ThreeDViewer layout={compareRightLayout || { rooms: [] }} selectedRoomName={null} />
                        </div>
                      </div>
                    </div>

                    {/* diff summary */}
                    <div style={{ borderTop: "1px dashed #ddd", paddingTop: 8 }}>
                      <h5>Diff summary</h5>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>Added in Right</div>
                          {compareDiff.added.length === 0 ? <div style={{ color: "#666" }}>none</div> : compareDiff.added.map((r) => (
                            <div key={r.name} style={{ padding: 6, border: "1px solid #e6f4ea", background: "#f3fff6", marginTop: 6, borderRadius: 4 }}>
                              <div style={{ fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: 12 }}>size: {r.size} • x: {r.x} • y: {r.y}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>Removed from Right</div>
                          {compareDiff.removed.length === 0 ? <div style={{ color: "#666" }}>none</div> : compareDiff.removed.map((r) => (
                            <div key={r.name} style={{ padding: 6, border: "1px solid #fff0f0", background: "#fff7f7", marginTop: 6, borderRadius: 4 }}>
                              <div style={{ fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: 12 }}>size: {r.size} • x: {r.x} • y: {r.y}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>Modified</div>
                          {compareDiff.modified.length === 0 ? <div style={{ color: "#666" }}>none</div> : compareDiff.modified.map((m) => (
                            <div key={m.name} style={{ padding: 6, border: "1px solid #eee", background: "#fff", marginTop: 6, borderRadius: 4 }}>
                              <div style={{ fontWeight: 600 }}>{m.name}</div>
                              <div style={{ fontSize: 12 }}>
                                {Object.entries(m.changes).map(([k, [a, b]]) => (
                                  <div key={k}><strong>{k}:</strong> {String(a)} → {String(b)}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button onClick={() => downloadDiffJSON()} className="px-3 py-1 bg-gray-200 rounded">Download diff JSON</button>
                        <button onClick={() => { /* preview left in main editor */ if (compareLeftId) previewVersion(compareLeftId); }} className="px-3 py-1 bg-blue-600 text-white rounded">Open Left in Editor</button>
                        <button onClick={() => { /* preview right in main editor */ if (compareRightId) previewVersion(compareRightId); }} className="px-3 py-1 bg-blue-600 text-white rounded">Open Right in Editor</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* AddRoomForm nested component */
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
