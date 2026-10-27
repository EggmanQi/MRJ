import type { Card } from "@/lib/types";

export function CardFace({
  card,
  reversed,
  flipped,
}: {
  card: Card | null;
  reversed: boolean;
  flipped: boolean;
}) {
  return (
    <div className="perspective mx-auto h-72 w-48 sm:h-80 sm:w-56">
      <div
        className={`relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-sm border border-paper-line bg-seal text-paper [backface-visibility:hidden]">
          <div className="font-display text-3xl tracking-[0.4em]">山河</div>
          <div className="mt-3 text-xs tracking-[0.5em] text-paper/80">跳</div>
        </div>
        <div className="absolute inset-0 flex flex-col justify-between rounded-sm border border-paper-line bg-paper p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {card ? (
            <>
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center bg-seal font-display text-lg text-paper">
                  {card.id}
                </span>
                <span className="text-xs tracking-widest text-ink-faint">
                  {reversed ? "逆位" : "正位"}
                </span>
              </div>
              <div>
                <div className="font-display text-2xl leading-snug tracking-[0.2em]">
                  {card.idiom}
                </div>
                <div className="mt-2 text-xs tracking-widest text-ink-muted">
                  {card.animal} · {card.arc}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">
                {card.meaning}
              </p>
            </>
          ) : (
            <div className="m-auto text-sm text-ink-faint">…</div>
          )}
        </div>
      </div>
    </div>
  );
}
