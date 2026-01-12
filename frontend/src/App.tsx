import { useMemo, useState } from "react";
import MapView from "./components/MapView";
import AddEntityModal from "./components/AddEntityModal";
import type { Entity, EntityType } from "./types/entities";
import { loadEntities, resetEntities, saveEntities, uid } from "./data/storage";
import { IconForType, labelForType } from "./ui/typeIcons";

const TYPE_ORDER: EntityType[] = [
  "incident","suspect","person","org","vehicle","device","evidence","article","location","note"
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [entities, setEntities] = useState<Entity[]>(() => loadEntities());
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(() => new Set(TYPE_ORDER));

  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Map click sets the "placement" for the next entry
  const [draftLatLng, setDraftLatLng] = useState<{ lat: number; lng: number }>({ lat: 40.7357, lng: -74.1724 });

  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return entities.filter(e => activeTypes.has(e.type));
  }, [entities, activeTypes]);

  function toggleType(t: EntityType) {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function refreshToSeed() {
    const seed = resetEntities();
    setEntities(seed);
  }

  function createEntity(base: Omit<Entity, "id">) {
    const newEntity: Entity = { ...base, id: uid(base.type) };
    const next = [newEntity, ...entities];
    setEntities(next);
    saveEntities(next);
    setAddOpen(false);
    setSidebarOpen(true);
    setFocusTarget({ lat: newEntity.lat, lng: newEntity.lng, zoom: 17 });
  }

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <div className="title">LYNX</div>
          <div className="sub">Geospatial Intelligence Prototype</div>
        </div>

        <div className="headerActions">
          <button className="btn" onClick={refreshToSeed}>Refresh</button>
          <button className="btn" onClick={() => setAddOpen(true)} style={{ background: "rgba(80,130,255,.25)", borderColor: "rgba(80,130,255,.4)" }}>Add Pin</button>
        </div>

        <div className="spacer" />

        <div className="headerActions">
          <button className="btn" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </div>

      <div className={"sidebar " + (sidebarOpen ? "open" : "")}>
        <div className="sidebarInner">
          <div className="sectionTitle">Pins</div>
          <div style={{ color: "rgba(235,245,255,.68)", fontSize: 13, marginBottom: 10 }}>
            Dummy data (local) — ready to swap to FastAPI
          </div>

          <div className="chips">
            {TYPE_ORDER.map((t) => (
              <div
                key={t}
                className={"chip " + (activeTypes.has(t) ? "on" : "")}
                onClick={() => toggleType(t)}
                role="button"
                tabIndex={0}
              >
                <span className="chipIcon"><IconForType type={t} size={14} /></span>
                <span>{labelForType(t)}</span>
              </div>
            ))}
          </div>

          {filtered.map((e) => (
            <div className="card" key={e.id}>
              <div className="cardTop">
                <h3 className="cardTitle">{e.title}</h3>
                <span className="badge">
                  <span className="badgeIcon"><IconForType type={e.type} size={14} /></span>
                  {e.type}
                </span>
              </div>
              <p className="cardDesc">{e.description}</p>
              <div className="cardCoord">
                {e.lat.toFixed(4)}, {e.lng.toFixed(4)} • Sev {e.severity ?? "-"}
              </div>

              <div className="cardActions">
                <button
                  className="miniBtn"
                  onClick={() => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 15 })}
                >
                  Focus
                </button>

                <button
                  className="miniBtn"
                  onClick={() => alert(JSON.stringify(e, null, 2))}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mapStage">
        <MapView
          entities={filtered}
          focusTarget={focusTarget}
          onMapPick={(lat, lng) => setDraftLatLng({ lat, lng })}
        />
      </div>

      <AddEntityModal
        open={addOpen}
        initialLat={draftLatLng.lat}
        initialLng={draftLatLng.lng}
        onClose={() => setAddOpen(false)}
        onCreate={createEntity}
      />
    </div>
  );
}
