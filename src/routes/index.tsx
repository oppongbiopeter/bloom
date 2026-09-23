import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/use-bloom";
import { useCart } from "@/lib/cart-store";
import { OCCASIONS } from "@/lib/utils";
import { coverageSummary } from "@/lib/server/coverage";
import { CalendarDays, Gift, Truck } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { products, ready } = useCatalog();
  const add = useCart((s) => s.add);
  const featured = products.slice(0, 4);

  return (
    <AppFrame flush>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Ghana · Accra · Tema</p>
          <h1 className="mt-3 font-display text-5xl leading-none text-primary md:text-6xl">
            Send flowers for the days that matter.
          </h1>
          <p className="mt-5 max-w-md text-muted">
            Personal occasions, event planners and corporate gifts. Bloom reminds you a week out, splits a batch into named parcels, and delivers from our sorting stations — or a florist down the street.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg"
            >
              Send flowers now
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold"
            >
              Choose a workspace
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">Same-day Accra florists until 2pm · Kenya stems 3-day air lead · not every constituency is open yet</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl">
          <img src="/flowers/mansfield.jpg" alt="Mansfield Park garden roses" className="aspect-square w-full object-cover md:aspect-[4/5]" />
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-surface/95 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted">Bouquet of the week</div>
            <div className="font-display text-2xl">Mansfield Park</div>
            <div className="text-sm text-muted">Light pink garden spray · Naivasha, Kenya</div>
          </div>
        </div>
      </section>

      <CoverageBand />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Shop by occasion</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {OCCASIONS.map((o) => (
            <Link
              key={o.id}
              to="/shop"
              search={{ occasion: o.id }}
              className="group relative overflow-hidden rounded-2xl"
            >
              <img src={o.img} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/35" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-primary-fg">
                <div className="font-display text-xl">{o.label}</div>
                <p className="mt-1 hidden text-xs text-primary-fg/85 md:block">{o.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-3xl">Fresh from the cold chain</h2>
        <p className="mt-2 text-sm text-muted">Kenya stems via ACC, plus Accra and Kumasi marketplace shops.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {!ready &&
            [0, 1, 2, 3].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-line" />)}
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={() => add(p.id, p.unit === "stem" ? 10 : 1)} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              t: "Occasion calendar",
              d: "Birthdays, anniversaries, staff holidays. Reminders 7 days out, timed to air, ocean or same-day florist lead times.",
            },
            {
              icon: Gift,
              t: "Split a batch into gifts",
              d: "Order 300 kg, pack into 300 g parcels with names, notes, balloons and hampers. We sort at the hub.",
            },
            {
              icon: Truck,
              t: "Station-to-door fees",
              d: "Six Ghana sorting stations. Delivery is ₵25 + ₵4.50/km from the nearest hub. Track every gift live.",
            },
          ].map((x) => (
            <div key={x.t}>
              <x.icon className="size-6 text-primary" />
              <h2 className="mt-3 text-xl">{x.t}</h2>
              <p className="mt-2 text-sm text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">My people</p>
          <h2 className="mt-2 text-3xl">Keep a list. We remind you in time to order.</h2>
          <p className="mt-3 text-muted">
            Personal calendars, event-planner client dates, or a corporate staff sheet. Import Google Calendar, an Apple .ics, or Excel/CSV. Offers land a week before — with enough runway for Kotoka clearance.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/calendar" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg">
              Open calendar
            </Link>
            <Link to="/people" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold">
              Add people
            </Link>
          </div>
        </div>
        <img src="/flowers/julietta.jpg" alt="Peach garden roses" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </section>
    </AppFrame>
  );
}

function CoverageBand() {
  const [data, setData] = useState<Awaited<ReturnType<typeof coverageSummary>> | null>(null);
  useEffect(() => {
    coverageSummary().then(setData).catch(() => {});
  }, []);
  if (!data) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="rounded-2xl bg-primary px-6 py-8 text-primary-fg">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-fg/70">Where Bloom is open</p>
        <h2 className="mt-2 font-display text-3xl">
          {data.open} of {data.total} constituencies can order today.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-primary-fg/80">
          Being in Ghana is not the same as being on a route. Your phone places you in a constituency. If the company desk has not opened it, you see the opening count — downloads and shares, live — instead of the shop.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {data.regions.map((r) => (
            <li key={r.region} className="rounded-full bg-primary-fg/10 px-3 py-1 text-xs">
              {r.region}
              <span className="text-primary-fg/70"> {r.opened}/{r.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
