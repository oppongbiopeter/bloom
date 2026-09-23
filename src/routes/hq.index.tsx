import { createFileRoute, Link } from "@tanstack/react-router";
import { useProfile } from "@/components/use-bloom";
import { listHqStats } from "@/lib/server/hq";
import { STAFF_DESKS, staffLabel } from "@/lib/staff";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/hq/")({ component: HqHome });

function HqHome() {
  const { profile } = useProfile();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof listHqStats>> | null>(null);
  useEffect(() => {
    listHqStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);
  const role = profile?.staff_role;
  const desks = STAFF_DESKS.filter((d) => d.to !== "/hq" && role && d.roles.includes(role));

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-hq-muted">Bloom Ghana</p>
      <h1 className="mt-1 font-display text-4xl">Company desk</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        You are {staffLabel(role)}. This is Bloom Ghana, the operating company — not a customer workspace. Functions you are assigned appear below.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { k: "Open orders", v: stats?.openOrders ?? "—" },
          { k: "Lots in store", v: stats?.lotsInStore ?? "—" },
          { k: "ICUMS open", v: stats?.openFilings ?? "—" },
          { k: "Staff seats", v: stats?.staff ?? "—" },
          { k: "Active partners", v: stats?.partners ?? "—" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
            <div className="text-xs text-hq-muted">{s.k}</div>
            <div className="mt-1 font-display text-3xl tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {desks.map((d) => (
          <Link key={d.to} to={d.to} className="rounded-2xl border border-hq-line bg-hq-panel p-5 hover:border-hq-fg/30">
            <div className="font-semibold">{d.label}</div>
            <p className="mt-1 text-sm text-hq-muted">{d.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
