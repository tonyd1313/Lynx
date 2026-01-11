import { renderToStaticMarkup } from "react-dom/server";
import type { EntityType } from "../types/entities";
import {
  AlertTriangle,
  UserX,
  User,
  MapPin,
  Building,
  Car,
  Cpu,
  Camera,
  FileText,
  StickyNote,
} from "lucide-react";

/**
 * Color is used for marker accent and small UI accents.
 * Icons are "real object" icons (SVG) vs letter markers.
 */
export function colorForType(t: EntityType) {
  switch (t) {
    case "incident": return "#4da3ff";
    case "suspect": return "#ff5d7a";
    case "person": return "#f472b6";
    case "org": return "#a78bfa";
    case "vehicle": return "#fbbf24";
    case "device": return "#22c55e";
    case "evidence": return "#34d399";
    case "article": return "#60a5fa";
    case "location": return "#cbd5e1";
    case "note": return "#94a3b8";
  }
}

export function labelForType(t: EntityType) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function IconForType({
  type,
  size = 16,
  className,
}: {
  type: EntityType;
  size?: number;
  className?: string;
}) {
  const props = { size, className, strokeWidth: 2.25 } as const;

  switch (type) {
    case "incident": return <AlertTriangle {...props} />;
    case "suspect": return <UserX {...props} />;
    case "person": return <User {...props} />;
    case "org": return <Building {...props} />;
    case "vehicle": return <Car {...props} />;
    case "device": return <Cpu {...props} />;
    case "evidence": return <Camera {...props} />;
    case "article": return <FileText {...props} />;
    case "location": return <MapPin {...props} />;
    case "note": return <StickyNote {...props} />;
  }
}

/**
 * Leaflet divIcon needs raw HTML; we generate SVG markup from the same icon component.
 */
export function iconSvgMarkup(type: EntityType, size = 16) {
  return renderToStaticMarkup(<IconForType type={type} size={size} />);
}
