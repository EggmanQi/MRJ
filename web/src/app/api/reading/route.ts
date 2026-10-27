import { NextResponse } from "next/server";
import { getCard, getVoice } from "@/lib/cards";
import {
  READING_SYSTEM_PROMPT,
  buildReadingUserPrompt,
  parseReadingResponse,
} from "@/lib/prompts";
import type { VoiceId } from "@/lib/types";

export const runtime = "nodejs";

type ReadingBody = {
  cardId: number;
  reversed: boolean;
  question?: string;
  topVoiceId?: VoiceId | null;
};

const FALLBACK_POEMS: Record<number, { poem: string; interpretation: string }> =
  {
    36: {
      poem: "蛰久鱼龙未易猜，长风一送昼潮回。琼林树上花千朵，第一枝开待潮来。",
      interpretation:
        "这一签不应读作「财运自动上门」。独占鳌头的那一位，是在水里熬了许久，才被潮头送上去的。签里说第一枝花，开在你准备了很久的那条路上。这个月，与其等消息，不如把最拿手的事再推一寸——潮来的时候，得先有人在水上。",
    },
  };

function fallbackReading(cardId: number, idiom: string) {
  const preset = FALLBACK_POEMS[cardId];
  if (preset) return preset;
  return {
    poem: "山回路转未见人，水落石出有余音。且把此物挂窗前，明朝风起再相寻。",
    interpretation: `「${idiom}」这一签先给你留白。把诗句对着今天的问题读两遍，看哪一句最像你已经知道、却还没说出口的事。未配置 LLM 时，这是本地示意解签。`,
  };
}

async function callLlm(system: string, user: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY missing");
  }
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  const model = process.env.LLM_MODEL || "deepseek-chat";

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty LLM content");
  return content;
}

export async function POST(request: Request) {
  const started = Date.now();
  let body: ReadingBody;
  try {
    body = (await request.json()) as ReadingBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const card = getCard(body.cardId);
  if (!card) {
    return NextResponse.json({ error: "unknown card" }, { status: 404 });
  }

  const voice =
    body.topVoiceId != null ? getVoice(body.topVoiceId) ?? null : null;
  const userPrompt = buildReadingUserPrompt({
    card,
    reversed: Boolean(body.reversed),
    question: body.question ?? "",
    voice,
  });

  try {
    const raw = await callLlm(READING_SYSTEM_PROMPT, userPrompt);
    const parsed = parseReadingResponse(raw);
    return NextResponse.json({
      ...parsed,
      latency_ms: Date.now() - started,
      source: "llm",
    });
  } catch {
    const parsed = fallbackReading(card.id, card.idiom);
    return NextResponse.json({
      ...parsed,
      latency_ms: Date.now() - started,
      source: "fallback",
    });
  }
}
