"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { track } from "@/lib/analytics";
import { VOICES } from "@/lib/cards";
import { awakeVoiceCount, ensureStore } from "@/lib/storage";
import type { UserStore } from "@/lib/types";

export default function VoicesPage() {
  const [store, setStore] = useState<UserStore | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const s = ensureStore();
    setStore(s);
    track({ name: "voices_open", awakeCount: awakeVoiceCount(s) });
  }, []);

  return (
    <div className="space-y-8">
      <Nav current="/voices" />
      <header className="space-y-2">
        <h1 className="font-display text-2xl tracking-[0.25em]">内图鉴 · 声音</h1>
        <p className="text-sm text-ink-muted">
          已唤醒 {store ? awakeVoiceCount(store) : 0} / 16
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VOICES.map((voice) => {
          const state = store?.voices[voice.id];
          const awake = Boolean(state?.awake);
          const active = openId === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              disabled={!awake}
              onClick={() => setOpenId(active ? null : voice.id)}
              className={`min-h-[7.5rem] border p-3 text-left transition ${
                awake
                  ? "border-seal bg-paper"
                  : "border-paper-line bg-ink/10 text-ink-faint"
              }`}
            >
              <div className="text-[10px] tracking-widest text-ink-faint">
                {voice.attribute}
              </div>
              <div className="mt-2 font-display text-lg tracking-[0.2em]">
                {awake ? voice.name : "沉睡"}
              </div>
              {awake && (
                <div className="mt-2 text-xs text-ink-muted">
                  {voice.tagline}
                  <div className="mt-1 text-seal">{state?.value ?? 0}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openId && store?.voices[openId as keyof typeof store.voices]?.awake && (
        <section className="border border-paper-line bg-paper-wash px-4 py-5">
          {(() => {
            const voice = VOICES.find((v) => v.id === openId);
            if (!voice) return null;
            return (
              <>
                <h2 className="font-display text-xl tracking-[0.2em]">
                  {voice.name} · {voice.tagline}
                </h2>
                <p className="mt-4 text-sm leading-7 text-ink-muted">
                  {voice.monologue}
                </p>
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
}
