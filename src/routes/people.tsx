import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useProfile } from "@/components/use-bloom";
import { addContactsBulk, addEventsBulk, listContacts } from "@/lib/server/actions";
import { parseCsv } from "@/lib/csv";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/people")({ component: PeoplePage });

function PeoplePage() {
  const { profile } = useProfile();
  const setGifts = useCart((s) => s.setGifts);
  const gifts = useCart((s) => s.gifts);
  const [rows, setRows] = useState<{ id: number; name: string; address: string; city: string; phone: string; notes: string }[]>(
    [],
  );
  const [name, setName] = useState("");
  const [address, setAddress] = useState("East Legon");
  const [city, setCity] = useState("Accra");
  const [phone, setPhone] = useState("");

  async function reload() {
    setRows(await listContacts());
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const heading =
    profile?.account_type === "corporate"
      ? "Staff directory"
      : profile?.account_type === "organizer"
        ? "Clients"
        : "People you send flowers to";

  return (
    <AppFrame authed>
      <h1 className="font-display text-4xl">{heading}</h1>
      <p className="mt-2 text-sm text-muted">
        Add one person, or upload Excel/CSV. Corporate teams can drop staff birthdays in the same file — we add them to the calendar automatically.
      </p>
      <form
        className="mt-6 grid gap-3 rounded-2xl bg-surface p-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await addContactsBulk({ data: [{ name, address, city, phone }] });
          setName("");
          toast.success("Saved");
          reload();
        }}
      >
        <input
          className="min-h-11 rounded-lg border border-line px-3"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="min-h-11 rounded-lg border border-line px-3"
          placeholder="Area / address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="min-h-11 rounded-lg border border-line px-3"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="min-h-11 rounded-lg border border-line px-3"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="min-h-11 rounded-full bg-primary font-semibold text-primary-fg md:col-span-2">Add person</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/samples/staff.csv"
          download
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
        >
          Sample staff CSV
        </a>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
          Batch upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async () => {
                const parsed = parseCsv(String(reader.result));
                const body = parsed.slice(1);
                await addContactsBulk({
                  data: body.map((r) => ({
                    name: r[0],
                    address: r[1] || "East Legon",
                    city: r[2] || "Accra",
                    phone: r[3] || "",
                    notes: r[4] || "",
                  })),
                });
                const withDates = body.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[5] || ""));
                if (withDates.length) {
                  await addEventsBulk({
                    data: withDates.map((r) => ({
                      title: `${r[0]} birthday`,
                      person_name: r[0],
                      kind: "birthday" as const,
                      event_date: r[5],
                      reminder_days: 7,
                      source: "excel",
                    })),
                  });
                }
                toast.success(`Imported ${body.length} people`);
                reload();
              };
              reader.readAsText(file);
            }}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">CSV: name, address, city, phone, notes, birthday (YYYY-MM-DD optional)</p>
      <ul className="mt-6 divide-y divide-line rounded-2xl bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-muted">
                {r.address}, {r.city} · {r.phone}
              </div>
            </div>
            <button
              className="min-h-11 text-sm font-semibold text-primary"
              onClick={() => {
                setGifts([
                  ...gifts,
                  {
                    key: crypto.randomUUID(),
                    recipientName: r.name,
                    address: r.address || "East Legon",
                    city: r.city || "Accra",
                    phone: r.phone,
                    message: "",
                    grams: 300,
                    packageType: "kraft",
                    addons: ["card"],
                  },
                ]);
                toast.success("Added to gift split on the cart");
              }}
            >
              Gift
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            No people yet.{" "}
            <Link to="/calendar" className="font-semibold text-primary">
              Add dates on the calendar
            </Link>{" "}
            or upload a staff sheet.
          </li>
        )}
      </ul>
    </AppFrame>
  );
}
