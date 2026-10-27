# 山河跳 · Gate 1 Web Demo

Next.js 14 (App Router) + Tailwind. Spec: `../山河跳抽卡产品规格说明书.md` v0.5.

## Setup

```bash
cd web
cp .env.example .env.local   # optional: set LLM_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

Without `LLM_API_KEY`, `/api/reading` returns a local fallback poem so the draw flow still works.

## Routes

| Path | Role |
|---|---|
| `/` | Daily draw + poem + folded interpretation |
| `/codex` | 49-card outer atlas |
| `/voices` | 16-voice inner atlas |
| `POST /api/draw` | Random card + orientation |
| `POST /api/reading` | Poem JSON via LLM (or fallback) |
| `GET /api/health` | Catalog + LLM config check |

## Data

- `src/data/cards.json` — copy of repo-root `cards.json`
- `src/data/voices.json` — copy of repo-root `voices.json`

Re-copy after editing the root files.
