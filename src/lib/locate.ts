/** Phone GPS. Constituency is derived from this, not chosen from a list. */
export function readPhonePosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This phone cannot share its location"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error("Allow location so Bloom can see if your area is open"));
        else reject(new Error("Could not read this phone’s location. Try again outdoors."));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  });
}
