import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { useCatalog, useProfile } from "@/components/use-bloom";
import { type GiftDraft, useCart } from "@/lib/cart-store";
import { placeOrder, quoteGifts } from "@/lib/server/actions";
import { ADDONS, AREAS, ghs, PACKAGES } from "@/lib/utils";
import { parseCsv } from "@/lib/csv";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({ component: CartPage });

function newGift(partial: Partial<GiftDraft> = {}): GiftDraft {
  return {
    key: crypto.randomUUID(),
    recipientName: "",
    address: "East Legon",
    city: "Accra",
    phone: "",
    message: "",
    grams: 300,
    packageType: "kraft",
    addons: [],
    ...partial,
  };
}

function CartPage() {
  const { products } = useCatalog();
  const { user } = useProfile();
  const nav = useNavigate();
  const { lines, setQty, remove, gifts, setGifts, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [quotes, setQuotes] = useState<
    { recipientName: string; stationName: string; km: number; deliveryFee: number; extras: number }[]
  >([]);

  const detailed = lines
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return p ? { ...l, product: p, grams: p.grams_per_unit * l.qty, line: p.price * l.qty } : null;
    })
    .filter(Boolean) as {
    productId: string;
    qty: number;
    product: (typeof products)[0];
    grams: number;
    line: number;
  }[];

  const totalGrams = detailed.reduce((s, l) => s + l.grams, 0);
  const merchandise = detailed.reduce((s, l) => s + l.line, 0);
  const allocated = gifts.reduce((s, g) => s + Number(g.grams || 0), 0);
  const remaining = Math.round(totalGrams - allocated);

  const giftFees = useMemo(() => {
    return gifts.reduce((s, g) => {
      const pkg = PACKAGES.find((p) => p.id === g.packageType)?.fee ?? 0;
      const ads = g.addons.reduce((n, a) => n + (ADDONS.find((x) => x.id === a)?.fee ?? 0), 0);
      return s + pkg + ads;
    }, 0);
  }, [gifts]);

  const quotedDelivery = quotes.reduce((s, q) => s + q.deliveryFee, 0);

  function patch(key: string, next: Partial<GiftDraft>) {
    setGifts(gifts.map((g) => (g.key === key ? { ...g, ...next } : g)));
  }

  async function refreshQuotes() {
    const valid = gifts.filter((g) => g.recipientName && g.address);
    if (!valid.length || !user) return;
    try {
      const q = await quoteGifts({
        data: valid.map((g) => ({
          recipientName: g.recipientName,
          address: g.address,
          city: g.city,
          phone: g.phone,
          message: g.message,
          grams: Number(g.grams),
          packageType: g.packageType,
          addons: g.addons,
        })),
      });
      setQuotes(q);
    } catch {
      /* signed-out quote is skipped */
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshQuotes();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifts, user]);

  function onCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result));
      const [header, ...body] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase().includes(name));
      const next = body.map((r) =>
        newGift({
          recipientName: r[idx("name")] || r[0],
          address: r[idx("address")] || r[1] || "East Legon",
          city: r[idx("city")] || r[2] || "Accra",
          phone: r[idx("phone")] || r[3] || "",
          message: r[idx("message")] || r[4] || "",
          grams: Number(r[idx("gram")] || r[5] || 300),
        }),
      );
      setGifts(next);
      toast.success(`Loaded ${next.length} gift rows`);
    };
    reader.readAsText(file);
  }

  async function checkout() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (!detailed.length) return;
    let payloadGifts = gifts.filter((g) => g.recipientName);
    if (!payloadGifts.length) {
      payloadGifts = [newGift({ recipientName: user.displayName || "Me", grams: totalGrams || 300 })];
    }
    if (remaining < -1) {
      toast.error("Gift splits use more grams than the cart holds");
      return;
    }
    setBusy(true);
    try {
      const res = await placeOrder({
        data: {
          lines: detailed.map((l) => ({ productId: l.productId, qty: l.qty })),
          gifts: payloadGifts.map((g) => ({
            recipientName: g.recipientName,
            address: g.address,
            city: g.city,
            phone: g.phone,
            message: g.message,
            grams: Number(g.grams),
            packageType: g.packageType,
            addons: g.addons,
          })),
          clientKey: crypto.randomUUID(),
        },
      });
      clear();
      toast.success(`Order #${res.id} placed`);
      nav({ to: "/orders/$id", params: { id: String(res.id) } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (!detailed.length) {
    return (
      <AppFrame>
        <h1 className="font-display text-4xl">Your order</h1>
        <p className="mt-4 text-muted">
          Cart is empty.{" "}
          <Link to="/shop" className="text-primary">
            Browse the shop
          </Link>
        </p>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <h1 className="font-display text-4xl">Your order</h1>
      <p className="mt-2 text-sm text-muted">
        Split the stems into named gifts, add a wrap, balloons or a hamper, then we quote from the nearest sorting station.
      </p>
      <div className="mt-6 space-y-3">
        {detailed.map((l) => (
          <div key={l.productId} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <img src={l.product.img} alt="" className="size-16 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="font-semibold">{l.product.name}</div>
              <div className="text-xs text-muted">
                {l.grams}g · {ghs(l.line)}
              </div>
            </div>
            <input
              type="number"
              className="h-11 w-20 rounded-lg border border-line px-2 text-sm"
              value={l.qty}
              onChange={(e) => setQty(l.productId, Number(e.target.value))}
            />
            <button className="text-sm text-accent" onClick={() => remove(l.productId)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        Cart holds {Math.round(totalGrams)}g. Unallocated {remaining}g.
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">Split into gifts</h2>
            <p className="text-sm text-muted">Names, addresses, messages, balloons, cards or hampers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/samples/gifts.csv"
              download
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold"
            >
              Sample CSV
            </a>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
              />
            </label>
            <button
              className="min-h-11 rounded-full bg-soft px-4 text-sm font-semibold"
              onClick={() => setGifts([...gifts, newGift({ grams: Math.max(50, remaining || 300) })])}
            >
              Add recipient
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">CSV columns: name, address, city, phone, message, grams</p>
        <div className="mt-4 space-y-4">
          {gifts.map((g) => (
            <div key={g.key} className="rounded-2xl border border-line bg-surface p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="min-h-11 rounded-lg border border-line px-3"
                  placeholder="Recipient name"
                  value={g.recipientName}
                  onChange={(e) => patch(g.key, { recipientName: e.target.value })}
                />
                <select
                  className="min-h-11 rounded-lg border border-line px-3"
                  value={g.address}
                  onChange={(e) => {
                    const area = AREAS.find((a) => a.name === e.target.value);
                    patch(g.key, { address: e.target.value, city: area?.city ?? g.city });
                  }}
                >
                  {AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}, {a.city}
                    </option>
                  ))}
                </select>
                <input
                  className="min-h-11 rounded-lg border border-line px-3"
                  placeholder="Phone"
                  value={g.phone}
                  onChange={(e) => patch(g.key, { phone: e.target.value })}
                />
                <input
                  type="number"
                  className="min-h-11 rounded-lg border border-line px-3"
                  placeholder="Grams"
                  value={g.grams}
                  onChange={(e) => patch(g.key, { grams: Number(e.target.value) })}
                />
                <select
                  className="min-h-11 rounded-lg border border-line px-3"
                  value={g.packageType}
                  onChange={(e) => patch(g.key, { packageType: e.target.value })}
                >
                  {PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.fee ? `+${ghs(p.fee)}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  className="min-h-11 rounded-lg border border-line px-3 md:col-span-2"
                  placeholder="Personal message"
                  value={g.message}
                  onChange={(e) => patch(g.key, { message: e.target.value })}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ADDONS.map((a) => {
                  const on = g.addons.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`min-h-9 rounded-full px-3 text-xs font-semibold ${on ? "bg-primary text-primary-fg" : "border border-line bg-bg"}`}
                      onClick={() =>
                        patch(g.key, { addons: on ? g.addons.filter((x) => x !== a.id) : [...g.addons, a.id] })
                      }
                    >
                      {a.label} +{ghs(a.fee)}
                    </button>
                  );
                })}
                <button className="ml-auto text-xs text-accent" onClick={() => setGifts(gifts.filter((x) => x.key !== g.key))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {quotes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {quotes.map((q) => (
              <li key={q.recipientName + q.stationName}>
                {q.recipientName}: {q.stationName} · {q.km} km · {ghs(q.deliveryFee)} delivery · extras {ghs(q.extras)}
              </li>
            ))}
          </ul>
        )}
        {!user && gifts.length > 0 && (
          <p className="mt-3 text-sm text-muted">Sign in to see the live station quote before you place the order.</p>
        )}
      </section>

      <div className="mt-8 rounded-2xl bg-surface p-4">
        <div className="flex justify-between text-sm">
          <span>Flowers</span>
          <b className="tabular-nums">{ghs(merchandise)}</b>
        </div>
        <div className="flex justify-between text-sm">
          <span>Packaging & add-ons</span>
          <b className="tabular-nums">{ghs(giftFees)}</b>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery (quoted)</span>
          <b className="tabular-nums">{ghs(quotedDelivery)}</b>
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
          <span>Due at checkout</span>
          <span className="tabular-nums">{ghs(merchandise + giftFees + quotedDelivery)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          If you skip named gifts, we send one parcel to you. Delivery is always calculated from the nearest hub.
        </p>
        <button
          disabled={busy}
          onClick={checkout}
          className="mt-4 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-50"
        >
          {user ? "Place order" : "Sign in to place order"}
        </button>
      </div>
    </AppFrame>
  );
}
