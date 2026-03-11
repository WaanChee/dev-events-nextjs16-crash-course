# DevEvent — Project Rules

## Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with `tw-animate-css`; shadcn/ui v4 (Radix UI primitives)
- **Analytics**: PostHog (client-side via `posthog-js`, initialized in `instrumentation-client.ts`)
- **WebGL**: `ogl` for shader-based visual effects (see `components/LightRays.tsx`)
- **Package manager**: npm

## Project Structure
```
app/            → App Router pages and layouts (Server Components by default)
components/     → Shared React components
lib/            → Utilities (utils.ts) and constants (constants.ts)
public/         → Static assets (icons/, images/)
```

## Conventions

### Components
- Place shared components in `components/` as PascalCase `.tsx` files.
- Only add `"use client"` when the component requires browser APIs, hooks, or event handlers — keep components as Server Components by default.
- Use the `@/*` path alias for all imports (maps to project root): `import { cn } from "@/lib/utils"`.

### Styling
- This project uses Tailwind CSS **v4** syntax: `@import "tailwindcss"`, `@theme inline`, `@utility`, `@custom-variant`, and `@layer`.
- Custom CSS variables and utilities are defined in `app/globals.css`.
- Use the `cn()` helper from `lib/utils.ts` for conditional class merging (clsx + tailwind-merge).
- Prefer Tailwind utility classes. Only use custom CSS for complex component-scoped styles in `globals.css` under `@layer components`.

### Analytics (PostHog)
- PostHog is initialized globally in `instrumentation-client.ts` — do not re-initialize elsewhere.
- Capture events in **click/event handlers directly**, not in `useEffect`.
- Import PostHog as `import posthog from "posthog-js"` and call `posthog.capture("event_name", { ...properties })`.
- PostHog API calls are proxied through `/ingest/*` rewrites in `next.config.ts` to avoid ad blockers.
- Environment variable: `NEXT_PUBLIC_POSTHOG_KEY` (never hardcode).

### TypeScript
- Strict mode is enabled. Always type component props with an `interface`.
- Use `type` imports where possible: `import type { Metadata } from "next"`.

### Fonts
- Three fonts are loaded via `next/font/google` in `app/layout.tsx`:
  - **Geist** (`--font-sans`, default body font)
  - **Schibsted Grotesk** (`--font-schibsted-grotesk`, headings)
  - **Martian Mono** (`--font-martian-mono`, monospace)

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint.config.mjs`)
