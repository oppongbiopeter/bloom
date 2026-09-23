import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/shell";
import { landAfterSignIn } from "@/lib/land";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useEffect } from "react";

export const Route = createFileRoute("/enter")({ component: Enter });

const DOORS = [
  {
    title: "Send flowers",
    blurb: "Personal occasions, event planners and company gifts. You land in the shop, or on the opening screen if your area is not live yet.",
    to: "/login",
    search: { party: "customer" as const },
    cta: "Customer sign in",
  },
  {
    title: "Florist studio",
    blurb: "List a Ghana shop, take marketplace orders, and see what Bloom delivers for you.",
    to: "/login",
    search: { party: "florist" as const },
    cta: "Studio sign in",
  },
  {
    title: "Bloom staff",
    blurb: "Prices, customs, cold rooms, partners, rollout and the split queue. There is no public join. A super admin creates your seat.",
    to: "/hq",
    search: undefined,
    cta: "Company desk",
  },
] as const;

function Enter() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (user) void landAfterSignIn();
  }, [user]);

  if (isPending || user) return <div className="min-h-dvh bg-bg" />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <BrandMark />
      <h1 className="mt-8 font-display text-4xl text-primary md:text-5xl">How are you using Bloom?</h1>
      <p className="mt-3 max-w-xl text-muted">
        Each party has its own sign-in. Customers and florists create a shop account. Bloom staff use the company desk, and customers cannot join it.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {DOORS.map((d) => (
          <Link
            key={d.title}
            to={d.to}
            search={d.search}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-2xl">{d.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{d.blurb}</p>
            <span className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary">{d.cta}</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm">
        <Link to="/" className="text-muted">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
