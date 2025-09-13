# backend/main.py
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pathlib import Path
from fastapi.responses import FileResponse, JSONResponse
import json
import uuid
import base64
import shutil
import hashlib
import os
from datetime import datetime

app = FastAPI(title="DreamHouse Backend Day12 (Versions)")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_DIR = DATA_DIR / "projects"
VERSIONS_DIR = DATA_DIR / "versions"   # store versions per project here
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

USERS_FILE = DATA_DIR / "users.json"
TOKENS_FILE = DATA_DIR / "tokens.json"

def load_json_safe(path: Path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def write_json_safe(path: Path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

# Simple password hashing (dev only)
def hash_password(username: str, password: str) -> str:
    return hashlib.sha256(f"{username}|{password}".encode("utf-8")).hexdigest()

def save_token(token: str, username: str):
    tokens = load_json_safe(TOKENS_FILE)
    tokens[token] = {"username": username, "created": datetime.utcnow().isoformat()}
    write_json_safe(TOKENS_FILE, tokens)

def delete_token(token: str):
    tokens = load_json_safe(TOKENS_FILE)
    if token in tokens:
        del tokens[token]
        write_json_safe(TOKENS_FILE, tokens)

def get_username_for_token(token: str) -> Optional[str]:
    tokens = load_json_safe(TOKENS_FILE)
    info = tokens.get(token)
    return info.get("username") if info else None

def get_user_by_username(username: str) -> Optional[Dict[str,Any]]:
    users = load_json_safe(USERS_FILE)
    return users.get(username)

def create_user(username: str, password: str):
    users = load_json_safe(USERS_FILE)
    if username in users:
        raise ValueError("user exists")
    users[username] = {"password_hash": hash_password(username, password), "created": datetime.utcnow().isoformat()}
    write_json_safe(USERS_FILE, users)

# thumbnail helpers
def save_thumbnail(pid: str, thumbnail_b64: str) -> Optional[str]:
    if not thumbnail_b64:
        return None
    try:
        header, b64 = (thumbnail_b64.split(",", 1) if "," in thumbnail_b64 else ("", thumbnail_b64))
        data = base64.b64decode(b64)
        png_path = PROJECTS_DIR / f"{pid}.png"
        with open(png_path, "wb") as pf:
            pf.write(data)
        return f"{pid}.png"
    except Exception as e:
        print("Failed to decode/save thumbnail:", e)
        return None

def write_project_file(pid: str, name: str, layout: Dict[str,Any], owner: Optional[str] = None, thumb_filename: Optional[str] = None):
    out = {"id": pid, "name": name, "layout": layout}
    if owner:
        out["owner"] = owner
    if thumb_filename:
        out["thumbnail"] = thumb_filename
    path = PROJECTS_DIR / f"{pid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    return out

# Version helpers
def project_json_path(pid: str) -> Path:
    return PROJECTS_DIR / f"{pid}.json"

def project_png_path(pid: str) -> Path:
    return PROJECTS_DIR / f"{pid}.png"

def ensure_versions_dir_for_project(pid: str) -> Path:
    d = VERSIONS_DIR / pid
    d.mkdir(parents=True, exist_ok=True)
    return d

def create_version_from_project(pid: str) -> Optional[str]:
    """
    Create a new version snapshot for the project (copy current json and png into versions directory).
    Returns version id (hex) or None if project doesn't exist.
    """
    jpath = project_json_path(pid)
    if not jpath.exists():
        return None
    ver_id = uuid.uuid4().hex
    ver_dir = ensure_versions_dir_for_project(pid)
    # copy json
    with open(jpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    version_meta = {"id": ver_id, "created": datetime.utcnow().isoformat(), "name": data.get("name")}
    # write version JSON
    vjson_path = ver_dir / f"{ver_id}.json"
    with open(vjson_path, "w", encoding="utf-8") as vf:
        json.dump({"meta": version_meta, "project": data}, vf, indent=2)
    # copy png if exists
    png_path = project_png_path(pid)
    if png_path.exists():
        shutil.copyfile(png_path, ver_dir / f"{ver_id}.png")
    return ver_id

def list_versions_for_project(pid: str):
    ver_dir = VERSIONS_DIR / pid
    if not ver_dir.exists():
        return []
    items = []
    for f in sorted(ver_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
            meta = j.get("meta", {})
            vid = meta.get("id") or f.stem
            created = meta.get("created") or datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            has_thumb = (ver_dir / f"{vid}.png").exists()
            items.append({"version": vid, "created": created, "name": meta.get("name"), "thumbnail": has_thumb})
        except Exception:
            continue
    return items

def get_version_json(pid: str, vid: str):
    vjson = VERSIONS_DIR / pid / f"{vid}.json"
    if not vjson.exists():
        return None
    return json.loads(vjson.read_text(encoding="utf-8"))

def revert_project_to_version(pid: str, vid: str, owner: Optional[str]=None):
    """
    Replaces current project JSON and PNG with the version files.
    Only updates project if version exists. Returns True if success.
    """
    vjson = VERSIONS_DIR / pid / f"{vid}.json"
    if not vjson.exists():
        return False
    data = json.loads(vjson.read_text(encoding="utf-8"))
    project_data = data.get("project")
    if not project_data:
        return False
    # update project file (keep same id)
    jpath = project_json_path(pid)
    with open(jpath, "w", encoding="utf-8") as f:
        # ensure owner is preserved if provided
        if owner:
            project_data["owner"] = owner
        json.dump(project_data, f, indent=2)
    # copy thumbnail if version has it
    vthumb = VERSIONS_DIR / pid / f"{vid}.png"
    if vthumb.exists():
        dst = project_png_path(pid)
        shutil.copyfile(vthumb, dst)
    return True

# ----- Models -----
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class DesignRequest(BaseModel):
    description: Optional[str] = ""
    mood: Optional[str] = "cozy"
    bedrooms: Optional[int] = 2

class SaveProjectRequest(BaseModel):
    name: str
    layout: Dict[str, Any]
    thumbnail: Optional[str] = None

# ----- Auth helpers -----
def username_from_auth_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
        return get_username_for_token(token)
    return None

def require_user(authorization: Optional[str]) -> str:
    username = username_from_auth_header(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing token")
    return username

# ----- Public endpoints -----
@app.get("/")
def root():
    return {"message": "DreamHouse Backend (Day12) running"}

@app.post("/register")
def register(req: RegisterRequest):
    uname = req.username.strip()
    pwd = req.password.strip()
    if not uname or not pwd:
        raise HTTPException(status_code=400, detail="username and password required")
    if len(uname) < 3 or len(pwd) < 3:
        raise HTTPException(status_code=400, detail="username and password must be >= 3 chars")
    users = load_json_safe(USERS_FILE)
    if uname in users:
        raise HTTPException(status_code=409, detail="user already exists")
    try:
        create_user(uname, pwd)
    except Exception as e:
        raise HTTPException(status_code=500, detail="failed to create user")
    return {"status":"ok", "username": uname}

@app.post("/login")
def login(req: LoginRequest):
    uname = req.username.strip()
    pwd = req.password.strip()
    user = get_user_by_username(uname)
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")
    if user.get("password_hash") != hash_password(uname, pwd):
        raise HTTPException(status_code=401, detail="invalid credentials")
    token = uuid.uuid4().hex
    save_token(token, uname)
    return {"token": token, "username": uname}

@app.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    uname = username_from_auth_header(authorization)
    if not uname:
        raise HTTPException(status_code=401, detail="no token")
    parts = authorization.split()
    if len(parts) == 2:
        token = parts[1]
        delete_token(token)
    return {"status":"ok"}

# ----- Design generator (public) -----
@app.post("/design")
def design(req: DesignRequest):
    sizes = {"living": 5.0, "kitchen": 3.5, "bed": 3.5, "bath": 2.0}
    rooms = []
    rooms.append({"name": "Living Room", "size": sizes["living"], "x": 0.0, "y": 0.0})
    rooms.append({"name": "Kitchen", "size": sizes["kitchen"], "x": sizes["living"] + 0.5, "y": 0.0})
    for i in range(max(1, int(req.bedrooms or 2))):
        y = (i + 1) * (sizes["bed"] + 0.5)
        rooms.append({"name": f"Bedroom {i+1}", "size": sizes["bed"], "x": 0.0, "y": y})
        rooms.append({"name": f"Bathroom {i+1}", "size": sizes["bath"], "x": sizes["bed"] + 0.5, "y": y})
    meta = {"description": req.description, "mood": req.mood, "bedrooms": req.bedrooms}
    return {"rooms": rooms, "meta": meta}

# ----- Projects (list/view public; save/update/delete protected) -----
@app.get("/projects")
def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None),
    mine: Optional[bool] = Query(False),
    authorization: Optional[str] = Header(None)
):
    files = sorted(PROJECTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    items = []
    for f in files:
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
            pid = j.get("id")
            name = j.get("name")
            owner = j.get("owner")
            # filter by search q
            if q:
                ql = q.lower()
                if not (ql in (name or "").lower() or ql in (pid or "").lower() or ql in json.dumps(j.get("layout", "")).lower()):
                    continue
            items.append({
                "id": pid,
                "name": name,
                "owner": owner,
                "thumbnail": (PROJECTS_DIR / f"{pid}.png").exists(),
                "thumbnail_url": f"/projects/{pid}/thumbnail" if (PROJECTS_DIR / f"{pid}.png").exists() else None,
                "updated": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
            })
        except Exception:
            continue

    # if mine==true, require auth and filter to owned projects
    if mine:
        username = username_from_auth_header(authorization)
        if not username:
            raise HTTPException(status_code=401, detail="Unauthorized (mine=true requires login)")
        items = [it for it in items if it.get("owner") == username]

    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    page_items = items[start:end]
    return {"projects": page_items, "page": page, "limit": limit, "total": total}

@app.get("/projects/{project_id}")
def get_project(project_id: str):
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/projects/{project_id}/thumbnail")
def get_thumbnail(project_id: str):
    png_path = PROJECTS_DIR / f"{project_id}.png"
    if not png_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(path=str(png_path), media_type="image/png", filename=png_path.name)

@app.post("/save-project")
def save_project(req: SaveProjectRequest, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    pid = uuid.uuid4().hex
    thumb_name = None
    if req.thumbnail:
        thumb_name = save_thumbnail(pid, req.thumbnail)
    out = write_project_file(pid, req.name, req.layout, owner=username, thumb_filename=thumb_name)
    return {"status": "ok", "id": pid}

@app.put("/projects/{project_id}")
def update_project(project_id: str, req: SaveProjectRequest, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(path.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this project")

    # create version snapshot BEFORE updating
    create_version_from_project(project_id)

    thumb_name = None
    if req.thumbnail:
        thumb_name = save_thumbnail(project_id, req.thumbnail)
    out = write_project_file(project_id, req.name, req.layout, owner=username, thumb_filename=thumb_name)
    return {"status": "updated", "id": project_id}

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    jpath = PROJECTS_DIR / f"{project_id}.json"
    if not jpath.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(jpath.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this project")
    ppath = PROJECTS_DIR / f"{project_id}.png"
    try:
        jpath.unlink()
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Failed to delete json: {e}"})
    if ppath.exists():
        try:
            ppath.unlink()
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": f"Deleted json but failed to delete thumbnail: {e}"})
    return {"status": "deleted", "id": project_id}

@app.post("/projects/{project_id}/duplicate")
def duplicate_project(project_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    src = PROJECTS_DIR / f"{project_id}.json"
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source project not found")
    try:
        j = json.loads(src.read_text(encoding="utf-8"))
        new_id = uuid.uuid4().hex
        name = j.get("name", "") + " (copy)"
        layout = j.get("layout", {})
        thumb_name = None
        src_thumb = PROJECTS_DIR / f"{project_id}.png"
        if src_thumb.exists():
            dst_thumb = PROJECTS_DIR / f"{new_id}.png"
            shutil.copyfile(src_thumb, dst_thumb)
            thumb_name = f"{new_id}.png"
        write_project_file(new_id, name, layout, owner=username, thumb_filename=thumb_name)
        return {"status": "duplicated", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to duplicate: {e}")

# ----- Version endpoints -----
@app.get("/projects/{project_id}/versions")
def get_versions(project_id: str):
    # public endpoint: anyone can view versions metadata (but only owner can revert)
    items = list_versions_for_project(project_id)
    return {"versions": items}

@app.get("/projects/{project_id}/versions/{version_id}")
def get_version(project_id: str, version_id: str):
    j = get_version_json(project_id, version_id)
    if not j:
        raise HTTPException(status_code=404, detail="Version not found")
    return j

@app.get("/projects/{project_id}/versions/{version_id}/thumbnail")
def get_version_thumbnail(project_id: str, version_id: str):
    vpng = VERSIONS_DIR / project_id / f"{version_id}.png"
    if not vpng.exists():
        raise HTTPException(status_code=404, detail="Version thumbnail not found")
    return FileResponse(path=str(vpng), media_type="image/png", filename=vpng.name)

@app.post("/projects/{project_id}/versions/{version_id}/revert")
def revert_version(project_id: str, version_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    # only owner can revert
    jpath = PROJECTS_DIR / f"{project_id}.json"
    if not jpath.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(jpath.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: only owner can revert")
    ok = revert_project_to_version(project_id, version_id, owner=owner)
    if not ok:
        raise HTTPException(status_code=404, detail="Version not found or revert failed")
    return {"status": "reverted", "id": project_id, "version": version_id}

@app.delete("/projects/{project_id}/versions/{version_id}")
def delete_version(project_id: str, version_id: str, authorization: Optional[str] = Header(None)):
    username = require_user(authorization)
    # only owner can delete versions
    jpath = PROJECTS_DIR / f"{project_id}.json"
    if not jpath.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    j = json.loads(jpath.read_text(encoding="utf-8"))
    owner = j.get("owner")
    if owner != username:
        raise HTTPException(status_code=403, detail="Forbidden: only owner can delete versions")
    vdir = VERSIONS_DIR / project_id
    vjson = vdir / f"{version_id}.json"
    vpng = vdir / f"{version_id}.png"
    if not vjson.exists():
        raise HTTPException(status_code=404, detail="Version not found")
    try:
        vjson.unlink()
        if vpng.exists():
            vpng.unlink()
        return {"status": "deleted", "version": version_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Failed to delete version: {e}"})
