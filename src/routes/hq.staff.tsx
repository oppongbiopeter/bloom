import { createFileRoute } from "@tanstack/react-router";
import { addStaffUser, listStaff, setStaffRole } from "@/lib/server/hq";
import { STAFF_ROLES, staffLabel, type StaffRole } from "@/lib/staff";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/hq/staff")({ component: HqStaff });

function HqStaff() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listStaff>>>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("fulfilment");
  const [busy, setBusy] = useState(false);

  async function reload() {
    setRows(await listStaff());
  }
  useEffect(() => {
    reload().catch(() => {});
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addStaffUser({ data: { name, email, password, staff_role: role } });
      toast.success(`${name} can sign in at Bloom HQ`);
      setName("");
      setEmail("");
      setPassword("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add staff");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Staff</h1>
      <p className="mt-2 max-w-2xl text-sm text-hq-muted">
        Super admin adds people for each function. They sign in on this desk only — the shop never offers these seats.
      </p>
      <form onSubmit={add} className="mt-8 grid gap-3 rounded-2xl border border-hq-line bg-hq-panel p-4 md:grid-cols-2">
        <input className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" minLength={8} className="rounded-lg border border-hq-line bg-hq px-3 py-2" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select className="rounded-lg border border-hq-line bg-hq px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {STAFF_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-hq-muted md:col-span-2">{STAFF_ROLES.find((r) => r.id === role)?.blurb}</p>
        <button disabled={busy} className="min-h-11 rounded-full bg-hq-fg font-semibold text-hq disabled:opacity-50 md:col-span-2">
          Add staff seat
        </button>
      </form>
      <ul className="mt-6 divide-y divide-hq-line rounded-2xl border border-hq-line bg-hq-panel">
        {rows.map((r) => (
          <li key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-semibold">{r.display_name}</div>
              <div className="text-xs text-hq-muted">
                {r.email} · {staffLabel(r.staff_role)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-full border border-hq-line bg-hq px-3 py-2 text-sm"
                value={r.staff_role}
                onChange={async (e) => {
                  await setStaffRole({ data: { userId: r.user_id, staff_role: e.target.value as StaffRole } });
                  reload();
                }}
              >
                {STAFF_ROLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {r.staff_role !== "superadmin" && (
                <button
                  className="text-sm text-accent"
                  onClick={async () => {
                    await setStaffRole({ data: { userId: r.user_id, staff_role: null } });
                    toast.success("Seat removed");
                    reload();
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-hq-muted">No staff yet.</li>}
      </ul>
    </div>
  );
}
