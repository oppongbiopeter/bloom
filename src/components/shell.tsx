import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Leaf,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from "lucide-react";
import type { Profile } from "@/lib/server/actions";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold text-primary", className)}>
      <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-fg">
        <Leaf className="size-4" />
      </span>
      <span className="font-display text-xl tracking-tight">Bloom</span>
    </Link>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="size-8 animate-pulse rounded-full bg-line" />;
  return user ? (
    <UserButton />
  ) : (
    <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
      Sign in
    </Link>
  );
}

export function TopBar({ profile }: { profile?: Profile | null }) {
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = profile?.account_type ?? "personal";
  const links = [
    { to: "/shop", label: "Shop", icon: ShoppingBag },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/people", label: role === "corporate" ? "Staff" : "People", icon: Users },
    { to: "/orders", label: "Orders", icon: Truck },
    { to: "/florists", label: "Florists", icon: Store },
  ];
  if (role === "florist") links.push({ to: "/partner", label: "Studio", icon: Leaf });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <BrandMark />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-fg",
                path.startsWith(l.to) && "bg-soft text-primary",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {profile?.staff_role && (
            <Link to="/hq" className="hidden min-h-11 items-center text-sm font-semibold text-primary md:inline-flex">
              HQ
            </Link>
          )}
          <Link
            to="/cart"
            className="relative min-h-11 rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold"
          >
            Cart
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs text-primary-fg">
                {count}
              </span>
            )}
          </Link>
          <Link to="/account" className="hidden min-h-11 items-center text-sm font-medium text-muted md:inline-flex">
            Account
          </Link>
          <AuthSlot />
        </div>
      </div>
      <nav className="flex gap-1 overflow-auto border-t border-line px-2 py-1 md:hidden">
        {profile?.staff_role && (
          <Link
            to="/hq"
            className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-primary"
          >
            HQ
          </Link>
        )}
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted",
              path.startsWith(l.to) && "bg-soft text-primary",
            )}
          >
            <l.icon className="size-4" />
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10", className)}>{children}</main>;
}
