import { createRouter, Link } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-fg">
      <div>
        <h1 className="font-display text-3xl">Page not found</h1>
        <p className="mt-2 text-muted">That page is not in Bloom.</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFound,
  });
}
