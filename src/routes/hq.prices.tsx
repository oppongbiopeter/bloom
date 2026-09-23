import { createFileRoute } from "@tanstack/react-router";
import { useCatalog } from "@/components/use-bloom";
import {
  applyPriceAdjust,
  getHqSettings,
  listHqCatalogue,
  previewPriceAdjust,
  publishProduct,
  saveHqSettings,
  updateFloristCommission,
  updateProductPrice,
} from "@/lib/server/hq";
import type { Product } from "@/lib/server/actions";
import type { HqSettings } from "@/lib/duty";
import { ghs } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/prices")({ component: HqPrices });

function HqPrices() {
  const { florists } = useCatalog();
  const [settings, setSettings] = useState<HqSettings | null>(null);
  const [rows, setRows] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Record<string, { price: string; lead: string; sponsored: boolean; stock: string; pack: string }>>({});
  const [percent, setPercent] = useState("5");
  const [preview, setPreview] = useState<{ id: string; name: string; price: number; next: number }[]>([]);

  function load() {
    listHqCatalogue()
      .then(setRows)
      .catch(() => {});
  }

  useEffect(() => {
    getHqSettings()
      .then(setSettings)
      .catch(() => {});
    load();
  }, []);

  useEffect(() => {
    const next: typeof draft = {};
    for (const p of rows) {
      next[p.id] = {
        price: String(p.price),
        lead: String(p.lead_days),
        sponsored: p.sponsored,
        stock: String(p.stock),
        pack: String(p.pack_size),
      };
    }
    setDraft(next);
  }, [rows]);

  async function saveTariff(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    await saveHqSettings({ data: settings });
    toast.success("Tariff saved — shop quotes use these numbers");
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Prices</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Bloom sets stem prices and the last-mile tariff. Marketplace florists keep the rest after commission.
      </p>
      {settings && (
        <form onSubmit={saveTariff} className="mt-8 grid gap-3 rounded-2xl border border-hq-line bg-hq-panel p-4 md:grid-cols-3">
          <h2 className="font-semibold md:col-span-3">Last-mile tariff</h2>
          {(
            [
              ["delivery_base", "Base ₵"],
              ["delivery_per_km", "₵ / km"],
              ["usd_ghs", "USD → GHS"],
              ["air_freight_per_kg", "Air ₵ / kg"],
              ["ocean_freight_per_kg", "Ocean ₵ / kg"],
              ["icums_duty_pct", "Duty %"],
              ["icums_vat_pct", "VAT %"],
              ["nhil_pct", "NHIL %"],
              ["getfund_pct", "GETFund %"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm text-hq-muted">
              {label}
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-hq-fg"
                value={settings[key]}
                onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <button className="min-h-11 rounded-full bg-hq-fg font-semibold text-hq md:col-span-3">Save tariff</button>
        </form>
      )}
      <h2 className="mt-10 text-xl">Catalogue</h2>
      <p className="mt-1 max-w-2xl text-sm text-hq-muted">
        The source sheet and the live shop are one catalogue. Drafts stay off the shop until the super admin publishes a price, a pack size and stock.
      </p>
      <img src="/flowers/catalogue-source.jpg" alt="Source catalogue sheet" className="mt-4 max-h-56 w-full rounded-2xl object-cover object-top" />
      <form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-hq-line bg-hq-panel p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const pct = Number(percent);
          const rowsPreview = await previewPriceAdjust({ data: { percent: pct } });
          setPreview(rowsPreview);
        }}
      >
        <label className="text-sm text-hq-muted">
          Percent on published prices
          <input className="mt-1 w-24 rounded-lg border border-hq-line bg-hq px-2 py-1 text-hq-fg" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
        <button className="min-h-10 rounded-full border border-hq-line px-4 text-sm font-semibold">Preview</button>
        <button
          type="button"
          className="min-h-10 rounded-full bg-hq-fg px-4 text-sm font-semibold text-hq"
          onClick={async () => {
            await applyPriceAdjust({ data: { percent: Number(percent) } });
            toast.success("Published prices updated");
            setPreview([]);
            load();
          }}
        >
          Publish adjustment
        </button>
      </form>
      {preview.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-hq-muted">
          {preview.map((p) => (
            <li key={p.id}>
              {p.name}: {ghs(p.price)} → {ghs(p.next)}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 space-y-2">
        {rows.map((p) => {
          const d = draft[p.id];
          if (!d) return null;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-hq-line bg-hq-panel p-3">
              <img src={p.img} alt="" className="size-14 rounded-lg object-cover" />
              <div className="min-w-40 flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-hq-muted">
                  {p.sku} · {p.status === "published" ? "On the shop" : "Draft"} · {p.origin}
                </div>
                {p.review_note ? <p className="mt-1 text-xs text-hq-muted">{p.review_note}</p> : null}
              </div>
              <label className="text-xs text-hq-muted">
                Price
                <input
                  className="mt-1 w-24 rounded-lg border border-hq-line bg-hq px-2 py-1 text-sm text-hq-fg"
                  value={d.price}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...d, price: e.target.value } })}
                />
              </label>
              <label className="text-xs text-hq-muted">
                Stock
                <input
                  className="mt-1 w-20 rounded-lg border border-hq-line bg-hq px-2 py-1 text-sm text-hq-fg"
                  value={d.stock}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...d, stock: e.target.value } })}
                />
              </label>
              <label className="text-xs text-hq-muted">
                Pack
                <input
                  className="mt-1 w-16 rounded-lg border border-hq-line bg-hq px-2 py-1 text-sm text-hq-fg"
                  value={d.pack}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...d, pack: e.target.value } })}
                />
              </label>
              <label className="text-xs text-hq-muted">
                Lead days
                <input
                  className="mt-1 w-16 rounded-lg border border-hq-line bg-hq px-2 py-1 text-sm text-hq-fg"
                  value={d.lead}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...d, lead: e.target.value } })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={d.sponsored}
                  onChange={(e) => setDraft({ ...draft, [p.id]: { ...d, sponsored: e.target.checked } })}
                />
                Featured
              </label>
              <button
                className="rounded-full border border-hq-line px-3 py-1.5 text-xs font-semibold"
                onClick={async () => {
                  await updateProductPrice({
                    data: {
                      id: p.id,
                      price: Number(d.price),
                      lead_days: Number(d.lead),
                      sponsored: d.sponsored,
                      stock: Number(d.stock),
                      pack_size: Number(d.pack),
                    },
                  });
                  toast.success(`${p.name} saved`);
                  load();
                }}
              >
                Save
              </button>
              {p.status !== "published" && (
                <button
                  className="rounded-full bg-hq-fg px-3 py-1.5 text-xs font-semibold text-hq"
                  onClick={async () => {
                    try {
                      await updateProductPrice({
                        data: {
                          id: p.id,
                          price: Number(d.price),
                          lead_days: Number(d.lead),
                          sponsored: d.sponsored,
                          stock: Number(d.stock),
                          pack_size: Number(d.pack),
                        },
                      });
                      await publishProduct({ data: { id: p.id } });
                      toast.success(`${p.name} is on the shop`);
                      load();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not publish");
                    }
                  }}
                >
                  Publish
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <h2 className="mt-10 text-xl">Florist commission</h2>
      <ul className="mt-3 space-y-2">
        {florists.map((f) => (
          <FloristRow key={f.slug} slug={f.slug} name={f.name} pct={f.commission_pct} />
        ))}
      </ul>
    </div>
  );
}

function FloristRow({ slug, name, pct }: { slug: string; name: string; pct: number }) {
  const [v, setV] = useState(String(pct));
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-hq-line bg-hq-panel px-4 py-3">
      <div className="flex-1 font-semibold">{name}</div>
      <input
        className="w-20 rounded-lg border border-hq-line bg-hq px-2 py-1 text-sm"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <span className="text-xs text-hq-muted">%</span>
      <button
        className="rounded-full bg-hq-fg px-3 py-1.5 text-xs font-semibold text-hq"
        onClick={async () => {
          await updateFloristCommission({ data: { slug, commission_pct: Number(v) } });
          toast.success("Commission saved");
        }}
      >
        Save
      </button>
    </li>
  );
}
