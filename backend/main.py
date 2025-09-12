# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pathlib import Path
import json
import uuid
import base64

app = FastAPI(title="DreamHouse Backend Day7")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
PROJECTS_DIR = BASE_DIR / "data" / "projects"
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

# Models
class DesignRequest(BaseModel):
    description: Optional[str] = ""
    mood: Optional[str] = "cozy"
    bedrooms: Optional[int] = 2

class SaveProjectRequest(BaseModel):
    name: str
    layout: Dict[str, Any]
    thumbnail: Optional[str] = None  # base64 "data:image/png;base64,..."

# Simple generator - consistent schema
def generate_layout(description: str, mood: str, bedrooms: int):
    sizes = {"living": 5.0, "kitchen": 3.5, "bed": 3.5, "bath": 2.0}
    rooms = []
    rooms.append({"name": "Living Room", "size": sizes["living"], "x": 0.0, "y": 0.0})
    rooms.append({"name": "Kitchen", "size": sizes["kitchen"], "x": sizes["living"] + 0.5, "y": 0.0})
    for i in range(max(1, int(bedrooms))):
        y = (i + 1) * (sizes["bed"] + 0.5)
        rooms.append({"name": f"Bedroom {i+1}", "size": sizes["bed"], "x": 0.0, "y": y})
        rooms.append({"name": f"Bathroom {i+1}", "size": sizes["bath"], "x": sizes["bed"] + 0.5, "y": y})
    meta = {"description": description, "mood": mood, "bedrooms": bedrooms}
    return {"rooms": rooms, "meta": meta}

@app.get("/")
def root():
    return {"message": "Backend running"}

@app.post("/design")
def design(req: DesignRequest):
    return generate_layout(req.description or "", req.mood or "cozy", req.bedrooms or 2)

@app.post("/save-project")
def save_project(req: SaveProjectRequest):
    pid = uuid.uuid4().hex
    out = {"id": pid, "name": req.name, "layout": req.layout}

    # Save JSON
    json_path = PROJECTS_DIR / f"{pid}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    # If thumbnail provided save PNG
    if req.thumbnail:
        try:
            # req.thumbnail expected like "data:image/png;base64,...."
            header, b64 = req.thumbnail.split(",", 1) if "," in req.thumbnail else ("", req.thumbnail)
            data = base64.b64decode(b64)
            png_path = PROJECTS_DIR / f"{pid}.png"
            with open(png_path, "wb") as pf:
                pf.write(data)
            # update json to reference thumbnail filename
            out["thumbnail"] = f"{pid}.png"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(out, f, indent=2)
        except Exception as e:
            # don't fail save if thumbnail decode fails; still return id but warn
            print("Failed to save thumbnail:", e)

    return {"status":"ok", "id": pid}

@app.get("/projects")
def list_projects():
    items = []
    for f in sorted(PROJECTS_DIR.glob("*.json")):
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
            items.append({"id": j.get("id"), "name": j.get("name"), "thumbnail": j.get("thumbnail")})
        except Exception:
            continue
    return {"projects": items}

@app.get("/projects/{project_id}")
def get_project(project_id: str):
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(path.read_text(encoding="utf-8"))

@app.put("/projects/{project_id}")
def update_project(project_id: str, req: SaveProjectRequest):
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    out = {"id": project_id, "name": req.name, "layout": req.layout}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    # handle thumbnail update
    if req.thumbnail:
        try:
            header, b64 = req.thumbnail.split(",", 1) if "," in req.thumbnail else ("", req.thumbnail)
            data = base64.b64decode(b64)
            png_path = PROJECTS_DIR / f"{project_id}.png"
            with open(png_path, "wb") as pf:
                pf.write(data)
            out["thumbnail"] = f"{project_id}.png"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(out, f, indent=2)
        except Exception as e:
            print("Failed to save thumbnail on update:", e)

    return {"status":"updated", "id": project_id}
