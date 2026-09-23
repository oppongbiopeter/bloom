import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ADDONS,
  AREAS,
  deliveryFeeFor,
  nearestStation,
  PACKAGES,
  type AccountType,
  type Station,
} from "@/lib/utils";
import { loadSettings } from "@/lib/server/settings";
import { assertCanOrder } from "@/lib/server/coverage";
import type { StaffRole } from "@/lib/staff";

export type Profile = {
  user_id: string;
  account_type: AccountType;
  display_name: string;
  company_name: string;
  phone: string;
  city: string;
  florist_slug: string | null;
  staff_role: StaffRole | null;
  area_id: string | null;
  address: string;
  ghana_post: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  color: string;
  type: string;
  price: number;
  unit: string;
  grams_per_unit: number;
  img: string;
  blurb: string;
  origin: string;
  florist_slug: string | null;
  lead_days: number;
  sponsored: boolean;
  sku: string;
  status: string;
  stock: number;
  pack_size: number;
  review_note: string;
};

function num(v: unknown) {
  return Number(v ?? 0);
}

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const products = await sql<Record<string, unknown>>`select * from products where status = ${"published"} and price > 0 order by sponsored desc, name`;
  const florists = await sql<{
    slug: string;
    name: string;
    city: string;
    story: string;
    commission_pct: string;
    lead_days: number;
  }>`select slug, name, city, story, commission_pct, lead_days from florists order by name`;
  const stations = await sql<Station>`select id, name, city, lat, lng from stations`;
  return {
    products: products.map((p) => ({
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
    })) as Product[],
    florists: florists.map((f) => ({
      ...f,
      commission_pct: num(f.commission_pct),
    })),
    stations,
  };
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Profile>`select user_id, account_type, display_name, company_name, phone, city, florist_slug, staff_role, area_id, address, ghana_post from profiles where user_id = ${context.userId}`;
    const row = rows[0];
    if (!row) return null;
    return { ...row, staff_role: (row.staff_role as StaffRole | null) ?? null };
  });

const profileInput = z.object({
  account_type: z.enum(["personal", "organizer", "corporate", "florist"]),
  display_name: z.string().max(80),
  company_name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  city: z.string().max(40).optional(),
  address: z.string().max(160).optional(),
  ghana_post: z.string().max(20).optional(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => profileInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ staff_role: string | null }>`select staff_role from profiles where user_id = ${context.userId}`;
    if (existing[0]?.staff_role) {
      throw new Error("Bloom HQ accounts are managed from the company desk");
    }
    const floristSlug = data.account_type === "florist" ? "osu-petals" : null;
    await sql`
      insert into profiles (user_id, account_type, display_name, company_name, phone, city, florist_slug, address, ghana_post)
      values (${context.userId}, ${data.account_type}, ${data.display_name}, ${data.company_name ?? ""}, ${data.phone ?? ""}, ${data.city ?? ""}, ${floristSlug}, ${data.address ?? ""}, ${data.ghana_post ?? ""})
      on conflict (user_id) do update set
        account_type = excluded.account_type,
        display_name = excluded.display_name,
        company_name = excluded.company_name,
        phone = excluded.phone,
        city = excluded.city,
        florist_slug = excluded.florist_slug,
        address = excluded.address,
        ghana_post = excluded.ghana_post
    `;
    return { ok: true };
  });

export const listEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: number;
      title: string;
      person_name: string;
      kind: string;
      event_date: string;
      reminder_days: number;
      notes: string;
      source: string;
    }>`select id, title, person_name, kind, event_date, reminder_days, notes, source from calendar_events where user_id = ${context.userId} order by event_date`;
  });

const eventInput = z.object({
  title: z.string().min(1).max(120),
  person_name: z.string().max(80).optional(),
  kind: z.enum(["birthday", "anniversary", "wedding", "corporate", "holiday", "custom"]),
  event_date: z.string(),
  reminder_days: z.number().int().min(1).max(60),
  notes: z.string().max(240).optional(),
  source: z.string().max(20).optional(),
});

export const addEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => eventInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into calendar_events (user_id, title, person_name, kind, event_date, reminder_days, notes, source)
      values (${context.userId}, ${data.title}, ${data.person_name ?? ""}, ${data.kind}, ${data.event_date}, ${data.reminder_days}, ${data.notes ?? ""}, ${data.source ?? "manual"})`;
    return { ok: true };
  });

export const addEventsBulk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.array(eventInput).max(400).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    for (const e of data) {
      await sql`insert into calendar_events (user_id, title, person_name, kind, event_date, reminder_days, notes, source)
        values (${context.userId}, ${e.title}, ${e.person_name ?? ""}, ${e.kind}, ${e.event_date}, ${e.reminder_days}, ${e.notes ?? ""}, ${e.source ?? "excel"})`;
    }
    return { count: data.length };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.number().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from calendar_events where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listContacts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: number; name: string; address: string; city: string; phone: string; notes: string }>`
      select id, name, address, city, phone, notes from contacts where user_id = ${context.userId} order by name`;
  });

const contactInput = z.object({
  name: z.string().min(1).max(80),
  address: z.string().max(160).optional(),
  city: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(160).optional(),
});

export const addContactsBulk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.array(contactInput).max(400).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    for (const c of data) {
      await sql`insert into contacts (user_id, name, address, city, phone, notes)
        values (${context.userId}, ${c.name}, ${c.address ?? ""}, ${c.city ?? "Accra"}, ${c.phone ?? ""}, ${c.notes ?? ""})`;
    }
    return { count: data.length };
  });

const giftInput = z.object({
  recipientName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  phone: z.string().optional(),
  message: z.string().optional(),
  grams: z.number().positive(),
  packageType: z.string(),
  addons: z.array(z.string()),
});

const orderInput = z.object({
  lines: z.array(z.object({ productId: z.string(), qty: z.number().positive() })),
  gifts: z.array(giftInput).min(1),
  clientKey: z.string().min(8).max(80),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => orderInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertCanOrder(context.userId);
    const sql = await getSql();
    const prior = await sql<{ id: number; total: string; delivery_fee: string }>`
      select id, total, delivery_fee from orders where user_id = ${context.userId} and client_key = ${data.clientKey}`;
    if (prior[0]) {
      return { id: prior[0].id, total: num(prior[0].total), delivery: num(prior[0].delivery_fee) };
    }
    const products = await sql<Record<string, unknown>>`select * from products`;
    const byId = Object.fromEntries(products.map((p) => [String(p.id), p]));
    const stations = await sql<Station>`select id, name, city, lat, lng from stations`;
    const rates = await loadSettings();
    let merchandise = 0;
    let stems = 0;
    let grams = 0;
    const names: string[] = [];
    let floristSlug: string | null = null;
    const taken: { id: string; qty: number }[] = [];
    for (const line of data.lines) {
      const p = byId[line.productId];
      if (!p) throw new Error("A flower in this cart is no longer in the catalogue");
      if (String(p.status) !== "published" || num(p.price) <= 0) {
        throw new Error(`${p.name} is still a draft. Bloom has not published it.`);
      }
      const pack = num(p.pack_size) || 1;
      if (line.qty % pack !== 0) throw new Error(`${p.name} sells in packs of ${pack}`);
      if (num(p.stock) < line.qty) throw new Error(`${p.name} does not have ${line.qty} in stock`);
      merchandise += num(p.price) * line.qty;
      if (String(p.unit) === "stem") stems += line.qty;
      grams += num(p.grams_per_unit) * line.qty;
      names.push(`${p.name} × ${line.qty}`);
      if (p.florist_slug) floristSlug = String(p.florist_slug);
      taken.push({ id: line.productId, qty: line.qty });
    }
    for (const line of taken) {
      const updated = await sql<{ id: string }>`
        update products set stock = stock - ${line.qty}, version = version + 1
        where id = ${line.id} and status = ${"published"} and stock >= ${line.qty}
        returning id`;
      if (!updated[0]) throw new Error("Stock changed while this order was submitted. Review the cart and try again.");
    }
    let delivery = 0;
    let addonsFee = 0;
    const resolved = data.gifts.map((g) => {
      const area =
        AREAS.find((a) => a.name === g.address || a.city === g.city) ??
        AREAS.find((a) => a.city === g.city) ??
        AREAS[0];
      const { station, km } = nearestStation(area, stations);
      const fee = deliveryFeeFor(km, rates.delivery_base, rates.delivery_per_km);
      delivery += fee;
      const pkg = PACKAGES.find((p) => p.id === g.packageType);
      addonsFee += pkg?.fee ?? 0;
      for (const a of g.addons) {
        addonsFee += ADDONS.find((x) => x.id === a)?.fee ?? 0;
      }
      return { g, area, station, fee };
    });
    const total = merchandise + delivery + addonsFee;
    const isBatch = data.gifts.length > 1;
    const inserted = await sql<{ id: number }>`
      insert into orders (user_id, status, is_batch, florist_slug, product_summary, stems, grams, merchandise, delivery_fee, addons_fee, total, client_key)
      values (${context.userId}, ${"PLACED"}, ${isBatch}, ${floristSlug}, ${names.join(" · ")}, ${stems}, ${grams}, ${merchandise}, ${delivery}, ${addonsFee}, ${total}, ${data.clientKey})
      returning id`;
    const orderId = inserted[0].id;
    for (const r of resolved) {
      await sql`insert into order_gifts (order_id, user_id, recipient_name, address, city, phone, message, grams, package_type, addons, station_id, delivery_fee, lat, lng, status)
        values (${orderId}, ${context.userId}, ${r.g.recipientName}, ${r.g.address}, ${r.g.city}, ${r.g.phone ?? ""}, ${r.g.message ?? ""}, ${r.g.grams}, ${r.g.packageType}, ${r.g.addons.join(",")}, ${r.station.id}, ${r.fee}, ${r.area.lat}, ${r.area.lng}, ${"QUEUED"})`;
    }
    return { id: orderId, total, delivery };
  });

function mapOrder(o: Record<string, unknown>) {
  return {
    id: num(o.id),
    user_id: String(o.user_id),
    status: String(o.status),
    is_batch: Boolean(o.is_batch),
    florist_slug: o.florist_slug ? String(o.florist_slug) : null,
    product_summary: String(o.product_summary),
    stems: num(o.stems),
    grams: num(o.grams),
    merchandise: num(o.merchandise),
    delivery_fee: num(o.delivery_fee),
    addons_fee: num(o.addons_fee),
    total: num(o.total),
    created_at: String(o.created_at),
  };
}

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await sql<{ account_type: string; florist_slug: string | null; staff_role: string | null }>`select account_type, florist_slug, staff_role from profiles where user_id = ${context.userId}`;
    const role = profile[0]?.account_type ?? "personal";
    const staff = profile[0]?.staff_role;
    const florist = profile[0]?.florist_slug;
    let orders: Record<string, unknown>[];
    if (staff === "superadmin" || staff === "fulfilment") {
      orders = await sql`select * from orders order by created_at desc limit 80`;
    } else if (role === "florist" && florist) {
      orders = await sql`select * from orders where florist_slug = ${florist} or user_id = ${context.userId} order by created_at desc limit 80`;
    } else {
      orders = await sql`select * from orders where user_id = ${context.userId} order by created_at desc limit 80`;
    }
    return orders.map(mapOrder);
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.number().parse(Number(id)))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const profile = await sql<{ account_type: string; florist_slug: string | null; staff_role: string | null }>`select account_type, florist_slug, staff_role from profiles where user_id = ${context.userId}`;
    const role = profile[0]?.account_type ?? "personal";
    const staff = profile[0]?.staff_role;
    const florist = profile[0]?.florist_slug;
    const orders = await sql<Record<string, unknown>>`select * from orders where id = ${id}`;
    const order = orders[0];
    if (!order) return null;
    const owner = String(order.user_id);
    const allowed =
      owner === context.userId ||
      staff === "superadmin" ||
      staff === "fulfilment" ||
      (role === "florist" && florist && String(order.florist_slug) === florist);
    if (!allowed) return null;
    const gifts = await sql<Record<string, unknown>>`select * from order_gifts where order_id = ${id}`;
    return {
      ...mapOrder(order),
      gifts: gifts.map((g) => ({
        id: num(g.id),
        recipient_name: String(g.recipient_name),
        address: String(g.address),
        city: String(g.city),
        phone: String(g.phone),
        message: String(g.message),
        grams: num(g.grams),
        package_type: String(g.package_type),
        addons: String(g.addons),
        station_id: String(g.station_id),
        delivery_fee: num(g.delivery_fee),
        lat: num(g.lat),
        lng: num(g.lng),
        status: String(g.status),
      })),
    };
  });

const advanceInput = z.object({
  orderId: z.number(),
  status: z.string(),
});

export const advanceOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => advanceInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await sql<{ account_type: string; florist_slug: string | null; staff_role: string | null }>`select account_type, florist_slug, staff_role from profiles where user_id = ${context.userId}`;
    const role = profile[0]?.account_type;
    const staff = profile[0]?.staff_role;
    const florist = profile[0]?.florist_slug;
    const hqCan = staff === "superadmin" || staff === "fulfilment";
    if (!hqCan && role !== "florist") {
      throw new Error("Only Bloom HQ fulfilment and partner florists can advance an order");
    }
    if (hqCan) {
      await sql`update orders set status = ${data.status} where id = ${data.orderId}`;
    } else {
      await sql`update orders set status = ${data.status} where id = ${data.orderId} and florist_slug = ${florist}`;
    }
    const giftStatus =
      data.status === "OUT_FOR_DELIVERY"
        ? "OUT_FOR_DELIVERY"
        : data.status === "DELIVERED"
          ? "DELIVERED"
          : data.status === "SPLITTING"
            ? "SPLITTING"
            : "QUEUED";
    await sql`update order_gifts set status = ${giftStatus} where order_id = ${data.orderId}`;
    return { ok: true };
  });

export const quoteGifts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.array(giftInput).parse(d))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const stations = await sql<Station>`select id, name, city, lat, lng from stations`;
    const rates = await loadSettings();
    return data.map((g) => {
      const area =
        AREAS.find((a) => a.name === g.address) ??
        AREAS.find((a) => a.city === g.city) ??
        AREAS[0];
      const { station, km } = nearestStation(area, stations);
      const pkg = PACKAGES.find((p) => p.id === g.packageType);
      let extras = pkg?.fee ?? 0;
      for (const a of g.addons) extras += ADDONS.find((x) => x.id === a)?.fee ?? 0;
      const fee = deliveryFeeFor(km, rates.delivery_base, rates.delivery_per_km);
      return {
        recipientName: g.recipientName,
        stationId: station.id,
        stationName: station.name,
        km: Math.round(km * 10) / 10,
        deliveryFee: fee,
        extras,
      };
    });
  });
