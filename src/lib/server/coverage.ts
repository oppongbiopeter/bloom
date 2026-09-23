import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { haversineKm } from "@/lib/utils";

export const UNLOCK_MODES = ["downloads", "shares", "either", "both", "manual"] as const;
export type UnlockMode = (typeof UNLOCK_MODES)[number];

export type CoverageArea = {
  id: string;
  region: string;
  name: string;
  lat: number;
  lng: number;
  open: boolean;
  locked: boolean;
  auto_open: boolean;
  unlock_mode: UnlockMode;
  downloads_required: number;
  shares_required: number;
  downloads: number;
  shares: number;
  promo_note: string;
  live: boolean;
};

function num(v: unknown) {
  return Number(v ?? 0);
}

function mapArea(row: Record<string, unknown>): CoverageArea {
  const unlock = String(row.unlock_mode ?? "either") as UnlockMode;
  const area: CoverageArea = {
    id: String(row.id),
    region: String(row.region),
    name: String(row.name),
    lat: num(row.lat),
    lng: num(row.lng),
    open: Boolean(row.open),
    locked: Boolean(row.locked),
    auto_open: Boolean(row.auto_open),
    unlock_mode: UNLOCK_MODES.includes(unlock) ? unlock : "either",
    downloads_required: num(row.downloads_required),
    shares_required: num(row.shares_required),
    downloads: num(row.downloads),
    shares: num(row.shares),
    promo_note: String(row.promo_note ?? ""),
    live: false,
  };
  area.live = isLive(area);
  return area;
}

export function goalMet(a: Pick<CoverageArea, "unlock_mode" | "downloads" | "downloads_required" | "shares" | "shares_required">) {
  if (a.unlock_mode === "manual") return false;
  const d = a.downloads >= a.downloads_required;
  const s = a.shares >= a.shares_required;
  if (a.unlock_mode === "downloads") return d;
  if (a.unlock_mode === "shares") return s;
  if (a.unlock_mode === "both") return d && s;
  return d || s;
}

export function isLive(a: CoverageArea) {
  if (a.locked) return false;
  if (a.open) return true;
  return a.auto_open && goalMet(a);
}

async function assertSuper(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ staff_role: string | null }>`select staff_role from profiles where user_id = ${userId}`;
  if (rows[0]?.staff_role !== "superadmin") throw new Error("Only the Bloom super admin can change rollout");
}

async function reconcile(areaId: string) {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`select * from coverage_areas where id = ${areaId}`;
  if (!rows[0]) return;
  const area = mapArea(rows[0]);
  if (!area.locked && !area.open && area.auto_open && goalMet(area)) {
    await sql`update coverage_areas set open = true where id = ${areaId} and locked = false`;
    await sql`insert into area_events (area_id, kind, detail) values (${areaId}, ${"open"}, ${"Goal reached. Bloom is open in this constituency."})`;
  }
}

const statusPatch = z.enum(["open", "goal", "closed"]);

function statusSql(status: "open" | "goal" | "closed") {
  if (status === "open") return { open: true, locked: false, auto_open: true };
  if (status === "closed") return { open: false, locked: true, auto_open: false };
  return { open: false, locked: false, auto_open: true };
}

export const coverageSummary = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ region: string; total: number; opened: number }>`
    select region,
      count(*)::int as total,
      count(*) filter (where open = true and locked = false)::int as opened
    from coverage_areas
    group by region
    order by region`;
  const open = rows.reduce((s, r) => s + num(r.opened), 0);
  const total = rows.reduce((s, r) => s + num(r.total), 0);
  return {
    open,
    total,
    regions: rows.map((r) => ({ region: r.region, total: num(r.total), opened: num(r.opened) })),
  };
});

export const listAreas = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from coverage_areas order by region, name`;
    return rows.map(mapArea);
  });

export const getMyCoverage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await sql<{
      area_id: string | null;
      staff_role: string | null;
      address: string;
      ghana_post: string;
      loc_lat: number | null;
      loc_lng: number | null;
    }>`
      select area_id, staff_role, address, ghana_post, loc_lat, loc_lng from profiles where user_id = ${context.userId}`;
    const areaId = profile[0]?.area_id ?? null;
    const located = {
      address: profile[0]?.address ?? "",
      ghanaPost: profile[0]?.ghana_post ?? "",
    };
    if (!areaId) {
      return { needsArea: true as const, open: false, area: null, recent: [], elsewhere: [], rank: null, sharesSent: 0, km: null, ...located };
    }
    await reconcile(areaId);
    const rows = await sql<Record<string, unknown>>`select * from coverage_areas where id = ${areaId}`;
    if (!rows[0]) {
      return { needsArea: true as const, open: false, area: null, recent: [], elsewhere: [], rank: null, sharesSent: 0, km: null, ...located };
    }
    const area = mapArea(rows[0]);
    const recent = await sql<{ kind: string; detail: string; created_at: string }>`
      select kind, detail, created_at from area_events where area_id = ${areaId} order by id desc limit 6`;
    const elsewhere = await sql<{ name: string; region: string }>`
      select name, region from coverage_areas where open = true and locked = false and id <> ${areaId} order by region, name limit 8`;
    const member = await sql<{ shares_sent: number; created_at: string }>`
      select shares_sent, created_at from area_members where user_id = ${context.userId}`;
    let rank: number | null = null;
    if (member[0]) {
      const ahead = await sql<{ n: number }>`
        select count(*)::int as n from area_members where area_id = ${areaId} and created_at <= ${member[0].created_at}`;
      rank = num(ahead[0]?.n);
    }
    const region = await sql<{ opened: number; total: number }>`
      select count(*) filter (where open = true and locked = false)::int as opened, count(*)::int as total
      from coverage_areas where region = ${area.region}`;
    const km =
      profile[0]?.loc_lat != null && profile[0]?.loc_lng != null
        ? Math.round(haversineKm({ lat: num(profile[0].loc_lat), lng: num(profile[0].loc_lng) }, area) * 10) / 10
        : null;
    return {
      needsArea: false as const,
      open: area.live,
      area,
      recent,
      elsewhere,
      rank,
      sharesSent: num(member[0]?.shares_sent),
      regionOpened: num(region[0]?.opened),
      regionTotal: num(region[0]?.total),
      km,
      ...located,
    };
  });

export const placeFromPhone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        address: z.string().min(3).max(160),
        ghanaPost: z.string().max(20).optional(),
        phone: z.string().max(40).optional(),
        referredBy: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await sql<{ staff_role: string | null }>`select staff_role from profiles where user_id = ${context.userId}`;
    if (staff[0]?.staff_role) throw new Error("Company seats are not tied to a constituency");
    const rows = await sql<Record<string, unknown>>`select * from coverage_areas`;
    if (!rows.length) throw new Error("Rollout map is empty");
    let best = mapArea(rows[0]);
    let bestKm = Infinity;
    for (const row of rows) {
      const area = mapArea(row);
      const km = haversineKm({ lat: data.lat, lng: data.lng }, area);
      if (km < bestKm) {
        best = area;
        bestKm = km;
      }
    }
    if (bestKm > 180) throw new Error("That location is outside the constituencies Bloom tracks");
    const ghanaPost = (data.ghanaPost ?? "").trim().toUpperCase();
    await sql`
      update profiles set
        address = ${data.address},
        ghana_post = ${ghanaPost},
        phone = coalesce(${data.phone ?? null}, phone),
        city = ${best.region},
        loc_lat = ${data.lat},
        loc_lng = ${data.lng},
        area_id = ${best.id}
      where user_id = ${context.userId}`;
    const existing = await sql<{ user_id: string }>`select user_id from area_members where user_id = ${context.userId}`;
    const ref = data.referredBy && data.referredBy !== context.userId ? data.referredBy : null;
    if (!existing[0]) {
      await sql`insert into area_members (user_id, area_id, referred_by) values (${context.userId}, ${best.id}, ${ref})`;
      await sql`update coverage_areas set downloads = downloads + 1 where id = ${best.id}`;
      await sql`insert into area_events (area_id, kind, detail) values (${best.id}, ${"download"}, ${"A phone in this constituency downloaded Bloom"})`;
      if (ref) {
        const refRow = await sql<{ area_id: string }>`select area_id from area_members where user_id = ${ref}`;
        if (refRow[0]) {
          await sql`update coverage_areas set shares = shares + 1 where id = ${refRow[0].area_id}`;
          await sql`insert into area_events (area_id, kind, detail) values (${refRow[0].area_id}, ${"referral"}, ${"A shared link brought a new download"})`;
          await reconcile(refRow[0].area_id);
        }
      }
      await reconcile(best.id);
    } else {
      await sql`update area_members set area_id = ${best.id} where user_id = ${context.userId}`;
    }
    await reconcile(best.id);
    const fresh = await sql<Record<string, unknown>>`select * from coverage_areas where id = ${best.id}`;
    const area = mapArea(fresh[0]);
    return { areaId: area.id, name: area.name, region: area.region, open: area.live, km: Math.round(bestKm * 10) / 10 };
  });

export const joinArea = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ areaId: z.string().min(1).max(80), referredBy: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await sql<{ staff_role: string | null }>`select staff_role from profiles where user_id = ${context.userId}`;
    if (staff[0]?.staff_role) throw new Error("Company seats are not tied to a constituency");
    const areas = await sql<{ id: string; name: string }>`select id, name from coverage_areas where id = ${data.areaId}`;
    if (!areas[0]) throw new Error("That constituency is not on the rollout map");
    const existing = await sql<{ user_id: string }>`select user_id from area_members where user_id = ${context.userId}`;
    const ref = data.referredBy && data.referredBy !== context.userId ? data.referredBy : null;
    if (!existing[0]) {
      await sql`insert into area_members (user_id, area_id, referred_by) values (${context.userId}, ${data.areaId}, ${ref})`;
      await sql`update coverage_areas set downloads = downloads + 1 where id = ${data.areaId}`;
      await sql`insert into area_events (area_id, kind, detail) values (${data.areaId}, ${"download"}, ${"Someone in this constituency downloaded Bloom"})`;
      if (ref) {
        const refRow = await sql<{ area_id: string }>`select area_id from area_members where user_id = ${ref}`;
        if (refRow[0]) {
          await sql`update coverage_areas set shares = shares + 1 where id = ${refRow[0].area_id}`;
          await sql`insert into area_events (area_id, kind, detail) values (${refRow[0].area_id}, ${"referral"}, ${"A share brought a new download"})`;
          await reconcile(refRow[0].area_id);
        }
      }
      await reconcile(data.areaId);
    } else {
      await sql`update area_members set area_id = ${data.areaId} where user_id = ${context.userId}`;
    }
    await sql`update profiles set area_id = ${data.areaId} where user_id = ${context.userId}`;
    return { ok: true };
  });

export const recordShare = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const member = await sql<{ area_id: string; shares_sent: number }>`
      select area_id, shares_sent from area_members where user_id = ${context.userId}`;
    if (!member[0]) throw new Error("Bloom has not placed this phone in a constituency yet");
    if (num(member[0].shares_sent) >= 8) {
      return { ok: true, capped: true, sharesSent: num(member[0].shares_sent) };
    }
    await sql`update area_members set shares_sent = shares_sent + 1 where user_id = ${context.userId}`;
    await sql`update coverage_areas set shares = shares + 1 where id = ${member[0].area_id}`;
    await sql`insert into area_events (area_id, kind, detail) values (${member[0].area_id}, ${"share"}, ${"A neighbour shared Bloom"})`;
    await reconcile(member[0].area_id);
    return { ok: true, capped: false, sharesSent: num(member[0].shares_sent) + 1 };
  });

export async function assertCanOrder(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ staff_role: string | null; area_id: string | null; open: boolean | null; locked: boolean | null }>`
    select p.staff_role, p.area_id, c.open, c.locked
    from profiles p
    left join coverage_areas c on c.id = p.area_id
    where p.user_id = ${userId}`;
  const row = rows[0];
  if (row?.staff_role) return;
  if (!row?.area_id) throw new Error("Add your address and allow phone location before ordering");
  await reconcile(row.area_id);
  const fresh = await sql<{ open: boolean; locked: boolean }>`select open, locked from coverage_areas where id = ${row.area_id}`;
  if (!fresh[0] || fresh[0].locked || !fresh[0].open) {
    throw new Error("Bloom is not open where this phone is yet");
  }
}

export const listCoverageAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertSuper(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from coverage_areas order by region, name`;
    for (const row of rows) {
      const area = mapArea(row);
      if (!area.locked && !area.open && area.auto_open && goalMet(area)) await reconcile(area.id);
    }
    const again = await sql<Record<string, unknown>>`select * from coverage_areas order by region, name`;
    return again.map(mapArea);
  });

const areaSettings = z.object({
  id: z.string().min(1),
  status: statusPatch,
  unlock_mode: z.enum(UNLOCK_MODES),
  downloads_required: z.number().int().min(1).max(100000),
  shares_required: z.number().int().min(1).max(100000),
  promo_note: z.string().max(240),
});

export const saveAreaSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => areaSettings.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuper(context.userId);
    const sql = await getSql();
    const s = statusSql(data.status);
    await sql`
      update coverage_areas set
        open = ${s.open},
        locked = ${s.locked},
        auto_open = ${s.auto_open},
        unlock_mode = ${data.unlock_mode},
        downloads_required = ${data.downloads_required},
        shares_required = ${data.shares_required},
        promo_note = ${data.promo_note}
      where id = ${data.id}`;
    if (data.status === "goal") await reconcile(data.id);
    await sql`insert into area_events (area_id, kind, detail) values (${data.id}, ${"admin"}, ${`Rollout set to ${data.status}`})`;
    return { ok: true };
  });

export const saveRegionSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        region: z.string().min(1),
        status: statusPatch,
        unlock_mode: z.enum(UNLOCK_MODES).optional(),
        downloads_required: z.number().int().min(1).max(100000).optional(),
        shares_required: z.number().int().min(1).max(100000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuper(context.userId);
    const sql = await getSql();
    const s = statusSql(data.status);
    await sql`
      update coverage_areas set
        open = ${s.open},
        locked = ${s.locked},
        auto_open = ${s.auto_open},
        unlock_mode = coalesce(${data.unlock_mode ?? null}, unlock_mode),
        downloads_required = coalesce(${data.downloads_required ?? null}, downloads_required),
        shares_required = coalesce(${data.shares_required ?? null}, shares_required)
      where region = ${data.region}`;
    return { ok: true, region: data.region };
  });
