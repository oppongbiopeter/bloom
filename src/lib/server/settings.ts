import { getSql } from "@/lib/db";
import { HQ_SETTING_DEFAULTS, type HqSettings } from "@/lib/duty";

function num(v: unknown) {
  return Number(v ?? 0);
}

export async function loadSettings(): Promise<HqSettings> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`select * from hq_settings where id = ${"bloom"}`;
  const r = rows[0];
  if (!r) return HQ_SETTING_DEFAULTS;
  return {
    delivery_base: num(r.delivery_base) || HQ_SETTING_DEFAULTS.delivery_base,
    delivery_per_km: num(r.delivery_per_km) || HQ_SETTING_DEFAULTS.delivery_per_km,
    usd_ghs: num(r.usd_ghs) || HQ_SETTING_DEFAULTS.usd_ghs,
    air_freight_per_kg: num(r.air_freight_per_kg) || HQ_SETTING_DEFAULTS.air_freight_per_kg,
    ocean_freight_per_kg: num(r.ocean_freight_per_kg) || HQ_SETTING_DEFAULTS.ocean_freight_per_kg,
    icums_duty_pct: num(r.icums_duty_pct) || HQ_SETTING_DEFAULTS.icums_duty_pct,
    icums_vat_pct: num(r.icums_vat_pct) || HQ_SETTING_DEFAULTS.icums_vat_pct,
    nhil_pct: num(r.nhil_pct) || HQ_SETTING_DEFAULTS.nhil_pct,
    getfund_pct: num(r.getfund_pct) || HQ_SETTING_DEFAULTS.getfund_pct,
  };
}
