import { useMemo, useState, useEffect } from "react";
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

  const [activeTab, setActiveTab] = useState<"list" | "filters">("list");
  const [backendStatus, setBackendStatus] = useState<"ok" | "down" | "checking">("checking");
  const [ping, setPing] = useState<number | null>(null);

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

  async function checkHealth() {
    setBackendStatus("checking");
    const start = Date.now();
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setBackendStatus("ok");
        setPing(Date.now() - start);
      } else {
        setBackendStatus("down");
        setPing(null);
      }
    } catch {
      setBackendStatus("down");
      setPing(null);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  function clearBoard() {
    if (confirm("Clear the board? Unsaved changes will be lost.")) {
      setEntities([]);
      saveEntities([]);
      setFocusTarget(null);
    }
  }

  return (
    <div className="app">
      <div className="stars-container" style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        background: "var(--bg0)",
        pointerEvents: "none"
      }}>
        {[...Array(50)].map((_, i) => (
          <div key={i} className="star" style={{
            position: "absolute",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3}px`,
            height: `${Math.random() * 3}px`,
            background: "#fff",
            borderRadius: "50%",
            opacity: Math.random(),
            animation: `twinkle ${2 + Math.random() * 5}s infinite ease-in-out`
          }} />
        ))}
      </div>
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
          <div className="sidebarTabs" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--stroke)", paddingBottom: "10px" }}>
            <button 
              className="miniBtn" 
              onClick={() => setActiveTab("list")}
              style={{ flex: 1, background: activeTab === "list" ? "rgba(140,180,255,.15)" : "transparent" }}
            >
              List
            </button>
            <button 
              className="miniBtn" 
              onClick={() => setActiveTab("filters")}
              style={{ flex: 1, background: activeTab === "filters" ? "rgba(140,180,255,.15)" : "transparent" }}
            >
              Filters
            </button>
          </div>

          {activeTab === "filters" && (
            <div className="sidebarSection">
              <div className="sectionTitle">Type Filters</div>
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
            </div>
          )}

          {activeTab === "list" && (
            <div className="sidebarSection">
              <div className="sectionTitle">Active Pins ({filtered.length})</div>
              {filtered.map((e) => (
                <div 
                  className="card" 
                  key={e.id}
                  onClick={() => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 17 })}
                  style={{ cursor: "pointer" }}
                >
                  <div className="cardTop">
                    <h3 className="cardTitle">{e.title}</h3>
                    <span className="badge">
                      <span className="badgeIcon"><IconForType type={e.type} size={14} /></span>
                      {e.type}
                    </span>
                  </div>
                  <p className="cardDesc">{e.description}</p>
                  <div className="cardCoord">
                    {e.lat.toFixed(4)}, {e.lng.toFixed(4)} • {e.type === "incident" ? `Sev ${e.severity ?? "-"}` : `Conf ${e.confidence ?? "-"}%`}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <div className="opsOverlay" style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 40,
        background: "var(--panel)",
        border: "1px solid var(--stroke)",
        borderRadius: "14px",
        padding: "12px",
        backdropFilter: "blur(10px)",
        width: "240px",
        pointerEvents: "auto",
        transition: "transform 0.2s ease"
      }}>
        <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
          <span>LYNX OPS</span>
          <span style={{ color: backendStatus === "ok" ? "#4ade80" : "#f87171" }}>
            ● {backendStatus.toUpperCase()} {ping !== null ? `(${ping}ms)` : ""}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button className="miniBtn" onClick={checkHealth}>Ping App</button>
          <button className="miniBtn" onClick={() => alert("Save Investigation - Not implemented in dummy mode")}>Save ✅</button>
          <button className="miniBtn" onClick={clearBoard} style={{ gridColumn: "span 2", borderColor: "rgba(248,113,113,.3)" }}>Clear Board</button>
        </div>
        <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "8px", textAlign: "center" }}>
          Backend via: /api
        </div>
      </div>
    </div>
  );
}
