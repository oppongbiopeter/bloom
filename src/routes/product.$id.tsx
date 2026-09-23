import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useCatalog } from "@/components/use-bloom";
import { useCart } from "@/lib/cart-store";
import { ADDONS, ghs, PACKAGES } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({ component: ProductPage });

function ProductPage() {
  const { id } = Route.useParams();
  const { products, florists, ready } = useCatalog();
  const add = useCart((s) => s.add);
  const p = products.find((x) => x.id === id);
  const [qty, setQty] = useState(1);
  const florist = florists.find((f) => f.slug === p?.florist_slug);

  useEffect(() => {
    if (p) setQty(p.pack_size || (p.unit === "stem" ? 50 : 1));
  }, [p]);

  if (!ready) {
    return (
      <AppFrame>
        <p className="text-muted">Loading variety…</p>
      </AppFrame>
    );
  }
  if (!p) {
    return (
      <AppFrame>
        <p>
          Variety not found.{" "}
          <Link to="/shop" className="font-semibold text-primary">
            Back to shop
          </Link>
        </p>
      </AppFrame>
    );
  }

  const step = p.pack_size || (p.unit === "stem" ? 10 : 1);

  return (
    <AppFrame>
      <Link to="/shop" className="text-sm text-muted">
        ← Shop
      </Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <img src={p.img} alt={p.name} className="w-full rounded-2xl object-cover" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.category}</p>
          <h1 className="mt-1 font-display text-4xl">{p.name}</h1>
          <p className="mt-2 text-muted">
            {p.type} · {p.color} · {p.origin}
          </p>
          <p className="mt-4">{p.blurb}</p>
          <p className="mt-3 text-sm text-muted">
            Lead time {p.lead_days} day{p.lead_days === 1 ? "" : "s"} · {p.grams_per_unit}g per {p.unit} · pack of {p.pack_size} · {p.stock} in stock
          </p>
          {florist && (
            <p className="mt-3 rounded-2xl bg-soft p-3 text-sm">
              Sold by <b>{florist.name}</b> ({florist.city}). Bloom commission {florist.commission_pct}% when we last-mile, or they dispatch from the studio.
            </p>
          )}
          <div className="mt-6 font-display text-3xl tabular-nums">
            {ghs(p.price)} <span className="text-base font-sans text-muted">/ {p.unit}</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              className="size-11 rounded-full border border-line"
              onClick={() => setQty(Math.max(step, qty - step))}
              aria-label="Decrease"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold tabular-nums">{qty}</span>
            <button
              className="size-11 rounded-full border border-line"
              onClick={() => setQty(qty + step)}
              aria-label="Increase"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Subtotal {ghs(p.price * qty)} · {Math.round(p.grams_per_unit * qty)}g
          </p>
          <button
            className="mt-4 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-fg"
            onClick={() => {
              add(p.id, qty);
              toast.success("Added to cart");
            }}
          >
            Add to cart
          </button>
          <p className="mt-6 text-sm font-semibold">After checkout you can split this into gifts</p>
          <p className="mt-1 text-xs text-muted">
            Wrap ({PACKAGES.map((x) => x.label).join(", ")}) plus {ADDONS.map((a) => a.label.toLowerCase()).join(", ")}.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
