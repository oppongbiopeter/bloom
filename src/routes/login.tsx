import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { BrandMark } from "@/components/shell";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
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
      window.location.assign("/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">Welcome to Bloom</h1>
        <p className="mt-2 text-sm text-muted">
          Personal, organizer, corporate or florist — pick your shop workspace after you sign in.
        </p>
        {authEnabled ? (
          <div className="mt-6 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/onboarding" })}
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
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted">Back to shop</Link>
        </p>
      </div>
    </main>
  );
}
