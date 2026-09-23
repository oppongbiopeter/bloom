import { useEffect, useState } from "react";
import { getMyProfile, listCatalog, type Product, type Profile } from "@/lib/server/actions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Station } from "@/lib/utils";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [florists, setFlorists] = useState<{ slug: string; name: string; city: string; story: string; commission_pct: number; lead_days: number }[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    listCatalog()
      .then((d) => {
        setProducts(d.products);
        setFlorists(d.florists);
        setStations(d.stations);
      })
      .finally(() => setReady(true));
  }, []);
  return { products, florists, stations, ready };
}

export function useProfile() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const reload = () => {
    if (!user) {
      setProfile(null);
      return;
    }
    getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  };
  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setProfile(null);
      return;
    }
    reload();
  }, [user, isPending]);
  return { user, isPending, profile, reload };
}
