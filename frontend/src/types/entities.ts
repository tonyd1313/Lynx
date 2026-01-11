export type EntityType =
  | "incident"
  | "note"
  | "suspect"
  | "person"
  | "org"
  | "vehicle"
  | "device"
  | "evidence"
  | "article"
  | "location";

export type Entity = {
  id: string;
  type: EntityType;

  title: string;
  description: string;

  lat: number;
  lng: number;

  // Common metadata
  severity?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  source?: string;         // e.g., "observer", "news", "report", "tip"
  occurredAt?: string;     // ISO timestamp
  updatedAt?: string;      // ISO timestamp
  links?: string[];        // urls
  imageUrls?: string[];    // urls

  // Optional structured fields (by category)
  person?: {
    name?: string;
    alias?: string;
    age?: string;
    notes?: string;
  };

  org?: {
    name?: string;
    role?: string;
    notes?: string;
  };

  vehicle?: {
    plate?: string;
    make?: string;
    model?: string;
    color?: string;
    notes?: string;
  };

  device?: {
    hostname?: string;
    ip?: string;   // store only what you are authorized to store
    mac?: string;  // store only what you are authorized to store
    vendor?: string;
    notes?: string;
  };

  evidence?: {
    kind?: string;       // "photo" | "video" | "doc" | "audio" | etc
    fileUrl?: string;
    hash?: string;       // if you want integrity tracking
    notes?: string;
  };

  article?: {
    outlet?: string;
    url?: string;
    author?: string;
    notes?: string;
  };

  location?: {
    address?: string;
    placeName?: string;
    notes?: string;
  };

  // Escape hatch: anything else
  attributes?: Record<string, unknown>;
};
