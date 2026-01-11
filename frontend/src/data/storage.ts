import type { Entity } from "../types/entities";
import { seedEntities } from "./seedEntities";

const KEY = "lynx_entities_v1";

export function uid(prefix = "e") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function loadEntities(): Entity[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedEntities;
    const parsed = JSON.parse(raw) as Entity[];
    return Array.isArray(parsed) && parsed.length ? parsed : seedEntities;
  } catch {
    return seedEntities;
  }
}

export function saveEntities(entities: Entity[]) {
  localStorage.setItem(KEY, JSON.stringify(entities));
}

export function resetEntities() {
  saveEntities(seedEntities);
  return seedEntities;
}
