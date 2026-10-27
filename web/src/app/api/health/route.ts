import { NextResponse } from "next/server";
import { assertCardCatalog, CARDS, VOICES } from "@/lib/cards";

export const runtime = "nodejs";

export function GET() {
  try {
    assertCardCatalog();
    return NextResponse.json({
      ok: true,
      cards: CARDS.length,
      voices: VOICES.length,
      llmConfigured: Boolean(process.env.LLM_API_KEY),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "catalog error",
      },
      { status: 500 },
    );
  }
}
