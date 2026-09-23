import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface Subscription {
  channelId: string;
  lastShopHash?: string;
}

interface BotState {
  subscriptions: Record<string, Subscription>;
}

const statePath = resolve("data/state.json");
let state: BotState = { subscriptions: {} };

export async function loadState(): Promise<void> {
  try {
    state = JSON.parse(await readFile(statePath, "utf8")) as BotState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function saveState(): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statePath);
}

export function getSubscriptions(): Readonly<Record<string, Subscription>> {
  return state.subscriptions;
}

export async function subscribe(guildId: string, channelId: string): Promise<void> {
  state.subscriptions[guildId] = { channelId };
  await saveState();
}

export async function unsubscribe(guildId: string): Promise<boolean> {
  if (!state.subscriptions[guildId]) {
    return false;
  }
  delete state.subscriptions[guildId];
  await saveState();
  return true;
}

export async function markPosted(guildId: string, hash: string): Promise<void> {
  const subscription = state.subscriptions[guildId];
  if (!subscription) {
    return;
  }
  subscription.lastShopHash = hash;
  await saveState();
}