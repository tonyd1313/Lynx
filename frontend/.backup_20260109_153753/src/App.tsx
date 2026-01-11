import { useMemo, useState } from "react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import type { Entity, EntityType } from "./types/entities";
import { dummyEntities } from "./data/dummyEntities";

function nextDummyEntity(seed: number): Entity {
  // small random nudge around Newark for "Add Pin (next)"
  const baseLat = 40.7357;
  const baseLng = -74.1724;
  const r = (n: number) => (Math.random() - 0.5) * n;

  const types: EntityType[] = ["incident", "note", "suspect", "org", "vehicle", "evidence"];
  const t = types[seed % types.length];

  return {
    id: `${t}-${Date.now()}`,
    type: t,
    title: `New ${t.toUpperCase()} (dummy)`,
    description: "Added via UI button. Replace with real creation workflow.",
    lat: baseLat + r(0.02),
    lng: baseLng + r(0.02),
    severity: (seed % 5 + 1) as 1 | 2 | 3 | 4 | 5,
    tags: ["ui-add"],
    when: new Date().toISOString(),
  };
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [seed, setSeed] = useState(1);
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const [entities, setEntities] = useState<Entity[]>(dummyEntities);

  const [enabledTypes, setEnabledTypes] = useState<Set<EntityType>>(
    () => new Set<EntityType>(["incident", "suspect", "org", "vehicle", "evidence", "note"])
  );

  const toggleType = (t: EntityType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const refresh = () => {
    // for now this just resets dummy data (later swap to FastAPI pull)
    setSeed((s) => s + 1);
    setEntities(dummyEntities);
    setFocusTarget(null);
  };

  const addNext = () => {
    setSeed((s) => s + 1);
    setEntities((prev) => [nextDummyEntity(seed), ...prev]);
  };

  const visibleEntities = useMemo(
    () => entities.filter((e) => enabledTypes.has(e.type)),
    [entities, enabledTypes]
  );

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <div className="title">LYNX</div>
          <div className="sub">Geospatial Intelligence Prototype</div>
        </div>

        <div className="headerActions">
          <button className="btn" onClick={refresh}>Refresh</button>
          <button className="btn" onClick={addNext}>Add Pin (next)</button>
        </div>

        <div className="spacer" />

        <div className="headerActions">
          <button className="btn" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </div>

      <div className={"sidebar " + (sidebarOpen ? "open" : "")}>
        <Sidebar
          entities={entities}
          enabledTypes={enabledTypes}
          toggleType={toggleType}
          onFocus={(e) => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 16 })}
        />
      </div>

      <div className="mapStage">
        <MapView entities={visibleEntities} focusTarget={focusTarget} />
      </div>
    </div>
  );
}
