import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/shell";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-primary text-primary-fg">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandMark className="text-primary-fg [&_span:first-child]:bg-primary-fg [&_span:first-child]:text-primary" />
          <p className="mt-4 max-w-sm text-sm text-primary-fg/80">
            Kenya stems via Kotoka, local Accra and Kumasi florists, and last-mile from six Ghana sorting stations. Reminders timed to the air, ocean or same-day lead you actually need.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm text-primary-fg/80">
            <li>
              <Link to="/shop" search={{ occasion: "birthday" }}>
                Birthday
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ occasion: "anniversary" }}>
                Anniversary
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ occasion: "wedding" }}>
                Wedding
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ occasion: "corporate" }}>
                Corporate
              </Link>
            </li>
            <li>
              <Link to="/florists">Partner florists</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Workspace</h2>
          <ul className="mt-3 space-y-2 text-sm text-primary-fg/80">
            <li>
              <Link to="/calendar">Occasion calendar</Link>
            </li>
            <li>
              <Link to="/people">My people</Link>
            </li>
            <li>
              <Link to="/orders">Track an order</Link>
            </li>
            <li>
              <Link to="/account">Account</Link>
            </li>
            <li>
              <Link to="/enter">Sign in</Link>
            </li>
            <li>
              <Link to="/login" search={{ party: "florist" }}>
                Florist studio
              </Link>
            </li>
            <li>
              <Link to="/hq">Bloom staff</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-primary-fg/15 px-4 py-4 text-center text-xs text-primary-fg/60">
        Bloom Ghana · open constituency by constituency · ACC air · TEM ocean · GRA ICUMS
      </p>
    </footer>
  );
}
