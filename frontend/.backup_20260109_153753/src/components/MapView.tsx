import L from "leaflet";
import { useEffect } from "react";
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Entity, EntityType } from "../types/entities";

const { BaseLayer, Overlay } = LayersControl;

function colorForType(t: EntityType) {
  switch (t) {
    case "incident": return "#4da3ff";
    case "suspect": return "#ff5d7a";
    case "org": return "#a78bfa";
    case "vehicle": return "#fbbf24";
    case "evidence": return "#34d399";
    case "note": return "#94a3b8";
  }
}

function iconFor(entity: Entity) {
  const c = colorForType(entity.type);
  const label = entity.type.slice(0, 1).toUpperCase();
  const html = `
  <div style="
    width:34px;height:34px;border-radius:999px;
    background: rgba(10,16,28,.70);
    border:1px solid rgba(140,180,255,.25);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 22px rgba(0,0,0,.45);
  ">
    <div style="
      width:18px;height:18px;border-radius:999px;background:${c};
      display:flex;align-items:center;justify-content:center;
      color:#07101c;font-weight:800;font-size:11px;
      border:1px solid rgba(255,255,255,.30);
    ">${label}</div>
  </div>`;
  return L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function MapView({
  entities,
  focusTarget,
}: {
  entities: Entity[];
  focusTarget: { lat: number; lng: number; zoom?: number } | null;
}) {
  return (
    <MapContainer
      center={[40.7357, -74.1724]}
      zoom={13}
      zoomControl={true}
      preferCanvas={true}
      style={{ height: "100%", width: "100%" }}
    >
      <FlyTo target={focusTarget} />

      <LayersControl position="topright">
        <BaseLayer checked name="Dark">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
        </BaseLayer>

        <BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        </BaseLayer>

        <Overlay checked name="Labels">
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
          />
        </Overlay>
      </LayersControl>

      {entities.map((e) => (
        <Marker key={e.id} position={[e.lat, e.lng]} icon={iconFor(e)}>
          <Popup>
            <strong>{e.title}</strong>
            <div style={{ marginTop: 6 }}>{e.description}</div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              {e.type} • {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
