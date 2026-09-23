import { getMyProfile } from "@/lib/server/actions";

/** After any sign-in, send the person to the screen that matches their seat. */
export async function landAfterSignIn(party?: "customer" | "florist") {
  const profile = await getMyProfile().catch(() => null);
  if (profile?.staff_role) {
    window.location.assign("/hq");
    return;
  }
  if (!profile?.address || !profile.area_id) {
    const q = party === "florist" || profile?.account_type === "florist" ? "?as=florist" : "";
    window.location.assign(`/onboarding${q}`);
    return;
  }
  if (profile.account_type === "florist") {
    window.location.assign("/partner");
    return;
  }
  window.location.assign("/shop");
}
