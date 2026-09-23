import { createFileRoute } from "@tanstack/react-router";
import { listPartners, savePartner } from "@/lib/server/hq";
import { prettyStatus } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/partners")({ component: HqPartners });

const KINDS = [
  { id: "airline", label: "Airline / cargo" },
  { id: "cold_room", label: "Cold room" },
  { id: "3pl", label: "3PL last-mile" },
  { id: "customs_agent", label: "Customs agent" },
] as const;

function HqPartners() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPartners>>>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("3pl");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Accra");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function reload() {
    setRows(await listPartners());
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl">Operational partners</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Airlines, GRA agents, cold-room operators and 3PL riders. Bloom HQ holds the contracts — customers never see this list as a signup option.
      </p>
      <form
        className="mt-8 grid gap-3 rounded-2xl border border-hq-line bg-hq-panel p-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await savePartner({
            data: {
              id: id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32),
              kind,
              name,
              city,
              contact_name: contact,
              phone,
              email: "",
              notes,
              sla_hours: 24,
              status: "active",
            },
          });
          toast.success("Partner linked");
          setName("");
          setId("");
          reload();
        }}
      >
        <select className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="id (optional slug)" value={id} onChange={(e) => setId(e.target.value)} />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2 md:col-span-2" placeholder="Notes / SLA" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="min-h-11 rounded-full bg-hq-fg font-semibold text-hq md:col-span-2">Link partner</button>
      </form>
      <div className="mt-6 space-y-6">
        {KINDS.map((k) => {
          const list = rows.filter((r) => r.kind === k.id);
          return (
            <section key={k.id}>
              <h2 className="text-xl">{k.label}</h2>
              <ul className="mt-2 space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
                    <div className="flex justify-between gap-2">
                      <b>{r.name}</b>
                      <span className="text-xs uppercase text-hq-muted">{prettyStatus(r.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-hq-muted">
                      {r.city} · {r.contact_name} · {r.phone} · SLA {r.sla_hours}h
                    </p>
                    {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
                  </li>
                ))}
                {list.length === 0 && <p className="text-sm text-hq-muted">None linked.</p>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
