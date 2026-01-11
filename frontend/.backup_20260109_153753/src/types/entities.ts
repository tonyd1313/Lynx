export type EntityType = "incident" | "note" | "suspect" | "org" | "vehicle" | "evidence";

export type Entity = {
  id: string;
  type: EntityType;
  title: string;
  description: string;
  lat: number;
  lng: number;

  // Optional intel fields (extend freely)
  tags?: string[];
  severity?: 1 | 2 | 3 | 4 | 5;
  when?: string; // ISO or human
  links?: { label: string; url: string }[];
};
