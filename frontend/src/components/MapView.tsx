import L from "leaflet";
import { useMemo } from "react";
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import type { Entity, EntityType } from "../types/entities";
import { colorForType, iconSvgMarkup } from "../ui/typeIcons";

const { BaseLayer, Overlay } = LayersControl;

function markerHtml(type: EntityType) {
  const c = colorForType(type);
  const svg = iconSvgMarkup(type, 16);

  // CurrentColor drives SVG stroke; we set color to the category accent.
  return `
  <div class="lynxPin" style="--pin:${c}">
    <div class="lynxPinRing">
      <div class="lynxPinIcon" style="color:${c}">
        ${svg}
      </div>
    </div>
  </div>`;
}

function iconFor(type: EntityType) {
  const html = markerHtml(type);
  return L.divIcon({ html, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  if (!target) return null;
  map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 0.8 });
  return null;
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({
  entities,
  focusTarget,
  onMapPick,
}: {
  entities: Entity[];
  focusTarget: { lat: number; lng: number; zoom?: number } | null;
  onMapPick: (lat: number, lng: number) => void;
}) {
  const icons = useMemo(() => {
    const map: Record<string, L.DivIcon> = {};
    (["incident","suspect","person","org","vehicle","device","evidence","article","location","note"] as EntityType[])
      .forEach(t => map[t] = iconFor(t));
    return map;
  }, []);

  return (
    <MapContainer
      center={[40.7357, -74.1724]}
      zoom={13}
      zoomControl={false}
      preferCanvas={true}
      style={{ height: "100%", width: "100%" }}
    >
      <ClickCapture onPick={onMapPick} />
      {focusTarget && <FlyTo target={focusTarget} />}

      <ZoomControl position="bottomright" />

      <LayersControl position="bottomleft">
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
        <Marker key={e.id} position={[e.lat, e.lng]} icon={icons[e.type]}>
          <Popup>
            <strong>{e.title}</strong>
            <div style={{ marginTop: 6 }}>{e.description}</div>

            {!!e.imageUrls?.length && (
              <img
                src={e.imageUrls[0]}
                alt=""
                style={{ marginTop: 10, width: "100%", maxWidth: 260, borderRadius: 10 }}
              />
            )}

            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
              {e.type} • sev {e.severity ?? "-"} • {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
            </div>

            {!!e.links?.length && (
              <div style={{ marginTop: 8 }}>
                <a href={e.links[0]} target="_blank" rel="noreferrer">Open link</a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
