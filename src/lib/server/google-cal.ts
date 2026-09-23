import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ConnectorType,
  GoogleCalendarTools,
  classifyCallToolError,
} from "@/lib/app-data";

export const importGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const result = await callTool(
      GoogleCalendarTools.search,
      { query: "birthday OR anniversary OR wedding OR holiday" },
      { connectorType: ConnectorType.GoogleCalendar },
    );
    if (!result.ok) {
      const classified = classifyCallToolError(result);
      return {
        ok: false as const,
        kind: classified?.kind ?? "error",
        message: classified?.message ?? result.errorMessage ?? "Could not read Google Calendar",
        loginUrl: result.loginRequired ? result.loginUrl : undefined,
        events: [] as { title: string; date: string }[],
      };
    }
    const raw = result.data;
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as { events?: unknown }).events)
        ? ((raw as { events: unknown[] }).events)
        : [];
    const events: { title: string; date: string }[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const title = String(rec.summary ?? rec.title ?? rec.name ?? "").trim();
      const start = rec.start;
      let date = "";
      if (typeof start === "string") date = start.slice(0, 10);
      else if (start && typeof start === "object") {
        const s = start as Record<string, unknown>;
        date = String(s.date ?? s.dateTime ?? "").slice(0, 10);
      }
      if (!date) {
        const d = String(rec.date ?? rec.event_date ?? "").slice(0, 10);
        date = d;
      }
      if (title && /^\d{4}-\d{2}-\d{2}$/.test(date)) events.push({ title, date });
    }
    return { ok: true as const, kind: "ok" as const, message: "", events };
  });
