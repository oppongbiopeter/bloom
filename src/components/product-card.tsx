import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/server/actions";
import { ghs } from "@/lib/utils";

export function ProductCard({
  p,
  onAdd,
}: {
  p: Product;
  onAdd?: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-surface shadow-sm">
      <Link to="/product/$id" params={{ id: p.id }} className="block">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={p.img}
            alt={p.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {p.lead_days === 1 && (
            <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-primary">
              Same day
            </span>
          )}
          {p.florist_slug && (
            <span className="absolute right-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-fg">
              Local florist
            </span>
          )}
          {p.sponsored && !p.florist_slug && (
            <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary-fg">
              Featured
            </span>
          )}
        </div>
      </Link>
      <div className="p-3 md:p-4">
        <Link to="/product/$id" params={{ id: p.id }}>
          <h3 className="font-semibold leading-snug">{p.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {p.type} · {p.origin}
          </p>
        </Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="tabular-nums text-sm font-semibold">
            {ghs(p.price)}
            <span className="font-normal text-muted"> / {p.unit}</span>
          </span>
          {onAdd && (
            <button
              type="button"
              className="min-h-9 rounded-full bg-primary px-3 text-xs font-semibold text-primary-fg"
              onClick={onAdd}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
