import type { SupabaseClient } from "@supabase/supabase-js";

export const VAPID_PUBLIC_KEY = "BHMd_a9sDXkt2LD_QesqNFX8bNNjxraZtRwNuHZVzxlz95iFrAeclC0RidT4HFIkIrr3dN0d-zwAeh1_IsRgH5U";

function urlBase64ToBytes(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const decoded = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function supportsPushNotifications() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushSubscription() {
  if (!supportsPushNotifications()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeDevice(supabase: SupabaseClient, userId: string) {
  if (!supportsPushNotifications()) throw new Error("Push notifications are not supported on this device.");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY),
  });
  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys.auth) throw new Error("The browser did not provide valid push credentials.");
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    user_agent: navigator.userAgent.slice(0, 500),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });
  if (error) throw error;
  return subscription;
}

export async function unsubscribeDevice(supabase: SupabaseClient, userId: string) {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw error;
}
