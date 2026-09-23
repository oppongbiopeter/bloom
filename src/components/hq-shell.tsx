import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useProfile } from "@/components/use-bloom";
import { hqReady, initializeHq } from "@/lib/server/hq";
import { canAccessDesk, STAFF_DESKS, staffLabel, type StaffRole } from "@/lib/staff";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function HqMark() {
  return (
    <Link to="/hq" className="flex items-center gap-2 font-semibold text-hq-fg">
      <span className="grid size-8 place-items-center rounded-full bg-hq-fg text-hq">
        <Leaf className="size-4" />
      </span>
      <span className="font-display text-xl tracking-tight">Bloom HQ</span>
    </Link>
  );
}

export function HqLayout() {
  const { user, isPending } = useCurrentUserState();
  const { profile, reload } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    hqReady()
      .then((r) => setReady(r.ready))
      .catch(() => setReady(false));
  }, [profile?.staff_role]);

  if (isPending || ready === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-hq text-hq-muted">
        Opening the company desk…
      </div>
    );
  }

  if (!user) {
    return ready ? <StaffSignIn /> : <InitializeHq onDone={() => setReady(true)} />;
  }

  if (!profile?.staff_role) {
    if (!ready) {
      return <ClaimHq name={user.displayName || ""} onDone={() => reload()} />;
    }
    return <Locked />;
  }

  const allowed = canAccessDesk(profile.staff_role, path);

  return (
    <div className="flex min-h-dvh flex-col bg-hq text-hq-fg">
      <HqBar role={profile.staff_role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
        {allowed ? (
          <Outlet />
        ) : (
          <div className="rounded-2xl border border-hq-line bg-hq-panel p-6">
            <h1 className="font-display text-3xl">Not on your desk</h1>
            <p className="mt-2 max-w-lg text-sm text-hq-muted">
              Super admin assigns Bloom functions. You are {staffLabel(profile.staff_role)} — open a desk from the bar, or ask for a different seat.
            </p>
            <Link to="/hq" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-hq-fg px-5 font-semibold text-hq">
              Back to desk
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function HqBar({ role }: { role: StaffRole }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const links = STAFF_DESKS.filter((d) => d.roles.includes(role));
  return (
    <header className="sticky top-0 z-30 border-b border-hq-line bg-hq/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <HqMark />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-hq-muted hover:text-hq-fg",
                (l.to === "/hq" ? path === "/hq" : path.startsWith(l.to)) && "bg-hq-panel text-hq-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs uppercase tracking-wider text-hq-muted sm:inline">
            {staffLabel(role)}
          </span>
          <div className="[&_span.grid]:bg-hq-line [&_span.grid]:text-hq-fg">
            <UserButton />
          </div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-auto border-t border-hq-line px-2 py-1 md:hidden">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-medium text-hq-muted",
              (l.to === "/hq" ? path === "/hq" : path.startsWith(l.to)) && "bg-hq-panel text-hq-fg",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function StaffSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message);
      window.location.assign("/hq");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-hq px-4 text-hq-fg">
      <div className="w-full max-w-md rounded-2xl border border-hq-line bg-hq-panel p-6">
        <HqMark />
        <h1 className="mt-6 font-display text-3xl">Bloom company desk</h1>
        <p className="mt-2 text-sm text-hq-muted">
          Staff only. Super admin creates these seats — there is no public join, and this is not a shop workspace.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            Work email
            <input
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy} className="min-h-11 w-full rounded-full bg-hq-fg font-semibold text-hq disabled:opacity-50">
            Enter HQ
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-hq-muted">
          <Link to="/" className="underline-offset-2 hover:underline">
            Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}

function InitializeHq({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name: name || "Bloom HQ",
      });
      if (res.error) throw new Error(res.error.message);
      await initializeHq({ data: { display_name: name || "Bloom HQ" } });
      toast.success("Bloom HQ is live");
      onDone();
      window.location.assign("/hq");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not initialize");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-hq px-4 text-hq-fg">
      <div className="w-full max-w-md rounded-2xl border border-hq-line bg-hq-panel p-6">
        <HqMark />
        <h1 className="mt-6 font-display text-3xl">Initialize Bloom HQ</h1>
        <p className="mt-2 text-sm text-hq-muted">
          One-time company seat. This is Bloom Ghana itself — prices, ICUMS, cold rooms, 3PL and staff. After this, only people you add can enter. Customers never see this screen.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            Your name
            <input className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Work email
            <input type="email" required className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            Password
            <input type="password" required minLength={8} className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button disabled={busy} className="min-h-11 w-full rounded-full bg-hq-fg font-semibold text-hq disabled:opacity-50">
            Create the company desk
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-hq-muted">
          <Link to="/" className="underline-offset-2 hover:underline">
            I am a customer — go to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}

function ClaimHq({ name, onDone }: { name: string; onDone: () => void }) {
  const [display, setDisplay] = useState(name);
  const [busy, setBusy] = useState(false);
  async function claim() {
    setBusy(true);
    try {
      await initializeHq({ data: { display_name: display || "Bloom HQ" } });
      toast.success("This account is now Bloom HQ super admin");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim HQ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-hq px-4 text-hq-fg">
      <div className="w-full max-w-md rounded-2xl border border-hq-line bg-hq-panel p-6">
        <HqMark />
        <h1 className="mt-6 font-display text-3xl">Designate super admin</h1>
        <p className="mt-2 text-sm text-hq-muted">
          No company seat exists yet. Confirm you are initializing Bloom Ghana HQ on this signed-in account. After this, shop users cannot join — you add staff yourself.
        </p>
        <label className="mt-4 block text-sm">
          Name on the desk
          <input className="mt-1 w-full rounded-lg border border-hq-line bg-hq px-3 py-2" value={display} onChange={(e) => setDisplay(e.target.value)} />
        </label>
        <button disabled={busy} onClick={claim} className="mt-4 min-h-11 w-full rounded-full bg-hq-fg font-semibold text-hq disabled:opacity-50">
          Make this account super admin
        </button>
        <p className="mt-6 text-center text-xs text-hq-muted">
          <Link to="/" className="underline-offset-2 hover:underline">
            No — take me to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}

function Locked() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hq px-4 text-hq-fg">
      <div className="w-full max-w-md rounded-2xl border border-hq-line bg-hq-panel p-6">
        <HqMark />
        <h1 className="mt-6 font-display text-3xl">Staff only</h1>
        <p className="mt-2 text-sm text-hq-muted">
          This is Bloom Ghana’s company desk — pricing, customs, cold rooms and last-mile. It is not a customer workspace and you cannot join it from the shop. A super admin must add you.
        </p>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-hq-fg px-5 font-semibold text-hq">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
