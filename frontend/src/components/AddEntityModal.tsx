import { useMemo, useState } from "react";
import type { Entity, EntityType } from "../types/entities";
import { IconForType } from "../ui/typeIcons";

const TYPES: { type: EntityType; label: string }[] = [
  { type: "incident", label: "Incident" },
  { type: "suspect", label: "Suspect" },
  { type: "person", label: "Person" },
  { type: "org", label: "Org" },
  { type: "vehicle", label: "Vehicle" },
  { type: "device", label: "Device" },
  { type: "evidence", label: "Evidence" },
  { type: "article", label: "Article" },
  { type: "location", label: "Location" },
  { type: "note", label: "Note" },
];

export default function AddEntityModal({
  open,
  initialLat,
  initialLng,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialLat: number;
  initialLng: number;
  onClose: () => void;
  onCreate: (entity: Omit<Entity, "id">) => void;
}) {
  const [type, setType] = useState<EntityType>("incident");
  const [title, setTitle] = useState("New Entry");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [severity, setSeverity] = useState<number>(2);
  const [confidence, setConfidence] = useState<number>(85);
  const [tags, setTags] = useState<string>("corridor, watch, verified");
  const [link1, setLink1] = useState("");
  const [img1, setImg1] = useState("");

  const [ip, setIp] = useState("");
  const [mac, setMac] = useState("");
  const [hostname, setHostname] = useState("");
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [plate, setPlate] = useState("");

  useMemo(() => {
    setLat(initialLat);
    setLng(initialLng);
  }, [initialLat, initialLng]);

  if (!open) return null;

  const isIntelType = type !== "incident" && type !== "note";

  function submit() {
    const links = [link1.trim()].filter(Boolean);
    const imageUrls = [img1.trim()].filter(Boolean);

    const base: any = {
      type,
      title: title.trim(),
      description: description.trim(),
      lat: Number(lat),
      lng: Number(lng),
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
      source: "local",
      occurredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      links: links.length ? links : undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    };

    if (type === "incident") base.severity = severity;
    else if (isIntelType) base.confidence = confidence;

    if (type === "device") base.device = { hostname, ip, mac };
    if (type === "person" || type === "suspect") base.person = { name, alias };
    if (type === "org") base.org = { name };
    if (type === "vehicle") base.vehicle = { plate };

    onCreate(base);
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Add Entry</div>
          <button className="btn" onClick={onClose} style={{ fontSize: '12px', padding: '4px 12px' }}>Close</button>
        </div>

        <div className="chips" style={{ marginBottom: "20px" }}>
          {TYPES.map((t) => (
            <div
              key={t.type}
              className={"chip " + (type === t.type ? "on" : "")}
              onClick={() => setType(t.type)}
              role="button"
              style={{ padding: "8px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <IconForType type={t.type} size={14} />
              {t.label}
            </div>
          ))}
        </div>

        <div className="grid2">
          <label className="field">
            <div className="label">Category</div>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as EntityType)}>
              {TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
          </label>

          {type === "incident" ? (
            <label className="field">
              <div className="label">Severity</div>
              <select className="input" value={severity} onChange={(e) => setSeverity(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          ) : isIntelType ? (
            <label className="field">
              <div className="label">Confidence (%)</div>
              <input type="number" className="input" min={0} max={100} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
            </label>
          ) : <div className="field" />}
        </div>

        <label className="field">
          <div className="label">Title</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field">
          <div className="label">Description</div>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid2">
          <label className="field">
            <div className="label">Latitude</div>
            <input className="input" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          </label>
          <label className="field">
            <div className="label">Longitude</div>
            <input className="input" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
          </label>
        </div>

        <label className="field">
          <div className="label">Tags (comma-separated)</div>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>

        <div className="grid2">
          <label className="field">
            <div className="label">Link / URL (optional)</div>
            <input className="input" value={link1} onChange={(e) => setLink1(e.target.value)} placeholder="https://..." />
          </label>
          <label className="field">
            <div className="label">Image URL (optional)</div>
            <input className="input" value={img1} onChange={(e) => setImg1(e.target.value)} placeholder="https://..." />
          </label>
        </div>

        {(type === "device") && (
          <div className="block">
            <div className="blockTitle">Device Details</div>
            <div className="grid2">
              <input className="input" placeholder="IP Address" value={ip} onChange={(e) => setIp(e.target.value)} />
              <input className="input" placeholder="MAC Address" value={mac} onChange={(e) => setMac(e.target.value)} />
            </div>
          </div>
        )}

        {(type === "person" || type === "suspect") && (
          <div className="block">
            <div className="blockTitle">Individual Details</div>
            <div className="grid2">
              <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
            </div>
          </div>
        )}

        {type === "vehicle" && (
          <div className="block">
            <div className="blockTitle">Vehicle Details</div>
            <input className="input" placeholder="License Plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
        )}

        <div className="modalFooter">
          <button className="btn" onClick={submit} style={{ background: "rgba(46,160,67,0.2)", border: "1px solid #2ea043", color: "#fff", padding: "8px 20px", borderRadius: "8px" }}>Create</button>
        </div>
      </div>
    </div>
  );
}
