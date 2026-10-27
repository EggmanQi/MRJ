import { NextResponse } from "next/server";
import { CARDS, getCard } from "@/lib/cards";

export const runtime = "nodejs";

type DrawBody = {
  /** Client may pass already-drawn card ids for soft novelty bias later; MVP ignores. */
  excludeIds?: number[];
};

export async function POST(request: Request) {
  let body: DrawBody = {};
  try {
    body = (await request.json()) as DrawBody;
  } catch {
    body = {};
  }

  if (!CARDS.length) {
    return NextResponse.json({ error: "empty catalog" }, { status: 500 });
  }

  const index = Math.floor(Math.random() * CARDS.length);
  const card = CARDS[index];
  const reversed = Math.random() < 0.5;

  // Soft guard: if somehow exclude empties the pool, still return something.
  if (Array.isArray(body.excludeIds) && body.excludeIds.length >= 48) {
    const pick = getCard(card.id) ?? card;
    return NextResponse.json({
      cardId: pick.id,
      reversed,
      card: pick,
    });
  }

  return NextResponse.json({
    cardId: card.id,
    reversed,
    card,
  });
}
