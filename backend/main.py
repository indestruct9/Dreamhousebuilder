# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ai.generator import generate_layout

app = FastAPI(title="Custom Dream House AI Builder - Backend")

# ---- CORS (lets React call us) ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # DEV only; tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Request/Response models ----
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

# ---- Endpoints ----
@app.get("/")
def root():
    return {"message": "Backend is running ✅"}

@app.post("/design", response_model=LayoutModel)
def design(req: DesignRequest):
    layout = generate_layout(req.description or "", req.mood or "cozy", req.bedrooms or 2)
    return layout
