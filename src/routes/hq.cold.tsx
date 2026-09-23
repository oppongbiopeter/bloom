import { createFileRoute } from "@tanstack/react-router";
import { addColdLot, listColdLots, listHqStations, listPartners, saveStation, updateColdLot } from "@/lib/server/hq";
import { prettyStatus } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/cold")({ component: HqCold });

function HqCold() {
  const [stations, setStations] = useState<Awaited<ReturnType<typeof listHqStations>>>([]);
  const [lots, setLots] = useState<Awaited<ReturnType<typeof listColdLots>>>([]);
  const [partners, setPartners] = useState<Awaited<ReturnType<typeof listPartners>>>([]);
  const [label, setLabel] = useState("LOT-");
  const [variety, setVariety] = useState("Red Naomi");
  const [kg, setKg] = useState(120);
  const [temp, setTemp] = useState(4);
  const [stationId, setStationId] = useState("acc-a");
  const [partnerId, setPartnerId] = useState("kotoka-cold");

  async function reload() {
    const [s, l, p] = await Promise.all([listHqStations(), listColdLots(), listPartners()]);
    setStations(s);
    setLots(l);
    setPartners(p);
    if (s[0] && !s.find((x) => x.id === stationId)) setStationId(s[0].id);
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const rooms = partners.filter((p) => p.kind === "cold_room");

  return (
    <div>
      <h1 className="font-display text-4xl">Cold chain</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Sorting stations and storage providers. Lots over 8°C raise an alarm.
      </p>
      <h2 className="mt-8 text-xl">Stations</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {stations.map((s) => (
          <div key={s.id} className="rounded-2xl border border-hq-line bg-hq-panel p-4">
            <div className="font-semibold">{s.name}</div>
            <p className="text-xs text-hq-muted">
              {s.city} · {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
            </p>
          </div>
        ))}
      </div>
      <AddStation onSaved={reload} />
      <h2 className="mt-10 text-xl">Lots in store</h2>
      <form
        className="mt-3 grid gap-3 rounded-2xl border border-hq-line bg-hq-panel p-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await addColdLot({
            data: { station_id: stationId, partner_id: partnerId, lot_label: label, variety, kg, temp_c: temp },
          });
          toast.success("Lot booked into the room");
          reload();
        }}
      >
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Lot label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Variety" value={variety} onChange={(e) => setVariety(e.target.value)} required />
        <input type="number" className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={kg} onChange={(e) => setKg(Number(e.target.value))} />
        <input type="number" step="0.1" className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
        <select className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="min-h-11 rounded-full bg-hq-fg font-semibold text-hq md:col-span-2">Book lot</button>
      </form>
      <ul className="mt-4 space-y-2">
        {lots.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hq-line bg-hq-panel px-4 py-3">
            <div>
              <div className="font-semibold">
                {l.lot_label} · {l.variety}
              </div>
              <p className="text-xs text-hq-muted">
                {l.kg} kg · {l.temp_c}°C · {stations.find((s) => s.id === l.station_id)?.name ?? l.station_id} · {prettyStatus(l.status)}
              </p>
            </div>
            <div className="flex gap-2">
              {l.status === "IN_STORE" && (
                <button
                  className="text-sm font-semibold"
                  onClick={async () => {
                    await updateColdLot({ data: { id: l.id, status: "ALLOCATED" } });
                    reload();
                  }}
                >
                  Allocate
                </button>
              )}
              {l.status !== "RELEASED" && (
                <button
                  className="text-sm font-semibold"
                  onClick={async () => {
                    await updateColdLot({ data: { id: l.id, status: "RELEASED" } });
                    reload();
                  }}
                >
                  Release
                </button>
              )}
            </div>
          </li>
        ))}
        {lots.length === 0 && <p className="text-sm text-hq-muted">No lots in store.</p>}
      </ul>
    </div>
  );
}

function AddStation({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Accra");
  const [lat, setLat] = useState(5.6);
  const [lng, setLng] = useState(-0.17);
  if (!open) {
    return (
      <button className="mt-3 text-sm font-semibold" onClick={() => setOpen(true)}>
        Add a station
      </button>
    );
  }
  return (
    <form
      className="mt-3 grid gap-2 rounded-2xl border border-dashed border-hq-line p-4 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await saveStation({ data: { id, name, city, lat, lng } });
        toast.success("Station saved");
        setOpen(false);
        onSaved();
      }}
    >
      <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="id (e.g. cape-coast)" value={id} onChange={(e) => setId(e.target.value)} required />
      <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.0001" className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
        <input type="number" step="0.0001" className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
      </div>
      <button className="min-h-11 rounded-full bg-hq-fg font-semibold text-hq md:col-span-2">Save station</button>
    </form>
  );
}
