import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useCatalog } from "@/components/use-bloom";
import { ghs } from "@/lib/utils";

export const Route = createFileRoute("/florists")({ component: FloristsPage });

function FloristsPage() {
  const { florists, products } = useCatalog();
  return (
    <AppFrame>
      <h1 className="font-display text-4xl">Partner florists</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Local Ghana shops list on Bloom. We take a commission when we deliver, or they fulfil from their own studio when an order lands.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {florists.map((f) => {
          const items = products.filter((p) => p.florist_slug === f.slug);
          return (
            <article key={f.slug} className="rounded-2xl bg-surface p-5">
              <h2 className="text-xl">{f.name}</h2>
              <p className="text-xs text-muted">
                {f.city} · {f.lead_days}-day lead · {f.commission_pct}% commission
              </p>
              <p className="mt-3 text-sm">{f.story}</p>
              <ul className="mt-4 space-y-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link to="/product/$id" params={{ id: p.id }} className="text-sm font-semibold text-primary">
                      {p.name} · {ghs(p.price)}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-muted">
        Run a studio?{" "}
        <Link to="/onboarding" className="font-semibold text-primary">
          Sign up as a partner florist
        </Link>{" "}
        and open the Studio tab after you switch workspace.
      </p>
    </AppFrame>
  );
}
