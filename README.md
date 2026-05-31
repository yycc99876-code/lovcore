# Lovcore

A private memory archive that feels like a room, not a feed.

Lovcore saves the things you want to keep — images, articles, PDFs, notes, links — and gives them back to you when you need them. AI analyzes your saves quietly in the background. You search in natural language. You browse in silence.

## Features

- **Inbox** — drag, paste, or drop anything. URLs are fetched, files are parsed, text is indexed.
- **Folios** — organize your archive into collections. Manual or rule-based (smart spaces).
- **Echoes** — a meditative review mode. Swipe through your saves with ambient sound. Keep or let go.
- **Quick Note** — capture thoughts instantly, right from the main view.
- **AI Analysis** — color palettes, core thesis, trend signals. Runs silently on every save.
- **Voice Input** — push-to-talk or hands-free dictation inside the editor.
- **Semantic Search** — find things by meaning, not just keywords.

## Stack

- React 19 + TypeScript + Vite
- Supabase (auth, database, file storage)
- Tiptap (rich text editor)
- GSAP (animations)
- Playwright + Vitest (testing)

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (watch mode) |
| `npm run test:run` | Run unit tests (single run) |
| `npm run test:e2e` | Run Playwright E2E tests |

## Deployment

Configured for Vercel. Push to `main` and it deploys.

## License

Private.
