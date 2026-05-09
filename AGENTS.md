# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

CHORD.GEN.v0 — a 128-chord progression generator. Hybrid instrument / terminal workstation with a dark cyberpunk UI, real-time Web Audio synthesis, and MIDI export. Deployed on Cloudflare Workers.

- **Repo:** chord-progression-generator-v0
- **Live:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Branching:** `main` is production. Feature branches use `feature/*` naming.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Rendering | Client Components (`"use client"`) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Components | shadcn/ui (new-york style, CSS variables) |
| Audio | Web Audio API (no libraries) |
| Fonts | Chakra Petch (display) + Share Tech Mono (mono) via `next/font/google` |
| Icons | lucide-react |
| Theming | `next-themes` + custom CSS variables (dark/light) |
| Persistence | `localStorage` (state serialized as JSON under key `chord-gen-config`) |
| Deployment | Cloudflare Workers (`@opennextjs/cloudflare` + Wrangler) |
| Forms | react-hook-form + zod (available, not heavily used) |

## Repository Structure

```
├── app/                          # Next.js App Router
│   ├── globals.css               # All styles, CSS variables, theme, design system
│   ├── layout.tsx                # Root layout: fonts, metadata, theme init script
│   └── page.tsx                  # ~2600-line single-page app (ALL logic + UI)
│       └── components/
│           └── ThemeToggle.tsx    # Dark/light toggle (custom, not next-themes)
│
├── components/
│   ├── theme-provider.tsx        # next-themes provider wrapper
│   └── ui/                       # shadcn/ui components (~35 files, new-york)
│
├── hooks/                        # shadcn hooks (use-mobile, use-toast)
├── lib/                          # shadcn utils (cn() helper)
│
├── public/                       # Static assets (icons, etc.)
├── next.config.mjs               # Next config: TS errors ignored, unoptimized images
├── open-next.config.ts           # OpenNext Cloudflare config
├── wrangler.jsonc                # Cloudflare Worker config (name: "chordgenv0")
├── tsconfig.json                 # Strict TS, path alias @/* → ./*
├── components.json               # shadcn config
└── package.json                  # Deps & scripts
```

## Key Scripts

```bash
npm run dev           # Local dev server (port 3000)
npm run build         # Standard Next.js build (static)
npm run cf-build      # Build for Cloudflare (opennextjs-cloudflare build)
npm run cf-deploy     # Deploy to Cloudflare
npm run preview       # Build + preview on Cloudflare
npm run cf-typegen   # Generate Cloudflare env types
```

## Architecture & Patterns

### Single-File Application

`app/page.tsx` is the entire application (~2600 lines). It contains:
- Chord/scale/synth data as large constant objects (`NOTE_FREQUENCIES`, `SCALES`, `CHORD_TYPES`, `STYLE_PROGRESSIONS`, `DRUM_STYLE_PATTERNS`, `SYNTH_RHYTHMS`)
- All React state and hooks
- Full Web Audio API synthesis engine
- All UI rendering

When adding features, consider splitting audio logic into `lib/audio/` and UI panels into `components/` — but the project is currently monolithic by design.

### Audio Engine

Custom Web Audio API synthesis with:
- **Scheduler:** Lookahead scheduler (`scheduler()`) that schedules notes 200ms ahead
- **Per-voice synthesis:** Each synth type (pad, pluck, keys, strings, organ, bell, bass, lead, brass, fm, supersaw, wobble) has its own oscillator/filter/envelope setup in `playSingleNote()`
- **Drum synthesis:** Noise-buffer-based kick, snare, hi-hat (no samples)
- **Convolution reverb:** Impulse response generated procedurally
- **Signal chain:** Oscillators → Filters → Dry/Wet split → Master Gain → Dynamics Compressor → Soft-clipper Limiter → Destination
- **State management:** Uses refs (`isPlayingRef`, `currentBeatRef`, `nextNoteTimeRef`, etc.) to avoid stale closures in the scheduler callback

### State Persistence

All state is serialized to `localStorage` under key `chord-gen-config`. The config object:
```ts
{ key, mode, style, settings, progression, savedProgressions }
```
Loaded on mount via `useEffect`, saved on any change. `isLoaded` guard prevents save-before-load race.

### Design System (CSS Variables)

Dark theme (default) uses cold-dark base with warm-green text:
- `--base-bg: #0D1117`, `--base-panel: #161B22`, `--base-border: #2A2F38`
- Neon accent palette: green `#C0FC14`, pink `#FF2D7C`, blue `#2B7FFF`, yellow `#FCEB14`, orange `#FF6B2B`, purple `#B829FF`, cyan `#14FCEB`

Light theme: warm paper tones (`#F4F3EF`, `#EAE8E1`, etc.)

Visual effects:
- **Grid backgrounds:** `.cyber-grid-bg` (40px grid), `.cyber-panel` (28px grid)
- **Scanlines:** `.scanlines`, `.scanlines-strong` (CSS pseudo-elements)
- **Corner brackets:** `.cyber-corner` (green/pink bracket pair)
- **Glow classes:** `.glow-green`, `.glow-pink`, etc. (text-shadow)
- **Chord pulse animations:** `.chord-active-green`, etc. (keyframe animations)
- **Noise overlay:** `.noise-overlay` (SVG turbulence filter)

### Theming

Two parallel theme systems coexist:
1. **`next-themes`** (`ThemeProvider` in `components/theme-provider.tsx`) — sets `.dark` class
2. **Custom `ThemeToggle`** (`app/components/ThemeToggle.tsx`) — toggles `.light` class + sets `localStorage.theme`

The inline `<script>` in `layout.tsx` reads `localStorage.theme` before hydration to prevent FOUC. When modifying theming, keep both mechanisms in sync.

### Form Controls

Custom styled selects/inputs using `.ctrl-wrapper` + `.ctrl-select` / `.ctrl-input`. No shadcn form components used for main controls. Range inputs use `.ctrl-range-wrapper`. Toggle buttons use `.ctrl-toggle`.

## State Management Conventions

- Use `useState` for reactive UI state
- Use `useRef` for values accessed inside callbacks/closures (audio scheduler, drag-and-drop)
- Ref + state synced via `useEffect`:
  ```tsx
  useEffect(() => { progressionRef.current = progression }, [progression])
  useEffect(() => { settingsRef.current = settings }, [settings])
  ```
- Callbacks memoized with `useCallback` and depend on refs (not state) to avoid recreating audio nodes

## Chord Data Architecture

- **Notes:** 12 chromatic notes stored as `string[]`
- **Scales:** `Record<string, number[]>` — semitone intervals from root
- **Chord types:** `Record<string, number[]>` — intervals in semitones
- **Progressions:** `Record<style, Record<mode, ChordDegree[][]>>` — chord degree arrays
- **Drum patterns:** `Record<style, Record<timeSig, Record<voice, number[]>>>` — 16th-note grids
- **Mode family detection:** Modes classified as "major" or "minor" family for progression selection

## Cloudflare Deployment Notes

- Worker name: `chordgenv0`
- Uses `nodejs_compat` compatibility flag
- Self-reference service binding for caching
- Build command must use `opennextjs-cloudflare build`, not `next build`
- Image optimization configured but likely unnecessary (no Next.js Image components used)

## Accessibility

- Keyboard shortcuts: Space (play/stop), R (regenerate), S (save)
- Skips shortcuts when focus is on `<input>` elements
- Focus-visible styles use green outline
- Dark/light theme respects user preference on first visit, then persists

## Editing Tips for Agents

1. **The big file:** `app/page.tsx` is monolithic. When adding non-trivial features, extract into `lib/` or `components/` to keep it maintainable.
2. **Audio state:** Always use refs for values accessed in `scheduleNote` / `scheduler` callbacks. Don't close over state directly.
3. **CSS:** All styles in `app/globals.css`. Use CSS variables for theming. No CSS modules or inline styles.
4. **shadcn components:** Add new UI via `npx shadcn@latest add <component>`. They go to `components/ui/`.
5. **Path alias:** `@/*` maps to project root. Import like `@/components/ui/button`.
6. **Types:** TypeScript strict mode. No `any` unless absolutely necessary.
7. **No linting in CI:** The project has `eslint` in scripts but no pre-commit hooks.
8. **Next config:** `ignoreBuildErrors: true` — TS errors won't block builds. Fix them anyway.
9. **Images:** `unoptimized: true` — no Next.js image optimization.
10. **Branch strategy:** Work on `feature/*` branches, merge to `main` via PR.
