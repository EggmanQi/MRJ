import cardsDoc from "@/data/cards.json";
import voicesDoc from "@/data/voices.json";
import type { Card, Voice, VoiceId } from "@/lib/types";

export const CARDS = cardsDoc.cards as Card[];
export const VOICES = voicesDoc.voices as Voice[];

export const VOICE_BY_ID: Record<VoiceId, Voice> = Object.fromEntries(
  VOICES.map((v) => [v.id, v]),
) as Record<VoiceId, Voice>;

export function getCard(id: number): Card | undefined {
  return CARDS.find((c) => c.id === id);
}

export function getVoice(id: VoiceId): Voice | undefined {
  return VOICE_BY_ID[id];
}

export function assertCardCatalog(): void {
  if (CARDS.length !== 49) {
    throw new Error(`Expected 49 cards, got ${CARDS.length}`);
  }
  const ids = new Set(CARDS.map((c) => c.id));
  for (let i = 0; i < 49; i += 1) {
    if (!ids.has(i)) throw new Error(`Missing card id ${i}`);
  }
  if (VOICES.length !== 16) {
    throw new Error(`Expected 16 voices, got ${VOICES.length}`);
  }
}
