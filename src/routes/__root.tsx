import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { useEffect } from "react";

const APP_NAME = "Bloom";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#16382c" },
      {
        name: "description",
        content:
          "Ghana cut flowers for occasions, events and corporate gifting — with calendars, split gifts and live delivery.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function InviteCapture() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const area = q.get("area");
    const from = q.get("from");
    if (area) sessionStorage.setItem("bloom-invite-area", area);
    if (from) sessionStorage.setItem("bloom-invite-from", from);
  }, []);
  return null;
}

function RootDocument() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <InviteCapture />
          <Outlet />
        </AuthProvider>
        <Toaster position="bottom-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}
