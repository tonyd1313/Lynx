from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from typing import Any, Dict, List
import asyncio, json, time, os

app = FastAPI(title="LYNX Backend (shim)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PINS: List[Dict[str, Any]] = []

@app.get("/api/health")
def health():
    return {"ok": True, "ts": int(time.time()), "pins": len(PINS)}

@app.get("/api/pins")
def list_pins():
    return PINS

@app.post("/api/pins")
def create_pin(pin: Dict[str, Any]):
    pin = dict(pin)
    pin.setdefault("id", f"pin-{int(time.time()*1000)}")
    pin.setdefault("createdAt", int(time.time()))
    PINS.append(pin)
    # Broadcast to all listeners (simplified for shim)
    # In a real app, we'd use a more robust pub/sub
    return pin

@app.get("/api/pins/stream")
async def pins_stream():
    async def gen():
        # basic SSE heartbeat + pins snapshot
        while True:
            payload = {"ts": int(time.time()), "pins": PINS[-50:]}
            yield f"event: pins\ndata: {json.dumps(payload)}\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(gen(), media_type="text/event-stream")

static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
