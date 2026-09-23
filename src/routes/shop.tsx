import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { ProductCard } from "@/components/product-card";
import { useCatalog, useProfile } from "@/components/use-bloom";
import { listEvents } from "@/lib/server/actions";
import { useCart } from "@/lib/cart-store";
import { daysUntil, OCCASIONS, PRODUCT_OCCASIONS } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type ShopSearch = { occasion?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    occasion: typeof s.occasion === "string" ? s.occasion : undefined,
  }),
  component: ShopPage,
});

function ShopPage() {
  const { occasion } = Route.useSearch();
  const { products, ready } = useCatalog();
  const { user } = useProfile();
  const add = useCart((s) => s.add);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [nudge, setNudge] = useState<{ text: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    listEvents()
      .then((ev) => {
        const soon = ev
          .map((e) => ({ ...e, days: daysUntil(e.event_date) }))
          .filter((e) => e.days >= 0 && e.days <= (e.reminder_days || 7))
          .sort((a, b) => a.days - b.days)[0];
        if (soon) {
          const orderBy = Math.max(0, soon.days - 3);
          setNudge({
            title: soon.title,
            text: `${soon.title} is in ${soon.days} day${soon.days === 1 ? "" : "s"}. Order within ${orderBy} day${orderBy === 1 ? "" : "s"} so air-import stems clear Kotoka in time.`,
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const cats = ["All", "Roses", "Bouquets", "Local"];
  const list = useMemo(
    () =>
      products.filter((p) => {
        const okC = filter === "All" || p.category === filter;
        const okQ = !q || `${p.name} ${p.color} ${p.origin}`.toLowerCase().includes(q.toLowerCase());
        const occ = occasion && occasion !== "all";
        const okO = !occ || (PRODUCT_OCCASIONS[p.id] ?? []).includes(occasion);
        return okC && okQ && okO;
      }),
    [products, filter, q, occasion],
  );

  return (
    <AppFrame>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Shop flowers</h1>
          <p className="mt-1 text-sm text-muted">Kenya stems via ACC · local Accra & Kumasi florists</p>
        </div>
      </div>
      {nudge && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-fg">
          <p>{nudge.text}</p>
          <Link to="/calendar" className="rounded-full bg-primary-fg px-3 py-1.5 text-xs font-semibold text-primary">
            Open calendar
          </Link>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Link
            key={o.id}
            to="/shop"
            search={{ occasion: o.id }}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
              occasion === o.id ? "bg-accent text-primary-fg" : "border border-line bg-surface"
            }`}
          >
            {o.label}
          </Link>
        ))}
        {occasion && (
          <Link to="/shop" className="inline-flex min-h-11 items-center px-2 text-sm text-muted">
            Clear occasion
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search varieties"
          className="min-h-11 flex-1 rounded-full border border-line bg-surface px-4 text-sm"
        />
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${filter === c ? "bg-primary text-primary-fg" : "border border-line bg-surface"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {!ready && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-line" />)}
        {list.map((p) => (
          <ProductCard key={p.id} p={p} onAdd={() => add(p.id, p.pack_size || 1)} />
        ))}
      </div>
      {ready && list.length === 0 && <p className="mt-8 text-sm text-muted">No varieties match that filter.</p>}
    </AppFrame>
  );
}
