export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur.trim());
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur.trim());
      if (row.some((x) => x)) rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  row.push(cur.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}

export function parseIcs(text: string): { title: string; date: string }[] {
  const events: { title: string; date: string }[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (const b of blocks.slice(1)) {
    const summary = /SUMMARY(?:;[^:]*)?:(.+)/i.exec(b)?.[1]?.trim() ?? "";
    const dt =
      /DTSTART(?:;[^:]*)?:(\d{8})/i.exec(b)?.[1] ??
      /DTSTART(?:;[^:]*)?:(\d{4}-\d{2}-\d{2})/i.exec(b)?.[1];
    if (!summary || !dt) continue;
    const date =
      dt.length === 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : dt.slice(0, 10);
    events.push({ title: summary.replace(/\\,/g, ","), date });
  }
  return events;
}

export function guessKind(title: string) {
  const t = title.toLowerCase();
  if (t.includes("birthday")) return "birthday" as const;
  if (t.includes("annivers")) return "anniversary" as const;
  if (t.includes("wedding") || t.includes("bridal")) return "wedding" as const;
  if (t.includes("holiday") || t.includes("christmas") || t.includes("eid")) return "holiday" as const;
  if (t.includes("staff") || t.includes("offsite") || t.includes("agm")) return "corporate" as const;
  return "custom" as const;
}
