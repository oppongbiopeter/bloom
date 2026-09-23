import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useCatalog, useProfile } from "@/components/use-bloom";
import { advanceOrder, getOrder } from "@/lib/server/actions";
import { ghs, prettyStatus, projectGhana } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({ component: OrderDetail });

const PIPELINE = ["PLACED", "AT_HUB", "SPLITTING", "OUT_FOR_DELIVERY", "DELIVERED"];

function OrderDetail() {
  const { id } = Route.useParams();
  const { stations } = useCatalog();
  const { profile } = useProfile();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getOrder({ data: Number(id) })
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoaded(true));
  }, [id]);

  const canAdvance = profile?.account_type === "florist" || profile?.staff_role === "superadmin" || profile?.staff_role === "fulfilment";

  if (!loaded) {
    return (
      <AppFrame authed>
        <p className="text-muted">Loading order…</p>
      </AppFrame>
    );
  }

  if (!order) {
    return (
      <AppFrame authed>
        <p>
          Order not found.{" "}
          <Link to="/orders" className="font-semibold text-primary">
            Back to orders
          </Link>
        </p>
      </AppFrame>
    );
  }

  const step = PIPELINE.indexOf(order.status);

  return (
    <AppFrame authed>
      <Link to="/orders" className="text-sm text-muted">
        ← Orders
      </Link>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Order #{order.id}</h1>
        <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
          {prettyStatus(order.status)}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{order.product_summary}</p>
      <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-xs uppercase tracking-wide text-muted">
        {PIPELINE.map((s, i) => (
          <li key={s} className={`rounded-full px-1 py-2 ${i <= step ? "bg-primary text-primary-fg" : "bg-line"}`}>
            {prettyStatus(s)}
          </li>
        ))}
      </ol>
      {canAdvance && step < PIPELINE.length - 1 && (
        <button
          className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg"
          onClick={async () => {
            const next = PIPELINE[step + 1];
            await advanceOrder({ data: { orderId: order.id, status: next } });
            toast.success(`Moved to ${prettyStatus(next)}`);
            setOrder(await getOrder({ data: order.id }));
          }}
        >
          Advance to {prettyStatus(PIPELINE[step + 1])}
        </button>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {order.gifts.map((g) => {
          const st = stations.find((s) => s.id === g.station_id);
          return (
            <article key={g.id} className="rounded-2xl bg-surface p-4">
              <div className="flex justify-between gap-2">
                <h2 className="font-semibold">{g.recipient_name}</h2>
                <span className="text-xs text-muted">{prettyStatus(g.status)}</span>
              </div>
              <p className="text-sm text-muted">
                {g.address}, {g.city}
              </p>
              <p className="mt-2 text-sm">
                {g.grams}g · {g.package_type} {g.addons ? `· ${g.addons}` : ""}
              </p>
              {g.message && <p className="mt-2 rounded-lg bg-bg p-2 text-sm italic">“{g.message}”</p>}
              <p className="mt-2 text-xs text-muted">
                From {st?.name ?? g.station_id} · {ghs(g.delivery_fee)}
              </p>
              <LiveDot gift={g} stations={stations} status={order.status} />
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm">
        Flowers {ghs(order.merchandise)} · extras {ghs(order.addons_fee)} · delivery {ghs(order.delivery_fee)} ·{" "}
        <b>{ghs(order.total)}</b>
      </p>
    </AppFrame>
  );
}

function LiveDot({
  gift,
  stations,
  status,
}: {
  gift: { lat: number; lng: number; station_id: string };
  stations: { id: string; lat: number; lng: number; name: string }[];
  status: string;
}) {
  const st = stations.find((s) => s.id === gift.station_id);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (status !== "OUT_FOR_DELIVERY") return;
    const id = setInterval(() => setTick((t) => t + 1), 800);
    return () => clearInterval(id);
  }, [status]);
  if (!st) return null;
  let t = 0.08;
  if (status === "DELIVERED") t = 1;
  else if (status === "OUT_FOR_DELIVERY") t = 0.45 + 0.4 * ((tick % 20) / 20);
  else if (status === "SPLITTING") t = 0.25;
  else if (status === "AT_HUB") t = 0.12;
  const lat = st.lat + (gift.lat - st.lat) * t;
  const lng = st.lng + (gift.lng - st.lng) * t;
  const pos = projectGhana(lat, lng);
  const hub = projectGhana(st.lat, st.lng);
  const dest = projectGhana(gift.lat, gift.lng);
  return (
    <div className="relative mt-3 h-36 overflow-hidden rounded-xl bg-soft">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M18 78 C22 62, 28 48, 38 40 C48 30, 52 22, 58 18 C70 22, 78 34, 82 48 C86 62, 80 78, 62 86 C48 90, 32 88, 18 78Z"
          fill="color-mix(in oklab, var(--color-primary) 12%, transparent)"
          stroke="color-mix(in oklab, var(--color-primary) 28%, transparent)"
          strokeWidth="0.6"
        />
        <line x1={hub.x} y1={hub.y} x2={dest.x} y2={dest.y} stroke="var(--color-primary)" strokeDasharray="2 2" strokeWidth="0.5" />
        <circle cx={hub.x} cy={hub.y} r="1.6" fill="var(--color-primary)" />
        <circle cx={dest.x} cy={dest.y} r="1.4" fill="var(--color-accent)" />
        <circle cx={pos.x} cy={pos.y} r="2.2" fill="var(--color-accent)" />
      </svg>
      <p className="absolute bottom-1 left-2 text-xs text-muted">
        {status === "OUT_FOR_DELIVERY" ? "Live rider" : "Route"} from {st.name}
      </p>
    </div>
  );
}
