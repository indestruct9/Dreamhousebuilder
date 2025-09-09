from fastapi import FastAPI
from pydantic import BaseModel
from ai.generator import generate_layout  # <-- AI generator function

# Initialize FastAPI
app = FastAPI()

# Request schema for /design
class DesignRequest(BaseModel):
    description: str | None = None
    mood: str | None = None
    bedrooms: int | None = None

# Root endpoint (to test server)
@app.get("/")
def read_root():
    return {"message": "Backend is running successfully!"}

# AI-powered endpoint
@app.post("/design")
def design(req: DesignRequest):
    # Call our AI layout generator
    layout = generate_layout(
        req.description or "",
        req.mood or "cozy",
        req.bedrooms or 2
    )
    return layout
