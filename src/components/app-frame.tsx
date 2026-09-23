import { TopBar, Page } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { RolloutGate, type CoveragePulse } from "@/components/rollout-gate";
import { useProfile } from "@/components/use-bloom";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getMyCoverage } from "@/lib/server/coverage";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function AppFrame({
  children,
  authed,
  flush,
}: {
  children: React.ReactNode;
  authed?: boolean;
  flush?: boolean;
}) {
  const { user, isPending, profile, reload } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [pulse, setPulse] = useState<CoveragePulse | null>(null);
  const skip =
    path.startsWith("/onboarding") ||
    path.startsWith("/account") ||
    path.startsWith("/login") ||
    path.startsWith("/enter") ||
    path.startsWith("/partner") ||
    path.startsWith("/hq");
  const shouldGate = Boolean(user && profile && !profile.staff_role && !skip);

  useEffect(() => {
    if (!shouldGate) return;
    let stop = false;
    const tick = () => {
      getMyCoverage()
        .then((d) => {
          if (!stop) setPulse(d);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [shouldGate, profile?.area_id]);

  if (authed && isPending) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <TopBar profile={null} />
        {flush ? children : <Page><p className="text-muted">Loading…</p></Page>}
        <SiteFooter />
      </div>
    );
  }
  if (authed && !isPending && !user) return <RedirectToSignIn />;

  if (shouldGate && user && (!pulse || !pulse.open)) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <TopBar profile={profile ?? null} />
        {pulse ? (
          <RolloutGate pulse={pulse} userId={user.id} onJoined={() => { reload(); }} />
        ) : (
          <Page><p className="text-muted">Checking whether Bloom delivers where you are…</p></Page>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar profile={profile ?? null} />
      {user && !profile && authed && (
        <div className="border-b border-line bg-soft px-4 py-2 text-center text-sm">
          Finish setup —{" "}
          <Link to="/onboarding" className="font-semibold text-primary">
            choose your workspace
          </Link>
        </div>
      )}
      {flush ? <div className="flex-1">{children}</div> : <Page>{children}</Page>}
      <SiteFooter />
    </div>
  );
}