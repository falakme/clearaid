"use client";

/**
 * PWA / Web Push helpers (client-side).
 *
 * Flow: request Notification permission -> ensure the service worker is ready
 * -> fetch the VAPID public key from the backend -> subscribe via the Push API
 * -> persist the subscription on the backend (scoped to the user's city) so we
 * can notify residents when an alert is triggered.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushResult =
  | "subscribed"
  | "denied"
  | "unsupported"
  | "not-configured"
  | "error";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Request notification permission and register a push subscription. */
export async function enablePushForCity(city: string): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";

  // 1) Explicitly ask for permission.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    // 2) Need the VAPID public key from the backend.
    const keyRes = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
    const keyData = await keyRes.json();
    if (!keyData?.configured || !keyData?.public_key) return "not-configured";

    // 3) Subscribe via the active service worker.
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.public_key),
      });
    }

    // 4) Persist on the backend, scoped to the user's city.
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        city,
      }),
    });
    return "subscribed";
  } catch {
    return "error";
  }
}
