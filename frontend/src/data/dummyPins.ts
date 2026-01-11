export type PinType = "incident" | "note";

export type Pin = {
  id: string;
  type: PinType;
  title: string;
  description: string;
  lat: number;
  lng: number;
};

export const dummyPins: Pin[] = [
  {
    id: "incident-a",
    type: "incident",
    title: "Sample Incident A",
    description: "Placeholder record for UI testing.",
    lat: 40.7357,
    lng: -74.1724,
  },
  {
    id: "note-b",
    type: "note",
    title: "Sample Note B",
    description: "Placeholder record for UI testing.",
    lat: 40.7411,
    lng: -74.1803,
  },
];
