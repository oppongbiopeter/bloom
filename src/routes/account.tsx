import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useProfile } from "@/components/use-bloom";
import { saveProfile } from "@/lib/server/actions";
import { placeFromPhone } from "@/lib/server/coverage";
import { readPhonePosition } from "@/lib/locate";
import { ACCOUNT_TYPES, cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user, profile, reload } = useProfile();
  const [type, setType] = useState(profile?.account_type ?? "personal");
  const [name, setName] = useState(profile?.display_name ?? user?.displayName ?? "");
  const [company, setCompany] = useState(profile?.company_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [ghanaPost, setGhanaPost] = useState(profile?.ghana_post ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setType(profile.account_type === "staff" ? "personal" : profile.account_type);
      setName(profile.display_name);
      setCompany(profile.company_name);
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setGhanaPost(profile.ghana_post ?? "");
    } else if (user?.displayName) {
      setName(user.displayName);
    }
  }, [profile, user]);

  if (profile?.staff_role) {
    return (
      <AppFrame authed>
        <h1 className="font-display text-4xl">Account</h1>
        <p className="mt-2 text-sm text-muted">{user?.primaryEmail}</p>
        <p className="mt-6 max-w-xl text-sm text-muted">
          This is a Bloom Ghana company seat. Which constituencies are open is set on the HQ rollout desk, not from a shop profile.
        </p>
        <Link to="/hq" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg">
          Open Bloom HQ
        </Link>
      </AppFrame>
    );
  }

  return (
    <AppFrame authed>
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-sm text-muted">{user?.primaryEmail}</p>
      <form
        className="mt-6 max-w-xl space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await saveProfile({
              data: {
                account_type: type,
                display_name: name || "Bloom guest",
                company_name: company,
                phone,
                address,
                ghana_post: ghanaPost,
                city: profile?.city ?? "",
              },
            });
            const pos = await readPhonePosition();
            const placed = await placeFromPhone({
              data: { lat: pos.lat, lng: pos.lng, address, ghanaPost, phone },
            });
            toast.success(`Phone placed you in ${placed.name}`);
            reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          Display name
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          Phone
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <label className="block text-sm">
          Street address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        <label className="block text-sm">
          GhanaPost address
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 uppercase" value={ghanaPost} onChange={(e) => setGhanaPost(e.target.value)} placeholder="GA-000-0000" />
        </label>
        <label className="block text-sm">
          Company / studio
          <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <p className="text-sm font-semibold">Workspace</p>
        <div className="grid gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn("rounded-xl border p-3 text-left", type === t.id ? "border-primary bg-soft" : "border-line bg-surface")}
            >
              <b>{t.label}</b>
              <span className="mt-1 block text-xs text-muted">{t.blurb}</span>
            </button>
          ))}
        </div>
        <button disabled={busy} className="min-h-11 rounded-full bg-primary px-6 font-semibold text-primary-fg disabled:opacity-50">
          {busy ? "Reading your phone…" : "Save and check my location"}
        </button>
      </form>
    </AppFrame>
  );
}
