export const STAFF_ROLES = [
  {
    id: "superadmin",
    label: "Super admin",
    blurb: "Bloom Ghana — the company. Full desk, staff, prices and partners.",
  },
  {
    id: "pricing",
    label: "Pricing",
    blurb: "Stem prices, delivery tariff and marketplace commission.",
  },
  {
    id: "customs",
    label: "Customs",
    blurb: "GRA ICUMS duty, VAT and clearance payment.",
  },
  {
    id: "coldchain",
    label: "Cold chain",
    blurb: "Cold rooms, storage providers and lot temperatures.",
  },
  {
    id: "fulfilment",
    label: "Fulfilment",
    blurb: "Split queue, hub handover and last-mile tracking.",
  },
  {
    id: "partners",
    label: "Partners",
    blurb: "3PL, airlines, customs agents and storage houses.",
  },
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number]["id"];

export const STAFF_DESKS = [
  {
    to: "/hq",
    label: "Desk",
    blurb: "Company snapshot — open orders, lots, filings and seats.",
    roles: ["superadmin", "pricing", "customs", "coldchain", "fulfilment", "partners"] as StaffRole[],
  },
  {
    to: "/hq/queue",
    label: "Split queue",
    blurb: "Named gifts at the hub. Advance tickets from Kotoka to the door.",
    roles: ["superadmin", "fulfilment"] as StaffRole[],
  },
  {
    to: "/hq/prices",
    label: "Prices",
    blurb: "Stem catalog, last-mile tariff, freight and florist commission.",
    roles: ["superadmin", "pricing"] as StaffRole[],
  },
  {
    to: "/hq/duty",
    label: "ICUMS",
    blurb: "File GRA duty, VAT, NHIL and GETFund. Mark paid and cleared.",
    roles: ["superadmin", "customs"] as StaffRole[],
  },
  {
    to: "/hq/cold",
    label: "Cold chain",
    blurb: "Stations, storage houses and lot temperatures. Alarm above 8°C.",
    roles: ["superadmin", "coldchain"] as StaffRole[],
  },
  {
    to: "/hq/partners",
    label: "Partners",
    blurb: "Airlines, GRA agents, cold rooms and 3PL riders Bloom contracts.",
    roles: ["superadmin", "partners", "coldchain", "customs"] as StaffRole[],
  },
  {
    to: "/hq/coverage",
    label: "Rollout",
    blurb: "Which constituencies can order. Set download and share goals for everywhere else.",
    roles: ["superadmin"] as StaffRole[],
  },
  {
    to: "/hq/staff",
    label: "Staff",
    blurb: "Create seats for each function. Shop users never see this list.",
    roles: ["superadmin"] as StaffRole[],
  },
] as const;

export function canAccessDesk(role: string | null | undefined, path: string) {
  if (!role) return false;
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const exact = STAFF_DESKS.find((d) => d.to === normalized);
  if (exact) return exact.roles.includes(role as StaffRole);
  const nested = STAFF_DESKS.filter((d) => d.to !== "/hq").find((d) => normalized.startsWith(d.to));
  if (nested) return nested.roles.includes(role as StaffRole);
  return role === "superadmin";
}

export function staffLabel(role: string | null | undefined) {
  return STAFF_ROLES.find((r) => r.id === role)?.label ?? "Staff";
}
