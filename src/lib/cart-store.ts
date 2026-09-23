import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = { productId: string; qty: number };

export type GiftDraft = {
  key: string;
  recipientName: string;
  address: string;
  city: string;
  phone: string;
  message: string;
  grams: number;
  packageType: string;
  addons: string[];
};

type CartState = {
  lines: CartLine[];
  gifts: GiftDraft[];
  add: (productId: string, qty: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setGifts: (gifts: GiftDraft[]) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      gifts: [],
      add: (productId, qty) => {
        const lines = [...get().lines];
        const hit = lines.find((l) => l.productId === productId);
        if (hit) hit.qty += qty;
        else lines.push({ productId, qty });
        set({ lines });
      },
      setQty: (productId, qty) => {
        set({
          lines: get()
            .lines.map((l) => (l.productId === productId ? { ...l, qty } : l))
            .filter((l) => l.qty > 0),
        });
      },
      remove: (productId) =>
        set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [], gifts: [] }),
      setGifts: (gifts) => set({ gifts }),
    }),
    { name: "bloom-cart" },
  ),
);
