import { useMemo, useState, useEffect } from "react";
import MapView from "./components/MapView";
import AddEntityModal from "./components/AddEntityModal";
import type { Entity, EntityType } from "./types/entities";
import { IconForType, labelForType } from "./ui/typeIcons";
import { fetchPins, postPin, subscribePins } from "./data/liveApi";

const TYPE_ORDER: EntityType[] = [
  "incident","suspect","person","org","vehicle","device","evidence","article","location","note"
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(() => new Set(TYPE_ORDER));
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [draftLatLng, setDraftLatLng] = useState<{ lat: number; lng: number }>({ lat: 40.7357, lng: -74.1724 });
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "filters">("list");
  const [backendStatus, setBackendStatus] = useState<"ok" | "down" | "checking">("checking");
  const [ping, setPing] = useState<number | null>(null);

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

  useEffect(() => {
    fetchPins().then(setEntities).catch(console.error);
    const unsubscribe = subscribePins((payload: any) => {
      if (payload.pins) {
        setEntities(payload.pins);
      } else if (payload.id) {
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
        background: "radial-gradient(circle at center, #111 0%, #000 100%)",
        pointerEvents: "none"
      }}>
        {[...Array(100)].map((_, i) => (
          <div key={i} className="star" style={{
            position: "absolute",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            background: i % 5 === 0 ? "#2ea043" : "#fff",
            borderRadius: "50%",
            opacity: Math.random(),
            boxShadow: i % 10 === 0 ? "0 0 10px #2ea043" : "none",
            animation: `twinkle ${3 + Math.random() * 7}s infinite ease-in-out`
          }} />
        ))}
      </div>

      <div className="gn-header">
        <div className="gn-nav-left">
          <div className="gn-logo" style={{ color: "#2ea043" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            <span style={{ fontWeight: "bold", letterSpacing: "1px" }}>OPAL C2</span>
          </div>
          <nav className="gn-links">
            <a href="#" className="active">OPERATIONS</a>
            <a href="#">INTEL</a>
            <a href="#">COVERAGE</a>
            <a href="#">ANALYSIS</a>
          </nav>
        </div>
        <div className="gn-nav-right">
          <div style={{ textAlign: "right", marginRight: "12px" }}>
            <div className="user-email" style={{ fontSize: "12px", lineHeight: "1.2" }}>TONY DRUMRIGHT</div>
            <div style={{ fontSize: "10px", color: "var(--muted)" }}>tonydrumright5@gmail.com</div>
          </div>
          <div className="user-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2ea043", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold" }}>T</div>
        </div>
      </div>

      <div className="gn-search-container">
        <div className="gn-search-box" style={{ 
          background: "rgba(13,17,23,0.8)", 
          border: "1px solid rgba(46,160,67,0.4)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 10px rgba(46,160,67,0.1)"
        }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder='Search threats, IPs, tags...' />
          <span className="shortcut-hint" style={{ background: "rgba(46,160,67,0.1)", color: "#2ea043", border: "1px solid rgba(46,160,67,0.2)" }}>⌘ K</span>
        </div>
      </div>

      <div className="mapStage">
        <MapView
          entities={filtered}
          focusTarget={focusTarget}
          onMapPick={(lat, lng) => setDraftLatLng({ lat, lng })}
        />
      </div>

      <div className="headerActions" style={{ 
        position: "absolute", 
        top: "160px", 
        left: "calc(5vw + 30px)", 
        zIndex: 2500,
        display: "flex",
        gap: "6px"
      }}>
          <button className="btn" onClick={refreshToSeed}>Refresh</button>
          <button className="btn" onClick={() => setAddOpen(true)} style={{ background: "rgba(46,160,67,0.2)", borderColor: "rgba(46,160,67,0.4)", color: "#fff" }}>Add Pin</button>
          <button className="btn" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? "Hide" : "Panel"}
          </button>
      </div>

      <div className={"sidebar " + (sidebarOpen ? "open" : "")}>
        <div className="sidebarInner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div className="results-count">{filtered.length} Results</div>
            <button className="miniBtn" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
          <div className="sidebarTabs" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--stroke)", paddingBottom: "10px" }}>
            <button className="miniBtn" onClick={() => setActiveTab("list")} style={{ flex: 1, background: activeTab === "list" ? "rgba(46,160,67,.15)" : "transparent" }}>List</button>
            <button className="miniBtn" onClick={() => setActiveTab("filters")} style={{ flex: 1, background: activeTab === "filters" ? "rgba(46,160,67,.15)" : "transparent" }}>Filters</button>
          </div>

          {activeTab === "filters" && (
            <div className="sidebarSection">
              <div className="sectionTitle">Classification</div>
              <div className="chips">
                {TYPE_ORDER.map((t) => (
                  <div key={t} className={"chip " + (activeTypes.has(t) ? "on" : "")} onClick={() => toggleType(t)} role="button" tabIndex={0}>
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
                <div className="gn-card" key={e.id} onClick={() => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 17 })}>
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

      <AddEntityModal
        open={addOpen}
        initialLat={draftLatLng.lat}
        initialLng={draftLatLng.lng}
        onClose={() => setAddOpen(false)}
        onCreate={createEntity}
      />

      <div className="opsOverlay" style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 2500,
        background: "rgba(13,17,23,.8)",
        border: "1px solid rgba(46,160,67,0.4)",
        borderRadius: "4px",
        padding: "6px 10px",
        backdropFilter: "blur(10px)",
        width: "180px",
        pointerEvents: "auto",
        transition: "transform 0.2s ease",
        fontSize: "10px"
      }}>
        <div style={{ color: "var(--muted)", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>OPS</span>
          <span style={{ color: backendStatus === "ok" ? "#2ea043" : "#f87171" }}>
            ● {backendStatus.toUpperCase()} {ping !== null ? `(${ping}ms)` : ""}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          <button className="miniBtn" style={{ padding: "2px 4px", fontSize: "9px" }} onClick={checkHealth}>Ping</button>
          <button className="miniBtn" style={{ padding: "2px 4px", fontSize: "9px" }} onClick={clearBoard}>Clear</button>
        </div>
      </div>
    </div>
  );
}
