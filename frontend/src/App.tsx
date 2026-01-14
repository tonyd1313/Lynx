import { useMemo, useState, useEffect } from "react";
import MapView from "./components/MapView";
import AddEntityModal from "./components/AddEntityModal";
import type { Entity, EntityType } from "./types/entities";
import { labelForType } from "./ui/typeIcons";
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
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleTimeString());
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("lynx_theme") as "dark" | "light") || "dark";
  });

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
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lynx_theme", theme);
  }, [theme]);

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
    setLastRefresh(new Date().toLocaleTimeString());
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "a" && !addOpen && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        setAddOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addOpen]);

  useEffect(() => {
    checkHealth();
  }, []);

  function clearBoard() {
    if (confirm("Clear board? This removes current pins from workspace.")) {
      setEntities([]);
      setFocusTarget(null);
    }
  }

  function saveInvestigation() {
    const snapshot = {
      entities,
      activeTypes: Array.from(activeTypes),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("lynx_investigation", JSON.stringify(snapshot));
    alert("Investigation saved to local storage.");
  }

  const [search, setSearch] = useState("");

  return (
    <div className={`app ${theme}`}>
      <div className="stars-container">
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
          <div className="gn-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            <span>OPAL C2</span>
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
            <div className="user-email">TONY DRUMRIGHT</div>
            <div className="user-email-muted">tonydrumright5@gmail.com</div>
          </div>
          <div className="user-avatar">T</div>
        </div>
      </div>

      <div className="gn-search-container">
        <div className="gn-search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder='Search threats, IPs, tags...' 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <span className="clear-search" onClick={() => setSearch("")} style={{ cursor: 'pointer', padding: '0 8px', color: 'var(--muted)' }}>✕</span>}
          <span className="shortcut-hint">⌘ K</span>
        </div>
      </div>

      <div className="mapStage">
        <MapView
          entities={filtered}
          focusTarget={focusTarget}
          onMapPick={(lat, lng) => setDraftLatLng({ lat, lng })}
        />
        
        <div className="headerActions">
            <button className="btn" onClick={refreshToSeed}>Refresh</button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>Add Pin</button>
            <button className="btn" onClick={() => setSidebarOpen(v => !v)}>Panel</button>
        </div>

        <div className={"sidebar " + (sidebarOpen ? "open" : "")}>
          <div className="sidebarInner">
            <div className="sidebarHeader">
              <div className="results-count">{filtered.length} Results</div>
              <button className="miniBtn" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <div className="sidebarTabs">
              <button className="miniBtn" onClick={() => setActiveTab("list")} style={{ flex: 1, background: activeTab === "list" ? "rgba(46,160,67,.15)" : "transparent" }}>List</button>
              <button className="miniBtn" onClick={() => setActiveTab("filters")} style={{ flex: 1, background: activeTab === "filters" ? "rgba(46,160,67,.15)" : "transparent" }}>Filters</button>
            </div>

            {activeTab === "filters" && (
              <div className="sidebarSection">
                <div className="chips">
                  {TYPE_ORDER.map((t) => (
                    <div key={t} className={"chip " + (activeTypes.has(t) ? "on" : "")} onClick={() => toggleType(t)} role="button">
                      <span>{labelForType(t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "list" && (
              <div className="sidebarSection">
                {filtered.length === 0 ? (
                  <div className="empty-state">No pins yet. Click Add Pin to start.</div>
                ) : (
                  filtered.map((e) => (
                    <div className="gn-card" key={e.id} onClick={() => setFocusTarget({ lat: e.lat, lng: e.lng, zoom: 17 })}>
                      <div className="card-ip">{e.lat.toFixed(4)}, {e.lng.toFixed(4)}</div>
                      <div className="card-meta">
                        <div>{e.title}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="opsPanel" data-lynx-ops="1">
          <div className="opsHeader">
            <div className="opsTitle">
              <span className={`status-dot ${backendStatus}`}></span>
              LYNX OPS
            </div>
            <div className="opsStatusGroup">
              <div>Backend: /api</div>
              <div>Status: {backendStatus} {ping !== null ? `(${ping}ms)` : ""}</div>
              <div>Pins: {entities.length}</div>
              <div>Refresh: {lastRefresh}</div>
            </div>
          </div>
          <div className="opsGrid">
            <button className="opsBtn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button className="opsBtn" onClick={checkHealth}>Ping API</button>
            <button className="opsBtn" onClick={saveInvestigation}>Save Investigation</button>
            <button className="opsBtn" onClick={clearBoard}>Clear Board</button>
            <button className="opsBtn" style={{ gridColumn: "span 2" }} onClick={refreshToSeed}>Force Refresh</button>
          </div>
        </div>
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
