import { createFileRoute } from "@tanstack/react-router";
import { advanceDuty, fileDuty, getHqSettings, listDutyFilings, listPartners } from "@/lib/server/hq";
import { quoteDuty, type HqSettings } from "@/lib/duty";
import { ghs, prettyStatus } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/duty")({ component: HqDuty });

function HqDuty() {
  const [settings, setSettings] = useState<HqSettings | null>(null);
  const [filings, setFilings] = useState<Awaited<ReturnType<typeof listDutyFilings>>>([]);
  const [partners, setPartners] = useState<Awaited<ReturnType<typeof listPartners>>>([]);
  const [consignment, setConsignment] = useState("Naivasha roses — ACC");
  const [lane, setLane] = useState<"ACC_AIR" | "TEM_OCEAN">("ACC_AIR");
  const [cif, setCif] = useState(18500);
  const [agent, setAgent] = useState("lamptey-icum");

  async function reload() {
    const [s, f, p] = await Promise.all([getHqSettings(), listDutyFilings(), listPartners()]);
    setSettings(s);
    setFilings(f);
    setPartners(p);
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const preview = useMemo(() => (settings ? quoteDuty(cif, settings) : null), [cif, settings]);
  const agents = partners.filter((p) => p.kind === "customs_agent");
  const freight = settings ? (lane === "ACC_AIR" ? settings.air_freight_per_kg : settings.ocean_freight_per_kg) : 0;

  return (
    <div>
      <h1 className="font-display text-4xl">GRA ICUMS</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Duty, VAT, NHIL and GETFund on CIF. File ACC air or TEM ocean, then mark paid when GRA clears.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-2xl border border-hq-line bg-hq-panel p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fileDuty({
              data: { consignment, lane, cif_ghs: cif, partner_id: agent },
            });
            toast.success(`${res.reference} filed · ${ghs(res.total)}`);
            reload();
          }}
        >
          <h2 className="text-xl">New filing</h2>
          <input className="w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={consignment} onChange={(e) => setConsignment(e.target.value)} />
          <select className="w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={lane} onChange={(e) => setLane(e.target.value as typeof lane)}>
            <option value="ACC_AIR">ACC air — Kotoka</option>
            <option value="TEM_OCEAN">TEM ocean — Tema</option>
          </select>
          <label className="block text-sm text-hq-muted">
            CIF (₵)
            <input type="number" className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-hq-fg" value={cif} onChange={(e) => setCif(Number(e.target.value))} />
          </label>
          <select className="w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={agent} onChange={(e) => setAgent(e.target.value)}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {preview && (
            <ul className="space-y-1 text-sm text-hq-muted">
              <li>Indicative freight {ghs(freight)} / kg on this lane</li>
              <li className="flex justify-between"><span>Duty {settings?.icums_duty_pct}%</span><b className="tabular-nums text-hq-fg">{ghs(preview.duty)}</b></li>
              <li className="flex justify-between"><span>NHIL + GETFund</span><b className="tabular-nums text-hq-fg">{ghs(preview.levies)}</b></li>
              <li className="flex justify-between"><span>VAT on CIF + duty</span><b className="tabular-nums text-hq-fg">{ghs(preview.vat)}</b></li>
              <li className="flex justify-between border-t border-hq-line pt-1 font-semibold text-hq-fg"><span>Payable</span><span className="tabular-nums">{ghs(preview.total)}</span></li>
            </ul>
          )}
          <button className="min-h-11 w-full rounded-full bg-hq-fg font-semibold text-hq">File with agent</button>
        </form>
        <div>
          <h2 className="text-xl">Pipeline</h2>
          <ul className="mt-3 space-y-2">
            {filings.map((f) => (
              <li key={f.id} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
                <div className="flex justify-between gap-2">
                  <b>{f.reference}</b>
                  <span className="text-xs uppercase tracking-wide text-hq-muted">{prettyStatus(f.status)}</span>
                </div>
                <p className="mt-1 text-sm text-hq-muted">
                  {f.consignment} · {f.lane === "ACC_AIR" ? "ACC air" : "TEM ocean"}
                </p>
                <p className="mt-1 text-sm tabular-nums">{ghs(f.total_ghs)} payable</p>
                {f.status !== "CLEARED" && (
                  <button
                    className="mt-3 text-sm font-semibold"
                    onClick={async () => {
                      const next = f.status === "FILED" ? "PAID" : "CLEARED";
                      await advanceDuty({ data: { id: f.id, status: next } });
                      reload();
                    }}
                  >
                    Mark {f.status === "FILED" ? "paid" : "cleared"}
                  </button>
                )}
              </li>
            ))}
            {filings.length === 0 && <p className="text-sm text-hq-muted">No filings yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
