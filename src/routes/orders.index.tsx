import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { listMyOrders } from "@/lib/server/actions";
import { ghs, prettyStatus } from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/orders/")({ component: OrdersPage });

function OrdersPage() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listMyOrders>>>([]);
  useEffect(() => {
    listMyOrders().then(setOrders).catch(() => {});
  }, []);
  return (
    <AppFrame authed>
      <h1 className="font-display text-4xl">Orders</h1>
      <p className="mt-2 text-sm text-muted">Every gift inside a batch has its own address, note and station.</p>
      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <Link key={o.id} to="/orders/$id" params={{ id: String(o.id) }} className="block rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <b>#{o.id}</b>
              <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {prettyStatus(o.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{o.product_summary}</p>
            <p className="mt-1 text-sm">
              {o.is_batch ? "Batch split" : "Single drop"} · {ghs(o.total)}
            </p>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="text-muted">
            No orders yet.{" "}
            <Link to="/shop" className="font-semibold text-primary">
              Browse the shop
            </Link>
          </p>
        )}
      </div>
    </AppFrame>
  );
}
