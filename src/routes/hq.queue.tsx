import { createFileRoute, Link } from "@tanstack/react-router";
import { listHqOrders, listHqStations } from "@/lib/server/hq";
import { advanceOrder } from "@/lib/server/actions";
import { ghs, prettyStatus } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/queue")({ component: HqQueue });

const PIPELINE = ["PLACED", "AT_HUB", "SPLITTING", "OUT_FOR_DELIVERY", "DELIVERED"];

function HqQueue() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listHqOrders>>>([]);
  const [stations, setStations] = useState<Awaited<ReturnType<typeof listHqStations>>>([]);

  async function reload() {
    const [o, s] = await Promise.all([listHqOrders(), listHqStations()]);
    setOrders(o);
    setStations(s);
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const batches = orders.filter((o) => o.is_batch);
  const open = orders.filter((o) => o.status !== "DELIVERED");

  return (
    <div>
      <h1 className="font-display text-4xl">Split queue</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Hub packing for named gifts. Advance a ticket as it moves from Kotoka through the station to the door.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {stations.map((s) => (
          <div key={s.id} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-hq-muted">{s.city}</div>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl">Open tickets</h2>
      <ul className="mt-3 space-y-2">
        {open.map((o) => {
          const step = PIPELINE.indexOf(o.status);
          const next = PIPELINE[step + 1];
          return (
            <li key={o.id} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to="/orders/$id" params={{ id: String(o.id) }} className="font-semibold hover:underline">
                  #{o.id} {o.is_batch ? "· batch" : ""}
                </Link>
                <span className="text-xs uppercase text-hq-muted">{prettyStatus(o.status)}</span>
              </div>
              <p className="mt-1 text-sm text-hq-muted">
                {o.product_summary} · {Math.round(o.grams)}g · {ghs(o.total)}
              </p>
              {next && (
                <button
                  className="mt-3 text-sm font-semibold"
                  onClick={async () => {
                    await advanceOrder({ data: { orderId: o.id, status: next } });
                    toast.success(`Moved to ${prettyStatus(next)}`);
                    reload();
                  }}
                >
                  Advance to {prettyStatus(next)}
                </button>
              )}
            </li>
          );
        })}
        {open.length === 0 && <p className="text-sm text-hq-muted">Queue is clear.</p>}
      </ul>
      {batches.length > 0 && (
        <p className="mt-4 text-xs text-hq-muted">{batches.length} batch split{batches.length === 1 ? "" : "s"} in the book.</p>
      )}
    </div>
  );
}
