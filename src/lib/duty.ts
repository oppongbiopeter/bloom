export type HqSettings = {
  delivery_base: number;
  delivery_per_km: number;
  usd_ghs: number;
  air_freight_per_kg: number;
  ocean_freight_per_kg: number;
  icums_duty_pct: number;
  icums_vat_pct: number;
  nhil_pct: number;
  getfund_pct: number;
};

export const HQ_SETTING_DEFAULTS: HqSettings = {
  delivery_base: 25,
  delivery_per_km: 4.5,
  usd_ghs: 15.2,
  air_freight_per_kg: 18,
  ocean_freight_per_kg: 6.5,
  icums_duty_pct: 20,
  icums_vat_pct: 15,
  nhil_pct: 2.5,
  getfund_pct: 2.5,
};

export function quoteDuty(cif: number, s: HqSettings) {
  const duty = Math.round(cif * (s.icums_duty_pct / 100) * 100) / 100;
  const levies = Math.round(cif * ((s.nhil_pct + s.getfund_pct) / 100) * 100) / 100;
  const vat = Math.round((cif + duty) * (s.icums_vat_pct / 100) * 100) / 100;
  const total = Math.round((duty + vat + levies) * 100) / 100;
  return { duty, levies, vat, total };
}
