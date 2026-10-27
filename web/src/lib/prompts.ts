import type { Card, Voice } from "@/lib/types";

export const READING_SYSTEM_PROMPT = `你是一位古老的"动物成语签"解签人，为用户抽中的成语卡撰写签诗。
文风：古寺灵签、《易经》爻辞、唐人绝句，含蓄、多义、留白。

产出两样：

1. poem 签诗：四句七言（或五言），押韵。
   - 把成语的动物、情境、动作、编号位置（0=降生…48=回首）化入诗中，
     但不直接写出成语；
   - 可借《易经》意象（龙、渊、田、天、水、火等），但不写卦名、不下定论；
   - 正位顺势写；逆位从"另一个角度"写（不反转吉凶，写转机/换境）；
   - 诗中不出现现代词、不出现"你应该"、不直接回答"会不会/能不能"；
   - 语气与意象必须贴合用户当前最活跃的内心声音（见下）。

2. interpretation 白话解签：80-150字。
   - 不预测未来、不承诺结果、不制造焦虑、不诱导付费；
   - 像温和的解签人，点出诗里藏着的一个思考方向，话不说满；
   - 第二人称。

严格输出 JSON：{"poem": "句1，句2，句3，句4。", "interpretation": "……"}`;

export function buildReadingUserPrompt(args: {
  card: Card;
  reversed: boolean;
  question: string;
  voice: Voice | null;
}): string {
  const { card, reversed, question, voice } = args;
  const orientation = reversed ? "逆位" : "正位";
  const q = question.trim() || "我今天想知道什么";
  const voiceBlock = voice
    ? `你内心此刻最活跃的声音是「${voice.name}」，它说：
“${voice.monologue}”
（这一签的语气与意象跟着这个声音走）`
    : `你内心声音尚未唤醒，用中性、含蓄的语气写这一签。`;

  return `抽到「${card.idiom}」（第${card.id}张，${card.animal}），${orientation}
释义：${card.meaning}
关键词：${card.keywords.join("、")}
编号位置：${card.arc}——${card.arcDesc}
${voiceBlock}
我的问题：${q}`;
}

export function parseReadingResponse(raw: string): {
  poem: string;
  interpretation: string;
} {
  const trimmed = raw.trim();
  try {
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
        poem?: string;
        interpretation?: string;
      };
      if (parsed.poem && parsed.interpretation) {
        return {
          poem: String(parsed.poem).trim(),
          interpretation: String(parsed.interpretation).trim(),
        };
      }
    }
  } catch {
    // fall through
  }

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const poemLines = lines.slice(0, 4);
  const rest = lines.slice(4).join("");
  return {
    poem: poemLines.join("，") + (poemLines.length ? "。" : ""),
    interpretation: rest || "此签意在留白，请先把诗句再读一遍。",
  };
}
