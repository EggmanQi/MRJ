"use client";

import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { track } from "@/lib/analytics";
import { CARDS } from "@/lib/cards";
import { ensureStore, unlockedCardIds } from "@/lib/storage";
import type { UserStore } from "@/lib/types";

export default function CodexPage() {
  const [store, setStore] = useState<UserStore | null>(null);

  useEffect(() => {
    const s = ensureStore();
    setStore(s);
    track({
      name: "codex_open",
      unlockedCount: unlockedCardIds(s).size,
    });
  }, []);

  const unlocked = useMemo(
    () => (store ? unlockedCardIds(store) : new Set<number>()),
    [store],
  );

  const historyByCard = useMemo(() => {
    const map = new Map<
      number,
      { question: string; poem: string; at: string; status: string }
    >();
    if (!store) return map;
    for (const d of store.drawHistory) {
      map.set(d.cardId, {
        question: d.question,
        poem: d.poem,
        at: d.createdAt.slice(0, 10),
        status: d.status,
      });
    }
    return map;
  }, [store]);

  const [selected, setSelected] = useState<number | null>(null);
  const detail = selected != null ? CARDS.find((c) => c.id === selected) : null;
  const hist = selected != null ? historyByCard.get(selected) : null;

  return (
    <div className="space-y-8">
      <Nav current="/codex" />
      <header className="space-y-2">
        <h1 className="font-display text-2xl tracking-[0.25em]">外图鉴 · 成语</h1>
        <p className="text-sm text-ink-muted">
          已点亮 {unlocked.size} / 49
        </p>
      </header>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {CARDS.map((card) => {
          const lit = unlocked.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              disabled={!lit}
              onClick={() => setSelected(card.id)}
              className={`aspect-square text-[10px] tracking-wider sm:text-xs ${
                lit
                  ? "border border-seal bg-paper text-seal hover:bg-paper-wash"
                  : "border border-paper-line bg-ink/10 text-ink-faint"
              }`}
              title={lit ? card.idiom : "未解锁"}
            >
              {lit ? card.id : "·"}
            </button>
          );
        })}
      </div>

      {detail && hist && (
        <section className="space-y-3 border border-paper-line bg-paper px-4 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl tracking-[0.2em]">
              {detail.idiom}
            </h2>
            <span className="text-xs text-ink-faint">{hist.at}</span>
          </div>
          <p className="text-sm text-ink-muted">{detail.meaning}</p>
          {hist.status === "pending" ? (
            <p className="text-xs tracking-widest text-ink-faint">
              已遇见 · 尚未解签
            </p>
          ) : (
            <>
              <p className="text-xs tracking-widest text-ink-faint">
                所问 · {hist.question || "—"}
              </p>
              <p className="font-display leading-8 tracking-wider">
                {hist.poem}
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
