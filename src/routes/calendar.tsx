import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useProfile } from "@/components/use-bloom";
import { addEvent, addEventsBulk, deleteEvent, listEvents } from "@/lib/server/actions";
import { importGoogleCalendar } from "@/lib/server/google-cal";
import { guessKind, parseCsv, parseIcs } from "@/lib/csv";
import { daysUntil, ymd } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

type Ev = {
  id: number;
  title: string;
  person_name: string;
  kind: string;
  event_date: string;
  reminder_days: number;
  notes: string;
  source: string;
};

function CalendarPage() {
  const { profile } = useProfile();
  const [events, setEvents] = useState<Ev[]>([]);
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("");
  const [kind, setKind] = useState<"birthday" | "anniversary" | "wedding" | "corporate" | "holiday" | "custom">(
    "birthday",
  );
  const [date, setDate] = useState(() => ymd(new Date()));
  const [reminder, setReminder] = useState(7);
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [gCalMsg, setGCalMsg] = useState<string | null>(null);

  async function reload() {
    setEvents(await listEvents());
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const marked = new Set(events.map((e) => e.event_date));
  const dayEvents = events.filter((e) => e.event_date === date);
  const due = events
    .map((e) => ({ ...e, days: daysUntil(e.event_date) }))
    .filter((e) => e.days >= 0 && e.days <= e.reminder_days)
    .sort((a, b) => a.days - b.days);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await addEvent({
      data: { title, person_name: person, kind, event_date: date, reminder_days: reminder, notes: "" },
    });
    setTitle("");
    setPerson("");
    toast.success("Saved on the calendar");
    reload();
  }

  async function fromGoogle() {
    const res = await importGoogleCalendar();
    if (!res.ok) {
      if (res.kind === "login" && res.loginUrl && typeof window !== "undefined") {
        const opened = window.open(res.loginUrl, "_blank");
        if (opened) opened.opener = null;
        else window.location.assign(res.loginUrl);
        return;
      }
      setGCalMsg(res.message);
      toast.error(res.message);
      return;
    }
    if (!res.events.length) {
      toast.message("No matching Google Calendar events — try an Apple .ics or CSV instead.");
      return;
    }
    await addEventsBulk({
      data: res.events.map((ev) => ({
        title: ev.title,
        person_name: "",
        kind: guessKind(ev.title),
        event_date: ev.date,
        reminder_days: 7,
        source: "google",
      })),
    });
    toast.success(`Imported ${res.events.length} Google events`);
    reload();
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result);
      if (file.name.endsWith(".ics") || text.includes("BEGIN:VEVENT")) {
        const parsed = parseIcs(text);
        await addEventsBulk({
          data: parsed.map((ev) => ({
            title: ev.title,
            kind: guessKind(ev.title),
            event_date: ev.date,
            reminder_days: 7,
            source: "apple",
          })),
        });
        toast.success(`Imported ${parsed.length} from Apple / ICS`);
      } else {
        const rows = parseCsv(text);
        const body = rows.slice(1);
        await addEventsBulk({
          data: body.map((r) => ({
            title: r[0],
            person_name: r[1] || "",
            kind: guessKind(r[2] || r[0]),
            event_date: r[3] || r[2],
            reminder_days: Number(r[4] || 7),
            source: "excel",
          })),
        });
        toast.success(`Imported ${body.length} rows`);
      }
      reload();
    };
    reader.readAsText(file);
  }

  const intro =
    profile?.account_type === "corporate"
      ? "Staff birthdays, holidays and offsites. We remind you with enough runway for Kenya stems."
      : profile?.account_type === "organizer"
        ? "Client events and follow-up anniversaries. Import Google Calendar or an Apple .ics export."
        : "Birthdays, weddings, private dates. A reminder lands a week before — or sooner if you ask.";

  return (
    <AppFrame authed>
      <h1 className="font-display text-4xl">Occasion calendar</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{intro}</p>

      {due.length > 0 && (
        <div className="mt-4 space-y-2">
          {due.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-fg"
            >
              <span>
                Offer · {e.title} in {e.days} day{e.days === 1 ? "" : "s"}. Order {Math.max(0, e.days - 3)} day(s) out
                for Accra air-hub delivery.
              </span>
              <Link
                to="/shop"
                search={{ occasion: e.kind === "custom" || e.kind === "holiday" ? "thanks" : e.kind }}
                className="rounded-full bg-primary-fg px-3 py-1.5 text-xs font-semibold text-primary"
              >
                Shop this occasion
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-surface p-4">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              if (d) setDate(ymd(d));
            }}
            modifiers={{ marked: (d) => marked.has(ymd(d)) }}
            modifiersClassNames={{ marked: "bg-soft font-bold text-primary" }}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {dayEvents.length === 0 && <li className="text-muted">Nothing on this day.</li>}
            {dayEvents.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-bg px-3 py-2">
                <span>
                  <b>{e.title}</b>
                  <span className="block text-xs text-muted">
                    {e.kind} · {e.person_name} · remind {e.reminder_days}d out · {e.source}
                  </span>
                </span>
                <button className="text-accent" onClick={() => deleteEvent({ data: e.id }).then(reload)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <form className="space-y-3 rounded-2xl bg-surface p-4" onSubmit={create}>
          <h2 className="text-xl">Add a date</h2>
          <input
            className="min-h-11 w-full rounded-lg border border-line px-3"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="min-h-11 w-full rounded-lg border border-line px-3"
            placeholder="Who is it for?"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
          <select
            className="min-h-11 w-full rounded-lg border border-line px-3"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="wedding">Wedding</option>
            <option value="corporate">Corporate</option>
            <option value="holiday">Holiday</option>
            <option value="custom">Other</option>
          </select>
          <input
            type="date"
            className="min-h-11 w-full rounded-lg border border-line px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="block text-sm text-muted">
            Remind me {reminder} days before
            <input
              type="range"
              min={2}
              max={21}
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <button className="min-h-11 w-full rounded-full bg-primary font-semibold text-primary-fg">Save</button>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold"
              onClick={fromGoogle}
            >
              Import Google Calendar
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
              Apple .ics / Excel CSV
              <input
                type="file"
                accept=".ics,.csv,text/calendar,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            Sample files:{" "}
            <a className="font-semibold text-primary" href="/samples/calendar.csv" download>
              Excel/CSV
            </a>
            {" · "}
            <a className="font-semibold text-primary" href="/samples/apple-calendar.ics" download>
              Apple .ics
            </a>
          </p>
          {gCalMsg && <p className="text-xs text-muted">{gCalMsg}</p>}
        </form>
      </div>
    </AppFrame>
  );
}
