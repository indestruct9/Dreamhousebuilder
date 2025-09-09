# backend/ai/generator.py
from typing import Dict, Any, List
import random

def generate_layout(description: str, mood: str, bedrooms: int) -> Dict[str, Any]:
    """
    Simple deterministic rule-based layout generator for Day 1.
    Returns JSON: { "rooms": [ {name,size,x,y}, ... ], "meta": { ... } }
    """

    # Basic sizes (meters for demo)
    sizes = {"living": 5.0, "kitchen": 3.5, "bed": 3.5, "bath": 2.0}

    rooms: List[Dict[str, Any]] = []

    # Living room at origin
    rooms.append({"name": "Living Room", "size": sizes["living"], "x": 0.0, "y": 0.0})

    # Kitchen to the right
    rooms.append({"name": "Kitchen", "size": sizes["kitchen"], "x": sizes["living"], "y": 0.0})

    # Place bedrooms stacked vertically with small spacing
    for i in range(max(1, int(bedrooms))):
        y_pos = (i + 1) * (sizes["bed"] + 0.5)
        rooms.append({
            "name": f"Bedroom {i+1}",
            "size": sizes["bed"],
            "x": 0.0,
            "y": y_pos
        })
        rooms.append({
            "name": f"Bathroom {i+1}",
            "size": sizes["bath"],
            "x": sizes["bed"] + 0.5,
            "y": y_pos
        })

    # Add mood-based small features
    notes = []
    d = (description or "").lower()
    m = (mood or "").lower()
    if "eco" in m or "eco" in d or "green" in d:
        notes.append("Suggest solar panels / green roof")
    if "modern" in m or "modern" in d:
        notes.append("Suggest open-plan living, large windows")
    if "cozy" in m or "cozy" in d:
        notes.append("Suggest fireplace / warm lighting")

    meta = {
        "description": description,
        "mood": mood,
        "bedrooms": bedrooms,
        "notes": notes
    }

    return {"rooms": rooms, "meta": meta}
