import { BrandMark } from "@/components/shell";
import { readPhonePosition } from "@/lib/locate";
import { placeFromPhone, recordShare, type CoverageArea } from "@/lib/server/coverage";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export type CoveragePulse = {
  needsArea: boolean;
  open: boolean;
  area: CoverageArea | null;
  recent: { kind: string; detail: string; created_at: string }[];
  elsewhere: { name: string; region: string }[];
  rank: number | null;
  sharesSent: number;
  regionOpened?: number;
  regionTotal?: number;
  address?: string;
  ghanaPost?: string;
  km?: number | null;
};

function progressFor(area: CoverageArea) {
  const d = area.downloads_required > 0 ? area.downloads / area.downloads_required : 0;
  const s = area.shares_required > 0 ? area.shares / area.shares_required : 0;
  if (area.unlock_mode === "downloads") return Math.min(1, d);
  if (area.unlock_mode === "shares") return Math.min(1, s);
  if (area.unlock_mode === "both") return Math.min(1, Math.min(d, s));
  return Math.min(1, Math.max(d, s));
}

function ruleLine(area: CoverageArea) {
  if (area.locked || area.unlock_mode === "manual") {
    return "The company desk has this constituency held. Downloads and shares still count toward the next opening.";
  }
  if (area.unlock_mode === "downloads") return `Bloom opens here at ${area.downloads_required.toLocaleString()} downloads.`;
  if (area.unlock_mode === "shares") return `A share promotion is on. ${area.shares_required.toLocaleString()} shares open this constituency.`;
  if (area.unlock_mode === "both") return `Both goals have to land: ${area.downloads_required.toLocaleString()} downloads and ${area.shares_required.toLocaleString()} shares.`;
  return `Whichever finishes first: ${area.downloads_required.toLocaleString()} downloads or ${area.shares_required.toLocaleString()} shares.`;
}

export function RolloutGate({
  pulse,
  userId,
  onJoined,
}: {
  pulse: CoveragePulse;
  userId: string;
  onJoined: () => void;
}) {
  const [address, setAddress] = useState(pulse.address ?? "");
  const [ghanaPost, setGhanaPost] = useState(pulse.ghanaPost ?? "");
  const [busy, setBusy] = useState(false);

  async function locate() {
    if (address.trim().length < 3) {
      toast.error("Add the street address on this phone");
      return;
    }
    setBusy(true);
    try {
      const pos = await readPhonePosition();
      const referredBy = sessionStorage.getItem("bloom-invite-from") ?? undefined;
      const placed = await placeFromPhone({
        data: { lat: pos.lat, lng: pos.lng, address, ghanaPost, referredBy },
      });
      toast.success(
        placed.open ? `${placed.name} is open` : `Phone placed you in ${placed.name}`,
      );
      onJoined();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this phone");
    } finally {
      setBusy(false);
    }
  }

  if (!pulse.area) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <BrandMark />
        <h1 className="mt-8 font-display text-4xl">Bloom needs this phone’s location.</h1>
        <p className="mt-2 text-sm text-muted">
          You do not choose a constituency. Your address and phone location do that. If the company desk has not opened that area, you will land on the opening screen.
        </p>
        <label className="mt-6 block text-sm">
          Street address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number and street" />
        </label>
        <label className="mt-3 block text-sm">
          GhanaPost address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 uppercase" value={ghanaPost} onChange={(e) => setGhanaPost(e.target.value)} placeholder="GA-000-0000" />
        </label>
        <button disabled={busy} onClick={locate} className="mt-4 min-h-11 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-50">
          {busy ? "Reading your phone…" : "Use my phone location"}
        </button>
      </main>
    );
  }

  const area = pulse.area;
  const progress = progressFor(area);
  const stems = 12;
  const filled = Math.round(progress * stems);
  const downloadsLeft = Math.max(0, area.downloads_required - area.downloads);
  const sharesLeft = Math.max(0, area.shares_required - area.shares);

  function invite() {
    const url = `${window.location.origin}/?from=${userId}`;
    const text = `Bloom is not open in ${area.name} yet. Download it and help open our area — ${url}`;
    return { url, text };
  }

  async function send(kind: "whatsapp" | "text" | "other" | "copy") {
    const { url, text } = invite();
    if (kind === "other" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Bloom Ghana", text, url });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Could not open the share sheet");
        return;
      }
    }
    try {
      const res = await recordShare();
      if (res.capped) toast.message("You've already shared 8 times. New downloads from your link still count.");
      else toast.success(kind === "copy" ? "Link copied." : "Share recorded.");
      onJoined();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share");
      return;
    }
    if (kind === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } else if (kind === "text") {
      window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
    } else if (kind === "copy" || (kind === "other" && typeof navigator.share !== "function")) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        toast.message(url);
      }
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Phone placed you here · {area.region}</p>
      <h1 className="mt-2 font-display text-4xl leading-none text-primary">Bloom has not reached {area.name} yet.</h1>
      <p className="mt-3 text-sm text-muted">
        {pulse.km != null ? `About ${pulse.km} km from the centre of this constituency. ` : ""}
        {pulse.address ? `${pulse.address}. ` : ""}
        {pulse.ghanaPost ? `GhanaPost ${pulse.ghanaPost}. ` : ""}
        The company desk decides when this area goes live.
      </p>
      <p className="mt-1 text-sm text-muted">{ruleLine(area)}</p>

      <div className="mt-6 rounded-2xl bg-surface p-5">
        <div className="flex items-end justify-center gap-1.5" aria-hidden>
          {Array.from({ length: stems }, (_, i) => {
            const on = i < filled;
            const h = 24 + ((i * 13) % 32);
            return (
              <span key={i} className="flex flex-col items-center justify-end" style={{ height: 72 }}>
                <span className={cn("size-2.5 rounded-full", on ? "bg-accent" : "bg-line")} />
                <span className={cn("mt-1 w-px", on ? "bg-primary" : "bg-line")} style={{ height: h }} />
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm text-muted">{Math.round(progress * 100)}% of the way to opening</p>
        {pulse.rank ? <p className="text-center text-xs text-muted">You are neighbour #{pulse.rank} waiting here.</p> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Downloads here</div>
          <div className="mt-1 font-display text-3xl tabular-nums">
            {area.downloads}
            <span className="text-lg text-muted"> / {area.downloads_required}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{downloadsLeft === 0 ? "Download goal met" : `${downloadsLeft} more phones in this area`}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Shares</div>
          <div className="mt-1 font-display text-3xl tabular-nums">
            {area.shares}
            <span className="text-lg text-muted"> / {area.shares_required}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{sharesLeft === 0 ? "Share goal met" : `${sharesLeft} more shares to go`}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <button onClick={() => send("whatsapp")} className="min-h-11 rounded-full bg-primary font-semibold text-primary-fg">
          WhatsApp
        </button>
        <button onClick={() => send("text")} className="min-h-11 rounded-full border border-line bg-surface font-semibold">
          Text message
        </button>
        <button onClick={() => send("other")} className="min-h-11 rounded-full border border-line bg-surface font-semibold">
          Other messaging apps
        </button>
      </div>
      <button type="button" onClick={() => send("copy")} className="mt-3 w-full text-center text-sm font-semibold text-primary">
        Copy the link
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Same link, however you send it. Your shares recorded: {pulse.sharesSent} of 8. When someone opens it, their own phone is placed, and it counts here live.
      </p>
      {pulse.regionTotal ? (
        <p className="mt-4 text-sm">
          {pulse.regionOpened} of {pulse.regionTotal} constituencies are open in {area.region}.
        </p>
      ) : null}

      {pulse.recent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pulse.recent.map((e, i) => (
            <li key={`${e.created_at}-${i}`} className="rounded-xl bg-soft px-3 py-2 text-sm">
              {e.detail}
            </li>
          ))}
        </ul>
      )}

      {pulse.elsewhere.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Already open</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pulse.elsewhere.map((e) => (
              <li key={e.name} className="rounded-full bg-surface px-3 py-1 text-xs">
                {e.name}
                <span className="text-muted"> · {e.region}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" disabled={busy} onClick={locate} className="mt-6 text-sm font-semibold text-primary disabled:opacity-50">
        {busy ? "Reading your phone…" : "Check my location again"}
      </button>
    </main>
  );
}
