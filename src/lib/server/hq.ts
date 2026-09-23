import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { quoteDuty } from "@/lib/duty";
import { loadSettings } from "@/lib/server/settings";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff";
import type { Station } from "@/lib/utils";

function num(v: unknown) {
  return Number(v ?? 0);
}

async function staffOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{
    staff_role: string | null;
    display_name: string;
    account_type: string;
  }>`select staff_role, display_name, account_type from profiles where user_id = ${userId}`;
  return rows[0] ?? null;
}

async function assertStaff(userId: string, allowed?: StaffRole[]) {
  const p = await staffOf(userId);
  const role = p?.staff_role;
  if (!role) throw new Error("Bloom HQ only");
  if (allowed && role !== "superadmin" && !allowed.includes(role as StaffRole)) {
    throw new Error("You do not have this desk");
  }
  return role as StaffRole;
}

export const hqReady = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*)::int as n from profiles where staff_role = ${"superadmin"}`;
  return { ready: num(rows[0]?.n) > 0 };
});

export const initializeHq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ display_name: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ n: number }>`select count(*)::int as n from profiles where staff_role = ${"superadmin"}`;
    if (num(existing[0]?.n) > 0) throw new Error("Bloom HQ is already initialized");
    await sql`
      insert into profiles (user_id, account_type, display_name, company_name, city, staff_role)
      values (${context.userId}, ${"staff"}, ${data.display_name}, ${"Bloom Ghana"}, ${"Accra"}, ${"superadmin"})
      on conflict (user_id) do update set
        account_type = ${"staff"},
        display_name = excluded.display_name,
        company_name = ${"Bloom Ghana"},
        staff_role = ${"superadmin"}
    `;
    return { ok: true };
  });

export const getHqSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "pricing", "customs"]);
    return loadSettings();
  });

export const saveHqSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        delivery_base: z.number().min(0),
        delivery_per_km: z.number().min(0),
        usd_ghs: z.number().positive(),
        air_freight_per_kg: z.number().min(0),
        ocean_freight_per_kg: z.number().min(0),
        icums_duty_pct: z.number().min(0),
        icums_vat_pct: z.number().min(0),
        nhil_pct: z.number().min(0),
        getfund_pct: z.number().min(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "pricing", "customs"]);
    const sql = await getSql();
    await sql`
      insert into hq_settings (id, delivery_base, delivery_per_km, usd_ghs, air_freight_per_kg, ocean_freight_per_kg, icums_duty_pct, icums_vat_pct, nhil_pct, getfund_pct)
      values (${"bloom"}, ${data.delivery_base}, ${data.delivery_per_km}, ${data.usd_ghs}, ${data.air_freight_per_kg}, ${data.ocean_freight_per_kg}, ${data.icums_duty_pct}, ${data.icums_vat_pct}, ${data.nhil_pct}, ${data.getfund_pct})
      on conflict (id) do update set
        delivery_base = excluded.delivery_base,
        delivery_per_km = excluded.delivery_per_km,
        usd_ghs = excluded.usd_ghs,
        air_freight_per_kg = excluded.air_freight_per_kg,
        ocean_freight_per_kg = excluded.ocean_freight_per_kg,
        icums_duty_pct = excluded.icums_duty_pct,
        icums_vat_pct = excluded.icums_vat_pct,
        nhil_pct = excluded.nhil_pct,
        getfund_pct = excluded.getfund_pct,
        updated_at = now()
    `;
    return { ok: true };
  });

export const listHqStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    const orders = await sql<{ n: number }>`select count(*)::int as n from orders where status <> ${"DELIVERED"}`;
    const lots = await sql<{ n: number }>`select count(*)::int as n from cold_lots where status = ${"IN_STORE"}`;
    const duty = await sql<{ n: number }>`select count(*)::int as n from duty_filings where status <> ${"CLEARED"}`;
    const staff = await sql<{ n: number }>`select count(*)::int as n from profiles where staff_role is not null`;
    const partners = await sql<{ n: number }>`select count(*)::int as n from partners where status = ${"active"}`;
    return {
      openOrders: num(orders[0]?.n),
      lotsInStore: num(lots[0]?.n),
      openFilings: num(duty[0]?.n),
      staff: num(staff[0]?.n),
      partners: num(partners[0]?.n),
    };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin"]);
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      display_name: string;
      staff_role: string;
      email: string;
    }>`
      select p.user_id, p.display_name, p.staff_role, coalesce(u.email, '') as email
      from profiles p
      left join "user" u on u.id = p.user_id
      where p.staff_role is not null
      order by p.staff_role, p.display_name
    `;
    return rows;
  });

const staffInput = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(80),
  staff_role: z.enum(STAFF_ROLES.map((r) => r.id) as [StaffRole, ...StaffRole[]]),
});

export const addStaffUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => staffInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin"]);
    const sql = await getSql();
    const email = data.email.trim().toLowerCase();
    const taken = await sql<{ id: string }>`select id from "user" where email = ${email}`;
    if (taken[0]) throw new Error("That email already has a Bloom account");
    const { hashPassword } = await import("better-auth/crypto");
    const hash = await hashPassword(data.password);
    const id = crypto.randomUUID();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${id}, ${data.name}, ${email}, ${true}, current_timestamp, current_timestamp)
    `;
    const accId = crypto.randomUUID();
    await sql`
      insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values (${accId}, ${id}, ${"credential"}, ${id}, ${hash}, current_timestamp, current_timestamp)
    `;
    await sql`
      insert into profiles (user_id, account_type, display_name, company_name, city, staff_role, added_by)
      values (${id}, ${"staff"}, ${data.name}, ${"Bloom Ghana"}, ${"Accra"}, ${data.staff_role}, ${context.userId})
    `;
    return { ok: true, id };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        staff_role: z.enum(STAFF_ROLES.map((r) => r.id) as [StaffRole, ...StaffRole[]]).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin"]);
    if (data.userId === context.userId && data.staff_role !== "superadmin") {
      throw new Error("You cannot remove your own super-admin seat");
    }
    const sql = await getSql();
    if (data.staff_role === null) {
      const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where staff_role = ${"superadmin"}`;
      const target = await sql<{ staff_role: string | null }>`select staff_role from profiles where user_id = ${data.userId}`;
      if (target[0]?.staff_role === "superadmin" && num(admins[0]?.n) <= 1) {
        throw new Error("Keep at least one super admin");
      }
      await sql`update profiles set staff_role = null, account_type = ${"personal"} where user_id = ${data.userId}`;
    } else {
      await sql`update profiles set staff_role = ${data.staff_role}, account_type = ${"staff"} where user_id = ${data.userId}`;
    }
    return { ok: true };
  });

function mapCatalogueRow(p: Record<string, unknown>) {
  return {
    id: String(p.id),
    name: String(p.name),
    category: String(p.category),
    color: String(p.color),
    type: String(p.type),
    price: num(p.price),
    unit: String(p.unit),
    grams_per_unit: num(p.grams_per_unit),
    img: String(p.img),
    blurb: String(p.blurb),
    origin: String(p.origin),
    florist_slug: p.florist_slug ? String(p.florist_slug) : null,
    lead_days: num(p.lead_days),
    sponsored: Boolean(p.sponsored),
    sku: String(p.sku ?? ""),
    status: String(p.status ?? "published"),
    stock: num(p.stock),
    pack_size: num(p.pack_size) || 1,
    review_note: String(p.review_note ?? ""),
  };
}

export const listHqCatalogue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "pricing"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from products order by status, name`;
    return rows.map(mapCatalogueRow);
  });

export const updateProductPrice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string(),
        price: z.number().min(0),
        lead_days: z.number().int().min(0).max(30),
        sponsored: z.boolean(),
        stock: z.number().int().min(0).max(100000),
        pack_size: z.number().int().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "pricing"]);
    const sql = await getSql();
    await sql`
      update products set
        price = ${data.price},
        lead_days = ${data.lead_days},
        sponsored = ${data.sponsored},
        stock = ${data.stock},
        pack_size = ${data.pack_size},
        version = version + 1
      where id = ${data.id}`;
    await sql`insert into price_audits (actor_id, action, detail) values (${context.userId}, ${"edit"}, ${`${data.id} price ${data.price} stock ${data.stock} pack ${data.pack_size}`})`;
    return { ok: true };
  });

export const publishProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from products where id = ${data.id}`;
    const p = rows[0];
    if (!p) throw new Error("That variety is not in the catalogue");
    if (num(p.price) <= 0) throw new Error("Set a price before publishing");
    if (num(p.stock) < (num(p.pack_size) || 1)) throw new Error("Stock must cover at least one pack");
    await sql`update products set status = ${"published"}, version = version + 1 where id = ${data.id}`;
    await sql`insert into price_audits (actor_id, action, detail) values (${context.userId}, ${"publish"}, ${String(p.name)})`;
    return { ok: true };
  });

export const previewPriceAdjust = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ percent: z.number().min(-50).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "pricing"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select id, name, price from products where status = ${"published"} and price > 0 order by name`;
    return rows.map((p) => {
      const next = Math.round(num(p.price) * (1 + data.percent / 100) * 100) / 100;
      return { id: String(p.id), name: String(p.name), price: num(p.price), next };
    });
  });

export const applyPriceAdjust = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ percent: z.number().min(-50).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select id, price from products where status = ${"published"} and price > 0`;
    for (const p of rows) {
      const next = Math.round(num(p.price) * (1 + data.percent / 100) * 100) / 100;
      if (next <= 0) continue;
      await sql`update products set price = ${next}, version = version + 1 where id = ${String(p.id)} and status = ${"published"}`;
    }
    await sql`insert into price_audits (actor_id, action, detail) values (${context.userId}, ${"percent"}, ${`${data.percent}% on published prices`})`;
    return { ok: true, count: rows.length };
  });

export const updateFloristCommission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ slug: z.string(), commission_pct: z.number().min(0).max(40) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "pricing", "partners"]);
    const sql = await getSql();
    await sql`update florists set commission_pct = ${data.commission_pct} where slug = ${data.slug}`;
    return { ok: true };
  });

export const listPartners = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "partners", "coldchain", "customs"]);
    const sql = await getSql();
    return sql<{
      id: string;
      kind: string;
      name: string;
      city: string;
      contact_name: string;
      phone: string;
      email: string;
      notes: string;
      status: string;
      sla_hours: number;
    }>`select id, kind, name, city, contact_name, phone, email, notes, status, sla_hours from partners order by kind, name`;
  });

export const savePartner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
        kind: z.enum(["airline", "cold_room", "3pl", "customs_agent"]),
        name: z.string().min(1).max(80),
        city: z.string().max(40),
        contact_name: z.string().max(80),
        phone: z.string().max(40),
        email: z.string().max(80),
        notes: z.string().max(240),
        sla_hours: z.number().int().min(1).max(168),
        status: z.enum(["active", "paused"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "partners"]);
    const sql = await getSql();
    await sql`
      insert into partners (id, kind, name, city, contact_name, phone, email, notes, sla_hours, status)
      values (${data.id}, ${data.kind}, ${data.name}, ${data.city}, ${data.contact_name}, ${data.phone}, ${data.email}, ${data.notes}, ${data.sla_hours}, ${data.status})
      on conflict (id) do update set
        kind = excluded.kind,
        name = excluded.name,
        city = excluded.city,
        contact_name = excluded.contact_name,
        phone = excluded.phone,
        email = excluded.email,
        notes = excluded.notes,
        sla_hours = excluded.sla_hours,
        status = excluded.status
    `;
    return { ok: true };
  });

export const listDutyFilings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "customs"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from duty_filings order by created_at desc limit 40`;
    return rows.map((r) => ({
      id: num(r.id),
      reference: String(r.reference),
      consignment: String(r.consignment),
      lane: String(r.lane),
      cif_ghs: num(r.cif_ghs),
      duty_ghs: num(r.duty_ghs),
      vat_ghs: num(r.vat_ghs),
      levies_ghs: num(r.levies_ghs),
      total_ghs: num(r.total_ghs),
      status: String(r.status),
      partner_id: r.partner_id ? String(r.partner_id) : null,
      created_at: String(r.created_at),
    }));
  });

export const fileDuty = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        consignment: z.string().min(1).max(120),
        lane: z.enum(["ACC_AIR", "TEM_OCEAN"]),
        cif_ghs: z.number().positive(),
        partner_id: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "customs"]);
    const s = await loadSettings();
    const q = quoteDuty(data.cif_ghs, s);
    const ref = `ICUMS-${data.lane === "ACC_AIR" ? "ACC" : "TEM"}-${Date.now().toString().slice(-6)}`;
    const sql = await getSql();
    const inserted = await sql<{ id: number }>`
      insert into duty_filings (reference, consignment, lane, cif_ghs, duty_ghs, vat_ghs, levies_ghs, total_ghs, status, partner_id, created_by)
      values (${ref}, ${data.consignment}, ${data.lane}, ${data.cif_ghs}, ${q.duty}, ${q.vat}, ${q.levies}, ${q.total}, ${"FILED"}, ${data.partner_id ?? null}, ${context.userId})
      returning id
    `;
    return { id: inserted[0].id, reference: ref, ...q };
  });

export const advanceDuty = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.number(), status: z.enum(["FILED", "PAID", "CLEARED"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "customs"]);
    const sql = await getSql();
    await sql`update duty_filings set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const listColdLots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "coldchain", "fulfilment"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select * from cold_lots order by created_at desc limit 60`;
    return rows.map((r) => ({
      id: num(r.id),
      station_id: String(r.station_id),
      partner_id: r.partner_id ? String(r.partner_id) : null,
      lot_label: String(r.lot_label),
      variety: String(r.variety),
      kg: num(r.kg),
      temp_c: num(r.temp_c),
      status: String(r.status),
      notes: String(r.notes),
      created_at: String(r.created_at),
    }));
  });

export const addColdLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        station_id: z.string(),
        partner_id: z.string().optional(),
        lot_label: z.string().min(1).max(40),
        variety: z.string().min(1).max(80),
        kg: z.number().positive(),
        temp_c: z.number().min(-2).max(20),
        notes: z.string().max(160).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "coldchain"]);
    const sql = await getSql();
    await sql`
      insert into cold_lots (station_id, partner_id, lot_label, variety, kg, temp_c, notes, created_by)
      values (${data.station_id}, ${data.partner_id ?? null}, ${data.lot_label}, ${data.variety}, ${data.kg}, ${data.temp_c}, ${data.notes ?? ""}, ${context.userId})
    `;
    return { ok: true };
  });

export const updateColdLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.number(),
        temp_c: z.number().min(-2).max(20).optional(),
        status: z.enum(["IN_STORE", "ALLOCATED", "RELEASED", "ALARM"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "coldchain", "fulfilment"]);
    const sql = await getSql();
    if (data.temp_c != null) {
      const status = data.temp_c > 8 ? "ALARM" : data.status;
      if (status) {
        await sql`update cold_lots set temp_c = ${data.temp_c}, status = ${status} where id = ${data.id}`;
      } else {
        await sql`update cold_lots set temp_c = ${data.temp_c}, status = case when ${data.temp_c} > 8 then ${"ALARM"} else status end where id = ${data.id}`;
      }
    } else if (data.status) {
      await sql`update cold_lots set status = ${data.status} where id = ${data.id}`;
    }
    return { ok: true };
  });

export const listHqStations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "coldchain", "fulfilment"]);
    const sql = await getSql();
    return sql<Station>`select id, name, city, lat, lng from stations order by city, name`;
  });

export const saveStation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(2).max(20).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(80),
        city: z.string().min(1).max(40),
        lat: z.number(),
        lng: z.number(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, ["superadmin", "coldchain"]);
    const sql = await getSql();
    await sql`
      insert into stations (id, name, city, lat, lng)
      values (${data.id}, ${data.name}, ${data.city}, ${data.lat}, ${data.lng})
      on conflict (id) do update set name = excluded.name, city = excluded.city, lat = excluded.lat, lng = excluded.lng
    `;
    return { ok: true };
  });

export const listHqOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, ["superadmin", "fulfilment"]);
    const sql = await getSql();
    const orders = await sql<Record<string, unknown>>`select * from orders order by created_at desc limit 80`;
    return orders.map((o) => ({
      id: num(o.id),
      status: String(o.status),
      is_batch: Boolean(o.is_batch),
      product_summary: String(o.product_summary),
      stems: num(o.stems),
      grams: num(o.grams),
      total: num(o.total),
      created_at: String(o.created_at),
    }));
  });
