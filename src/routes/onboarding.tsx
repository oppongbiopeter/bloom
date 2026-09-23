import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ACCOUNT_TYPES, cn } from "@/lib/utils";
import { saveProfile } from "@/lib/server/actions";
import { placeFromPhone } from "@/lib/server/coverage";
import { readPhonePosition } from "@/lib/locate";
import { BrandMark } from "@/components/shell";
import { useProfile } from "@/components/use-bloom";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type OnboardSearch = { as?: "florist" };

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): OnboardSearch => ({
    as: s.as === "florist" ? "florist" : undefined,
  }),
  component: Onboarding,
});

function Onboarding() {
  const { as } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const { profile } = useProfile();
  const nav = useNavigate();
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]["id"]>(as === "florist" ? "florist" : "personal");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ghanaPost, setGhanaPost] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.displayName) setName((n) => n || user.displayName || "");
  }, [user]);

  useEffect(() => {
    if (profile?.staff_role) nav({ to: "/hq" });
  }, [profile, nav]);

  if (isPending) return <div className="min-h-dvh bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  if (profile?.staff_role) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const pos = await readPhonePosition();
      await saveProfile({
        data: {
          account_type: type,
          display_name: name || user?.displayName || "Bloom guest",
          company_name: company,
          phone,
          address,
          ghana_post: ghanaPost,
        },
      });
      const referredBy = sessionStorage.getItem("bloom-invite-from") ?? undefined;
      const placed = await placeFromPhone({
        data: { lat: pos.lat, lng: pos.lng, address, ghanaPost, phone, referredBy },
      });
      toast.success(
        placed.open
          ? `You're in ${placed.name}. Bloom is open there.`
          : `You're in ${placed.name}. That area is not open yet.`,
      );
      nav({ to: type === "florist" ? "/partner" : "/shop" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place this phone");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <BrandMark />
      <h1 className="mt-8 font-display text-4xl">How will you use Bloom?</h1>
      <p className="mt-2 text-muted">
        Put in your details and address. Your phone’s location tells Bloom which constituency you are in. You do not pick it. If that area is not open yet, you will see the opening screen.
      </p>
      <form className="mt-8 space-y-6" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                "rounded-xl border p-4 text-left",
                type === t.id ? "border-primary bg-soft" : "border-line bg-surface",
              )}
            >
              <div className="font-semibold">{t.label}</div>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            </button>
          ))}
        </div>
        <label className="block text-sm">
          Your name
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Phone
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="024 000 0000" required />
        </label>
        {(type === "organizer" || type === "corporate" || type === "florist") && (
          <label className="block text-sm">
            Studio / company
            <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        )}
        <label className="block text-sm">
          Street address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number and street" required />
        </label>
        <label className="block text-sm">
          GhanaPost address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 uppercase" value={ghanaPost} onChange={(e) => setGhanaPost(e.target.value)} placeholder="GA-000-0000" />
        </label>
        <button disabled={busy} className="min-h-11 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-50">
          {busy ? "Reading your phone…" : "Continue with phone location"}
        </button>
      </form>
    </main>
  );
}
