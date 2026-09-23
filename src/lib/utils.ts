import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ghs(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function prettyStatus(s: string) {
  return s.replaceAll("_", " ");
}

/** Local calendar day, not UTC — DayPicker dates are midnight local. */
export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s1)));
}

export const AREAS: { name: string; city: string; lat: number; lng: number }[] = [
  { name: "East Legon", city: "Accra", lat: 5.6362, lng: -0.1514 },
  { name: "Airport Residential", city: "Accra", lat: 5.605, lng: -0.175 },
  { name: "Cantonments", city: "Accra", lat: 5.576, lng: -0.174 },
  { name: "Osu", city: "Accra", lat: 5.558, lng: -0.182 },
  { name: "Labone", city: "Accra", lat: 5.569, lng: -0.171 },
  { name: "Tema Community 1", city: "Tema", lat: 5.669, lng: 0.016 },
  { name: "Spintex", city: "Accra", lat: 5.632, lng: -0.087 },
  { name: "Kumasi Adum", city: "Kumasi", lat: 6.691, lng: -1.623 },
  { name: "Takoradi Market Circle", city: "Takoradi", lat: 4.901, lng: -1.759 },
  { name: "Madina", city: "Accra", lat: 5.683, lng: -0.167 },
];

export type Station = { id: string; name: string; city: string; lat: number; lng: number };

export function nearestStation(point: { lat: number; lng: number }, stations: Station[]) {
  let best = stations[0];
  let bestKm = Infinity;
  for (const s of stations) {
    const km = haversineKm(point, s);
    if (km < bestKm) {
      best = s;
      bestKm = km;
    }
  }
  return { station: best, km: bestKm };
}

/** Base + per-km from the nearest sorting station. HQ can change the tariff. */
export function deliveryFeeFor(km: number, base = 25, perKm = 4.5) {
  return Math.round((base + km * perKm) * 100) / 100;
}

export const PACKAGES = [
  { id: "kraft", label: "Kraft wrap", fee: 0 },
  { id: "hatbox", label: "Hat box", fee: 35 },
  { id: "vase", label: "Glass vase", fee: 45 },
  { id: "hamper", label: "Hamper basket", fee: 55 },
  { id: "cello", label: "Cellophane bouquet", fee: 12 },
] as const;

export const ADDONS = [
  { id: "balloon", label: "Balloon", fee: 25 },
  { id: "card", label: "Gift card", fee: 15 },
  { id: "chocolate", label: "Chocolate", fee: 40 },
  { id: "wine", label: "Mini wine", fee: 80 },
] as const;

export const ACCOUNT_TYPES = [
  {
    id: "personal",
    label: "Personal",
    blurb: "Birthdays, anniversaries and private occasions. Reminders land a week before.",
  },
  {
    id: "organizer",
    label: "Event organizer",
    blurb: "Client events, venue dates and anniversary follow-ups for the people you host.",
  },
  {
    id: "corporate",
    label: "Corporate",
    blurb: "Staff birthdays, holidays and batch gifts. Upload Excel. We split and deliver.",
  },
  {
    id: "florist",
    label: "Partner florist",
    blurb: "List your shop on Bloom. We send you orders or deliver for a commission.",
  },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["id"] | "staff";

export const OCCASIONS = [
  {
    id: "birthday",
    label: "Birthday",
    blurb: "A week of runway, a named gift at the door.",
    img: "/flowers/giselle.jpg",
  },
  {
    id: "anniversary",
    label: "Anniversary",
    blurb: "Garden roses for the private dates on your calendar.",
    img: "/flowers/mansfield.jpg",
  },
  {
    id: "wedding",
    label: "Wedding",
    blurb: "Bridal sprays and venue stems — split per table if you need.",
    img: "/flowers/julietta.jpg",
  },
  {
    id: "corporate",
    label: "Corporate",
    blurb: "Staff birthdays and client hampers from one batch order.",
    img: "/flowers/naomi.jpg",
  },
  {
    id: "thanks",
    label: "Thank you",
    blurb: "Same-day Accra florists when the note has to land today.",
    img: "/flowers/rose-peach.jpg",
  },
] as const;

export const PRODUCT_OCCASIONS: Record<string, string[]> = {
  mansfield: ["anniversary", "birthday", "thanks"],
  giselle: ["birthday", "thanks"],
  julietta: ["wedding", "anniversary"],
  fancy: ["wedding", "birthday"],
  naomi: ["corporate", "thanks"],
  "east-legon-mix": ["corporate", "birthday"],
  "osu-blush": ["thanks", "birthday"],
  "labone-hat": ["anniversary", "corporate"],
  "ashanti-bridal": ["wedding"],
};

export function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function projectGhana(lat: number, lng: number) {
  const minLng = -2.2;
  const maxLng = 0.35;
  const minLat = 4.65;
  const maxLat = 7.25;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(96, Math.max(4, y)) };
}
