# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import uuid4
from pathlib import Path
import json

# Import your AI generator (Member C)
from ai.generator import generate_layout

# App init
app = FastAPI(title="Custom Dream House AI Builder - Backend Day3")

# CORS (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DEV ONLY
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data folders
DATA_DIR = Path("data")
PROJECTS_DIR = DATA_DIR / "projects"
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

# Pydantic models
class DesignRequest(BaseModel):
    description: Optional[str] = ""
    mood: Optional[str] = "cozy"
    bedrooms: Optional[int] = 2

class RoomModel(BaseModel):
    name: str
    size: float
    x: float
    y: float

class LayoutModel(BaseModel):
    rooms: List[RoomModel]
    meta: Dict[str, Any]

class SaveProjectRequest(BaseModel):
    name: str
    layout: LayoutModel

# Root
@app.get("/")
def root():
    return {"message": "Backend is running ✅"}

# Design endpoint (uses your generator)
@app.post("/design", response_model=LayoutModel)
def design(req: DesignRequest):
    layout = generate_layout(req.description or "", req.mood or "cozy", req.bedrooms or 2)
    return layout

# Save project (creates a json file)
@app.post("/save-project")
def save_project(payload: SaveProjectRequest):
    project_id = uuid4().hex
    out = {
        "id": project_id,
        "name": payload.name,
        "layout": payload.layout.dict()
    }
    file_path = PROJECTS_DIR / f"{project_id}.json"
    file_path.write_text(json.dumps(out, indent=2))
    return {"id": project_id, "message": "Saved project"}

# List saved projects (returns id + name)
@app.get("/projects")
def list_projects():
    items = []
    for f in sorted(PROJECTS_DIR.glob("*.json")):
        try:
            j = json.loads(f.read_text())
            items.append({"id": j.get("id"), "name": j.get("name")})
        except Exception:
            continue
    return {"projects": items}

# Get a single project by id
@app.get("/projects/{project_id}")
def get_project(project_id: str):
    file = PROJECTS_DIR / f"{project_id}.json"
    if not file.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(file.read_text())
