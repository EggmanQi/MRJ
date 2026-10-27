import type {
  DrawRecord,
  UserStore,
  VoiceId,
  VoiceState,
  VoiceVector,
} from "@/lib/types";
import { VOICES, getCard } from "@/lib/cards";

export const STORAGE_KEY = "shanhe-draw-v1";
export const VOICE_CAP = 100;

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyVoices(): Partial<Record<VoiceId, VoiceState>> {
  const map: Partial<Record<VoiceId, VoiceState>> = {};
  for (const v of VOICES) {
    map[v.id] = { awake: false, value: 0 };
  }
  return map;
}

function normalizeRecord(raw: DrawRecord): DrawRecord {
  return {
    ...raw,
    id: raw.id ?? `${raw.cardId}-${raw.createdAt}`,
    status: raw.status ?? "done",
  };
}

export function createEmptyStore(deviceId: string): UserStore {
  return {
    deviceId,
    lastFreeDrawDate: null,
    drawHistory: [],
    voices: emptyVoices(),
  };
}

export function loadStore(): UserStore | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserStore;
    return {
      ...parsed,
      drawHistory: (parsed.drawHistory ?? []).map(normalizeRecord),
    };
  } catch {
    return null;
  }
}

export function saveStore(store: UserStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function ensureStore(): UserStore {
  const existing = loadStore();
  if (existing) return existing;
  const store = createEmptyStore(crypto.randomUUID());
  saveStore(store);
  return store;
}

export function hasDrawnToday(store: UserStore): boolean {
  return store.lastFreeDrawDate === todayLocalISODate();
}

/** Pending counts as unlocked — the face was already met. */
export function isCardUnlocked(store: UserStore, cardId: number): boolean {
  return store.drawHistory.some((d) => d.cardId === cardId);
}

export function unlockedCardIds(store: UserStore): Set<number> {
  return new Set(store.drawHistory.map((d) => d.cardId));
}

export function awakeVoiceCount(store: UserStore): number {
  return Object.values(store.voices).filter((v) => v?.awake).length;
}

export function topVoiceId(store: UserStore): VoiceId | null {
  let best: VoiceId | null = null;
  let bestValue = -1;
  for (const v of VOICES) {
    const state = store.voices[v.id];
    const value = state?.value ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = v.id;
    }
  }
  return bestValue > 0 ? best : null;
}

export function todaysLastRecord(store: UserStore): DrawRecord | null {
  if (!hasDrawnToday(store) || store.drawHistory.length === 0) return null;
  return store.drawHistory[store.drawHistory.length - 1] ?? null;
}

export type LockDrawResult = {
  store: UserStore;
  record: DrawRecord;
  isNew: boolean;
};

/** Phase 1: persist pending draw and lock the daily slot. No voice feeding. */
export function lockDraw(
  store: UserStore,
  args: { cardId: number; reversed: boolean },
): LockDrawResult {
  const isNew = !isCardUnlocked(store, args.cardId);
  const createdAt = new Date().toISOString();
  const record: DrawRecord = {
    id: crypto.randomUUID(),
    cardId: args.cardId,
    reversed: args.reversed,
    question: "",
    poem: "",
    interpretation: "",
    voiceDelta: {},
    status: "pending",
    createdAt,
  };

  const next: UserStore = {
    ...store,
    lastFreeDrawDate: todayLocalISODate(),
    drawHistory: [...store.drawHistory, record],
  };

  return { store: next, record, isNew };
}

export type CompleteReadingResult = {
  store: UserStore;
  record: DrawRecord;
  awakened: VoiceId[];
};

/** Phase 2: fill poem/interpretation on a pending record and apply voiceDelta. */
export function completeReading(
  store: UserStore,
  recordId: string,
  args: {
    question: string;
    poem: string;
    interpretation: string;
    voiceDelta?: VoiceVector;
  },
): CompleteReadingResult {
  const index = store.drawHistory.findIndex((d) => d.id === recordId);
  if (index < 0) {
    throw new Error(`draw record not found: ${recordId}`);
  }

  const prev = store.drawHistory[index];
  const card = getCard(prev.cardId);
  const voiceDelta = args.voiceDelta ?? card?.voiceVector ?? {};
  const awakened: VoiceId[] = [];
  const voices: Partial<Record<VoiceId, VoiceState>> = { ...store.voices };
  const fedAt = new Date().toISOString();

  for (const [key, delta] of Object.entries(voiceDelta) as Array<
    [VoiceId, number]
  >) {
    if (!delta) continue;
    const state = voices[key] ?? { awake: false, value: 0 };
    const nextValue = Math.min(VOICE_CAP, state.value + delta);
    const justAwoke = !state.awake && nextValue > 0;
    voices[key] = {
      awake: state.awake || nextValue > 0,
      value: nextValue,
      firstAwakenedAt: justAwoke ? fedAt : state.firstAwakenedAt,
    };
    if (justAwoke) awakened.push(key);
  }

  const record: DrawRecord = {
    ...prev,
    question: args.question,
    poem: args.poem,
    interpretation: args.interpretation,
    voiceDelta,
    status: "done",
  };

  const drawHistory = [...store.drawHistory];
  drawHistory[index] = record;

  return {
    store: {
      ...store,
      drawHistory,
      voices,
    },
    record,
    awakened,
  };
}

export function sumVoiceDelta(
  delta: VoiceVector,
): Array<{ id: VoiceId; n: number }> {
  return (Object.entries(delta) as Array<[VoiceId, number]>)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, n }));
}
