import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useCatalog, useProfile } from "@/components/use-bloom";
import { listMyOrders } from "@/lib/server/actions";
import { ghs, prettyStatus } from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/partner")({ component: PartnerPage });

function PartnerPage() {
  const { profile } = useProfile();
  const { florists, products } = useCatalog();
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listMyOrders>>>([]);
  useEffect(() => {
    listMyOrders().then(setOrders).catch(() => {});
  }, []);
  const shop = florists.find((f) => f.slug === profile?.florist_slug) ?? florists[0];
  const mine = products.filter((p) => p.florist_slug === shop?.slug);
  const incoming = orders.filter((o) => o.florist_slug === shop?.slug);
  const commission = incoming.reduce((s, o) => s + o.merchandise * ((shop?.commission_pct ?? 12) / 100), 0);

  return (
    <AppFrame authed>
      <h1 className="font-display text-4xl">{shop?.name ?? "Studio"}</h1>
      <p className="mt-2 text-sm text-muted">
        Incoming marketplace orders. Bloom can last-mile for you, or you dispatch from the shop — we still invoice commission.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-xs text-muted">Open orders</div>
          <div className="font-display text-3xl">{incoming.length}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-xs text-muted">Est. Bloom commission</div>
          <div className="font-display text-3xl tabular-nums">{ghs(commission)}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-xs text-muted">Listed products</div>
          <div className="font-display text-3xl">{mine.length}</div>
        </div>
      </div>
      <h2 className="mt-8 text-xl">Listings</h2>
      <ul className="mt-2 space-y-2">
        {mine.map((p) => (
          <li key={p.id} className="rounded-2xl bg-surface px-4 py-3 text-sm">
            {p.name} · {ghs(p.price)} / {p.unit}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-xl">Orders to fulfil</h2>
      <ul className="mt-2 space-y-2">
        {incoming.map((o) => (
          <li key={o.id}>
            <Link to="/orders/$id" params={{ id: String(o.id) }} className="block rounded-2xl bg-surface px-4 py-3">
              #{o.id} · {prettyStatus(o.status)} · {ghs(o.total)}
            </Link>
          </li>
        ))}
        {incoming.length === 0 && <p className="text-sm text-muted">No marketplace tickets yet.</p>}
      </ul>
    </AppFrame>
  );
}
