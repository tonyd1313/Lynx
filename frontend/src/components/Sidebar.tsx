import type { Entity, EntityType } from "../types/entities";

const TYPE_ORDER: EntityType[] = ["incident", "suspect", "org", "vehicle", "evidence", "note"];

function typeLabel(t: EntityType) {
  switch (t) {
    case "incident": return "Incident";
    case "suspect": return "Suspect";
    case "org": return "Org";
    case "vehicle": return "Vehicle";
    case "evidence": return "Evidence";
    case "note": return "Note";
  }
}

export default function Sidebar({
  entities,
  enabledTypes,
  toggleType,
  onFocus,
}: {
  entities: Entity[];
  enabledTypes: Set<EntityType>;
  toggleType: (t: EntityType) => void;
  onFocus: (e: Entity) => void;
}) {
  const filtered = entities.filter((e) => enabledTypes.has(e.type));

  return (
    <div className="sidebarInner">
      <div className="sectionTitle">Pins</div>
      <div style={{ color: "rgba(235,245,255,.68)", fontSize: 13, marginBottom: 6 }}>
        Dummy data (local) — ready to swap to FastAPI
      </div>

      <div className="chips">
        {TYPE_ORDER.map((t) => (
          <div
            key={t}
            className={"chip " + (enabledTypes.has(t) ? "on" : "")}
            onClick={() => toggleType(t)}
          >
            {typeLabel(t)}
          </div>
        ))}
      </div>

      {filtered.map((e) => (
        <div className="card" key={e.id}>
          <div className="cardTop">
            <h3 className="cardTitle">{e.title}</h3>
            <span className="badge">{e.type}</span>
          </div>

          <p className="cardDesc">{e.description}</p>

          <div className="cardCoord">
            {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
            {typeof e.severity === "number" ? ` • Sev ${e.severity}` : ""}
          </div>

          <div className="cardActions">
            <button className="miniBtn" onClick={() => onFocus(e)}>Focus</button>
            <button className="miniBtn" onClick={() => alert("Detail drawer/modal goes here.")}>Details</button>
          </div>
        </div>
      ))}
    </div>
  );
}
