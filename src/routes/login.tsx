import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { BrandMark } from "@/components/shell";
import { landAfterSignIn } from "@/lib/land";
import { useState } from "react";
import { toast } from "sonner";

type LoginSearch = { party?: "customer" | "florist" };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    party: s.party === "florist" ? "florist" : "customer",
  }),
  component: Login,
});

function Login() {
  const { party } = Route.useSearch();
  const florist = party === "florist";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      await landAfterSignIn(party);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">{florist ? "Studio sign in" : "Customer sign in"}</h1>
        <p className="mt-2 text-sm text-muted">
          {florist
            ? "For partner florists. After setup you land on your studio desk — orders, commission and the flowers you list."
            : "Personal, organizer or corporate. After setup you land in the shop, or on the opening screen if your area is not live yet."}
        </p>
        {authEnabled ? (
          <div className="mt-6 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/enter" })}
                className="w-full min-h-11 rounded-full border border-line px-4 text-sm font-semibold hover:bg-bg"
              >
                Continue with {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        )}
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" />
          email
          <span className="h-px flex-1 bg-line" />
        </div>
        <form className="space-y-3" onSubmit={onEmail}>
          {mode === "up" && (
            <label className="block text-sm">
              Name
              <input className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="block text-sm">
            Email
            <input type="email" required className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            Password
            <input type="password" required minLength={8} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button disabled={busy} className="w-full min-h-11 rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-50">
            {mode === "up" ? "Create account" : "Sign in with email"}
          </button>
        </form>
        <button className="mt-3 text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
        <p className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-sm text-muted">
          <Link to="/enter">All entrances</Link>
          <Link to="/login" search={{ party: florist ? "customer" : "florist" }}>
            {florist ? "I am a customer" : "I run a studio"}
          </Link>
          <Link to="/hq">Bloom staff</Link>
        </p>
      </div>
    </main>
  );
}
