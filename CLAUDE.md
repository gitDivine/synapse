# SYNAPSE — Project Rules

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (CSS-based config via `@theme inline` in globals.css)
- Zustand for client state
- Motion (Framer Motion) for animations
- nanoid for session IDs
- Node.js v24 / npm 11

## Conventions
- `@/*` import alias maps to `./src/*`
- Use `cn()` from `@/lib/utils/cn` for conditional Tailwind classes
- Server Components by default; `"use client"` only when needed
- API routes in `src/app/api/` using Route Handlers
- Types co-located in `src/lib/*/types.ts` or `src/types/`
- Agent providers in `src/lib/agents/providers/` — each implements `AIAgent` interface
- Dark theme only (no light mode toggle for now)
- Mobile-first (375px base)
- All animations use transform/opacity only (GPU-composited)

## Security Rules
- API keys stored in `.env.local` (server-side) or localStorage (client-side, sent per-request)
- API keys NEVER logged, NEVER included in client bundle, NEVER persisted to disk on server
- `.env.local` is gitignored
- Validate all user input at API route boundaries
- Session store is in-memory only — no disk persistence of user data

## Known Issues
- None yet
