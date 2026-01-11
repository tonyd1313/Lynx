import { useMemo, useState } from "react";
import type { Entity, EntityType } from "../types/entities";

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
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [tags, setTags] = useState<string>("");

  // “Expandable” fields
  const [link1, setLink1] = useState("");
  const [img1, setImg1] = useState("");

  // Example device fields
  const [ip, setIp] = useState("");
  const [mac, setMac] = useState("");
  const [hostname, setHostname] = useState("");

  // Example person/org/vehicle
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [plate, setPlate] = useState("");

  const showDevice = type === "device";
  const showPerson = type === "person" || type === "suspect";
  const showOrg = type === "org";
  const showVehicle = type === "vehicle";
  const showArticle = type === "article";
  const showLocation = type === "location";
  const showEvidence = type === "evidence";

  const typeLabel = useMemo(() => TYPES.find(t => t.type === type)?.label ?? type, [type]);

  if (!open) return null;

  function submit() {
    const links = [link1.trim()].filter(Boolean);
    const imageUrls = [img1.trim()].filter(Boolean);

    const base: Omit<Entity, "id"> = {
      type,
      title: title.trim() || `${typeLabel} Entry`,
      description: description.trim() || "(no description)",
      lat: Number(lat),
      lng: Number(lng),
      severity,
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
      source: "local",
      occurredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      links: links.length ? links : undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    };

    // Attach structured fields by type
    if (showDevice) {
      base.device = {
        hostname: hostname.trim() || undefined,
        ip: ip.trim() || undefined,
        mac: mac.trim() || undefined,
        vendor: undefined,
        notes: undefined,
      };
    }

    if (showPerson) {
      base.person = {
        name: name.trim() || undefined,
        alias: alias.trim() || undefined,
      };
    }

    if (showOrg) {
      base.org = { name: name.trim() || undefined };
    }

    if (showVehicle) {
      base.vehicle = { plate: plate.trim() || undefined };
    }

    if (showArticle) {
      base.article = { url: link1.trim() || undefined };
    }

    if (showLocation) {
      base.location = { placeName: title.trim() || undefined };
    }

    if (showEvidence) {
      base.evidence = { kind: "file", fileUrl: link1.trim() || undefined };
    }

    onCreate(base);
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Add Entry</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="grid2">
          <label className="field">
            <div className="label">Category</div>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as EntityType)}>
              {TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
          </label>

          <label className="field">
            <div className="label">Severity</div>
            <select className="input" value={severity} onChange={(e) => setSeverity(Number(e.target.value) as any)}>
              <option value={1}>1 (low)</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5 (high)</option>
            </select>
          </label>
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
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="corridor, watch, verified" />
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

        {showDevice && (
          <div className="block">
            <div className="blockTitle">Device metadata (optional)</div>
            <div className="grid3">
              <label className="field">
                <div className="label">Hostname</div>
                <input className="input" value={hostname} onChange={(e) => setHostname(e.target.value)} />
              </label>
              <label className="field">
                <div className="label">IP</div>
                <input className="input" value={ip} onChange={(e) => setIp(e.target.value)} />
              </label>
              <label className="field">
                <div className="label">MAC</div>
                <input className="input" value={mac} onChange={(e) => setMac(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {showPerson && (
          <div className="block">
            <div className="blockTitle">Person metadata (optional)</div>
            <div className="grid2">
              <label className="field">
                <div className="label">Name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <div className="label">Alias</div>
                <input className="input" value={alias} onChange={(e) => setAlias(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {showVehicle && (
          <div className="block">
            <div className="blockTitle">Vehicle metadata (optional)</div>
            <label className="field">
              <div className="label">Plate</div>
              <input className="input" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </label>
          </div>
        )}

        <div className="modalFooter">
          <button className="btn" onClick={submit}>Create</button>
        </div>
      </div>
    </div>
  );
}
