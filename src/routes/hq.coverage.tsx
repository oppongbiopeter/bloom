import { createFileRoute } from "@tanstack/react-router";
import { listCoverageAdmin, saveAreaSettings, saveRegionSettings, UNLOCK_MODES, type CoverageArea, type UnlockMode } from "@/lib/server/coverage";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/coverage")({ component: HqCoverage });

type Status = "open" | "goal" | "closed";

function statusOf(a: CoverageArea): Status {
  if (a.locked) return "closed";
  if (a.open) return "open";
  return "goal";
}

function HqCoverage() {
  const [rows, setRows] = useState<CoverageArea[]>([]);
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<Status>("goal");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await listCoverageAdmin();
    setRows(next);
    setPicked((id) => id ?? next.find((a) => !a.live)?.id ?? next[0]?.id ?? null);
  }

  useEffect(() => {
    reload().catch((err) => toast.error(err instanceof Error ? err.message : "Could not load rollout"));
  }, []);

  const regions = useMemo(() => [...new Set(rows.map((r) => r.region))], [rows]);
  const shown = rows.filter((a) => {
    if (region !== "all" && a.region !== region) return false;
    return `${a.name} ${a.region}`.toLowerCase().includes(q.trim().toLowerCase());
  });
  const area = rows.find((a) => a.id === picked) ?? null;
  const openCount = rows.filter((a) => a.live).length;

  async function applyRegion() {
    if (region === "all") {
      toast.error("Pick one region to update together");
      return;
    }
    setBusy(true);
    try {
      await saveRegionSettings({ data: { region, status: bulkStatus } });
      toast.success(`${region} set to ${bulkStatus}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update region");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-hq-muted">Super admin</p>
      <h1 className="mt-1 font-display text-4xl">Rollout</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Ghana is not one switch. Open the constituencies Bloom can actually serve. Everywhere else stays on a download and share goal until you change it. Polling stations follow their constituency.
      </p>
      <p className="mt-3 text-sm text-hq-fg">
        {openCount} of {rows.length} constituencies are live.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-2">
        <label className="text-xs text-hq-muted">
          Region
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 block rounded-lg border border-hq-line bg-hq-panel px-3 py-2 text-sm text-hq-fg"
          >
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-hq-muted">
          Set that region
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as Status)}
            className="mt-1 block rounded-lg border border-hq-line bg-hq-panel px-3 py-2 text-sm text-hq-fg"
          >
            <option value="open">Open now</option>
            <option value="goal">Goal — auto open</option>
            <option value="closed">Closed — held</option>
          </select>
        </label>
        <button disabled={busy} onClick={applyRegion} className="min-h-11 rounded-full bg-hq-fg px-4 text-sm font-semibold text-hq disabled:opacity-50">
          Apply to region
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search constituency"
          className="min-h-11 flex-1 rounded-lg border border-hq-line bg-hq-panel px-3 text-sm text-hq-fg"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <ul className="max-h-[70vh] space-y-1 overflow-auto">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setPicked(a.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left",
                  picked === a.id ? "border-hq-fg/40 bg-hq-panel" : "border-transparent hover:bg-hq-panel/60",
                )}
              >
                <span>
                  <span className="font-semibold">{a.name}</span>
                  <span className="mt-0.5 block text-xs text-hq-muted">{a.region}</span>
                </span>
                <span className="text-right text-xs tabular-nums text-hq-muted">
                  <span className={cn("mb-1 block rounded-full px-2 py-0.5 font-semibold", a.live ? "bg-hq-fg text-hq" : "bg-hq-line text-hq-fg")}>
                    {a.live ? "Open" : statusOf(a) === "closed" ? "Held" : "Goal"}
                  </span>
                  {a.downloads}/{a.downloads_required} dl · {a.shares}/{a.shares_required} sh
                </span>
              </button>
            </li>
          ))}
        </ul>
        {area ? <AreaEditor key={area.id} area={area} onSaved={reload} /> : null}
      </div>
    </div>
  );
}

function AreaEditor({ area, onSaved }: { area: CoverageArea; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<Status>(statusOf(area));
  const [mode, setMode] = useState<UnlockMode>(area.unlock_mode);
  const [downloads, setDownloads] = useState(area.downloads_required);
  const [shares, setShares] = useState(area.shares_required);
  const [note, setNote] = useState(area.promo_note);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveAreaSettings({
        data: {
          id: area.id,
          status,
          unlock_mode: mode,
          downloads_required: downloads,
          shares_required: shares,
          promo_note: note,
        },
      });
      toast.success(`${area.name} updated`);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="h-fit rounded-2xl border border-hq-line bg-hq-panel p-4">
      <h2 className="font-display text-2xl">{area.name}</h2>
      <p className="text-xs text-hq-muted">{area.region}</p>
      <p className="mt-3 text-sm tabular-nums">
        Live downloads {area.downloads}. Live shares {area.shares}.
      </p>
      <label className="mt-4 block text-xs text-hq-muted">
        Access
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-sm text-hq-fg">
          <option value="open">Open now</option>
          <option value="goal">Goal — open when the numbers hit</option>
          <option value="closed">Closed — held even if the goal is met</option>
        </select>
      </label>
      <label className="mt-3 block text-xs text-hq-muted">
        What opens it
        <select value={mode} onChange={(e) => setMode(e.target.value as UnlockMode)} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-sm text-hq-fg">
          {UNLOCK_MODES.map((m) => (
            <option key={m} value={m}>
              {m === "either" ? "Downloads or shares" : m === "both" ? "Downloads and shares" : m === "manual" ? "Manual only" : m}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-hq-muted">
          Downloads needed
          <input type="number" min={1} value={downloads} onChange={(e) => setDownloads(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-sm text-hq-fg" />
        </label>
        <label className="text-xs text-hq-muted">
          Shares needed
          <input type="number" min={1} value={shares} onChange={(e) => setShares(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-sm text-hq-fg" />
        </label>
      </div>
      <label className="mt-3 block text-xs text-hq-muted">
        Note people see
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2 text-sm text-hq-fg" />
      </label>
      <button disabled={busy} className="mt-4 min-h-11 w-full rounded-full bg-hq-fg font-semibold text-hq disabled:opacity-50">
        Save constituency
      </button>
    </form>
  );
}
