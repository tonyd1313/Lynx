import { useMemo, useState, useEffect } from "react";
import MapView from "./components/MapView";
import AddEntityModal from "./components/AddEntityModal";
import type { Entity, EntityType } from "./types/entities";
import { loadEntities, resetEntities, saveEntities, uid } from "./data/storage";
import { IconForType, labelForType } from "./ui/typeIcons";
import { fetchPins, postPin, subscribePins } from "./data/liveApi";

const TYPE_ORDER: EntityType[] = [
  "incident","suspect","person","org","vehicle","device","evidence","article","location","note"
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [entities, setEntities] = useState<Entity[]>([]);
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

  useEffect(() => {
    // Initial fetch
    fetchPins().then(setEntities).catch(console.error);

    // Subscribe to SSE
    const unsubscribe = subscribePins((payload: any) => {
      if (payload.pins) {
        setEntities(payload.pins);
      } else if (payload.id) {
        // Single pin update
        setEntities(prev => {
          const exists = prev.find(p => p.id === payload.id);
          if (exists) return prev.map(p => p.id === payload.id ? payload : p);
          return [payload, ...prev];
        });
      }
    });

    return () => unsubscribe();
  }, []);

  function refreshToSeed() {
    fetchPins().then(setEntities).catch(console.error);
  }

  async function createEntity(base: Omit<Entity, "id">) {
    try {
      const newEntity = await postPin(base);
      setEntities(prev => [newEntity, ...prev]);
      setAddOpen(false);
      setSidebarOpen(true);
      setFocusTarget({ lat: newEntity.lat, lng: newEntity.lng, zoom: 17 });
    } catch (err) {
      console.error("Failed to post pin:", err);
    }
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
      // In a real app we might call a DELETE /api/pins
      setEntities([]);
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
        background: "#000",
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

      <div className="gn-header">
        <div className="gn-nav-left">
          <div className="gn-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
            <span>GREYNOISE</span>
          </div>
          <nav className="gn-links">
            <a href="#">TRENDS</a>
            <a href="#">TODAY</a>
            <a href="#">TAGS</a>
            <a href="#">ANALYSIS</a>
          </nav>
        </div>
        <div className="gn-nav-right">
          <span className="user-email">tonydrumright5@gmail.com</span>
        </div>
      </div>

      <div className="gn-search-container">
        <div className="gn-search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder='tags:"CrushFTP RCE Attempt"' />
          <span className="shortcut-hint">⌘ K</span>
        </div>
      </div>

      <div className="mapStage">
        <MapView
          entities={filtered}
          focusTarget={focusTarget}
          onMapPick={(lat, lng) => setDraftLatLng({ lat, lng })}
        />
      </div>

      <div className={"sidebar " + (sidebarOpen ? "open" : "")}>
        <div className="sidebarInner">
          <div className="results-count">{filtered.length} Results</div>
          
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
              <div className="sectionTitle">Classification</div>
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
              {filtered.map((e) => (
                <div 
                  className="gn-card" 
                  key={e.id}
                  onClick={() => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 17 })}
                >
                  <div className="card-labels">
                    <span className="label-benign">{e.type.toUpperCase()}</span>
                    <span className="label-hosting">HOSTING</span>
                  </div>
                  <div className="card-ip">{e.lat.toFixed(4)}, {e.lng.toFixed(4)}</div>
                  <div className="card-meta">
                    <div><strong>TITLE:</strong> {e.title}</div>
                    <div><strong>LAST SEEN:</strong> 2025-08-31</div>
                  </div>
                  <div className="card-tags">
                    <span className="tag-pill">{e.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="headerActions" style={{ position: "absolute", top: "140px", left: "20px", zIndex: 2500 }}>
          <button className="btn" onClick={refreshToSeed}>Refresh</button>
          <button className="btn" onClick={() => setAddOpen(true)} style={{ background: "#2ea043", color: "#fff", borderColor: "#2ea043" }}>Add Pin</button>
          <button className="btn" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
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
        zIndex: 2500,
        background: "rgba(13,17,23,.95)",
        border: "1px solid var(--stroke)",
        borderRadius: "6px",
        padding: "12px",
        backdropFilter: "blur(10px)",
        width: "240px",
        pointerEvents: "auto",
        transition: "transform 0.2s ease"
      }}>
        <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
          <span>LYNX OPS</span>
          <span style={{ color: backendStatus === "ok" ? "#2ea043" : "#f87171" }}>
            ● {backendStatus.toUpperCase()} {ping !== null ? `(${ping}ms)` : ""}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button className="miniBtn" onClick={checkHealth}>Ping App</button>
          <button className="miniBtn" onClick={() => alert("Save Investigation")}>Save</button>
          <button className="miniBtn" onClick={clearBoard} style={{ gridColumn: "span 2", borderColor: "rgba(248,113,113,.3)" }}>Clear Board</button>
        </div>
      </div>
    </div>
  );
}
