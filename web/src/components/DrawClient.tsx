"use client";

import { useEffect, useState } from "react";
import { CardFace } from "@/components/CardFace";
import { track } from "@/lib/analytics";
import { getCard, getVoice } from "@/lib/cards";
import {
  completeReading,
  ensureStore,
  hasDrawnToday,
  lockDraw,
  saveStore,
  sumVoiceDelta,
  todaysLastRecord,
  topVoiceId,
} from "@/lib/storage";
import type { Card, UserStore, VoiceId } from "@/lib/types";

type Phase = "idle" | "drawing" | "drawn" | "reading" | "done";

export function DrawClient() {
  const [store, setStore] = useState<UserStore | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [reversed, setReversed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [question, setQuestion] = useState("");
  const [poem, setPoem] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = ensureStore();
    setStore(s);
    const last = todaysLastRecord(s);
    if (!last) return;

    const c = getCard(last.cardId) ?? null;
    setCard(c);
    setReversed(last.reversed);
    setFlipped(true);
    setQuestion(last.question);
    setPendingId(last.id);

    if (last.status === "pending") {
      setPhase("drawn");
      return;
    }

    setPoem(last.poem);
    setInterpretation(last.interpretation);
    setPhase("done");
  }, []);

  async function onDraw() {
    if (!store || hasDrawnToday(store)) return;
    setError(null);
    setPhase("drawing");
    track({ name: "draw_start" });
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("draw failed");
      const data = (await res.json()) as {
        card: Card;
        reversed: boolean;
      };

      const locked = lockDraw(store, {
        cardId: data.card.id,
        reversed: data.reversed,
      });
      saveStore(locked.store);
      setStore(locked.store);
      setPendingId(locked.record.id);
      setCard(data.card);
      setReversed(data.reversed);
      track({
        name: "draw_result",
        cardId: data.card.id,
        isNew: locked.isNew,
        reversed: data.reversed,
      });
      setToast(locked.isNew ? "新卡点亮" : "今日之签已锁定");

      setTimeout(() => {
        setFlipped(true);
        setPhase("drawn");
      }, 80);
    } catch {
      setError("抽卡失败，请稍后再试");
      setPhase("idle");
    }
  }

  async function onReading() {
    if (!store || !card || !pendingId) return;
    setError(null);
    setPhase("reading");
    if (question.trim()) {
      track({ name: "question_input", length: question.trim().length });
    }
    const voiceId = topVoiceId(store);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          reversed,
          question,
          topVoiceId: voiceId,
        }),
      });
      if (!res.ok) throw new Error("reading failed");
      const data = (await res.json()) as {
        poem: string;
        interpretation: string;
        latency_ms: number;
      };
      setPoem(data.poem);
      setInterpretation(data.interpretation);
      track({
        name: "reading_generated",
        cardId: card.id,
        latency_ms: data.latency_ms,
      });

      const result = completeReading(store, pendingId, {
        question: question.trim() || "我今天想知道什么",
        poem: data.poem,
        interpretation: data.interpretation,
        voiceDelta: card.voiceVector,
      });
      saveStore(result.store);
      setStore(result.store);
      for (const id of result.awakened) {
        track({ name: "voice_awaken", voiceId: id });
      }

      const bits = sumVoiceDelta(result.record.voiceDelta).map(({ id, n }) => {
        const name = getVoice(id as VoiceId)?.name ?? id;
        return `${name} +${n}`;
      });
      const awakenText = result.awakened
        .map((id) => `声音「${getVoice(id)?.name ?? id}」被唤醒`)
        .join(" · ");
      setToast(
        [bits.join(" · "), awakenText].filter(Boolean).join(" / ") ||
          "解签完成",
      );
      setPhase("done");
    } catch {
      setError("求签失败，请稍后再试");
      setPhase("drawn");
    }
  }

  const todayDone = store ? hasDrawnToday(store) : false;
  const canDraw = Boolean(store && !todayDone && phase === "idle");
  const canRead = phase === "drawn" && card && pendingId;
  const poemLines = poem
    .split(/[，。\n\r\t ]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs tracking-[0.4em] text-ink-faint">诚实的抽卡问卦</p>
        <h1 className="font-display text-3xl tracking-[0.2em] text-ink">
          {phase === "idle" && !todayDone ? "今日第一卦" : "今日之签"}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          是镜子，不是天机。每天一签，抽过的卡进图鉴，内心声音会被慢慢唤醒。
        </p>
      </header>

      <CardFace card={card} reversed={reversed} flipped={flipped} />

      {phase === "idle" && !todayDone && (
        <button
          type="button"
          disabled={!canDraw}
          onClick={onDraw}
          className="mx-auto block w-full max-w-xs border border-seal bg-seal px-6 py-3 text-sm tracking-[0.35em] text-paper transition enabled:hover:bg-ink disabled:opacity-40"
        >
          抽卡
        </button>
      )}

      {todayDone && phase === "idle" && (
        <p className="text-center text-xs tracking-widest text-ink-faint">
          今日已锁定，不能重抽
        </p>
      )}

      {canRead && (
        <div className="mx-auto max-w-md space-y-4">
          <label className="block space-y-2">
            <span className="text-xs tracking-widest text-ink-faint">
              可选 · 今天想问什么
            </span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：未来一个月财务会不会好转"
              className="w-full border border-paper-line bg-paper-wash px-3 py-2 text-sm outline-none focus:border-seal"
            />
          </label>
          <button
            type="button"
            onClick={onReading}
            className="w-full border border-seal bg-seal px-6 py-3 text-sm tracking-[0.35em] text-paper hover:bg-ink"
          >
            求签
          </button>
        </div>
      )}

      {phase === "reading" && (
        <p className="text-center text-sm tracking-widest text-ink-muted">
          解签中…
        </p>
      )}

      {phase === "done" && poem && (
        <section className="mx-auto max-w-md space-y-5 border border-paper-line bg-paper-wash px-5 py-6">
          <div className="text-center font-display text-lg leading-[2] tracking-[0.15em]">
            {poemLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowInterpretation((v) => !v)}
            className="mx-auto block text-xs tracking-[0.35em] text-seal"
          >
            {showInterpretation ? "收起解签" : "请解签"}
          </button>
          {showInterpretation && (
            <p className="text-sm leading-7 text-ink-muted">{interpretation}</p>
          )}
          <p className="text-center text-xs tracking-widest text-ink-faint">
            明天再来
          </p>
        </section>
      )}

      {toast && (
        <p className="text-center text-xs tracking-widest text-seal">{toast}</p>
      )}
      {error && (
        <p className="text-center text-xs tracking-widest text-seal">{error}</p>
      )}
    </div>
  );
}
