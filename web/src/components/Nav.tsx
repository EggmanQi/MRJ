import Link from "next/link";

const links = [
  { href: "/", label: "求签" },
  { href: "/codex", label: "成语图鉴" },
  { href: "/voices", label: "声音图鉴" },
];

export function Nav({ current }: { current: "/" | "/codex" | "/voices" }) {
  return (
    <nav className="flex items-center justify-between gap-3 border-b border-paper-line pb-4">
      <Link href="/" className="font-display text-lg tracking-[0.35em] text-ink">
        山河跳
      </Link>
      <div className="flex gap-4 text-sm tracking-widest text-ink-muted">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              current === l.href
                ? "text-seal"
                : "transition-colors hover:text-ink"
            }
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
