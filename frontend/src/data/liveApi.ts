import type { Entity } from "../types/entities";

const BASE = (import.meta as any).env?.VITE_API_BASE || "";

export async function fetchPins(): Promise<Entity[]> {
  const r = await fetch(`${BASE}/api/pins`, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetchPins failed: ${r.status}`);
  return (await r.json()) as Entity[];
}

export async function postPin(pin: Omit<Entity, "id">): Promise<Entity> {
  const r = await fetch(`${BASE}/api/pins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pin),
  });
  if (!r.ok) throw new Error(`postPin failed: ${r.status}`);
  return (await r.json()) as Entity;
}

export function subscribePins(onPin: (pin: Entity) => void): () => void {
  // EventSource opens GET /api/pins/stream
  const es = new EventSource(`${BASE}/api/pins/stream`);
  es.onmessage = (ev) => {
    try { onPin(JSON.parse(ev.data)); } catch {}
  };
  es.onerror = () => {
    // let polling cover reconnect cases
  };
  return () => es.close();
}
