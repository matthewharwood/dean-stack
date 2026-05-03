import type { Progress, Settings } from "@dean-stack/schemas";

import { getDB } from "./db";
import type { StoreName } from "./hydration";

const DEBOUNCE_MS = 150;
const CHANNEL_NAME = "{{name}}:idb";

const channel = typeof window !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function schedule(key: string, run: () => Promise<void>): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  pending.set(
    key,
    setTimeout(() => {
      void run();
    }, DEBOUNCE_MS),
  );
}

export function persistProgress(value: Progress): void {
  schedule(`progress:${value.id}`, async () => {
    const db = await getDB();
    await db.put("progress", value);
    channel?.postMessage({ store: "progress", key: value.id });
  });
}

export function persistSettings(value: Settings): void {
  schedule(`settings:${value.id}`, async () => {
    const db = await getDB();
    await db.put("settings", value);
    channel?.postMessage({ store: "settings", key: value.id });
  });
}

export type RemoteWriteMessage = { store: StoreName; key: string };

export function subscribeRemoteWrites(onChange: (msg: RemoteWriteMessage) => void): () => void {
  if (!channel) return () => {};
  const handler = (e: MessageEvent) => onChange(e.data as RemoteWriteMessage);
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}

// Cancel every debounced write that hasn't fired yet. Used by `clearAllStorage`
// to prevent the race where a pending persist call fires AFTER `closeDB()`
// runs, opens a fresh IDB connection via `getDB()`, and that new connection
// blocks `deleteDatabase` — leaving the user on the same DB they thought
// they cleared.
export function cancelPendingWrites(): void {
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}
