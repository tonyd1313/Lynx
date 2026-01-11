import type { Entity } from "../types/entities";

const BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

export async function fetchEntities(): Promise<Entity[]> {
  const res = await fetch(`${BASE}/api/entities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/entities failed: ${res.status}`);
  return res.json();
}

export async function createEntity(entity: Omit<Entity, "id">): Promise<Entity> {
  const res = await fetch(`${BASE}/api/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entity),
  });
  if (!res.ok) throw new Error(`POST /api/entities failed: ${res.status}`);
  return res.json();
}

export function subscribeEntities(onEntity: (e: Entity) => void): () => void {
  const es = new EventSource(`${BASE}/api/stream`);
  es.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as Entity;
      onEntity(parsed);
    } catch {}
  };
  return () => es.close();
}
