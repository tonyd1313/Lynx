import datetime as dt
import sqlite3

import json
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent           # backend/app
BACK_DIR = APP_DIR.parent                           # backend
DATA_FILE = BACK_DIR / "data" / "entities.json"

write_lock = Lock()

# SSE subscribers (each gets new entities as they are created)
subscribers: Set[asyncio.Queue] = set()
sub_lock = asyncio.Lock()

def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')

def load_entities() -> List[Dict[str, Any]]:
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def save_entities(rows: List[Dict[str, Any]]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

# ----------- Models (accept both camel + snake where people tend to mix) -----------

class EntityCreate(BaseModel):
    type: str
    title: str
    description: str
    lat: float
    lng: float

    severity: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list)

    imageUrls: List[str] = Field(default_factory=list, alias="image_urls")
    meta: Dict[str, Any] = Field(default_factory=dict)

    # optional structured blocks (kept flexible)
    person: Optional[Dict[str, Any]] = None
    org: Optional[Dict[str, Any]] = None
    vehicle: Optional[Dict[str, Any]] = None
    device: Optional[Dict[str, Any]] = None
    evidence: Optional[Dict[str, Any]] = None
    article: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True

class Entity(EntityCreate):
    id: str
    createdAt: str
    updatedAt: str

app = FastAPI(title="lynx-api", version="0.2.0")




# --- CORS (dev) ---
# Allows iPad/Safari + Vite dev server preflight requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.1.46:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://0.0.0.0:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev/lab
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True, "service": "lynx-api"}

@app.get("/api/pins")
def list_pins() -> List[Dict[str, Any]]:
    return load_entities()

@app.post("/api/pins")
async def create_pin(payload: EntityCreate) -> Dict[str, Any]:
    # minimal safety: reject empty
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="title required")

    row = payload.model_dump(by_alias=False)
    row["id"] = str(uuid.uuid4())
    row["createdAt"] = now_iso()
    row["updatedAt"] = row["createdAt"]

    # normalize imageUrls if client sent image_urls
    if "imageUrls" not in row and "image_urls" in row:
        row["imageUrls"] = row.pop("image_urls")

    with write_lock:
        rows = load_entities()
        rows.insert(0, row)
        save_entities(rows)

    # broadcast to SSE subscribers
    async with sub_lock:
        dead = []
        for q in subscribers:
            try:
                q.put_nowait(row)
            except Exception:
                dead.append(q)
        for q in dead:
            subscribers.discard(q)

    return row

@app.get("/api/pins/stream")
async def pins_stream():
    q: asyncio.Queue = asyncio.Queue(maxsize=200)

    async with sub_lock:
        subscribers.add(q)

    async def gen():
        try:
            # initial comment so EventSource opens cleanly
            yield ": ok\n\n"
            while True:
                item = await q.get()
                yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
        finally:
            async with sub_lock:
                subscribers.discard(q)

    return StreamingResponse(gen(), media_type="text/event-stream")


# ----------------------------
# LYNX: WIPE endpoints
# - DELETE /api/pins  (preferred)
# - POST   /api/wipe  (alias)
# Tries: in-memory stores AND sqlite tables if present
# ----------------------------
def lynx_wipe_all():
    # 1) in-memory common stores
    for name in ["PINS", "pins", "PIN_STORE", "STORE", "ENTITIES", "entities"]:
        try:
            v = globals().get(name, None)
            if isinstance(v, list):
                n = len(v); v.clear()
                return {"ok": True, "mode": "memory", "cleared": n, "store": name}
            if isinstance(v, dict):
                n = len(v); v.clear()
                return {"ok": True, "mode": "memory", "cleared": n, "store": name}
        except Exception:
            pass

    # 2) sqlite best-effort: wipe known tables if a db exists
    backend_root = Path(__file__).resolve().parents[1]  # backend/
    candidates = []
    candidates += list(backend_root.rglob("*.db"))
    for nm in ["lynx.db","app.db","db.sqlite3","data.db","pins.db"]:
        candidates += [backend_root/nm, backend_root/"app"/nm, backend_root/"data"/nm]

    checked = set()
    for db in candidates:
        try:
            db = db.resolve()
        except Exception:
            continue
        if db in checked:
            continue
        checked.add(db)
        if not db.exists():
            continue
        try:
            con = sqlite3.connect(str(db))
            cur = con.cursor()
            tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            wiped_tables = []
            for t in ["pins","entities","items","markers"]:
                if t in tables:
                    cur.execute(f"DELETE FROM {t}")
                    wiped_tables.append(t)
            con.commit()
            con.close()
            if wiped_tables:
                return {"ok": True, "mode": "sqlite", "db": str(db), "tables": wiped_tables}
        except Exception:
            pass

    return {"ok": False, "mode": "unknown", "detail": "No known in-memory store or sqlite table found"}

try:
    _route = app
except Exception:
    _route = None
try:
    # some projects use router instead of app
    if _route is None:
        _route = router
except Exception:
    pass

if _route is not None:
    @_route.delete("/api/pins")
    def api_delete_pins():
        return lynx_wipe_all()

    @_route.post("/api/wipe")
    def api_wipe_alias():
        return lynx_wipe_all()

from fastapi import UploadFile, File as FFile

@app.post("/api/upload")
async def lynx_upload(file: UploadFile = FFile(...)):
    """
    Accept any file. Store metadata as a pin.
    (We can add parsing later: json/csv/geojson.)
    """
    raw = await file.read()
    meta = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(raw),
    }
    # create a simple pin payload compatible with your existing list/store
    pin = {
        "id": __import__("uuid").uuid4().hex,
        "kind": "evidence",
        "title": f"Upload: {file.filename}",
        "notes": f"type={file.content_type} bytes={len(raw)}",
        "meta": meta,
        # default coords: center map or 0/0; frontend can drag later
        "lat": 40.7128,
        "lng": -74.0060,
    }
    # try to append into in-memory store if used
    g = globals()
    for k in ("PINS","pins","ENTITIES","entities","STORE","store"):
        if k in g and isinstance(g[k], list):
            g[k].append(pin)
            break
    return {"ok": True, "pin": pin}

### LYNX_OVERRIDE_BEGIN ###
# Lynx Ops Override Middleware:
# - guarantees Seed/Wipe reflect in /api/pins and /api/pins/stream
# - avoids depending on unknown storage internals

import asyncio, json, time, uuid

try:
    from fastapi import Request
    from fastapi.responses import JSONResponse, StreamingResponse
except Exception:
    Request = None  # type: ignore
    JSONResponse = None  # type: ignore
    StreamingResponse = None  # type: ignore

LYNX_OVERRIDE_PINS = None  # None=pass-through, []=wiped, [..]=seeded

def lynx_seed_pins():
    base = [
        ("vehicle",  "Vehicle: Sedan sighting", "Auto feed for UI testing.",         40.7454, -74.1792, 3),
        ("evidence", "Evidence: Video",         "Dashcam clip attached.",            40.7287, -74.1753, 4),
        ("article",  "Article: Briefing memo",  "Scraped article + analyst notes.", 40.7298, -74.1788, 3),
        ("location", "Location: Ortiz Highway", "Tagged location for follow-up.",   40.7190, -74.1905, 2),
        ("device",   "Device: Router",          "MAC/IP observed on segment.",      40.7352, -74.1681, 3),
        ("person",   "Person: Unknown male",    "Witness statement pending.",       40.7411, -74.1552, 2),
    ]
    pins = []
    ts = int(time.time())
    for kind, title, notes, lat, lng, sev in base:
        pins.append({
            "id": uuid.uuid4().hex,
            "kind": kind,
            "title": title,
            "notes": notes,
            "lat": lat,
            "lng": lng,
            "severity": sev,
            "meta": {"source": "Lynx-seed", "status": "open", "ts": ts},
        })
    return pins

if "app" in globals() and Request is not None and JSONResponse is not None:

    @app.post("/api/seed")
    def lynx_seed():
        global LYNX_OVERRIDE_PINS
        LYNX_OVERRIDE_PINS = lynx_seed_pins()
        return {"ok": True, "count": len(LYNX_OVERRIDE_PINS)}

    @app.delete("/api/pins")
    def lynx_wipe():
        global LYNX_OVERRIDE_PINS
        LYNX_OVERRIDE_PINS = []
        return {"ok": True, "count": 0}

    @app.post("/api/wipe")
    def lynx_wipe_alias():
        return lynx_wipe()

    @app.middleware("http")
    async def lynx_override_mw(request: Request, call_next):
        global LYNX_OVERRIDE_PINS
        path = request.url.path
        method = request.method.upper()

        # Force GET /api/pins to reflect override
        if path == "/api/pins" and method == "GET" and LYNX_OVERRIDE_PINS is not None:
            return JSONResponse(LYNX_OVERRIDE_PINS)

        # Force SSE /api/pins/stream to reflect override
        if path == "/api/pins/stream" and method == "GET" and LYNX_OVERRIDE_PINS is not None and StreamingResponse is not None:
            async def gen():
                yield "event: pins\ndata: " + json.dumps(LYNX_OVERRIDE_PINS) + "\n\n"
                while True:
                    await asyncio.sleep(15)
                    yield "event: ping\ndata: {}\n\n"
            return StreamingResponse(gen(), media_type="text/event-stream")

        return await call_next(request)

### LYNX_OVERRIDE_END ###

# ============================
# LYNX_DB_PATCH_BEGIN
# Adds:
# - SQLite persistence for pins + attachments
# - POST /api/pins (manual add)
# - POST /api/ingest (Local Seed: files + urls -> linked objects)
# - POST /api/wipe (clear tables)
# - CORS for iPad/remote access
# ============================
import os, sqlite3, hashlib, uuid, datetime
from typing import Optional, List
from fastapi import UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# allow iPad / remote browsers
try:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
except Exception:
    pass

_DB_DIR = Path(__file__).resolve().parent / "data"
_DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = _DB_DIR / "lynx.db"

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def _db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def _now():
    return datetime.datetime.utcnow().isoformat() + "Z"

def init_db():
    con = _db()
    cur = con.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pins (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        severity INTEGER DEFAULT 3,
        created_at TEXT NOT NULL
    )""")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,          -- file | link
        name TEXT DEFAULT '',
        path TEXT DEFAULT '',
        url TEXT DEFAULT '',
        sha256 TEXT DEFAULT '',
        mime TEXT DEFAULT '',
        size INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )""")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pin_attachments (
        pin_id TEXT NOT NULL,
        attachment_id TEXT NOT NULL,
        PRIMARY KEY (pin_id, attachment_id)
    )""")
    con.commit()
    con.close()

init_db()

def _sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def _insert_attachment(kind: str, name: str = "", path: str = "", url: str = "", mime: str = "", size: int = 0, sha256: str = "") -> str:
    aid = str(uuid.uuid4())
    con = _db()
    con.execute(
        "INSERT INTO attachments (id, kind, name, path, url, sha256, mime, size, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (aid, kind, name, path, url, sha256, mime, size, _now())
    )
    con.commit()
    con.close()
    return aid

def _insert_pin(kind: str, title: str, notes: str, lat: float, lng: float, severity: int = 3, attachment_ids: Optional[List[str]] = None) -> str:
    pid = str(uuid.uuid4())
    con = _db()
    con.execute(
        "INSERT INTO pins (id, kind, title, notes, lat, lng, severity, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (pid, kind, title, notes or "", float(lat), float(lng), int(severity), _now())
    )
    if attachment_ids:
        for aid in attachment_ids:
            con.execute("INSERT OR IGNORE INTO pin_attachments (pin_id, attachment_id) VALUES (?,?)", (pid, aid))
    con.commit()
    con.close()
    return pid

def _list_pins():
    con = _db()
    pins = [dict(r) for r in con.execute("SELECT * FROM pins ORDER BY created_at DESC").fetchall()]
    # attachments per pin
    for p in pins:
        rows = con.execute("""
            SELECT a.* FROM attachments a
            JOIN pin_attachments pa ON pa.attachment_id = a.id
            WHERE pa.pin_id = ?
        """, (p["id"],)).fetchall()
        p["attachments"] = [dict(r) for r in rows]
    con.close()
    return pins

# Ensure /api/pins GET returns DB pins if your app already has the route.
# If an earlier override route exists, this adds a higher-priority dependency-free path.
try:
    @app.get("/api/pins")
    def api_pins_db():
        return _list_pins()
except Exception:
    pass

from pydantic import BaseModel

class PinCreate(BaseModel):
    kind: str
    title: str
    notes: Optional[str] = ""
    lat: float
    lng: float
    severity: Optional[int] = 3
    attachment_ids: Optional[List[str]] = None

@app.post("/api/pins")
def api_create_pin(body: PinCreate):
    pid = _insert_pin(
        kind=body.kind,
        title=body.title,
        notes=body.notes or "",
        lat=body.lat,
        lng=body.lng,
        severity=int(body.severity or 3),
        attachment_ids=body.attachment_ids or None
    )
    return {"ok": True, "id": pid}

@app.post("/api/ingest")
async def api_ingest(
    files: Optional[List[UploadFile]] = File(default=None),
    urls: Optional[str] = Form(default=""),
    lat: Optional[float] = Form(default=None),
    lng: Optional[float] = Form(default=None),
):
    """
    Local Seed:
      - upload files (pdf/png/jpg/zip/etc) and/or provide URLs (newline separated)
      - backend stores attachments + creates linked object pins (kind=evidence)
      - pins are linked to attachments via pin_attachments
    """
    init_db()

    # default location: if not provided, use a stable spot near JC (can be adjusted by UI later)
    dlat = float(lat) if lat is not None else 40.7178
    dlng = float(lng) if lng is not None else -74.0431

    created_pins = 0
    created_attachments = 0

    # Files
    if files:
        for f in files:
            raw = await f.read()
            safe_name = (f.filename or "upload").replace("/", "_").replace("\\", "_")
            fid = str(uuid.uuid4())
            out = UPLOAD_DIR / f"{fid}_{safe_name}"
            out.write_bytes(raw)
            sha = hashlib.sha256(raw).hexdigest()
            aid = _insert_attachment(
                kind="file",
                name=safe_name,
                path=str(out),
                url="",
                mime=(f.content_type or ""),
                size=len(raw),
                sha256=sha
            )
            # create a linked object on the map for this evidence item
            _insert_pin(
                kind="evidence",
                title=safe_name,
                notes=f"file evidence (sha256 {sha[:12]}…)",
                lat=dlat,
                lng=dlng,
                severity=3,
                attachment_ids=[aid]
            )
            created_attachments += 1
            created_pins += 1

    # URLs (one per line)
    if urls:
        for line in [u.strip() for u in urls.splitlines() if u.strip()]:
            aid = _insert_attachment(kind="link", name="", path="", url=line, mime="", size=0, sha256="")
            title = line
            try:
                title = re.sub(r"^https?://", "", line).split("/")[0] or line
            except Exception:
                pass
            _insert_pin(
                kind="article",
                title=title,
                notes=f"linked source: {line}",
                lat=dlat,
                lng=dlng,
                severity=3,
                attachment_ids=[aid]
            )
            created_attachments += 1
            created_pins += 1

    return {"ok": True, "created_pins": created_pins, "created_attachments": created_attachments}

@app.post("/api/wipe")
def api_wipe():
    init_db()
    con = _db()
    con.execute("DELETE FROM pin_attachments")
    con.execute("DELETE FROM pins")
    con.execute("DELETE FROM attachments")
    con.commit()
    con.close()
    # optional: keep uploaded files (evidence vault). If you want to delete them too, uncomment:
    # for p in UPLOAD_DIR.glob("*"): 
    #     try: p.unlink()
    #     except: pass
    return {"ok": True}

# ============================
# LYNX_DB_PATCH_END
# ============================
